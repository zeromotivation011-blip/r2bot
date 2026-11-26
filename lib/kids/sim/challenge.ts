// lib/kids/sim/challenge.ts
// A course CHALLENGE on top of a physics arena: the picture blocks a child may
// use, what counts as success (several criteria, not just "reach the goal"),
// stars for craft, and a runner that watches the run tick by tick.
//
// Programs for young children are PICTURE PROGRAMS: a list of tapped blocks,
// each one entry of the challenge's palette with its parameters fixed (or one
// chip chosen). compile() turns a picture program into the shared block set
// (program.ts) that the interpreter runs; statement ids are "<key>~<uid>" so
// the editor can light up the running block and stars can read the program.
//
// Pure TypeScript, no DOM: verify.ts runs every challenge headless.

import { getPart, type Capability, type RobotDesign, type Slot } from '../robot-design'
import { floorAt, inShape, type Arena, type Shape2D, type Vec2 } from './arena'
import { DT } from './engine'
import type { Expr, Program, Stmt, StmtOp } from './program'
import { countStmts } from './program'
import type { Rapier } from './rapier'
import { createRun, type Run } from './run'

// ── Picture blocks ────────────────────────────────────────────────────────

export interface PaletteBlock {
  /** Unique within the palette: 'hop', 'hop-back', 'left', 'until-close'… */
  key: string
  /** Read aloud and shown on the block. */
  label: string
  icon: string
  op: StmtOp
  /** Parameters the child cannot change. */
  fixed: Record<string, number | string>
  /** One parameter the child picks from chips. */
  choice?: { param: string; values: ReadonlyArray<number | string> }
  /** Repeat / until / if: holds other blocks. */
  container: boolean
}

/** One placed block in a picture program. */
export interface PicNode {
  uid: string
  key: string
  /** The chip the child chose (when the block has a choice). */
  choice?: number | string
  children?: PicNode[]
}

let uidSeq = 0
export function newUid(): string {
  uidSeq = (uidSeq + 1) % 1_000_000
  return `b${Date.now().toString(36)}${uidSeq.toString(36)}`
}

/** Build a node (used by arena reference programs): pic('hop', 2), pic('repeat', 4, [...]). */
export function pic(key: string, choice?: number | string, children?: PicNode[]): PicNode {
  return { uid: `r${++uidSeq}`, key, ...(choice !== undefined ? { choice } : {}), ...(children ? { children } : {}) }
}

/** "distance_cm < 20" → a compare Expr; "bumped" → the bumper sensor. */
export function condExpr(cond: string): Expr {
  const m = /^\s*(distance_cm|timer_s|heading_deg)\s*([<>=])\s*(-?\d+(?:\.\d+)?)\s*$/.exec(cond)
  if (m) return { k: 'compare', op: m[2] as '<' | '>' | '=', a: { k: 'sensor', s: m[1] as 'distance_cm' }, b: { k: 'number', v: Number(m[3]) } }
  if (cond === 'bumped' || cond === 'line_seen') return { k: 'sensor', s: cond }
  throw new Error(`Unknown picture-block condition "${cond}"`)
}

const num = (v: number | string | undefined, fallback: number): Expr => ({ k: 'number', v: typeof v === 'number' ? v : Number(v ?? fallback) })

export function paletteByKey(palette: PaletteBlock[]): Map<string, PaletteBlock> {
  return new Map(palette.map((b) => [b.key, b]))
}

/** The parameters a placed block runs with: fixed values plus the chosen chip. */
export function paramsOf(b: PaletteBlock, n: PicNode): Record<string, number | string> {
  const out: Record<string, number | string> = { ...b.fixed }
  if (b.choice) out[b.choice.param] = n.choice !== undefined && b.choice.values.includes(n.choice) ? n.choice : b.choice.values[0]
  return out
}

