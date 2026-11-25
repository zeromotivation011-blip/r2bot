// components/kids/activities/templates/sequence-path/engine.ts
// The grid-robot engine shared by `sequence-path` and `debug-program`.
// Pure TypeScript: no React, no DOM. Runs in Node (verify.ts) and the browser.
//
// The robot model is a differential-drive rover on a square grid: it can drive
// one cell forward or back, and turn 90° on the spot. Its bumper stops it when
// it meets a wall or the edge of the map. Higher bands add loops, a
// "repeat until at the goal" loop and an "if wall ahead" sensor check — enough
// to write a real wall-following algorithm.

/** Compass heading. Row 0 is the top of the map, so N is "up" on screen. */
export type Dir = 'N' | 'E' | 'S' | 'W'

/** A grid cell as [column, row]; [0, 0] is the top-left cell. */
export type Cell = [number, number]

/**
 * One block of a robot program.
 * - `forward` / `back`: drive one cell (bumper stops the robot at walls/edges).
 * - `left` / `right`: turn 90° on the spot (a differential drive can pivot).
 * - `repeat`: run `body` `times` times (1–20).
 * - `untilGoal`: run `body` again and again until the robot is on the goal
 *   (checked BEFORE each pass, like Python's `while not at_goal()`).
 * - `ifWall`: read the front distance sensor; run `then` if a wall or the map
 *   edge is directly ahead, otherwise `else`.
 */
export type Cmd =
  | { op: 'forward' }
  | { op: 'back' }
  | { op: 'left' }
  | { op: 'right' }
  | { op: 'repeat'; times: number; body: Cmd[] }
  | { op: 'untilGoal'; body: Cmd[] }
  | { op: 'ifWall'; then: Cmd[]; else: Cmd[] }

export type Op = Cmd['op']
export const PRIMITIVE_OPS: Op[] = ['forward', 'back', 'left', 'right']
export const ALL_OPS: Op[] = ['forward', 'back', 'left', 'right', 'repeat', 'untilGoal', 'ifWall']

/** Visual skin + vocabulary. Every theme is a real job robots do. */
export type Theme = 'warehouse' | 'mars' | 'ocean' | 'farm' | 'hospital'

export interface ThemeInfo {
  robot: string
  goal: string
  gem: string
  gems: string
  wall: string
}

export const THEMES: Record<Theme, ThemeInfo> = {
  warehouse: { robot: 'warehouse robot', goal: 'charging dock', gem: 'parcel', gems: 'parcels', wall: 'shelf' },
  mars: { robot: 'Mars rover', goal: 'base station', gem: 'rock sample', gems: 'rock samples', wall: 'boulder' },
  ocean: { robot: 'underwater drone', goal: 'docking cage', gem: 'sensor buoy', gems: 'sensor buoys', wall: 'reef' },
  farm: { robot: 'farm robot', goal: 'barn', gem: 'ripe strawberry', gems: 'ripe strawberries', wall: 'hay bale' },
  hospital: { robot: 'delivery robot', goal: 'nurses’ station', gem: 'medicine box', gems: 'medicine boxes', wall: 'trolley' },
}

/** A map the robot drives on. */
export interface World {
  /** 2–12 columns. */
  cols: number
  /** 2–12 rows. */
  rows: number
  /** Where the robot starts and which way it faces. */
  start: { at: Cell; dir: Dir }
  /** The cell the robot must END on. */
  goal: Cell
  /** Blocked cells. */
  walls?: Cell[]
  /** Cells the robot must drive over (collected on entry). All must be collected. */
  gems?: Cell[]
}

export const MAX_STEPS = 400

const DELTA: Record<Dir, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }
const LEFT_OF: Record<Dir, Dir> = { N: 'W', W: 'S', S: 'E', E: 'N' }
const RIGHT_OF: Record<Dir, Dir> = { N: 'E', E: 'S', S: 'W', W: 'N' }

export const sameCell = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1]
const key = (c: Cell) => `${c[0]},${c[1]}`

export type FrameEvent = 'start' | 'move' | 'turn' | 'gem' | 'bump' | 'check'

