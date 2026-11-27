// components/kids/games/arm-factory/sim.ts
// The factory cell simulation: conveyor, parts, bins, gripper, the arm's
// motion (jogging joints or running a program) and the payload physics.
// Fixed time step, seeded parts, no rendering — so a result is fair and the
// same program always gives the same cycle time.

import {
  AMAX,
  GRIP_MAX_FORCE,
  HOME,
  SHOULDER_MAX_TORQUE,
  clampJoint,
  collide,
  fk,
  gripNeeded,
  ik,
  planMove,
  shoulderTorque,
  type Box,
  type Hit,
  type Joints,
  type V3,
} from './kinematics'

// ── The cell layout ─────────────────────────────────────────────────────────

export type PartColor = 'red' | 'blue' | 'yellow'
export const COLORS: PartColor[] = ['red', 'blue', 'yellow']
export const COLOR_HEX: Record<PartColor, number> = { red: 0xef4444, blue: 0x3b82f6, yellow: 0xfacc15 }
/** Shapes printed on parts and bins so the game never relies on colour alone. */
export const COLOR_SYMBOL: Record<PartColor, string> = { red: '●', blue: '▲', yellow: '■' }

export const BELT_Z = -0.55
export const BELT_HALF_W = 0.12
export const BELT_TOP = 0.1
export const BELT_X0 = -1.3
export const BELT_X1 = 1.3
export const SENSOR_X = 0
export const PART_SIZE = 0.06
export const PART_HALF = PART_SIZE / 2
export const GRASP_Y = BELT_TOP + PART_HALF

export interface BinDef {
  color: PartColor
  x: number
  z: number
}
export const BIN_Z = 0.5
export const BIN_INNER = 0.24
export const BIN_WALL = 0.012
export const BIN_H = 0.14
export const BINS: BinDef[] = [
  { color: 'red', x: -0.42, z: BIN_Z },
  { color: 'blue', x: 0, z: BIN_Z },
  { color: 'yellow', x: 0.42, z: BIN_Z },
]

export const PILLAR: Box = { name: 'safety pillar', min: { x: 0.42, y: 0, z: -0.08 }, max: { x: 0.58, y: 0.5, z: 0.08 } }

export const CONVEYOR: Box = {
  name: 'conveyor',
  min: { x: BELT_X0, y: 0, z: BELT_Z - BELT_HALF_W },
  max: { x: BELT_X1, y: BELT_TOP, z: BELT_Z + BELT_HALF_W },
}

function binWalls(): Box[] {
  const out: Box[] = []
  for (const b of BINS) {
    const h = BIN_INNER / 2
    const t = BIN_WALL
    const name = `${b.color} bin wall`
    out.push(
      { name, min: { x: b.x - h - t, y: 0, z: b.z - h - t }, max: { x: b.x + h + t, y: BIN_H, z: b.z - h } },
      { name, min: { x: b.x - h - t, y: 0, z: b.z + h }, max: { x: b.x + h + t, y: BIN_H, z: b.z + h + t } },
      { name, min: { x: b.x - h - t, y: 0, z: b.z - h }, max: { x: b.x - h, y: BIN_H, z: b.z + h } },
      { name, min: { x: b.x + h, y: 0, z: b.z - h }, max: { x: b.x + h + t, y: BIN_H, z: b.z + h } },
    )
  }
  return out
}

// ── Tiers ───────────────────────────────────────────────────────────────────

export type Mode = 'jog' | 'plan' | 'program'

export interface PartSpec {
  color: PartColor
  heavy: boolean
  /** Fixed position on a still belt (Cadet / Ace). */
  x?: number
}

