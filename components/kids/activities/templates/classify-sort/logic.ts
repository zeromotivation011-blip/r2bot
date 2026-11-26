// components/kids/activities/templates/classify-sort/logic.ts
// CLASSIFY & SORT — the first idea of machine learning: things can be sorted by
// their FEATURES (measurable properties), and a robot sorts by a RULE built
// from those features.
//
// Two stages, chosen by `mode`:
//   'sort' — the child sorts example cards into bins by hand (younger bands).
//   'rule' — the child builds the robot's rule: pick ONE feature and a
//            threshold (numbers) or a value (words), and which bin each side
//            goes to. The robot then sorts the examples AND new cards it has
//            never seen (the test set). This is a one-level decision tree
//            (a "decision stump") — the building block of real decision trees
//            and random forests.
//   'both' — sort by hand first, then build the rule.
//
// Real ideas taught: features, labels, training vs. test data, a rule that is
// perfect on the examples can still fail on new data, and some features are
// useless for a job (colour does not tell you if a robot can swim).
//
// Pure logic: no React, no DOM.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'

export interface Category {
  /** kebab-case id, unique in the activity. */
  id: string
  /** Bin label, e.g. "Recycle", "Can fly". */
  label: string
  /** Emoji shown on the bin. */
  icon: string
}

export interface Feature {
  /** Key used in every item's `features` map. */
  key: string
  /** Shown to the child, e.g. "Weight". */
  label: string
  /** 'number' → threshold rules; 'word' → equals-value rules. */
  kind: 'number' | 'word'
  /** Unit for numbers, e.g. "g", "cm". */
  unit?: string
}

export interface Item {
  id: string
  /** Short name on the card, e.g. "Glass bottle". */
  label: string
  /** Emoji (or 1–2 characters) shown big on the card. */
  icon: string
  /** One value per feature key. Numbers for 'number' features, strings for 'word'. */
  features: Record<string, number | string>
  /** The TRUE category id (the label a human would give it). */
  category: string
  /** Optional one-line reason shown when it is sorted wrongly ("Glass is not magnetic, so…"). */
  why?: string
}

export interface Params {
  /** The job, one sentence: "Teach the recycling robot to sort the bin." */
  task: string
  /** 2–4 bins. Rule mode needs exactly 2. */
  categories: Category[]
  /** Features printed on each card. 1–5. In 'sort' mode for ages 5–7 you may give 1 obvious feature. */
  features: Feature[]
  /** Training examples (shown to the child). 3–16. */
  items: Item[]
  /**
   * New cards the robot must sort with the child's rule (rule/both modes).
   * Hidden until the test runs — like real held-out test data. 0–10.
   */
  testItems?: Item[]
  /** 'sort' (by hand), 'rule' (build a rule), 'both' (hand sort, then rule). */
  mode: 'sort' | 'rule' | 'both'
  /** Print feature values on the cards in sort mode (default true). Off = sort by looking at icon + name only. */
  showFeatures?: boolean
  /** Hand-sort mistakes allowed (default 0). */
  allowedMistakes?: number
  /**
   * Rule mode: fraction of ALL cards (examples + test) the rule must sort
   * correctly, 0.5–1. Below 1 when the data is deliberately noisy (ages 14+:
   * no single feature is perfect — find the best one).
   */
  minAccuracy?: number
}

/** The robot's rule: one feature, one split. */
export interface Rule {
  feature: string
  /** For numbers: values ABOVE this go to `ifTrue`. */
  threshold?: number
  /** For words: values EQUAL to this go to `ifTrue`. */
  equals?: string
  ifTrue: string
  ifFalse: string
}

export interface Answer {
  /** Hand sort: item id → category id. Required in 'sort' and 'both'. */
  placements?: Record<string, string>
  /** Rule mode: the robot's rule. Required in 'rule' and 'both'. */
  rule?: Rule
}

export function applyRule(rule: Rule, item: Item): string {
  const v = item.features[rule.feature]
  let yes: boolean
  if (typeof v === 'number') yes = rule.threshold !== undefined && v > rule.threshold
  else yes = rule.equals !== undefined && String(v) === rule.equals
  return yes ? rule.ifTrue : rule.ifFalse
}

export interface RuleRun {
  train: { item: Item; got: string; ok: boolean }[]
  test: { item: Item; got: string; ok: boolean }[]
  accuracy: number
  trainAccuracy: number
  testAccuracy: number
}

export function runRule(p: Params, rule: Rule): RuleRun {
  const train = p.items.map((item) => {
    const got = applyRule(rule, item)
    return { item, got, ok: got === item.category }
  })
  const test = (p.testItems ?? []).map((item) => {
    const got = applyRule(rule, item)
    return { item, got, ok: got === item.category }
  })
  const all = [...train, ...test]
  const acc = (xs: { ok: boolean }[]) => (xs.length ? xs.filter((x) => x.ok).length / xs.length : 1)
  return { train, test, accuracy: acc(all), trainAccuracy: acc(train), testAccuracy: acc(test) }
}

