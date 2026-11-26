// components/kids/games/ocean-rescue/survey.ts
// Ace and Legend: an AUV (autonomous underwater vehicle) seen from above. Once
// it dives, radio and GPS stop working (radio waves die within metres in
// seawater), so the child programs the mission before launch and the robot
// navigates by itself:
//
//   - Dead reckoning: it adds up its own speed and heading to guess where it is.
//   - DVL (Doppler velocity log): sonar beams bounce off the seabed and measure
//     speed over the ground. Works only close enough to the bottom ("bottom
//     lock", 30 m here). Without it the robot only knows its speed THROUGH the
//     water, so a current carries it away without it noticing.
//   - The ship's acoustic tracker (USBL) can hear it and send position fixes
//     while it is within 200 m.
//   - Depth comes from a pressure sensor and height above the seabed from an
//     altimeter (a downward sonar), so those are always right.
//
// Energy: hotel load (computer, sensors) + propulsion. Propulsion power is
// drag × speed ÷ efficiency = ½·ρ·CdA·v³ ÷ η, so going twice as fast costs
// eight times the power. Pure, deterministic: the same plan always flies the
// same way.

import { RHO, clamp, rng } from './physics'

export const SURVEY_DT = 0.5 // s of simulated time per step

export interface Pinnacle {
  x: number
  y: number
  /** How far it rises above the base seabed (m). */
  h: number
  /** Width (Gaussian sigma, m). */
  s: number
}

export interface SurveyLevel {
  tier: 2 | 3
  name: string
  width: number
  height: number
  ship: { x: number; y: number }
  baseDepth: number
  /** Seabed gets deeper by this many metres per metre of x. */
  slopeX: number
  pinnacles: Pinnacle[]
  /** Current at 40 m+ above the seabed (m/s, x east, y north). Slower near the bottom. */
  current: { x: number; y: number }
  batteryWh: number
  timeLimit: number
  hotelW: number
  /** Ace: the lost lander with an acoustic transponder. */
  buoy?: { x: number; y: number }
  searchArea?: { x: number; y: number; r: number }
  transponderRange?: number
  /** Legend: the box to map. */
  box?: { x0: number; y0: number; x1: number; y1: number }
  seed: number
}

export const DVL_MAX_ALT = 30
export const USBL_RANGE = 200
export const CLIMB_RATE = 0.5 // m/s
const CDA = 0.012 // m²
const PROP_EFF = 0.4
const PING_WH = 0.02
export const BEAM_DEG = 1.5
/** Multibeam fan: 120°, so the swath is 2·tan(60°) ≈ 3.46 × altitude wide. */
export const SWATH_PER_ALT = 2 * Math.tan((60 * Math.PI) / 180)
export const SWATH_MAX = 160
/** Survey order: seabed detail of 1 m or better. Beam footprint ≈ altitude × 2·tan(beam/2). */
export const DETAIL_M = 1
export const CELL = 10
/** Map data placed with a position error above this is "smeared". */
export const SMEAR_M = 8

export const SURVEY_LEVELS: Record<2 | 3, SurveyLevel> = {
  2: {
    tier: 2,
    name: 'Canyon search',
    width: 600,
    height: 450,
    ship: { x: 70, y: 70 },
    baseDepth: 105,
    slopeX: 0.04,
    pinnacles: [
      { x: 380, y: 300, h: 26, s: 22 },
      { x: 480, y: 235, h: 22, s: 18 },
      { x: 250, y: 160, h: 18, s: 25 },
      { x: 330, y: 380, h: 15, s: 30 },
    ],
    current: { x: 0.2, y: -0.25 },
    batteryWh: 50,
    timeLimit: 3600,
    hotelW: 25,
    buoy: { x: 455, y: 196 },
    searchArea: { x: 400, y: 280, r: 130 },
    transponderRange: 70,
    seed: 7,
  },
  3: {
    tier: 3,
    name: 'Reef mapping',
    width: 800,
    height: 560,
    ship: { x: 70, y: 70 },
    baseDepth: 45,
    slopeX: 0.004,
    pinnacles: [
      { x: 300, y: 260, h: 19, s: 14 },
      { x: 420, y: 380, h: 20, s: 16 },
      { x: 560, y: 230, h: 18, s: 12 },
      { x: 640, y: 420, h: 17, s: 18 },
      { x: 250, y: 420, h: 15, s: 20 },
      { x: 480, y: 300, h: 12, s: 25 },
    ],
    current: { x: 0, y: 0.3 },
    batteryWh: 60,
    timeLimit: 3600,
    hotelW: 35,
    box: { x0: 180, y0: 160, x1: 720, y1: 480 },
    seed: 11,
  },
}

