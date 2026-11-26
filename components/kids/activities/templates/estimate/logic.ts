// components/kids/activities/templates/estimate/logic.ts
// ESTIMATE — Fermi-style estimation, the engineer's "back of the envelope".
// The child drags a slider to estimate a robotics quantity ("How long does a
// radio message take from Mars?"), sees a picture of the size of their
// guess, commits, and the true value is revealed with the reasoning.
//
// On higher levels the child BUILDS the estimate from factors (the Fermi
// method): each factor is its own slider (distance, speed, …) and the
// estimate is constant × f1 × f2 ÷ f3 … — so a wrong answer can be traced to
// the factor that was off. Engineers do this before every design.
//
// Pass = within the tolerance: a RATIO (within ×2 is the Fermi standard) or
// a PERCENT (±20 %) of the true value.
//
// Pure logic: no React, no DOM.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'

export interface Factor {
  /** e.g. "Distance Earth–Mars". */
  label: string
  unit: string
  min: number
  max: number
  /** Slider step. */
  step: number
  /** 'mul' multiplies the estimate by this factor; 'div' divides by it. */
  op: 'mul' | 'div'
  /** The factor's true (typical) value, revealed after. */
  trueValue: number
  /** Why that value, one line (revealed after). */
  note: string
  /** Slider on a log scale (for factors spanning ≥ 100×). Default false. */
  log?: boolean
}

export interface Params {
  question: string
  unit: string
  /** Slider range for the final estimate (direct mode) — and the display range in factor mode. */
  min: number
  max: number
  /** Slider step (direct mode). */
  step: number
  /** Log slider (ranges spanning ≥ 100×, ages 11+). Default false. */
  log?: boolean
  /** The true value. */
  answer: number
  /** Pass band. ratio: within answer ÷ factor … answer × factor (factor ≥ 1.1). percent: within ± pct %. */
  tolerance: { kind: 'ratio'; factor: number } | { kind: 'percent'; pct: number }
  /** Ordered reasoning steps revealed after (2–5 lines): how an engineer would estimate it. */
  reasoning: string[]
  /** Optional Fermi factors (ages 11+). When present the child sets factors, not the answer. */
  factors?: Factor[]
  /** Constant multiplier for factor mode (e.g. unit conversion ÷ 60). Default 1. */
  constant?: number
  /** Human text for the constant, e.g. "× 1000 ÷ 60 (km→m, s→min)". */
  constantNote?: string
  /**
   * Picture (direct mode, max ≤ 60): the guess is drawn as a stack of icons
   * beside a reference object drawn to the SAME scale (the reference is
   * `answer` icons tall), so young children can see whether their tower
   * reaches it. Use a vector icon such as 'svg:vacuum' where one exists.
   */
  picture?: { icon: string; /** reference drawn beside the stack, exactly `answer` icons tall: "<icon> <name>", e.g. "🚪 door" (🚪 draws a vector door; any other emoji or svg:<glyph> is drawn at that height). */ reference?: string }
}

export interface Answer {
  /** The estimate (direct mode). In factor mode it is recomputed from `factors`. */
  value: number
  /** Factor values, in order (factor mode). */
  factors?: number[]
  /**
   * How many tries came before this one (0 on the first). Only picks which
   * reasoning line is offered as a hint; it never changes correctness.
   */
  attempt?: number
}

/** Slider positions (0..SLIDER_STEPS) — the client and validate() share them. */
export const SLIDER_STEPS = 1000

/** Map a slider position 0..SLIDER_STEPS to a value and back (linear or log). */
export function sliderScale(min: number, max: number, log?: boolean) {
  return {
    toValue: (s: number) => (log ? min * Math.pow(max / min, s / SLIDER_STEPS) : min + ((max - min) * s) / SLIDER_STEPS),
    toSlider: (v: number) => (log ? (SLIDER_STEPS * Math.log(v / min)) / Math.log(max / min) : (SLIDER_STEPS * (v - min)) / (max - min)),
  }
}

/** Snap to the step grid (multiples of `step`), clamped to min–max. */
export function snapTo(v: number, step: number, min: number, max: number): number {
  const s = Math.round(v / step) * step
  return Math.max(min, Math.min(max, Math.round(s * 1e6) / 1e6))
}

/** Every value a slider (plus its ± step buttons) can produce, sorted. */
export function reachable(min: number, max: number, step: number, log?: boolean): number[] {
  const set = new Set<number>([min, max])
  const sc = sliderScale(min, max, log)
  for (let i = 0; i <= SLIDER_STEPS; i++) set.add(snapTo(sc.toValue(i), step, min, max))
  return [...set].sort((a, b) => a - b)
}

/** The reachable value closest to v (ratio distance for log sliders). */
function nearestReachable(v: number, f: { min: number; max: number; step: number; log?: boolean }): number {
  let best = f.min
  let bestD = Infinity
  for (const r of reachable(f.min, f.max, f.step, f.log)) {
    const d = f.log ? Math.abs(Math.log(r / v)) : Math.abs(r - v)
    if (d < bestD) {
      bestD = d
      best = r
    }
  }
  return best
}

export function fromFactors(p: Params, fs: number[]): number {
  let v = p.constant ?? 1
  ;(p.factors ?? []).forEach((f, i) => {
    const x = fs[i]
    v = f.op === 'mul' ? v * x : v / x
  })
  return v
}

export function band(p: Params): [number, number] {
  return p.tolerance.kind === 'ratio' ? [p.answer / p.tolerance.factor, p.answer * p.tolerance.factor] : [p.answer * (1 - p.tolerance.pct / 100), p.answer * (1 + p.tolerance.pct / 100)]
}

