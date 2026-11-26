// components/kids/activities/templates/train-mini/logic.ts
// TRAIN A MINI-AI — a real k-nearest-neighbours (k-NN) classifier on a 2-D
// feature plane. The child adds labelled training points (and, for older
// bands, chooses k); the decision regions repaint live; then held-out TEST
// points are classified and scored.
//
// The real ideas:
//   - A classifier learns from LABELLED EXAMPLES; where examples are missing,
//     it guesses badly (the boundary sits in the wrong place).
//   - k-NN looks at the k closest training points and takes a vote. k = 1
//     copies the single nearest example — so one MISLABELLED point (noise)
//     carves a wrong island. A bigger k smooths noise out but blurs fine
//     detail. Choosing k is a real hyper-parameter decision.
//   - You judge a model on TEST data it never saw, not on its training data.
//
// Coordinates are on a 0..10 × 0..10 plane (features scaled, as real ML does).
// Pure logic: no React, no DOM.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'

export interface ClassDef {
  id: string
  /** e.g. "Ripe", "Rock", "Cat". */
  label: string
  icon: string
  /** Point colour (CSS colour). Pick strongly different hues. */
  colour: string
}

export interface Pt {
  x: number
  y: number
  /** Class id. */
  cls: string
}

export interface Params {
  task: string
  /** What the two axes measure; values are shown 0–10. */
  axes: { x: string; y: string }
  /** 2–3 classes. */
  classes: ClassDef[]
  /** Training points already in the dataset (may include deliberate mislabels for ages 14+). 0–30. */
  initialPoints: Pt[]
  /** Held-out test points with TRUE labels. 3–16. */
  testPoints: Pt[]
  /**
   * Show test points (dashed rings, colour = true answer) while training.
   * Default true. false = real held-out testing (use for ages 11+): the test
   * points stay invisible until "Test the AI", and minDistFromTest is not
   * applied, so the plane gives no clue where they are.
   */
  showTestPoints?: boolean
  /** How many points the child may add (0–12). 0 = only k can be tuned. */
  maxNewPoints: number
  /** k values offered. Default [1]. Ages 14+: e.g. [1,3,5,7] (odd avoids two-class ties). */
  kChoices?: number[]
  /** Fraction of test points that must be right, 0.5–1. */
  minAccuracy: number
  /**
   * When the test points are VISIBLE, added points must stay at least this
   * far (plane units) from every test point, so the child cannot just copy
   * the answers onto the test. Default 1.2. Ignored when showTestPoints is false.
   */
  minDistFromTest?: number
  /** Draw the shaded decision regions (default true). Off for an extra challenge (predict first). */
  showRegions?: boolean
}

export interface Answer {
  /** Points the child added. */
  added: Pt[]
  /** The k chosen (must be one of kChoices). */
  k: number
}

const dist2 = (a: { x: number; y: number }, b: { x: number; y: number }) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2

/**
 * k-NN vote. Ties are broken by the class of the single nearest point among
 * the tied classes (deterministic, and what many libraries do in spirit).
 * Equal distances are ordered by input order (stable sort).
 */
export function classify(train: Pt[], q: { x: number; y: number }, k: number): string | null {
  if (!train.length) return null
  const sorted = train.map((p, i) => ({ p, i, d: dist2(p, q) })).sort((a, b) => a.d - b.d || a.i - b.i)
  const nn = sorted.slice(0, Math.min(k, sorted.length))
  const votes = new Map<string, number>()
  for (const n of nn) votes.set(n.p.cls, (votes.get(n.p.cls) ?? 0) + 1)
  const top = Math.max(...votes.values())
  const tied = new Set([...votes.entries()].filter(([, v]) => v === top).map(([c]) => c))
  return nn.find((n) => tied.has(n.p.cls))!.p.cls
}

export interface Evaluation {
  results: { pt: Pt; got: string | null; ok: boolean }[]
  accuracy: number
}

