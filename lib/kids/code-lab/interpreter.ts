// lib/kids/code-lab/interpreter.ts
// Runs a block program against one arena and returns every intermediate state
// (a "trace"). The browser animates the trace frame by frame; the verifier
// runs the same function in Node. Nothing here touches the DOM.

import type { Capability } from '../robot-design'
import { CAPABILITY_NEEDS } from '../robot-design'
import { BLOCK_INFO, BLOCK_NEEDS, usedTypes } from './blocks'
import type { ArenaDef, Block, BlockType, Dir, TileColor, WinRule } from './types'

export const MAX_STEPS = 800
const MAX_TICKS = 4000

export interface ParsedArena {
  w: number
  h: number
  tiles: string[][]
  start: { x: number; y: number; dir: Dir }
  goal: { x: number; y: number } | null
  gems: string[]
  objects: string[]
  drops: string[]
  /** Unit edges ("x,y|x,y", sorted) the drawing must contain. */
  target: string[]
}

export interface WorldState {
  x: number
  y: number
  dir: Dir
  carrying: boolean
  penDown: boolean
  lightOn: boolean
  /** Gems still on the floor, as "x,y". */
  gems: string[]
  /** Boxes on the floor, as "x,y". */
  objects: string[]
  /** Pen edges drawn so far. */
  trail: string[]
  said: string | null
}

export type FrameEvent =
  | 'start'
  | 'move'
  | 'turn'
  | 'bonk'
  | 'stuck'
  | 'dark'
  | 'gem'
  | 'pickup'
  | 'drop'
  | 'say'
  | 'light'
  | 'pen'
  | 'check'
  | 'oops'

export interface Frame {
  blockId: string | null
  /** 1-based count of blocks executed when this frame happened. */
  step: number
  state: WorldState
  event: FrameEvent
}

export interface RunResult {
  frames: Frame[]
  won: boolean
  /** Kind, specific sentence for the child. */
  message: string
  errorStep: number | null
  errorBlockId: string | null
}

const DX = [0, 1, 0, -1]
const DY = [-1, 0, 1, 0]

