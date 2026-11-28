// components/kids/activities/templates/number-box/logic.ts
// NUMBER BOX — a variable for ages 5–7, as a picture puzzle. A robot keeps a
// box (a backpack, a basket, a battery) that holds ONE number. Picture cards
// change it, one after another:
//   ➕ "Put in 2"                 the number goes up
//   ➖ "Take out 1"               the number goes down
//   🔄 "Empty it, then put in 3"  the old number is gone; the box now holds 3
// That is exactly what a variable is: a named place that remembers one value,
// where every new instruction changes (or replaces) what is inside.
//
// Three kinds of question:
//   end      what is in the box after the last card? (tap a number picture)
//   trace    show the box after EVERY card (− / + steppers), like a computer
//   missing  which card goes in the gap so the box ends with the right number?
//
// Numbers stay 0–10 so every value can be drawn as that many pictures (no
// reading or counting past ten needed). Pure logic: no React, no DOM.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'

export type Op = 'add' | 'take' | 'set'

export interface Card {
  op: Op
  /** 0–10. For 'set' this is the new number; for add/take how many go in or out. */
  n: number
}

export interface Params {
  /** What the box holds, drawn once per unit: e.g. { icon: '⭐', one: 'star', many: 'stars' }. */
  thing: { icon: string; one: string; many: string }
  /** The box itself, a picture label: e.g. { icon: '🎒', name: 'backpack' }. */
  box: { icon: string; name: string }
  /** How many are in the box before the first card (0–10). */
  start: number
  /** The cards, in order (1–4). For 'missing' the card at `gap` is the hidden right answer. */
  cards: Card[]
  ask:
    | { kind: 'end'; /** 3–4 distinct number choices, one of them right. */ options: number[] }
    | { kind: 'trace' }
    | { kind: 'missing'; gap: number; /** 3 cards to try in the gap; exactly one lands on the same end number. */ options: Card[] }
}

export interface Answer {
  /** end: the number chosen. */
  value?: number
  /** trace: the box after each card. */
  values?: number[]
  /** missing: index into ask.options. */
  option?: number
}

/** The biggest number a box can hold (one picture per unit). */
export const BOX_MAX = 10

export function applyCard(v: number, c: Card): number {
  if (c.op === 'add') return v + c.n
  if (c.op === 'take') return v - c.n
  return c.n
}

/** The box after each card. */
export function runCards(start: number, cards: Card[]): number[] {
  const out: number[] = []
  let v = start
  for (const c of cards) {
    v = applyCard(v, c)
    out.push(v)
  }
  return out
}

/** "star" or "stars". */
export function count(p: Pick<Params, 'thing'>, n: number): string {
  return `${n} ${n === 1 ? p.thing.one : p.thing.many}`
}

/** Short words for a card (shown on it and spoken). */
export function cardWords(c: Card): string {
  if (c.op === 'add') return `Put in ${c.n}`
  if (c.op === 'take') return `Take out ${c.n}`
  return c.n === 0 ? 'Empty it' : `Empty it, then put in ${c.n}`
}

export const CARD_ICON: Record<Op, string> = { add: '➕', take: '➖', set: '🔄' }

const inRange = (n: number) => Number.isInteger(n) && n >= 0 && n <= BOX_MAX
const validCard = (c: Card | undefined) => !!c && (c.op === 'add' || c.op === 'take' || c.op === 'set') && inRange(c.n) && (c.op === 'set' || c.n > 0)
const sameCard = (a: Card, b: Card) => a.op === b.op && a.n === b.n

/** The end number when `card` sits in the gap, or null if the box would go below 0 or above BOX_MAX. */
export function endWith(p: Params, gap: number, card: Card): number | null {
  const cards = p.cards.map((c, i) => (i === gap ? card : c))
  const vals = runCards(p.start, cards)
  return vals.every(inRange) ? vals[vals.length - 1] : null
}

function validate(p: Params): string[] {
  const out: string[] = []
  if (!p) return ['params are required']
  if (!p.thing?.icon || !p.thing.one?.trim() || !p.thing.many?.trim()) out.push('thing needs icon, one and many')
  if (!p.box?.icon || !p.box.name?.trim()) out.push('box needs icon and name')
  if (!inRange(p.start)) out.push(`start must be a whole number 0–${BOX_MAX}`)
  if (!Array.isArray(p.cards) || p.cards.length < 1 || p.cards.length > 4) return [...out, 'cards: 1–4']
  p.cards.forEach((c, i) => {
    if (!validCard(c)) out.push(`card ${i + 1}: op add/take/set, n 0–${BOX_MAX} (add/take need n ≥ 1)`)
  })
  if (out.length) return out
  const vals = runCards(p.start, p.cards)
  vals.forEach((v, i) => {
    if (!inRange(v)) out.push(`after card ${i + 1} the box holds ${v}: keep every value 0–${BOX_MAX}`)
  })
  if (out.length) return out
  const end = vals[vals.length - 1]
  const a = p.ask
  if (!a) return ['ask is required']
  if (a.kind === 'end') {
    const o = a.options ?? []
    if (o.length < 3 || o.length > 4) out.push('end: 3–4 options')
    if (new Set(o).size !== o.length) out.push('end: options must be different')
    if (!o.every(inRange)) out.push(`end: options must be 0–${BOX_MAX}`)
    if (!o.includes(end)) out.push(`end: options must include the right answer ${end}`)
  } else if (a.kind === 'trace') {
    if (p.cards.length < 2) out.push('trace: at least 2 cards')
  } else if (a.kind === 'missing') {
    if (!Number.isInteger(a.gap) || a.gap < 0 || a.gap >= p.cards.length) out.push('missing: gap must point at a card')
    const o = a.options ?? []
    if (o.length !== 3) out.push('missing: exactly 3 options')
    if (!o.every(validCard)) out.push('missing: every option must be a valid card')
    if (!out.length) {
      if (!o.some((c) => sameCard(c, p.cards[a.gap]))) out.push('missing: the hidden card must be one of the options')
      const hits = o.filter((c) => endWith(p, a.gap, c) === end)
      if (hits.length !== 1) out.push(`missing: exactly one option must end on ${end} (${hits.length} do)`)
      o.forEach((c, i) => {
        if (endWith(p, a.gap, c) === null) out.push(`missing: option ${i + 1} would take the box below 0 or above ${BOX_MAX}`)
      })
    }
  } else out.push('ask.kind must be end, trace or missing')
  return out
}