export function evaluate(p: Params, a: Answer): Evaluation {
  const train = [...p.initialPoints, ...(a.added ?? [])]
  const results = p.testPoints.map((pt) => {
    const got = classify(train, pt, a.k)
    return { pt, got, ok: got === pt.cls }
  })
  return { results, accuracy: results.filter((r) => r.ok).length / results.length }
}

export function kChoicesOf(p: Params): number[] {
  return p.kChoices && p.kChoices.length ? p.kChoices : [1]
}

/** Are the test points drawn while the child trains? (Default true.) */
export function testsVisible(p: Params): boolean {
  return p.showTestPoints !== false
}

/** Minimum distance from test points, or 0 when they are hidden (no clue leaks). */
export function minTestDist(p: Params): number {
  return testsVisible(p) ? (p.minDistFromTest ?? 1.2) : 0
}

function placementProblem(p: Params, pt: Pt): string | null {
  if (!(pt.x >= 0 && pt.x <= 10 && pt.y >= 0 && pt.y <= 10)) return 'outside the plane'
  const md = minTestDist(p)
  if (md > 0 && p.testPoints.some((t) => dist2(t, pt) < md * md - 1e-9)) return 'too close to a test point'
  if (!p.classes.some((c) => c.id === pt.cls)) return 'unknown class'
  return null
}

/** Greedy search for a working answer (used by validate and as a hint). */
export function findSolution(p: Params): Answer | null {
  const cands: { x: number; y: number }[] = []
  for (let i = 0; i <= 20; i++) for (let j = 0; j <= 20; j++) cands.push({ x: i / 2, y: j / 2 })
  for (const k of kChoicesOf(p)) {
    const added: Pt[] = []
    let acc = evaluate(p, { added, k }).accuracy
    if (acc + 1e-9 >= p.minAccuracy) return { added, k }
    for (let step = 0; step < p.maxNewPoints; step++) {
      let best: { pt: Pt; acc: number } | null = null
      for (const c of cands)
        for (const cl of p.classes) {
          const pt = { x: c.x, y: c.y, cls: cl.id }
          if (placementProblem(p, pt)) continue
          const a2 = evaluate(p, { added: [...added, pt], k }).accuracy
          if (!best || a2 > best.acc + 1e-9) best = { pt, acc: a2 }
        }
      // Even when no single point helps (k > 1 may need several at once), add the best one and keep going.
      if (!best) break
      added.push(best.pt)
      acc = best.acc
      if (acc + 1e-9 >= p.minAccuracy) return { added, k }
    }
  }
  return null
}

function validate(p: Params): string[] {
  const out: string[] = []
  if (!p || !Array.isArray(p.classes) || !Array.isArray(p.testPoints) || !Array.isArray(p.initialPoints)) return ['classes, initialPoints and testPoints are required']
  if (!p.task?.trim()) out.push('task is required')
  if (!p.axes?.x?.trim() || !p.axes?.y?.trim()) out.push('axes.x and axes.y labels are required')
  if (p.classes.length < 2 || p.classes.length > 3) out.push('classes: 2–3')
  const ids = new Set(p.classes.map((c) => c.id))
  if (ids.size !== p.classes.length) out.push('class ids must be unique')
  if (p.initialPoints.length > 30) out.push('initialPoints: at most 30')
  if (p.testPoints.length < 3 || p.testPoints.length > 16) out.push('testPoints: 3–16')
  for (const pt of [...p.initialPoints, ...p.testPoints]) {
    if (!(pt.x >= 0 && pt.x <= 10 && pt.y >= 0 && pt.y <= 10)) out.push(`point (${pt.x}, ${pt.y}) is outside 0–10`)
    if (!ids.has(pt.cls)) out.push(`point (${pt.x}, ${pt.y}) has unknown class ${pt.cls}`)
  }
  if (!(Number.isInteger(p.maxNewPoints) && p.maxNewPoints >= 0 && p.maxNewPoints <= 12)) out.push('maxNewPoints: integer 0–12')
  for (const k of kChoicesOf(p)) if (!(Number.isInteger(k) && k >= 1 && k <= 15)) out.push('kChoices: integers 1–15')
  if (!(p.minAccuracy >= 0.5 && p.minAccuracy <= 1)) out.push('minAccuracy: 0.5–1')
  if (p.minDistFromTest !== undefined && !(p.minDistFromTest >= 0 && p.minDistFromTest <= 4)) out.push('minDistFromTest: 0–4')
  if (p.maxNewPoints === 0 && p.initialPoints.length === 0) out.push('with maxNewPoints 0 the dataset needs initialPoints')
  if (out.length) return out
  if (!findSolution(p)) out.push('no reachable answer meets minAccuracy (tried every k with up to maxNewPoints greedy points) — add points, allow more, or lower minAccuracy')
  // It must not be already solved with zero effort — the child has to DO something.
  const ks = kChoicesOf(p)
  const passes = (k: number) => evaluate(p, { added: [], k }).accuracy + 1e-9 >= p.minAccuracy
  if (passes(ks[0])) out.push(`the starting dataset already passes with the default k = ${ks[0]} — nothing for the child to do`)
  else if (ks.every(passes)) out.push('every k already passes with no added points — nothing for the child to do')
  return out
}

