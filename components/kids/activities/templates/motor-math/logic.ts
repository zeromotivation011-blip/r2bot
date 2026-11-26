// components/kids/activities/templates/motor-math/logic.ts
// MOTOR MATH — the child sets motor speed (rpm), wheel size, run time or
// encoder ticks with sliders so a robot drives exactly as far / as fast as the
// mission needs, then watches the run.
//
// The real maths (every wheeled robot uses it, from toy cars to Mars rovers):
//   - One turn of a wheel moves the robot one circumference: C = π × d.
//   - rpm ÷ 60 = turns per second, so speed v = C × rpm ÷ 60.
//   - Run for t seconds → distance = v × t.
//   - Or count turns with an ENCODER: a sensor on the motor gives N ticks per
//     turn, so turns = ticks ÷ N and distance = turns × C. This is "odometry".
//   - Real wheels SLIP a little (and tyres squash), so the robot goes slightly
//     less far than the maths says — that is why robots also use other sensors
//     to check where they are.
//
// Pure logic: no React, no DOM.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'

/** The four quantities a child can set (or that the activity fixes). */
export type Knob = 'rpm' | 'diameterCm' | 'timeS' | 'ticks'

export interface SizeRange {
  min: number
  max: number
  step: number
}

export interface Range {
  min?: number
  max?: number
}

export interface Params {
  /**
   * How the drive is commanded:
   *  'time'  — run the motor at `rpm` for `timeS` seconds (ages 5–12).
   *  'ticks' — run until the encoder has counted `ticks` (ages 11–17). With
   *            ticksPerRev = 1 the "ticks" are simply WHEEL TURNS (ages 8–10).
   */
  command: 'time' | 'ticks'
  /**
   * Sliders the child controls (1–3). Each quantity the model needs — rpm,
   * diameterCm, and timeS (command 'time') or ticks (command 'ticks') — must
   * be EITHER a knob OR in `fixed`, never both.
   * Sensible ranges: rpm 10–600, diameterCm 2–60, timeS 0.5–30, ticks 1–20000.
   */
  knobs: Partial<Record<Knob, SizeRange>>
  /** The given values (the ones that are not sliders). */
  fixed: Partial<Record<Knob, number>>
  /** Encoder ticks per wheel turn (command 'ticks'). 1 = count wheel turns. Real encoders: 12–4096. */
  ticksPerRev?: number
  /** What the robot must do. At least one. */
  target: {
    /** Distance travelled, cm. Use a min AND max for "stop in the zone". */
    distanceCm?: Range
    /** Driving speed, cm/s. */
    speedCmS?: Range
    /** Time the drive takes, s (e.g. "arrive in under 5 s"). */
    timeS?: Range
  }
  /** Wheel slip, 0–0.3 (fraction of distance lost). 0 for ages 5–12; 0.03–0.1 is realistic on carpet/dust. */
  slip?: number
  /** Label + emoji for the target zone, e.g. "Charging dock 🔌". */
  goal?: string
  /** Show the formula chain under the readouts. Default on for ages 11+. */
  showMath?: boolean
  /** Show the same calculation as Python. Ages 14–17. */
  showCode?: boolean
  /** Show live distance/speed while sliding. Off = predict, then run. Default on for ages 5–10. */
  liveReadout?: boolean
}

/** The child's slider values (only the knobs are read; fixed values come from Params). */
export type Answer = Partial<Record<Knob, number>>

export interface DriveResult {
  rpm: number
  diameterCm: number
  circumferenceCm: number
  turnsPerS: number
  turns: number
  /** Seconds the drive takes. */
  timeS: number
  speedCmS: number
  distanceCm: number
  /** Distance the maths says before slip. */
  idealCm: number
}

const KNOBS: Knob[] = ['rpm', 'diameterCm', 'timeS', 'ticks']
const LIMITS: Record<Knob, [number, number]> = { rpm: [1, 2000], diameterCm: [1, 200], timeS: [0.1, 120], ticks: [1, 100000] }
const EPS = 1e-9

export function needed(p: Params): Knob[] {
  return ['rpm', 'diameterCm', p.command === 'ticks' ? 'ticks' : 'timeS']
}

/** The value of a quantity for this answer (knob value or fixed). */
export function valueOf(p: Params, a: Answer, k: Knob): number {
  return p.knobs[k] !== undefined ? (a[k] ?? NaN) : (p.fixed[k] ?? NaN)
}

export function drive(p: Params, a: Answer): DriveResult {
  const rpm = valueOf(p, a, 'rpm')
  const d = valueOf(p, a, 'diameterCm')
  const C = Math.PI * d
  const turnsPerS = rpm / 60
  const turns = p.command === 'ticks' ? valueOf(p, a, 'ticks') / (p.ticksPerRev ?? 1) : turnsPerS * valueOf(p, a, 'timeS')
  const timeS = p.command === 'ticks' ? turns / turnsPerS : valueOf(p, a, 'timeS')
  const keep = 1 - (p.slip ?? 0)
  const idealCm = turns * C
  return { rpm, diameterCm: d, circumferenceCm: C, turnsPerS, turns, timeS, speedCmS: C * turnsPerS * keep, distanceCm: idealCm * keep, idealCm }
}