/** "Start: 2. Put in 3 makes 5. Take out 1 makes 4." — for the right-answer feedback. */
function trail(p: Params, cards: Card[] = p.cards): string {
  const vals = runCards(p.start, cards)
  return [`The ${p.box.name} started with ${count(p, p.start)}.`, ...cards.map((c, i) => `${cardWords(c)}: now ${vals[i]}.`)].join(' ')
}

function check(p: Params, a: Answer): CheckResult {
  const vals = runCards(p.start, p.cards)
  const end = vals[vals.length - 1]
  const ask = p.ask

  if (ask.kind === 'end') {
    const v = a?.value
    if (typeof v !== 'number') return { correct: false, score: 0, feedback: `Tap a number to say what is in the ${p.box.name} at the end.` }
    if (v === end) return { correct: true, score: 1, feedback: `Yes, ${count(p, end)}! ${trail(p)} The ${p.box.name} remembers one number, and every card changes it.` }
    const naive = p.start + p.cards.reduce((s, c) => s + (c.op === 'take' ? -c.n : c.n), 0)
    const last = p.cards[p.cards.length - 1]
    let tip: string
    if (p.cards.some((c) => c.op === 'set') && v === naive) tip = 'Look at the “empty it” card: it tips out everything first. Nothing old stays.'
    else if (v === p.start) tip = `The ${p.box.name} does not stay the same: every card changes what is inside. Follow the cards one by one.`
    else if (last.op !== 'set' && v === last.n) tip = `That is the number on the last card, but the ${p.box.name} already had some inside before that card.`
    else tip = `Start with ${count(p, p.start)} in the ${p.box.name}. What does the first card do to it? Then do the next card.`
    return { correct: false, score: 0, feedback: `Not ${v} yet. ${tip}` }
  }

  if (ask.kind === 'trace') {
    const got = a?.values ?? []
    if (got.length !== vals.length || got.some((x) => typeof x !== 'number')) return { correct: false, score: 0, feedback: `Show the ${p.box.name} after every card first.` }
    const firstWrong = vals.findIndex((v, i) => got[i] !== v)
    const right = vals.filter((v, i) => got[i] === v).length
    if (firstWrong === -1) return { correct: true, score: 1, feedback: `Every box is right! ${trail(p)} A computer keeps a number like this and changes it step by step.` }
    const before = firstWrong === 0 ? p.start : vals[firstWrong - 1]
    const c = p.cards[firstWrong]
    const how = c.op === 'set' ? `This card empties the ${p.box.name} first.` : c.op === 'add' ? 'This card makes the number go up.' : 'This card makes the number go down.'
    return { correct: false, score: right / vals.length, feedback: `Look at card ${firstWrong + 1}, “${cardWords(c)}”. Just before it, the ${p.box.name} had ${count(p, before)}. ${how}` }
  }

  // missing
  const i = a?.option
  if (typeof i !== 'number' || !ask.options[i]) return { correct: false, score: 0, feedback: 'Tap a card to put in the gap.' }
  const pick = ask.options[i]
  const got = endWith(p, ask.gap, pick)
  const cards = p.cards.map((c, k) => (k === ask.gap ? pick : c))
  if (got === end) return { correct: true, score: 1, feedback: `“${cardWords(pick)}” fits! ${trail(p, cards)} Change one card and the ${p.box.name} ends somewhere else.` }
  return { correct: false, score: 0, feedback: `With “${cardWords(pick)}” in the gap, the ${p.box.name} ends with ${got ?? 'the wrong number'}, not ${end}. Try another card and follow the ${p.box.name} again.` }
}

/** Spark's worked steps for a verified answer (the hint ladder's "Spark shows me"). */
export function describeNumberBox(p: Params, a: Answer): string[] {
  const ask = p.ask
  const cards = ask.kind === 'missing' && typeof a.option === 'number' && ask.options[a.option] ? p.cards.map((c, k) => (k === ask.gap ? ask.options[a.option as number] : c)) : p.cards
  const vals = runCards(p.start, cards)
  const steps: string[] = []
  if (ask.kind === 'missing') steps.push(`The ${p.box.name} had to end with ${count(p, vals[vals.length - 1])}. Spark tried “${cardWords(cards[ask.gap])}” in the gap.`)
  steps.push(`The ${p.box.name} started with ${count(p, p.start)}.`)
  cards.forEach((c, i) => {
    const before = i === 0 ? p.start : vals[i - 1]
    const sum = c.op === 'add' ? `${before} + ${c.n} = ${vals[i]}` : c.op === 'take' ? `${before} − ${c.n} = ${vals[i]}` : `${before === 1 ? 'the' : 'all'} ${before} tipped out${c.n === 0 ? ', so now 0' : `, then ${c.n} put in`}`
    steps.push(`Card ${i + 1}, “${cardWords(c)}”: ${sum}.`)
  })
  steps.push(`So the ${p.box.name} ends with ${count(p, vals[vals.length - 1])}.`)
  return steps
}

export const logic: TemplateLogic<Params, Answer> = { id: 'number-box', name: 'Number box', validate, check }