/** A snapshot after one primitive action, for animation and highlighting. */
export interface Frame {
  at: Cell
  dir: Dir
  /** Path of the block that produced this frame ('' for the start frame). */
  node: string
  event: FrameEvent
  /** Gem cells collected so far (keys "c,r"). */
  collected: string[]
  /** For `bump`: the cell the robot tried to enter. */
  blocked?: Cell
}

export type Outcome = 'goal' | 'crash' | 'loop' | 'short' | 'overshoot' | 'missed-gems' | 'empty'

export interface RunResult {
  frames: Frame[]
  outcome: Outcome
  /** Primitive moves/turns executed. */
  actions: number
}

export function isBlocked(world: World, c: Cell): 'edge' | 'wall' | null {
  if (c[0] < 0 || c[1] < 0 || c[0] >= world.cols || c[1] >= world.rows) return 'edge'
  if ((world.walls ?? []).some((w) => sameCell(w, c))) return 'wall'
  return null
}

/** Run a program on a world. Deterministic; always terminates (MAX_STEPS cap). */
export function runProgram(world: World, program: Cmd[], maxSteps = MAX_STEPS): RunResult {
  let at: Cell = [world.start.at[0], world.start.at[1]]
  let dir: Dir = world.start.dir
  const gemKeys = new Set((world.gems ?? []).map(key))
  const collected: string[] = []
  const frames: Frame[] = [{ at, dir, node: '', event: 'start', collected: [] }]
  let steps = 0
  let actions = 0
  let halted: 'crash' | 'loop' | null = null
  let passedGoalComplete = false

  const tick = () => {
    steps++
    if (steps > maxSteps) halted = 'loop'
  }
  const atGoal = () => sameCell(at, world.goal)

  const move = (sign: 1 | -1, node: string) => {
    const d = DELTA[dir]
    const next: Cell = [at[0] + d[0] * sign, at[1] + d[1] * sign]
    if (isBlocked(world, next)) {
      frames.push({ at, dir, node, event: 'bump', collected: [...collected], blocked: next })
      halted = 'crash'
      return
    }
    at = next
    let event: FrameEvent = 'move'
    const k = key(at)
    if (gemKeys.has(k) && !collected.includes(k)) {
      collected.push(k)
      event = 'gem'
    }
    frames.push({ at, dir, node, event, collected: [...collected] })
    if (atGoal() && collected.length === gemKeys.size) passedGoalComplete = true
  }

  const exec = (list: Cmd[], path: string) => {
    for (let i = 0; i < list.length; i++) {
      if (halted) return
      const c = list[i]
      const p = path ? `${path}.${i}` : `${i}`
      switch (c.op) {
        case 'forward':
        case 'back':
          tick()
          if (halted) return
          actions++
          move(c.op === 'forward' ? 1 : -1, p)
          break
        case 'left':
        case 'right':
          tick()
          if (halted) return
          actions++
          dir = c.op === 'left' ? LEFT_OF[dir] : RIGHT_OF[dir]
          frames.push({ at, dir, node: p, event: 'turn', collected: [...collected] })
          break
        case 'repeat':
          for (let k = 0; k < c.times; k++) {
            tick()
            if (halted) return
            exec(c.body, `${p}.body`)
          }
          break
        case 'untilGoal':
          while (!atGoal()) {
            tick()
            if (halted) return
            exec(c.body, `${p}.body`)
          }
          break
        case 'ifWall': {
          tick()
          if (halted) return
          const d = DELTA[dir]
          const wall = isBlocked(world, [at[0] + d[0], at[1] + d[1]]) !== null
          frames.push({ at, dir, node: p, event: 'check', collected: [...collected] })
          exec(wall ? c.then : c.else, `${p}.${wall ? 'then' : 'else'}`)
          break
        }
      }
    }
  }

  if (program.length === 0) return { frames, outcome: 'empty', actions: 0 }
  exec(program, '')
  let outcome: Outcome
  if (halted) outcome = halted
  else if (atGoal() && collected.length === gemKeys.size) outcome = 'goal'
  else if (atGoal()) outcome = 'missed-gems'
  else if (passedGoalComplete) outcome = 'overshoot'
  else outcome = 'short'
  return { frames, outcome, actions }
}

/** Blocks used: every block counts 1, including loop/if headers. */
export function countBlocks(program: Cmd[]): number {
  let n = 0
  for (const c of program) {
    n++
    if (c.op === 'repeat' || c.op === 'untilGoal') n += countBlocks(c.body)
    if (c.op === 'ifWall') n += countBlocks(c.then) + countBlocks(c.else)
  }
  return n
}

