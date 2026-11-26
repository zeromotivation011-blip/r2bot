// components/kids/activities/templates/threshold-tuner/logic.ts
// THRESHOLD TUNER — a robot decides between two situations ("on the line" /
// "off the line", "wall close" / "path clear", "dark" / "light") by comparing
// a noisy sensor reading with a threshold. The child drags the threshold —
// and, at higher levels, adds hysteresis and a smoothing filter — until the
// robot decides correctly without flickering.
//
// The real ideas:
//   - A threshold should sit in the GAP between the two clouds of readings
//     (the midpoint of the two levels is a good start).
//   - When noise makes the clouds overlap, a single threshold CHATTERS: the
//     decision flips back and forth many times per real change. Real robots fix
//     this with HYSTERESIS (a Schmitt trigger: switch up at th + h/2, back down
//     only at th − h/2) and/or by FILTERING (a moving average of the last N
//     readings).
//   - Filtering has a price: a longer average reacts later (lag). Hysteresis
//     costs a little delay too. Engineering is the trade-off.
//
// Pure logic: no React, no DOM.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'
import { makeTrace, r1, traceProblems, type Keyframe, type Sample, type SensorSpec, type TraceSpec } from '../signal-graph/trace'

export type WorldState = 'low' | 'high'

export interface StateDef {
  /** What is really happening, e.g. "On the black line". */
  label: string
  icon: string
  /** The clean sensor reading in this state (sensor units). */
  level: number
  /** What the robot should DO when it thinks it is in this state, e.g. "Turn left". */
  action: string
}

export interface Params {
  sensor: SensorSpec
  /** The two situations. `low.level` must be below `high.level`. */
  states: { low: StateDef; high: StateDef }
  /**
   * What is really happening over time: each entry starts a state at time t.
   * The first must be at t = 0; 2–12 entries; states must alternate.
   */
  timeline: { t: number; state: WorldState }[]
  /**
   * Trace settings. Difficulty: noise ≈ 5 % of the gap between levels for ages
   * 5–7 (any threshold in the gap works); noise near 30–40 % of the gap plus
   * spikes for 14–17 (needs hysteresis or a filter).
   */
  trace: TraceSpec
  /** Seconds the real sensor takes to move between levels (0 = instant step). Default 0. */
  rampS?: number
  /** Extra controls the child may use. Omit for a single threshold slider. */
  knobs?: {
    /** Hysteresis band width (sensor units), 0..max. Ages 11+. */
    hysteresis?: { max: number }
    /** Moving-average window (samples), 1..maxWindow. Ages 14+. */
    filter?: { maxWindow: number }
  }
  /** Allowed wrong decisions, as a % of samples (outside the lag allowance). 0–25. */
  allowedErrorPct: number
  /** After each real change, decisions within this many seconds are not counted (reaction time). Default 0.3. */
  lagAllowanceS?: number
  /** Extra decision flips allowed beyond the real changes (chatter). Default 0. */
  maxExtraSwitches?: number
  /** Show the % of wrong decisions and flip count live while tuning. Default on for ages 5–13. */
  liveStats?: boolean
}

export interface Answer {
  /** The threshold in sensor units: reading above it ⇒ "high" state. */
  threshold: number
  /** Hysteresis band width (only if knobs.hysteresis). */
  hysteresis?: number
  /** Moving-average window in samples (only if knobs.filter). 1 = no filter. */
  window?: number
}

export interface Run {
  samples: Sample[]
  /** Filtered reading the decision used. */
  filtered: number[]
  truth: WorldState[]
  decision: WorldState[]
  /** Counted samples that were wrong. */
  errors: number
  counted: number
  errorPct: number
  switches: number
  realChanges: number
  extraSwitches: number
  /** Wrong decisions split by true state (what kind of mistake). */
  wrongWhenLow: number
  wrongWhenHigh: number
}

export function truthAt(p: Params, t: number): WorldState {
  let s: WorldState = p.timeline[0]?.state ?? 'low'
  for (const e of p.timeline) if (e.t <= t + 1e-9) s = e.state
  return s
}

export function keyframesOf(p: Params): Keyframe[] {
  const ramp = Math.max(0, p.rampS ?? 0)
  const lv = (s: WorldState) => p.states[s].level
  const k: Keyframe[] = [{ t: 0, v: lv(p.timeline[0].state) }]
  for (let i = 1; i < p.timeline.length; i++) {
    const e = p.timeline[i]
    k.push({ t: e.t, v: lv(p.timeline[i - 1].state) })
    k.push({ t: e.t + ramp, v: lv(e.state) })
  }
  k.push({ t: p.trace.durationS + 1, v: lv(p.timeline[p.timeline.length - 1].state) })
  return k
}