export interface TierConfig {
  tier: number
  mode: Mode
  pendant: boolean
  pillar: boolean
  /** Belt speed m/s (0 = still). */
  beltSpeed: number
  /** Belt stops when a part reaches the pick sensor. */
  indexed: boolean
  /** One part at a time on a still belt. */
  stationary: boolean
  parts: PartSpec[]
  spacing: number
  spawnX: number
  /** Joint speed when jogging, rad/s. */
  jogSpeed: number
  /** How close the fingers must be to the part's centre to grab it, m. */
  graspTol: number
  /** Enforce grip slip and motor torque. */
  dynamics: boolean
  /** A dropped or wrongly binned part is put back on the belt by a helper. */
  returnMistakes: boolean
  timeLimit: number
}

export const LIGHT_KG = 0.4
export const HEAVY_KG = 1.6

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const k = Math.floor(rnd() * (i + 1))
    ;[a[i], a[k]] = [a[k], a[i]]
  }
  return a
}

export const LEGEND_PARTS = 8

export function tierConfig(tier: number, round: number): TierConfig {
  const base = {
    tier,
    pendant: false,
    pillar: false,
    beltSpeed: 0,
    indexed: false,
    stationary: false,
    spacing: 0.6,
    spawnX: -0.95,
    jogSpeed: 1.6,
    graspTol: 0.06,
    dynamics: false,
    returnMistakes: true,
    timeLimit: Infinity,
  }
  if (tier === 0) {
    const rnd = mulberry32(101 + round * 31)
    const cols = shuffled(COLORS, rnd)
    const xs = shuffled([-0.22, 0.08, 0.3], rnd)
    return { ...base, mode: 'jog', stationary: true, parts: cols.map((color, i) => ({ color, heavy: false, x: xs[i] })) }
  }
  if (tier === 1) {
    // Fixed stream so a score can be compared fairly with your last one.
    const rnd = mulberry32(2024)
    const cols: PartColor[] = [...shuffled(COLORS, rnd), ...shuffled(COLORS, rnd)]
    return {
      ...base,
      mode: 'jog',
      pendant: true,
      beltSpeed: 0.08,
      jogSpeed: 1.75,
      graspTol: 0.045,
      returnMistakes: false,
      parts: cols.map((color) => ({ color, heavy: false })),
    }
  }
  if (tier === 2) {
    const rnd = mulberry32(303 + round * 17)
    const cols = shuffled(COLORS, rnd)
    const xs = shuffled([-0.3, 0.02, 0.26], rnd)
    return {
      ...base,
      mode: 'plan',
      pillar: true,
      stationary: true,
      graspTol: 0.03,
      parts: cols.map((color, i) => ({ color, heavy: false, x: xs[i] })),
    }
  }
  const rnd = mulberry32(4096)
  const cols: PartColor[] = []
  for (let i = 0; i < LEGEND_PARTS; i++) cols.push(COLORS[Math.floor(rnd() * 3)])
  const heavy = new Set([1, 4, 6])
  return {
    ...base,
    mode: 'program',
    beltSpeed: 0.3,
    indexed: true,
    spacing: 0.5,
    spawnX: -0.9,
    graspTol: 0.03,
    dynamics: true,
    returnMistakes: false,
    timeLimit: 240,
    parts: cols.map((color, i) => ({ color, heavy: heavy.has(i) })),
  }
}

// ── Parts ───────────────────────────────────────────────────────────────────

export type PartState = 'belt' | 'held' | 'falling' | 'binned' | 'floor' | 'rejected' | 'returning'

export interface Part {
  id: number
  color: PartColor
  heavy: boolean
  mass: number
  pos: V3
  vel: V3
  state: PartState
  home: V3
  bin: PartColor | null
  returnAt: number
}

// ── Programs ────────────────────────────────────────────────────────────────

export type When = 'always' | 'heavy' | 'light'
export type PoseId = 'home' | 'abovePick' | 'pick' | 'aboveBin' | 'inBin'

export const POSE_LABEL: Record<PoseId, string> = {
  home: 'Home (tucked)',
  abovePick: 'Above pick spot',
  pick: 'Pick spot',
  aboveBin: 'Above its bin',
  inBin: 'Down in its bin',
}

