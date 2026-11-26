// components/kids/activities/templates/flowchart-builder/logic.ts
// flowchart-builder — complete a robot's flowchart (actions + decisions, with
// loops) so it does the right thing in EVERY test situation.
//
// The author draws a flowchart skeleton: start, end, arrows, and some boxes
// left empty (slots). The child fills each slot with a card from the tray
// (an action like "Drive forward" or a decision like "Wall closer than 20 cm?"),
// can swap a decision's yes/no arrows when allowed, and then runs the chart on
// test cases. Each test case is a situation with sensor readings over time;
// the flowchart is executed step by step (a token moves along the arrows) and
// the robot's variables at the end must match what the case expects.
//
// Time model: every action card advances time by one tick (unless `tick:
// false`). A sensor listed in a case reads `series[min(tick, length − 1)]`, so
// a loop like "drive forward until the wall is close" really ends.
//
// Difficulty ladder (ages 5 → 17):
//   Explorers  one fixed decision, 2 action slots, 2 cases, 1 distractor card.
//   Builders   a decision slot + 2 action slots and a loop (drive until …),
//              2–3 cases.
//   Inventors  2 decisions (nested or else-if), counters (add), 3–4 cases,
//              allowSwap.
//   Engineers  priorities (battery before obstacles), loops with counters,
//              4–6 cases, several distractors that pass SOME cases.
//
// Pure TypeScript: no React, no DOM.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'

export type Value = number | boolean | string

export interface Effect {
  /** Variable to change. */
  var: string
  /** Set it to this value… */
  set?: Value
  /** …or add this number to it. */
  add?: number
}

export interface Test {
  /** A variable or a sensor (a key of a case's `sensors`). */
  var: string
  op: '<' | '<=' | '>' | '>=' | '==' | '!='
  value: Value
}

export interface Card {
  /** Unique id. */
  id: string
  kind: 'action' | 'decision'
  /** What the child reads on the card. Actions: verbs ("Drive forward 10 cm"). Decisions: questions ("Wall closer than 20 cm?"). ≤ 30 chars. */
  label: string
  /** Optional emoji shown on the card. */
  icon?: string
  /** action: what it changes. */
  effects?: Effect[]
  /** action: does it take a moment of time (advance sensor readings)? Default true. */
  tick?: boolean
  /** decision: the question as a test. */
  test?: Test
}

export interface FlowNode {
  /** Unique id. */
  id: string
  kind: 'start' | 'end' | 'action' | 'decision'
  /** Grid position [column, row]; columns 0–3, rows 0–9. Arrows are routed automatically. */
  at: [number, number]
  /** A fixed card (scaffolding) for action/decision nodes. Leave out to make the node a slot the child fills. */
  card?: string
  /** start/action: the node after this one. */
  next?: string
  /** decision: where "yes" goes. */
  yes?: string
  /** decision: where "no" goes. */
  no?: string
  /** start/end: caption (default "Start" / "End"). */
  label?: string
}

export interface TestCase {
  /** Shown on the case tab: "Wall far away", "Battery low". ≤ 28 chars. */
  name: string
  /** Sensor readings over time: reading at tick t is series[min(t, length − 1)]. */
  sensors?: Record<string, Value[]>
  /** Starting variable values for this case (merged over Params.vars). */
  vars?: Record<string, Value>
  /** Variables that must have these values when the robot reaches End. */
  expect: Record<string, Value>
  /** Optional: the End node it must finish at (when a chart has several ends). */
  expectEnd?: string
}

export interface Params {
  nodes: FlowNode[]
  /** Every card: the ones used by fixed nodes AND the tray the child picks from. */
  cards: Card[]
  /** 1–6 situations the chart must handle. */
  cases: TestCase[]
  /** Starting variables for every case. */
  vars?: Record<string, Value>
  /** Friendly names for variables and sensors ({ driven: 'Distance driven (cm)' }). */
  varLabels?: Record<string, string>
  /** Let the child swap yes/no on decision nodes (default false). */
  allowSwap?: boolean
  /** Step limit before a run counts as an endless loop (default 80, max 300). */
  maxSteps?: number
  /** Cards that may be placed in slots. Default: every card not used by a fixed node, plus those used by fixed nodes. */
  tray?: string[]
}