/** Candidate thresholds for a numeric feature: midpoints between distinct sorted values of the examples. */
export function thresholdsFor(p: Params, key: string): number[] {
  const vs = Array.from(new Set(p.items.map((i) => i.features[key]).filter((v): v is number => typeof v === 'number'))).sort((a, b) => a - b)
  const out: number[] = []
  for (let i = 1; i < vs.length; i++) out.push((vs[i - 1] + vs[i]) / 2)
  return out
}

export function wordValues(p: Params, key: string): string[] {
  return Array.from(new Set([...p.items, ...(p.testItems ?? [])].map((i) => i.features[key]).filter((v): v is string => typeof v === 'string'))).sort()
}

/** The best one-feature rule (what a real decision-stump learner would pick). */
export function bestRule(p: Params): { rule: Rule; run: RuleRun } | null {
  if (p.categories.length !== 2) return null
  const [a, b] = p.categories.map((c) => c.id)
  let best: { rule: Rule; run: RuleRun } | null = null
  const consider = (rule: Rule) => {
    const run = runRule(p, rule)
    if (!best || run.accuracy > best.run.accuracy + 1e-9) best = { rule, run }
  }
  for (const f of p.features) {
    if (f.kind === 'number') for (const t of thresholdsFor(p, f.key)) for (const [x, y] of [[a, b], [b, a]]) consider({ feature: f.key, threshold: t, ifTrue: x, ifFalse: y })
    else for (const w of wordValues(p, f.key)) for (const [x, y] of [[a, b], [b, a]]) consider({ feature: f.key, equals: w, ifTrue: x, ifFalse: y })
  }
  return best
}

const needsSort = (p: Params) => p.mode === 'sort' || p.mode === 'both'
const needsRule = (p: Params) => p.mode === 'rule' || p.mode === 'both'

function validate(p: Params): string[] {
  const out: string[] = []
  if (!p || !Array.isArray(p.categories) || !Array.isArray(p.items) || !Array.isArray(p.features)) return ['categories, features and items are required']
  if (!p.task?.trim()) out.push('task is required')
  if (!['sort', 'rule', 'both'].includes(p.mode)) out.push("mode must be 'sort', 'rule' or 'both'")
  if (p.categories.length < 2 || p.categories.length > 4) out.push('categories: 2–4')
  if (needsRule(p) && p.categories.length !== 2) out.push('rule mode needs exactly 2 categories (one split)')
  const catIds = new Set(p.categories.map((c) => c.id))
  if (catIds.size !== p.categories.length) out.push('category ids must be unique')
  if (p.features.length < 1 || p.features.length > 5) out.push('features: 1–5')
  const fKeys = new Set(p.features.map((f) => f.key))
  if (fKeys.size !== p.features.length) out.push('feature keys must be unique')
  if (p.items.length < 3 || p.items.length > 16) out.push('items: 3–16')
  const tests = p.testItems ?? []
  if (tests.length > 10) out.push('testItems: at most 10')
  const ids = new Set<string>()
  for (const it of [...p.items, ...tests]) {
    if (ids.has(it.id)) out.push(`duplicate item id ${it.id}`)
    ids.add(it.id)
    if (!catIds.has(it.category)) out.push(`item ${it.id}: unknown category ${it.category}`)
    for (const f of p.features) {
      const v = it.features?.[f.key]
      if (f.kind === 'number' && (typeof v !== 'number' || !Number.isFinite(v))) out.push(`item ${it.id}: feature ${f.key} must be a number`)
      if (f.kind === 'word' && (typeof v !== 'string' || !v.trim())) out.push(`item ${it.id}: feature ${f.key} must be a word`)
    }
  }
  for (const c of p.categories) if (!p.items.some((i) => i.category === c.id)) out.push(`category ${c.id} has no example item`)
  if (p.allowedMistakes !== undefined && !(Number.isInteger(p.allowedMistakes) && p.allowedMistakes >= 0 && p.allowedMistakes < p.items.length / 2))
    out.push('allowedMistakes: integer ≥ 0 and below half the items')
  const minAcc = p.minAccuracy ?? 1
  if (!(minAcc >= 0.5 && minAcc <= 1)) out.push('minAccuracy: 0.5–1')
  if (needsRule(p) && tests.length === 0) out.push('rule mode needs testItems (new cards to prove the rule works)')
  if (out.length) return out
  if (needsRule(p)) {
    const b = bestRule(p)
    if (!b || b.run.accuracy + 1e-9 < minAcc)
      out.push(`no single-feature rule reaches minAccuracy ${minAcc} (best is ${b ? Math.round(b.run.accuracy * 100) : 0} %) — fix the data or lower minAccuracy`)
  }
  return out
}