export type ProgStep =
  | { kind: 'move'; pose: PoseId; /** percent, 10–100 */ speed: number; when: When }
  | { kind: 'grip' | 'release' | 'wait'; when: When }

export type PlanStep =
  | { kind: 'move'; joints: Joints; label: string }
  | { kind: 'grip' }
  | { kind: 'release' }

interface Exec {
  kind: 'move' | 'grip' | 'release' | 'wait'
  when: When
  speed: number
  label: string
  resolve?: () => Joints | null
}

type Action =
  | { kind: 'move'; plan: ReturnType<typeof planMove>; t: number }
  | { kind: 'grip' | 'release' | 'wait' }

// ── Events ──────────────────────────────────────────────────────────────────

export type SimEvent =
  | { type: 'grip'; part: Part }
  | { type: 'missGrip'; dist: number }
  | { type: 'release'; holding: boolean }
  | { type: 'sorted'; part: Part }
  | { type: 'wrong'; part: Part; bin: PartColor }
  | { type: 'drop'; part: Part }
  | { type: 'reject'; part: Part }
  | { type: 'bump'; hit: Hit }
  | { type: 'crash'; hit: Hit; step: number }
  | { type: 'slip'; part: Part; need: number; accel: number; step: number }
  | { type: 'overload'; torque: number; step: number }
  | { type: 'fault'; msg: string; step: number }
  | { type: 'planDone' }
  | { type: 'done' }

export interface Stats {
  sorted: number
  wrong: number
  dropped: number
  rejected: number
  bumps: number
  crashes: number
  missedGrips: number
  slips: number
  overloads: number
}

export const DT = 1 / 240
const GRIP_TIME = 0.25

// ── The simulation ──────────────────────────────────────────────────────────

export class ArmSim {
  readonly cfg: TierConfig
  readonly obstacles: Box[]
  j: Joints = [...HOME] as Joints
  targets: Joints = [...HOME] as Joints
  /** 0 = open, 1 = closed. */
  grip = 0
  gripDir: -1 | 0 | 1 = 0
  held: Part | null = null
  parts: Part[] = []
  private queue: PartSpec[]
  private nextId = 0
  beltTravel = 0
  private lastSpawnTravel = -Infinity
  beltRunning = false
  /** The belt only runs once the round has started. */
  beltOn = true
  time = 0
  /** Sim time of the child's first arm command (-1 until then). Timed scores
   *  start here, not at mount, so reading the help first costs nothing. */
  firstInput = -1
  events: SimEvent[] = []
  stats: Stats = { sorted: 0, wrong: 0, dropped: 0, rejected: 0, bumps: 0, crashes: 0, missedGrips: 0, slips: 0, overloads: 0 }
  done = false

  // Program executor
  running = false
  private prog: Exec[] = []
  private loop = false
  pc = 0
  private action: Action | null = null
  runStart = 0
  /** Sim time when the last run stopped (or -1 if none has run yet). */
  runEnd = -1

  // Dynamics
  private hist: { tip: V3; th1: number }[] = []
  tipVel: V3 = { x: 0, y: 0, z: 0 }
  liveTorque = 0
  liveGrip = 0
  peakTorque = 0
  peakGrip = 0
  private bumpLatch = false

  constructor(cfg: TierConfig) {
    this.cfg = cfg
    this.obstacles = [CONVEYOR, ...binWalls(), ...(cfg.pillar ? [PILLAR] : [])]
    this.queue = [...cfg.parts]
  }

  get tip(): V3 {
    return fk(this.j).tip
  }

  tipOf(j: Joints): V3 {
    return fk(j).tip
  }

  heldHalf(): number | null {
    return this.held ? PART_HALF : null
  }

  remaining(): number {
    return this.queue.length + this.parts.filter((p) => p.state === 'belt' || p.state === 'held' || p.state === 'falling' || p.state === 'returning').length
  }

