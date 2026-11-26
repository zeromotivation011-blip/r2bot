// components/kids/games/ocean-rescue/dive.ts
// Cadet and Pilot: a piloted ROV (remotely operated vehicle) in a side view of
// the sea. A real force model, stepped 60 times a second:
//
//   buoyancy  = ρ · V · g                       (Archimedes: weight of water pushed aside)
//   weight    = (dry mass + ballast water) · g  (+ the buoy's weight in water once grabbed)
//   thrust    = joystick × thruster limit, with a short spin-up lag
//   drag      = ½ · ρ · CdA · |v_rel| · v_rel    (v_rel = robot velocity − water current)
//   tether    = ½ · ρ · Cd · d · (length in the current) · |u|·u, half of it felt by the robot
//   inertia   = mass × 1.5 ("added mass": the water the robot has to shove along with it)
//
// The buoy's acoustic transponder answers each sonar ping; the range is
// (round-trip time × 1,500 m/s) ÷ 2. Pure: no React, no DOM.

import { RHO, G, clamp, echoTime, pressureAtm } from './physics'

export const DIVE_DT = 1 / 60

export interface Rock {
  x: number
  z: number
  r: number
}

export interface CurrentLayer {
  /** Depth range in metres. */
  top: number
  bottom: number
  /** Horizontal water speed, m/s (+ = away from the ship, − = toward it). */
  u: number
}

export interface DiveLevel {
  tier: 0 | 1
  name: string
  width: number
  /** Seabed as [x, depth] points, x increasing. */
  seabed: [number, number][]
  rocks: Rock[]
  shipX: number
  start: { x: number; z: number }
  buoy: { x: number; z: number; wetWeightN: number; massKg: number }
  /** The search box shown on the chart (Pilot): where the buoy was last heard. */
  searchZone?: { x0: number; x1: number }
  currents: CurrentLayer[]
  tetherLen: number
  sonarRange: number
  /** Cadet: the ping also gives direction. Pilot: range only (find it with circles). */
  sonarBearing: boolean
  timeLimit: number
  rov: {
    dryMass: number
    /** Volume of the robot in m³ (sets its buoyancy). */
    volume: number
    ballastMaxL: number
    ballastStartL: number
    /** Litres per second the pump can move. */
    pumpRate: number
    autoTrim: boolean
    hThrust: number
    vThrust: number
  }
  /** Seconds holding still beside the buoy to latch it. */
  latchHold: number
  /** Max speed (m/s) for the gripper to latch. */
  latchSpeed: number
  water: 'coastal'
}

export const DIVE_LEVELS: Record<0 | 1, DiveLevel> = {
  0: {
    tier: 0,
    name: 'Harbour rescue',
    width: 80,
    seabed: [
      [0, 7],
      [12, 9],
      [22, 13],
      [32, 17],
      [42, 19.5],
      [50, 21],
      [58, 21.5],
      [66, 20.5],
      [80, 18],
    ],
    rocks: [
      { x: 36, z: 16.8, r: 2 },
      { x: 64, z: 19.6, r: 1.6 },
    ],
    shipX: 8,
    start: { x: 8, z: 0.6 },
    buoy: { x: 54, z: 20.85, wetWeightN: 12, massKg: 2.5 },
    currents: [{ top: 0, bottom: 6, u: 0.08 }],
    tetherLen: 120,
    sonarRange: 90,
    sonarBearing: true,
    timeLimit: 300,
    rov: { dryMass: 11, volume: 0.0122, ballastMaxL: 3, ballastStartL: 1.47, pumpRate: 1, autoTrim: true, hThrust: 40, vThrust: 30 },
    latchHold: 1,
    latchSpeed: 0.6,
    water: 'coastal',
  },
  1: {
    tier: 1,
    name: 'Shelf-edge rescue',
    width: 124,
    seabed: [
      [0, 9],
      [15, 13],
      [30, 19],
      [45, 25],
      [60, 29.5],
      [75, 33],
      [90, 36],
      [100, 37],
      [112, 35.5],
      [124, 33],
    ],
    rocks: [
      { x: 52, z: 26.5, r: 3 },
      { x: 83, z: 33.6, r: 2.4 },
      { x: 107, z: 35.2, r: 2 },
    ],
    shipX: 10,
    start: { x: 10, z: 0.6 },
    buoy: { x: 96, z: 36.15, wetWeightN: 12, massKg: 2.5 },
    searchZone: { x0: 72, x1: 118 },
    currents: [
      { top: 5, bottom: 22, u: -0.35 },
      { top: 22, bottom: 60, u: -0.08 },
    ],
    tetherLen: 112,
    sonarRange: 45,
    sonarBearing: false,
    timeLimit: 330,
    rov: { dryMass: 11, volume: 0.0122, ballastMaxL: 3, ballastStartL: 2.6, pumpRate: 0.2, autoTrim: false, hThrust: 40, vThrust: 12 },
    latchHold: 1.5,
    latchSpeed: 0.3,
    water: 'coastal',
  },
}