/** Deepest nesting of loops/ifs (0 = a flat list). */
export function nestingDepth(program: Cmd[]): number {
  let d = 0
  for (const c of program) {
    if (c.op === 'repeat' || c.op === 'untilGoal') d = Math.max(d, 1 + nestingDepth(c.body))
    if (c.op === 'ifWall') d = Math.max(d, 1 + nestingDepth(c.then), 1 + nestingDepth(c.else))
  }
  return d
}

/** Every op used anywhere in the program. */
export function opsUsed(program: Cmd[], into: Set<Op> = new Set()): Set<Op> {
  for (const c of program) {
    into.add(c.op)
    if (c.op === 'repeat' || c.op === 'untilGoal') opsUsed(c.body, into)
    if (c.op === 'ifWall') {
      opsUsed(c.then, into)
      opsUsed(c.else, into)
    }
  }
  return into
}

/** Problems with a program's shape (repeat counts, unknown ops). */
export function programShapeErrors(program: unknown, label = 'program'): string[] {
  const errs: string[] = []
  const walk = (list: unknown, at: string) => {
    if (!Array.isArray(list)) {
      errs.push(`${at} must be an array of blocks`)
      return
    }
    list.forEach((raw, i) => {
      const c = raw as Partial<Cmd> & { op?: string }
      const here = `${at}[${i}]`
      if (!c || typeof c !== 'object' || !ALL_OPS.includes(c.op as Op)) {
        errs.push(`${here} has an unknown op`)
        return
      }
      if (c.op === 'repeat') {
        const r = c as { times?: unknown; body?: unknown }
        if (typeof r.times !== 'number' || !Number.isInteger(r.times) || r.times < 1 || r.times > 20) errs.push(`${here}.times must be an integer 1–20`)
        walk(r.body, `${here}.body`)
      }
      if (c.op === 'untilGoal') walk((c as { body?: unknown }).body, `${here}.body`)
      if (c.op === 'ifWall') {
        walk((c as { then?: unknown }).then, `${here}.then`)
        walk((c as { else?: unknown }).else, `${here}.else`)
      }
    })
  }
  walk(program, label)
  return errs
}

/** BFS distance in moves (ignoring heading) from `from` to `to`, or -1 when unreachable. */
export function gridDistance(world: World, from: Cell, to: Cell): number {
  const seen = new Set([key(from)])
  let frontier: Cell[] = [from]
  let d = 0
  while (frontier.length) {
    const next: Cell[] = []
    for (const c of frontier) {
      if (sameCell(c, to)) return d
      for (const dd of Object.values(DELTA)) {
        const n: Cell = [c[0] + dd[0], c[1] + dd[1]]
        if (!isBlocked(world, n) && !seen.has(key(n))) {
          seen.add(key(n))
          next.push(n)
        }
      }
    }
    frontier = next
    d++
  }
  return -1
}