export function simulate(p: Params, a: Answer): Run {
  const samples = makeTrace(keyframesOf(p), p.trace, p.sensor)
  const w = Math.max(1, Math.round(p.knobs?.filter ? (a.window ?? 1) : 1))
  const h = Math.max(0, p.knobs?.hysteresis ? (a.hysteresis ?? 0) : 0)
  const th = a.threshold
  const filtered: number[] = []
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i].v
    if (i >= w) sum -= samples[i - w].v
    filtered.push(sum / Math.min(i + 1, w))
  }
  const decision: WorldState[] = []
  let cur: WorldState = filtered[0] > th ? 'high' : 'low'
  for (const f of filtered) {
    if (h === 0) cur = f > th ? 'high' : 'low'
    else if (cur === 'low' && f > th + h / 2) cur = 'high'
    else if (cur === 'high' && f < th - h / 2) cur = 'low'
    decision.push(cur)
  }
  const truth = samples.map((s) => truthAt(p, s.t))
  const lag = p.lagAllowanceS ?? 0.3
  const changes = p.timeline.slice(1).map((e) => e.t)
  let errors = 0
  let counted = 0
  let wrongWhenLow = 0
  let wrongWhenHigh = 0
  samples.forEach((s, i) => {
    if (changes.some((c) => s.t >= c - 1e-9 && s.t < c + (p.rampS ?? 0) + lag)) return
    counted++
    if (decision[i] !== truth[i]) {
      errors++
      if (truth[i] === 'low') wrongWhenLow++
      else wrongWhenHigh++
    }
  })
  let switches = 0
  for (let i = 1; i < decision.length; i++) if (decision[i] !== decision[i - 1]) switches++
  const realChanges = changes.length
  return {
    samples,
    filtered,
    truth,
    decision,
    errors,
    counted,
    errorPct: counted ? (100 * errors) / counted : 0,
    switches,
    realChanges,
    extraSwitches: Math.max(0, switches - realChanges),
    wrongWhenLow,
    wrongWhenHigh,
  }
}

function passes(p: Params, r: Run): boolean {
  return r.errorPct <= p.allowedErrorPct + 1e-9 && r.extraSwitches <= (p.maxExtraSwitches ?? 0)
}

/** Search the knob space for any working answer (validate + hints). */
export function findSolution(p: Params): Answer | null {
  const { min, max } = p.sensor
  const steps = 120
  const hs = p.knobs?.hysteresis ? Array.from({ length: 13 }, (_, i) => (p.knobs!.hysteresis!.max * i) / 12) : [0]
  const ws = p.knobs?.filter ? Array.from({ length: p.knobs.filter.maxWindow }, (_, i) => i + 1) : [1]
  for (const w of ws)
    for (const h of hs)
      for (let i = 1; i < steps; i++) {
        const a: Answer = { threshold: min + ((max - min) * i) / steps, hysteresis: h, window: w }
        if (passes(p, simulate(p, a))) return a
      }
  return null
}