function compileNode(n: PicNode, pal: Map<string, PaletteBlock>): Stmt {
  const b = pal.get(n.key)
  if (!b) throw new Error(`Block "${n.key}" is not in this challenge's palette`)
  const p = paramsOf(b, n)
  const id = `${b.key}~${n.uid}`
  const body = (n.children ?? []).map((c) => compileNode(c, pal))
  switch (b.op) {
    case 'drive_for':
      return { op: 'drive_for', id, speedPct: num(p.speedPct, 50), seconds: num(p.seconds, 1) }
    case 'turn_degrees':
      return { op: 'turn_degrees', id, deg: num(p.deg, 90), speedPct: num(p.speedPct, 40) }
    case 'wait':
      return { op: 'wait', id, seconds: num(p.seconds, 1) }
    case 'repeat':
      return { op: 'repeat', id, times: num(p.n, 2), body }
    case 'repeat_until':
      return { op: 'repeat_until', id, cond: condExpr(String(p.cond)), body }
    case 'if':
      return { op: 'if', id, cond: condExpr(String(p.cond)), then: body }
    case 'say':
      return { op: 'say', id, text: { k: 'text', v: String(p.text ?? '') } }
    case 'stop':
    case 'beep':
    case 'grip_open':
    case 'grip_close':
    case 'pen_down':
    case 'pen_up':
    case 'light_on':
    case 'light_off':
      return { op: b.op, id }
    default:
      throw new Error(`Picture block op "${b.op}" is not supported`)
  }
}

export function compile(palette: PaletteBlock[], nodes: PicNode[]): Program {
  const pal = paletteByKey(palette)
  return { body: nodes.map((n) => compileNode(n, pal)) }
}

/** Palette key of a compiled statement id. */
export function keyOfStmt(id: string): string {
  const i = id.indexOf('~')
  return i < 0 ? id : id.slice(0, i)
}

/** Every placed block, depth first. */
export function flatten(nodes: PicNode[]): PicNode[] {
  const out: PicNode[] = []
  const walk = (list: PicNode[]) => {
    for (const n of list) {
      out.push(n)
      if (n.children) walk(n.children)
    }
  }
  walk(nodes)
  return out
}

export function countBlocks(nodes: PicNode[]): number {
  return flatten(nodes).length
}

// ── Success criteria ──────────────────────────────────────────────────────

export type SoundStep = { kind: 'beep' } | { kind: 'say'; text: string } | { kind: 'pause'; seconds: number }

/** Families of blocks, for "uses a loop / a sensor / a tool / kind words". */
export type BlockFamily = 'loop' | 'sensor' | 'tool' | 'say' | 'repeat'

export type Criterion =
  /** Ends stopped with its centre in the zone (optionally facing a compass heading). */
  | { kind: 'stop-in-zone'; zone: Shape2D; label: string; facingDeg?: number }
  /** The centre enters the zone at any moment; with endsRun the run stops there (Bolt's dance). */
  | { kind: 'reach-zone'; zone: Shape2D; label: string; endsRun?: boolean }
  /** Touches none of these props/movers (all of them when ids is omitted); walls too unless walls is false. */
  | { kind: 'no-touch'; ids?: string[]; walls: boolean; what: string }
  /** The sounds happen in this order (other sounds may come between them). */
  | { kind: 'sound-sequence'; steps: SoundStep[] }
  /** This Say runs before the robot first moves. */
  | { kind: 'say-before-move'; text: string }
  /** These sounds happen after the robot has stopped in the zone. */
  | { kind: 'sounds-after-arrival'; zone: Shape2D; steps: SoundStep[] }
  /** The pen covers this fraction of the guide (within `tolerance` metres) and never marks inside `avoid`. */
  | { kind: 'draw-path'; guide: Vec2[][]; coverage: number; tolerance: number; avoid?: Shape2D[] }
  /** Block counting: min/max placed blocks, at least `minRun` different blocks actually run, block families required. */
  | { kind: 'blocks'; min?: number; max?: number; minRun?: number; needs?: BlockFamily[] }
  /** The object ends inside the zone, tipped out (or, with held, still in the scoop). */
  | { kind: 'deliver'; object: string; zone?: Shape2D; held?: boolean; label: string }
  /** Every moment the robot's centre is on a dark tile its light is on; optionally off at the end. */
  | { kind: 'light-in-dark'; offAtEnd: boolean }
  /** The bumper is pressed at the end (the robot found the wall by touch). */
  | { kind: 'bumped-at-end' }
  /** Each family is in the program AND one of its blocks actually ran. */
  | { kind: 'uses-blocks'; families: BlockFamily[] }
  /** The robot's centre never leaves this zone (a bridge line it must not cross). */
  | { kind: 'stay-in'; zone: Shape2D; what: string }

