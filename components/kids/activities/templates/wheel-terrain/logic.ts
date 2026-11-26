// components/kids/activities/templates/wheel-terrain/logic.ts
// WHEEL TERRAIN — the child chooses how a robot moves (wheels, tracks or legs)
// and sizes it (diameter / leg length, width / foot size) for a course of
// real terrains, then watches a simulated run that stops exactly where and why
// the design fails.
//
// The physics model (simplified, but every rule is a real one):
//   1. SINKING — ground pressure = weight ÷ contact area. Soft ground can hold
//      only so much pressure (its bearing capacity); above it the robot sinks.
//      Wide wheels, long tracks and big feet spread the weight (snowshoes!).
//   2. STEPS — a wheel can climb a step a bit lower than its radius
//      (≈ 0.45 × diameter); a track about its sprocket height + the track's
//      ramp (≈ diameter + 4 cm); a leg about 60% of its length.
//   3. GRIP — on a slope the robot slips if tan(slope) is more than the grip
//      (friction coefficient) of the ground. Tracks and feet grip a bit better.
//   4. PUSH — the drive force is motor torque ÷ wheel radius, so a BIGGER wheel
//      is faster but pushes more weakly. Uphill it must beat weight × (sin θ +
//      rolling resistance × cos θ) or it stalls.
//   5. SPEED — wheels/tracks: π × diameter × rpm ÷ 60, slowed by rough or soft
//      ground; legs: ~half a leg length per step, one step per motor turn.
//
// Pure logic: no React, no DOM.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'

export const G = 9.81

export type Terrain = 'tile' | 'carpet' | 'grass' | 'gravel' | 'sand' | 'mud' | 'snow' | 'ice' | 'rocks' | 'stairs'
export type LocoKind = 'wheels' | 'tracks' | 'legs'

export interface TerrainInfo {
  name: string
  /** Bearing capacity in kPa (Infinity = hard ground). */
  bearing: number
  /** Grip: friction coefficient μ. */
  mu: number
  /** Rolling resistance coefficient for wheels. */
  crr: number
  /** Speed multiplier for wheels / tracks / legs (roughness, softness). */
  speed: Record<LocoKind, number>
  /** Obstacles built into this terrain, cm (rocks, stair risers). */
  implicitStepCm: number
  colour: string
}

/** Typical values from terramechanics and robotics references, rounded for clarity. */
export const TERRAIN: Record<Terrain, TerrainInfo> = {
  tile: { name: 'Smooth floor', bearing: Infinity, mu: 0.6, crr: 0.01, speed: { wheels: 1, tracks: 0.85, legs: 1 }, implicitStepCm: 0, colour: '#A7B0C0' },
  carpet: { name: 'Carpet', bearing: Infinity, mu: 0.7, crr: 0.04, speed: { wheels: 0.9, tracks: 0.85, legs: 1 }, implicitStepCm: 0, colour: '#94A3B8' },
  grass: { name: 'Grass', bearing: 80, mu: 0.45, crr: 0.08, speed: { wheels: 0.8, tracks: 0.8, legs: 0.95 }, implicitStepCm: 0, colour: '#22C55E' },
  gravel: { name: 'Gravel', bearing: 150, mu: 0.55, crr: 0.1, speed: { wheels: 0.75, tracks: 0.8, legs: 0.9 }, implicitStepCm: 2, colour: '#78716C' },
  sand: { name: 'Loose sand', bearing: 20, mu: 0.4, crr: 0.2, speed: { wheels: 0.6, tracks: 0.75, legs: 0.8 }, implicitStepCm: 0, colour: '#E8C27A' },
  mud: { name: 'Mud', bearing: 12, mu: 0.25, crr: 0.25, speed: { wheels: 0.5, tracks: 0.7, legs: 0.6 }, implicitStepCm: 0, colour: '#7C5A3A' },
  snow: { name: 'Fresh snow', bearing: 8, mu: 0.2, crr: 0.15, speed: { wheels: 0.5, tracks: 0.75, legs: 0.6 }, implicitStepCm: 0, colour: '#E2E8F0' },
  ice: { name: 'Ice', bearing: Infinity, mu: 0.08, crr: 0.01, speed: { wheels: 0.9, tracks: 0.85, legs: 0.7 }, implicitStepCm: 0, colour: '#BAE6FD' },
  rocks: { name: 'Rocky ground', bearing: Infinity, mu: 0.7, crr: 0.12, speed: { wheels: 0.6, tracks: 0.7, legs: 0.9 }, implicitStepCm: 6, colour: '#57534E' },
  stairs: { name: 'Stairs', bearing: Infinity, mu: 0.6, crr: 0.02, speed: { wheels: 0.5, tracks: 0.5, legs: 0.6 }, implicitStepCm: 17, colour: '#64748B' },
}

