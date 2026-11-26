// components/kids/activities/templates/signal-graph/logic.ts
// SIGNAL GRAPH — the child reads a real-looking sensor trace (noise, spikes
// and all), the way robotics engineers debug robots: by looking at the data.
//
// Three tasks:
//   'mark'     — tap every moment something happened (robot crossed a line,
//                a hand waved over the sensor, the door opened). Teaches that an
//                event is a CHANGE that lasts, and a one-sample spike is not one.
//   'level'    — drag a line to the true reading during a calm stretch.
//                Teaches reading through noise: aim at the middle of the fuzz,
//                not at the peaks (that is what averaging does).
//   'duration' — place two cursors at the start and end of an event to measure
//                how long it lasted (echo time, how long the door was open).
//
// The trace is generated deterministically from keyframes + seeded noise
// (./trace.ts), so the same params always show the same squiggle.
// Pure logic: no React, no DOM.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'
import { cleanAt, makeTrace, r1, traceProblems, type Keyframe, type Sample, type SensorSpec, type TraceSpec } from './trace'

export type { Keyframe, SensorSpec } from './trace'

export interface MarkTask {
  kind: 'mark'
  /** The question, e.g. "Tap every time the robot drove over a black line." */
  prompt: string
  /** The real events, in time order. 1–8 of them. */
  events: { t: number; label: string }[]
  /** How close (seconds) a tap must be to count. Bigger = easier (0.3–1.0 for ages 5–10, 0.1–0.3 for 14+). */
  toleranceS: number
}

export interface LevelTask {
  kind: 'level'
  prompt: string
  /** The calm stretch to read (seconds). The answer is the clean signal's average over it. */
  from: number
  to: number
  /** Accepted error in sensor units. Keep it ≥ about the noise level for ages 5–10. */
  toleranceAbs: number
}

export interface DurationTask {
  kind: 'duration'
  prompt: string
  /** True start and end of the event (seconds). */
  from: number
  to: number
  /** Accepted error at each end, seconds. */
  toleranceS: number
}

export interface Params {
  sensor: SensorSpec
  /** The clean signal. Times in seconds from 0..trace.durationS; two keyframes at the same t make a sudden step. */
  keyframes: Keyframe[]
  /**
   * Trace settings. Difficulty lives here: noise 0 and no spikes for ages 5–7;
   * noise ≈ 3–8 % of the range plus 1–3 spikes for 11–17.
   */
  trace: TraceSpec
  task: MarkTask | LevelTask | DurationTask
  /**
   * Things that happen in the world, drawn on a strip above the graph as the
   * trace plays (e.g. a black line at 2.1 s). Makes the link between world and
   * data explicit for young children; leave empty for older ones to infer it.
   */
  scene?: { t: number; icon: string; label?: string }[]
  /** Show a live (time, value) readout under the finger. Default on for ages 5–13. */
  showReadout?: boolean
  /** Show grid lines. Default on. */
  showGrid?: boolean
}

export interface Answer {
  /** mark: times (seconds) of every mark, any order. */
  marks?: number[]
  /** level: the reading in sensor units. */
  level?: number
  /** duration: [start, end] in seconds. */
  span?: [number, number]
}

export function traceOf(p: Params): Sample[] {
  return makeTrace(p.keyframes, p.trace, p.sensor)
}

/** The answer to a level task: average of the clean signal over the window. */
export function trueLevel(p: Params, from: number, to: number): number {
  const steps = 200
  let s = 0
  for (let i = 0; i <= steps; i++) s += cleanAt(p.keyframes, from + ((to - from) * i) / steps)
  return s / (steps + 1)
}

/** Match marks to events greedily by closeness. */
export function matchMarks(events: number[], marks: number[], tol: number): { hit: boolean[]; spare: number[] } {
  const hit = events.map(() => false)
  const used = marks.map(() => false)
  const pairs: { e: number; m: number; d: number }[] = []
  events.forEach((et, e) => marks.forEach((mt, m) => pairs.push({ e, m, d: Math.abs(et - mt) })))
  pairs.sort((a, b) => a.d - b.d)
  for (const pr of pairs) {
    if (pr.d > tol + 1e-9) break
    if (hit[pr.e] || used[pr.m]) continue
    hit[pr.e] = true
    used[pr.m] = true
  }
  return { hit, spare: marks.filter((_, i) => !used[i]) }
}