function inRange(v: number, r: Range | undefined): boolean {
  if (!r) return true
  if (r.min !== undefined && v < r.min - EPS) return false
  if (r.max !== undefined && v > r.max + EPS) return false
  return true
}

function rangeValues(r: SizeRange): number[] {
  const n = Math.floor((r.max - r.min) / r.step + 1e-6)
  return Array.from({ length: n + 1 }, (_, i) => Math.round((r.min + i * r.step) * 1e6) / 1e6)
}

function onRange(r: SizeRange, v: number | undefined): boolean {
  if (v === undefined || !Number.isFinite(v) || v < r.min - EPS || v > r.max + EPS) return false
  const k = (v - r.min) / r.step
  return Math.abs(k - Math.round(k)) < 1e-6
}

export function meets(p: Params, r: DriveResult): boolean {
  return inRange(r.distanceCm, p.target.distanceCm) && inRange(r.speedCmS, p.target.speedCmS) && inRange(r.timeS, p.target.timeS)
}

/** Every slider combination (for validation). */
export function allAnswers(p: Params): Answer[] {
  const ks = KNOBS.filter((k) => p.knobs[k])
  let out: Answer[] = [{}]
  for (const k of ks) {
    const vals = rangeValues(p.knobs[k] as SizeRange)
    const next: Answer[] = []
    for (const a of out) for (const v of vals) next.push({ ...a, [k]: v })
    out = next
  }
  return out
}

function validate(p: Params): string[] {
  const e: string[] = []
  if (p.command !== 'time' && p.command !== 'ticks') e.push('command must be "time" or "ticks".')
  const ks = KNOBS.filter((k) => p.knobs?.[k])
  if (ks.length < 1 || ks.length > 3) e.push('knobs: 1–3 sliders.')
  for (const k of KNOBS) {
    const r = p.knobs?.[k]
    const [lo, hi] = LIMITS[k]
    if (r) {
      if (!(r.min >= lo && r.max <= hi && r.min < r.max && r.step > 0)) e.push(`knobs.${k}: need ${lo} ≤ min < max ≤ ${hi} and step > 0.`)
      else if (rangeValues(r).length > 81) e.push(`knobs.${k}: at most 80 slider steps.`)
      if (p.fixed?.[k] !== undefined) e.push(`${k} is both a knob and fixed — pick one.`)
    }
    const f = p.fixed?.[k]
    if (f !== undefined && !(f >= lo && f <= hi)) e.push(`fixed.${k} must be ${lo}–${hi}.`)
  }
  for (const k of needed(p)) if (!p.knobs?.[k] && p.fixed?.[k] === undefined) e.push(`${k} is needed: make it a knob or give it in fixed.`)
  const unused = KNOBS.filter((k) => !needed(p).includes(k) && p.knobs?.[k])
  if (unused.length) e.push(`${unused.join(', ')} is not used by command "${p.command}".`)
  if (p.command === 'ticks' && !(Number.isInteger(p.ticksPerRev ?? 1) && (p.ticksPerRev ?? 1) >= 1 && (p.ticksPerRev ?? 1) <= 4096)) e.push('ticksPerRev must be a whole number 1–4096.')
  if (p.slip !== undefined && !(p.slip >= 0 && p.slip <= 0.3)) e.push('slip must be 0–0.3.')
  const t = p.target
  if (!t || (!t.distanceCm && !t.speedCmS && !t.timeS)) e.push('target needs distanceCm, speedCmS or timeS.')
  for (const [name, r] of [
    ['distanceCm', t?.distanceCm],
    ['speedCmS', t?.speedCmS],
    ['timeS', t?.timeS],
  ] as const) {
    if (!r) continue
    if (r.min === undefined && r.max === undefined) e.push(`target.${name} needs a min or a max.`)
    if (r.min !== undefined && r.max !== undefined && r.min > r.max) e.push(`target.${name}.min is above its max.`)
    if ((r.min ?? 0) < 0 || (r.max ?? 0) < 0) e.push(`target.${name} cannot be negative.`)
  }
  if (e.length) return e
  const all = allAnswers(p)
  if (all.length > 200_000) return ['Too many slider combinations: use bigger steps or fewer knobs.']
  let good = 0
  for (const a of all) if (meets(p, drive(p, a))) good++
  if (good === 0) e.push('Unsolvable: no slider setting meets the target.')
  else if (good === all.length) e.push('Trivial: every slider setting meets the target.')
  return e
}

const r1 = (n: number) => Math.round(n * 10) / 10
const r2 = (n: number) => Math.round(n * 100) / 100

function rangeText(r: Range, unit: string): string {
  if (r.min !== undefined && r.max !== undefined) return r.min === r.max ? `exactly ${r.min} ${unit}` : `${r.min}–${r.max} ${unit}`
  if (r.min !== undefined) return `at least ${r.min} ${unit}`
  return `at most ${r.max} ${unit}`
}