/** How each kind of drive grips compared with a plain wheel. */
const GRIP: Record<LocoKind, number> = { wheels: 1, tracks: 1.3, legs: 1.2 }
const TRACK_CRR = 1.5 // tracks waste more energy rolling on hard ground

export interface Segment {
  terrain: Terrain
  /** Metres (0.5–100). */
  length: number
  /** Degrees, + uphill / − downhill (−35…35). Default 0. */
  slopeDeg?: number
  /** A single step/kerb at the start of the segment, cm (0–40). Adds to the terrain's own obstacles. */
  stepCm?: number
}

export interface SizeRange {
  min: number
  max: number
  step: number
}

export interface Preset {
  name: string
  emoji?: string
  kind: LocoKind
  diameterCm: number
  widthCm: number
}

export interface Params {
  /** Robot mass in kg (0.2–500). */
  robotMassKg: number
  /** The course, 1–6 segments, driven left to right. */
  course: Segment[]
  /** Drive types the child may choose. */
  allowed: LocoKind[]
  /**
   * Wheel diameter / track sprocket diameter / LEG LENGTH, cm.
   * Ignored when `presets` is set.
   */
  diameterCm: SizeRange
  /**
   * Wheel width / track width / FOOT pad diameter, cm. Omit to fix it at
   * `fixedWidthCm` (the child then only sizes the diameter). Ignored with presets.
   */
  widthCm?: SizeRange
  /** Width used when `widthCm` is omitted. Default 4. */
  fixedWidthCm?: number
  /**
   * Ages 5–8: offer 2–4 ready-made robots instead of sliders. The answer must
   * then be one of them.
   */
  presets?: Preset[]
  /** Wheel/sprocket/leg-crank speed after the gearbox, rpm (10–600). Default 120. */
  motorRpm?: number
  /**
   * Total drive torque at the wheels, N·m. When given, slopes need enough PUSH
   * (torque ÷ radius) — bigger wheels push more weakly. Omit for ages 5–10.
   */
  motorTorqueNm?: number
  /** The run must finish within this many seconds. Omit = just finish. */
  timeLimitS?: number
  /** Show pressure / grip / push numbers and the terrain table. Ages 11+. */
  showPhysics?: boolean
}

export interface Answer {
  kind: LocoKind
  diameterCm: number
  widthCm: number
}

export type FailReason = 'sinks' | 'step' | 'slips' | 'stalls'

export interface SegmentRun {
  ok: boolean
  reason?: FailReason
  /** Seconds spent on this segment (to the failure point if it failed). */
  time: number
  /** Metres covered in this segment. */
  covered: number
  speed: number
  explain?: string
}

export interface RunResult {
  finished: boolean
  totalTime: number
  segments: SegmentRun[]
  pressureKPa: number
  climbCm: number
  /** Available push, N (null without motorTorqueNm). */
  pushN: number | null
}

const r1 = (n: number) => Math.round(n * 10) / 10

