// lib/kids/classroom-insights-server.ts
//
// SERVER ONLY (imports every level's sessions and ALL_ACTIVITIES). Builds the
// lookup tables the teacher's Gradebook, Class Mind Map and "where to help"
// signals need to turn a child's compact snapshot (ids and counts) into words:
// activity titles and concepts, session titles and concepts, every
// misconception a course check can reveal (all four levels, via
// lib/kids/misconceptions/server.ts) with its correction, child-friendly words
// and 5-minute reteach, each session's unplugged lesson/warm-up and episode,
// and game names. Public course content only — served, cached, by
// /api/kids/classroom/insights-catalogue.

import { ALL_ACTIVITIES } from './activities/content'
import { TRACKS } from './activities/types'
import { LEVEL_SESSIONS, sessionMisconceptions, sessionReteachRefs, type AnySession } from './misconceptions/server'
import type { LevelNumber } from './curriculum/types'
import { GAMES } from './universe/worlds'
import { activityHref } from './teach/catalogue'
import type { InsightCatalogue, InsightMisconception, InsightSession } from './classroom-insights'

function sessionRow(level: LevelNumber, s: AnySession): InsightSession {
  const refs = sessionReteachRefs(level, s)
  return { t: s.title, c: [...s.concepts], l: level, n: s.number, u: { t: refs.unplugged.title, h: refs.unplugged.href }, e: { t: refs.episode.title, h: refs.episode.href }, b: { n: s.badge.name, i: s.badge.icon } }
}

function misconceptionsOf(level: LevelNumber, s: AnySession): [string, InsightMisconception][] {
  return sessionMisconceptions(level, s).map((m): [string, InsightMisconception] => {
    const row: InsightMisconception = { s: m.sessionId, i: m.idea, k: m.correction, a: m.answer }
    if (m.reteach) row.r = m.reteach
    if (m.child) row.c = m.child
    return [m.key, row]
  })
}

let cached: InsightCatalogue | null = null

export function getInsightCatalogue(): InsightCatalogue {
  if (cached) return cached
  const sessions: InsightCatalogue['sessions'] = {}
  const misconceptions: InsightCatalogue['misconceptions'] = {}
  for (const [level, list] of LEVEL_SESSIONS) {
    for (const s of list) {
      sessions[s.id] = sessionRow(level, s)
      for (const [k, v] of misconceptionsOf(level, s)) misconceptions[k] = v
    }
  }
  const activities: InsightCatalogue['activities'] = {}
  for (const a of ALL_ACTIVITIES) {
    activities[a.id] = { t: a.title, k: a.track, c: [...(a.concepts ?? [])], b: a.band, h: activityHref(a.track, a.id) }
  }
  const tracks: InsightCatalogue['tracks'] = {}
  for (const t of TRACKS) tracks[t.id] = { n: t.name, e: t.icon }
  const games: InsightCatalogue['games'] = {}
  for (const g of GAMES) games[g.id] = { n: g.name, e: g.emoji, t: g.tiers }
  cached = { v: 1, sessions, misconceptions, activities, tracks, games }
  return cached
}