const pct = (x: number) => `${Math.round(x * 100)} %`

function check(p: Params, a: Answer): CheckResult {
  const catLabel = (id: string) => p.categories.find((c) => c.id === id)?.label ?? id
  if (needsSort(p)) {
    const pl = a?.placements ?? {}
    const missing = p.items.filter((i) => !pl[i.id])
    if (missing.length) return { correct: false, score: 0, feedback: `${missing.length} card${missing.length === 1 ? ' is' : 's are'} not in a bin yet. Sort every card first.` }
    const wrong = p.items.filter((i) => pl[i.id] !== i.category)
    if (wrong.length > (p.allowedMistakes ?? 0)) {
      const w = wrong[0]
      const reason = w.why ?? `look at its ${p.features.map((f) => f.label.toLowerCase()).join(' and ')} again`
      return {
        correct: false,
        score: (p.items.length - wrong.length) / p.items.length,
        feedback: `${wrong.length} card${wrong.length === 1 ? ' is' : 's are'} in the wrong bin. “${w.label}” belongs in “${catLabel(w.category)}”, not “${catLabel(pl[w.id])}”: ${reason}.`,
      }
    }
    if (!needsRule(p))
      return {
        correct: true,
        score: 1,
        feedback: `Every card is in the right bin! You looked at each thing’s features and gave it a label. Robots learn from exactly this: examples that humans have labelled.`,
      }
  }
  const rule = a?.rule
  const f = rule ? p.features.find((x) => x.key === rule.feature) : undefined
  if (!rule || !f) return { correct: false, score: 0, feedback: 'Build the robot’s rule first: pick a feature to look at.' }
  if (f.kind === 'number' && !Number.isFinite(rule.threshold)) return { correct: false, score: 0, feedback: `Set a threshold for ${f.label.toLowerCase()}.` }
  if (f.kind === 'word' && !rule.equals) return { correct: false, score: 0, feedback: `Pick which ${f.label.toLowerCase()} the rule looks for.` }
  if (rule.ifTrue === rule.ifFalse) return { correct: false, score: 0.2, feedback: 'Both sides of your rule go to the same bin, so the robot would put everything in one place. Send each side to a different bin.' }
  const run = runRule(p, rule)
  const minAcc = p.minAccuracy ?? 1
  const best = bestRule(p)
  const desc =
    f.kind === 'number'
      ? `${f.label} above ${Math.round((rule.threshold ?? 0) * 100) / 100}${f.unit ? ' ' + f.unit : ''} → ${catLabel(rule.ifTrue)}`
      : `${f.label} is “${rule.equals}” → ${catLabel(rule.ifTrue)}`
  if (run.accuracy + 1e-9 >= minAcc) {
    const perfect = run.accuracy > 0.999
    const bestNote = !perfect && best && run.accuracy + 1e-9 >= best.run.accuracy ? ' That is as good as any one-feature rule can do on this data — real data is messy.' : ''
    return {
      correct: true,
      score: 1,
      feedback: `Your rule “${desc}” sorted ${pct(run.trainAccuracy)} of the examples and ${pct(run.testAccuracy)} of the NEW cards it had never seen. A rule that works on new data has really learned something.${bestNote}`,
    }
  }
  const badTest = run.test.find((r) => !r.ok)
  const badTrain = run.train.find((r) => !r.ok)
  let why: string
  if (run.trainAccuracy > 0.999 && badTest)
    why = `It was perfect on the examples, but on the new card “${badTest.item.label}” it said ${catLabel(badTest.got)}. A rule can fit the examples and still be the wrong idea — try a feature that really explains the difference.`
  else if (badTrain) {
    const v = badTrain.item.features[rule.feature]
    why = `“${badTrain.item.label}” has ${f.label.toLowerCase()} ${typeof v === 'number' ? `${v}${f.unit ? ' ' + f.unit : ''}` : `“${v}”`}, so your rule sent it to ${catLabel(badTrain.got)} — but it belongs in ${catLabel(badTrain.item.category)}. ${
      f.kind === 'number' ? 'Move the threshold, or try a different feature.' : 'Maybe this feature does not decide it at all — try another one.'
    }`
  } else why = 'Try a different feature or threshold.'
  return { correct: false, score: Math.max(0, Math.min(0.95, run.accuracy)), feedback: `Your rule sorted ${pct(run.accuracy)} correctly (needed ${pct(minAcc)}). ${why}` }
}

export const logic: TemplateLogic<Params, Answer> = { id: 'classify-sort', name: 'Classify & sort', validate, check }