export type ChallengeFail =
  | 'missing-part'
  | 'collision'
  | 'short'
  | 'moving'
  | 'facing'
  | 'order'
  | 'drawing'
  | 'blocks'
  | 'not-delivered'
  | 'dark'
  | 'crossed'
  | 'no-bump'
  | 'timeout'

export interface StarContext {
  nodes: PicNode[]
  program: Program
  result: ChallengeResult
  /** The child's earlier attempts in this challenge (oldest first), not counting this one. */
  history: PicNode[][]
}

export interface StarRule {
  /** The curriculum's words for the star. */
  text: string
  /** Checked by the simulator. Without a check the star is about talking or planning: the child (or teacher) claims it. */
  check?: (c: StarContext) => boolean
}

export interface StartPose {
  pos: Vec2
  headingDeg: number
}

export interface PartFit {
  slot: Slot
  id: string
}

export interface Challenge {
  /** The curriculum session id, e.g. "L1-S02". */
  id: string
  session: number
  title: string
  mission: string
  /** The curriculum's arena id (l1-garden-path…). */
  specArena: string
  arena: Arena
  palette: PaletteBlock[]
  /** Capabilities the robot needs; the challenge will not run without them. */
  requires: Capability[]
  /** The robot the curriculum says the child has at this session (the body is always the child's choice). */
  robot: Omit<RobotDesign, 'name' | 'primary' | 'accent' | 'v'>
  /** The part(s) this session's build step fits: what "Fit the part" puts on. */
  fit: PartFit[]
  /** Pre-placed blocks (a buggy program to fix), else empty. */
  starter: PicNode[]
  criteria: Criterion[]
  /** More start poses: the same program runs again from each (all must pass). */
  extraStarts?: StartPose[]
  /** An object already in the scoop when Go is pressed. */
  startHolding?: string
  stars: { two: StarRule; three: StarRule }
  /** The program a child would write with these blocks. Must succeed headless (verify.ts). */
  reference: PicNode[]
  /**
   * Where testing finds a different answer for a body (a heavier robot needs one more hop uphill),
   * that body's reference. The challenge still teaches the same thing; verify.ts runs these.
   */
  bodyReference?: Partial<Record<RobotDesign['body'], PicNode[]>>
  /** Programs (or part swaps) that must fail, and how: the session's taught mistake. */
  failures: { name: string; program?: PicNode[]; parts?: Partial<RobotDesign>; expect: ChallengeFail }[]
  /** Where the curriculum's spec could not be built exactly as written, what was changed (the learning goal is kept). */
  adaptations?: string[]
}

export interface ChallengeResult {
  success: boolean
  reason: ChallengeFail | null
  /** For the child, read aloud. */
  message: string
  /** Every criterion that failed, in order, as messages. */
  problems: string[]
  /**
   * A fuller hint that gives more of the answer away (e.g. the whole order of
   * sounds). The player shows it only after several failed runs — the same
   * point at which it offers "Show me a way" — so a first failure teaches.
   */
  reveal?: string
  time: number
  /** Which start pose failed (multi-start challenges). */
  startIndex: number
  /** Where the robot finished: centre (x, z) and compass heading. */
  end: { x: number; z: number; headingDeg: number }
}