const pct = (x: number) => `${Math.round(x * 100)} %`

function check(p: Params, a: Answer): CheckResult {
  if (!a || !Array.isArray(a.added)) return { correct: false, score: 0, feedback: 'Add some training points first.' }
  if (!kChoicesOf(p).includes(a.k)) return { correct: false, score: 0, feedback: `k must be one of ${kChoicesOf(p).join(', ')}.` }
  if (a.added.length > p.maxNewPoints) return { correct: false, score: 0, feedback: `You can add at most ${p.maxNewPoints} points.` }
  for (const pt of a.added) {
    const pr = placementProblem(p, pt)
    if (pr) return { correct: false, score: 0, feedback: `One of your points is ${pr}. Training data has to be separate from the test data — no peeking at the answers!` }
  }
  if (p.initialPoints.length + a.added.length === 0) return { correct: false, score: 0, feedback: 'The AI has no examples at all, so it cannot guess anything. Add a few labelled points.' }
  const ev = evaluate(p, a)
  const label = (id: string | null) => p.classes.find((c) => c.id === id)?.label ?? '?'
  if (ev.accuracy + 1e-9 >= p.minAccuracy) {
    const kNote = a.k > 1 ? ` With k = ${a.k}, each guess is a vote of the ${a.k} nearest examples, so one odd point cannot fool it.` : ' With k = 1 it copies the single nearest example.'
    return {
      correct: true,
      score: 1,
      feedback: `Your mini-AI got ${ev.results.filter((r) => r.ok).length} of ${ev.results.length} test points right (${pct(ev.accuracy)}) — points it never trained on.${kNote}`,
    }
  }
  const miss = ev.results.find((r) => !r.ok)!
  const counts = new Map<string, number>()
  for (const pt of [...p.initialPoints, ...a.added]) counts.set(pt.cls, (counts.get(pt.cls) ?? 0) + 1)
  const missingClass = p.classes.find((c) => !counts.get(c.id))
  let why: string
  if (missingClass) why = `It has no examples of “${missingClass.label}” at all, so it can never answer that. Add some!`
  else if (a.k === 1 && kChoicesOf(p).some((k) => k > 1))
    why = `The test point at (${miss.pt.x}, ${miss.pt.y}) is really “${label(miss.pt.cls)}” but it copied its single nearest neighbour, “${label(miss.got)}”. If that neighbour is a mislabelled odd one, a bigger k lets the crowd outvote it.`
  else
    why = `The test point at (${miss.pt.x}, ${miss.pt.y}) is really “${label(miss.pt.cls)}”, but the closest examples said “${label(miss.got)}”. Add labelled examples of “${label(miss.pt.cls)}” in that part of the plane so the boundary moves.`
  return { correct: false, score: Math.max(0, Math.min(0.95, ev.accuracy)), feedback: `${pct(ev.accuracy)} of test points right (needed ${pct(p.minAccuracy)}). ${why}` }
}

export const logic: TemplateLogic<Params, Answer> = { id: 'train-mini', name: 'Train a mini-AI', validate, check }
