// components/kids/games/drone-hover/sim.ts
// Sky Port: Drone Pilot — the physics and the flight controller.
//
// Pure TypeScript, no DOM. Fixed time step, seeded randomness: the same gains
// on the same tier always give the same flight, so a score is fair.
//
// The model (side view of a quadcopter, the front and back rotor pairs drawn as
// one left and one right "side"):
//  - mass, gravity, and thrust along the body's "up" axis;
//  - each side's thrust follows its command with a first-order motor lag
//    (dT/dt = (T_cmd - T) / tau) — spinning a propeller up takes time;
//  - air: quadratic drag against the wind, plus the rotor's linear inflow
//    damping in the vertical (a climbing rotor makes slightly less thrust);
//  - wind gusts use the "1 − cos" gust shape that aircraft designers use;
//  - power from momentum theory: P = T^1.5 / sqrt(2·rho·A) / FM;
//  - Legend only: a battery whose voltage sags as it empties and under load,
//    and maximum thrust that scales with voltage squared;
//  - Ace and Legend: noisy sensors (barometer, velocity estimate).
//
// The controller is the real thing: hover feed-forward + PID on height, and in
// Legend a cascade (position → tilt angle → motor difference).

export const G = 9.81
const RHO = 1.225
export const DT = 1 / 200
const LOG_EVERY = 10 // 20 Hz samples for the graph

export type TierIndex = 0 | 1 | 2 | 3

export const DRONE = {
  /** Empty mass, kg. */
  mass: 1.0,
  /** Centre to each rotor pair, m. */
  armL: 0.2,
  /** Pitch inertia, kg·m². */
  inertia: 0.02,
  /** Max thrust of one side (two rotors) with a full battery, N. Thrust-to-weight ≈ 2.2. */
  tMaxSide: 11,
  /** Motor + propeller spin-up time constant, s. */
  tau: 0.08,
  /** Rotor inflow damping, N per (m/s). */
  inflowDamping: 0.5,
  /** Drag coefficient × area, side-on and top-down, m². */
  cdaSide: 0.12,
  cdaTop: 0.2,
  /** Rotor disk area of one side (two 10 cm-radius props), m². */
  diskAreaSide: 2 * Math.PI * 0.1 * 0.1,
  figureOfMerit: 0.65,
  angDamping: 0.012,
  /** Legend battery: 4-cell lithium pack. */
  vFull: 16.8,
  vEmptyOC: 14.0,
  internalR: 0.12,
  capacityJ: 3 * 3600,
}

export interface Gains {
  kp: number
  ki: number
  kd: number
  /** Legend outer loop: degrees of tilt per metre of position error. */
  kpx: number
  /** Legend outer loop: degrees of tilt per m/s of sideways speed. */
  kdx: number
  /** Legend inner loop: N·m per radian of tilt error. */
  kpa: number
  /** Legend inner loop: N·m per rad/s of spin. */
  kda: number
}

export interface Gust {
  t0: number
  dur: number
  /** Peak vertical air speed, m/s (+ up). */
  vz: number
  /** Peak horizontal air speed, m/s (+ right). */
  vx: number
}

export interface Waypoint {
  x: number
  z: number
  /** Drop the parcel when this waypoint is reached. */
  drop?: boolean
}

export type TimedEvent =
  | { t: number; kind: 'target'; z: number }
  | { t: number; kind: 'payload'; mass: number }

export interface Mission {
  tier: TierIndex
  /** Hard time limit, s. */
  duration: number
  twoD: boolean
  startX: number
  startTarget: { x: number; z: number }
  startPayload: number
  /** The mass the "hover guess" (feed-forward) assumes. */
  hoverGuessMass: number
  batterySag: boolean
  sensorNoise: boolean
  /** Pilot: the factory damper the child cannot change. */
  fixedKd: number
  /** Cadet: built-in vertical speed damper, N per m/s. */
  manualAssist: number
  events: TimedEvent[]
  gusts: Gust[]
  breeze: number
  /** Height band (± m) that counts as "on target". */
  band: number
  waypoints: Waypoint[]
  wpRadius: number
  wpHold: number
  /** Airspace ceiling, m. */
  ceiling: number
  worldW: number
  worldH: number
  seed: number
}