// Hydrodynamic constants of our little ROV (about the size of a carry-on suitcase).
const CDA_X = 0.04 // m², drag coefficient × frontal area, sideways travel
const CDA_Z = 0.06 // m², up/down travel (flatter face)
const LIN_DAMP = 2 // N per m/s, a little linear damping at very low speed
const ADDED_MASS = 1.5
const THRUST_LAG = 0.15 // s
const TETHER_CD = 1.2
const TETHER_D = 0.0076 // m (7.6 mm tether, typical for small ROVs)
const ROV_R = 0.45 // m, collision radius
const PING_COOLDOWN = 1.6

export interface Ping {
  t: number
  x: number
  z: number
  /** Range to the transponder, or null when it was out of range. */
  range: number | null
  /** Direction to the buoy (radians, screen frame: +x right, +z down) when the sonar gives bearing. */
  bearing: number | null
  echoS: number | null
}

export type DiveEvent =
  | { kind: 'ping'; ping: Ping }
  | { kind: 'bump'; speed: number }
  | { kind: 'latched' }
  | { kind: 'taut' }
  | { kind: 'surface' }
  | { kind: 'delivered' }
  | { kind: 'seen' }

export interface DiveState {
  level: DiveLevel
  t: number
  x: number
  z: number
  vx: number
  vz: number
  /** Actual thrust (after spin-up lag), N. */
  th: number
  tv: number
  ballastL: number
  ballastTargetL: number
  attached: boolean
  holdS: number
  pings: Ping[]
  lastPingT: number
  bumps: number
  hardestBump: number
  tautS: number
  taut: boolean
  maxTetherDrag: number
  tetherDrag: number
  netBuoyN: number
  /** Most negative net buoyancy seen with the buoy on (N). */
  heaviestWithBuoy: number
  /** Seconds the up-thrusters were flat out while still sinking/stuck. */
  vSatS: number
  timeInCurrent: number
  seenBuoy: boolean
  maxDepth: number
  outcome: 'diving' | 'won' | 'timeout'
  events: DiveEvent[]
}

export interface DiveInput {
  /** −1..1 left/right. */
  h: number
  /** −1..1, +1 = up. */
  v: number
}

export function seabedAt(level: DiveLevel, x: number): number {
  const s = level.seabed
  if (x <= s[0][0]) return s[0][1]
  for (let i = 1; i < s.length; i++) {
    if (x <= s[i][0]) {
      const [x0, z0] = s[i - 1]
      const [x1, z1] = s[i]
      return z0 + ((z1 - z0) * (x - x0)) / (x1 - x0)
    }
  }
  return s[s.length - 1][1]
}

export function currentAt(level: DiveLevel, z: number): number {
  for (const c of level.currents) if (z >= c.top && z < c.bottom) return c.u
  return 0
}

export function createDive(level: DiveLevel): DiveState {
  return {
    level,
    t: 0,
    x: level.start.x,
    z: level.start.z,
    vx: 0,
    vz: 0,
    th: 0,
    tv: 0,
    ballastL: level.rov.ballastStartL,
    ballastTargetL: level.rov.ballastStartL,
    attached: false,
    holdS: 0,
    pings: [],
    lastPingT: -99,
    bumps: 0,
    hardestBump: 0,
    tautS: 0,
    taut: false,
    maxTetherDrag: 0,
    tetherDrag: 0,
    netBuoyN: 0,
    heaviestWithBuoy: 0,
    vSatS: 0,
    timeInCurrent: 0,
    seenBuoy: false,
    maxDepth: 0,
    outcome: 'diving',
    events: [],
  }
}