export interface Answer {
  /** slot node id → card id */
  slots: Record<string, string>
  /** decision node ids whose yes/no arrows the child swapped (only with allowSwap). */
  swapped?: string[]
}

// ── Simulation ────────────────────────────────────────────────────────────

export interface Step {
  node: string
  /** Variables + sensor readings visible at this step. */
  state: Record<string, Value>
  tick: number
  /** decision answer at this step. */
  answer?: boolean
}

export type Outcome = 'end' | 'loop' | 'empty' | 'error'

export interface RunResult {
  outcome: Outcome
  steps: Step[]
  vars: Record<string, Value>
  end?: string
  /** For 'empty': the slot that was empty. */
  at?: string
}

export const slotIds = (p: Params) => p.nodes.filter((n) => (n.kind === 'action' || n.kind === 'decision') && !n.card).map((n) => n.id)

export function trayOf(p: Params): Card[] {
  if (p.tray?.length) return p.cards.filter((c) => p.tray?.includes(c.id))
  return p.cards
}

function readings(c: TestCase, tick: number): Record<string, Value> {
  const out: Record<string, Value> = {}
  for (const [k, series] of Object.entries(c.sensors ?? {})) if (series.length) out[k] = series[Math.min(tick, series.length - 1)]
  return out
}

function compareVals(a: Value | undefined, op: Test['op'], b: Value): boolean {
  if (a === undefined) return false
  switch (op) {
    case '==': return a === b
    case '!=': return a !== b
    default: {
      if (typeof a !== 'number' || typeof b !== 'number') return false
      return op === '<' ? a < b : op === '<=' ? a <= b : op === '>' ? a > b : a >= b
    }
  }
}

export function runCase(p: Params, a: Answer | undefined, c: TestCase): RunResult {
  const nodes = new Map(p.nodes.map((n) => [n.id, n]))
  const cards = new Map(p.cards.map((k) => [k.id, k]))
  const swapped = new Set(p.allowSwap ? a?.swapped ?? [] : [])
  const vars: Record<string, Value> = { ...(p.vars ?? {}), ...(c.vars ?? {}) }
  const steps: Step[] = []
  const max = Math.min(p.maxSteps ?? 80, 300)
  let tick = 0
  let cur = p.nodes.find((n) => n.kind === 'start')
  const snap = () => ({ ...vars, ...readings(c, tick) })
  while (cur) {
    if (steps.length >= max) return { outcome: 'loop', steps, vars }
    const node: FlowNode = cur
    if (node.kind === 'end') {
      steps.push({ node: node.id, state: snap(), tick })
      return { outcome: 'end', steps, vars, end: node.id }
    }
    if (node.kind === 'start') {
      steps.push({ node: node.id, state: snap(), tick })
      cur = nodes.get(node.next ?? '')
      continue
    }
    const cardId = node.card ?? a?.slots?.[node.id]
    const card = cardId ? cards.get(cardId) : undefined
    if (!card || card.kind !== node.kind) {
      steps.push({ node: node.id, state: snap(), tick })
      return { outcome: 'empty', steps, vars, at: node.id }
    }
    if (node.kind === 'action') {
      for (const e of card.effects ?? []) {
        if (e.set !== undefined) vars[e.var] = e.set
        else if (e.add !== undefined) vars[e.var] = (typeof vars[e.var] === 'number' ? (vars[e.var] as number) : 0) + e.add
      }
      if (card.tick !== false) tick++
      steps.push({ node: node.id, state: snap(), tick })
      cur = nodes.get(node.next ?? '')
      continue
    }
    const t = card.test as Test
    const state = snap()
    let ans = compareVals(state[t.var], t.op, t.value)
    steps.push({ node: node.id, state, tick, answer: ans })
    if (swapped.has(node.id)) ans = !ans
    cur = nodes.get((ans ? node.yes : node.no) ?? '')
  }
  return { outcome: 'error', steps, vars }
}

function caseFails(p: Params, c: TestCase, r: RunResult): string | null {
  if (r.outcome !== 'end') return r.outcome
  if (c.expectEnd && r.end !== c.expectEnd) return 'end'
  for (const [k, v] of Object.entries(c.expect)) if (r.vars[k] !== v) return 'vars'
  return null
}

