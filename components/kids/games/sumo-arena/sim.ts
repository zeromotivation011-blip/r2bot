// components/kids/games/sumo-arena/sim.ts
// Robo Sumo physics: two robots on a raised, round dohyo, simulated with the
// same Rapier engine and the same part tables (lib/kids/sim/robot-spec.ts) as
// the R2BOT physics lab. Pure logic: no React, no three.js, runs in node too.
//
// The real robotics, written down:
//   * Each robot is one rigid body with its real mass (body + drive + head +
//     tool + any ballast) resting on frictionless skids. The ONLY thing that
//     moves it across the ring is the push its wheels/tracks put into the floor.
//   * That push is limited twice: by the MOTOR (stall force, falling with speed
//     like a real DC motor's back-EMF) and by TRACTION (grip × weight). A light
//     robot spins its wheels (traction-limited); a heavy one is motor-limited and
//     slow to speed up. The best sumo robot sits where the two limits meet.
//   * Rapier resolves the collisions, so momentum is real: a fast charge hits
//     harder than a slow one, and a push that is off-centre slides off.
//   * A WEDGE (the Scoop tool) that meets a rival with its front slides under
//     it and carries part of its weight. The lifted robot's wheels press down
//     less, so it grips less and is pushed easily. Two wedges meeting head-on
//     cancel out.
//   * A robot whose centre of mass passes the ring's edge falls off: it loses.
//
// Deterministic: fixed 60 Hz step, fixed creation order, no Math.random and no
// wall-clock time. Same programs + same seed ⇒ the same match on the same device.

import type { Collider, RigidBody, World } from '@dimforge/rapier3d-compat'
import type { Rapier } from '@/lib/kids/sim/rapier'
import { robotSpec, type RobotSpec } from '@/lib/kids/sim/robot-spec'
import type { RobotDesign } from '@/lib/kids/robot-design'

export const DT = 1 / 60
const G = 9.81
/** Standard robot-sumo dohyo for 20 cm robots: 154 cm across, 5 cm high, 5 cm white edge. */
export const RING_R = 0.77
export const RING_H = 0.05
export const LINE_W = 0.05
/** A match is decided by a push-out or ends as a draw after this many seconds. */
export const MATCH_S = 30
/** Rubber tyres on the dohyo's hard rubber top (before each drive's own grip multiplier). */
export const MU = 0.9
/** Rolling resistance: grows with weight, so a heavier robot coasts to a stop sooner. */
const CRR = 0.04
/** Sumo gearing on top of the lab's drive tables: stronger, faster motors for a competition robot. */
export const SUMO_FORCE = 1.6
export const SUMO_SPEED = 1.5
/** Back-EMF: motor push reaches zero at this multiple of top speed (the rest is eaten by rolling drag). */
const NO_LOAD = 1.05
/** Front distance sensor: an infrared ranger, about 80 cm range, ±14° fan. */
export const EYE_RANGE_CM = 80
const EYE_FAN_DEG = [-14, -7, 0, 7, 14]
/** Share of a robot's weight a wedge carries when it gets under it. */
export const WEDGE_LIFT = 0.45
/** Most a Legend robot may weigh (real robot sumo has a weight limit too). */
export const WEIGHT_LIMIT_KG = 2.5

// ── Small vector helpers (Rapier returns plain {x,y,z}) ─────────────────────
type V3 = { x: number; y: number; z: number }
type Q = { x: number; y: number; z: number; w: number }
function rot(q: Q, v: V3): V3 {
  const ix = q.w * v.x + q.y * v.z - q.z * v.y
  const iy = q.w * v.y + q.z * v.x - q.x * v.z
  const iz = q.w * v.z + q.x * v.y - q.y * v.x
  const iw = -q.x * v.x - q.y * v.y - q.z * v.z
  return {
    x: ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
    y: iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
    z: iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x,
  }
}
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
function yawQuat(yaw: number): Q {
  return { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }
}
/** Angle (deg, −180..180) from heading a to heading b, both as unit xz vectors. Positive = b is to the RIGHT. */
function bearingDeg(fx: number, fz: number, dx: number, dz: number): number {
  // Robot faces +z with +x on its LEFT (three.js, y up), so "right" is −x.
  const cross = fz * dx - fx * dz // >0 when d is to the left
  const dot = fx * dx + fz * dz
  return (-Math.atan2(cross, dot) * 180) / Math.PI
}

