// components/kids/activities/templates/centre-of-mass/logic.ts
// CENTRE OF MASS — the child places a robot's heavy parts (battery, payload,
// arm, counterweight) on its deck so it does not tip over on slopes or when it
// brakes hard.
//
// The real physics (static tipping, side view):
//   - The robot's centre of mass (CoM) is the mass-weighted average position of
//     all its parts: x̄ = Σ mᵢxᵢ / Σ mᵢ, h̄ = Σ mᵢhᵢ / Σ mᵢ.
//   - A robot stands as long as the line of gravity through its CoM meets the
//     ground BETWEEN its wheel contacts (inside the "support polygon").
//   - On a slope of θ (nose up = positive) that line shifts downhill by
//     h̄ · tan θ. A HIGH centre of mass shifts a lot — that is why tall robots
//     tip easily and why batteries go low.
//   - Braking at a (in g) throws the line forward by h̄ · a / cos θ — the same
//     effect as a slope (the robot "feels" gravity tilted).
//   - Tip point: x_p = x̄ − h̄·tan θ + h̄·a / cos θ. It is stable when
//     margin ≤ x_p ≤ wheelbase − margin.
//   (The model assumes the wheels do not slide — a braked robot on a grippy
//   surface. It is exactly the check engineers do first for any mobile robot.)
//
// Frame: x in cm along the chassis, rear wheel contact at x = 0, front wheel
// contact at x = wheelbase. h in cm above the ground.
//
// Pure logic: no React, no DOM.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'

export interface ComItem {
  /** kg, > 0. */
  mass: number
  /** Shown on the item, e.g. "Battery". */
  label: string
  /** One emoji for the item (content only). */
  emoji?: string
}

export interface FixedPart extends ComItem {
  /** Fixed position in cm (x along chassis, h above ground). Use for an arm, a sensor mast, a gripper. */
  x: number
  h: number
}

export interface TiltTest {
  /** Shown in the test list, e.g. "Ramp up". */
  label?: string
  /** Slope in degrees, −45…45. Positive = driving UP (nose up); negative = driving DOWN. */
  slopeDeg: number
  /** Hard braking (moving forward) in g, 0…1. 0.3 g is a firm stop. Omit for none. */
  brakeG?: number
}

export interface Params {
  /** Distance between rear and front wheel contacts, cm (5–200). */
  wheelbaseCm: number
  /** The bare chassis. Its own CoM (x, h) counts too. */
  chassis: { mass: number; x: number; h: number }
  /** Parts already bolted on (0–3). */
  fixed?: FixedPart[]
  /** Parts the child must place — every one of them (a robot needs its battery). 1–4 items. */
  items: ComItem[]
  /**
   * Where things can go: `slots` evenly spaced x positions from `fromCm` to
   * `toCm` (both included; they may overhang beyond the wheels), on each of
   * the shelf heights in `levels` (cm above ground, 1–3 levels).
   * Young bands: 5–7 slots, 1 level. Older: up to 12 slots, 2–3 levels.
   */
  deck: { fromCm: number; toCm: number; slots: number; levels: number[] }
  /** Every test must pass (1–4). Young bands: one slope. Older: up AND down, plus braking. A hidden-by-default "Standing still" (flat, no brake) test is always added unless one is listed — a robot that tips over parked is never right. */
  tests: TiltTest[]
  /** Safety margin: the tip point must stay this many cm inside the wheels (default 0). Engineers: 1–5 cm. */
  minMarginCm?: number
  /** Show the CoM marker and its plumb line while placing (explore). Off = predict, then test. Default on for ages 5–10. */
  liveCom?: boolean
  /** Show the numbers: CoM x/h, tip-point formula and margins. Default on for ages 11+. */
  showMath?: boolean
}

export interface ComPlacement {
  /** Index into Params.items. */
  item: number
  /** Slot index 0..deck.slots−1 (rear to front). */
  slot: number
  /** Index into deck.levels. */
  level: number
}

export interface Answer {
  placed: ComPlacement[]
}