/** Contact area in m² for the whole robot. */
export function contactArea(a: Answer): number {
  const d = a.diameterCm
  const w = a.widthCm
  let cm2: number
  if (a.kind === 'wheels') cm2 = 4 * w * 0.2 * d // 4 wheels, each with a patch ~0.2 × diameter long on soft ground
  else if (a.kind === 'tracks') cm2 = 2 * w * (2.5 * d + 10) // two tracks
  else cm2 = 3 * Math.PI * (w / 2) * (w / 2) // tripod gait: three feet down
  return cm2 / 10000
}

export function climbCm(a: Answer): number {
  if (a.kind === 'wheels') return 0.45 * a.diameterCm
  if (a.kind === 'tracks') return a.diameterCm + 4
  return 0.6 * a.diameterCm
}

export function topSpeed(p: Params, a: Answer): number {
  const rpm = p.motorRpm ?? 120
  if (a.kind === 'legs') return 0.5 * (a.diameterCm / 100) * (rpm / 60)
  return Math.PI * (a.diameterCm / 100) * (rpm / 60)
}

export function run(p: Params, a: Answer): RunResult {
  const W = p.robotMassKg * G
  const pressureKPa = W / contactArea(a) / 1000
  const climb = climbCm(a)
  const pushN = p.motorTorqueNm !== undefined && a.kind !== 'legs' ? p.motorTorqueNm / (a.diameterCm / 200) : null
  const v0 = topSpeed(p, a)
  const segments: SegmentRun[] = []
  let total = 0
  let finished = true
  for (const s of p.course) {
    const T = TERRAIN[s.terrain]
    const slope = s.slopeDeg ?? 0
    const step = Math.max(s.stepCm ?? 0, T.implicitStepCm)
    const speed = v0 * T.speed[a.kind] * (slope > 0 ? Math.max(0.4, 1 - slope / 60) : 1)
    let fail: { reason: FailReason; at: number; explain: string } | null = null
    if (step > climb + 1e-9)
      fail = {
        reason: 'step',
        at: 0,
        explain: `the ${step} cm ${s.terrain === 'stairs' ? 'stair step' : s.terrain === 'rocks' ? 'rocks' : 'step'} is taller than it can climb (${r1(climb)} cm — ${
          a.kind === 'wheels' ? 'a wheel climbs a bit less than its radius' : a.kind === 'tracks' ? 'a track climbs about its sprocket height plus a little' : 'a leg lifts about 60% of its length'
        }).`,
      }
    else if (pressureKPa > T.bearing)
      fail = {
        reason: 'sinks',
        at: Math.min(s.length * 0.3, 1),
        explain: `it presses ${r1(pressureKPa)} kPa on ${T.name.toLowerCase()}, which only holds ${T.bearing} kPa, so it sinks. ${
          a.kind === 'legs' ? 'Bigger feet' : a.kind === 'tracks' ? 'Wider tracks' : 'Wider or bigger wheels'
        } spread the weight over more ground.`,
      }
    else {
      const rad = (Math.abs(slope) * Math.PI) / 180
      const grip = Math.min(1.2, T.mu * GRIP[a.kind])
      if (Math.tan(rad) > grip + 1e-9)
        fail = {
          reason: 'slips',
          at: s.length * 0.2,
          explain: `on ${T.name.toLowerCase()} the grip is about ${r1(grip * 100) / 100}, but a ${Math.abs(slope)}° slope needs at least ${
            Math.round(Math.tan(rad) * 100) / 100
          } (tan of the angle), so it ${slope >= 0 ? 'slides back' : 'slides away'}.${a.kind === 'wheels' ? ' Tracks or feet grip better.' : ''}`,
        }
      else if (pushN !== null && slope > 0) {
        const crr = T.crr * (a.kind === 'tracks' ? TRACK_CRR : 1)
        const need = W * (Math.sin(rad) + crr * Math.cos(rad))
        if (need > pushN + 1e-9)
          fail = {
            reason: 'stalls',
            at: s.length * 0.25,
            explain: `going up needs ${Math.round(need)} N of push but the motors give only ${Math.round(pushN)} N with ${a.diameterCm} cm ${
              a.kind === 'tracks' ? 'sprockets' : 'wheels'
            } (push = torque ÷ radius). Smaller wheels push harder.`,
          }
      }
    }
    if (fail) {
      const t = fail.at / speed
      total += t
      segments.push({ ok: false, reason: fail.reason, time: t, covered: fail.at, speed, explain: fail.explain })
      finished = false
      break
    }
    const t = s.length / speed + (step > 0 ? 1 : 0)
    total += t
    segments.push({ ok: true, time: t, covered: s.length, speed })
  }
  return { finished, totalTime: total, segments, pressureKPa, climbCm: climb, pushN }
}