export interface AcePlan {
  waypoints: [number, number][]
  altitude: number
  speed: number
  pingEvery: number
  /** Battery % at which it gives up searching and comes home. */
  returnAt: number
}

export interface LegendPlan {
  direction: 'ew' | 'ns'
  spacing: number
  altitude: number
  speed: number
}

export const DEFAULT_ACE: AcePlan = { waypoints: [[400, 280]], altitude: 45, speed: 1.6, pingEvery: 30, returnAt: 15 }
export const DEFAULT_LEGEND: LegendPlan = { direction: 'ew', spacing: 120, altitude: 40, speed: 1.8 }

export function seabedDepth(L: SurveyLevel, x: number, y: number): number {
  let d = L.baseDepth + L.slopeX * x
  for (const p of L.pinnacles) {
    const r2 = (x - p.x) ** 2 + (y - p.y) ** 2
    d -= p.h * Math.exp(-r2 / (2 * p.s * p.s))
  }
  return d
}

/** Current at a height above the seabed: slower near the bottom (the bottom boundary layer). */
export function currentAt(L: SurveyLevel, alt: number): { x: number; y: number } {
  const f = 0.4 + 0.6 * clamp(alt / 40, 0, 1)
  return { x: L.current.x * f, y: L.current.y * f }
}

export function swathWidth(alt: number): number {
  return Math.min(SWATH_MAX, Math.max(0, alt) * SWATH_PER_ALT)
}

export function footprint(alt: number): number {
  return alt * 2 * Math.tan(((BEAM_DEG / 2) * Math.PI) / 180)
}

export function propPower(speed: number): number {
  return (0.5 * RHO * CDA * speed ** 3) / PROP_EFF
}

/** The lawn-mower route for a Legend plan (without the trip out and back). */
export function legendLines(L: SurveyLevel, p: LegendPlan): [number, number][] {
  const b = L.box
  if (!b) return []
  const pts: [number, number][] = []
  const s = Math.max(5, p.spacing)
  if (p.direction === 'ew') {
    const n = Math.max(1, Math.ceil((b.y1 - b.y0) / s))
    for (let k = 0; k < n; k++) {
      const y = Math.min(b.y0 + s / 2 + k * s, b.y1 + s / 2)
      const a: [number, number] = [b.x0, y]
      const c: [number, number] = [b.x1, y]
      if (k % 2 === 0) pts.push(a, c)
      else pts.push(c, a)
    }
  } else {
    const n = Math.max(1, Math.ceil((b.x1 - b.x0) / s))
    for (let k = 0; k < n; k++) {
      const x = Math.min(b.x0 + s / 2 + k * s, b.x1 + s / 2)
      const a: [number, number] = [x, b.y0]
      const c: [number, number] = [x, b.y1]
      if (k % 2 === 0) pts.push(a, c)
      else pts.push(c, a)
    }
  }
  return pts
}

export function routeLength(start: { x: number; y: number }, pts: [number, number][], back = true): number {
  let len = 0
  let px = start.x
  let py = start.y
  for (const [x, y] of pts) {
    len += Math.hypot(x - px, y - py)
    px = x
    py = y
  }
  if (back) len += Math.hypot(start.x - px, start.y - py)
  return len
}

/** Calm-water estimate shown while planning (the real sea has a current…). */
export function planEstimate(L: SurveyLevel, pts: [number, number][], speed: number, pingEvery?: number): { lengthM: number; timeS: number; energyWh: number } {
  const lengthM = routeLength(L.ship, pts)
  const depth = L.baseDepth
  const timeS = lengthM / Math.max(0.1, speed) + depth / CLIMB_RATE // + the climb home
  const pings = pingEvery ? timeS / pingEvery : 0
  const energyWh = ((L.hotelW + propPower(speed)) * timeS) / 3600 + pings * PING_WH
  return { lengthM, timeS, energyWh }
}

export interface TrackPoint {
  t: number
  x: number
  y: number
  ex: number
  ey: number
  z: number
  bed: number
  lock: boolean
}