export function nice(x: number): string {
  if (!Number.isFinite(x)) return '—'
  const a = Math.abs(x)
  if (a >= 1e6) return `${(x / 1e6).toLocaleString('en', { maximumFractionDigits: 1 })} million`
  if (a >= 100) return Math.round(x).toLocaleString('en')
  if (a >= 10) return x.toLocaleString('en', { maximumFractionDigits: 1 })
  return x.toLocaleString('en', { maximumFractionDigits: 2 })
}

function validate(p: Params): string[] {
  const out: string[] = []
  if (!p) return ['params are required']
  if (!p.question?.trim() || !p.unit?.trim()) out.push('question and unit are required')
  if (!(p.min < p.max)) out.push('min must be below max')
  if (p.log && !(p.min > 0)) out.push('a log slider needs min > 0')
  if (!(p.step > 0)) out.push('step must be > 0')
  if (!(p.answer > 0)) out.push('answer must be > 0 (estimates are of positive quantities)')
  if (!(p.answer >= p.min && p.answer <= p.max)) out.push('answer must be inside min–max')
  const t = p.tolerance
  if (!t || (t.kind === 'ratio' && !(t.factor >= 1.1 && t.factor <= 10)) || (t.kind === 'percent' && !(t.pct >= 2 && t.pct <= 60))) out.push('tolerance: ratio factor 1.1–10 or percent 2–60')
  if (!Array.isArray(p.reasoning) || p.reasoning.length < 2 || p.reasoning.length > 5) out.push('reasoning: 2–5 lines')
  if (p.picture && !p.factors && p.max > 60) out.push('picture needs max ≤ 60 (one icon per unit)')
  if (p.factors) {
    if (p.factors.length < 2 || p.factors.length > 4) out.push('factors: 2–4')
    for (const f of p.factors) {
      if (!(f.min < f.max && f.step > 0)) out.push(`factor ${f.label}: min < max and step > 0`)
      if (f.op === 'div' && !(f.min > 0)) out.push(`factor ${f.label}: a divisor needs min > 0`)
      if (f.log && !(f.min > 0)) out.push(`factor ${f.label}: a log slider needs min > 0`)
      if (!(f.trueValue >= f.min && f.trueValue <= f.max)) out.push(`factor ${f.label}: trueValue outside min–max`)
    }
    if (!out.length) {
      const v = fromFactors(p, p.factors.map((f) => f.trueValue))
      const [lo, hi] = band(p)
      if (!(v >= lo && v <= hi)) out.push(`the factors' true values give ${nice(v)}, outside the pass band around answer ${p.answer} — fix answer, constant or factors`)
      else {
        // The child can only set values on each slider's step grid.
        const snapped = p.factors.map((f) => nearestReachable(f.trueValue, f))
        const vs = fromFactors(p, snapped)
        if (!(vs >= lo && vs <= hi)) out.push(`on the sliders' step grids the closest factor values (${snapped.map(nice).join(', ')}) give ${nice(vs)}, outside the pass band — use finer factor steps or a wider tolerance`)
      }
    }
  } else if (!out.length) {
    // Direct mode: some value the slider can actually produce must pass.
    const [lo, hi] = band(p)
    if (!reachable(p.min, p.max, p.step, p.log).some((x) => x >= lo && x <= hi)) out.push(`no value the slider can reach (step ${p.step}) lies in the pass band ${nice(lo)}–${nice(hi)} — use a smaller step or a wider tolerance`)
  }
  return out
}

function check(p: Params, a: Answer): CheckResult {
  let v = a?.value
  if (p.factors) {
    if (!a?.factors || a.factors.length !== p.factors.length || a.factors.some((x) => !Number.isFinite(x))) return { correct: false, score: 0, feedback: 'Set every factor first.' }
    v = fromFactors(p, a.factors)
  }
  if (!Number.isFinite(v)) return { correct: false, score: 0, feedback: 'Move the slider to make your estimate first.' }
  const [lo, hi] = band(p)
  const ratio = v / p.answer
  const off = ratio >= 1 ? ratio : 1 / ratio
  const tolText = p.tolerance.kind === 'ratio' ? `within ×${p.tolerance.factor}` : `within ${p.tolerance.pct} %`
  if (v >= lo && v <= hi) {
    return {
      correct: true,
      score: 1,
      feedback: `Your estimate: ${nice(v)} ${p.unit}. The real value is about ${nice(p.answer)} ${p.unit} — ${off < 1.05 ? 'spot on!' : `you were ${tolText}, which is what a good engineering estimate looks like.`}`,
    }
  }
  // No "too high / too low" and no distance: that turns estimating into
  // bisection. Instead offer one reasoning step per try (never the last line,
  // which usually states the answer), and in factor mode point at the factor
  // that is furthest off — without saying which way.
  const hintLines = p.reasoning.slice(0, Math.max(1, p.reasoning.length - 1))
  const n = Math.max(0, Math.floor(a?.attempt ?? 0))
  const hint = hintLines[Math.min(n, hintLines.length - 1)]
  let tip = ''
  if (p.factors && a.factors) {
    let worst = 0
    let worstOff = 1
    p.factors.forEach((f, i) => {
      const r = a.factors![i] / f.trueValue
      const o = r >= 1 ? r : 1 / r
      if (o > worstOff) {
        worstOff = o
        worst = i
      }
    })
    tip = ` One factor is further off than the others: think again about “${p.factors[worst].label}”. What do you know about it?`
  } else tip = ` An engineer would reason it out: ${hint}`
  const score = Math.max(0, Math.min(0.9, 1 - Math.log(off) / Math.log(20)))
  return { correct: false, score, feedback: `${nice(v)} ${p.unit} is not ${tolText} of the real value yet.${tip}` }
}

export const logic: TemplateLogic<Params, Answer> = { id: 'estimate', name: 'Estimate', validate, check }