function rangeValues(r: SizeRange): number[] {
  const out: number[] = []
  const n = Math.floor((r.max - r.min) / r.step + 1e-6)
  for (let i = 0; i <= n; i++) out.push(Math.round((r.min + i * r.step) * 1e6) / 1e6)
  return out
}

function onRange(r: SizeRange, v: number): boolean {
  if (v < r.min - 1e-9 || v > r.max + 1e-9) return false
  const k = (v - r.min) / r.step
  return Math.abs(k - Math.round(k)) < 1e-6
}

/** Every answer the child could make (for validation). */
export function allAnswers(p: Params): Answer[] {
  if (p.presets?.length) return p.presets.map((x) => ({ kind: x.kind, diameterCm: x.diameterCm, widthCm: x.widthCm }))
  const widths = p.widthCm ? rangeValues(p.widthCm) : [p.fixedWidthCm ?? 4]
  const out: Answer[] = []
  for (const kind of p.allowed) for (const d of rangeValues(p.diameterCm)) for (const w of widths) out.push({ kind, diameterCm: d, widthCm: w })
  return out
}

function passes(p: Params, a: Answer): boolean {
  const r = run(p, a)
  return r.finished && (p.timeLimitS === undefined || r.totalTime <= p.timeLimitS + 1e-9)
}

function validate(p: Params): string[] {
  const e: string[] = []
  if (!(p.robotMassKg >= 0.2 && p.robotMassKg <= 500)) e.push('robotMassKg must be 0.2–500.')
  if (!Array.isArray(p.course) || p.course.length < 1 || p.course.length > 6) e.push('course needs 1–6 segments.')
  else
    p.course.forEach((s, i) => {
      if (!TERRAIN[s.terrain]) e.push(`course[${i}]: unknown terrain "${s.terrain}".`)
      if (!(s.length >= 0.5 && s.length <= 100)) e.push(`course[${i}]: length must be 0.5–100 m.`)
      if (s.slopeDeg !== undefined && !(s.slopeDeg >= -35 && s.slopeDeg <= 35)) e.push(`course[${i}]: slopeDeg must be −35…35.`)
      if (s.stepCm !== undefined && !(s.stepCm >= 0 && s.stepCm <= 40)) e.push(`course[${i}]: stepCm must be 0–40.`)
    })
  if (!Array.isArray(p.allowed) || p.allowed.length < 1 || p.allowed.some((k) => !['wheels', 'tracks', 'legs'].includes(k))) e.push('allowed: 1–3 of wheels/tracks/legs.')
  const checkRange = (name: string, r: SizeRange | undefined, lo: number, hi: number) => {
    if (!r) return
    if (!(r.min >= lo && r.max <= hi && r.min <= r.max && r.step > 0)) e.push(`${name}: need ${lo} ≤ min ≤ max ≤ ${hi}, step > 0.`)
    else if (rangeValues(r).length > 60) e.push(`${name}: at most 60 slider steps.`)
  }
  if (!p.presets?.length) {
    checkRange('diameterCm', p.diameterCm, 2, 100)
    checkRange('widthCm', p.widthCm, 1, 60)
  } else {
    if (p.presets.length < 2 || p.presets.length > 4) e.push('presets: 2–4 robots.')
    for (const x of p.presets) {
      if (!p.allowed.includes(x.kind)) e.push(`preset ${x.name} uses ${x.kind}, which is not allowed.`)
      if (!(x.diameterCm >= 2 && x.diameterCm <= 100 && x.widthCm >= 1 && x.widthCm <= 60)) e.push(`preset ${x.name} has an impossible size.`)
    }
  }
  if (p.fixedWidthCm !== undefined && !(p.fixedWidthCm >= 1 && p.fixedWidthCm <= 60)) e.push('fixedWidthCm must be 1–60.')
  if (p.motorRpm !== undefined && !(p.motorRpm >= 10 && p.motorRpm <= 600)) e.push('motorRpm must be 10–600.')
  if (p.motorTorqueNm !== undefined && !(p.motorTorqueNm > 0)) e.push('motorTorqueNm must be positive.')
  if (p.timeLimitS !== undefined && !(p.timeLimitS > 0)) e.push('timeLimitS must be positive.')
  if (e.length) return e
  const all = allAnswers(p)
  const good = all.filter((a) => passes(p, a)).length
  if (good === 0) e.push('Unsolvable: no allowed design finishes the course in time.')
  else if (good === all.length) e.push('Trivial: every possible design finishes, so the choice teaches nothing.')
  return e
}

