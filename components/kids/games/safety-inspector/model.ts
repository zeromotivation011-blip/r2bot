// components/kids/games/safety-inspector/model.ts
// The model under Robot Safety Inspector. Pure functions, no React, no DOM.
//
//   risk = likelihood × severity          (a 5 × 5 risk matrix, 1–25)
//   green 1–4 · amber 5–9 · red 10–25     (this game's matrix bands)
//
// A fix leaves a RESIDUAL likelihood and severity, and may CREATE a new hazard
// in another category (safety standards make engineers check that a
// mitigation does not add a new risk). "Run the scene" then simulates a year
// of operation day by day with a seeded random generator: each hazard has a
// daily chance of causing an incident that depends on its likelihood, and an
// incident is serious when its severity is 4 or 5. Same choices → same year,
// so a result is fair and repeatable.
//
// Legend adds a stopping-distance check: d = v·t + v²/(2a). The robot must be
// able to stop inside its LiDAR protective field.

import type { HarmCat } from './harm'
import type { Hazard, Scene, SpeedCheck } from './scenes'

export const CATS: HarmCat[] = ['body', 'data', 'fairness', 'control', 'people', 'planet']

export type Band = 'green' | 'amber' | 'red'

export function band(risk: number): Band {
  if (risk >= 10) return 'red'
  if (risk >= 5) return 'amber'
  return 'green'
}

export const BAND_COLOR: Record<Band, string> = { green: '#22C55E', amber: '#F59E0B', red: '#EF4444' }

export const LIKELIHOOD_WORDS = ['', 'Rare', 'Unlikely', 'Possible', 'Likely', 'Almost certain']
export const SEVERITY_WORDS = ['', 'Tiny', 'Minor', 'Serious', 'Severe', 'Catastrophic']

/** Chance per day that a hazard of this likelihood causes an incident. */
export const DAILY_P = [0, 0.0003, 0.001, 0.004, 0.012, 0.03]

export interface RiskItem {
  id: string
  cat: HarmCat
  label: string
  l: number
  s: number
  risk: number
  /** Created by a fix (not in the original scene). */
  created?: boolean
}

export interface Evaluation {
  items: RiskItem[]
  byCat: Record<HarmCat, number>
  total: number
  /** Risk total with no fixes at all. */
  before: number
  cost: number
  /** Fixes chosen that are the best (lowest residual, no new hazard, within reason). */
  bestCount: number
}

export function hazards(scene: Scene): Hazard[] {
  return scene.objects.filter((o): o is Hazard => o.kind === 'hazard')
}

/** The best fix: lowest residual risk counting any hazard it creates; cheaper wins a tie. */
export function bestFix(h: Hazard) {
  return [...h.fixes].sort((a, b) => fixRisk(a) - fixRisk(b) || a.cost - b.cost)[0]
}

function fixRisk(f: Hazard['fixes'][number]): number {
  return f.l * f.s + (f.creates ? f.creates.l * f.creates.s : 0)
}

/** Evaluate the scene with the chosen fixes (hazard id → fix id). Unfixed hazards keep their full risk. */
export function evaluate(scene: Scene, fixes: Record<string, string | undefined>): Evaluation {
  const items: RiskItem[] = []
  let cost = 0
  let bestCount = 0
  let before = 0
  for (const h of hazards(scene)) {
    before += h.l * h.s
    const f = h.fixes.find((x) => x.id === fixes[h.id])
    if (!f) {
      items.push({ id: h.id, cat: h.cat, label: h.label, l: h.l, s: h.s, risk: h.l * h.s })
      continue
    }
    cost += f.cost
    if (f.id === bestFix(h).id) bestCount++
    items.push({ id: h.id, cat: h.cat, label: h.label, l: f.l, s: f.s, risk: f.l * f.s })
    if (f.creates) items.push({ id: `${h.id}+${f.id}`, cat: f.creates.cat, label: f.creates.label, l: f.creates.l, s: f.creates.s, risk: f.creates.l * f.creates.s, created: true })
  }
  const byCat = Object.fromEntries(CATS.map((c) => [c, 0])) as Record<HarmCat, number>
  for (const it of items) byCat[it.cat] += it.risk
  const total = items.reduce((t, it) => t + it.risk, 0)
  return { items, byCat, total, before, cost, bestCount }
}