export interface SonarPing {
  t: number
  x: number
  y: number
  heard: boolean
}

export type SurveyEvent =
  | { kind: 'dive' }
  | { kind: 'lock'; on: boolean }
  | { kind: 'heard'; range: number }
  | { kind: 'marked' }
  | { kind: 'usbl' }
  | { kind: 'home' }
  | { kind: 'low-battery' }
  | { kind: 'crash' }
  | { kind: 'surfaced' }

export type SurveyPhase = 'search' | 'homing' | 'return' | 'ascend' | 'done'

export interface SurveyState {
  level: SurveyLevel
  ace?: AcePlan
  legend?: LegendPlan
  route: [number, number][]
  wp: number
  segFrom: [number, number]
  t: number
  /** True position. */
  x: number
  y: number
  z: number
  /** What the robot thinks. */
  ex: number
  ey: number
  heading: number
  groundSpeed: number
  lock: boolean
  usbl: boolean
  lastUsblT: number
  energyWh: number
  phase: SurveyPhase
  outcome: 'running' | 'won' | 'failed'
  failReason: '' | 'crash' | 'battery' | 'time' | 'not-found' | 'mark-off' | 'coverage' | 'far'
  minAlt: number
  lockFrac: number
  maxNavErr: number
  navErrAtMark: number
  track: TrackPoint[]
  pings: SonarPing[]
  lastPingT: number
  heardAt: number
  closeHeard: number
  buoyEst: { x: number; y: number; n: number } | null
  mark: { x: number; y: number } | null
  /** Legend coverage grid over the box: 0 none, 1 good, 2 smeared (nav error), 3 too coarse. */
  cover: Uint8Array
  coverCols: number
  coverRows: number
  surfacedDist: number
  events: SurveyEvent[]
  rand: () => number
  /** Small, fixed DVL scale and compass errors (real sensors are never perfect). */
  dvlScale: number
  compassErr: number
}

export function createSurvey(L: SurveyLevel, plan: { ace?: AcePlan; legend?: LegendPlan }): SurveyState {
  const route: [number, number][] = plan.ace ? plan.ace.waypoints.map((w) => [w[0], w[1]] as [number, number]) : plan.legend ? legendLines(L, plan.legend) : []
  const b = L.box
  const coverCols = b ? Math.ceil((b.x1 - b.x0) / CELL) : 0
  const coverRows = b ? Math.ceil((b.y1 - b.y0) / CELL) : 0
  const rand = rng(L.seed)
  return {
    level: L,
    ace: plan.ace,
    legend: plan.legend,
    route,
    wp: 0,
    segFrom: [L.ship.x, L.ship.y],
    t: 0,
    x: L.ship.x,
    y: L.ship.y,
    z: 0,
    ex: L.ship.x,
    ey: L.ship.y,
    heading: 0,
    groundSpeed: 0,
    lock: false,
    usbl: false,
    lastUsblT: -99,
    energyWh: 0,
    phase: 'search',
    outcome: 'running',
    failReason: '',
    minAlt: 999,
    lockFrac: 0,
    maxNavErr: 0,
    navErrAtMark: 0,
    track: [],
    pings: [],
    lastPingT: -999,
    heardAt: -1,
    closeHeard: 0,
    buoyEst: null,
    mark: null,
    cover: new Uint8Array(coverCols * coverRows),
    coverCols,
    coverRows,
    surfacedDist: 0,
    events: [],
    rand,
    dvlScale: 1.001,
    compassErr: (0.05 * Math.PI) / 180,
  }
}

function plan(s: SurveyState): { altitude: number; speed: number } {
  if (s.ace) return { altitude: s.ace.altitude, speed: s.ace.speed }
  if (s.legend) return { altitude: s.legend.altitude, speed: s.legend.speed }
  return { altitude: 20, speed: 1 }
}

export function batteryPct(s: SurveyState): number {
  return clamp(100 * (1 - s.energyWh / s.level.batteryWh), 0, 100)
}

export function navError(s: SurveyState): number {
  return Math.hypot(s.ex - s.x, s.ey - s.y)
}

/** The point the robot is steering for, in its own (estimated) coordinates. */
function target(s: SurveyState): [number, number] | null {
  const L = s.level
  if (s.phase === 'homing' && s.buoyEst) return [s.buoyEst.x, s.buoyEst.y]
  if (s.phase === 'return' || s.phase === 'ascend') return [L.ship.x, L.ship.y]
  if (s.phase === 'search') return s.route[s.wp] ?? null
  return null
}