function validate(p: Params): string[] {
  const out: string[] = []
  if (!p.sensor || !p.trace) return ['sensor and trace are required']
  out.push(...traceProblems(p.trace, p.sensor))
  const D = p.trace.durationS
  const k = p.keyframes
  if (!Array.isArray(k) || k.length < 2) out.push('keyframes: at least 2')
  else {
    for (let i = 1; i < k.length; i++) if (k[i].t < k[i - 1].t) out.push('keyframes must be in time order')
    if (k[0].t > 0) out.push('first keyframe must be at t = 0')
    if (k[k.length - 1].t < D) out.push('last keyframe must be at or after durationS')
    for (const f of k) if (f.v < p.sensor.min || f.v > p.sensor.max) out.push(`keyframe value ${f.v} is outside the sensor range`)
  }
  if (out.length) return out
  const span = p.sensor.max - p.sensor.min
  const tk = p.task
  if (!tk?.prompt?.trim()) out.push('task.prompt is required')
  if (tk.kind === 'mark') {
    if (!(tk.toleranceS > 0 && tk.toleranceS <= 2)) out.push('toleranceS: (0, 2]')
    if (!Array.isArray(tk.events) || tk.events.length < 1 || tk.events.length > 8) out.push('events: 1–8')
    else {
      tk.events.forEach((e, i) => {
        if (!(e.t > 0 && e.t < D)) out.push(`event ${i + 1} is outside the trace`)
        if (i > 0 && e.t - tk.events[i - 1].t <= 2 * tk.toleranceS) out.push(`events ${i} and ${i + 1} are closer than twice the tolerance`)
        // The event must be VISIBLE: the clean signal changes clearly around it.
        let lo = Infinity
        let hi = -Infinity
        for (let j = 0; j <= 40; j++) {
          const v = cleanAt(p.keyframes, e.t - tk.toleranceS + (2 * tk.toleranceS * j) / 40)
          lo = Math.min(lo, v)
          hi = Math.max(hi, v)
        }
        const dv = hi - lo
        if (dv < Math.max(0.1 * span, 3 * p.trace.noise)) out.push(`event ${i + 1} at ${e.t}s: the signal barely changes there (needs ≥ 10 % of the range and ≥ 3× noise)`)
      })
    }
  } else if (tk.kind === 'level') {
    if (!(tk.from >= 0 && tk.to <= D && tk.to - tk.from >= 0.5)) out.push('level window must be inside the trace and ≥ 0.5 s long')
    if (!(tk.toleranceAbs > 0)) out.push('toleranceAbs must be > 0')
    else if (tk.toleranceAbs > 0.25 * span) out.push('toleranceAbs is so wide that any guess wins')
    // A level task needs a calm stretch: the clean signal should not swing much in the window.
    if (!out.length) {
      let lo = Infinity
      let hi = -Infinity
      for (let i = 0; i <= 50; i++) {
        const v = cleanAt(p.keyframes, tk.from + ((tk.to - tk.from) * i) / 50)
        lo = Math.min(lo, v)
        hi = Math.max(hi, v)
      }
      if (hi - lo > 2 * tk.toleranceAbs) out.push('the clean signal changes too much inside the level window to have one true reading')
    }
  } else if (tk.kind === 'duration') {
    if (!(tk.from > 0 && tk.to < D && tk.to > tk.from)) out.push('duration from/to must be inside the trace with to > from')
    if (!(tk.toleranceS > 0 && tk.toleranceS < (tk.to - tk.from) / 2)) out.push('toleranceS must be > 0 and less than half the event length')
  } else out.push('task.kind must be mark, level or duration')
  for (const s of p.scene ?? []) if (!(s.t >= 0 && s.t <= D)) out.push('scene items must be inside the trace')
  return out
}