export interface TestResult {
  test: TiltTest
  /** Where the line of gravity meets the ground, cm from the rear wheel. */
  tipPoint: number
  /** Distance inside the nearest wheel (negative = outside = tips). */
  margin: number
  ok: boolean
  /** Which way it would tip if it fails. */
  tips?: 'backward' | 'forward'
  /** True for the built-in "Standing still" test (added when Params.tests has no flat, no-brake test). */
  implicit?: boolean
}

export interface ComResult {
  mass: number
  x: number
  h: number
  /** Every test that must pass: the implicit "Standing still" test first (when added), then Params.tests in order. */
  tests: TestResult[]
}

/** The built-in flat-ground test: a robot that falls over standing still is never correct. */
export const STANDING_STILL: TiltTest = { slopeDeg: 0, label: 'Standing still' }

/** The tests actually run: Params.tests, preceded by "Standing still" unless an explicit flat, no-brake test exists. */
export function allTests(p: Params): { test: TiltTest; implicit: boolean }[] {
  const hasFlat = p.tests.some((t) => t.slopeDeg === 0 && !t.brakeG)
  const out = p.tests.map((t) => ({ test: t, implicit: false }))
  return hasFlat ? out : [{ test: STANDING_STILL, implicit: true }, ...out]
}

const EPS = 1e-9

export function slotX(p: Params, slot: number): number {
  const { fromCm, toCm, slots } = p.deck
  return slots <= 1 ? fromCm : fromCm + ((toCm - fromCm) * slot) / (slots - 1)
}

/** Centre of mass of the whole robot. */
export function centreOfMass(p: Params, a: Answer): { mass: number; x: number; h: number } {
  let m = p.chassis.mass
  let mx = p.chassis.mass * p.chassis.x
  let mh = p.chassis.mass * p.chassis.h
  for (const f of p.fixed ?? []) {
    m += f.mass
    mx += f.mass * f.x
    mh += f.mass * f.h
  }
  for (const pl of a.placed) {
    const it = p.items[pl.item]
    if (!it) continue
    const x = slotX(p, pl.slot)
    const h = p.deck.levels[pl.level] ?? 0
    m += it.mass
    mx += it.mass * x
    mh += it.mass * h
  }
  return { mass: m, x: mx / m, h: mh / m }
}

export function tipPoint(com: { x: number; h: number }, t: TiltTest): number {
  const th = (t.slopeDeg * Math.PI) / 180
  return com.x - com.h * Math.tan(th) + (com.h * (t.brakeG ?? 0)) / Math.cos(th)
}

export function evaluate(p: Params, a: Answer): ComResult {
  const com = centreOfMass(p, a)
  const margin = p.minMarginCm ?? 0
  const tests = allTests(p).map(({ test: t, implicit }) => {
    const x = tipPoint(com, t)
    const m = Math.min(x, p.wheelbaseCm - x)
    const ok = x >= margin - EPS && x <= p.wheelbaseCm - margin + EPS
    const r: TestResult = { test: t, tipPoint: x, margin: m, ok }
    if (implicit) r.implicit = true
    if (!ok) r.tips = x < p.wheelbaseCm / 2 ? 'backward' : 'forward'
    return r
  })
  return { ...com, tests }
}

function shapeProblems(p: Params, a: Answer): string[] {
  if (!a || !Array.isArray(a.placed)) return ['Put the parts on the robot first.']
  const out: string[] = []
  const usedItems = new Set<number>()
  const usedSpots = new Set<string>()
  for (const pl of a.placed) {
    if (!p.items[pl.item]) out.push('That part is not in the tray.')
    if (usedItems.has(pl.item)) out.push('Each part can go in only one place.')
    usedItems.add(pl.item)
    if (!Number.isInteger(pl.slot) || pl.slot < 0 || pl.slot >= p.deck.slots) out.push('Every part must sit in a slot on the deck.')
    if (!Number.isInteger(pl.level) || pl.level < 0 || pl.level >= p.deck.levels.length) out.push('Every part must sit on a shelf.')
    const k = `${pl.slot}:${pl.level}`
    if (usedSpots.has(k)) out.push('Two parts cannot share one slot.')
    usedSpots.add(k)
  }
  if (usedItems.size !== p.items.length) out.push(`Place all ${p.items.length} part${p.items.length === 1 ? '' : 's'} — the robot needs every one.`)
  return out
}