// ── Running a challenge ───────────────────────────────────────────────────

/** Per-run observations the criteria need, gathered every tick. */
export interface Watch {
  firstMoveT: number | null
  /** For each sound event (by index in sim.events): was the robot's centre inside each sounds-after-arrival zone, with its motion blocks done? */
  soundInZone: Map<number, Set<number>>
  reachedAt: Map<number, number>
  darkTicks: number
  leftZone: Map<number, boolean>
}

export interface ChallengeRun {
  run: Run
  watch: Watch
  startIndex: number
  /** One fixed tick; also ends the run early when a reach-zone with endsRun is met. */
  tick(): void
  readonly done: boolean
}

export function startPoses(ch: Challenge): StartPose[] {
  return [ch.arena.start, ...(ch.extraStarts ?? [])]
}

export function arenaForStart(ch: Challenge, i: number): Arena {
  if (i === 0) return ch.arena
  const s = startPoses(ch)[i]
  // A held object starts in front of the robot wherever it starts.
  return { ...ch.arena, start: s }
}

export function createChallengeRun(R: Rapier, ch: Challenge, design: RobotDesign, program: Program, startIndex = 0): ChallengeRun {
  const arena = arenaForStart(ch, startIndex)
  const run = createRun(R, arena, design, program)
  if (ch.startHolding && run.status !== 'done') run.sim.grip(true)
  const watch: Watch = { firstMoveT: null, soundInZone: new Map(), reachedAt: new Map(), darkTicks: 0, leftZone: new Map() }
  let seen = 0
  const cr: ChallengeRun = {
    run,
    watch,
    startIndex,
    get done() {
      return run.status === 'done'
    },
    tick() {
      if (run.status === 'done') return
      run.tick()
      const sim = run.sim
      const snap = sim.snapshot()
      const { x, z } = snap.robot.p
      if (watch.firstMoveT === null && snap.groundSpeed > 0.02) watch.firstMoveT = sim.time
      // Sounds made this tick: where was the robot? (A beep right after a hop counts as "at the door".)
      for (; seen < sim.events.length; seen++) {
        const e = sim.events[seen]
        if (e.kind !== 'beep' && e.kind !== 'say') continue
        const zones = new Set<number>()
        ch.criteria.forEach((c, i) => {
          if (c.kind === 'sounds-after-arrival' && inShape(c.zone, x, z)) zones.add(i)
        })
        watch.soundInZone.set(seen, zones)
      }
      ch.criteria.forEach((c, i) => {
        if (c.kind === 'reach-zone' && !watch.reachedAt.has(i) && inShape(c.zone, x, z)) {
          watch.reachedAt.set(i, sim.time)
          if (c.endsRun && run.status === 'running') {
            run.status = 'settling'
            sim.setMotors(0, 0)
          }
        }
        if (c.kind === 'light-in-dark' && floorAt(arena, x, z, true).dark && !snap.lightOn) watch.darkTicks++
        if (c.kind === 'stay-in' && !inShape(c.zone, x, z)) watch.leftZone.set(i, true)
      })
    },
  }
  return cr
}

const FAMILY_OPS: Record<BlockFamily, StmtOp[]> = {
  loop: ['repeat', 'repeat_until', 'forever'],
  repeat: ['repeat'],
  sensor: ['repeat_until', 'if'],
  tool: ['grip_open', 'grip_close', 'pen_down', 'pen_up', 'light_on', 'light_off'],
  say: ['say'],
}

const FAMILY_WORD: Record<BlockFamily, string> = { loop: 'a loop', repeat: 'a Repeat', sensor: 'a sensor block', tool: 'your tool', say: 'kind words (a Say block)' }

function stmtsOf(list: Stmt[], out: Stmt[] = []): Stmt[] {
  for (const s of list) {
    out.push(s)
    if ('body' in s) stmtsOf(s.body, out)
    if (s.op === 'if') {
      stmtsOf(s.then, out)
      if (s.else) stmtsOf(s.else, out)
    }
  }
  return out
}