export function passes(p: Params, a: Answer): boolean {
  return p.cases.every((c) => caseFails(p, c, runCase(p, a, c)) === null)
}

// ── validate ───────────────────────────────────────────────────────────────

const MAX_SEARCH = 200_000
const OPS = ['<', '<=', '>', '>=', '==', '!=']
const isVal = (v: unknown) => typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string'

function validate(p: Params): string[] {
  if (!p || typeof p !== 'object') return ['params missing']
  const errs: string[] = []
  if (!Array.isArray(p.nodes) || p.nodes.length < 3 || p.nodes.length > 16) return ['nodes must have 3–16 entries']
  if (!Array.isArray(p.cards) || p.cards.length < 1 || p.cards.length > 12) return ['cards must have 1–12 entries']
  if (!Array.isArray(p.cases) || p.cases.length < 1 || p.cases.length > 6) return ['cases must have 1–6 entries']
  const cardIds = new Set<string>()
  p.cards.forEach((c, i) => {
    if (!c.id || cardIds.has(c.id)) errs.push(`cards[${i}]: missing or duplicate id`)
    cardIds.add(c.id)
    if (c.kind !== 'action' && c.kind !== 'decision') errs.push(`cards[${i}].kind must be action or decision`)
    if (!c.label || c.label.length > 30) errs.push(`cards[${i}].label must be 1–30 characters`)
    if (c.kind === 'action') {
      if (!Array.isArray(c.effects)) errs.push(`cards[${i}] (action) needs effects (may be [])`)
      else c.effects.forEach((e, k) => {
        if (!e.var) errs.push(`cards[${i}].effects[${k}].var missing`)
        if ((e.set === undefined) === (e.add === undefined)) errs.push(`cards[${i}].effects[${k}] needs exactly one of set / add`)
        if (e.set !== undefined && !isVal(e.set)) errs.push(`cards[${i}].effects[${k}].set must be a number, boolean or string`)
        if (e.add !== undefined && typeof e.add !== 'number') errs.push(`cards[${i}].effects[${k}].add must be a number`)
      })
    }
    if (c.kind === 'decision') {
      if (!c.test || !c.test.var || !OPS.includes(c.test.op) || !isVal(c.test.value)) errs.push(`cards[${i}] (decision) needs test { var, op, value }`)
    }
  })
  const ids = new Set<string>()
  const cells = new Set<string>()
  p.nodes.forEach((n, i) => {
    if (!n.id || ids.has(n.id)) errs.push(`nodes[${i}]: missing or duplicate id`)
    ids.add(n.id)
    if (!Array.isArray(n.at) || !Number.isInteger(n.at[0]) || !Number.isInteger(n.at[1]) || n.at[0] < 0 || n.at[0] > 3 || n.at[1] < 0 || n.at[1] > 9) errs.push(`nodes[${i}].at must be [col 0–3, row 0–9]`)
    else {
      const k = `${n.at[0]},${n.at[1]}`
      if (cells.has(k)) errs.push(`nodes[${i}] overlaps another node at ${k}`)
      cells.add(k)
    }
  })
  if (errs.length) return errs
  const starts = p.nodes.filter((n) => n.kind === 'start')
  if (starts.length !== 1) errs.push('there must be exactly one start node')
  if (!p.nodes.some((n) => n.kind === 'end')) errs.push('there must be at least one end node')
  const card = (id: string) => p.cards.find((c) => c.id === id)
  p.nodes.forEach((n) => {
    const need = (k: 'next' | 'yes' | 'no') => {
      const t = n[k]
      if (!t || !ids.has(t)) errs.push(`node "${n.id}" needs ${k} pointing at an existing node`)
      else if (t === n.id) errs.push(`node "${n.id}" points at itself`)
      else if (p.nodes.find((x) => x.id === t)?.kind === 'start') errs.push(`node "${n.id}" points back at start`)
    }
    if (n.kind === 'start' || n.kind === 'action') need('next')
    if (n.kind === 'decision') { need('yes'); need('no') }
    if (n.kind === 'action' || n.kind === 'decision') {
      if (n.card) {
        const c = card(n.card)
        if (!c) errs.push(`node "${n.id}" uses unknown card "${n.card}"`)
        else if (c.kind !== n.kind) errs.push(`node "${n.id}" is a ${n.kind} but card "${n.card}" is a ${c.kind}`)
      }
    } else if (n.card) errs.push(`${n.kind} node "${n.id}" cannot hold a card`)
  })
  const slots = slotIds(p)
  if (!slots.length) errs.push('at least one action/decision node must be a slot (no card)')
  if (p.tray) p.tray.forEach((t) => { if (!cardIds.has(t)) errs.push(`tray has unknown card "${t}"`) })
  const tray = trayOf(p)
  slots.forEach((s) => {
    const kind = p.nodes.find((n) => n.id === s)?.kind
    if (!tray.some((c) => c.kind === kind)) errs.push(`slot "${s}" is a ${kind} but the tray has no ${kind} cards`)
  })
  p.cases.forEach((c, i) => {
    if (!c.name || c.name.length > 28) errs.push(`cases[${i}].name must be 1–28 characters`)
    if (!c.expect || !Object.keys(c.expect).length) errs.push(`cases[${i}] needs at least one expected variable`)
    if (c.expectEnd && p.nodes.find((n) => n.id === c.expectEnd)?.kind !== 'end') errs.push(`cases[${i}].expectEnd must be an end node`)
    for (const [k, s] of Object.entries(c.sensors ?? {})) if (!Array.isArray(s) || !s.length || !s.every(isVal)) errs.push(`cases[${i}].sensors.${k} must be a non-empty array of values`)
  })
  if (p.maxSteps !== undefined && (!Number.isInteger(p.maxSteps) || p.maxSteps < 10 || p.maxSteps > 300)) errs.push('maxSteps must be an integer 10–300')
  if (errs.length) return errs
  // Every node reachable from start?
  const seen = new Set<string>()
  const stack = [starts[0].id]
  while (stack.length) {
    const id = stack.pop() as string
    if (seen.has(id)) continue
    seen.add(id)
    const n = p.nodes.find((x) => x.id === id)
    ;[n?.next, n?.yes, n?.no].forEach((t) => { if (t) stack.push(t) })
  }
  p.nodes.forEach((n) => { if (!seen.has(n.id)) errs.push(`node "${n.id}" cannot be reached from start`) })
  if (errs.length) return errs
  const s = search(p)
  if (s === 'too-big') errs.push('too many combinations to verify — use fewer slots or cards')
  else if (!s.solution) errs.push('no way of filling the slots passes every case — the puzzle is impossible')
  else if (s.passing === s.total) errs.push('every way of filling the slots passes — the cases do not test anything')
  return errs
}

