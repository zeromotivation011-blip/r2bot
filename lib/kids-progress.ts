// lib/kids-progress.ts
// Local-first progress store for Robot World. Optionally syncable to Supabase later.

import { KIDS_ZONES, ZONE_UNLOCK_STARS, partForZone } from './kids-world-data'

export interface KidsProgress {
  age: number | null
  totalStars: number
  completedLevels: string[]      // "zoneId/levelId"
  completedZones: string[]
  earnedParts: string[]
  robotName: string
  robotColor: string
  robotAccent: string
  robotEyes: string
  lastPlayed: string             // ISO date
  totalMinutesPlayed: number
  currentZone: string
  currentLevel: string
  starsByLevel: Record<string, number>   // "zoneId/levelId" -> stars
  attemptsByLevel: Record<string, number>
}

const KEY = 'r2bot_kids_v2'

const DEFAULT_PROGRESS: KidsProgress = {
  age: null,
  totalStars: 0,
  completedLevels: [],
  completedZones: [],
  earnedParts: [],
  robotName: 'Spark Jr.',
  robotColor: '#F59E0B',
  robotAccent: '#3B82F6',
  robotEyes: 'happy',
  lastPlayed: new Date().toISOString(),
  totalMinutesPlayed: 0,
  currentZone: 'spark-garden',
  currentLevel: 'what-is-spark',
  starsByLevel: {},
  attemptsByLevel: {},
}

function isBrowser() {
  return typeof window !== 'undefined'
}

export function getProgress(): KidsProgress {
  if (!isBrowser()) return { ...DEFAULT_PROGRESS }
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_PROGRESS }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_PROGRESS, ...parsed }
  } catch {
    return { ...DEFAULT_PROGRESS }
  }
}

export function saveProgress(patch: Partial<KidsProgress>): KidsProgress {
  const cur = getProgress()
  const next: KidsProgress = { ...cur, ...patch, lastPlayed: new Date().toISOString() }
  if (isBrowser()) {
    try { window.localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
  }
  return next
}

export function addStars(n: number): KidsProgress {
  const cur = getProgress()
  return saveProgress({ totalStars: cur.totalStars + Math.max(0, Math.floor(n)) })
}

export function addMinutes(min: number): KidsProgress {
  const cur = getProgress()
  return saveProgress({ totalMinutesPlayed: cur.totalMinutesPlayed + min })
}

// Mark a level complete. Awards stars (max stars stored per level — only better runs count).
// Returns { progress, newlyCompletedZone, partAwarded } so callers can trigger UI celebrations.
export interface CompleteResult {
  progress: KidsProgress
  newlyCompletedZone: string | null
  partAwarded: string | null
  starsAdded: number
}

export function completeLevel(zoneId: string, levelId: string, stars: number): CompleteResult {
  const cur = getProgress()
  const key = `${zoneId}/${levelId}`
  const prevStars = cur.starsByLevel[key] || 0
  const newStars = Math.max(prevStars, Math.max(0, Math.floor(stars)))
  const starsAdded = newStars - prevStars

  const completedLevels = cur.completedLevels.includes(key)
    ? cur.completedLevels
    : [...cur.completedLevels, key]

  const starsByLevel = { ...cur.starsByLevel, [key]: newStars }

  // Has every level in this zone been completed?
  const zone = KIDS_ZONES.find(z => z.id === zoneId)
  let completedZones = cur.completedZones
  let earnedParts = cur.earnedParts
  let newlyCompletedZone: string | null = null
  let partAwarded: string | null = null

  if (zone) {
    const allDone = zone.levels.every(l => completedLevels.includes(`${zoneId}/${l.id}`))
    if (allDone && !completedZones.includes(zoneId)) {
      completedZones = [...completedZones, zoneId]
      const part = partForZone(zoneId)
      if (part && !earnedParts.includes(part)) {
        earnedParts = [...earnedParts, part]
        partAwarded = part
      }
      newlyCompletedZone = zoneId
    }
  }

  const next = saveProgress({
    totalStars: cur.totalStars + starsAdded,
    completedLevels,
    completedZones,
    earnedParts,
    starsByLevel,
    currentZone: zoneId,
    currentLevel: levelId,
  })

  return { progress: next, newlyCompletedZone, partAwarded, starsAdded }
}

export function bumpAttempt(zoneId: string, levelId: string): number {
  const cur = getProgress()
  const key = `${zoneId}/${levelId}`
  const n = (cur.attemptsByLevel[key] || 0) + 1
  saveProgress({ attemptsByLevel: { ...cur.attemptsByLevel, [key]: n } })
  return n
}

export function getTotalStarsForZone(zoneId: string): number {
  const cur = getProgress()
  const zone = KIDS_ZONES.find(z => z.id === zoneId)
  if (!zone) return 0
  return zone.levels.reduce((sum, l) => sum + (cur.starsByLevel[`${zoneId}/${l.id}`] || 0), 0)
}

export function isZoneUnlocked(zoneId: string): boolean {
  const cur = getProgress()
  return cur.totalStars >= (ZONE_UNLOCK_STARS[zoneId] ?? 0)
}

export function resetProgress(): KidsProgress {
  if (isBrowser()) {
    try { window.localStorage.removeItem(KEY) } catch {}
  }
  return { ...DEFAULT_PROGRESS }
}

// Convenience selectors
export function isLevelComplete(zoneId: string, levelId: string): boolean {
  return getProgress().completedLevels.includes(`${zoneId}/${levelId}`)
}

export function isZoneComplete(zoneId: string): boolean {
  return getProgress().completedZones.includes(zoneId)
}