function soundsMatch(events: { t: number; kind: string; text?: string }[], steps: SoundStep[], after = -Infinity): boolean {
  const sounds = events.filter((e) => (e.kind === 'beep' || e.kind === 'say') && e.t >= after - 1e-9)
  let i = 0
  let lastT = -Infinity
  let needGap = 0
  for (const st of steps) {
    if (st.kind === 'pause') {
      needGap = st.seconds
      continue
    }
    let found = false
    for (; i < sounds.length; i++) {
      const e = sounds[i]
      const same = st.kind === 'beep' ? e.kind === 'beep' : e.kind === 'say' && (e.text ?? '').toLowerCase() === st.text.toLowerCase()
      if (same && e.t - lastT >= needGap - 1e-6) {
        lastT = e.t
        i++
        found = true
        break
      }
    }
    if (!found) return false
    needGap = 0
  }
  return true
}

/** Fraction of the guide within `tol` metres of the pen trail. */
export function drawCoverage(trail: number[], guide: Vec2[][], tol: number): number {
  const pts: [number, number][] = []
  for (let i = 0; i + 1 < trail.length; i += 2) if (!Number.isNaN(trail[i])) pts.push([trail[i], trail[i + 1]])
  // Densify the trail so a long straight stroke (few points) still counts along its length.
  const dense: [number, number][] = []
  for (let i = 0; i + 3 < trail.length; i += 2) {
    const ax = trail[i]
    const az = trail[i + 1]
    const bx = trail[i + 2]
    const bz = trail[i + 3]
    if (Number.isNaN(ax) || Number.isNaN(bx)) continue
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.01))
    for (let k = 0; k <= n; k++) dense.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n])
  }
  const all = dense.length > 0 ? dense : pts
  let total = 0
  let hit = 0
  for (const g of guide) {
    for (let i = 0; i + 1 < g.length; i++) {
      const [ax, az] = g[i]
      const [bx, bz] = g[i + 1]
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.01))
      for (let k = 0; k < n; k++) {
        const px = ax + ((bx - ax) * (k + 0.5)) / n
        const pz = az + ((bz - az) * (k + 0.5)) / n
        total++
        for (const [qx, qz] of all) {
          if (Math.abs(qx - px) <= tol && Math.abs(qz - pz) <= tol && Math.hypot(qx - px, qz - pz) <= tol) {
            hit++
            break
          }
        }
      }
    }
  }
  return total === 0 ? 1 : hit / total
}

function headingDiff(a: number, b: number): number {
  const d = (((a - b) % 360) + 540) % 360 - 180
  return Math.abs(d)
}