/** Net upward force from buoyancy minus weight (N). Positive floats up. */
export function netBuoyancy(level: DiveLevel, ballastL: number, attached: boolean): number {
  const r = level.rov
  const displaced = RHO * r.volume
  const mass = r.dryMass + (ballastL / 1000) * RHO
  return (displaced - mass) * G - (attached ? level.buoy.wetWeightN : 0)
}

/** Ballast (litres) that makes the robot exactly neutral. */
export function neutralBallast(level: DiveLevel, attached: boolean): number {
  const r = level.rov
  const extra = attached ? level.buoy.wetWeightN / G : 0
  return ((RHO * r.volume - r.dryMass - extra) / RHO) * 1000
}

/** Length of a straight tether from the ship (x, 0) to the robot that lies inside the layer [a, b). */
function tetherInLayer(len: number, depth: number, a: number, b: number): number {
  if (depth <= 0.01) return 0
  const lo = Math.max(0, a)
  const hi = Math.min(depth, b)
  if (hi <= lo) return 0
  return (len * (hi - lo)) / depth
}

export function tetherLength(s: DiveState): number {
  return Math.hypot(s.x - s.level.shipX, s.z)
}

export function ping(s: DiveState): Ping | null {
  if (s.outcome !== 'diving' || s.t - s.lastPingT < PING_COOLDOWN || s.attached) return null
  s.lastPingT = s.t
  const L = s.level
  const d = Math.hypot(L.buoy.x - s.x, L.buoy.z - s.z)
  const inRange = d <= L.sonarRange
  const p: Ping = {
    t: s.t,
    x: s.x,
    z: s.z,
    range: inRange ? d : null,
    bearing: inRange && L.sonarBearing ? Math.atan2(L.buoy.z - s.z, L.buoy.x - s.x) : null,
    echoS: inRange ? echoTime(d) : null,
  }
  s.pings.push(p)
  s.events.push({ kind: 'ping', ping: p })
  return p
}

