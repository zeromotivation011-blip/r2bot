// components/kids/games/orbit-repair/sim.ts
// Orbit Repair Crew — the physics under the game. Pure TypeScript: no React,
// no DOM, fixed time step, no randomness at all, so the same inputs always give
// the same mission and a score is fair.
//
// What is modelled (and what is honestly left out):
//  • No friction, no air: a body keeps its velocity until a force changes it
//    (Newton's first law). Thruster puffs are impulses: Δv per puff.
//  • Action and reaction: an arm that swings a heavy module twists the body it
//    is mounted on the other way (conservation of angular momentum). Reaction
//    wheels slowly take that twist out, with a limited torque.
//  • Capture: a grapple can only close when the hand is at the pin AND moving
//    with it (small relative speed); grabbing at a speed difference bumps or
//    breaks things, because the momentum has to go somewhere.
//  • Teleoperation with delay: commands reach the spacecraft late and the video
//    comes back late (Legend).
//  • Rotating targets: matching a tumble costs fuel all the time, and more the
//    farther from the spin axis you are (centripetal acceleration ω²r).
//  • Left out: orbital mechanics. Near another spacecraft, over a few minutes,
//    paths are almost straight lines; on longer approaches real orbits bend
//    them. The teaching page says so.

export const DT = 1 / 60
export type TierIndex = 0 | 1 | 2 | 3

export interface Vec {
  x: number
  y: number
}

export const v2 = (x: number, y: number): Vec => ({ x, y })
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y })
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y })
export const mul = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k })
export const len = (a: Vec): number => Math.hypot(a.x, a.y)
export const cross = (a: Vec, b: Vec): number => a.x * b.y - a.y * b.x
export const rot = (a: Vec, ang: number): Vec => {
  const c = Math.cos(ang)
  const s = Math.sin(ang)
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c }
}
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x))

export type Dir = 'up' | 'down' | 'left' | 'right'
export const DIR_VEC: Record<Dir, Vec> = { up: v2(0, 1), down: v2(0, -1), left: v2(-1, 0), right: v2(1, 0) }

export type Outcome = 'running' | 'won' | 'lost'

/** One input frame from the player. */
export interface Input {
  /** Thruster puffs this frame (Cadet, Legend). */
  puffs: Dir[]
  /** Hand-controller deflection, each axis −1…1 (Pilot, Ace). */
  stick: Vec
  /** Fine (vernier) mode: slow, precise hand motion. */
  fine: boolean
  grab: boolean
  sync: boolean
}

export const NO_INPUT: Input = { puffs: [], stick: v2(0, 0), fine: false, grab: false, sync: false }

/** A short message for the HUD ("Too fast to latch!"). */
export interface Note {
  text: string
  tone: 'good' | 'warn' | 'bad' | 'info'
  t: number
}

// ─────────────────────────────────────────────────────────────────────────────
// CADET — the free-flying helper robot inside a module
// ─────────────────────────────────────────────────────────────────────────────

export const CADET = {
  w: 8,
  h: 4,
  size: 0.34,
  /** Speed change per puff, m/s. */
  dv: 0.1,
  puffs: 36,
  dockSpeed: 0.08,
  dockR: 0.32,
  pickR: 0.42,
  pickSpeed: 0.45,
  restitution: 0.5,
  timeLimit: 240,
  start: v2(1.2, 2.0),
}

export interface Pickup {
  id: string
  label: string
  icon: string
  p: Vec
  got: boolean
}

export interface CadetState {
  kind: 'cadet'
  t: number
  p: Vec
  v: Vec
  puffsUsed: number
  bumps: number
  hardestBump: number
  pickups: Pickup[]
  dock: Vec
  outcome: Outcome
  reason: string
  note: Note | null
  outOfPuffsAt: number | null
  maxSpeed: number
  /** Overshoots: times the robot passed a pickup/dock without stopping and then had to come back. */
  fastAtDock: number
}

export function createCadet(): CadetState {
  return {
    kind: 'cadet',
    t: 0,
    p: { ...CADET.start },
    v: v2(0, 0),
    puffsUsed: 0,
    bumps: 0,
    hardestBump: 0,
    pickups: [
      { id: 'wrench', label: 'Floating wrench', icon: '🔧', p: v2(6.4, 2.0), got: false },
      { id: 'camera', label: 'Lost camera', icon: '📷', p: v2(6.4, 3.3), got: false },
    ],
    dock: v2(1.2, 3.3),
    outcome: 'running',
    reason: '',
    note: null,
    outOfPuffsAt: null,
    maxSpeed: 0,
    fastAtDock: 0,
  }
}