/** Judge one finished run against every criterion. */
export function judgeChallengeRun(ch: Challenge, cr: ChallengeRun, program: Program, nodes: PicNode[]): ChallengeResult {
  const { run, watch } = cr
  const sim = run.sim
  const p0 = sim.snapshot().robot.p
  const base = { time: Math.round(sim.time * 100) / 100, startIndex: cr.startIndex, end: { x: p0.x, z: p0.z, headingDeg: sim.sensors().headingDeg } }
  if (run.result?.reason === 'missing-part') {
    return { ...base, success: false, reason: 'missing-part', message: run.result.message, problems: [run.result.message] }
  }
  const snap = sim.snapshot()
  const { x, z } = snap.robot.p
  const sens = sim.sensors()
  const problems: { reason: ChallengeFail; message: string }[] = []
  const fail = (reason: ChallengeFail, message: string) => problems.push({ reason, message })
  let reveal: { message: string; text: string } | undefined
  const stmts = stmtsOf(program.body)
  const ran = run.interp?.ctx.ran ?? new Set<string>()
  const timedOut = run.result?.reason === 'timeout'

  ch.criteria.forEach((c, i) => {
    switch (c.kind) {
      case 'stop-in-zone': {
        if (!inShape(c.zone, x, z)) {
          fail(timedOut ? 'timeout' : 'short', `Your robot stopped outside ${c.label}. Count the squares again and change one block.`)
        } else if (snap.groundSpeed > 0.03) fail('moving', `Your robot was still rolling. Make it stop on ${c.label}.`)
        else if (c.facingDeg !== undefined && headingDiff(sens.headingDeg, c.facingDeg) > 30) fail('facing', `Your robot reached ${c.label} but is facing the wrong way. Check your last turn.`)
        return
      }
      case 'reach-zone':
        if (!watch.reachedAt.has(i)) {
          const loops = stmts.some((s) => FAMILY_OPS.loop.includes(s.op))
          fail(
            timedOut ? 'timeout' : 'short',
            loops
              ? `Your robot did not get to ${c.label} yet. Does it need more time — a bigger Repeat?`
              : `Your robot did not get to ${c.label} yet. It needs to keep going — try a Repeat.`,
          )
        }
        return
      case 'no-touch': {
        const hits = [...sim.touched].filter((id) => !c.ids || c.ids.includes(id))
        if (hits.length > 0) {
          const prop = [...(ch.arena.props ?? []), ...(ch.arena.movers ?? [])].find((p) => p.id === hits[0])
          fail('collision', `Bonk! Your robot touched the ${prop?.label ?? prop?.kind ?? hits[0]}. Find the block where it goes wrong and fix it.`)
        } else if (c.walls && sim.crashed) fail('collision', `Bonk! Your robot touched ${c.what}. Find the block where it goes wrong and fix it.`)
        return
      }
      case 'sound-sequence':
        if (!soundsMatch(sim.events, c.steps)) {
          const message = orderHint(c.steps, sim.events)
          fail('order', message)
          reveal = { message, text: fullOrder(c.steps) }
        }
        return
      case 'say-before-move': {
        const said = sim.events.find((e) => e.kind === 'say' && (e.text ?? '').toLowerCase() === c.text.toLowerCase())
        if (!said || (watch.firstMoveT !== null && said.t > watch.firstMoveT)) fail('order', `Be polite first: say “${c.text}” before your robot moves.`)
        return
      }
      case 'sounds-after-arrival': {
        const inZone = sim.events.filter((_, k) => watch.soundInZone.get(k)?.has(i))
        if (!soundsMatch(inZone, c.steps)) fail('order', `Arrive first, then ${c.steps.filter((s) => s.kind !== 'pause').map((s) => (s.kind === 'beep' ? 'beep' : `say “${s.text}”`)).join(', then ')}.`)
        return
      }
      case 'draw-path': {
        const cov = drawCoverage(sim.trail, c.guide, c.tolerance)
        const bad = (c.avoid ?? []).some((a) => {
          for (let k = 0; k + 1 < sim.trail.length; k += 2) if (!Number.isNaN(sim.trail[k]) && inShape(a, sim.trail[k], sim.trail[k + 1])) return true
          return false
        })
        if (sim.trail.length === 0) fail('drawing', 'Nothing was drawn. Did you put the pen down first?')
        else if (bad) fail('drawing', 'The pen went through the puddle and smudged. Go round it.')
        else if (cov < c.coverage) fail('drawing', `Your drawing covers ${Math.round(cov * 100)}% of the dotted path. It needs ${Math.round(c.coverage * 100)}%.`)
        return
      }
      case 'blocks': {
        const n = countBlocks(nodes)
        const ranN = stmts.filter((s) => ran.has(s.id)).length
        if (c.max !== undefined && n > c.max) fail('blocks', `That works, but it uses ${n} blocks. Can you do it with ${c.max} or fewer? (A Repeat helps.)`)
        else if (c.min !== undefined && n < c.min) fail('blocks', `Add more steps: use at least ${c.min} blocks.`)
        else if (c.minRun !== undefined && ranN < c.minRun) fail('blocks', `Only ${ranN} block${ranN === 1 ? '' : 's'} ran. Make a show with at least ${c.minRun}.`)
        else
          for (const f of c.needs ?? []) {
            if (!stmts.some((s) => FAMILY_OPS[f].includes(s.op))) {
              fail('blocks', `Use ${FAMILY_WORD[f]} in your program.`)
              break
            }
          }
        return
      }
      case 'deliver': {
        if (c.held) {
          if (snap.holding !== c.object) fail('not-delivered', `The ${c.label} is not in your scoop. Get right up to it, then Scoop up.`)
          return
        }
        const p = sim.objectPos(c.object)
        if (snap.holding === c.object) fail('not-delivered', `The ${c.label} is still in your scoop. Tip it out at the right place.`)
        else if (!p || !c.zone || !inShape(c.zone, p.x, p.z)) fail('not-delivered', `The ${c.label} did not end up in the right place. Where should the robot be when it tips out?`)
        return
      }
      case 'light-in-dark':
        if (watch.darkTicks > 0) fail('dark', 'Your robot was in the dark with its light off. Switch the light on before the dark part.')
        else if (c.offAtEnd && snap.lightOn) fail('dark', 'Remember to switch the light off at the end to save the battery.')
        return
      case 'bumped-at-end':
        if (!sens.bumped) fail('no-bump', 'Your robot did not finish touching the wall. Keep going until you feel a bump.')
        return
      case 'uses-blocks':
        for (const f of c.families) {
          const inProg = stmts.filter((s) => FAMILY_OPS[f].includes(s.op))
          if (inProg.length === 0) {
            fail('blocks', `Your show needs ${FAMILY_WORD[f]}.`)
            break
          }
          if (!inProg.some((s) => ran.has(s.id))) {
            fail('blocks', `${FAMILY_WORD[f][0].toUpperCase()}${FAMILY_WORD[f].slice(1)} is in your program but never ran.`)
            break
          }
        }
        return
      case 'stay-in':
        if (watch.leftZone.get(i)) fail('crossed', `Your robot went past ${c.what}. Use smaller steps near the end.`)
        return
    }
  })

  // The most useful message first: a bump, then where it ended, then the rest.
  const order: ChallengeFail[] = ['collision', 'crossed', 'dark', 'order', 'not-delivered', 'drawing', 'short', 'timeout', 'moving', 'facing', 'no-bump', 'blocks']
  problems.sort((a, b) => order.indexOf(a.reason) - order.indexOf(b.reason))
  if (problems.length > 0) {
    const out: ChallengeResult = { ...base, success: false, reason: problems[0].reason, message: problems[0].message, problems: problems.map((p) => p.message) }
    // The full answer only travels with the problem it belongs to.
    if (reveal && problems[0].message === reveal.message) out.reveal = reveal.text
    return out
  }
  return { ...base, success: true, reason: null, message: 'You did it!', problems: [] }
}