function goHome(s: SurveyState) {
  s.phase = 'return'
  s.segFrom = [s.ex, s.ey]
  s.events.push({ kind: 'home' })
}

export function stepSurvey(s: SurveyState): void {
  if (s.outcome !== 'running') return
  const L = s.level
  const dt = SURVEY_DT
  const { altitude, speed } = plan(s)
  s.t += dt

  const bed = seabedDepth(L, s.x, s.y)
  const alt = bed - s.z
  const cur = currentAt(L, alt)

  // ── Navigation aids ──
  const wasLock = s.lock
  s.lock = s.z > 2 && alt <= DVL_MAX_ALT
  if (s.lock !== wasLock && s.z > 2) s.events.push({ kind: 'lock', on: s.lock })
  if (s.lock) s.lockFrac += dt
  const shipD = Math.hypot(s.x - L.ship.x, s.y - L.ship.y)
  s.usbl = shipD <= USBL_RANGE
  if (s.usbl && s.t - s.lastUsblT >= 20) {
    // The ship hears the robot's acoustic beacon and sends back where it is (±1 m).
    s.lastUsblT = s.t
    s.ex = s.x + (s.rand() - 0.5) * 2
    s.ey = s.y + (s.rand() - 0.5) * 2
    if (s.z > 2) s.events.push({ kind: 'usbl' })
  }

  // ── Guidance ──
  let tgt = target(s)
  if (s.phase === 'search' && tgt) {
    if (Math.hypot(tgt[0] - s.ex, tgt[1] - s.ey) < 6) {
      s.segFrom = tgt
      s.wp += 1
      tgt = target(s)
      if (!tgt) {
        goHome(s)
        tgt = target(s)
      }
    }
  } else if (s.phase === 'search' && !tgt) {
    goHome(s)
    tgt = target(s)
  }
  if (s.phase === 'return' && Math.hypot(L.ship.x - s.ex, L.ship.y - s.ey) < 8) {
    s.phase = 'ascend'
  }

  // Line-of-sight steering toward a point 20 m ahead on the current leg.
  let gx = 0
  let gy = 0
  let want = speed
  // Climbing home it holds station over the ship (the ship's tracker keeps fixing its position).
  if (s.phase === 'ascend') want = clamp(0.05 * Math.hypot(L.ship.x - s.ex, L.ship.y - s.ey), 0, speed)
  if (tgt && want > 0) {
    const [ax, ay] = s.phase === 'search' || s.phase === 'return' ? s.segFrom : [s.ex, s.ey]
    const sx = tgt[0] - ax
    const sy = tgt[1] - ay
    const sl = Math.hypot(sx, sy)
    let lx = tgt[0]
    let ly = tgt[1]
    if (sl > 1) {
      const ux = sx / sl
      const uy = sy / sl
      const along = clamp((s.ex - ax) * ux + (s.ey - ay) * uy, 0, sl)
      const ahead = Math.min(sl, along + 20)
      lx = ax + ux * ahead
      ly = ay + uy * ahead
    }
    const dx = lx - s.ex
    const dy = ly - s.ey
    const d = Math.hypot(dx, dy) || 1
    gx = dx / d
    gy = dy / d
  }
  // With bottom lock the robot can measure the current and crab into it; without, it thinks the water is still.
  const cEst = s.lock ? cur : { x: 0, y: 0 }
  let wx = 0
  let wy = 0
  if (want > 0 && (gx !== 0 || gy !== 0)) {
    const cPerp = -cEst.x * gy + cEst.y * gx // current across the wanted direction
    const perp = clamp(-cPerp, -want, want)
    const par = Math.sqrt(Math.max(0, want * want - perp * perp))
    // water velocity = par·g + perp·n, n = left normal (−gy, gx)
    wx = par * gx - perp * gy
    wy = par * gy + perp * gx
    s.heading = Math.atan2(wy, wx)
  }
  // True motion = through-the-water velocity + current.
  const vx = wx + cur.x
  const vy = wy + cur.y
  s.x += vx * dt
  s.y += vy * dt
  s.groundSpeed = Math.hypot(vx, vy)

  // Dead reckoning: DVL speed over ground when locked, else speed through water.
  const mvx = s.lock ? vx * s.dvlScale : wx * 1.01
  const mvy = s.lock ? vy * s.dvlScale : wy * 1.01
  const ce = Math.cos(s.compassErr)
  const se = Math.sin(s.compassErr)
  s.ex += (mvx * ce - mvy * se) * dt
  s.ey += (mvx * se + mvy * ce) * dt
  s.x = clamp(s.x, 0, L.width)
  s.y = clamp(s.y, 0, L.height)

  // ── Depth: hold the planned height above the seabed (altimeter), limited climb rate ──
  const bedNow = seabedDepth(L, s.x, s.y)
  const wantZ = s.phase === 'ascend' ? 0 : Math.max(0, bedNow - altitude)
  s.z += clamp(wantZ - s.z, -CLIMB_RATE * dt, CLIMB_RATE * dt)
  const altNow = bedNow - s.z
  if (s.z > 5) s.minAlt = Math.min(s.minAlt, altNow)
  if (s.t === dt) s.events.push({ kind: 'dive' })

  // ── Energy ──
  const pw = L.hotelW + propPower(Math.hypot(wx, wy))
  s.energyWh += (pw * dt) / 3600

  const err = navError(s)
  s.maxNavErr = Math.max(s.maxNavErr, err)

  // ── Sonar (Ace): interrogate the lost lander's transponder ──
  if (s.ace && L.buoy && L.transponderRange && s.z > 5 && s.phase !== 'return' && s.phase !== 'ascend' && !s.mark) {
    if (s.t - s.lastPingT >= s.ace.pingEvery) {
      s.lastPingT = s.t
      s.energyWh += PING_WH
      const r3 = Math.hypot(L.buoy.x - s.x, L.buoy.y - s.y, seabedDepth(L, L.buoy.x, L.buoy.y) - s.z)
      const heard = r3 <= L.transponderRange
      s.pings.push({ t: s.t, x: s.x, y: s.y, heard })
      if (heard) {
        s.events.push({ kind: 'heard', range: r3 })
        if (s.heardAt < 0) s.heardAt = s.t
        // Range + direction (USBL-style receiver) → buoy position in the robot's own map.
        const bx = s.ex + (L.buoy.x - s.x) + (s.rand() - 0.5) * 1.5
        const by = s.ey + (L.buoy.y - s.y) + (s.rand() - 0.5) * 1.5
        if (!s.buoyEst) s.buoyEst = { x: bx, y: by, n: 1 }
        else {
          const n = s.buoyEst.n + 1
          s.buoyEst = { x: (s.buoyEst.x * (n - 1) + bx) / n, y: (s.buoyEst.y * (n - 1) + by) / n, n }
        }
        if (s.phase === 'search') s.phase = 'homing'
        if (Math.hypot(L.buoy.x - s.x, L.buoy.y - s.y) <= 25) s.closeHeard += 1
        if (s.closeHeard >= 3) {
          s.mark = { x: s.buoyEst.x, y: s.buoyEst.y }
          s.navErrAtMark = err
          s.events.push({ kind: 'marked' })
          goHome(s)
        }
      }
    }
  }

  // ── Mapping (Legend) ──
  if (s.legend && L.box && s.z > 3 && s.phase === 'search') paintSwath(s, altNow, wx, wy)

  // ── Rules: battery reserve ──
  if (s.ace && (s.phase === 'search' || s.phase === 'homing') && batteryPct(s) < s.ace.returnAt) {
    s.events.push({ kind: 'low-battery' })
    goHome(s)
  }

  if (s.track.length === 0 || s.t - s.track[s.track.length - 1].t >= 4) {
    s.track.push({ t: s.t, x: s.x, y: s.y, ex: s.ex, ey: s.ey, z: s.z, bed: bedNow, lock: s.lock })
  }

  // ── Endings ──
  if (s.z > 3 && altNow < 1) {
    s.events.push({ kind: 'crash' })
    return fail(s, 'crash')
  }
  if (s.energyWh >= L.batteryWh) return fail(s, 'battery')
  if (s.t >= L.timeLimit) return fail(s, 'time')
  if (s.phase === 'ascend' && s.z <= 0.01 && s.t > 30) {
    s.phase = 'done'
    s.surfacedDist = Math.hypot(s.x - L.ship.x, s.y - L.ship.y)
    s.events.push({ kind: 'surfaced' })
    s.track.push({ t: s.t, x: s.x, y: s.y, ex: s.x, ey: s.y, z: 0, bed: bedNow, lock: false })
    judge(s)
  }
}