/** Try every filling (and swap set). Exported for tooling. */
export function search(p: Params): { solution: Answer | null; passing: number; total: number } | 'too-big' {
  const slots = slotIds(p)
  const tray = trayOf(p)
  const opts = slots.map((s) => {
    const kind = p.nodes.find((n) => n.id === s)?.kind
    return tray.filter((c) => c.kind === kind).map((c) => c.id)
  })
  const decisions = p.allowSwap ? p.nodes.filter((n) => n.kind === 'decision').map((n) => n.id) : []
  const swapCombos = 1 << decisions.length
  const total = opts.reduce((n, o) => n * o.length, 1) * swapCombos
  if (total > MAX_SEARCH) return 'too-big'
  let solution: Answer | null = null
  let passing = 0
  const idx = opts.map(() => 0)
  for (let n = 0; n < total / swapCombos; n++) {
    const slotsAns = Object.fromEntries(slots.map((s, k) => [s, opts[k][idx[k]]]))
    for (let m = 0; m < swapCombos; m++) {
      const a: Answer = { slots: slotsAns, swapped: decisions.filter((_, k) => (m >> k) & 1) }
      if (passes(p, a)) {
        passing++
        if (!solution) solution = a
      }
    }
    for (let k = 0; k < idx.length; k++) {
      idx[k]++
      if (idx[k] < opts[k].length) break
      idx[k] = 0
    }
  }
  return { solution, passing, total }
}

// ── check ─────────────────────────────────────────────────────────────────

export function fmtVal(v: Value | undefined): string {
  if (v === undefined) return 'nothing'
  if (typeof v === 'boolean') return v ? 'yes' : 'no'
  return String(v)
}