function check(p: Params, a: Answer): CheckResult {
  if (!a || !p.allowed.includes(a.kind)) return { correct: false, score: 0, feedback: 'Choose one of the drive types on offer.' }
  if (p.presets?.length) {
    if (!p.presets.some((x) => x.kind === a.kind && x.diameterCm === a.diameterCm && x.widthCm === a.widthCm))
      return { correct: false, score: 0, feedback: 'Pick one of the robots in the garage.' }
  } else {
    const widthOk = p.widthCm ? onRange(p.widthCm, a.widthCm) : a.widthCm === (p.fixedWidthCm ?? 4)
    if (!onRange(p.diameterCm, a.diameterCm) || !widthOk) return { correct: false, score: 0, feedback: 'Set the size with the sliders.' }
  }
  const r = run(p, a)
  const totalLen = p.course.reduce((s, x) => s + x.length, 0)
  const covered = r.segments.reduce((s, x) => s + x.covered, 0)
  const name = a.kind === 'wheels' ? 'wheeled robot' : a.kind === 'tracks' ? 'tracked robot' : 'walking robot'
  if (!r.finished) {
    const bad = r.segments[r.segments.length - 1]
    const seg = p.course[r.segments.length - 1]
    return {
      correct: false,
      score: Math.round((covered / totalLen) * 0.8 * 100) / 100,
      feedback: `Your ${name} got stuck on the ${TERRAIN[seg.terrain].name.toLowerCase()}${seg.slopeDeg ? ` (${seg.slopeDeg}° slope)` : ''}: ${bad.explain}`,
    }
  }
  if (p.timeLimitS !== undefined && r.totalTime > p.timeLimitS + 1e-9) {
    const slowest = r.segments.reduce((m, s, i) => (s.time > r.segments[m].time ? i : m), 0)
    return {
      correct: false,
      score: 0.8,
      feedback: `It finished, but took ${r1(r.totalTime)} s — the limit is ${p.timeLimitS} s. Most time went on the ${TERRAIN[
        p.course[slowest].terrain
      ].name.toLowerCase()}. ${a.kind === 'legs' ? 'Legs are sure-footed but slow.' : 'A bigger wheel or sprocket covers more ground per turn — if it can still push and not sink.'}`,
    }
  }
  return {
    correct: true,
    score: 1,
    feedback: `Your ${name} made it in ${r1(r.totalTime)} s. It presses ${r1(r.pressureKPa)} kPa on the ground and climbs ${r1(r.climbCm)} cm${
      r.pushN !== null ? `, pushing with up to ${Math.round(r.pushN)} N` : ''
    } — matched to every terrain on the course. Real rover teams make the same trade between speed, grip and floating on soft ground.`,
  }
}

export const logic: TemplateLogic<Params, Answer> = {
  id: 'wheel-terrain',
  name: 'Wheels & Terrain',
  validate,
  check,
}