// ── Seeded randomness (mulberry32) ─────────────────────────────────────────
export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── What a robot's brain sees and does ─────────────────────────────────────
export interface SumoSensors {
  /** Match clock, ms. */
  tMs: number
  /** Distance to the rival in cm, or null when the fan sees nothing within range. */
  distCm: number | null
  /** Where in the fan the rival is: negative = to the left, positive = to the right (deg). */
  bearingDeg: number
  /** Edge sensors (front-left, front-right): reflected light 0–100. Black ring ≈ 8, white line ≈ 92. */
  edgeL: number
  edgeR: number
}

export interface DriveCmd {
  /** Motor targets, percent of top speed (−100..100). */
  l: number
  r: number
  /** The brain's state, shown above the robot (SEARCH, CHARGE, RECOVER …). */
  state: string
}

export interface Controller {
  tick(s: SumoSensors, dtMs: number): DriveCmd
}

// ── Physical numbers for a robot (shown in the Legend design bay) ───────────
export interface BotStats {
  massKg: number
  /** Total motor stall push, N. */
  motorN: number
  /** Traction limit: grip × weight, N. */
  gripN: number
  /** What it can really push with: the smaller of the two. */
  pushN: number
  limitedBy: 'motor' | 'traction'
  topSpeed: number
  /** Starting acceleration, m/s². */
  accel: number
  wedge: boolean
}

export function botStats(design: RobotDesign, ballastKg = 0, motorMul = 1): BotStats {
  const spec = robotSpec(design)
  const massKg = spec.mass + ballastKg
  const motorN = spec.drive.maxForcePerSide * SUMO_FORCE * 2 * motorMul
  const gripN = MU * spec.drive.grip * massKg * G
  const pushN = Math.min(motorN, gripN)
  return {
    massKg,
    motorN,
    gripN,
    pushN,
    limitedBy: motorN < gripN ? 'motor' : 'traction',
    topSpeed: spec.drive.maxSpeed * SUMO_SPEED,
    accel: pushN / massKg,
    wedge: design.tool === 'scoop',
  }
}

// ── Match setup and results ────────────────────────────────────────────────
export type BotId = 'you' | 'rival'

export interface BotSetup {
  id: BotId
  name: string
  design: RobotDesign
  ballastKg: number
  /** Start position (m) and facing (rad about +y; 0 faces +z). */
  x: number
  z: number
  yaw: number
  /** Edge reading at or above which this robot's brain counts "line seen" (for the debrief). */
  edgeThreshold: number
  controller: Controller
  /** Motor strength multiplier (a weaker or stronger gearbox: less push, same top speed). Default 1. */
  motorMul?: number
}

export interface BotLog {
  /** First time the rival was inside the sensor fan, s (null = never). */
  firstSeenS: number | null
  /** Seconds in contact with the rival. */
  contactS: number
  /** Seconds this robot was lifted by the rival's wedge. */
  liftedS: number
  /** Seconds this robot's wedge was under the rival. */
  liftingS: number
  /** Metres this robot was shoved backwards while touching the rival. */
  pushedBackM: number
  /** How many times the brain entered a recover / back-up state. */
  recovers: number
  /** Seconds the wheels were slipping (asked for more push than the floor gave). */
  slipS: number
  /** Brain state at the moment it went out (if it did). */
  stateAtOut: string | null
  /** Did its edge sensors read the line in the last second before going out? */
  sawEdgeBeforeOut: boolean
  /** Last contact: was this robot's front facing the rival? */
  lastContactFront: boolean
  lastContactT: number
  /** Most it moved per second, m/s. */
  topSpeedSeen: number
  /** Seconds spent in each brain state. */
  stateTime: Record<string, number>
}

export interface MatchResult {
  winner: BotId | 'draw'
  /** Seconds when the match was decided. */
  t: number
  /** Who went out (null on a time-out draw). */
  out: BotId | null
  /** Was the loser touching the winner in the last 0.6 s before it went out? */
  pushedOut: boolean
  /** When pushed out: the side of the loser the winner hit. */
  hitSide: 'front' | 'side' | 'back' | null
  logs: Record<BotId, BotLog>
}