  /** The belt part waiting at the pick sensor, if any. */
  partAtSensor(): Part | null {
    for (const p of this.parts) if (p.state === 'belt' && Math.abs(p.pos.x - SENSOR_X) < 0.004) return p
    return null
  }

  /** The part on the belt nearest the fingertips (for hints). */
  activePart(): Part | null {
    let best: Part | null = null
    let bd = Infinity
    const t = this.tip
    for (const p of this.parts) {
      if (p.state !== 'belt') continue
      const d = Math.hypot(p.pos.x - t.x, p.pos.z - t.z)
      if (d < bd) {
        bd = d
        best = p
      }
    }
    return best
  }

  graspDistance(p: Part): number {
    const t = this.tip
    return Math.hypot(p.pos.x - t.x, p.pos.y - t.y, p.pos.z - t.z)
  }

  // ── Commands ──

  private markInput(): void {
    if (this.firstInput < 0) this.firstInput = this.time
  }

  setTarget(i: number, v: number): void {
    this.markInput()
    this.targets[i] = clampJoint(i, v)
    this.bumpLatch = false
  }

  setTargets(j: Joints): void {
    this.markInput()
    for (let i = 0; i < 3; i++) this.targets[i] = clampJoint(i, j[i])
    this.bumpLatch = false
  }

  toggleGrip(): void {
    this.markInput()
    if (this.gripDir === 1 || (this.grip >= 1 && this.gripDir === 0)) this.release()
    else this.closeGrip()
  }

  closeGrip(): void {
    if (this.grip >= 1 || this.gripDir === 1) return
    this.gripDir = 1
  }

  release(): void {
    if (this.grip <= 0 && this.gripDir !== 1) return
    this.gripDir = -1
    const holding = !!this.held
    if (this.held) this.dropHeld(this.tipVel)
    this.events.push({ type: 'release', holding })
  }

  private dropHeld(vel: V3): void {
    const p = this.held
    if (!p) return
    p.state = 'falling'
    p.vel = { ...vel }
    this.held = null
  }

  runPlan(steps: PlanStep[]): void {
    this.prog = steps.map((s) =>
      s.kind === 'move'
        ? { kind: 'move', when: 'always', speed: 0.6, label: s.label, resolve: () => [...s.joints] as Joints }
        : { kind: s.kind, when: 'always', speed: 1, label: s.kind },
    )
    this.startRun(false)
  }

  runProgram(steps: ProgStep[]): void {
    this.prog = steps.map((s) =>
      s.kind === 'move'
        ? { kind: 'move', when: s.when, speed: s.speed / 100, label: POSE_LABEL[s.pose], resolve: () => this.resolvePose(s.pose) }
        : { kind: s.kind, when: s.when, speed: 1, label: s.kind },
    )
    this.startRun(true)
  }

  private startRun(loop: boolean): void {
    this.loop = loop
    this.pc = 0
    this.action = null
    this.running = true
    this.runStart = this.time
    this.runEnd = -1
    this.peakTorque = 0
    this.peakGrip = 0
    this.hist = []
  }

  stop(): void {
    if (this.running) this.runEnd = this.time
    this.running = false
    this.action = null
  }

  /** Put the arm back home and any held/dropped part back on the belt (after a crash in Ace). */
  resetArm(): void {
    this.stop()
    this.j = [...HOME] as Joints
    this.targets = [...HOME] as Joints
    this.grip = 0
    this.gripDir = 0
    if (this.held) {
      this.held.state = 'belt'
      this.held.pos = { ...this.held.home }
      this.held = null
    }
    for (const p of this.parts) {
      if (p.state === 'falling' || p.state === 'floor' || p.state === 'returning') {
        p.state = 'belt'
        p.pos = { ...p.home }
        p.vel = { x: 0, y: 0, z: 0 }
      }
    }
  }