function stepCadet(s: CadetState, inp: Input): void {
  for (const d of inp.puffs) {
    if (s.puffsUsed >= CADET.puffs) break
    s.puffsUsed += 1
    // The gas goes one way, the robot goes the other: the push is opposite the plume.
    s.v = add(s.v, mul(DIR_VEC[d], CADET.dv))
    if (s.puffsUsed === CADET.puffs) {
      s.outOfPuffsAt = s.t
      s.note = { text: 'Out of gas! The robot will keep drifting…', tone: 'bad', t: s.t }
    }
  }
  s.p = add(s.p, mul(s.v, DT))
  s.t += DT
  const sp = len(s.v)
  s.maxSpeed = Math.max(s.maxSpeed, sp)

  // Walls: a soft bounce. Nothing slows the robot except a wall (or a puff).
  const r = CADET.size / 2
  let hit = 0
  if (s.p.x < r) {
    s.p.x = r
    hit = Math.abs(s.v.x)
    s.v.x = Math.abs(s.v.x) * CADET.restitution
  } else if (s.p.x > CADET.w - r) {
    s.p.x = CADET.w - r
    hit = Math.abs(s.v.x)
    s.v.x = -Math.abs(s.v.x) * CADET.restitution
  }
  if (s.p.y < r) {
    s.p.y = r
    hit = Math.max(hit, Math.abs(s.v.y))
    s.v.y = Math.abs(s.v.y) * CADET.restitution
  } else if (s.p.y > CADET.h - r) {
    s.p.y = CADET.h - r
    hit = Math.max(hit, Math.abs(s.v.y))
    s.v.y = -Math.abs(s.v.y) * CADET.restitution
  }
  if (hit > 0.03) {
    s.bumps += 1
    s.hardestBump = Math.max(s.hardestBump, hit)
    s.note = { text: 'Bonk! It kept going until the wall stopped it.', tone: 'warn', t: s.t }
  }

  for (const k of s.pickups) {
    if (!k.got && len(sub(s.p, k.p)) < CADET.pickR && sp <= CADET.pickSpeed) {
      k.got = true
      s.note = { text: `Got the ${k.label.toLowerCase()}!`, tone: 'good', t: s.t }
    }
  }

  const allGot = s.pickups.every((k) => k.got)
  const dDock = len(sub(s.p, s.dock))
  if (allGot && dDock < CADET.dockR) {
    if (sp <= CADET.dockSpeed) {
      s.outcome = 'won'
      s.v = v2(0, 0)
      s.p = { ...s.dock }
      s.reason = 'Docked gently on the charger.'
      return
    }
    if (!s.note || s.note.text.indexOf('Too fast') < 0 || s.t - s.note.t > 1.5) {
      s.fastAtDock += 1
      s.note = { text: 'Too fast to latch! Puff the other way to slow down.', tone: 'warn', t: s.t }
    }
  }

  if (s.outOfPuffsAt !== null && s.t - s.outOfPuffsAt > 8) {
    s.outcome = 'lost'
    s.reason = 'Out of gas before docking.'
  } else if (s.t > CADET.timeLimit) {
    s.outcome = 'lost'
    s.reason = 'The shift ended before the robot docked.'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Robot arm (shared by Pilot and Ace): the operator commands hand velocity,
// the arm accelerates the hand with a limit (it is heavy), and two joint
// angles are solved by inverse kinematics for the drawing.
// ─────────────────────────────────────────────────────────────────────────────

export interface Arm {
  base: Vec
  l1: number
  l2: number
  hand: Vec
  hv: Vec
  maxSpeed: number
  fineSpeed: number
  accel: number
}

function stepArm(a: Arm, inp: Input): void {
  const sx = clamp(inp.stick.x, -1, 1)
  const sy = clamp(inp.stick.y, -1, 1)
  const m = Math.hypot(sx, sy)
  const k = m > 1 ? 1 / m : 1
  const vmax = inp.fine ? a.fineSpeed : a.maxSpeed
  const want = v2(sx * k * vmax, sy * k * vmax)
  const dv = sub(want, a.hv)
  const dl = len(dv)
  const maxDv = a.accel * DT
  a.hv = dl <= maxDv ? want : add(a.hv, mul(dv, maxDv / dl))
  let next = add(a.hand, mul(a.hv, DT))
  // Keep the hand inside the arm's reach (the joints stop it).
  const rel = sub(next, a.base)
  const r = len(rel)
  const rMax = a.l1 + a.l2 - 0.15
  const rMin = Math.abs(a.l1 - a.l2) + 1.2
  if (r > rMax || r < rMin) {
    const n = mul(rel, 1 / Math.max(r, 1e-6))
    next = add(a.base, mul(n, r > rMax ? rMax : rMin))
    const radial = a.hv.x * n.x + a.hv.y * n.y
    a.hv = sub(a.hv, mul(n, radial))
  }
  a.hand = next
}

/** Shoulder and elbow angles (radians) that put the hand where it is (elbow up). */
export function armIK(a: Arm): { shoulder: number; elbow: Vec } {
  const rel = sub(a.hand, a.base)
  const d = clamp(len(rel), 1e-3, a.l1 + a.l2)
  const cosA = clamp((a.l1 * a.l1 + d * d - a.l2 * a.l2) / (2 * a.l1 * d), -1, 1)
  const base = Math.atan2(rel.y, rel.x)
  const shoulder = base + (rel.x >= 0 ? Math.acos(cosA) : -Math.acos(cosA))
  return { shoulder, elbow: add(a.base, v2(Math.cos(shoulder) * a.l1, Math.sin(shoulder) * a.l1)) }
}

// ─────────────────────────────────────────────────────────────────────────────
// PILOT — capture a free-drifting cargo ship with the station's arm
// ─────────────────────────────────────────────────────────────────────────────

export const PILOT = {
  captureR: 0.6,
  captureRel: 0.05,
  bumpRel: 0.15,
  timeLimit: 200,
}

export interface Ship {
  p: Vec
  v: Vec
  ang: number
  w: number
  /** Grapple pin, in the ship's own frame. */
  pin: Vec
}

export function pinPos(sh: Ship): Vec {
  return add(sh.p, rot(sh.pin, sh.ang))
}
export function pinVel(sh: Ship): Vec {
  const r = rot(sh.pin, sh.ang)
  return add(sh.v, v2(-sh.w * r.y, sh.w * r.x))
}

export interface PilotState {
  kind: 'pilot'
  t: number
  arm: Arm
  ship: Ship
  captured: boolean
  capturedAt: number
  relAtGrab: number
  bumps: number
  grabTries: number
  closest: number
  bestRelNear: number
  outcome: Outcome
  reason: string
  note: Note | null
  lastBumpT: number
}

export function createPilot(): PilotState {
  return {
    kind: 'pilot',
    t: 0,
    arm: { base: v2(0, 0), l1: 7.5, l2: 7.5, hand: v2(3, 6), hv: v2(0, 0), maxSpeed: 0.24, fineSpeed: 0.06, accel: 0.12 },
    ship: { p: v2(-7.5, 11.6), v: v2(0.11, -0.012), ang: 0, w: 0.004, pin: v2(0, -1.7) },
    captured: false,
    capturedAt: 0,
    relAtGrab: 0,
    bumps: 0,
    grabTries: 0,
    closest: Infinity,
    bestRelNear: Infinity,
    outcome: 'running',
    reason: '',
    note: null,
    lastBumpT: -10,
  }
}

export function pilotRel(s: PilotState): { d: number; rel: number } {
  return { d: len(sub(s.arm.hand, pinPos(s.ship))), rel: len(sub(s.arm.hv, pinVel(s.ship))) }
}

function nudge(sh: Ship, hv: Vec, k: number): void {
  // The hand shoves the ship: part of the speed difference goes into the ship.
  const dv = sub(hv, pinVel(sh))
  sh.v = add(sh.v, mul(dv, k))
  sh.w += cross(rot(sh.pin, sh.ang), mul(dv, k)) * 0.04
}

function stepPilot(s: PilotState, inp: Input): void {
  s.t += DT
  const sh = s.ship
  if (s.captured) {
    // Rigidised: the ship now moves with the hand, and the arm holds still.
    s.arm.hv = v2(0, 0)
    if (s.t - s.capturedAt > 1.6) {
      s.outcome = 'won'
      s.reason = 'Cargo ship captured.'
    }
    return
  }
  stepArm(s.arm, inp)
  sh.p = add(sh.p, mul(sh.v, DT))
  sh.ang += sh.w * DT

  const { d, rel } = pilotRel(s)
  s.closest = Math.min(s.closest, d)
  if (d < 1.2) s.bestRelNear = Math.min(s.bestRelNear, rel)

  // Touching the pin without grabbing still transfers momentum.
  if (d < 0.35 && rel > PILOT.captureRel) {
    if (rel > PILOT.bumpRel) {
      s.outcome = 'lost'
      s.reason = `The hand hit the ship at ${(rel * 100).toFixed(0)} cm/s — far too hard. Mission aborted.`
      return
    }
    if (s.t - s.lastBumpT > 1.5) {
      s.lastBumpT = s.t
      s.bumps += 1
      nudge(sh, s.arm.hv, 0.4)
      s.note = { text: 'Bump! The ship was pushed away — match its speed first.', tone: 'warn', t: s.t }
    }
  }

  if (inp.grab) {
    s.grabTries += 1
    if (d > PILOT.captureR) {
      s.note = { text: `Too far: the snare closes around the pin only within ${PILOT.captureR} m.`, tone: 'info', t: s.t }
    } else if (rel <= PILOT.captureRel) {
      s.captured = true
      s.capturedAt = s.t
      s.relAtGrab = rel
      sh.v = { ...s.arm.hv }
      sh.w = 0
      s.note = { text: 'Captured! Snares closed on the pin.', tone: 'good', t: s.t }
    } else if (rel <= PILOT.bumpRel) {
      s.bumps += 1
      s.lastBumpT = s.t
      nudge(sh, s.arm.hv, 0.5)
      s.note = { text: `Bounced off: still ${(rel * 100).toFixed(0)} cm/s different. Match the ship’s speed.`, tone: 'warn', t: s.t }
    } else {
      s.outcome = 'lost'
      s.reason = `Grabbed at ${(rel * 100).toFixed(0)} cm/s speed difference — the snare and the pin slammed together.`
      return
    }
  }

  const pin = pinPos(sh)
  const reach = len(sub(pin, s.arm.base))
  if (pin.x > 0 && reach > s.arm.l1 + s.arm.l2 - 0.2) {
    s.outcome = 'lost'
    s.reason = 'The cargo ship drifted out of the arm’s reach.'
  } else if (s.t > PILOT.timeLimit) {
    s.outcome = 'lost'
    s.reason = 'Time ran out for the capture window.'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACE — swap a module on a free-floating servicer; the arm twists the body
// ─────────────────────────────────────────────────────────────────────────────

export const ACE = {
  /** Body moment of inertia, kg·m². */
  inertia: 8000,
  /** Arm tip mass, kg (always moving) and the module mass, kg. */
  tipMass: 30,
  moduleMass: 180,
  /** Reaction-wheel torque limit, N·m, and the wheel controller gains. */
  wheelTorque: 60,
  k1: 0.04,
  k2: 0.4,
  /** Antenna must stay within this many degrees of Earth. */
  limitDeg: 8,
  warnDeg: 5,
  grabR: 0.45,
  grabSpeed: 0.05,
  timeLimit: 420,
}

export type ModuleId = 'old' | 'new'
export type PlaceId = 'slot' | 'bayA' | 'bayB'

export interface Place {
  id: PlaceId
  label: string
  p: Vec
}

export const ACE_PLACES: Place[] = [
  { id: 'slot', label: 'Satellite slot', p: v2(-4.2, 6.2) },
  { id: 'bayA', label: 'Bay A', p: v2(4.4, 5.0) },
  { id: 'bayB', label: 'Bay B', p: v2(4.4, 8.6) },
]

export interface AceState {
  kind: 'ace'
  t: number
  arm: Arm
  held: ModuleId | null
  at: Record<PlaceId, ModuleId | null>
  theta: number
  omega: number
  /** Body + wheel angular momentum the wheels have pushed in (N·m·s). */
  H: number
  wheel: number
  maxTheta: number
  steps: number
  outcome: Outcome
  reason: string
  note: Note | null
  wrongOrder: number
}

export function createAce(): AceState {
  return {
    kind: 'ace',
    t: 0,
    arm: { base: v2(0, 2.5), l1: 5.5, l2: 5.5, hand: v2(0, 7.5), hv: v2(0, 0), maxSpeed: 0.32, fineSpeed: 0.07, accel: 0.16 },
    held: null,
    at: { slot: 'old', bayA: null, bayB: 'new' },
    theta: 0,
    omega: 0,
    H: 0,
    wheel: 0,
    maxTheta: 0,
    steps: 0,
    outcome: 'running',
    reason: '',
    note: null,
    wrongOrder: 0,
  }
}

export function armMomentum(s: AceState): number {
  const m = ACE.tipMass + (s.held ? ACE.moduleMass : 0)
  return m * cross(s.arm.hand, s.arm.hv)
}

export function aceTask(s: AceState): string {
  if (s.at.slot === 'new' && !s.held) return 'Done!'
  if (s.at.slot === 'old') return s.held ? 'Hmm' : 'Grab the broken module from the satellite slot'
  if (s.held === 'old') return 'Park the broken module in the empty bay'
  if (s.held === 'new') return 'Slide the new module into the satellite slot'
  return 'Grab the new module from its bay'
}

function stepAce(s: AceState, inp: Input): void {
  s.t += DT
  stepArm(s.arm, inp)
  // Angular momentum: (body) I·ω + (arm load) L = H. The arm's swing sets L,
  // so the body turns the other way; the wheels change H to bring it back.
  const L = armMomentum(s)
  const tau = clamp(-ACE.inertia * (ACE.k1 * s.theta + ACE.k2 * s.omega), -ACE.wheelTorque, ACE.wheelTorque)
  s.H += tau * DT
  s.wheel = tau / ACE.wheelTorque
  s.omega = (s.H - L) / ACE.inertia
  s.theta += s.omega * DT
  const deg = (Math.abs(s.theta) * 180) / Math.PI
  s.maxTheta = Math.max(s.maxTheta, deg)
  if (deg > ACE.limitDeg) {
    s.outcome = 'lost'
    s.reason = `The servicer twisted ${deg.toFixed(1)}° and its antenna lost Earth. The arm swung the heavy load too fast.`
    return
  }

  if (inp.grab) {
    const hs = len(s.arm.hv)
    const near = ACE_PLACES.find((pl) => len(sub(pl.p, s.arm.hand)) < ACE.grabR)
    if (!near) {
      s.note = s.held
        ? { text: 'Not here! Let go in empty space and the module would drift away forever.', tone: 'warn', t: s.t }
        : { text: 'Nothing to grab here. Move the hand onto a handle.', tone: 'info', t: s.t }
    } else if (hs > ACE.grabSpeed) {
      s.note = { text: 'Stop the hand first — it must be still to latch.', tone: 'warn', t: s.t }
    } else if (!s.held) {
      const m = s.at[near.id]
      if (!m) s.note = { text: `${near.label} is empty.`, tone: 'info', t: s.t }
      else {
        s.held = m
        s.at[near.id] = null
        s.steps += 1
        s.note = { text: m === 'old' ? 'Holding the broken module. Move slowly — it is heavy!' : 'Holding the new module. Slowly now!', tone: 'good', t: s.t }
      }
    } else {
      const there = s.at[near.id]
      if (there) {
        s.wrongOrder += 1
        s.note = { text: `${near.label} is full. Free a place first — order matters.`, tone: 'warn', t: s.t }
      } else if (near.id === 'slot' && s.held === 'old') {
        s.wrongOrder += 1
        s.note = { text: 'That is the broken module — park it in a bay instead.', tone: 'warn', t: s.t }
      } else {
        s.at[near.id] = s.held
        s.held = null
        s.steps += 1
        s.note = { text: near.id === 'slot' ? 'New module locked in! Satellite repaired.' : `Parked in ${near.label}.`, tone: 'good', t: s.t }
      }
    }
  }

  if (s.at.slot === 'new' && !s.held) {
    s.outcome = 'won'
    s.reason = 'Module swapped.'
  } else if (s.t > ACE.timeLimit) {
    s.outcome = 'lost'
    s.reason = 'The repair window closed before the swap was finished.'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGEND — a full servicing mission: delay, fuel and a tumbling satellite
// ─────────────────────────────────────────────────────────────────────────────

export const LEGEND = {
  /** One-way delay up (commands) and down (video), s. */
  up: 1.0,
  down: 1.0,
  dv: 0.04,
  /** Fuel units per m/s of Δv. */
  fuelPerDv: 30,
  fuel: 120,
  /** Target tumble rate, rad/s (about 2.9°/s). */
  spin: 0.05,
  syncRange: 12,
  syncRel: 0.12,
  /** Where the servicer's centre must be to capture, in the target's rotating frame. */
  capture: v2(-2.9, 0),
  captureR: 0.6,
  captureRel: 0.04,
  keepOut: 2.4,
  contactRel: 0.06,
  detumbleFuel: 15,
  timeLimit: 480,
  lostRange: 60,
  start: v2(-30, 4),
}

export type LegendPhase = 'approach' | 'synced' | 'captured' | 'detumble' | 'done'

interface Pending {
  at: number
  cmd: Dir | 'grab' | 'sync'
}

export interface Snapshot {
  t: number
  /** Inertial position and velocity (target at the origin). */
  p: Vec
  v: Vec
  /** Target attitude. */
  ang: number
  synced: boolean
  /** Rotating-frame position/velocity (valid when synced). */
  pr: Vec
  vr: Vec
  phase: LegendPhase
  fuel: number
}

export interface LegendState {
  kind: 'legend'
  t: number
  p: Vec
  v: Vec
  pr: Vec
  vr: Vec
  ang: number
  synced: boolean
  phase: LegendPhase
  phaseT: number
  fuel: number
  puffs: number
  syncFuel: number
  contacts: number
  queue: Pending[]
  history: Snapshot[]
  outcome: Outcome
  reason: string
  note: Note | null
  closest: number
  grabTries: number
}

export function createLegend(): LegendState {
  const s: LegendState = {
    kind: 'legend',
    t: 0,
    p: { ...LEGEND.start },
    v: v2(0, 0),
    pr: v2(0, 0),
    vr: v2(0, 0),
    ang: 0,
    synced: false,
    phase: 'approach',
    phaseT: 0,
    fuel: LEGEND.fuel,
    puffs: 0,
    syncFuel: 0,
    contacts: 0,
    queue: [],
    history: [],
    outcome: 'running',
    reason: '',
    note: null,
    closest: Infinity,
    grabTries: 0,
  }
  s.history.push(snapshot(s))
  return s
}

function snapshot(s: LegendState): Snapshot {
  return { t: s.t, p: { ...s.p }, v: { ...s.v }, ang: s.ang, synced: s.synced, pr: { ...s.pr }, vr: { ...s.vr }, phase: s.phase, fuel: s.fuel }
}

/** What the operator on the ground sees: the spacecraft as it was `down` seconds ago. */
export function seen(s: LegendState): Snapshot {
  const want = s.t - LEGEND.down
  const h = s.history
  for (let i = h.length - 1; i >= 0; i--) if (h[i].t <= want + 1e-9) return h[i]
  return h[0]
}

/** Inertial velocity of a point fixed in the rotating frame, plus the frame change. */
function toRot(p: Vec, v: Vec, ang: number, w: number): { pr: Vec; vr: Vec } {
  const pr = rot(p, -ang)
  const vRel = sub(v, v2(-w * p.y, w * p.x))
  return { pr, vr: rot(vRel, -ang) }
}
function fromRot(pr: Vec, vr: Vec, ang: number, w: number): { p: Vec; v: Vec } {
  const p = rot(pr, ang)
  const v = add(rot(vr, ang), v2(-w * p.y, w * p.x))
  return { p, v }
}

export function legendRange(s: Pick<Snapshot, 'p'>): number {
  return len(s.p)
}

/** Speed relative to the bit of target (or empty space) next to the servicer. */
export function legendRel(s: { synced: boolean; v: Vec; vr: Vec }): number {
  return s.synced ? len(s.vr) : len(s.v)
}

/** Ghost of where the servicer will be once every command already sent has arrived (the predictor display). */
export function predict(s: LegendState, ahead = LEGEND.up + LEGEND.down): Vec {
  // Start from the TRUE state (known to the flight software model on the
  // ground, which integrates the commands it has sent), in the display frame.
  let p = s.synced ? { ...s.pr } : { ...s.p }
  let v = s.synced ? { ...s.vr } : { ...s.v }
  let t = s.t
  const end = s.t + ahead - LEGEND.down
  const q = [...s.queue].sort((a, b) => a.at - b.at)
  for (const c of q) {
    if (c.at > end) break
    if (c.cmd === 'grab' || c.cmd === 'sync') continue
    p = add(p, mul(v, c.at - t))
    t = c.at
    v = add(v, mul(DIR_VEC[c.cmd], LEGEND.dv))
  }
  p = add(p, mul(v, end - t))
  return p
}

function spend(s: LegendState, units: number): boolean {
  if (s.fuel <= 0) return false
  s.fuel = Math.max(0, s.fuel - units)
  return true
}

function applyCommand(s: LegendState, cmd: Pending['cmd']): void {
  if (s.phase === 'captured' || s.phase === 'detumble' || s.phase === 'done') return
  if (cmd === 'sync') {
    if (s.synced) {
      const back = fromRot(s.pr, s.vr, s.ang, LEGEND.spin)
      s.p = back.p
      s.v = back.v
      s.synced = false
      s.phase = 'approach'
      s.note = { text: 'Sync off: the satellite spins past again.', tone: 'info', t: s.t }
      return
    }
    const r = len(s.p)
    if (r > LEGEND.syncRange) {
      s.note = { text: `Too far to sync (${r.toFixed(1)} m). Get within ${LEGEND.syncRange} m.`, tone: 'warn', t: s.t }
      return
    }
    if (len(s.v) > LEGEND.syncRel) {
      s.note = { text: 'Too fast to sync. Slow down first.', tone: 'warn', t: s.t }
      return
    }
    // Matching the tumble means moving sideways at ω·r: that costs Δv now.
    const cost = LEGEND.spin * r * LEGEND.fuelPerDv
    if (s.fuel < cost) {
      s.note = { text: 'Not enough fuel to match the tumble.', tone: 'bad', t: s.t }
      return
    }
    s.fuel -= cost
    s.syncFuel += cost
    const rf = toRot(s.p, s.v, s.ang, LEGEND.spin)
    s.pr = rf.pr
    s.vr = rf.vr
    s.synced = true
    s.phase = 'synced'
    s.note = { text: `Synced to the tumble (cost ${cost.toFixed(1)} fuel). The satellite now looks still.`, tone: 'good', t: s.t }
    return
  }
  if (cmd === 'grab') {
    s.grabTries += 1
    if (!s.synced) {
      const sweep = LEGEND.spin * (LEGEND.keepOut + 0.5)
      s.note = { text: `The handle sweeps past at ${(sweep * 100).toFixed(0)} cm/s — sync to the tumble first.`, tone: 'warn', t: s.t }
      return
    }
    const d = len(sub(s.pr, LEGEND.capture))
    const rel = len(s.vr)
    if (d > LEGEND.captureR) {
      s.note = { text: `Grab missed: ${d.toFixed(1)} m from the capture point.`, tone: 'warn', t: s.t }
      return
    }
    if (rel > LEGEND.captureRel) {
      s.note = { text: `Grab refused: closing at ${(rel * 100).toFixed(0)} cm/s. Need ${(LEGEND.captureRel * 100).toFixed(0)} or less.`, tone: 'warn', t: s.t }
      return
    }
    s.phase = 'captured'
    s.phaseT = s.t
    s.vr = v2(0, 0)
    s.note = { text: 'Captured! Now stop the tumble.', tone: 'good', t: s.t }
    return
  }
  if (!spend(s, LEGEND.dv * LEGEND.fuelPerDv)) {
    s.note = { text: 'No fuel — thrusters silent.', tone: 'bad', t: s.t }
    return
  }
  s.puffs += 1
  if (s.synced) s.vr = add(s.vr, mul(DIR_VEC[cmd], LEGEND.dv))
  else s.v = add(s.v, mul(DIR_VEC[cmd], LEGEND.dv))
}

function stepLegend(s: LegendState, inp: Input): void {
  // Commands leave the ground now and arrive LEGEND.up seconds later.
  for (const d of inp.puffs) s.queue.push({ at: s.t + LEGEND.up, cmd: d })
  if (inp.grab) s.queue.push({ at: s.t + LEGEND.up, cmd: 'grab' })
  if (inp.sync) s.queue.push({ at: s.t + LEGEND.up, cmd: 'sync' })

  s.t += DT
  s.ang += LEGEND.spin * DT
  while (s.queue.length && s.queue[0].at <= s.t) applyCommand(s, s.queue.shift()!.cmd)

  if (s.phase === 'captured') {
    if (s.t - s.phaseT > 1.5) {
      if (s.fuel < LEGEND.detumbleFuel) {
        s.outcome = 'lost'
        s.reason = `Captured — but only ${s.fuel.toFixed(0)} fuel left, and stopping the tumble needs ${LEGEND.detumbleFuel}. The pair keeps spinning.`
        return
      }
      s.fuel -= LEGEND.detumbleFuel
      s.phase = 'detumble'
      s.phaseT = s.t
      s.note = { text: `Firing to stop the tumble (−${LEGEND.detumbleFuel} fuel)…`, tone: 'info', t: s.t }
    }
  } else if (s.phase === 'detumble') {
    if (s.t - s.phaseT > 3) {
      s.phase = 'done'
      s.phaseT = s.t
      s.note = { text: 'Tumble stopped. Refuelling the satellite…', tone: 'good', t: s.t }
    }
  } else if (s.phase === 'done') {
    if (s.t - s.phaseT > 2.5) {
      s.outcome = 'won'
      s.reason = 'Satellite captured, stabilised and refuelled.'
    }
  } else if (s.synced) {
    s.pr = add(s.pr, mul(s.vr, DT))
    // Holding a co-rotating path costs fuel every second: centripetal ω²r
    // plus Coriolis 2ω|v| — more the farther out (and faster) you are.
    const a = LEGEND.spin * LEGEND.spin * len(s.pr) + 2 * LEGEND.spin * len(s.vr)
    const cost = a * DT * LEGEND.fuelPerDv
    s.fuel = Math.max(0, s.fuel - cost)
    s.syncFuel += cost
    const back = fromRot(s.pr, s.vr, s.ang, LEGEND.spin)
    s.p = back.p
    s.v = back.v
    if (s.fuel <= 0) {
      s.outcome = 'lost'
      s.reason = 'Fuel ran out while matching the tumble.'
      return
    }
  } else {
    s.p = add(s.p, mul(s.v, DT))
  }

  if (s.phase === 'approach' || s.phase === 'synced') {
    const r = len(s.p)
    s.closest = Math.min(s.closest, r)
    if (r < LEGEND.keepOut) {
      // Contact with the satellite body.
      const rel = s.synced ? len(s.vr) : len(s.v) + LEGEND.spin * LEGEND.keepOut
      if (rel > LEGEND.contactRel) {
        s.outcome = 'lost'
        s.reason = `Collision at ${(rel * 100).toFixed(0)} cm/s with the ${s.synced ? '' : 'spinning '}satellite.`
        return
      }
      s.contacts += 1
      if (s.synced) {
        const n = mul(s.pr, 1 / Math.max(len(s.pr), 1e-6))
        s.pr = mul(n, LEGEND.keepOut + 0.01)
        const radial = s.vr.x * n.x + s.vr.y * n.y
        if (radial < 0) s.vr = sub(s.vr, mul(n, 1.3 * radial))
      }
      s.note = { text: 'Contact! A gentle touch, but keep clear of the solar panels.', tone: 'warn', t: s.t }
    }
    if (r > LEGEND.lostRange) {
      s.outcome = 'lost'
      s.reason = 'The servicer drifted too far away to return with its fuel.'
      return
    }
  }
  if (s.fuel <= 0 && s.phase === 'approach' && s.queue.length === 0 && s.outcome === 'running') {
    s.outcome = 'lost'
    s.reason = 'Out of fuel before the capture.'
    return
  }
  if (s.t > LEGEND.timeLimit) {
    s.outcome = 'lost'
    s.reason = 'The communication pass ended before the mission was done.'
    return
  }

  s.history.push(snapshot(s))
  const keep = s.t - LEGEND.down - 0.5
  while (s.history.length > 2 && s.history[1].t < keep) s.history.shift()
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared
// ─────────────────────────────────────────────────────────────────────────────

export type GameState = CadetState | PilotState | AceState | LegendState

export function createState(tier: TierIndex): GameState {
  if (tier === 0) return createCadet()
  if (tier === 1) return createPilot()
  if (tier === 2) return createAce()
  return createLegend()
}

export function step(s: GameState, inp: Input): void {
  if (s.outcome !== 'running') return
  if (s.kind === 'cadet') stepCadet(s, inp)
  else if (s.kind === 'pilot') stepPilot(s, inp)
  else if (s.kind === 'ace') stepAce(s, inp)
  else stepLegend(s, inp)
}

export interface Report {
  stars: number
  score: number
  scoreLabel: string
  lowerIsBetter: boolean
  message: string
  /** Why it happened: 2–4 short, specific lines that tie the result to the physics. */
  why: string[]
  badges: string[]
}

const f1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1)

export function report(s: GameState): Report {
  const won = s.outcome === 'won'
  if (s.kind === 'cadet') {
    const stars = !won ? 0 : s.puffsUsed <= 14 && s.bumps <= 1 ? 3 : s.puffsUsed <= 22 ? 2 : 1
    const why: string[] = [
      `You used ${s.puffsUsed} puffs. Each puff changed the robot’s speed by ${CADET.dv} m/s — and floating with nothing to rub against, the robot kept that speed (the station’s air slows it only a tiny bit, so the game leaves it out).`,
      s.bumps > 0
        ? `The robot bonked the wall ${s.bumps} time${s.bumps === 1 ? '' : 's'}. It did not slow down by itself — only the wall (or a puff the other way) stopped it. That is Newton’s first law.`
        : 'No bonks! You stopped the robot with opposite puffs instead of letting a wall stop it.',
      s.fastAtDock > 0
        ? `It reached the charger too fast ${s.fastAtDock} time${s.fastAtDock === 1 ? '' : 's'}. To stop, you need as many puffs backwards as you gave forwards.`
        : 'Every puff pushes gas one way and the robot the other way — the plume always points away from where the robot goes.',
    ]
    if (!won) why.unshift(s.reason)
    return {
      stars,
      score: won ? s.puffsUsed : 0,
      scoreLabel: 'puffs used',
      lowerIsBetter: true,
      message: won
        ? stars === 3
          ? 'Docked with very few puffs: you let the robot coast and stopped it on purpose.'
          : 'Docked! Fewer puffs next time: one push to go, one push to stop.'
        : `${s.reason} In space a push keeps the robot moving until another push stops it.`,
      why,
      badges: won ? ['precise-parker'] : [],
    }
  }
  if (s.kind === 'pilot') {
    const cm = s.relAtGrab * 100
    const stars = !won ? 0 : cm <= 3 && s.bumps === 0 ? 3 : cm <= 4 || s.bumps <= 1 ? 2 : 1
    const why: string[] = won
      ? [
          `At the grab the hand and the pin were moving ${f1(cm)} cm/s apart. Below 5 cm/s the snares close softly, because there is almost no momentum to absorb.`,
          s.bumps > 0
            ? `You bumped the ship ${s.bumps} time${s.bumps === 1 ? '' : 's'}: touching it with a speed difference pushed it away, and it kept that new speed.`
            : 'No bumps: you matched the ship’s drift before closing in.',
          'Real cargo ships stop firing their thrusters (free drift) before the arm grabs them, so the arm operator chases a slowly drifting target — just like you did.',
        ]
      : [
          s.reason,
          s.closest < 2
            ? `You got within ${f1(s.closest)} m. The trick is to fly the hand alongside the pin at the same speed, then creep the last half-metre.`
            : 'The ship never stops: it keeps drifting at the same speed. Start moving the hand early, in the same direction as the ship.',
          'Grabbing with a speed difference hands that momentum to the snare and pin. Too much and something breaks.',
        ]
    return {
      stars,
      score: won ? Math.round(cm * 10) / 10 : 0,
      scoreLabel: 'cm/s at capture',
      lowerIsBetter: true,
      message: won ? `Captured at ${f1(cm)} cm/s relative speed — match first, then grab.` : `${s.reason} Match the ship’s speed before you grab.`,
      why,
      badges: won ? ['arm-artist'] : [],
    }
  }
  if (s.kind === 'ace') {
    const stars = !won ? 0 : s.maxTheta <= 2 && s.t <= 300 ? 3 : s.maxTheta <= 3.5 ? 2 : 1
    const why: string[] = [
      `The servicer twisted up to ${f1(s.maxTheta)}° (limit ${ACE.limitDeg}°). Swinging a ${ACE.moduleMass} kg module one way turns the whole spacecraft the other way — every push has an equal and opposite push back.`,
      'Moving the hand straight toward or away from the centre twists the servicer far less than swinging it round. Speed and distance from the centre both make the twist bigger.',
      s.wrongOrder > 0
        ? `You tried an out-of-order step ${s.wrongOrder} time${s.wrongOrder === 1 ? '' : 's'}. A swap is a sequence: free the slot, park the old part, fetch the new one, then insert.`
        : 'Your sequence was clean: remove, park, fetch, insert — no wasted moves.',
    ]
    if (!won) why.unshift(s.reason)
    return {
      stars,
      score: won ? Math.round(s.maxTheta * 10) / 10 : 0,
      scoreLabel: '° biggest twist',
      lowerIsBetter: true,
      message: won ? `Module swapped with at most ${f1(s.maxTheta)}° of twist — slow, smooth arm moves keep the spacecraft steady.` : `${s.reason} Use fine mode with the heavy module.`,
      why,
      badges: won ? ['arm-artist', 'gear-head'] : [],
    }
  }
  const fuelLeft = Math.round(s.fuel)
  const stars = !won ? 0 : fuelLeft >= 45 && s.contacts === 0 ? 3 : fuelLeft >= 25 ? 2 : 1
  const why: string[] = [
    `Thruster puffs used ${f1(s.puffs * LEGEND.dv * LEGEND.fuelPerDv)} fuel. Matching the tumble used ${f1(s.syncFuel)} — holding a spinning frame costs ω²r every second, so sync close in and capture quickly.`,
    `Every command took ${LEGEND.up} s to arrive and the video was ${LEGEND.down} s old — ${LEGEND.up + LEGEND.down} s round trip. Puff, wait, watch: impatient extra puffs stack up and overshoot.`,
    s.contacts > 0 ? `You touched the satellite ${s.contacts} time${s.contacts === 1 ? '' : 's'}. Soft touches are survivable; at more than ${LEGEND.contactRel * 100} cm/s they break things.` : 'No contacts — a clean approach.',
  ]
  if (!won) why.unshift(s.reason)
  return {
    stars,
    score: won ? fuelLeft : 0,
    scoreLabel: 'fuel left',
    lowerIsBetter: false,
    message: won ? `Mission complete with ${fuelLeft} fuel left. Patience beats delay; closeness beats a costly tumble-match.` : `${s.reason} Plan for the delay and save fuel for stopping the tumble.`,
    why,
    badges: won ? ['mars-planner', 'precise-parker'] : [],
  }
}
