// lib/kids/ai/spark/retrieve.ts
// Grounding for Ask Spark. Builds a small keyword index over R2BOT Kids' own
// content — Skill Galaxy activities, Universe games, worlds, course sessions
// and the Atlas entries Spark's notebook points to — and returns the best
// matches for a question. The server passes them to the model as context and
// turns the best live kids page into a "Show me" link.
//
// Server-side only in practice: it imports every activity (large). The client
// never imports this file; offline it answers from the notebook alone.

import { bandAllows, type BandId } from '../../bands'
import { ALL_ACTIVITIES } from '../../activities/content'
import { TRACKS } from '../../activities/types'
import { GAMES, WORLDS } from '../../universe/worlds'
import { LEVELS } from '../../curriculum/levels'
import { SPARK_FAQ } from './faq'
import { tokens } from './match'
import { titleFromSlug } from './offline'
import { isLiveKidsHref } from './live'
import type { SparkLink, SparkLinkKind } from './types'

export interface SparkDoc {
  kind: SparkLinkKind
  title: string
  /** One or two sentences the model may use as grounding. */
  text: string
  href: string
  emoji: string
  /** Youngest band the content is designed for. */
  band: BandId
  tokens: Map<string, number>
}

function weigh(parts: [string, number][]): Map<string, number> {
  const m = new Map<string, number>()
  for (const [text, w] of parts) for (const t of tokens(text)) m.set(t, Math.max(m.get(t) ?? 0, w))
  return m
}

let DOCS: SparkDoc[] | null = null

export function sparkDocs(): SparkDoc[] {
  if (DOCS) return DOCS
  const docs: SparkDoc[] = []

  const trackIcon = new Map(TRACKS.map((t) => [t.id, t.icon]))
  for (const a of ALL_ACTIVITIES) {
    docs.push({
      kind: 'activity',
      title: a.title,
      text: `${a.intro} ${a.takeaway}`.slice(0, 320),
      href: `/kids/galaxy/${a.track}/${a.id}`,
      emoji: trackIcon.get(a.track) ?? '✨',
      band: a.band,
      tokens: weigh([[a.title, 3], [a.takeaway, 1.5], [a.intro, 1], [a.realWorld ?? '', 1], [a.track, 1]]),
    })
  }

  for (const g of GAMES) {
    docs.push({
      kind: 'game',
      title: g.name,
      text: `${g.hook} Teaches: ${g.teaches}`.slice(0, 320),
      href: `/kids/play/${g.id}`,
      emoji: g.emoji,
      band: g.minBand,
      tokens: weigh([[g.name, 3], [g.hook, 1.5], [g.teaches, 1.5], [g.skills.join(' '), 2]]),
    })
  }

  for (const w of WORLDS) {
    docs.push({
      kind: 'world',
      title: w.name,
      text: `${w.tagline} ${w.teaches}`.slice(0, 320),
      href: `/kids/worlds/${w.id}`,
      emoji: w.emoji,
      band: 'explorers',
      tokens: weigh([[w.name, 3], [w.tagline, 2], [w.teaches, 1.5]]),
    })
  }

  for (const level of LEVELS) {
    for (const s of level.sessions) {
      docs.push({
        kind: 'session',
        title: `${s.title} (Level ${level.number})`,
        text: s.objective.slice(0, 320),
        // Only Level 1 sessions are playable pages; others link to their level overview.
        href: level.number === 1 ? `/kids/course/1/${s.number}` : `/kids/course/${level.number}`,
        emoji: '📘',
        band: level.band,
        tokens: weigh([[s.title, 3], [s.objective, 1.5], [s.concepts.join(' '), 1]]),
      })
    }
  }

  const seenAtlas = new Set<string>()
  for (const f of SPARK_FAQ) {
    if (!f.atlas || seenAtlas.has(f.atlas)) continue
    seenAtlas.add(f.atlas)
    docs.push({
      kind: 'atlas',
      title: titleFromSlug(f.atlas),
      text: f.a,
      // Grounding only: Spark never links outside /kids (see ./live.ts).
      href: '',
      emoji: '📖',
      // Atlas pages are written for teens and adults.
      band: 'inventors',
      tokens: weigh([[f.atlas.replace(/-/g, ' '), 3], [f.q, 2], [f.k.join(' '), 1.5]]),
    })
  }

  // Unbuilt games and worlds are neither linked nor used as grounding, so
  // neither Spark nor the model sends a child to a page that does not exist.
  DOCS = docs.filter((d) => d.kind === 'atlas' || isLiveKidsHref(d.href))
  return DOCS
}

export interface DocMatch {
  doc: SparkDoc
  score: number
}

/** Top content for a question, filtered to what suits the child's band. */
export function retrieve(question: string, band: BandId, limit = 4, minScore = 2): DocMatch[] {
  const qt = [...new Set(tokens(question))]
  if (!qt.length) return []
  const out: DocMatch[] = []
  for (const doc of sparkDocs()) {
    // Atlas entries are for older children; younger ones get kids pages only.
    if (doc.kind === 'atlas' ? !bandAllows(band, 'inventors') : !bandAllows(band, doc.band)) continue
    let score = 0
    for (const t of qt) score += doc.tokens.get(t) ?? 0
    if (score < minScore) continue
    // Prefer content made for the child's own band over easier content.
    if (doc.band === band) score *= 1.15
    out.push({ doc, score })
  }
  out.sort((a, b) => b.score - a.score)
  // One link per kind keeps the list varied.
  const picked: DocMatch[] = []
  const kinds = new Map<SparkLinkKind, number>()
  for (const m of out) {
    const n = kinds.get(m.doc.kind) ?? 0
    if (n >= 2) continue
    kinds.set(m.doc.kind, n + 1)
    picked.push(m)
    if (picked.length >= limit) break
  }
  return picked
}

/** A "Show me" link for a doc, or null when it is not a live kids page. */
export function toLink(d: SparkDoc): SparkLink | null {
  if (d.kind === 'atlas' || !isLiveKidsHref(d.href)) return null
  const prefix: Record<SparkLinkKind, string> = {
    atlas: 'Read',
    activity: 'Try',
    game: 'Play',
    world: 'Visit',
    session: 'Lesson',
  }
  return { kind: d.kind, label: `${prefix[d.kind]}: ${d.title}`, href: d.href, emoji: d.emoji }
}