/** Problems with a world (empty when valid). */
export function validateWorld(world: World, label = 'world'): string[] {
  const errs: string[] = []
  if (!world || typeof world !== 'object') return [`${label} is missing`]
  const { cols, rows } = world
  if (!Number.isInteger(cols) || cols < 2 || cols > 12) errs.push(`${label}.cols must be an integer 2–12`)
  if (!Number.isInteger(rows) || rows < 2 || rows > 12) errs.push(`${label}.rows must be an integer 2–12`)
  if (errs.length) return errs
  const inside = (c: Cell) => Array.isArray(c) && c.length === 2 && Number.isInteger(c[0]) && Number.isInteger(c[1]) && c[0] >= 0 && c[1] >= 0 && c[0] < cols && c[1] < rows
  if (!inside(world.start?.at)) errs.push(`${label}.start.at is outside the map`)
  if (!['N', 'E', 'S', 'W'].includes(world.start?.dir)) errs.push(`${label}.start.dir must be N, E, S or W`)
  if (!inside(world.goal)) errs.push(`${label}.goal is outside the map`)
  const walls = world.walls ?? []
  const gems = world.gems ?? []
  walls.forEach((w, i) => { if (!inside(w)) errs.push(`${label}.walls[${i}] is outside the map`) })
  gems.forEach((g, i) => { if (!inside(g)) errs.push(`${label}.gems[${i}] is outside the map`) })
  if (errs.length) return errs
  const wallKeys = new Set(walls.map(key))
  if (wallKeys.has(key(world.start.at))) errs.push(`${label}: the robot starts inside a wall`)
  if (wallKeys.has(key(world.goal))) errs.push(`${label}: the goal is inside a wall`)
  if (sameCell(world.start.at, world.goal) && gems.length === 0) errs.push(`${label}: the robot already starts on the goal`)
  const gemKeys = new Set<string>()
  gems.forEach((g, i) => {
    if (wallKeys.has(key(g))) errs.push(`${label}.gems[${i}] is inside a wall`)
    if (sameCell(g, world.start.at)) errs.push(`${label}.gems[${i}] is on the start cell`)
    if (gemKeys.has(key(g))) errs.push(`${label}.gems[${i}] is a duplicate`)
    gemKeys.add(key(g))
  })
  if (errs.length) return errs
  if (gridDistance(world, world.start.at, world.goal) < 0) errs.push(`${label}: the goal cannot be reached from the start`)
  gems.forEach((g, i) => {
    if (gridDistance(world, world.start.at, g) < 0) errs.push(`${label}.gems[${i}] cannot be reached from the start`)
  })
  return errs
}

// ── Paths & listing ────────────────────────────────────────────────────────
// A block's path is its index chain: "2" (root block 2), "2.body.0" (first
// block inside it), "4.then.1", "4.else.0". A *list* path names a block list:
// "" (root), "2.body", "4.then", "4.else".

export type ListKey = 'body' | 'then' | 'else'

export interface Row {
  /** Block path, or `${ifPath}.else` for an "otherwise" divider row. */
  path: string
  depth: number
  cmd: Cmd | null
  kind: 'leaf' | 'open' | 'else'
}

/** Flatten a program into display rows (blocks view and Python view share them). */
export function listRows(program: Cmd[], path = '', depth = 0, out: Row[] = []): Row[] {
  program.forEach((c, i) => {
    const p = path ? `${path}.${i}` : `${i}`
    if (c.op === 'repeat' || c.op === 'untilGoal') {
      out.push({ path: p, depth, cmd: c, kind: 'open' })
      listRows(c.body, `${p}.body`, depth + 1, out)
    } else if (c.op === 'ifWall') {
      out.push({ path: p, depth, cmd: c, kind: 'open' })
      listRows(c.then, `${p}.then`, depth + 1, out)
      out.push({ path: `${p}.else`, depth, cmd: null, kind: 'else' })
      listRows(c.else, `${p}.else`, depth + 1, out)
    } else {
      out.push({ path: p, depth, cmd: c, kind: 'leaf' })
    }
  })
  return out
}

/** 1-based row number of a block path in `listRows` order (0 when absent). */
export function rowNumber(program: Cmd[], path: string): number {
  return listRows(program).findIndex((r) => r.path === path) + 1
}

export function blockLabel(c: Cmd): string {
  switch (c.op) {
    case 'forward': return 'Drive forward'
    case 'back': return 'Reverse'
    case 'left': return 'Turn left'
    case 'right': return 'Turn right'
    case 'repeat': return `Repeat ${c.times} times`
    case 'untilGoal': return 'Repeat until at goal'
    case 'ifWall': return 'If wall ahead'
  }
}

export function pythonLine(c: Cmd | null): string {
  if (!c) return 'else:'
  switch (c.op) {
    case 'forward': return 'robot.forward()'
    case 'back': return 'robot.back()'
    case 'left': return 'robot.turn_left()'
    case 'right': return 'robot.turn_right()'
    case 'repeat': return `for _ in range(${c.times}):`
    case 'untilGoal': return 'while not robot.at_goal():'
    case 'ifWall': return 'if robot.wall_ahead():'
  }
}