export function stepDive(s: DiveState, input: DiveInput): void {
  if (s.outcome !== 'diving') return
  const L = s.level
  const R = L.rov
  const dt = DIVE_DT
  s.t += dt

  // Ballast pump (auto-trim on Cadet: the robot keeps itself neutral).
  if (R.autoTrim) s.ballastTargetL = clamp(neutralBallast(L, s.attached) + 0.05, 0, R.ballastMaxL)
  const dB = s.ballastTargetL - s.ballastL
  const stepB = R.pumpRate * dt
  s.ballastL = Math.abs(dB) <= stepB ? s.ballastTargetL : s.ballastL + Math.sign(dB) * stepB

  // Thrusters spin up with a short lag.
  const cmdH = clamp(input.h, -1, 1) * R.hThrust
  const cmdV = -clamp(input.v, -1, 1) * R.vThrust // +z is down
  const k = dt / (THRUST_LAG + dt)
  s.th += (cmdH - s.th) * k
  s.tv += (cmdV - s.tv) * k

  // Forces (z down).
  const net = netBuoyancy(L, s.ballastL, s.attached)
  s.netBuoyN = net
  if (s.attached) s.heaviestWithBuoy = Math.min(s.heaviestWithBuoy, net)
  const fBuoyZ = -net

  const uc = currentAt(L, s.z)
  if (Math.abs(uc) > 0.15) s.timeInCurrent += dt
  const rvx = s.vx - uc
  const rvz = s.vz
  const fdx = -0.5 * RHO * CDA_X * Math.abs(rvx) * rvx - LIN_DAMP * rvx
  const fdz = -0.5 * RHO * CDA_Z * Math.abs(rvz) * rvz - LIN_DAMP * rvz

  // Tether: drag of the part that hangs in moving water; taut when paid out.
  const len = tetherLength(s)
  let ftx = 0
  for (const c of L.currents) {
    const inLayer = tetherInLayer(len, s.z, c.top, c.bottom)
    ftx += 0.5 * 0.5 * RHO * TETHER_CD * TETHER_D * inLayer * Math.abs(c.u) * c.u
  }
  let ftz = 0
  if (len > L.tetherLen) {
    const over = len - L.tetherLen
    const nx = (s.x - L.shipX) / len
    const nz = s.z / len
    const pull = 400 * over + 60 * Math.max(0, s.vx * nx + s.vz * nz)
    ftx -= pull * nx
    ftz -= pull * nz
    if (!s.taut) s.events.push({ kind: 'taut' })
    s.taut = true
    s.tautS += dt
  } else s.taut = false
  s.tetherDrag = Math.abs(ftx)
  s.maxTetherDrag = Math.max(s.maxTetherDrag, s.tetherDrag)

  const mass = (R.dryMass + (s.ballastL / 1000) * RHO + (s.attached ? L.buoy.massKg : 0)) * ADDED_MASS
  const ax = (s.th + fdx + ftx) / mass
  const az = (s.tv + fBuoyZ + fdz + ftz) / mass
  s.vx += ax * dt
  s.vz += az * dt

  // Up-thrusters flat out but still sinking: the robot is too heavy for them.
  if (input.v > 0.9 && s.vz > -0.02 && s.z > 1) s.vSatS += dt

  s.x += s.vx * dt
  s.z += s.vz * dt

  // Surface: a robot cannot fly.
  if (s.z < 0.3) {
    if (s.vz < 0) s.vz = 0
    s.z = 0.3
  }
  // Side walls of the map.
  if (s.x < 1) {
    s.x = 1
    if (s.vx < 0) s.vx = 0
  }
  if (s.x > L.width - 1) {
    s.x = L.width - 1
    if (s.vx > 0) s.vx = 0
  }
  // Seabed.
  const bed = seabedAt(L, s.x) - ROV_R
  if (s.z > bed) {
    const impact = s.vz
    s.z = bed
    if (s.vz > 0) s.vz = 0
    s.vx *= 0.9
    if (impact > 0.45) bump(s, impact)
  }
  // Rocks.
  for (const r of L.rocks) {
    const dx = s.x - r.x
    const dz = s.z - r.z
    const d = Math.hypot(dx, dz)
    const minD = r.r + ROV_R
    if (d < minD && d > 1e-6) {
      const nx = dx / d
      const nz = dz / d
      const vn = s.vx * nx + s.vz * nz
      s.x = r.x + nx * minD
      s.z = r.z + nz * minD
      if (vn < 0) {
        s.vx -= vn * nx
        s.vz -= vn * nz
        if (-vn > 0.45) bump(s, -vn)
      }
    }
  }
  s.maxDepth = Math.max(s.maxDepth, s.z)

  // Seeing the buoy: within reach of the robot's lights.
  const dBuoy = Math.hypot(L.buoy.x - s.x, L.buoy.z - s.z)
  if (!s.seenBuoy && dBuoy < 7) {
    s.seenBuoy = true
    s.events.push({ kind: 'seen' })
  }

  // Latch: hold still beside the buoy.
  if (!s.attached) {
    const speed = Math.hypot(s.vx, s.vz)
    if (dBuoy < 1.9 && speed < L.latchSpeed) {
      s.holdS += dt
      if (s.holdS >= L.latchHold) {
        s.attached = true
        s.events.push({ kind: 'latched' })
      }
    } else s.holdS = Math.max(0, s.holdS - dt * 2)
  }

  // Delivery at the ship.
  if (s.attached && s.z <= 1 && Math.abs(s.x - L.shipX) < 6) {
    s.outcome = 'won'
    s.events.push({ kind: 'delivered' })
    return
  }
  if (s.t >= L.timeLimit) s.outcome = 'timeout'
}

function bump(s: DiveState, speed: number) {
  s.bumps += 1
  s.hardestBump = Math.max(s.hardestBump, speed)
  s.events.push({ kind: 'bump', speed })
}

/** The buoy's position right now (it rides on the gripper once latched). */
export function buoyPos(s: DiveState): { x: number; z: number } {
  return s.attached ? { x: s.x + 0.2, z: s.z + 0.75 } : { x: s.level.buoy.x, z: s.level.buoy.z }
}

