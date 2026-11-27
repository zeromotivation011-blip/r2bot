// lib/kids/classroom-stats.ts
// Pure roster maths for the teacher dashboard: per-child numbers, class
// totals, "where are they stuck" insights and the CSV export. Wave 2 (#13):
// the whole Universe — course sessions, Skill Galaxy, games, concepts — and no
// minutes played (we reward learning, not time). Concept, misconception and
// stuck signals live in classroom-insights.ts.

import { KIDS_ZONES } from '@/lib/kids-world-data'
import { robotSummary, type KidsMemberRow } from './classroom'
import { parseConceptGridCode } from './universe/mastery'

export interface MemberStats {
  stars: number
  episodes: number
  missions: number
  missionStars: number
  levels: number
  robotsBuilt: number
  /** Course sessions finished (all four levels). */
  sessions: number
  /** Skill Galaxy activities finished. */
  activities: number
  /** Universe games with a personal best. */
  games: number
  /** Concepts secure right now (from the synced mastery letters). */
  secure: number
}

export function memberStats(m: KidsMemberRow): MemberStats {
  const s = m.snapshot
  const missionVals = Object.values(s.codeMissions)
  const grid = s.concepts ? parseConceptGridCode(s.concepts) : null
  return {
    stars: s.totalStars,
    episodes: Object.keys(s.episodesDone).length,
    missions: missionVals.length,
    missionStars: missionVals.reduce((a, b) => a + b, 0),
    levels: s.completedLevels,
    robotsBuilt: s.robotsBuilt,
    sessions: Object.keys(s.sessionsDone).length,
    activities: s.activitiesDone.length,
    games: s.gamesPlayed.length,
    secure: grid ? Object.values(grid).filter((c) => c.status === 'secure').length : 0,
  }
}

/** True when the child has done anything at all (any surface). */
export function hasPlayed(m: KidsMemberRow): boolean {
  const s = memberStats(m)
  return s.stars + s.sessions + s.activities + s.games + s.episodes + s.missions + s.levels + s.robotsBuilt > 0
}

export interface ClassTotals {
  children: number
  activeThisWeek: number
  stars: number
  episodes: number
  missions: number
  levels: number
  robotsBuilt: number
  sessions: number
  activities: number
}

const WEEK_MS = 7 * 24 * 3600 * 1000

export function classTotals(members: KidsMemberRow[], now: number = Date.now()): ClassTotals {
  const t: ClassTotals = { children: members.length, activeThisWeek: 0, stars: 0, episodes: 0, missions: 0, levels: 0, robotsBuilt: 0, sessions: 0, activities: 0 }
  for (const m of members) {
    const s = memberStats(m)
    t.stars += s.stars
    t.episodes += s.episodes
    t.missions += s.missions
    t.levels += s.levels
    t.sessions += s.sessions
    t.activities += s.activities
    if (m.snapshot.robotsBuilt > 0) t.robotsBuilt += 1
    if (now - Date.parse(m.lastActiveAt) < WEEK_MS && hasPlayed(m)) t.activeThisWeek += 1
  }
  return t
}

/** "spark-garden/what-is-spark" → "Spark's Garden · What is Spark?" */
export function levelLabel(key: string): string {
  const [zoneId, levelId] = key.split('/')
  const zone = KIDS_ZONES.find((z) => z.id === zoneId)
  const level = zone?.levels.find((l) => l.id === levelId)
  if (zone && level) return `${zone.name} · ${level.title}`
  return key
}

/** "line-follow-3" → "Line follow 3" — a readable label for an id we do not own. */
export function prettyId(id: string): string {
  const s = id.replace(/[-_/]+/g, ' ').trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export interface StuckItem {
  key: string
  label: string
  children: number
  /** Total retries across those children. */
  attempts: number
}

/**
 * Robot World levels several children retried without earning two stars.
 * Only reported when at least two children are stuck on the same level, so a
 * single child is never singled out on the class view.
 */
export function stuckLevels(members: KidsMemberRow[], limit = 3): StuckItem[] {
  const agg = new Map<string, StuckItem>()
  for (const m of members) {
    for (const [key, attempts] of Object.entries(m.snapshot.stuck)) {
      const cur = agg.get(key) ?? { key, label: levelLabel(key), children: 0, attempts: 0 }
      cur.children += 1
      cur.attempts += attempts
      agg.set(key, cur)
    }
  }
  return [...agg.values()]
    .filter((x) => x.children >= 2)
    .sort((a, b) => b.children - a.children || b.attempts - a.attempts)
    .slice(0, limit)
}

export interface ScrapedMission {
  id: string
  label: string
  /** Children who solved it with only one star. */
  oneStar: number
  solved: number
}

/** Code Lab missions most children only scraped through (one star). */
export function hardestMissions(members: KidsMemberRow[], limit = 3): ScrapedMission[] {
  const agg = new Map<string, ScrapedMission>()
  for (const m of members) {
    for (const [id, stars] of Object.entries(m.snapshot.codeMissions)) {
      const cur = agg.get(id) ?? { id, label: prettyId(id), oneStar: 0, solved: 0 }
      cur.solved += 1
      if (stars <= 1) cur.oneStar += 1
      agg.set(id, cur)
    }
  }
  return [...agg.values()]
    .filter((x) => x.oneStar >= 2 && x.oneStar / x.solved >= 0.5)
    .sort((a, b) => b.oneStar - a.oneStar)
    .slice(0, limit)
}

function csvCell(v: string | number): string {
  let s = String(v)
  // Spreadsheet formula injection guard.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function rosterCsv(members: KidsMemberRow[]): string {
  const header = [
    'Nickname', 'Stars', 'Course sessions', 'Course sessions (ids)', 'Skill Galaxy activities', 'Concepts secure',
    'Games played', 'Story episodes', 'Code Lab missions', 'Code Lab stars',
    'Spark Trail levels', 'Spark Trail zones', 'Robots built', 'Robot', 'Joined', 'Last active',
  ]
  const rows = members.map((m) => {
    const s = memberStats(m)
    const r = robotSummary(m.snapshot.robot)
    return [
      m.nickname, s.stars, s.sessions, Object.keys(m.snapshot.sessionsDone).sort().join(' '), s.activities, s.secure,
      s.games, s.episodes, s.missions, s.missionStars, s.levels,
      m.snapshot.completedZones.length, s.robotsBuilt,
      r ? `${r.name} (${r.parts.map((p) => p.name).join(', ')})` : '',
      m.createdAt.slice(0, 10), m.lastActiveAt.slice(0, 16).replace('T', ' '),
    ].map(csvCell).join(',')
  })
  return [header.join(','), ...rows].join('\n')
}