/** Calls `visit` for every legal placement until it returns true. */
function forEachPlacement(p: Params, visit: (a: Answer) => boolean): void {
  const spots: { slot: number; level: number }[] = []
  for (let s = 0; s < p.deck.slots; s++) for (let l = 0; l < p.deck.levels.length; l++) spots.push({ slot: s, level: l })
  const used = new Array<boolean>(spots.length).fill(false)
  const cur: ComPlacement[] = []
  const rec = (i: number): boolean => {
    if (i === p.items.length) return visit({ placed: [...cur] })
    for (let k = 0; k < spots.length; k++) {
      if (used[k]) continue
      used[k] = true
      cur.push({ item: i, ...spots[k] })
      const stop = rec(i + 1)
      cur.pop()
      used[k] = false
      if (stop) return true
    }
    return false
  }
  rec(0)
}

/** One placement that passes every test, or null. */
export function findSolution(p: Params): Answer | null {
  let found: Answer | null = null
  forEachPlacement(p, (a) => {
    if (evaluate(p, a).tests.every((t) => t.ok)) {
      found = a
      return true
    }
    return false
  })
  return found
}

function validate(p: Params): string[] {
  const e: string[] = []
  if (!(p.wheelbaseCm >= 5 && p.wheelbaseCm <= 200)) e.push('wheelbaseCm must be 5–200.')
  if (!p.chassis || !(p.chassis.mass > 0) || !(p.chassis.h >= 0)) e.push('chassis needs a positive mass and a height ≥ 0.')
  if ((p.fixed ?? []).length > 3) e.push('fixed: at most 3 parts.')
  for (const f of p.fixed ?? []) if (!(f.mass > 0) || !(f.h >= 0)) e.push(`fixed part ${f.label}: mass > 0 and h ≥ 0.`)
  if (!Array.isArray(p.items) || p.items.length < 1 || p.items.length > 4) e.push('items: 1–4 parts to place.')
  else for (const it of p.items) if (!(it.mass > 0)) e.push(`item ${it.label}: mass must be > 0.`)
  const d = p.deck
  if (!d || !Number.isInteger(d.slots) || d.slots < 2 || d.slots > 12) e.push('deck.slots must be a whole number 2–12.')
  else {
    if (!(d.fromCm < d.toCm)) e.push('deck.fromCm must be less than deck.toCm.')
    if (d.fromCm < -p.wheelbaseCm || d.toCm > 2 * p.wheelbaseCm) e.push('The deck overhangs too far (more than a wheelbase).')
    if (!Array.isArray(d.levels) || d.levels.length < 1 || d.levels.length > 3) e.push('deck.levels: 1–3 shelf heights.')
    else if (d.levels.some((h, i) => !(h > 0) || (i > 0 && h <= d.levels[i - 1]))) e.push('deck.levels must be positive and increasing (lowest shelf first).')
    else if (d.slots * d.levels.length < (p.items?.length ?? 0)) e.push('Not enough slots for all the items.')
  }
  if (!Array.isArray(p.tests) || p.tests.length < 1 || p.tests.length > 4) e.push('tests: 1–4 tilt tests.')
  else
    for (const t of p.tests) {
      if (!(t.slopeDeg >= -45 && t.slopeDeg <= 45)) e.push('Every test slopeDeg must be −45…45.')
      if (t.brakeG !== undefined && !(t.brakeG >= 0 && t.brakeG <= 1)) e.push('brakeG must be 0–1.')
    }
  if (p.minMarginCm !== undefined && !(p.minMarginCm >= 0 && p.minMarginCm < p.wheelbaseCm / 2)) e.push('minMarginCm must be ≥ 0 and under half the wheelbase.')
  if (e.length) return e
  // Search size guard: placements = spots × (spots−1) × … per item.
  const spots = d.slots * d.levels.length
  let n = 1
  for (let i = 0; i < p.items.length; i++) n *= spots - i
  if (n > 2_000_000) e.push('Too many placements to check: fewer slots, levels or items.')
  if (e.length) return e
  let good = 0
  let bad = 0
  forEachPlacement(p, (a) => {
    if (evaluate(p, a).tests.every((t) => t.ok)) good++
    else bad++
    return good > 0 && bad > 0
  })
  if (good === 0) e.push('Unsolvable: no placement passes every tilt test.')
  else if (bad === 0) e.push('Trivial: every placement passes, so where things go does not matter.')
  return e
}