export function nodeLabel(p: Params, a: Answer | undefined, id: string): string {
  const n = p.nodes.find((x) => x.id === id)
  if (!n) return id
  if (n.kind === 'start') return n.label ?? 'Start'
  if (n.kind === 'end') return n.label ?? 'End'
  const cid = n.card ?? a?.slots?.[n.id]
  return p.cards.find((c) => c.id === cid)?.label ?? 'empty box'
}

/** "Start → Wall closer than 20 cm? (no) → Drive forward → … → End", loops shortened. */
export function pathText(p: Params, a: Answer | undefined, r: RunResult, limit = 9): string {
  const parts = r.steps.map((s) => `${nodeLabel(p, a, s.node)}${s.answer === undefined ? '' : s.answer ? ' (yes)' : ' (no)'}`)
  if (parts.length <= limit) return parts.join(' → ')
  return [...parts.slice(0, limit - 3), '…', ...parts.slice(-2)].join(' → ')
}

function check(p: Params, a: Answer): CheckResult {
  const slots = slotIds(p)
  const tray = trayOf(p)
  const empty = slots.filter((s) => !a?.slots?.[s])
  if (empty.length) return { correct: false, score: 0, feedback: `${empty.length === 1 ? 'One box' : `${empty.length} boxes`} in the flowchart ${empty.length === 1 ? 'is' : 'are'} still empty. Every box needs a card so the robot knows what to do there.` }
  for (const s of slots) {
    const kind = p.nodes.find((n) => n.id === s)?.kind
    const c = tray.find((x) => x.id === a.slots[s])
    if (!c) return { correct: false, score: 0, feedback: 'One of those cards is not in the tray. Use the cards you were given.' }
    if (c.kind !== kind) return { correct: false, score: 0, feedback: `“${c.label}” is ${c.kind === 'decision' ? 'a question' : 'an action'}, so it belongs in a ${c.kind === 'decision' ? 'diamond' : 'rectangle'} box.` }
  }
  const label = (k: string) => p.varLabels?.[k] ?? k
  let passed = 0
  let firstFail: { c: TestCase; r: RunResult; why: string } | null = null
  for (const c of p.cases) {
    const r = runCase(p, a, c)
    const why = caseFails(p, c, r)
    if (why === null) passed++
    else if (!firstFail) firstFail = { c, r, why }
  }
  if (!firstFail) {
    return {
      correct: true,
      score: 1,
      feedback: `Your flowchart passed all ${p.cases.length} test ${p.cases.length === 1 ? 'case' : 'cases'}. Engineers sketch flowcharts like this before writing code, then test them on every situation they can think of.`,
    }
  }
  const { c, r, why } = firstFail
  const score = (passed / p.cases.length) * 0.9
  const lead = passed ? `${passed} of ${p.cases.length} tests pass. ` : ''
  if (why === 'loop') {
    const decisions = r.steps.filter((s) => s.answer !== undefined)
    const last = decisions[decisions.length - 1]
    const q = last ? ` The question “${nodeLabel(p, a, last.node)}” kept answering ${last.answer ? 'yes' : 'no'}.` : ''
    return { correct: false, score, feedback: `${lead}In “${c.name}” the robot went round and round and never reached the end.${q} A loop needs a way out — check which arrow should lead to the end.` }
  }
  if (why === 'empty' || why === 'error') return { correct: false, score, feedback: `${lead}In “${c.name}” the robot got stuck at ${nodeLabel(p, a, r.at ?? '')}.` }
  if (why === 'end') return { correct: false, score, feedback: `${lead}In “${c.name}” the robot finished at “${nodeLabel(p, a, r.end ?? '')}” but should finish at “${nodeLabel(p, a, c.expectEnd ?? '')}”. It went: ${pathText(p, a, r)}.` }
  const [k, want] = Object.entries(c.expect).find(([key, v]) => r.vars[key] !== v) as [string, Value]
  return {
    correct: false,
    score,
    feedback: `${lead}In “${c.name}”, ${label(k)} ended as ${fmtVal(r.vars[k])} but should be ${fmtVal(want)}. The robot went: ${pathText(p, a, r)}. Which box sent it the wrong way?`,
  }
}

export const logic: TemplateLogic<Params, Answer> = {
  id: 'flowchart-builder',
  name: 'Flowchart builder',
  validate,
  check,
}