function validate(p: Params): string[] {
  const out: string[] = []
  if (!p.sensor || !p.trace || !p.states) return ['sensor, trace and states are required']
  out.push(...traceProblems(p.trace, p.sensor))
  const { low, high } = p.states
  if (!(low && high)) return [...out, 'states.low and states.high are required']
  if (!(low.level < high.level)) out.push('states.low.level must be below states.high.level')
  for (const s of [low, high]) {
    if (!s.label?.trim() || !s.action?.trim()) out.push('every state needs a label and an action')
    if (s.level < p.sensor.min || s.level > p.sensor.max) out.push(`state level ${s.level} is outside the sensor range`)
  }
  const tl = p.timeline
  if (!Array.isArray(tl) || tl.length < 2 || tl.length > 12) out.push('timeline: 2–12 entries')
  else {
    if (tl[0].t !== 0) out.push('timeline must start at t = 0')
    for (let i = 1; i < tl.length; i++) {
      if (tl[i].t <= tl[i - 1].t) out.push('timeline times must increase')
      if (tl[i].state === tl[i - 1].state) out.push('timeline states must alternate')
    }
    if (tl[tl.length - 1].t >= p.trace.durationS) out.push('every timeline change must be inside the trace')
  }
  if (!(p.allowedErrorPct >= 0 && p.allowedErrorPct <= 25)) out.push('allowedErrorPct: 0–25')
  if (p.rampS !== undefined && !(p.rampS >= 0 && p.rampS <= 3)) out.push('rampS: 0–3')
  if (p.lagAllowanceS !== undefined && !(p.lagAllowanceS >= 0 && p.lagAllowanceS <= 3)) out.push('lagAllowanceS: 0–3')
  if (p.maxExtraSwitches !== undefined && !(p.maxExtraSwitches >= 0)) out.push('maxExtraSwitches must be ≥ 0')
  const k = p.knobs
  if (k?.hysteresis && !(k.hysteresis.max > 0 && k.hysteresis.max <= p.sensor.max - p.sensor.min)) out.push('knobs.hysteresis.max must be > 0 and within the range')
  if (k?.filter && !(Number.isInteger(k.filter.maxWindow) && k.filter.maxWindow >= 2 && k.filter.maxWindow <= 25)) out.push('knobs.filter.maxWindow: integer 2–25')
  if (out.length) return out
  if (!findSolution(p)) out.push('no threshold (with the allowed knobs) meets allowedErrorPct and maxExtraSwitches — lower the noise or loosen the targets')
  return out
}

function check(p: Params, a: Answer): CheckResult {
  if (!a || !Number.isFinite(a.threshold)) return { correct: false, score: 0, feedback: 'Drag the threshold line first.' }
  const r = simulate(p, a)
  const { low, high } = p.states
  const u = p.sensor.unit
  const err = r1(r.errorPct)
  if (passes(p, r)) {
    const extras: string[] = []
    if ((a.hysteresis ?? 0) > 0 && p.knobs?.hysteresis) extras.push('The hysteresis band stopped noise from flipping the decision.')
    if ((a.window ?? 1) > 1 && p.knobs?.filter) extras.push(`Averaging ${a.window} readings smoothed the noise (at the cost of reacting a little later).`)
    return {
      correct: true,
      score: 1,
      feedback: `The robot decided right ${r1(100 - r.errorPct)} % of the time and changed its mind only when the world really changed (${r.switches} time${r.switches === 1 ? '' : 's'}). ${
        extras.length ? extras.join(' ') : `A threshold of ${r1(a.threshold)} ${u} sits in the gap between ${low.label.toLowerCase()} (~${low.level}) and ${high.label.toLowerCase()} (~${high.level}).`
      }`,
    }
  }
  const score = Math.max(0, Math.min(0.95, (1 - r.errorPct / 100) * (r.extraSwitches > 0 ? 0.6 : 1)))
  if (r.errorPct > p.allowedErrorPct) {
    const lowWrong = r.wrongWhenLow >= r.wrongWhenHigh
    const s = lowWrong ? low : high
    const other = lowWrong ? high : low
    const where = lowWrong ? 'too low — move it up' : 'too high — move it down'
    let tip = `When it was really “${s.label}”, the robot thought “${other.label}” and would ${other.action.toLowerCase()} by mistake. Your threshold is ${where}, into the gap between the two clouds of dots.`
    if ((a.window ?? 1) > 6 && p.knobs?.filter) tip += ' A very long average also makes the robot react late.'
    return { correct: false, score, feedback: `${err} % of decisions were wrong (allowed: ${p.allowedErrorPct} %). ${tip}` }
  }
  let fix = 'Put the threshold in the middle of the gap so noise rarely reaches it.'
  if (p.knobs?.hysteresis && p.knobs?.filter) fix = 'Noise keeps crossing your line. Widen the hysteresis band, or smooth the readings with a filter.'
  else if (p.knobs?.hysteresis) fix = 'Noise keeps crossing your line. Widen the hysteresis band: switch up only well above it, and back only well below it.'
  else if (p.knobs?.filter) fix = 'Noise keeps crossing your line. Average a few readings to smooth it out.'
  return {
    correct: false,
    score,
    feedback: `The robot flickered: it changed its mind ${r.switches} times but the world only changed ${r.realChanges} times. Real robots that chatter like this wobble and waste battery. ${fix}`,
  }
}

export const logic: TemplateLogic<Params, Answer> = {
  id: 'threshold-tuner',
  name: 'Threshold tuner',
  validate,
  check,
}
