// lib/kids/classroom-insights-server.ts
//
// SERVER ONLY (imports every level's sessions and ALL_ACTIVITIES). Builds the
// lookup tables the teacher's Gradebook, Class Mind Map and "where to help"
// signals need to turn a child's compact snapshot (ids and counts) into words:
// activity titles and concepts, session titles and concepts, every
// misconception a course check can reveal with its correction and 5-minute
// reteach, and game names. Public course content only — served, cached, by
// /api/kids/classroom/insights-catalogue.

import { ALL_ACTIVITIES } from './activities/content'
import { TRACKS } from './activities/types'
import { LEVEL1_SESSIONS } from './curriculum/level1'
import { LEVEL2_SESSIONS } from './curriculum/level2'
import { L2_MISCONCEPTIONS, type MisconceptionId } from './curriculum/level2/misconceptions'
import { LEVEL3_SESSIONS } from './curriculum/level3'
import { LEVEL4_SESSIONS } from './curriculum/level4'
import type { Misconception } from './curriculum/level3/kit'
import type { LevelNumber, Session } from './curriculum/types'
import type { L2Session } from './curriculum/level2/types'
import { GAMES } from './universe/worlds'
import { activityHref } from './teach/catalogue'
import type { InsightCatalogue, InsightMisconception, InsightSession } from './classroom-insights'

function sessionRow(level: LevelNumber, s: Session | L2Session): InsightSession {
  return { t: s.title, c: [...s.concepts], l: level, n: s.number }
}

interface TaggedLike {
  options: { text: string; misconception?: string }[]
}

function misconceptionsOf(level: LevelNumber, s: Session | L2Session): [string, InsightMisconception][] {
  const out: [string, InsightMisconception][] = []
  const seen = new Set<string>()
  const notes = (s.teacher.misconceptions ?? []) as Partial<Misconception>[]
  for (const q of s.quiz as unknown as TaggedLike[]) {
    for (const o of q.options) {
      const id = o.misconception
      if (!id || seen.has(id)) continue
      seen.add(id)
      let idea = ''
      let correction = ''
      let reteach: string | undefined
      if (level === 2 && id in L2_MISCONCEPTIONS) {
        const m = L2_MISCONCEPTIONS[id as MisconceptionId]
        idea = m.idea
        correction = m.correction
      } else {
        const m = notes.find((x) => x.id === id)
        if (!m) continue
        idea = m.idea ?? ''
        correction = m.correction ?? ''
        reteach = m.reteach
      }
      if (!idea) continue
      const row: InsightMisconception = { s: s.id, i: idea, k: correction, a: o.text }
      if (reteach) row.r = reteach
      out.push([`${s.id}.${id}`, row])
    }
  }
  return out
}

let cached: InsightCatalogue | null = null

export function getInsightCatalogue(): InsightCatalogue {
  if (cached) return cached
  const sessions: InsightCatalogue['sessions'] = {}
  const misconceptions: InsightCatalogue['misconceptions'] = {}
  const levels: [LevelNumber, (Session | L2Session)[]][] = [
    [1, LEVEL1_SESSIONS], [2, LEVEL2_SESSIONS], [3, LEVEL3_SESSIONS], [4, LEVEL4_SESSIONS],
  ]
  for (const [level, list] of levels) {
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