export interface BotView {
  id: BotId
  p: V3
  q: Q
  state: string
  distCm: number | null
  edgeL: boolean
  edgeR: boolean
  lifted: boolean
  out: boolean
  /** Wheel surface speed per side, m/s, for the renderer's wheel spin. */
  wheel: [number, number]
}

export interface Match {
  readonly t: number
  readonly decided: boolean
  readonly result: MatchResult | null
  readonly setups: [BotSetup, BotSetup]
  readonly stats: Record<BotId, BotStats>
  step(): void
  /** Step until decided (or the clock runs out). Returns the result. */
  runToEnd(): MatchResult
  view(): BotView[]
  dispose(): void
}

function emptyLog(): BotLog {
  return {
    firstSeenS: null,
    contactS: 0,
    liftedS: 0,
    liftingS: 0,
    pushedBackM: 0,
    recovers: 0,
    slipS: 0,
    stateAtOut: null,
    sawEdgeBeforeOut: false,
    lastContactFront: false,
    lastContactT: -1,
    topSpeedSeen: 0,
    stateTime: {},
  }
}

/** Reflected light at a floor point: black ring, white edge line, nothing (dark) past the edge. */
export function edgeReading(x: number, z: number): number {
  const r = Math.hypot(x, z)
  if (r > RING_R) return 4
  const inner = RING_R - LINE_W
  // The sensor's spot is about 1.6 cm wide, so the reading ramps up as it crosses onto the line.
  const k = clamp((r - (inner - 0.008)) / 0.016, 0, 1)
  return 8 + 84 * k
}

interface Bot {
  setup: BotSetup
  spec: RobotSpec
  mass: number
  body: RigidBody
  chassis: Collider
  track: number
  halfX: number
  length: number
  iy: number
  mEffSide: number
  vmax: number
  fStall: number
  grip: number
  wedge: boolean
  /** Weight fraction its wheels carry this tick (1 = all, less when lifted by a wedge). */
  loadMul: number
  /** Extra downforce from carrying the rival on its wedge, N. */
  extraLoad: number
  cmd: DriveCmd
  sensors: SumoSensors
  wheel: [number, number]
  out: boolean
  log: BotLog
  edgeTimes: number[]
  lastState: string
}