/** The program as Python lines (empty bodies get `pass`), each tagged with its block path. */
export function pythonRows(program: Cmd[]): { text: string; path: string | null }[] {
  const lines: { text: string; path: string | null }[] = []
  const walk = (list: Cmd[], path: string, depth: number) => {
    const pad = '    '.repeat(depth)
    if (list.length === 0) lines.push({ text: `${pad}pass`, path: null })
    list.forEach((c, i) => {
      const p = path ? `${path}.${i}` : `${i}`
      lines.push({ text: `${pad}${pythonLine(c)}`, path: p })
      if (c.op === 'repeat' || c.op === 'untilGoal') walk(c.body, `${p}.body`, depth + 1)
      if (c.op === 'ifWall') {
        walk(c.then, `${p}.then`, depth + 1)
        lines.push({ text: `${pad}else:`, path: `${p}.else` })
        walk(c.else, `${p}.else`, depth + 1)
      }
    })
  }
  walk(program, '', 0)
  return lines
}

export function toPython(program: Cmd[]): string[] {
  return pythonRows(program).map((l) => l.text)
}

function splitPath(listPath: string): (number | ListKey)[] {
  if (!listPath) return []
  return listPath.split('.').map((s) => (/^\d+$/.test(s) ? Number(s) : (s as ListKey)))
}

/** The block list at `listPath`. */
export function getList(program: Cmd[], listPath: string): Cmd[] {
  const segs = splitPath(listPath)
  let list = program
  for (let i = 0; i < segs.length; i += 2) {
    const c = list[segs[i] as number]
    const k = segs[i + 1] as ListKey
    if (!c) return []
    if (k === 'body' && (c.op === 'repeat' || c.op === 'untilGoal')) list = c.body
    else if ((k === 'then' || k === 'else') && c.op === 'ifWall') list = c[k]
    else return []
  }
  return list
}

/** Return a new program with the list at `listPath` replaced by `fn(list)`. */
export function updateList(program: Cmd[], listPath: string, fn: (list: Cmd[]) => Cmd[]): Cmd[] {
  const segs = splitPath(listPath)
  const rec = (list: Cmd[], s: number): Cmd[] => {
    if (s >= segs.length) return fn(list)
    const idx = segs[s] as number
    const k = segs[s + 1] as ListKey
    return list.map((c, i) => {
      if (i !== idx) return c
      if (k === 'body' && (c.op === 'repeat' || c.op === 'untilGoal')) return { ...c, body: rec(c.body, s + 2) }
      if ((k === 'then' || k === 'else') && c.op === 'ifWall') return { ...c, [k]: rec(c[k], s + 2) }
      return c
    })
  }
  return rec(program, 0)
}

/** Split a block path "2.body.1" into its list path "2.body" and index 1. */
export function parentOf(path: string): { listPath: string; index: number } {
  const i = path.lastIndexOf('.')
  if (i < 0) return { listPath: '', index: Number(path) }
  return { listPath: path.slice(0, i), index: Number(path.slice(i + 1)) }
}

export function getBlock(program: Cmd[], path: string): Cmd | undefined {
  const { listPath, index } = parentOf(path)
  return getList(program, listPath)[index]
}

export function replaceBlock(program: Cmd[], path: string, fn: (c: Cmd) => Cmd | null): Cmd[] {
  const { listPath, index } = parentOf(path)
  return updateList(program, listPath, (l) => {
    const out: Cmd[] = []
    l.forEach((c, i) => {
      if (i !== index) out.push(c)
      else {
        const r = fn(c)
        if (r) out.push(r)
      }
    })
    return out
  })
}

export function newBlock(op: Op): Cmd {
  switch (op) {
    case 'repeat': return { op, times: 2, body: [] }
    case 'untilGoal': return { op, body: [] }
    case 'ifWall': return { op, then: [], else: [] }
    default: return { op } as Cmd
  }
}

/**
 * Minimal number of single-block edits turning `a` into `b`: insert a block,
 * delete a block, change one primitive into another, change a repeat count.
 * Deleting/inserting a loop costs 1 + the blocks inside it.
 */