/** The reasoning chain as plain words, used in feedback. */
export function explain(p: Params, r: DriveResult): string {
  const turnsPart =
    p.command === 'ticks'
      ? (p.ticksPerRev ?? 1) === 1
        ? `${r2(r.turns)} turn${r.turns === 1 ? '' : 's'}`
        : `${r2(r.turns * (p.ticksPerRev ?? 1))} ticks ÷ ${p.ticksPerRev} per turn = ${r2(r.turns)} turns`
      : `${r2(r.turnsPerS)} turns a second × ${r2(r.timeS)} s = ${r2(r.turns)} turns`
  const slip = (p.slip ?? 0) > 0 ? ` minus ${Math.round((p.slip ?? 0) * 100)}% slip` : ''
  return `One turn of the ${r.diameterCm} cm wheel rolls the robot π × ${r.diameterCm} = ${r1(r.circumferenceCm)} cm. ${turnsPart} → ${r1(r.idealCm)} cm${slip}${slip ? ` = ${r1(r.distanceCm)} cm` : ''}.`
}

function check(p: Params, a: Answer): CheckResult {
  for (const k of KNOBS) {
    const r = p.knobs[k]
    if (r && !onRange(r, a?.[k])) return { correct: false, score: 0, feedback: 'Set every slider first.' }
  }
  const r = drive(p, a)
  const why = explain(p, r)
  const t = p.target
  const problems: string[] = []
  let parts = 0
  let ok = 0
  if (t.distanceCm) {
    parts++
    if (inRange(r.distanceCm, t.distanceCm)) ok++
    else if (t.distanceCm.max !== undefined && r.distanceCm > t.distanceCm.max)
      problems.push(
        `That is ${r1(r.distanceCm - t.distanceCm.max)} cm too far — it needs ${rangeText(t.distanceCm, 'cm')}. ${
          p.command === 'ticks' ? 'Fewer turns (or a smaller wheel) means less distance.' : 'Run for less time, slow the motor, or use a smaller wheel.'
        }`,
      )
    else
      problems.push(
        `It stops ${r1((t.distanceCm.min ?? 0) - r.distanceCm)} cm short — it needs ${rangeText(t.distanceCm, 'cm')}. ${
          (p.slip ?? 0) > 0 ? 'Remember the slip: ask for a little more than the exact maths. ' : ''
        }More turns, or a bigger wheel, goes further.`,
      )
  }
  if (t.speedCmS) {
    parts++
    if (inRange(r.speedCmS, t.speedCmS)) ok++
    else
      problems.push(
        `It drives at ${r1(r.speedCmS)} cm/s (circumference × rpm ÷ 60), but the job needs ${rangeText(t.speedCmS, 'cm/s')}. ${
          r.speedCmS > (t.speedCmS.max ?? Infinity) ? 'Lower rpm or a smaller wheel slows it.' : 'Higher rpm or a bigger wheel speeds it up.'
        }`,
      )
  }
  if (t.timeS) {
    parts++
    if (inRange(r.timeS, t.timeS)) ok++
    else
      problems.push(
        `The drive takes ${r1(r.timeS)} s, but it must take ${rangeText(t.timeS, 's')}. ${
          r.timeS > (t.timeS.max ?? Infinity) ? 'A faster motor or a bigger wheel covers the ground sooner.' : 'Slow it down a little.'
        }`,
      )
  }
  if (problems.length === 0)
    return {
      correct: true,
      score: 1,
      feedback: `${why} Driving at ${r1(r.speedCmS)} cm/s it takes ${r1(r.timeS)} s. Spot on — this is exactly how a robot works out how far it has gone (odometry).`,
    }
  return { correct: false, score: parts ? r2((ok / parts) * 0.8) : 0, feedback: `${why} ${problems[0]}` }
}

/** The same calculation as Python, for the code view (ages 14–17). */
export function pythonView(p: Params, a: Answer): string {
  const r = drive(p, a)
  const lines = ['import math', '', `wheel_d = ${r.diameterCm}        # cm`, `rpm = ${r.rpm}`]
  if (p.command === 'ticks') {
    lines.push(`ticks = ${valueOf(p, a, 'ticks')}`, `ticks_per_rev = ${p.ticksPerRev ?? 1}`)
  } else lines.push(`seconds = ${valueOf(p, a, 'timeS')}`)
  lines.push('', `circumference = math.pi * wheel_d       # ${r1(r.circumferenceCm)} cm per turn`, `speed = circumference * rpm / 60        # ${r1(r.idealCm / Math.max(r.timeS, EPS))} cm/s`)
  if (p.command === 'ticks') lines.push(`turns = ticks / ticks_per_rev           # ${r2(r.turns)}`, `distance = turns * circumference        # ${r1(r.idealCm)} cm`)
  else lines.push(`distance = speed * seconds              # ${r1(r.idealCm)} cm`)
  if ((p.slip ?? 0) > 0) lines.push(`distance *= 1 - ${p.slip}                 # slip → ${r1(r.distanceCm)} cm`)
  return lines.join('\n')
}

export const logic: TemplateLogic<Params, Answer> = {
  id: 'motor-math',
  name: 'Motor Math',
  validate,
  check,
}