const r1 = (n: number) => Math.round(n * 10) / 10

function testName(t: TiltTest): string {
  if (t.label) return `the “${t.label}” test`
  const slope = t.slopeDeg === 0 ? 'flat ground' : `a ${Math.abs(t.slopeDeg)}° ${t.slopeDeg > 0 ? 'climb' : 'descent'}`
  return t.brakeG ? `a hard stop (${t.brakeG} g) on ${slope}` : slope
}

function check(p: Params, a: Answer): CheckResult {
  const shape = shapeProblems(p, a)
  if (shape.length) return { correct: false, score: 0, feedback: shape[0] }
  const r = evaluate(p, a)
  const passed = r.tests.filter((t) => t.ok).length
  // Numbers and the tan/brake reasoning only when the activity shows the maths (ages 11+);
  // young children get what happened and what to do.
  const maths = p.showMath === true
  const where = maths ? `The balance point (centre of mass) is ${r1(r.x)} cm from the back wheel and ${r1(r.h)} cm off the ground. ` : ''
  const marginNote = (p.minMarginCm ?? 0) > 0 ? ` (with a ${p.minMarginCm} cm safety margin)` : ''
  if (passed === r.tests.length) {
    const tight = r.tests.reduce((m, t) => (t.margin < m.margin ? t : m), r.tests[0])
    return {
      correct: true,
      score: 1,
      feedback: maths
        ? `${where}On every test the line straight down from it lands between the wheels${marginNote} — closest call: ${r1(tight.margin)} cm inside on ${testName(
            tight.test,
          )}. Heavy parts low and between the wheels keep a robot on its feet.`
        : `It stays on its wheels! The balance point stays between the wheels on every test.`,
    }
  }
  const f = r.tests.find((t) => !t.ok) as TestResult
  const wheel = f.tips === 'backward' ? 'back' : 'front'
  const move = f.tips === 'backward' ? 'forward' : 'backward'
  const causes: string[] = []
  if (f.test.slopeDeg !== 0) causes.push(`the slope shifts it ${f.test.slopeDeg > 0 ? 'back' : 'forward'} by height × tan(angle)`)
  if (f.test.brakeG) causes.push('braking throws it forward')
  const why = causes.length ? ` (${causes.join(', and ')} — the higher the balance point, the bigger the shift)` : ''
  if (f.implicit && f.margin < 0)
    return {
      correct: false,
      score: Math.round((passed / r.tests.length) * 0.8 * 100) / 100,
      feedback: maths
        ? `${where}That is ${r1(-f.margin)} cm past the ${wheel} wheel, so the robot tips ${f.tips} just standing still. Move heavy parts ${move} so the balance point sits between the wheels.`
        : `It tips over ${f.tips} just standing still — the balance point is past the ${wheel} wheel. Move the heavy parts ${move}, between the wheels.`,
    }
  const lands =
    f.margin >= 0
      ? `lands only ${r1(f.margin)} cm inside the ${wheel} wheel — less than the ${p.minMarginCm} cm safety margin${why}, so it is too close to tipping ${f.tips}`
      : `lands ${r1(-f.margin)} cm past the ${wheel} wheel${why}, so it tips ${f.tips}`
  return {
    correct: false,
    score: Math.round((passed / r.tests.length) * 0.8 * 100) / 100,
    feedback: maths
      ? `${where}On ${testName(f.test)} the line straight down from it ${lands}. Move heavy parts ${move}, or lower — a low balance point barely shifts.`
      : `It tips ${f.tips} on ${testName(f.test)}. Move the heavy parts ${move}${p.deck.levels.length > 1 ? ', or lower' : ''} so the balance point stays between the wheels.`,
  }
}

export const logic: TemplateLogic<Params, Answer> = {
  id: 'centre-of-mass',
  name: 'Centre of Mass',
  validate,
  check,
}