export interface DiveReport {
  won: boolean
  stars: number
  score: number
  scoreLabel: string
  lowerIsBetter: boolean
  message: string
  /** Why it happened: 2–4 short lines. */
  why: string[]
}

export function scoreDive(s: DiveState): DiveReport {
  const L = s.level
  const why: string[] = []
  const won = s.outcome === 'won'
  const pressure = pressureAtm(s.maxDepth)
  why.push(`Deepest point ${s.maxDepth.toFixed(1)} m — the water pressed on the robot at ${pressure.toFixed(1)} atmospheres (1 for the air, plus about 1 more every 10 m).`)

  if (L.tier === 1) {
    const neutral = neutralBallast(L, false)
    const startOff = netBuoyancy(L, L.rov.ballastStartL, false)
    if (s.vSatS > 3) {
      why.push(
        `For ${s.vSatS.toFixed(0)} s the up-thrusters were flat out and the robot still could not climb: it was heavier than its ${L.rov.vThrust} N of up-thrust. Pumping water OUT of the ballast tank makes it lighter.`,
      )
    } else if (s.attached) {
      why.push(`The buoy weighs ${L.buoy.wetWeightN} N in water. You pumped ballast out to stay close to neutral — that is exactly what real pilots do.`)
    } else {
      why.push(`Neutral buoyancy for this robot is ${neutral.toFixed(2)} L of ballast. The tank started at ${L.rov.ballastStartL} L, ${Math.abs(startOff).toFixed(1)} N heavy.`)
    }
    if (s.maxTetherDrag > 4)
      why.push(`The current dragged on the tether with up to ${s.maxTetherDrag.toFixed(0)} N — on real ROVs the long cable often feels more push than the robot itself. Flying below the current layer helps.`)
    if (s.tautS > 0.5) why.push(`The tether ran out (${L.tetherLen} m) for ${s.tautS.toFixed(1)} s and held the robot back.`)
  }

  const goodPings = s.pings.filter((p) => p.range !== null).length
  if (!s.attached) {
    if (s.pings.length === 0) why.push('You never pinged. In the dark the sonar is the only way to know where the buoy is.')
    else if (goodPings === 0) why.push(`None of your ${s.pings.length} pings were in range (${L.sonarRange} m). Move toward the search zone and ping again.`)
    else if (!L.sonarBearing && goodPings < 3) why.push('One ping only gives a distance — a circle. Ping from two or three places: the buoy sits where the circles cross.')
  } else if (!L.sonarBearing) {
    why.push(`You found it with ${goodPings} range pings — the circles crossed at the buoy. That is trilateration, used by real ocean navigation.`)
  }
  if (s.bumps > 0) why.push(`${s.bumps} hard bump${s.bumps > 1 ? 's' : ''} on rocks or the seabed (hardest ${s.hardestBump.toFixed(1)} m/s). Slow down near the bottom — the robot keeps sliding after you let go.`)

  if (!won) {
    const msg = !s.attached
      ? 'Time ran out before the buoy was found.'
      : 'Time ran out before the buoy reached the ship.'
    return { won, stars: 0, score: 0, scoreLabel: 'points', lowerIsBetter: false, message: `${msg} ${why[1] ?? ''}`.trim(), why }
  }

  const time = s.t
  let stars = 1
  if (L.tier === 0) {
    if (time <= 130 && s.bumps <= 2) stars = 3
    else if (time <= 210) stars = 2
  } else {
    if (time <= 170 && s.bumps <= 1 && s.tautS < 2) stars = 3
    else if (time <= 250 && s.bumps <= 4) stars = 2
  }
  const score = Math.max(100, Math.round(1000 - time * 2 - s.bumps * 25 - s.tautS * 10))
  const message =
    L.tier === 0
      ? `Buoy rescued in ${time.toFixed(0)} s! The sonar ping told you which way to go, and the lights showed its true colour up close.`
      : `Buoy rescued in ${time.toFixed(0)} s! You trimmed the robot near neutral, pumped ballast out for the extra weight, and found the buoy by its sonar circles.`
  return { won, stars, score, scoreLabel: 'points', lowerIsBetter: false, message, why }
}