function fail(s: SurveyState, why: SurveyState['failReason']) {
  s.outcome = 'failed'
  s.failReason = why
  s.phase = 'done'
}

function paintSwath(s: SurveyState, alt: number, wx: number, wy: number) {
  const L = s.level
  const b = L.box
  if (!b) return
  const w = swathWidth(alt)
  const coarse = footprint(alt) > DETAIL_M
  const smeared = navError(s) > SMEAR_M
  const val = coarse ? 3 : smeared ? 2 : 1
  const h = Math.hypot(wx, wy) || 1
  // Across-track direction (the fan is sideways to the robot's body).
  const nx = -wy / h
  const ny = wx / h
  for (let o = -w / 2; o <= w / 2; o += CELL / 2) {
    // The sonar sees the TRUE seabed; with a bad position fix the map puts it in the wrong place.
    const px = s.x + nx * o
    const py = s.y + ny * o
    const c = Math.floor((px - b.x0) / CELL)
    const r = Math.floor((py - b.y0) / CELL)
    if (c < 0 || r < 0 || c >= s.coverCols || r >= s.coverRows) continue
    const i = r * s.coverCols + c
    const cur = s.cover[i]
    if (cur === 1) continue
    if (val === 1 || cur === 0 || (val === 2 && cur === 3)) s.cover[i] = val
  }
}

