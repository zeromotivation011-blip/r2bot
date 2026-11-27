// lib/kids/robodex/discover.ts
// Pure discovery rules for the Robodex: which cards a child has earned, from
// what they have DONE. No storage, no DOM: the browser store (./store.ts), the
// verify script and the server all run the same rules.
//
// Evidence is read from stores that already exist, so cards are earned
// retroactively (a child who played Deep Sea Rescue last week already owns the
// cards it reveals the first time they open the Robodex):
//   activities  Skill Galaxy done map (lib/kids/activities/progress.ts)
//   games       KidsProgress.personalBests keys `<game>:t<tier>` (GameShellClient)
//   stories     KidsProgress.episodesDone (Story Theatre)
//   concepts    KidsProgress.conceptSecured (mastery)
//
// Nothing is random and nothing is bought: the same play earns the same cards.

import type { ConceptId } from '../curriculum/types'
import type { WorldId } from '../universe/worlds'
import type { RobodexCard, RobodexTrigger } from './types'

export interface RobodexEvidence {
  /** Finished Skill Galaxy activity ids. */
  activities: ReadonlySet<string>
  /** Game id -> highest tier index finished (0 Cadet … 3 Legend). */
  games: Readonly<Record<string, number>>
  /** Finished Story Theatre episode slugs. */
  stories: ReadonlySet<string>
  /** Secured concepts. */
  concepts: ReadonlySet<ConceptId>
}

export const EMPTY_EVIDENCE: RobodexEvidence = { activities: new Set(), games: {}, stories: new Set(), concepts: new Set() }

/** World activity ids all start with `<world>-` (verify.ts checks this against the catalogue). */
export function worldPrefix(world: WorldId): string {
  return `${world}-`
}

/** How many finished activities are in this world. */
export function worldActivityCount(world: WorldId, ev: RobodexEvidence): number {
  const pre = worldPrefix(world)
  let n = 0
  for (const id of ev.activities) if (id.startsWith(pre)) n++
  return n
}

const GAME_KEY = /^([a-z0-9-]+):t(\d)$/

/** Highest tier per game from personal-best keys (`drone-hover:t2`). */
export function gamesFromBests(personalBests: Readonly<Record<string, number>> | undefined): Record<string, number> {
  const out: Record<string, number> = {}
  for (const key of Object.keys(personalBests ?? {})) {
    const m = GAME_KEY.exec(key)
    if (!m) continue
    const tier = Number(m[2])
    if (!(m[1] in out) || tier > out[m[1]]) out[m[1]] = tier
  }
  return out
}

export interface EvidenceSources {
  activitiesDone?: Readonly<Record<string, unknown>> | null
  personalBests?: Readonly<Record<string, number>> | null
  episodesDone?: Readonly<Record<string, number>> | null
  conceptSecured?: Readonly<Record<string, string>> | null
}

export function buildEvidence(src: EvidenceSources): RobodexEvidence {
  return {
    activities: new Set(Object.keys(src.activitiesDone ?? {})),
    games: gamesFromBests(src.personalBests ?? undefined),
    stories: new Set(Object.entries(src.episodesDone ?? {}).filter(([, s]) => typeof s === 'number' && s > 0).map(([k]) => k)),
    concepts: new Set(Object.keys(src.conceptSecured ?? {}) as ConceptId[]),
  }
}

export function triggerMet(t: RobodexTrigger, ev: RobodexEvidence): boolean {
  switch (t.kind) {
    case 'activity':
      return t.ids.some((id) => ev.activities.has(id))
    case 'world':
      return worldActivityCount(t.world, ev) >= t.count
    case 'game': {
      const best = ev.games[t.game]
      return best !== undefined && best >= (t.tier ?? 0)
    }
    case 'story':
      return ev.stories.has(t.slug)
    case 'concept':
      return ev.concepts.has(t.concept)
  }
}

export function cardEarned(card: RobodexCard, ev: RobodexEvidence): boolean {
  return card.find.some((t) => triggerMet(t, ev))
}

/** Ids of every card the evidence earns, in catalogue order. */
export function cardsEarned(cards: readonly RobodexCard[], ev: RobodexEvidence): string[] {
  return cards.filter((c) => cardEarned(c, ev)).map((c) => c.id)
}

/** Per-world progress for "Ocean Lab 7/8". */
export function worldTotals(cards: readonly RobodexCard[], found: ReadonlySet<string>): Record<WorldId, { found: number; total: number }> {
  const out = {} as Record<WorldId, { found: number; total: number }>
  for (const c of cards) {
    const row = (out[c.world] ??= { found: 0, total: 0 })
    row.total += 1
    if (found.has(c.id)) row.found += 1
  }
  return out
}

// ── Backup code extra ─────────────────────────────────────────────────────────
// The collection rides in the progress backup code as one small string: the
// card numbers (`n`) as a bitmask in hex, e.g. "R1.0f3a…". Under 30 characters
// for 60 cards, so it fits the 512-character extras limit with room to spare.

export function encodeFound(cards: readonly RobodexCard[], found: ReadonlySet<string>): string {
  const max = cards.reduce((m, c) => Math.max(m, c.n), 0)
  const bits = new Array<number>(Math.ceil(max / 4) * 4).fill(0)
  for (const c of cards) if (found.has(c.id)) bits[c.n - 1] = 1
  let hex = ''
  for (let i = 0; i < bits.length; i += 4) hex += ((bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3]).toString(16)
  return `R1.${hex}`
}

/** Card ids in an encoded string. Unknown versions, bad characters and unknown numbers are ignored. Never throws. */
export function decodeFound(cards: readonly RobodexCard[], code: unknown): string[] {
  if (typeof code !== 'string' || !/^R1\.[0-9a-f]{0,64}$/.test(code)) return []
  const hex = code.slice(3)
  const byN = new Map(cards.map((c) => [c.n, c.id]))
  const out: string[] = []
  for (let i = 0; i < hex.length; i++) {
    const v = parseInt(hex[i], 16)
    for (let b = 0; b < 4; b++) {
      if (v & (8 >> b)) {
        const id = byN.get(i * 4 + b + 1)
        if (id) out.push(id)
      }
    }
  }
  return out
}