  /** Legend's named poses, solved with inverse kinematics (elbow up). */
  resolvePose(pose: PoseId): Joints | null {
    if (pose === 'home') return [...HOME] as Joints
    let target: V3
    if (pose === 'abovePick') target = { x: SENSOR_X, y: 0.32, z: BELT_Z }
    else if (pose === 'pick') target = { x: SENSOR_X, y: GRASP_Y, z: BELT_Z }
    else {
      const part = this.held ?? this.partAtSensor()
      const bin = BINS.find((b) => b.color === (part?.color ?? 'blue')) ?? BINS[1]
      target = { x: bin.x, y: pose === 'aboveBin' ? 0.34 : 0.2, z: bin.z }
    }
    const sol = ik(target, this.j[0]).solutions.find((s) => s.elbow === 'up' && s.violated.length === 0)
    return sol ? sol.joints : null
  }

  // ── Stepping ──

  step(dt: number = DT): void {
    if (this.done) return
    this.time += dt
    this.updateBelt(dt)
    if (this.cfg.mode === 'jog' && !this.running) this.updateJog(dt)
    else if (this.running) this.updateExec(dt)
    this.updateGrip(dt)
    this.trackDynamics(dt)
    this.updateParts(dt)
    this.checkDone()
  }

  private spawn(spec: PartSpec, x: number): void {
    const home = { x, y: GRASP_Y, z: BELT_Z }
    this.parts.push({
      id: this.nextId++,
      color: spec.color,
      heavy: spec.heavy,
      mass: spec.heavy ? HEAVY_KG : LIGHT_KG,
      pos: { ...home },
      vel: { x: 0, y: 0, z: 0 },
      state: 'belt',
      home,
      bin: null,
      returnAt: 0,
    })
  }

  private updateBelt(dt: number): void {
    const cfg = this.cfg
    if (cfg.stationary) {
      const active = this.parts.some((p) => p.state === 'belt' || p.state === 'held' || p.state === 'falling' || p.state === 'returning')
      if (!active && this.queue.length) {
        const spec = this.queue.shift() as PartSpec
        this.spawn(spec, spec.x ?? 0)
      }
      this.beltRunning = false
      return
    }
    if (!this.beltOn) {
      this.beltRunning = false
      return
    }
    if (this.queue.length && this.beltTravel - this.lastSpawnTravel >= cfg.spacing - 1e-9) {
      const spec = this.queue.shift() as PartSpec
      this.spawn(spec, cfg.spawnX)
      this.lastSpawnTravel = this.beltTravel
    }
    let dx = cfg.beltSpeed * dt
    if (cfg.indexed) {
      for (const p of this.parts) {
        if (p.state !== 'belt') continue
        if (p.pos.x <= SENSOR_X + 1e-9) dx = Math.min(dx, SENSOR_X - p.pos.x)
      }
      dx = Math.max(0, dx)
    }
    this.beltRunning = dx > 1e-9
    if (!this.beltRunning) return
    this.beltTravel += dx
    for (const p of this.parts) {
      if (p.state !== 'belt') continue
      p.pos.x += dx
      if (p.pos.x > 1.25) {
        p.state = 'rejected'
        this.stats.rejected++
        this.events.push({ type: 'reject', part: p })
      }
    }
  }

  private updateJog(dt: number): void {
    const maxStep = this.cfg.jogSpeed * dt
    let blocked: Hit | null = null
    for (let i = 0; i < 3; i++) {
      const diff = this.targets[i] - this.j[i]
      if (Math.abs(diff) < 1e-7) continue
      const step = Math.max(-maxStep, Math.min(maxStep, diff))
      const trial = [...this.j] as Joints
      trial[i] += step
      const hit = collide(trial, this.obstacles, this.heldHalf())
      if (hit) {
        blocked = hit
        this.targets[i] = this.j[i]
      } else {
        this.j = trial
      }
    }
    if (blocked && !this.bumpLatch) {
      this.bumpLatch = true
      this.stats.bumps++
      this.events.push({ type: 'bump', hit: blocked })
    }
  }