function check(p: Params, a: Answer): CheckResult {
  const tk = p.task
  const u = p.sensor.unit
  if (tk.kind === 'mark') {
    const marks = (a?.marks ?? []).filter((m) => Number.isFinite(m))
    if (marks.length === 0) return { correct: false, score: 0, feedback: 'Tap the graph where something happens to place a marker.' }
    const ev = tk.events.map((e) => e.t)
    const { hit, spare } = matchMarks(ev, marks, tk.toleranceS)
    const hits = hit.filter(Boolean).length
    const score = hits / (ev.length + spare.length)
    if (hits === ev.length && spare.length === 0)
      return {
        correct: true,
        score: 1,
        feedback: `You found all ${ev.length}: ${tk.events.map((e) => `${e.label} at ${r1(e.t)} s`).join(', ')}. Reading the trace is how engineers find out what a robot really sensed.`,
      }
    const missed = tk.events.filter((_, i) => !hit[i])
    const bits: string[] = []
    if (missed.length) {
      const m = missed[0]
      const lo = Math.max(0, Math.floor(m.t - 1))
      const hi = Math.ceil(m.t + 1)
      bits.push(`${missed.length === 1 ? 'One event has' : `${missed.length} events have`} no marker — look between ${lo} and ${hi} s for a jump that stays.`)
    }
    if (spare.length) {
      const near = spare[0]
      const isSpike = (p.trace.spikes ?? 0) > 0
      bits.push(
        `Your marker at ${r1(near)} s is not on an event${isSpike ? ' — a single dot that jumps and comes straight back is a glitch, not something real' : ''}.`,
      )
    }
    return { correct: false, score, feedback: `You found ${hits} of ${ev.length}. ${bits.join(' ')}` }
  }
  if (tk.kind === 'level') {
    const v = a?.level
    if (v === undefined || !Number.isFinite(v)) return { correct: false, score: 0, feedback: 'Drag the line to the reading you think is true.' }
    const truth = trueLevel(p, tk.from, tk.to)
    const err = v - truth
    if (Math.abs(err) <= tk.toleranceAbs + 1e-9)
      return {
        correct: true,
        score: 1,
        feedback: `Spot on: the real reading was about ${r1(truth)} ${u}. You looked through the wobble to the middle — that is exactly what averaging does inside a robot.`,
      }
    const score = Math.max(0, 1 - Math.abs(err) / (4 * tk.toleranceAbs))
    return {
      correct: false,
      score,
      feedback: `Your line is ${err > 0 ? 'too high' : 'too low'} (by about ${r1(Math.abs(err))} ${u}). ${
        p.trace.noise > 0 ? 'The noise makes dots jump both ways — the true value sits in the middle of the fuzz, not at its edge.' : 'Look at the flat part between ' + r1(tk.from) + ' and ' + r1(tk.to) + ' s.'
      }`,
    }
  }
  // duration
  const sp = a?.span
  if (!sp || sp.length !== 2 || !sp.every(Number.isFinite)) return { correct: false, score: 0, feedback: 'Place both cursors: one where the event starts, one where it ends.' }
  const [s0, s1] = sp[0] <= sp[1] ? sp : [sp[1], sp[0]]
  const okA = Math.abs(s0 - tk.from) <= tk.toleranceS + 1e-9
  const okB = Math.abs(s1 - tk.to) <= tk.toleranceS + 1e-9
  const real = tk.to - tk.from
  const mine = s1 - s0
  if (okA && okB)
    return { correct: true, score: 1, feedback: `It lasted about ${r1(real)} s (you measured ${r1(mine)} s). Timing events from data is how robots measure echoes, speeds and gaps.` }
  const bits: string[] = []
  if (!okA) bits.push(`your start is ${s0 < tk.from ? 'too early' : 'too late'}`)
  if (!okB) bits.push(`your end is ${s1 < tk.to ? 'too early' : 'too late'}`)
  return {
    correct: false,
    score: (okA ? 0.5 : 0) + (okB ? 0.5 : 0),
    feedback: `You measured ${r1(mine)} s, but ${bits.join(' and ')}. Put each cursor exactly where the reading jumps and stays changed.`,
  }
}

export const logic: TemplateLogic<Params, Answer> = {
  id: 'signal-graph',
  name: 'Signal graph',
  validate,
  check,
}