export function coverage(s: SurveyState): { good: number; smeared: number; coarse: number } {
  const n = s.cover.length || 1
  let g = 0
  let sm = 0
  let co = 0
  for (const v of s.cover) {
    if (v === 1) g++
    else if (v === 2) sm++
    else if (v === 3) co++
  }
  return { good: g / n, smeared: sm / n, coarse: co / n }
}

function judge(s: SurveyState) {
  const L = s.level
  if (s.ace && L.buoy) {
    if (!s.mark) return fail(s, 'not-found')
    const err = Math.hypot(s.mark.x - L.buoy.x, s.mark.y - L.buoy.y)
    if (err > 15) return fail(s, 'mark-off')
  }
  if (s.legend) {
    if (coverage(s).good < 0.9) return fail(s, 'coverage')
  }
  if (s.surfacedDist > 60) return fail(s, 'far')
  s.outcome = 'won'
}

/** Run a whole mission at once (tests, predictions). */
export function runSurvey(L: SurveyLevel, p: { ace?: AcePlan; legend?: LegendPlan }, maxSteps = 20000): SurveyState {
  const s = createSurvey(L, p)
  let n = 0
  while (s.outcome === 'running' && n++ < maxSteps) {
    stepSurvey(s)
    s.events.length = 0
  }
  return s
}

export interface SurveyReport {
  won: boolean
  /** One short sentence for the debrief card. */
  headline: string
  stars: number
  score: number
  scoreLabel: string
  message: string
  why: string[]
}