export function createMatch(R: Rapier, setups: [BotSetup, BotSetup]): Match {
  const world: World = new R.World({ x: 0, y: -G, z: 0 })
  world.timestep = DT

  // Floor around the ring, and the raised dohyo itself.
  world.createCollider(R.ColliderDesc.cuboid(4, 0.5, 4).setTranslation(0, -0.5, 0).setFriction(0.6))
  world.createCollider(R.ColliderDesc.cylinder(RING_H / 2, RING_R).setTranslation(0, RING_H / 2, 0).setFriction(0.6))

  const bots: Bot[] = setups.map((s) => {
    const spec = robotSpec(s.design)
    const mass = spec.mass + s.ballastKg
    const b = spec.body
    const halfX = spec.track + 0.015
    const length = b.front - b.back
    const iy = (mass * ((2 * halfX) ** 2 + length ** 2)) / 12
    const ix = (mass * (b.top ** 2 + length ** 2)) / 12
    const iz = (mass * (b.top ** 2 + (2 * halfX) ** 2)) / 12
    const body = world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .setTranslation(s.x, RING_H + 0.002, s.z)
        .setRotation(yawQuat(s.yaw))
        .setAdditionalMassProperties(mass, { x: 0, y: spec.comY, z: 0 }, { x: ix, y: iy, z: iz }, { x: 0, y: 0, z: 0, w: 1 })
        .setAngularDamping(0.4)
        .setCanSleep(false),
    )
    const frictionless = (desc: ReturnType<typeof R.ColliderDesc.ball>) =>
      desc.setDensity(0).setFriction(0).setFrictionCombineRule(R.CoefficientCombineRule.Min).setRestitution(0.05)
    const chassis = world.createCollider(
      frictionless(R.ColliderDesc.cuboid(halfX, (b.top - b.bottom) / 2, length / 2)).setTranslation(0, (b.top + b.bottom) / 2, 0),
      body,
    )
    const SKID_R = 0.025
    for (const sx of [-1, 1]) {
      for (const z of [b.front * 0.75, b.back * 0.75]) {
        world.createCollider(frictionless(R.ColliderDesc.ball(SKID_R)).setTranslation(sx * spec.track, SKID_R, z), body)
      }
    }
    return {
      setup: s,
      spec,
      mass,
      body,
      chassis,
      track: spec.track,
      halfX,
      length,
      iy,
      mEffSide: 1 / (1 / mass + (spec.track * spec.track) / iy),
      vmax: spec.drive.maxSpeed * SUMO_SPEED,
      fStall: spec.drive.maxForcePerSide * SUMO_FORCE * (s.motorMul ?? 1),
      grip: MU * spec.drive.grip,
      wedge: s.design.tool === 'scoop',
      loadMul: 1,
      extraLoad: 0,
      cmd: { l: 0, r: 0, state: 'READY' },
      sensors: { tMs: 0, distCm: null, bearingDeg: 0, edgeL: 8, edgeR: 8 },
      wheel: [0, 0],
      out: false,
      log: emptyLog(),
      edgeTimes: [],
      lastState: 'READY',
    }
  })
  // Build the ray-cast index before the first sensor read.
  world.timestep = 0
  world.step()
  world.timestep = DT

  let tick = 0
  let result: MatchResult | null = null

  const pos = (b: Bot) => b.body.translation()
  const fwd = (b: Bot) => {
    const f = rot(b.body.rotation(), { x: 0, y: 0, z: 1 })
    const l = Math.hypot(f.x, f.z) || 1
    return { x: f.x / l, z: f.z / l }
  }
  const local = (b: Bot, x: number, y: number, z: number): V3 => {
    const p = pos(b)
    const v = rot(b.body.rotation(), { x, y, z })
    return { x: p.x + v.x, y: p.y + v.y, z: p.z + v.z }
  }

  function sense(b: Bot, other: Bot): SumoSensors {
    const t = tick * DT
    // Distance fan, mounted low at the front so it sees every robot.
    const eye = local(b, 0, 0.1, b.spec.body.front - 0.005)
    const q = b.body.rotation()
    let best = Infinity
    let sumA = 0
    let nA = 0
    for (const deg of EYE_FAN_DEG) {
      const a = (deg * Math.PI) / 180
      // Robot space: +z forward, +x LEFT. A positive (rightward) angle is −x.
      const dir = rot(q, { x: -Math.sin(a), y: 0, z: Math.cos(a) })
      const hit = world.castRay(new R.Ray(eye, dir), EYE_RANGE_CM / 100, true, undefined, undefined, undefined, b.body, (c: Collider) => c.parent()?.handle === other.body.handle)
      if (hit) {
        if (hit.timeOfImpact < best) best = hit.timeOfImpact
        sumA += deg
        nA++
      }
    }
    const sl = local(b, b.halfX * 0.75, 0, b.spec.body.front + 0.005)
    const sr = local(b, -b.halfX * 0.75, 0, b.spec.body.front + 0.005)
    return {
      tMs: Math.round(t * 1000),
      distCm: nA > 0 ? Math.round(best * 1000) / 10 : null,
      bearingDeg: nA > 0 ? sumA / nA : 0,
      edgeL: Math.round(edgeReading(sl.x, sl.z)),
      edgeR: Math.round(edgeReading(sr.x, sr.z)),
    }
  }

  function drive(b: Bot): void {
    const p = pos(b)
    const q = b.body.rotation()
    const up = rot(q, { x: 0, y: 1, z: 0 })
    const onRing = Math.hypot(p.x, p.z) <= RING_R && p.y > RING_H - 0.02 && up.y > 0.8
    const u: [number, number] = [clamp(b.cmd.l, -100, 100) / 100, clamp(b.cmd.r, -100, 100) / 100]
    const tgt: [number, number] = [u[0] * b.vmax, u[1] * b.vmax]
    if (!onRing || b.out) {
      b.wheel = [tgt[0], tgt[1]]
      return
    }
    const f = fwd(b)
    const F3: V3 = { x: f.x, y: 0, z: f.z }
    // Robot's right along the ground (= −local x).
    const rgt: V3 = { x: -f.z, y: 0, z: f.x }
    const v = b.body.linvel()
    const w = b.body.angvel()
    const vf = v.x * f.x + v.z * f.z
    const vr = v.x * rgt.x + v.z * rgt.z
    const wn = w.y
    const load = b.mass * G * b.loadMul + b.extraLoad
    const loadSide = load / 2
    const com = local(b, 0, b.spec.comY, 0)
    let slipping = false
    for (let s = 0; s < 2; s++) {
      // s = 0 left (+x local = −right), s = 1 right.
      const side = s === 0 ? -1 : 1
      // Yaw rate wn > 0 turns the robot left (counter-clockwise from above), which speeds up the RIGHT side.
      const vSide = vf + side * b.track * wn
      // A DC motor: push = stall force × (voltage share − speed / no-load speed). Full push when
      // stalled against a rival, none at top speed, and it brakes when the voltage drops.
      const motor = clamp(b.fStall * (u[s] - vSide / (b.vmax * NO_LOAD)), -b.fStall, b.fStall)
      const gripLim = b.grip * loadSide
      if (Math.abs(motor) > gripLim) slipping = true
      let F = clamp(motor, -gripLim, gripLim)
      const drag = CRR * loadSide
      F += clamp(-((vSide * b.mEffSide) / DT + F), -drag, drag)
      const pt = { x: com.x + rgt.x * side * b.track, y: com.y, z: com.z + rgt.z * side * b.track }
      b.body.applyImpulseAtPoint({ x: F3.x * F * DT, y: 0, z: F3.z * F * DT }, pt, true)
      b.wheel[s] = slipping ? tgt[s] : vSide
    }
    if (slipping) b.log.slipS += DT
    // Tyres resist sliding sideways (up to grip × load).
    const latLim = b.grip * load
    const lat = clamp((-vr * b.mass) / DT / 2, -latLim, latLim)
    b.body.applyImpulse({ x: rgt.x * lat * DT, y: 0, z: rgt.z * lat * DT }, true)
    // Skid-steer drives scrub when turning.
    const scrub = b.spec.drive.scrub
    if (scrub > 0) {
      const tLim = scrub * b.grip * load * (b.length / 4)
      const tq = clamp((-wn * b.iy) / DT / 2, -tLim, tLim)
      b.body.applyTorqueImpulse({ x: 0, y: tq * DT, z: 0 }, true)
    }
  }

  function touching(a: Bot, b: Bot): boolean {
    let hit = false
    world.contactPair(a.chassis, b.chassis, (m) => {
      if (m.numContacts() > 0) hit = true
    })
    return hit
  }

  function frontOn(a: Bot, b: Bot): boolean {
    const pa = pos(a)
    const pb = pos(b)
    const f = fwd(a)
    return Math.abs(bearingDeg(f.x, f.z, pb.x - pa.x, pb.z - pa.z)) < 40
  }

  function decide(winner: BotId | 'draw', out: BotId | null): void {
    const t = tick * DT
    const loser = out ? bots.find((b) => b.setup.id === out) : undefined
    const win = loser ? bots.find((b) => b !== loser) : undefined
    let pushedOut = false
    let hitSide: MatchResult['hitSide'] = null
    if (loser && win) {
      loser.log.stateAtOut = loser.cmd.state
      loser.log.sawEdgeBeforeOut = loser.edgeTimes.some((et) => t - et <= 1)
      pushedOut = loser.log.lastContactT >= 0 && t - loser.log.lastContactT <= 0.6
      if (pushedOut) {
        const pl = pos(loser)
        const pw = pos(win)
        const f = fwd(loser)
        const brg = Math.abs(bearingDeg(f.x, f.z, pw.x - pl.x, pw.z - pl.z))
        hitSide = brg < 45 ? 'front' : brg > 120 ? 'back' : 'side'
      }
    }
    result = {
      winner,
      t: Math.round(t * 100) / 100,
      out,
      pushedOut,
      hitSide,
      logs: { you: bots[0].log, rival: bots[1].log },
    }
  }

  function step(): void {
    const t = tick * DT
    const live = !result
    const [A, B] = bots
    if (live) {
      // 1. Sense and think.
      for (const [me, other] of [
        [A, B],
        [B, A],
      ] as const) {
        me.sensors = sense(me, other)
        if (me.sensors.distCm !== null && me.log.firstSeenS === null) me.log.firstSeenS = Math.round(t * 100) / 100
        if (Math.max(me.sensors.edgeL, me.sensors.edgeR) >= me.setup.edgeThreshold) {
          me.edgeTimes.push(t)
          if (me.edgeTimes.length > 90) me.edgeTimes.shift()
        }
        me.cmd = me.setup.controller.tick(me.sensors, DT * 1000)
        if (me.cmd.state !== me.lastState && /RECOVER|BACK/.test(me.cmd.state)) me.log.recovers++
        me.lastState = me.cmd.state
        me.log.stateTime[me.cmd.state] = (me.log.stateTime[me.cmd.state] ?? 0) + DT
      }
    } else {
      A.cmd = { l: 0, r: 0, state: A.out ? 'OUT' : 'WIN' }
      B.cmd = { l: 0, r: 0, state: B.out ? 'OUT' : 'WIN' }
    }
    // 2. Contact and wedges (from the last step's contacts).
    A.loadMul = 1
    B.loadMul = 1
    A.extraLoad = 0
    B.extraLoad = 0
    const contact = touching(A, B)
    if (contact) {
      const aFront = frontOn(A, B)
      const bFront = frontOn(B, A)
      for (const [me, other, meFront, otherFront] of [
        [A, B, aFront, bFront],
        [B, A, bFront, aFront],
      ] as const) {
        if (live) {
          me.log.contactS += DT
          me.log.lastContactT = t
          me.log.lastContactFront = meFront
        }
        // A wedge under the rival lifts it, unless the rival's own wedge meets it head-on.
        if (me.wedge && meFront && !(other.wedge && otherFront)) {
          other.loadMul = 1 - WEDGE_LIFT
          me.extraLoad = WEDGE_LIFT * other.mass * G
          if (live) {
            other.log.liftedS += DT
            me.log.liftingS += DT
          }
        }
      }
    }
    // 3. Drive forces, then one physics step.
    for (const b of bots) drive(b)
    world.step()
    tick++
    // 4. Book-keeping and the referee.
    for (const b of bots) {
      const v = b.body.linvel()
      const sp = Math.hypot(v.x, v.z)
      if (live && sp > b.log.topSpeedSeen) b.log.topSpeedSeen = sp
      if (live && contact) {
        const f = fwd(b)
        const vf = v.x * f.x + v.z * f.z
        if (vf < 0 && b.cmd.l + b.cmd.r >= 0) b.log.pushedBackM += -vf * DT
      }
      const p = pos(b)
      if (!b.out && (Math.hypot(p.x, p.z) > RING_R || p.y < RING_H - 0.03)) b.out = true
    }
    if (live) {
      if (A.out && B.out) decide('draw', null)
      else if (A.out) decide('rival', 'you')
      else if (B.out) decide('you', 'rival')
      else if (tick * DT >= MATCH_S) decide('draw', null)
    }
  }

  const match: Match = {
    get t() {
      return tick * DT
    },
    get decided() {
      return result !== null
    },
    get result() {
      return result
    },
    setups,
    stats: { you: botStats(setups[0].design, setups[0].ballastKg, setups[0].motorMul), rival: botStats(setups[1].design, setups[1].ballastKg, setups[1].motorMul) },
    step,
    runToEnd() {
      while (!result) step()
      return result as MatchResult
    },
    view() {
      return bots.map((b) => ({
        id: b.setup.id,
        p: { ...pos(b) },
        q: { ...b.body.rotation() },
        state: b.cmd.state,
        distCm: b.sensors.distCm,
        edgeL: b.sensors.edgeL >= b.setup.edgeThreshold,
        edgeR: b.sensors.edgeR >= b.setup.edgeThreshold,
        lifted: b.loadMul < 1,
        out: b.out,
        wheel: [b.wheel[0], b.wheel[1]] as [number, number],
      }))
    },
    dispose() {
      world.free()
    },
  }
  return match
}
