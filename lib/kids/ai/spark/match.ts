// lib/kids/ai/spark/match.ts
// Keyword matching for Spark's notebook and for grounding. No AI, no
// dependencies, runs in a few microseconds — on the server and offline in the
// browser.

import type { BandId } from '../../bands'
import { SPARK_FAQ, type SparkFaq } from './faq'

const STOP = new Set(
  'a an the is are was were be been am do does did doing to of in on at for with and or but so if then than that this these those it its it’s i me my you your we our they them he she his her what whats which who whom how why when where can could would should will shall may might must there here about from into over under up down out not no yes very just really please tell explain know want like make made get got have has having thing things some any all much many more most one also hey hi hello spark'.split(
    ' ',
  ),
)

// "robot" appears in almost every question, so it counts for little (LOW_WEIGHT)
// rather than nothing — "what's a robot?" must still find its answer.
const LOW_WEIGHT: Record<string, number> = { robot: 0.35, work: 0.5, use: 0.5 }

// Everyday words that can appear in any question. A match carried only by these
// (plus "robot") is not an answer: "what is your name" once found "Where does
// the word robot come from?" through the keyword "name".
const GENERIC = new Set(
  'name word call thing way kind sort part good bad big small old new best cool fun people person day time look go come help need real nice'.split(' '),
)

/** Light stemming: good enough for kid questions, never clever. */
function stem(w: string): string {
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3)
  if (w.length > 4 && w.endsWith('ies')) return `${w.slice(0, -3)}y`
  if (w.length > 4 && w.endsWith('es') && /(ch|sh|x|ss)es$/.test(w)) return w.slice(0, -2)
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2)
  return w
}

const SPELLING: Record<string, string> = {
  color: 'colour',
  colors: 'colour',
  center: 'centre',
  math: 'maths',
  meter: 'metre',
  meters: 'metre',
  aeroplane: 'plane',
  airplane: 'plane',
  sensers: 'sensor',
  senser: 'sensor',
  robt: 'robot',
  moter: 'motor',
  moters: 'motor',
  ardiuno: 'arduino',
  progam: 'program',
  programme: 'program',
}

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'+\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokens(text: string): string[] {
  return normalise(text)
    .split(' ')
    .map((w) => w.replace(/'s$/, '').replace(/'/g, ''))
    .map((w) => SPELLING[w] ?? w)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem)
}

interface FaqIndexEntry {
  faq: SparkFaq
  qTokens: Set<string>
  kTokens: Set<string>
  phrases: string[]
  exact: string[]
}

let INDEX: FaqIndexEntry[] | null = null

function faqIndex(): FaqIndexEntry[] {
  if (INDEX) return INDEX
  INDEX = SPARK_FAQ.map((faq) => ({
    faq,
    qTokens: new Set(tokens(faq.q)),
    kTokens: new Set(faq.k.flatMap(tokens)),
    // Only phrases with two real words earn a bonus ("how far" must not beat "mars").
    phrases: faq.k.filter((k) => tokens(k).length >= 2).map(normalise),
    exact: (faq.phrases ?? []).map(normalise),
  }))
  return INDEX
}

export interface FaqMatch {
  faq: SparkFaq
  /** 0..1-ish confidence. ≥ 0.6 is a strong match; < 0.25 is noise. */
  score: number
}

export const STRONG_MATCH = 0.6
export const WEAK_MATCH = 0.45

/** Rank notebook entries for a question. */
export function matchFaq(question: string, limit = 3): FaqMatch[] {
  const qt = tokens(question)
  const norm = ` ${normalise(question)} `
  if (!qt.length && norm.trim().length < 2) return []
  const out: FaqMatch[] = []
  for (const e of faqIndex()) {
    let hit = 0
    let possible = 0
    let specific = false
    for (const t of qt) {
      const w = LOW_WEIGHT[t] ?? 1
      possible += 1.2 * w
      const found = e.qTokens.has(t) ? 1.2 * w : e.kTokens.has(t) ? w : 0
      hit += found
      if (found && !(t in LOW_WEIGHT) && !GENERIC.has(t)) specific = true
    }
    let phraseBonus = 0
    for (const p of e.phrases) if (norm.includes(` ${p} `)) phraseBonus += 1.5
    for (const p of e.exact) if (norm.includes(` ${p} `)) phraseBonus += 2
    // Exact question (ignoring punctuation) is a certain match.
    if (normalise(e.faq.q) === normalise(question)) phraseBonus += 5
    if (!hit && !phraseBonus) continue
    const denom = Math.max(2, Math.min(possible / 1.2, 6))
    const coverage = possible ? Math.min(1, hit / possible) : 0
    const score = Math.min(1.5, 0.55 * coverage + 0.45 * Math.min(1, (hit + phraseBonus) / denom) + 0.1 * Math.min(phraseBonus, 3))
    // A match carried only by weak words ("robot") is never "strong"; one
    // carried only by everyday words ("name", "thing") is not a match at all.
    // (Unless every word of the question is in the entry's own question: "what's a robot?")
    const ownWords = qt.every((t) => e.qTokens.has(t))
    let capped = !specific && !phraseBonus && !ownWords ? Math.min(score, 0.3) : hit + phraseBonus < 1 ? Math.min(score, 0.5) : score
    // One loose keyword in a longer question is not an answer: "why is the sky blue"
    // once got the colour-sensor entry through "blue" alone.
    if (!phraseBonus && !ownWords && qt.length >= 2 && coverage < 0.5) capped = Math.min(capped, WEAK_MATCH - 0.01)
    out.push({ faq: e.faq, score: capped })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

const OLDER: BandId[] = ['inventors', 'engineers']

/** The notebook answer for a band: the short answer, plus the deeper layer for 11+. */
export function faqAnswer(faq: SparkFaq, band: BandId): string {
  return OLDER.includes(band) && faq.more ? `${faq.a} ${faq.more}` : faq.a
}

export function isOlderBand(band: BandId): boolean {
  return OLDER.includes(band)
}

/** Follow-up questions: other strong-ish matches, else a deterministic sample. */
export function followUpsFor(question: string, excludeId: string | null, band: BandId): string[] {
  const near = matchFaq(question, 6)
    .filter((m) => m.faq.id !== excludeId && m.score >= 0.35)
    .map((m) => m.faq.q)
  if (near.length >= 3) return near.slice(0, 3)
  const pool = isOlderBand(band)
    ? ['How does a robot make a map?', 'What is PID?', 'How do robots learn?', 'What is lidar?', 'What is ROS?']
    : ['How do robots see?', 'How does a motor work?', 'What is a loop in coding?', 'How do drones fly?', 'How do Mars rovers work?']
  return [...near, ...pool.filter((q) => !near.includes(q))].slice(0, 3)
}