export function scoreSurvey(s: SurveyState): SurveyReport {
  const L = s.level
  const why: string[] = []
  const { altitude, speed } = plan(s)
  const batt = batteryPct(s)
  const lockPct = s.t > 0 ? (100 * s.lockFrac) / s.t : 0
  const fmtMin = (t: number) => `${Math.floor(t / 60)} min ${Math.round(t % 60)} s`

  if (altitude > DVL_MAX_ALT) {
    why.push(
      `It flew ${altitude} m above the seabed — too high for the DVL (it needs to be within ${DVL_MAX_ALT} m). So it only knew its speed through the water, and the current carried it up to ${s.maxNavErr.toFixed(0)} m from where it thought it was.`,
    )
  } else if (s.maxNavErr > 8) {
    why.push(
      `Its position guess drifted up to ${s.maxNavErr.toFixed(0)} m. That happens whenever it is more than ${DVL_MAX_ALT} m above the seabed — while diving far from the ship (beyond the ship's ${USBL_RANGE} m tracker), or where the seabed drops away faster than it can follow. Keep a margin below ${DVL_MAX_ALT} m, and dive close to the ship.`,
    )
  } else {
    why.push(`Bottom lock ${lockPct.toFixed(0)} % of the dive: the DVL measured speed over the seabed, so its position guess stayed within ${s.maxNavErr.toFixed(0)} m.`)
  }
  const pw = L.hotelW + propPower(speed)
  why.push(`At ${speed.toFixed(1)} m/s the robot used about ${pw.toFixed(0)} W (${L.hotelW} W for its computer and sensors + ${propPower(speed).toFixed(0)} W to push through the water). Twice the speed costs eight times the pushing power.`)
  if (s.failReason === 'crash' || s.minAlt < 4)
    why.push(
      `Lowest height above the seabed: ${Math.max(0, s.minAlt).toFixed(1)} m. It can only climb ${CLIMB_RATE} m/s, so at ${speed.toFixed(1)} m/s a steep rock rising faster than that catches it. Fly higher or slower near pinnacles.`,
    )

  if (s.ace && L.buoy) {
    const heard = s.pings.filter((p) => p.heard).length
    if (!s.buoyEst) {
      const gap = speed * s.ace.pingEvery
      why.push(
        `It never heard the transponder (range ${L.transponderRange} m). Between pings it travelled ${gap.toFixed(0)} m. Search lines need to pass within ${L.transponderRange} m of every part of the search area.`,
      )
    } else if (s.mark) {
      const err = Math.hypot(s.mark.x - L.buoy.x, s.mark.y - L.buoy.y)
      why.push(
        `It heard the lander ${heard} times and marked it ${err.toFixed(1)} m from its true spot. The mark is only as good as the robot's own position: its error then was ${s.navErrAtMark.toFixed(1)} m.`,
      )
    }
  }
  if (s.legend && L.box) {
    const c = coverage(s)
    const w = swathWidth(altitude)
    why.push(
      `Map: ${(c.good * 100).toFixed(0)} % sharp${c.smeared > 0.01 ? `, ${(c.smeared * 100).toFixed(0)} % smeared (position error over ${SMEAR_M} m)` : ''}${c.coarse > 0.01 ? `, ${(c.coarse * 100).toFixed(0)} % too blurry (beam spot ${footprint(altitude).toFixed(2)} m, needs ≤ ${DETAIL_M} m)` : ''}. Swath ${w.toFixed(0)} m vs line spacing ${s.legend.spacing} m${s.legend.spacing > w * 0.95 ? ' — no overlap, so gaps open where rocks rise and the swath narrows' : ''}.`,
    )
  }

  if (s.outcome !== 'won') {
    const msg: Record<string, string> = {
      crash: 'The AUV hit a rock pinnacle.',
      battery: 'The battery ran flat before the AUV got home. A real AUV would drop its emergency weight and float up — far from the ship.',
      time: 'Out of time before the AUV got home.',
      'not-found': 'The AUV came home without finding the lost lander.',
      'mark-off': 'The AUV found the lander, but marked it in the wrong place — a recovery ROV sent there would find only sand.',
      coverage: 'The map has too many holes or blurry patches (needs 90 % sharp).',
      far: `The AUV surfaced ${s.surfacedDist.toFixed(0)} m from the ship.`,
    }
    const headline = msg[s.failReason] ?? 'Mission failed.'
    return { won: false, headline, stars: 0, score: 0, scoreLabel: 'points', message: `${headline} ${why[0]}`, why }
  }

  let stars = 1
  let score = 0
  let message = ''
  if (s.ace && L.buoy && s.mark) {
    const err = Math.hypot(s.mark.x - L.buoy.x, s.mark.y - L.buoy.y)
    if (err <= 5 && batt >= 25) stars = 3
    else if (err <= 10) stars = 2
    score = Math.round(600 + batt * 4 + Math.max(0, 15 - err) * 10)
    message = `Lander found and marked within ${err.toFixed(1)} m, back at the ship with ${batt.toFixed(0)} % battery after ${fmtMin(s.t)}. Your program did it all alone, out of contact.`
  } else {
    const c = coverage(s)
    if (c.good >= 0.97 && batt >= 15) stars = 3
    else if (c.good >= 0.94) stars = 2
    score = Math.round(c.good * 1000 + batt * 3)
    message = `Reef mapped: ${(c.good * 100).toFixed(0)} % sharp coverage in ${fmtMin(s.t)}, ${batt.toFixed(0)} % battery left.`
  }
  return { won: true, headline: message, stars, score, scoreLabel: 'points', message, why }
}
