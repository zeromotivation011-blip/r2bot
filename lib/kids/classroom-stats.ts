// lib/kids/classroom-stats.ts
// Pure roster maths for the teacher dashboard: per-child numbers, class
// totals, "where are they stuck" insights and the CSV export.

import { KIDS_ZONES } from '@/lib/kids-world-data'
import { robotSummary, type KidsMemberRow } from './classroom'

export interface MemberStats {
  stars: number
  episodes: number
  missions: number
  missionStars: number
  levels: number
  minutes: number
  robotsBuilt: number
}

export function memberStats(m: KidsMemberRow): MemberStats {
  const s = m.snapshot
  const missionVals = Object.values(s.codeMissions)
  return {
    stars: s.totalStars,
    episodes: Object.keys(s.episodesDone).length,
    missions: missionVals.length,
    missionStars: missionVals.reduce((a, b) => a + b, 0),
    levels: s.completedLevels,
    minutes: s.totalMinutesPlayed,
    robotsBuilt: s.robotsBuilt,
  }
}

export interface ClassTotals {
  children: number
  activeThisWeek: number
  stars: number
  episodes: number
  missions: number
  levels: number
  robotsBuilt: number
}

const WEEK_MS = 7 * 24 * 3600 * 1000

export function classTotals(members: KidsMemberRow[], now: number = Date.now()): ClassTotals {
  const t: ClassTotals = { children: members.length, activeThisWeek: 0, stars: 0, episodes: 0, missions: 0, levels: 0, robotsBuilt: 0 }
  for (const m of members) {
    const s = memberStats(m)
    t.stars += s.stars
    t.episodes += s.episodes
    t.missions += s.missions
    t.levels += s.levels
    if (m.snapshot.robotsBuilt > 0) t.robotsBuilt += 1
    if (now - Date.parse(m.lastActiveAt) < WEEK_MS && (s.stars > 0 || s.minutes > 0)) t.activeThisWeek += 1
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
    'Nickname', 'Stars', 'Story episodes', 'Code Lab missions', 'Code Lab stars',
    'Robot World levels', 'Robot World zones', 'Minutes played', 'Robots built', 'Robot', 'Joined', 'Last active',
  ]
  const rows = members.map((m) => {
    const s = memberStats(m)
    const r = robotSummary(m.snapshot.robot)
    return [
      m.nickname, s.stars, s.episodes, s.missions, s.missionStars, s.levels,
      m.snapshot.completedZones.length, s.minutes, s.robotsBuilt,
      r ? `${r.name} (${r.parts.map((p) => p.name).join(', ')})` : '',
      m.createdAt.slice(0, 10), m.lastActiveAt.slice(0, 16).replace('T', ' '),
    ].map(csvCell).join(',')
  })
  return [header.join(','), ...rows].join('\n')
}