/** Percentage of the scene's risk removed (0–100). */
export function reduction(ev: Evaluation): number {
  return ev.before > 0 ? Math.round(100 * (1 - ev.total / ev.before)) : 0
}

// ── One simulated year ──────────────────────────────────────────────────────

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export interface YearResult {
  incidents: number
  serious: number
  /** Incidents per category. */
  byCat: Record<HarmCat, number>
  /** Expected incidents (the average over many years). */
  expected: number
}

/**
 * Simulate 365 days. Each item draws from its OWN random stream (seeded by
 * scene + item id), so changing one fix never reshuffles the luck of the others.
 */
export function simulateYear(sceneId: string, items: RiskItem[], days = 365): YearResult {
  const byCat = Object.fromEntries(CATS.map((c) => [c, 0])) as Record<HarmCat, number>
  let incidents = 0
  let serious = 0
  let expected = 0
  for (const it of items) {
    const p = DAILY_P[Math.max(0, Math.min(5, it.l))]
    expected += p * days
    const rnd = mulberry32(hashSeed(`${sceneId}:${it.id.split('+')[0]}:${it.created ? 'new' : 'base'}`))
    for (let d = 0; d < days; d++) {
      if (rnd() < p) {
        incidents++
        byCat[it.cat]++
        if (it.s >= 4) serious++
      }
    }
  }
  return { incidents, serious, byCat, expected: Math.round(expected * 10) / 10 }
}

// ── Legend: stopping distance ───────────────────────────────────────────────

export function stopDistance(v: number, sc: SpeedCheck): number {
  return v * sc.reactS + (v * v) / (2 * sc.decel)
}

export function routeTime(v: number, sc: SpeedCheck): number {
  return sc.routeM / v
}

export function speedVerdict(v: number, sc: SpeedCheck): { safe: boolean; timely: boolean; stop: number; time: number } {
  const stop = stopDistance(v, sc)
  const time = routeTime(v, sc)
  return { safe: stop <= sc.fieldM + 1e-9, timely: time <= sc.maxRouteS + 1e-9, stop, time }
}

/** The fastest speed on the slider grid that still stops inside the field. */
export function bestSpeed(sc: SpeedCheck): number {
  let best = sc.min
  for (let v = sc.min; v <= sc.max + 1e-9; v = Math.round((v + sc.step) * 100) / 100) if (speedVerdict(v, sc).safe) best = v
  return best
}

// ── Legend: rating ─────────────────────────────────────────────────────────

/** A rating is accepted when likelihood and severity are each within one step of the expert's. */
export function ratingOk(h: Hazard, l: number, s: number): boolean {
  return Math.abs(l - h.l) <= 1 && Math.abs(s - h.s) <= 1
}

// ── Acceptance per tier ────────────────────────────────────────────────────

export interface Verdict {
  pass: boolean
  /** Problems a child can act on. */
  problems: string[]
}

/** Ace: every category at or below the limit, within budget. Legend: every single item below red, within budget. */
export function acceptance(scene: Scene, ev: Evaluation, tier: number): Verdict {
  const problems: string[] = []
  if (scene.budget !== undefined && ev.cost > scene.budget) problems.push(`Over budget: ${ev.cost} of ${scene.budget} coins.`)
  if (tier === 2 && scene.limit !== undefined) {
    for (const c of CATS) if (ev.byCat[c] > scene.limit) problems.push(`${c[0].toUpperCase() + c.slice(1)} risk is ${ev.byCat[c]} — it must be ${scene.limit} or less.`)
  }
  if (tier === 3 && scene.limit !== undefined) {
    for (const it of ev.items) if (it.risk > scene.limit) problems.push(`“${it.label}” is still red (${it.l} × ${it.s} = ${it.risk}).`)
  }
  return { pass: problems.length === 0, problems }
}