type SoundWord = { kind: 'beep' } | { kind: 'say'; text: string }

function soundWord(s: SoundWord): string {
  return s.kind === 'beep' ? 'Beep' : 'Say'
}

function sameSound(a: SoundWord, b: SoundWord): boolean {
  return a.kind === b.kind && (a.kind === 'beep' || (b.kind === 'say' && a.text.toLowerCase() === b.text.toLowerCase()))
}

/**
 * A first-failure hint that teaches without solving: it names only the first
 * sound that is missing or out of place. The whole order is `fullOrder`,
 * which the player reveals after several failed runs.
 */
export function orderHint(steps: SoundStep[], events: { t: number; kind: string; text?: string }[]): string {
  const want: SoundWord[] = steps.filter((s): s is SoundWord => s.kind !== 'pause')
  const got: SoundWord[] = events
    .filter((e) => e.kind === 'beep' || e.kind === 'say')
    .map((e) => (e.kind === 'beep' ? { kind: 'beep' as const } : { kind: 'say' as const, text: e.text ?? '' }))
  if (got.length === 0) return 'Your robot did not make a sound. Which sound should come first?'
  const n = Math.min(want.length, got.length)
  for (let j = 0; j < n; j++) {
    if (sameSound(want[j], got[j])) continue
    if (j === 0) return `Not quite. Should the ${soundWord(got[0])} really come first?`
    return `Something should happen before the ${soundWord(got[j])}. Look at sound ${j + 1}.`
  }
  if (got.length < want.length) return `Good start! After the ${soundWord(got[got.length - 1])}, your robot still has more to do.`
  // Every sound is there in order, so a wait is missing (or too short).
  return 'The sounds are in the right order. Does your robot need to wait somewhere?'
}