  private conditionHolds(when: When): boolean {
    if (when === 'always') return true
    const part = this.held ?? this.partAtSensor()
    if (!part) return when === 'light'
    return when === 'heavy' ? part.heavy : !part.heavy
  }

  private fault(msg: string): void {
    this.events.push({ type: 'fault', msg, step: this.pc })
    this.stop()
  }

  private updateExec(dt: number): void {
    let guard = 0
    while (this.running && !this.action) {
      if (this.pc >= this.prog.length) {
        if (this.loop && this.prog.length) {
          this.pc = 0
        } else {
          this.stop()
          this.events.push({ type: 'planDone' })
          return
        }
      }
      if (++guard > this.prog.length + 2) {
        this.fault('Your program went round without doing anything. Add a step that runs for every part.')
        return
      }
      const s = this.prog[this.pc]
      if (!this.conditionHolds(s.when)) {
        this.pc++
        continue
      }
      if (s.kind === 'move') {
        const to = s.resolve ? s.resolve() : null
        if (!to) {
          this.fault(`Step ${this.pc + 1}: the arm cannot reach "${s.label}".`)
          return
        }
        this.action = { kind: 'move', plan: planMove(this.j, to, s.speed), t: 0 }
      } else if (s.kind === 'grip') {
        if (this.grip >= 1 && this.gripDir !== -1) {
          this.pc++
          continue
        }
        this.closeGrip()
        this.action = { kind: 'grip' }
      } else if (s.kind === 'release') {
        if (this.grip <= 0 && this.gripDir !== 1) {
          this.pc++
          continue
        }
        this.release()
        this.action = { kind: 'release' }
      } else {
        if (this.cfg.indexed && this.queue.length === 0 && !this.parts.some((p) => p.state === 'belt')) {
          // Nothing left to wait for: the shift is over.
          this.stop()
          this.events.push({ type: 'planDone' })
          return
        }
        this.action = { kind: 'wait' }
      }
    }
    const a = this.action
    if (!a) return
    if (a.kind === 'move') {
      a.t = Math.min(a.plan.T, a.t + dt)
      const next = a.plan.at(a.t)
      const hit = collide(next, this.obstacles, this.heldHalf())
      if (hit) {
        this.stats.crashes++
        this.events.push({ type: 'crash', hit, step: this.pc })
        this.stop()
        if (this.held) this.dropHeld({ x: 0, y: 0, z: 0 })
        return
      }
      this.j = next
      this.targets = [...next] as Joints
      if (a.t >= a.plan.T) this.endAction()
    } else if (a.kind === 'grip') {
      if (this.grip >= 1) this.endAction()
    } else if (a.kind === 'release') {
      if (this.grip <= 0) this.endAction()
    } else if (a.kind === 'wait') {
      if (this.partAtSensor()) this.endAction()
      else if (this.queue.length === 0 && !this.parts.some((p) => p.state === 'belt')) {
        this.stop()
        this.action = null
        this.events.push({ type: 'planDone' })
      }
    }
  }

  private endAction(): void {
    this.action = null
    this.pc++
  }

  private updateGrip(dt: number): void {
    if (this.gripDir === 0) return
    this.grip += (this.gripDir * dt) / GRIP_TIME
    if (this.gripDir === 1 && this.grip >= 1) {
      this.grip = 1
      this.gripDir = 0
      // Fingers closed: is there a part between them?
      const t = this.tip
      let best: Part | null = null
      let bd = Infinity
      for (const p of this.parts) {
        if (p.state !== 'belt' && p.state !== 'floor') continue
        const d = Math.hypot(p.pos.x - t.x, p.pos.y - t.y, p.pos.z - t.z)
        if (d < bd) {
          bd = d
          best = p
        }
      }
      if (best && bd <= this.cfg.graspTol) {
        best.state = 'held'
        this.held = best
        this.events.push({ type: 'grip', part: best })
      } else {
        this.stats.missedGrips++
        this.events.push({ type: 'missGrip', dist: bd })
      }
    } else if (this.gripDir === -1 && this.grip <= 0) {
      this.grip = 0
      this.gripDir = 0
    }
  }

