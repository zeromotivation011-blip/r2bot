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
   * Picture: draw the estimate as a row of icons (direct mode, ≤ 60 icons) so
   * young children can SEE the size of their guess against a reference.
   */
  picture?: { icon: string; /** reference shown beside the stack, e.g. "🚪 door". */ reference?: string }
}

export interface Answer {
  /** The estimate (direct mode). In factor mode it is recomputed from `factors`. */
  value: number
  /** Factor values, in order (factor mode). */
  factors?: number[]
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
    }
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
  const dir = v > p.answer ? 'too high' : 'too low'
  let tip = ''
  if (p.factors && a.factors) {
    // Which factor is furthest from its true value (in ratio terms)?
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
    const f = p.factors[worst]
    tip = ` Check “${f.label}”: you used ${nice(a.factors[worst])} ${f.unit} — is that ${a.factors[worst] > f.trueValue ? 'a bit big' : 'a bit small'}?`
  } else tip = ` Think it through in steps: what do you already know that is close to this?`
  const score = Math.max(0, Math.min(0.9, 1 - Math.log(off) / Math.log(20)))
  return { correct: false, score, feedback: `${nice(v)} ${p.unit} is ${dir} — about ${off >= 2 ? `${nice(off)} times` : `${Math.round((off - 1) * 100)} %`} off (needed ${tolText}).${tip}` }
}

export const logic: TemplateLogic<Params, Answer> = { id: 'estimate', name: 'Estimate', validate, check }