export const key = (x: number, y: number) => `${x},${y}`
export function edgeKey(ax: number, ay: number, bx: number, by: number): string {
  const a = key(ax, ay)
  const b = key(bx, by)
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

export function parseArena(def: ArenaDef): ParsedArena {
  const h = def.rows.length
  const w = Math.max(...def.rows.map((r) => r.length))
  const tiles: string[][] = []
  let start = { x: 0, y: 0, dir: def.dir }
  let goal: { x: number; y: number } | null = null
  const gems: string[] = []
  const objects: string[] = []
  const drops: string[] = []
  for (let y = 0; y < h; y++) {
    const row: string[] = []
    for (let x = 0; x < w; x++) {
      const c = def.rows[y][x] ?? '#'
      row.push(c)
      if (c === 'S') start = { x, y, dir: def.dir }
      if (c === 'G') goal = { x, y }
      if (c === '*' || c === 'D') gems.push(key(x, y))
      if (c === 'o' || c === 'Y') objects.push(key(x, y))
      if (c === 'X' || c === 'B') drops.push(key(x, y))
    }
    tiles.push(row)
  }
  const target: string[] = []
  if (def.drawPath) {
    for (let i = 1; i < def.drawPath.length; i++) {
      let [ax, ay] = def.drawPath[i - 1]
      const [bx, by] = def.drawPath[i]
      while (ax !== bx || ay !== by) {
        const nx = ax + Math.sign(bx - ax)
        const ny = ay + (ax === bx ? Math.sign(by - ay) : 0)
        const k = edgeKey(ax, ay, nx, ny)
        if (!target.includes(k)) target.push(k)
        ax = nx
        ay = ny
      }
    }
  }
  return { w, h, tiles, start, goal, gems, objects, drops, target }
}

export function tileAt(a: ParsedArena, x: number, y: number): string {
  if (x < 0 || y < 0 || x >= a.w || y >= a.h) return '#'
  return a.tiles[y][x]
}
export const isWallTile = (c: string) => c === '#'
export const isRough = (c: string) => c === 's' || c === 'k'
export const isDark = (c: string) => c === 'd' || c === 'D'
export const isLineTile = (c: string) => c === '=' || c === 'G' || c === 'S'
export function colorOf(c: string): TileColor | null {
  if (c === 'r') return 'red'
  if (c === 'g') return 'green'
  if (c === 'b' || c === 'B') return 'blue'
  if (c === 'y' || c === 'Y') return 'yellow'
  return null
}

export function initialState(a: ParsedArena): WorldState {
  return {
    x: a.start.x,
    y: a.start.y,
    dir: a.start.dir,
    carrying: false,
    penDown: false,
    lightOn: false,
    gems: [...a.gems],
    objects: [...a.objects],
    trail: [],
    said: null,
  }
}

class Halt extends Error {
  constructor(public readonly kindMessage: string) {
    super(kindMessage)
  }
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Run `program` on one arena with a robot that has `caps`. */
export function run(program: Block[], def: ArenaDef, caps: Set<Capability>, win: WinRule, mustUse: BlockType[] = []): RunResult {
  const arena = parseArena(def)
  let s = initialState(arena)
  const frames: Frame[] = [{ blockId: null, step: 0, state: s, event: 'start' }]
  let step = 0
  let ticks = 0
  let currentBlock: string | null = null

  const push = (event: FrameEvent, next: WorldState) => {
    s = next
    frames.push({ blockId: currentBlock, step, state: next, event })
  }
  const need = (cap: Capability, blockLabel: string) => {
    if (!caps.has(cap)) {
      push('oops', { ...s, said: null })
      throw new Halt(`Your robot needs ${CAPABILITY_NEEDS[cap]} to use “${blockLabel}”. Pop over to the Workshop and add one!`)
    }
  }
  const ahead = () => ({ x: s.x + DX[s.dir], y: s.y + DY[s.dir] })

  const execList = (list: Block[]) => {
    for (const b of list) exec(b)
  }

  const exec = (b: Block) => {
    step += 1
    ticks += 1
    currentBlock = b.id
    if (step > MAX_STEPS || ticks > MAX_TICKS) {
      throw new Halt('Your robot went round and round and got dizzy! It never reached the end. Check that your loop can finish.')
    }
    const needCap = BLOCK_NEEDS[b.type]
    if (needCap) need(needCap, BLOCK_INFO[b.type].label)

    switch (b.type) {
      case 'forward': {
        const n = Math.max(1, Math.min(9, Math.floor(b.n)))
        for (let i = 0; i < n; i++) {
          const { x, y } = ahead()
          const t = tileAt(arena, x, y)
          if (isWallTile(t)) {
            push('bonk', { ...s, said: null })
            throw new Halt(`Bonk! Your robot hit a wall on step ${step}.`)
          }
          if (isRough(t) && !caps.has('rough-ground')) {
            push('stuck', { ...s, said: null })
            throw new Halt(
              `Oh no — your robot's wheels got stuck in the ${t === 's' ? 'sand' : 'rocks'} on step ${step}. ${CAPABILITY_NEEDS['rough-ground']} can cross it.`,
            )
          }
          if (isDark(t) && !s.lightOn) {
            push('dark', { ...s, said: null })
            throw new Halt(`It's too dark to see on step ${step}! Turn your Headlight on before driving into the cave.`)
          }
          const k = key(x, y)
          const trail = s.penDown ? addUnique(s.trail, edgeKey(s.x, s.y, x, y)) : s.trail
          const gotGem = s.gems.includes(k)
          push(gotGem ? 'gem' : 'move', { ...s, x, y, trail, gems: gotGem ? s.gems.filter((g) => g !== k) : s.gems, said: null })
        }
        break
      }
      case 'left':
        push('turn', { ...s, dir: ((s.dir + 3) % 4) as Dir, said: null })
        break
      case 'right':
        push('turn', { ...s, dir: ((s.dir + 1) % 4) as Dir, said: null })
        break
      case 'repeat': {
        const n = Math.max(1, Math.min(20, Math.floor(b.n)))
        for (let i = 0; i < n; i++) {
          execList(b.body)
          currentBlock = b.id
        }
        break
      }
      case 'repeatUntil': {
        const atGoal = () => arena.goal !== null && s.x === arena.goal.x && s.y === arena.goal.y
        if (!arena.goal) throw new Halt('There is no flag in this arena, so “repeat until at 🏁” would never stop.')
        push('check', { ...s, said: null })
        while (!atGoal()) {
          ticks += 1
          if (ticks > MAX_TICKS || step > MAX_STEPS) {
            throw new Halt('Your robot went round and round and never reached the flag. Look at what happens inside your loop!')
          }
          if (b.body.length === 0) throw new Halt('Your “repeat until” loop is empty, so the robot would wait forever. Put some blocks inside it!')
          execList(b.body)
          currentBlock = b.id
        }
        break
      }
      case 'ifWall':
      case 'ifLine':
      case 'ifColor': {
        let yes: boolean
        if (b.type === 'ifColor') {
          yes = colorOf(tileAt(arena, s.x, s.y)) === b.color
        } else {
          const { x, y } = ahead()
          const t = tileAt(arena, x, y)
          yes = b.type === 'ifWall' ? isWallTile(t) : isLineTile(t)
        }
        push('check', { ...s, said: null })
        execList(yes ? b.body : b.elseBody)
        break
      }
      case 'pickup': {
        const k = key(s.x, s.y)
        if (s.carrying) {
          push('oops', { ...s, said: null })
          throw new Halt(`Your robot is already holding a box on step ${step}. Drop it first!`)
        }
        if (!s.objects.includes(k)) {
          push('oops', { ...s, said: null })
          throw new Halt(`There's nothing here to pick up on step ${step}. Drive onto the box first.`)
        }
        push('pickup', { ...s, carrying: true, objects: s.objects.filter((o) => o !== k), said: null })
        break
      }
      case 'drop': {
        const k = key(s.x, s.y)
        if (!s.carrying) {
          push('oops', { ...s, said: null })
          throw new Halt(`Your robot isn't holding anything to drop on step ${step}.`)
        }
        if (s.objects.includes(k)) {
          push('oops', { ...s, said: null })
          throw new Halt(`There's already a box here on step ${step}. Find an empty spot.`)
        }
        push('drop', { ...s, carrying: false, objects: [...s.objects, k], said: null })
        break
      }
      case 'penDown':
        push('pen', { ...s, penDown: true, said: null })
        break
      case 'penUp':
        push('pen', { ...s, penDown: false, said: null })
        break
      case 'lightOn':
        push('light', { ...s, lightOn: true, said: null })
        break
      case 'say':
        push('say', { ...s, said: b.text.slice(0, 40) })
        break
    }
  }

  try {
    if (program.length === 0) {
      return { frames, won: false, message: 'Your program is empty. Tap a block to add it!', errorStep: null, errorBlockId: null }
    }
    execList(program)
  } catch (e) {
    if (e instanceof Halt) {
      return { frames, won: false, message: e.kindMessage, errorStep: step, errorBlockId: currentBlock }
    }
    throw e
  }

  const verdict = judge(arena, s, win, program, mustUse)
  return { frames, won: verdict.won, message: verdict.message, errorStep: null, errorBlockId: null }
}

function addUnique(list: string[], k: string): string[] {
  return list.includes(k) ? list : [...list, k]
}

function judge(a: ParsedArena, s: WorldState, win: WinRule, program: Block[], mustUse: BlockType[]): { won: boolean; message: string } {
  if (win.gems && s.gems.length > 0) {
    return { won: false, message: `So close! You missed ${plural(s.gems.length, 'gem', 'gems')}. Find a path that drives over every one.` }
  }
  if (win.deliver) {
    if (s.carrying) return { won: false, message: 'Your robot is still holding a box. Use “Drop” on a drop zone.' }
    const left = s.objects.filter((o) => !a.drops.includes(o)).length
    if (left > 0) return { won: false, message: `${plural(left, 'box still needs', 'boxes still need')} to go on a glowing drop zone.` }
  }
  if (win.draw) {
    const missing = a.target.filter((e) => !s.trail.includes(e)).length
    const extra = s.trail.filter((e) => !a.target.includes(e)).length
    if (s.trail.length === 0) return { won: false, message: 'Nothing was drawn! Put the pen down before you drive.' }
    if (extra > 0) return { won: false, message: `Your drawing has ${plural(extra, 'extra line', 'extra lines')}. Lift the pen or change the path.` }
    if (missing > 0) return { won: false, message: `Your drawing is missing ${plural(missing, 'piece', 'pieces')}. Compare it with the dotted shape.` }
  }
  if (win.goal && a.goal) {
    if (s.x !== a.goal.x || s.y !== a.goal.y) {
      const d = Math.abs(s.x - a.goal.x) + Math.abs(s.y - a.goal.y)
      return { won: false, message: `Your robot stopped ${plural(d, 'tile', 'tiles')} away from the flag. Keep going!` }
    }
  }
  const used = usedTypes(program)
  const missingBlock = mustUse.find((t) => !used.has(t))
  if (missingBlock) {
    return {
      won: false,
      message: `You reached the end — but this mission is about the “${BLOCK_INFO[missingBlock].label}” block. Use it so your program works on ANY layout.`,
    }
  }
  return { won: true, message: 'You did it!' }
}

export interface MissionRun {
  results: RunResult[]
  won: boolean
}

/** Run the program on every arena of a mission. Stops at the first arena it fails. */
export function runMission(
  program: Block[],
  mission: { arenas: ArenaDef[]; win: WinRule; mustUse?: BlockType[] },
  caps: Set<Capability>,
): MissionRun {
  const results: RunResult[] = []
  for (const arena of mission.arenas) {
    const r = run(program, arena, caps, mission.win, mission.mustUse)
    results.push(r)
    if (!r.won) return { results, won: false }
  }
  return { results, won: true }
}

/** Stars: 3 inside the block budget without hints, 2 when solved, 1 when hints were used. */
export function starsFor(blockCount: number, budget: number, usedHint: boolean): 1 | 2 | 3 {
  if (usedHint) return 1
  return blockCount <= budget ? 3 : 2
}