  private trackDynamics(dt: number): void {
    const tip = this.tip
    this.hist.push({ tip, th1: this.j[1] })
    if (this.hist.length > 3) this.hist.shift()
    const h = this.hist
    if (h.length >= 2) {
      const a = h[h.length - 2].tip
      this.tipVel = { x: (tip.x - a.x) / dt, y: (tip.y - a.y) / dt, z: (tip.z - a.z) / dt }
    }
    if (h.length < 3) return
    const [p0, p1, p2] = h
    const acc: V3 = {
      x: (p2.tip.x - 2 * p1.tip.x + p0.tip.x) / (dt * dt),
      y: (p2.tip.y - 2 * p1.tip.y + p0.tip.y) / (dt * dt),
      z: (p2.tip.z - 2 * p1.tip.z + p0.tip.z) / (dt * dt),
    }
    // Clamp numerical spikes (jogging starts and stops instantly) to the controller's real limit.
    let alpha1 = (p2.th1 - 2 * p1.th1 + p0.th1) / (dt * dt)
    alpha1 = Math.max(-AMAX * 1.5, Math.min(AMAX * 1.5, alpha1))
    const payload = this.held ? this.held.mass : 0
    this.liveTorque = shoulderTorque(this.j, alpha1, payload)
    this.liveGrip = this.held ? gripNeeded(this.held.mass, acc) : 0
    if (this.running) {
      this.peakTorque = Math.max(this.peakTorque, this.liveTorque)
      this.peakGrip = Math.max(this.peakGrip, this.liveGrip)
    }
    if (!this.cfg.dynamics || !this.running) return
    if (this.liveTorque > SHOULDER_MAX_TORQUE) {
      this.stats.overloads++
      this.events.push({ type: 'overload', torque: this.liveTorque, step: this.pc })
      this.stop()
      if (this.held) this.dropHeld(this.tipVel)
      return
    }
    if (this.held && this.liveGrip > GRIP_MAX_FORCE) {
      const part = this.held
      const accel = Math.hypot(acc.x, acc.y, acc.z)
      this.stats.slips++
      this.events.push({ type: 'slip', part, need: this.liveGrip, accel, step: this.pc })
      // A lost part is a protective stop on a real line: the cell halts.
      this.stop()
      this.dropHeld(this.tipVel)
    }
  }

  private supportAt(x: number, z: number): { y: number; bin: PartColor | null; belt: boolean } {
    for (const b of BINS) {
      if (Math.abs(x - b.x) <= BIN_INNER / 2 && Math.abs(z - b.z) <= BIN_INNER / 2) return { y: BIN_WALL, bin: b.color, belt: false }
    }
    if (x >= BELT_X0 && x <= BELT_X1 && Math.abs(z - BELT_Z) <= BELT_HALF_W) return { y: BELT_TOP, bin: null, belt: true }
    return { y: 0, bin: null, belt: false }
  }

  private updateParts(dt: number): void {
    if (this.held) {
      const t = this.tip
      this.held.pos = { x: t.x, y: t.y, z: t.z }
    }
    for (const p of this.parts) {
      if (p.state === 'returning' && this.time >= p.returnAt) {
        p.state = 'belt'
        p.pos = { ...p.home }
        p.bin = null
        continue
      }
      if (p.state !== 'falling') continue
      p.vel.y -= 9.81 * dt
      p.pos.x += p.vel.x * dt
      p.pos.y += p.vel.y * dt
      p.pos.z += p.vel.z * dt
      const sup = this.supportAt(p.pos.x, p.pos.z)
      if (p.pos.y - PART_HALF > sup.y) continue
      p.pos.y = sup.y + PART_HALF
      p.vel = { x: 0, y: 0, z: 0 }
      if (sup.bin) {
        p.state = 'binned'
        p.bin = sup.bin
        if (sup.bin === p.color) {
          this.stats.sorted++
          this.events.push({ type: 'sorted', part: p })
        } else {
          this.stats.wrong++
          this.events.push({ type: 'wrong', part: p, bin: sup.bin })
          if (this.cfg.returnMistakes) {
            p.state = 'returning'
            p.returnAt = this.time + 1.2
          }
        }
      } else if (sup.belt) {
        p.state = 'belt'
        p.pos.z = BELT_Z
      } else {
        p.state = 'floor'
        this.stats.dropped++
        this.events.push({ type: 'drop', part: p })
        if (this.cfg.returnMistakes) {
          p.state = 'returning'
          p.returnAt = this.time + 1.2
        }
      }
    }
  }