// ── Seeded randomness ────────────────────────────────────────────────────────

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gaussian(rng: () => number): number {
  const u = Math.max(1e-9, rng())
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function makeGusts(seed: number, from: number, to: number, count: number, maxVz: number, maxVx: number): Gust[] {
  const rng = mulberry32(seed)
  const out: Gust[] = []
  const span = (to - from) / count
  for (let i = 0; i < count; i++) {
    const t0 = from + i * span + rng() * span * 0.5
    const dur = 0.8 + rng() * 1.6
    const sz = rng() < 0.5 ? -1 : 1
    const sx = rng() < 0.5 ? -1 : 1
    out.push({ t0, dur, vz: sz * maxVz * (0.5 + rng() * 0.5), vx: sx * maxVx * (0.5 + rng() * 0.5) })
  }
  return out
}

// ── The four missions ────────────────────────────────────────────────────────

export const CADET_PAYLOAD = 0.3
export const PILOT_PAYLOAD = 0.35
export const ACE_PAYLOAD = 0.4
export const LEGEND_PAYLOAD = 0.4

export function buildMission(tier: TierIndex): Mission {
  const base: Mission = {
    tier,
    duration: 90,
    twoD: false,
    startX: 0,
    startTarget: { x: 0, z: 3 },
    startPayload: 0,
    hoverGuessMass: DRONE.mass,
    batterySag: false,
    sensorNoise: false,
    fixedKd: 0,
    manualAssist: 0,
    events: [],
    gusts: [],
    breeze: 0,
    band: 0.5,
    waypoints: [],
    wpRadius: 0.4,
    wpHold: 1,
    ceiling: 7.4,
    worldW: 10,
    worldH: 7.5,
    seed: 1000 + tier,
  }
  if (tier === 0) {
    return { ...base, duration: 90, manualAssist: 3, band: 0.5, gusts: makeGusts(11, 6, 85, 9, 1.6, 0) }
  }
  if (tier === 1) {
    return {
      ...base,
      duration: 28,
      fixedKd: 4,
      band: 0.3,
      events: [
        { t: 8, kind: 'payload', mass: PILOT_PAYLOAD },
        { t: 16, kind: 'target', z: 5 },
      ],
      gusts: makeGusts(21, 4, 26, 4, 1.2, 0),
    }
  }
  if (tier === 2) {
    return {
      ...base,
      duration: 38,
      sensorNoise: true,
      band: 0.06,
      events: [
        { t: 10, kind: 'payload', mass: ACE_PAYLOAD },
        { t: 18, kind: 'target', z: 5 },
        { t: 30, kind: 'target', z: 2.5 },
      ],
      gusts: [
        ...makeGusts(31, 4, 36, 7, 3.2, 0),
        // The big one: a downdraft off the tower roof.
        { t0: 24, dur: 1.8, vz: -6.5, vx: 0 },
      ],
    }
  }
  return {
    ...base,
    duration: 80,
    twoD: true,
    startX: 2,
    startTarget: { x: 2, z: 2.5 },
    startPayload: LEGEND_PAYLOAD,
    hoverGuessMass: DRONE.mass + LEGEND_PAYLOAD,
    batterySag: true,
    sensorNoise: true,
    breeze: 2,
    band: 0.3,
    gusts: makeGusts(41, 4, 60, 12, 1.5, 7),
    waypoints: [
      { x: 2, z: 2.5 },
      { x: 6, z: 5.5 },
      { x: 11, z: 3 },
      { x: 14, z: 6.5, drop: true },
      { x: 8.5, z: 7 },
      { x: 2, z: 1.2 },
    ],
    wpRadius: 0.3,
    wpHold: 1.2,
    ceiling: 8.6,
    worldW: 16,
    worldH: 9,
  }
}

// ── State ────────────────────────────────────────────────────────────────────

export interface Sample {
  t: number
  z: number
  zt: number
  x: number
  xt: number
  /** Total thrust actually produced, N. */
  thrust: number
  /** Weight right now, N. */
  weight: number
  p: number
  i: number
  d: number
  /** Tilt, degrees. */
  tilt: number
  wind: number
}

export type SimEvent =
  | { kind: 'payload-on'; mass: number }
  | { kind: 'payload-off'; mass: number }
  | { kind: 'target'; z: number }
  | { kind: 'gust'; vz: number; vx: number }
  | { kind: 'waypoint'; index: number }
  | { kind: 'hold-done'; phase: number }
  | { kind: 'band-enter' }
  | { kind: 'touchdown' }

export type Outcome = 'flying' | 'complete' | 'crash' | 'timeout'

export interface SimState {
  mission: Mission
  gains: Gains
  t: number
  steps: number
  x: number
  z: number
  vx: number
  vz: number
  th: number
  om: number
  tL: number
  tR: number
  cmdL: number
  cmdR: number
  integ: number
  payload: number
  soc: number
  volts: number
  energyJ: number
  target: { x: number; z: number }
  /** Wind right now (for drawing). */
  windX: number
  windZ: number
  /** Controller terms right now, N. */
  p: number
  i: number
  d: number
  thetaDes: number
  /** Cadet hold meters, s. */
  hold: number
  phase: number
  wpIndex: number
  wpTimes: number[]
  inBand: boolean
  outcome: Outcome
  crashReason: string
  log: Sample[]
  events: SimEvent[]
  nextEvent: number
  gustsAnnounced: number
  rng: () => number
  satSteps: number
  flightSteps: number
  // metrics
  iae: number
  /** Largest overshoot past a target, m. */
  overshoot: number
  stepDir: number
  stepTime: number
  /** Time after the last target change when the error last left the band. */
  lastOutside: number
  zLow: number
}

export function defaultGains(tier: TierIndex): Gains {
  if (tier === 1) return { kp: 4, ki: 0, kd: 0, kpx: 0, kdx: 0, kpa: 0, kda: 0 }
  if (tier === 2) return { kp: 6, ki: 0, kd: 1, kpx: 0, kdx: 0, kpa: 0, kda: 0 }
  if (tier === 3) return { kp: 8, ki: 0, kd: 2, kpx: 4, kdx: 0, kpa: 0.4, kda: 0.02 }
  return { kp: 0, ki: 0, kd: 0, kpx: 0, kdx: 0, kpa: 0, kda: 0 }
}

export function createSim(mission: Mission, gains: Gains): SimState {
  return {
    mission,
    gains: { ...gains },
    t: 0,
    steps: 0,
    x: mission.startX,
    z: 0,
    vx: 0,
    vz: 0,
    th: 0,
    om: 0,
    tL: 0,
    tR: 0,
    cmdL: 0,
    cmdR: 0,
    integ: 0,
    payload: mission.startPayload,
    soc: 1,
    volts: DRONE.vFull,
    energyJ: 0,
    target: { ...mission.startTarget },
    windX: 0,
    windZ: 0,
    p: 0,
    i: 0,
    d: 0,
    thetaDes: 0,
    hold: 0,
    phase: 0,
    wpIndex: 0,
    wpTimes: [],
    inBand: false,
    outcome: 'flying',
    crashReason: '',
    log: [],
    events: [],
    nextEvent: 0,
    gustsAnnounced: 0,
    rng: mulberry32(mission.seed),
    satSteps: 0,
    flightSteps: 0,
    iae: 0,
    overshoot: 0,
    stepDir: 1,
    stepTime: 0,
    lastOutside: 0,
    zLow: 0,
  }
}

export function totalMass(s: SimState): number {
  return DRONE.mass + s.payload
}

function windAt(m: Mission, t: number): { vx: number; vz: number } {
  let vx = m.breeze
  let vz = 0
  for (const g of m.gusts) {
    if (t < g.t0 || t > g.t0 + g.dur) continue
    const k = 0.5 * (1 - Math.cos((2 * Math.PI * (t - g.t0)) / g.dur))
    vx += g.vx * k
    vz += g.vz * k
  }
  return { vx, vz }
}

const DEG = Math.PI / 180
const MAX_TILT = 30 * DEG
const I_LIMIT = 10 // N — anti-windup clamp on the I term

function setTarget(s: SimState, z: number, x: number = s.target.x): void {
  const dz = z - s.target.z
  const dx = x - s.target.x
  s.stepDir = Math.abs(dz) >= Math.abs(dx) ? Math.sign(dz) || 1 : Math.sign(dx) || 1
  s.target = { x, z }
  s.stepTime = s.t
  s.lastOutside = s.t
}

/** One fixed step. `throttle` (0–1) is only used by the Cadet manual mode. */
export function stepSim(s: SimState, throttle: number): void {
  if (s.outcome !== 'flying') return
  const m = s.mission
  const g = s.gains
  const mass = totalMass(s)

  // ── timed events ──
  while (s.nextEvent < m.events.length && m.events[s.nextEvent].t <= s.t) {
    const ev = m.events[s.nextEvent++]
    if (ev.kind === 'target') {
      setTarget(s, ev.z)
      s.events.push({ kind: 'target', z: ev.z })
    } else {
      s.payload = ev.mass
      s.events.push({ kind: 'payload-on', mass: ev.mass })
    }
  }
  while (s.gustsAnnounced < m.gusts.length && m.gusts[s.gustsAnnounced].t0 <= s.t) {
    const gu = m.gusts[s.gustsAnnounced++]
    if (Math.abs(gu.vz) > 4 || Math.abs(gu.vx) > 4.5) s.events.push({ kind: 'gust', vz: gu.vz, vx: gu.vx })
  }

  // ── sensors ──
  const noisy = m.sensorNoise
  const zm = s.z + (noisy ? gaussian(s.rng) * 0.02 : 0)
  const vzm = s.vz + (noisy ? gaussian(s.rng) * 0.06 : 0)
  const xm = s.x + (noisy ? gaussian(s.rng) * 0.03 : 0)
  const vxm = s.vx + (noisy ? gaussian(s.rng) * 0.06 : 0)

  // ── the brain ──
  const tMax = DRONE.tMaxSide
  let cmdTotal: number
  let torque = 0
  const ez = s.target.z - zm
  if (m.tier === 0) {
    s.p = 0
    s.i = 0
    s.d = -m.manualAssist * vzm
    cmdTotal = throttle * 2 * tMax + s.d
  } else {
    const ff = m.hoverGuessMass * G
    s.p = g.kp * ez
    const dGain = m.tier === 1 ? m.fixedKd : g.kd
    // D on the measurement: it watches how fast the drone moves, so a new target gives no "kick".
    s.d = -dGain * vzm
    if (m.tier >= 2) {
      const unsat = ff + s.p + s.i + s.d
      const saturatedUp = unsat >= 2 * tMax && ez > 0
      const saturatedDown = unsat <= 0 && ez < 0
      if (!saturatedUp && !saturatedDown && s.z > 0.02) s.integ += ez * DT
      s.i = Math.max(-I_LIMIT, Math.min(I_LIMIT, g.ki * s.integ))
      if (g.ki > 0) s.integ = s.i / g.ki
    } else {
      s.i = 0
    }
    const tz = ff + s.p + s.i + s.d
    if (m.twoD) {
      const ex = s.target.x - xm
      const thDesDeg = g.kpx * ex - g.kdx * vxm
      s.thetaDes = Math.max(-MAX_TILT, Math.min(MAX_TILT, thDesDeg * DEG))
      // Tilt compensation: lean over and the vertical part of thrust shrinks.
      cmdTotal = tz / Math.max(0.5, Math.cos(s.th))
      torque = g.kpa * (s.thetaDes - s.th) - g.kda * s.om
    } else {
      cmdTotal = tz
    }
  }

  // Mixer with attitude priority (as real flight controllers do): keep the
  // left/right difference that holds the tilt, and give up height thrust first.
  const wantDiff = torque / (2 * DRONE.armL)
  const diff = Math.max(-tMax / 2, Math.min(tMax / 2, wantDiff))
  const half = cmdTotal / 2
  const collective = Math.max(Math.abs(diff), Math.min(tMax - Math.abs(diff), half))
  const cL = collective + diff
  const cR = collective - diff
  s.cmdL = cL
  s.cmdR = cR
  if (s.z > 0.05) {
    s.flightSteps++
    if (diff !== wantDiff || Math.abs(collective - half) > 1e-6) s.satSteps++
  }

  // ── motors: the battery decides how much thrust a command really makes ──
  const sag = m.batterySag ? (s.volts / DRONE.vFull) ** 2 : 1
  const kLag = Math.min(1, DT / DRONE.tau)
  s.tL += (cL * sag - s.tL) * kLag
  s.tR += (cR * sag - s.tR) * kLag

  // ── power and battery ──
  const pk = 1 / (Math.sqrt(2 * RHO * DRONE.diskAreaSide) * DRONE.figureOfMerit)
  const power = (Math.pow(s.tL, 1.5) + Math.pow(s.tR, 1.5)) * pk
  s.energyJ += power * DT
  if (m.batterySag) {
    s.soc = Math.max(0, 1 - s.energyJ / DRONE.capacityJ)
    const voc = DRONE.vEmptyOC + (DRONE.vFull - DRONE.vEmptyOC) * s.soc
    const current = power / Math.max(1, s.volts)
    s.volts = voc - current * DRONE.internalR
  }

  // ── forces ──
  const w = windAt(m, s.t)
  s.windX = w.vx
  s.windZ = w.vz
  const T = s.tL + s.tR
  const rx = w.vx - s.vx
  const rz = w.vz - s.vz
  let fx = 0.5 * RHO * DRONE.cdaSide * rx * Math.abs(rx)
  const fz = 0.5 * RHO * DRONE.cdaTop * rz * Math.abs(rz) + DRONE.inflowDamping * rz
  if (!m.twoD) fx = 0
  const ax = m.twoD ? (T * Math.sin(s.th) + fx) / mass : 0
  let az = (T * Math.cos(s.th) + fz) / mass - G

  // On the pad, the ground pushes back until thrust beats weight.
  if (s.z <= 0 && az < 0) {
    az = 0
    s.vz = Math.max(0, s.vz)
  }
  s.vx += ax * DT
  s.vz += az * DT
  if (m.twoD) {
    const alpha = ((s.tL - s.tR) * DRONE.armL - DRONE.angDamping * s.om) / DRONE.inertia
    s.om += alpha * DT
    s.th += s.om * DT
  }
  s.x += s.vx * DT
  s.z += s.vz * DT
  s.t += DT
  s.steps++

  // ── ground, ceiling, edges ──
  if (s.z < 0) {
    const impact = -s.vz
    s.z = 0
    if (impact > 3 && s.t > 0.5) {
      s.outcome = 'crash'
      s.crashReason = `hit the ground at ${impact.toFixed(1)} m/s`
    } else {
      if (impact > 0.6 && s.t > 0.5) s.events.push({ kind: 'touchdown' })
      s.vz = 0
      if (m.twoD) {
        s.vx *= 0.8
        s.om *= 0.5
        s.th *= 0.9
      }
    }
  }
  if (s.z > m.ceiling) {
    s.outcome = 'crash'
    s.crashReason = 'flew above Sky Port airspace'
  }
  if (Math.abs(s.th) > 70 * DEG) {
    s.outcome = 'crash'
    s.crashReason = 'tipped over'
  }
  if (m.twoD && (s.x < -0.5 || s.x > m.worldW + 0.5)) {
    s.outcome = 'crash'
    s.crashReason = 'was blown out of the course'
  }

  // ── objectives and metrics ──
  const errZ = s.target.z - s.z
  const errX = m.twoD ? s.target.x - s.x : 0
  const err = Math.hypot(errZ, errX)
  const inBand = m.twoD ? err <= m.wpRadius : Math.abs(errZ) <= m.band
  if (inBand && !s.inBand) s.events.push({ kind: 'band-enter' })
  s.inBand = inBand
  if (!inBand) s.lastOutside = s.t
  s.iae += err * DT
  // Overshoot: how far past the target, in the direction the drone was sent.
  const past = m.twoD ? -(Math.abs(errX) >= Math.abs(errZ) ? errX : errZ) * s.stepDir : -errZ * s.stepDir
  if (s.t - s.stepTime > 0.3 && past > s.overshoot) s.overshoot = past

  if (m.tier === 0) {
    if (inBand) s.hold += DT
    else s.hold = Math.max(0, s.hold - DT * 0.5)
    const need = s.phase === 0 ? 4 : 6
    if (s.hold >= need) {
      s.events.push({ kind: 'hold-done', phase: s.phase })
      if (s.phase === 0) {
        s.phase = 1
        s.hold = 0
        s.payload = CADET_PAYLOAD
        s.events.push({ kind: 'payload-on', mass: CADET_PAYLOAD })
      } else {
        s.outcome = 'complete'
      }
    }
  } else if (m.twoD) {
    if (inBand) s.hold += DT
    else s.hold = Math.max(0, s.hold - DT * 2)
    if (s.hold >= m.wpHold) {
      const wp = m.waypoints[s.wpIndex]
      s.wpTimes.push(s.t)
      s.events.push({ kind: 'waypoint', index: s.wpIndex })
      if (wp.drop) {
        s.events.push({ kind: 'payload-off', mass: s.payload })
        s.payload = 0
      }
      s.wpIndex++
      s.hold = 0
      if (s.wpIndex >= m.waypoints.length) {
        s.outcome = 'complete'
      } else {
        const nx = m.waypoints[s.wpIndex]
        setTarget(s, nx.z, nx.x)
      }
    }
  }

  if (s.outcome === 'flying' && s.t >= m.duration) {
    s.outcome = m.tier === 1 || m.tier === 2 ? 'complete' : 'timeout'
  }

  if (s.steps % LOG_EVERY === 0 || s.outcome !== 'flying') {
    s.log.push({
      t: s.t,
      z: s.z,
      zt: s.target.z,
      x: s.x,
      xt: s.target.x,
      thrust: T,
      weight: mass * G,
      p: s.p,
      i: s.i,
      d: s.d,
      tilt: s.th / DEG,
      wind: m.twoD ? w.vx : w.vz,
    })
  }
}

/** Run a whole flight with no one watching (used by the flight predictor). */
export function simulate(mission: Mission, gains: Gains, until?: number): SimState {
  const s = createSim(mission, gains)
  const end = until ?? mission.duration
  while (s.outcome === 'flying' && s.t < end) stepSim(s, 0)
  return s
}

// ── Scoring and the "why it happened" debrief ──────────────────────────────

export interface FlightReport {
  stars: number
  score: number
  scoreLabel: string
  lowerIsBetter: boolean
  message: string
  /** Shown as chips under the game. */
  stats: { label: string; value: string }[]
}

function meanAbsErrorLast(s: SimState, seconds: number): number {
  const from = s.t - seconds
  const rows = s.log.filter((r) => r.t >= from)
  if (!rows.length) return 99
  return rows.reduce((a, r) => a + Math.abs(r.zt - r.z), 0) / rows.length
}

function meanSignedErrorLast(s: SimState, seconds: number): number {
  const from = s.t - seconds
  const rows = s.log.filter((r) => r.t >= from)
  if (!rows.length) return 0
  return rows.reduce((a, r) => a + (r.zt - r.z), 0) / rows.length
}

/** Count how many times the height crossed the target after the last step (wobbles). */
function crossings(s: SimState): number {
  const rows = s.log.filter((r) => r.t >= s.stepTime + 0.5)
  let n = 0
  for (let k = 1; k < rows.length; k++) {
    const a = rows[k - 1].zt - rows[k - 1].z
    const b = rows[k].zt - rows[k].z
    if (Math.abs(a) > 0.05 && Math.abs(b) > 0.05 && Math.sign(a) !== Math.sign(b)) n++
  }
  return n
}

function settleTime(s: SimState): number {
  return Math.max(0, s.lastOutside - s.stepTime)
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export function energyWh(s: SimState): number {
  return s.energyJ / 3600
}

export function scoreFlight(s: SimState): FlightReport {
  const m = s.mission
  const wh = energyWh(s)
  const sat = s.flightSteps ? s.satSteps / s.flightSteps : 0

  if (m.tier === 0) {
    const t = s.t
    const stats = [
      { label: 'Time', value: `${t.toFixed(1)} s` },
      { label: 'Energy', value: `${wh.toFixed(2)} Wh` },
    ]
    if (s.outcome === 'crash') {
      return {
        stars: 0,
        score: 0,
        scoreLabel: 'crashed',
        lowerIsBetter: true,
        stats,
        message: `Bump! The drone ${s.crashReason}. It fell because thrust was much smaller than weight for too long. Next time, push the throttle up gently before it drops too fast.`,
      }
    }
    if (s.outcome !== 'complete') {
      return {
        stars: 0,
        score: 0,
        scoreLabel: 'out of time',
        lowerIsBetter: true,
        stats,
        message: 'Time ran out. Look at the thrust gauge: the drone only stays still when the thrust bar sits right on the weight line. Find that throttle and leave it there.',
      }
    }
    const stars = t <= 30 ? 3 : t <= 45 ? 2 : 1
    return {
      stars,
      score: Math.round(t * 10) / 10,
      scoreLabel: 'seconds',
      lowerIsBetter: true,
      stats,
      message:
        stars === 3
          ? 'Perfect hovering! You found the throttle where thrust equals weight — and when the parcel made the drone heavier, you added just enough thrust to match.'
          : 'Mission done! The drone held still when thrust matched weight. The parcel made it heavier, so it needed more thrust. Find that spot faster for more stars.',
    }
  }

  if (m.tier === 1 || m.tier === 2) {
    const finalErr = meanAbsErrorLast(s, 3)
    const bias = meanSignedErrorLast(s, 3)
    const wob = crossings(s)
    const st = settleTime(s)
    const stats = [
      { label: 'Error area', value: `${s.iae.toFixed(1)} m·s` },
      { label: 'Overshoot', value: `${s.overshoot.toFixed(2)} m` },
      { label: 'Settle', value: `${st.toFixed(1)} s` },
      { label: 'Energy', value: `${wh.toFixed(2)} Wh` },
      { label: 'Final error', value: `${finalErr.toFixed(2)} m` },
    ]
    if (s.outcome === 'crash') {
      const why =
        s.crashReason.includes('airspace')
          ? 'The gains were so big that each correction overshot more than the last, until it shot out of the sky. Lower Kp, or add more D to calm it.'
          : 'The brain was too weak or too wild to catch it. Check the graph: did it wobble bigger and bigger (too much Kp, not enough D) or just sink (too little Kp)?'
      return { stars: 0, score: 0, scoreLabel: 'crashed', lowerIsBetter: false, stats, message: `The drone ${s.crashReason}. ${why}` }
    }
    const tol = m.tier === 1 ? 0.3 : 0.06
    const base = m.tier === 1 ? 1000 - 22 * s.iae - 350 * s.overshoot - 6 * st - 40 * wh : 1000 - 30 * s.iae - 450 * s.overshoot - 8 * st - 40 * wh
    const score = Math.round(clamp(base, 0, 1000))
    let message: string
    if (finalErr > tol) {
      if (bias > 0.08 && m.tier === 1)
        message = `It hovered ${bias.toFixed(2)} m too low. With P only, the brain needs an error to make extra thrust — the heavier parcel needed ${(PILOT_PAYLOAD * G).toFixed(1)} N more, so it sagged until Kp × error matched that. Raise Kp to shrink the sag.`
      else if (bias > 0.06) message = `It ended ${bias.toFixed(2)} m too low: the parcel and the noisy air left a steady error. That is the I term's job — it adds up the error over time and keeps pushing until it is gone.`
      else if (wob >= 4) message = `It kept wobbling around the target (${wob} swings). Too much Kp for the damping: every correction overshoots. Lower Kp or add more D.`
      else message = `The final height was ${finalErr.toFixed(2)} m off — not steady enough. Look at the graph to see whether it sags (more P or I) or swings (more D).`
      return { stars: 0, score, scoreLabel: 'flight score', lowerIsBetter: false, stats, message }
    }
    const t3 = m.tier === 1 ? 670 : 690
    const t2 = m.tier === 1 ? 630 : 620
    const stars = score >= t3 ? 3 : score >= t2 ? 2 : 1
    if (s.overshoot > 0.4) message = `Target held — but it overshot by ${s.overshoot.toFixed(2)} m after the step. Overshoot means too much push and too little braking: a touch more D (or a little less Kp) smooths it.`
    else if (st > 4) message = `Steady in the end, but it took ${st.toFixed(1)} s to settle. A slow settle means the brain reacts gently — more Kp makes it faster (watch the overshoot).`
    else if (sat > 0.15) message = `Great hold, but the motors were maxed out ${Math.round(sat * 100)}% of the time — the brain asked for more than the motors could give. Gentler gains save energy.`
    else if (m.tier === 1) message = `Rock-steady! Kp = ${s.gains.kp.toFixed(0)} was strong enough to fight the parcel (sag = extra weight ÷ Kp) but not so strong that the motor lag made it ring.`
    else message = `Pro tuning: P pushed toward the target, I cancelled the parcel's extra weight, and D braked the overshoot — even through the downdraft.`
    return { stars, score, scoreLabel: 'flight score', lowerIsBetter: false, stats, message }
  }

  // Legend
  const done = s.wpIndex
  const total = m.waypoints.length
  const stats = [
    { label: 'Waypoints', value: `${done}/${total}` },
    { label: 'Time', value: `${s.t.toFixed(1)} s` },
    { label: 'Error area', value: `${s.iae.toFixed(1)} m·s` },
    { label: 'Energy', value: `${wh.toFixed(2)} Wh` },
    { label: 'Battery', value: `${s.volts.toFixed(1)} V` },
  ]
  if (s.outcome !== 'complete') {
    let why: string
    if (s.crashReason.includes('tipped')) why = 'The inner tilt loop could not hold the angle: too much Kp_tilt with too little Kd_tilt makes it flip-flop. The inner loop must be fast AND damped before the outer loop can trust it.'
    else if (s.crashReason.includes('blown')) why = 'The gusts pushed it sideways faster than the position loop could lean into them. More Kp_x (and Kd_x to stop the swing) fights wind harder.'
    else if (s.volts < 14.2)
      why = `The battery sagged to ${s.volts.toFixed(1)} V — too weak to hold the drone up. Wobbling wastes energy: a smoother brain finishes the course on one charge. Watch the sideways swing first (Kd_x calms it).`
    else if (s.crashReason) why = 'Height control failed. With a sagging battery and a parcel drop, the height brain needs I to keep up.'
    else if (Math.abs(meanSignedErrorLast(s, 3)) > m.wpRadius * 0.6)
      why = `It hung ${Math.abs(meanSignedErrorLast(s, 3)).toFixed(2)} m ${meanSignedErrorLast(s, 3) > 0 ? 'below' : 'above'} the waypoint. The hover guess was wrong (the parcel dropped and the battery sagged), and P alone leaves a steady error. Only the I term adds up that error and removes it.`
    else if (sat > 0.35) why = `The motors were maxed out ${Math.round(sat * 100)}% of the flight — the brain kept asking for the impossible. Calmer gains fly cleaner.`
    else why = 'It was too slow to settle at each waypoint. Each waypoint needs a 1.2-second steady hold: tune for less swinging, not just more speed.'
    return {
      stars: 0,
      score: 0,
      scoreLabel: 'flight score',
      lowerIsBetter: false,
      stats,
      message: `${s.outcome === 'crash' ? `The drone ${s.crashReason}.` : `Time up after ${done} of ${total} waypoints.`} ${why}`,
    }
  }
  const score = Math.round(clamp(1000 - 7 * s.t - 4 * s.iae - 150 * s.overshoot - 25 * wh, 0, 1000))
  const stars = score >= 580 ? 3 : score >= 520 ? 2 : 1
  let message: string
  if (s.overshoot > 0.6) message = `Course complete! Your biggest overshoot was ${s.overshoot.toFixed(2)} m — the outer loop is pushing harder than it can brake. More Kd_x (or slightly less Kp_x) makes the arrivals clean.`
  else if (sat > 0.45) message = 'Course complete! The motors spent a lot of time maxed out, which wastes the battery. Softer inner-loop gains keep the motors in their happy range.'
  else message = `Legendary flying! The fast inner loop held the tilt, the slower outer loop chose the tilt, and I kept the height as the battery sagged to ${s.volts.toFixed(1)} V and the parcel dropped.`
  return { stars, score, scoreLabel: 'flight score', lowerIsBetter: false, stats, message }
}
