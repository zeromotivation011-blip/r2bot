// components/kids/games/robot-city/follow.ts
// PILOT — Safe Speed. The child tunes a self-driving car's cruise speed and
// following gap, then the car drives a 900 m test route by itself:
//   0–420 m  follow a lead car that suddenly brakes hard (a dog runs out);
//   420–560 m  clear road;
//   560–900 m  heavy rain and fog: the sensors see only 30 m, the road is wet,
//              and a broken-down van is stopped in the lane at 850 m.
//
// The model is real 1-D vehicle dynamics:
//   - The car only reacts to what it perceived LATENCY seconds ago
//     (sensing + prediction + planning take time: 0.5 s here; a typical
//     attentive human takes about 1.5 s).
//   - Braking is limited by grip: about 7 m/s² on a dry road, 4 m/s² on a wet one.
//   - Stopping distance = v × latency + v² / (2a). It grows with speed SQUARED.
//   - The following gap is a TIME gap: gap = 2 m + headway × v, so it grows with speed.
// Deterministic: same settings, same drive.
// Pure logic: no React, no DOM.

export const ROUTE = 900 // m
export const LEAD_EXIT = 420
export const FOG_START = 560
export const VAN_AT = 850 // rear bumper of the van
export const CAR_LEN = 4.5
export const LATENCY = 0.5 // s, the self-driving car
export const HUMAN_REACT = 1.5 // s, for comparison
export const A_DRY = 7
export const A_WET = 4
export const A_UP = 2.0
export const FOG_RANGE = 30 // m
export const CLEAR_RANGE = 150 // m
export const SPEED_LIMIT = 60 // km/h
export const LEAD_SPEED = 36 / 3.6
export const LEAD_BRAKE_AT = 11 // s after the start
export const LEAD_BRAKE = 9 // m/s² — the driver ahead stamps on the brakes (a dog ran out)
export const DT = 1 / 60

export interface FollowSettings {
  /** Cruise speed, km/h. */
  speedKmh: number
  /** Following time gap, s. */
  headway: number
}

export function stopDist(v: number, a: number, react = LATENCY) {
  return v * react + (v * v) / (2 * a)
}

/** Fastest speed (km/h) that can stop within `range` metres. */
export function maxSafeSpeed(range: number, a: number, react = LATENCY) {
  // v·r + v²/(2a) = range  →  v = a(−r + √(r² + 2·range/a))
  const v = a * (-react + Math.sqrt(react * react + (2 * range) / a))
  return v * 3.6
}

export interface FollowFrame {
  t: number
  s: number
  v: number
  a: number
  leadS: number | null
  leadV: number
  leadBraking: boolean
  van: boolean
  seen: boolean
  gap: number | null
}

export interface FollowResult {
  frames: FollowFrame[]
  crashed: null | { where: 'lead' | 'van'; t: number; s: number; speedKmh: number }
  time: number
  minLeadGap: number
  /** Distance left in front of the van when the car stopped (m). */
  vanMargin: number | null
  hardestBrake: number
  /** Speed (km/h) when the van first came into view. */
  vanSeenAt: number | null
}

interface Perceived {
  leadS: number | null
  leadV: number
  vanVisible: boolean
}