/** The whole order, for when the child has tried a few times. */
export function fullOrder(steps: SoundStep[]): string {
  const words = steps.map((s) => (s.kind === 'beep' ? 'beep' : s.kind === 'say' ? `say “${s.text}”` : `wait ${s.seconds} s`))
  return `Here is the order: ${words.join(', then ')}.`
}

/** Run every start pose to the end, headless. Fails on the first start that fails. */
export function runChallengeHeadless(R: Rapier, ch: Challenge, design: RobotDesign, nodes: PicNode[]): ChallengeResult {
  const program = compile(ch.palette, nodes)
  let last: ChallengeResult | null = null
  for (let i = 0; i < startPoses(ch).length; i++) {
    const cr = createChallengeRun(R, ch, design, program, i)
    const cap = Math.ceil((ch.arena.timeLimit + 4) / DT)
    for (let k = 0; k < cap && !cr.done; k++) cr.tick()
    const res = judgeChallengeRun(ch, cr, program, nodes)
    cr.run.sim.dispose()
    if (!res.success) return res
    last = res
  }
  if (!last) throw new Error('no start pose')
  return last
}

/** 1 star for success, plus each craft star the simulator can check. Unchecked stars are returned as claimable. */
export function awardStars(ch: Challenge, ctx: StarContext): { stars: number; two: boolean; three: boolean; claimable: ('two' | 'three')[] } {
  if (!ctx.result.success) return { stars: 0, two: false, three: false, claimable: [] }
  const claimable: ('two' | 'three')[] = []
  const check = (r: StarRule, which: 'two' | 'three') => {
    if (!r.check) {
      claimable.push(which)
      return false
    }
    return r.check(ctx)
  }
  const two = check(ch.stars.two, 'two')
  const three = check(ch.stars.three, 'three')
  return { stars: 1 + (two ? 1 : 0) + (three ? 1 : 0), two, three, claimable }
}

/** The reference program for this robot's body. */
export function referenceFor(ch: Challenge, design: RobotDesign): PicNode[] {
  return ch.bodyReference?.[design.body] ?? ch.reference
}

/** The parts "Fit the part" puts on so this robot has every capability the challenge needs. Empty = ready. */
export function partsToFit(ch: Challenge, design: RobotDesign, caps: Set<Capability>): PartFit[] {
  const out: PartFit[] = []
  for (const cap of ch.requires) {
    if (caps.has(cap) || out.some((o) => getPart(o.slot, o.id)?.gives.includes(cap))) continue
    const pick =
      ch.fit.find((f) => getPart(f.slot, f.id)?.gives.includes(cap)) ??
      (['drive', 'head', 'tool', 'sensor'] as const).map((slot) => ({ slot, id: ch.robot[slot] as string })).find((f) => getPart(f.slot, f.id)?.gives.includes(cap))
    if (pick && (design as unknown as Record<Slot, string>)[pick.slot] !== pick.id) out.push(pick)
  }
  return out
}

/** The design with these parts fitted. */
export function fitParts(design: RobotDesign, parts: PartFit[]): RobotDesign {
  const d: Record<string, unknown> = { ...design }
  for (const p of parts) d[p.slot] = p.id
  return d as unknown as RobotDesign
}