export function editDistance(a: Cmd[], b: Cmd[]): number {
  const size = (c: Cmd): number => 1 + (c.op === 'repeat' || c.op === 'untilGoal' ? countBlocks(c.body) : c.op === 'ifWall' ? countBlocks(c.then) + countBlocks(c.else) : 0)
  const sub = (x: Cmd, y: Cmd): number => {
    const px = PRIMITIVE_OPS.includes(x.op)
    const py = PRIMITIVE_OPS.includes(y.op)
    if (px && py) return x.op === y.op ? 0 : 1
    if (x.op === 'repeat' && y.op === 'repeat') return (x.times === y.times ? 0 : 1) + editDistance(x.body, y.body)
    if (x.op === 'untilGoal' && y.op === 'untilGoal') return editDistance(x.body, y.body)
    if (x.op === 'ifWall' && y.op === 'ifWall') return editDistance(x.then, y.then) + editDistance(x.else, y.else)
    return size(x) + size(y)
  }
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = 1; i <= m; i++) dp[i][0] = dp[i - 1][0] + size(a[i - 1])
  for (let j = 1; j <= n; j++) dp[0][j] = dp[0][j - 1] + size(b[j - 1])
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + size(a[i - 1]), dp[i][j - 1] + size(b[j - 1]), dp[i - 1][j - 1] + sub(a[i - 1], b[j - 1]))
    }
  }
  return dp[m][n]
}

/** Kind, specific explanation of a failed run. */
export function explainRun(world: World, program: Cmd[], r: RunResult, theme: Theme, mapLabel = ''): string {
  const t = THEMES[theme]
  const where = mapLabel ? ` on ${mapLabel}` : ''
  const last = r.frames[r.frames.length - 1]
  const gemTotal = (world.gems ?? []).length
  switch (r.outcome) {
    case 'goal':
      return `The ${t.robot} reached the ${t.goal}${where}.`
    case 'empty':
      return 'Your program is empty — add some blocks so the robot knows what to do.'
    case 'crash': {
      const what = last.blocked ? isBlocked(world, last.blocked) : null
      const row = rowNumber(program, last.node)
      const thing = what === 'wall' ? `a ${t.wall}` : 'the edge of the map'
      return `${mapLabel ? `${cap(mapLabel)}: ` : ''}at block ${row} (“${blockLabelAt(program, last.node)}”) the ${t.robot} drove into ${thing}, and its bumper stopped it. Check which way it was facing just before that block.`
    }
    case 'loop':
      return `${mapLabel ? `${cap(mapLabel)}: ` : ''}the robot was still running after ${MAX_STEPS} steps — a loop that never ends. Make sure every pass of the loop moves it closer to the ${t.goal}.`
    case 'missed-gems': {
      const left = gemTotal - last.collected.length
      return `${mapLabel ? `${cap(mapLabel)}: ` : ''}the robot reached the ${t.goal} but left ${left} ${left === 1 ? t.gem : t.gems} behind. Plan a route that drives over every one first.`
    }
    case 'overshoot':
      return `${mapLabel ? `${cap(mapLabel)}: ` : ''}the robot got to the ${t.goal}, then kept driving — a robot stops only where its program ends. Remove the extra blocks after it arrives.`
    case 'short': {
      const d = gridDistance(world, last.at, world.goal)
      const left = gemTotal - last.collected.length
      const gemNote = left > 0 ? ` and still needs ${left} ${left === 1 ? t.gem : t.gems}` : ''
      return `${mapLabel ? `${cap(mapLabel)}: ` : ''}the program finished with the robot ${d} ${d === 1 ? 'move' : 'moves'} away from the ${t.goal}${gemNote}. It needs more blocks, or a different turn.`
    }
  }
}

function blockLabelAt(program: Cmd[], path: string): string {
  const b = getBlock(program, path)
  return b ? blockLabel(b) : 'move'
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Shortest cell path from `from` to `to` (inclusive), or [] when unreachable. */
export function bfsPath(world: World, from: Cell, to: Cell): Cell[] {
  const prev = new Map<string, Cell | null>([[key(from), null]])
  let frontier: Cell[] = [from]
  while (frontier.length) {
    const next: Cell[] = []
    for (const c of frontier) {
      if (sameCell(c, to)) {
        const out: Cell[] = []
        let cur: Cell | null = c
        while (cur) {
          out.unshift(cur)
          cur = prev.get(key(cur)) ?? null
        }
        return out
      }
      for (const dd of Object.values(DELTA)) {
        const n: Cell = [c[0] + dd[0], c[1] + dd[1]]
        if (!isBlocked(world, n) && !prev.has(key(n))) {
          prev.set(key(n), c)
          next.push(n)
        }
      }
    }
    frontier = next
  }
  return []
}