  private checkDone(): void {
    if (this.time - this.runStart > this.cfg.timeLimit && this.running) {
      this.fault('Time is up: the shift ended before every part was sorted.')
    }
    if (this.remaining() === 0) {
      this.done = true
      this.stop()
      this.events.push({ type: 'done' })
    }
  }
}


// ── Scoring and debriefs (pure, checked by arm-factory.verify.ts) ───────────

/** Legend star times, calibrated on the fixed stream: the best programs we
 *  found finish in about 33.5 s. */
export const LEGEND_TARGET3 = 35
export const LEGEND_TARGET2 = 45
/** The line's takt time: a shift slower than this does not pass. Slowing EVERY
 *  move (the brute-force fix) takes 97 s at 30 %, and a random speed on each
 *  move of the starter program passes only about 3 times in 100; slowing just
 *  the heavy-part moves passes in about 36 s. */
export const LEGEND_PASS = 60

/** Cadet stars. Any hint caps a finish at 2 stars (the shared hint rule). */
export function cadetStars(mistakes: number, hinted: boolean): number {
  const s = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1
  return hinted ? Math.min(2, s) : s
}

/** Legend stars for a finished shift; 0 = did not pass. */
export function legendStars(sorted: number, t: number): number {
  if (sorted < LEGEND_PARTS || t > LEGEND_PASS) return 0
  return t <= LEGEND_TARGET3 ? 3 : t <= LEGEND_TARGET2 ? 2 : 1
}

export interface ShiftReport {
  ok: boolean
  title: string
  body: string
}

/**
 * What to tell the child when a Legend shift ends without passing. Each line
 * names a cause that really happened, so a part that fell on the floor is never
 * blamed on the wrong bin (and the other way round). Returns null on a pass.
 */
export function legendShiftReport(stats: Stats, t: number): ShiftReport | null {
  if (legendStars(stats.sorted, t) > 0) return null
  if (stats.sorted >= LEGEND_PARTS) {
    return {
      ok: false,
      title: `All ${LEGEND_PARTS} sorted, but the shift took ${t.toFixed(1)} s`,
      body: `The line needs the shift done in ${LEGEND_PASS} s or less. Slowing every move keeps the grip safe but wastes time on the light parts. Keep light-part moves fast and add slower "heavy only" moves for the steel parts.`,
    }
  }
  const causes: string[] = []
  if (stats.wrong > 0)
    causes.push(
      `${stats.wrong} part${stats.wrong === 1 ? '' : 's'} went to the wrong bin. "Above its bin" reads the colour of the part in the gripper, so grip before you move there.`,
    )
  if (stats.dropped > 0)
    causes.push(
      `${stats.dropped} part${stats.dropped === 1 ? '' : 's'} fell on the floor: the gripper let go when it was not over a bin. Put "Release" straight after "Above its bin".`,
    )
  if (stats.rejected > 0)
    causes.push(`${stats.rejected} part${stats.rejected === 1 ? '' : 's'} rode off the end of the belt without being picked.`)
  if (!causes.length) causes.push('Some parts were never picked up. Check that the program grips at the pick spot every time round.')
  return { ok: false, title: `Shift over: ${stats.sorted} of ${LEGEND_PARTS} in the right bin`, body: causes.join(' ') }
}