/** Run the whole route with these settings. */
export function runFollow(set: FollowSettings): FollowResult {
  const vSet = Math.min(SPEED_LIMIT, set.speedKmh) / 3.6
  const h = set.headway
  let t = 0
  let s = 0
  let v = Math.min(vSet, LEAD_SPEED)
  let leadS: number | null = 2 + CAR_LEN + h * v + 0.01
  let leadV = LEAD_SPEED
  let leadStoppedFor = 0
  let leadPhase: 'cruise' | 'brake' | 'stopped' | 'go' = 'cruise'
  let vanPassed = false
  let stoppedBehindVan = 0
  const hist: Perceived[] = []
  const delaySteps = Math.round(LATENCY / DT)
  const frames: FollowFrame[] = []
  let crashed: FollowResult['crashed'] = null
  let minLeadGap = Infinity
  let hardest = 0
  let vanSeenAt: number | null = null
  let vanMargin: number | null = null

  for (let i = 0; i < 60 * 200 && s < ROUTE; i++) {
    t += DT
    // ── the lead car ──
    if (leadS !== null) {
      if (leadPhase === 'cruise' && t >= LEAD_BRAKE_AT) leadPhase = 'brake'
      if (leadPhase === 'brake') {
        leadV = Math.max(0, leadV - LEAD_BRAKE * DT)
        if (leadV === 0) leadPhase = 'stopped'
      } else if (leadPhase === 'stopped') {
        leadStoppedFor += DT
        if (leadStoppedFor > 2.5) leadPhase = 'go'
      } else if (leadPhase === 'go') leadV = Math.min(LEAD_SPEED, leadV + 2.2 * DT)
      leadS += leadV * DT
      if (leadS > LEAD_EXIT + 40) leadS = null // turns off into a side street
    }
    const inFog = s + CAR_LEN >= FOG_START - 20
    const range = inFog ? FOG_RANGE : CLEAR_RANGE
    const vanVisible = !vanPassed && VAN_AT - (s + CAR_LEN) <= range
    hist.push({ leadS: leadS !== null && leadS - CAR_LEN - s <= range ? leadS : null, leadV, vanVisible })
    const p = hist.length > delaySteps ? hist[hist.length - 1 - delaySteps] : { leadS: null, leadV: 0, vanVisible: false }
    if (p.vanVisible && vanSeenAt === null) vanSeenAt = v * 3.6

    // ── the car's planner (acting on what it perceived LATENCY ago) ──
    const wet = s + CAR_LEN >= FOG_START
    const aMax = wet ? A_WET : A_DRY
    const aMaxNow = aMax
    let aCmd = 1.2 * (vSet - v)
    if (p.leadS !== null) {
      // The lead's acceleration as the car perceived it (two old samples).
      const prev = hist.length > delaySteps + 6 ? hist[hist.length - 7 - delaySteps] : p
      const la = prev.leadS !== null ? (p.leadV - prev.leadV) / (6 * DT) : 0
      // Where the lead is NOW according to old data: it moved on since.
      const ahead = Math.max(0, p.leadV * LATENCY + 0.5 * la * LATENCY * LATENCY)
      const gap = p.leadS + ahead - CAR_LEN - s
      if (la < -3 && gap < 3 * v + 4) aCmd = -aMaxNow // emergency braking ahead: brake as hard as the grip allows
      const want = 2 + h * v
      const acc = 0.35 * (gap - want) + 0.9 * (p.leadV - v)
      aCmd = Math.min(aCmd, acc)
      if (v > p.leadV) {
        const room = Math.max(0.1, gap - 1.5)
        const need = (v * v - p.leadV * p.leadV) / (2 * room)
        if (need > 1.2) aCmd = Math.min(aCmd, -need)
      }
    }
    if (p.vanVisible) {
      const room = Math.max(0.05, VAN_AT - 2 - (s + CAR_LEN))
      const need = (v * v) / (2 * room)
      aCmd = Math.min(aCmd, -need, (0 - v) * 0.8 + 0.4 * (room - 0.5))
    }
    const a = Math.max(-aMax, Math.min(A_UP, aCmd))
    if (-a > hardest) hardest = -a
    v = Math.max(0, Math.min(vSet, v + a * DT))
    s += v * DT

    // ── around the van once stopped (the car waits for a gap, then passes slowly) ──
    if (!vanPassed && VAN_AT - (s + CAR_LEN) < 12 && v < 0.05) {
      stoppedBehindVan += DT
      if (vanMargin === null) vanMargin = VAN_AT - (s + CAR_LEN)
      if (stoppedBehindVan > 2) {
        vanPassed = true
      }
    }

    // ── checks ──
    if (leadS !== null) {
      const gap = leadS - CAR_LEN - s
      if (gap < minLeadGap) minLeadGap = gap
      if (gap <= 0) {
        crashed = { where: 'lead', t, s, speedKmh: (v - leadV) * 3.6 }
      }
    }
    if (!vanPassed && s + CAR_LEN >= VAN_AT) crashed = { where: 'van', t, s, speedKmh: v * 3.6 }
    if (i % 2 === 0 || crashed)
      frames.push({ t, s, v, a, leadS, leadV, leadBraking: leadPhase === 'brake', van: !vanPassed, seen: p.vanVisible, gap: leadS !== null ? leadS - CAR_LEN - s : null })
    if (crashed) break
  }
  return { frames, crashed, time: t, minLeadGap, vanMargin, hardestBrake: hardest, vanSeenAt }
}

/** Smallest space left in front of the car at any stop (m). */
export function safetyMargin(r: FollowResult): number {
  return Math.min(r.minLeadGap, r.vanMargin ?? Infinity)
}

export const MARGIN_OK = 1.5 // m

export function followStars(set: FollowSettings, r: FollowResult): number {
  if (r.crashed) return 0
  if (set.speedKmh >= 44 && safetyMargin(r) >= MARGIN_OK) return 3
  if (set.speedKmh >= 36) return 2
  return 1
}
