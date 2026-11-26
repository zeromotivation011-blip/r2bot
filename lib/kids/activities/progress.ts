// lib/kids/activities/progress.ts
// Skill Galaxy progress: which activities a child has finished, plus the pure
// helpers every galaxy screen uses (ordering, unlocking, next suggestions,
// daily missions, mastery). The helpers take light ActivitySummary objects, so
// the browser never needs the activities' params to draw the galaxy.
//
// XP, badges and personal bests are NOT stored here: they go through
// reportActivity() in lib/kids/universe/rewards.ts like everything else. This
// file keeps only a small "done" map under its own localStorage key and fires
// KIDS_PROGRESS_EVENT after each save so every listener refreshes.

import { KIDS_PROGRESS_EVENT } from '../../kids-progress'
import { BAND_ORDER, type BandId } from '../bands'
import { TRACKS, type Activity, type TemplateId, type TrackId } from './types'

export const ACTIVITIES_KEY = 'r2bot_kids_activities_v1'

export interface ActivityRecord {
  /** Best stars so far (1–3). */
  stars: number
  /** Attempts on the best run. */
  attempts: number
  /** Best score 0..1. */
  score: number
  /** Times finished. */
  plays: number
  /** ISO date of the last finish. */
  at: string
}

export type ActivitiesDone = Record<string, ActivityRecord>

/** Everything the galaxy needs to draw an activity — no params. */
export interface ActivitySummary {
  id: string
  title: string
  track: TrackId
  band: BandId
  template: TemplateId
  difficulty: number
  after?: string[]
  badges?: string[]
}

export function summarize(a: Activity): ActivitySummary {
  const s: ActivitySummary = { id: a.id, title: a.title, track: a.track, band: a.band, template: a.template, difficulty: a.difficulty }
  if (a.after?.length) s.after = a.after
  if (a.badges?.length) s.badges = a.badges
  return s
}

// ── Storage ────────────────────────────────────────────────────────────────

export function getActivitiesDone(): ActivitiesDone {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(ACTIVITIES_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const out: ActivitiesDone = {}
    for (const [id, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!v || typeof v !== 'object') continue
      const r = v as Partial<ActivityRecord>
      const stars = Number(r.stars)
      if (!Number.isFinite(stars) || stars < 1) continue
      out[id] = {
        stars: Math.min(3, Math.round(stars)),
        attempts: Number(r.attempts) || 1,
        score: Number(r.score) || 0,
        plays: Number(r.plays) || 1,
        at: typeof r.at === 'string' ? r.at : '',
      }
    }
    return out
  } catch {
    return {}
  }
}

/** 1 try → 3 stars, 2 tries → 2 stars, more → 1 star. Effort still earns a star. */
export function starsForAttempts(attempts: number): number {
  if (attempts <= 1) return 3
  if (attempts === 2) return 2
  return 1
}

export interface RecordOutcome {
  record: ActivityRecord
  /** First time this activity was finished. */
  firstTime: boolean
  /** More stars than before (true on the first finish). */
  improved: boolean
  previousStars: number
}

/** Save a finished (correct) activity. Keeps the best stars; counts plays. */
export function recordActivityResult(id: string, run: { stars: number; attempts: number; score: number }): RecordOutcome {
  const all = getActivitiesDone()
  const prev = all[id]
  const stars = Math.max(1, Math.min(3, Math.round(run.stars)))
  const improved = !prev || stars > prev.stars
  const record: ActivityRecord = {
    stars: Math.max(stars, prev?.stars ?? 0),
    attempts: improved ? run.attempts : (prev?.attempts ?? run.attempts),
    score: Math.max(run.score, prev?.score ?? 0),
    plays: (prev?.plays ?? 0) + 1,
    at: new Date().toISOString().slice(0, 10),
  }
  const next = { ...all, [id]: record }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(next))
    } catch {
      /* storage full or blocked: progress just isn't kept */
    }
    try {
      window.dispatchEvent(new CustomEvent(KIDS_PROGRESS_EVENT))
    } catch {
      /* ignore */
    }
  }
  return { record, firstTime: !prev, improved, previousStars: prev?.stars ?? 0 }
}

// ── Ordering and unlocking ──────────────────────────────────────────────────

const bandIndex = (b: BandId) => BAND_ORDER.indexOf(b)

/**
 * Order a track's activities: by band, then difficulty, then title — and any
 * activity listed in another's `after` always comes before it.
 */
export function orderActivities<T extends ActivitySummary>(list: T[]): T[] {
  const sorted = [...list].sort(
    (a, b) => bandIndex(a.band) - bandIndex(b.band) || a.difficulty - b.difficulty || a.title.localeCompare(b.title) || a.id.localeCompare(b.id),
  )
  const ids = new Set(sorted.map((a) => a.id))
  const placed = new Set<string>()
  const out: T[] = []
  const visiting = new Set<string>()
  const byId = new Map(sorted.map((a) => [a.id, a]))
  const place = (a: T) => {
    if (placed.has(a.id) || visiting.has(a.id)) return
    visiting.add(a.id)
    for (const dep of a.after ?? []) {
      const d = byId.get(dep)
      if (d && ids.has(dep)) place(d)
    }
    visiting.delete(a.id)
    placed.add(a.id)
    out.push(a)
  }
  for (const a of sorted) place(a)
  return out
}

/** Bands shown to a child: their own band ± one, or all of them. */
export function visibleBands(band: BandId, showAll: boolean): BandId[] {
  if (showAll) return [...BAND_ORDER]
  const i = bandIndex(band)
  return BAND_ORDER.filter((_, j) => Math.abs(j - i) <= 1)
}

/** Activity ids in `after` that are not done yet (empty = unlocked). */
export function missingPrereqs(a: ActivitySummary, done: ActivitiesDone): string[] {
  return (a.after ?? []).filter((id) => !done[id])
}

export type NodeState = 'done' | 'next' | 'open' | 'locked'

/** State of each activity in an ordered list: the first open one is "next". */
export function nodeStates(ordered: ActivitySummary[], done: ActivitiesDone): Record<string, NodeState> {
  const out: Record<string, NodeState> = {}
  let nextGiven = false
  for (const a of ordered) {
    if (done[a.id]) out[a.id] = 'done'
    else if (missingPrereqs(a, done).length) out[a.id] = 'locked'
    else if (!nextGiven) {
      out[a.id] = 'next'
      nextGiven = true
    } else out[a.id] = 'open'
  }
  return out
}

/**
 * What to play next: unlocked, not done, the child's own band first, then the
 * band above, then the band below; same track first when `track` is given.
 */
export function nextActivities<T extends ActivitySummary>(
  list: T[],
  done: ActivitiesDone,
  band: BandId,
  opts: { track?: TrackId; exclude?: string; limit?: number } = {},
): T[] {
  const limit = opts.limit ?? 3
  const bi = bandIndex(band)
  const bandRank = (b: BandId) => {
    const d = bandIndex(b) - bi
    return d === 0 ? 0 : d === 1 ? 1 : d === -1 ? 2 : 3 + Math.abs(d)
  }
  const pool = list.filter((a) => a.id !== opts.exclude && !done[a.id] && missingPrereqs(a, done).length === 0 && Math.abs(bandIndex(a.band) - bi) <= 1)
  const ordered = orderActivities(pool)
  const pos = new Map(ordered.map((a, i) => [a.id, i]))
  ordered.sort(
    (a, b) =>
      Number(opts.track ? a.track !== opts.track : 0) - Number(opts.track ? b.track !== opts.track : 0) ||
      bandRank(a.band) - bandRank(b.band) ||
      (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0),
  )
  return ordered.slice(0, limit)
}

// ── Mastery ──────────────────────────────────────────────────────────────────

export function masteryBadgeId(track: TrackId, band: BandId): string {
  return `mastery-${track}-${band}`
}

export interface Mastery {
  done: number
  total: number
  /** 0..100 */
  pct: number
  mastered: boolean
}

/** A track × band is mastered when every one of its activities is done (and it has at least one). */
export function trackMastery(list: ActivitySummary[], done: ActivitiesDone, track: TrackId, band?: BandId): Mastery {
  const inScope = list.filter((a) => a.track === track && (!band || a.band === band))
  const n = inScope.filter((a) => done[a.id]).length
  const total = inScope.length
  return { done: n, total, pct: total ? Math.round((100 * n) / total) : 0, mastered: total > 0 && n === total }
}

// ── Daily missions ───────────────────────────────────────────────────────────

/** YYYY-MM-DD in the child's local time. */
export function localDay(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

/**
 * Today's three Galaxy missions: deterministic by date + band (every device
 * agrees, and finishing one does not reshuffle the others), from three
 * different tracks where possible, using the child's band and, if it is thin,
 * the neighbouring bands.
 */
export function dailyMissions<T extends ActivitySummary>(list: T[], band: BandId, day: string = localDay(), count = 3): T[] {
  const bi = bandIndex(band)
  let pool = list.filter((a) => a.band === band && !(a.after?.length))
  if (pool.length < count) pool = list.filter((a) => Math.abs(bandIndex(a.band) - bi) <= 1 && !(a.after?.length))
  if (pool.length < count) pool = list.filter((a) => Math.abs(bandIndex(a.band) - bi) <= 1)
  const ranked = [...pool].sort((a, b) => hash(`${day}|${band}|${a.id}`) - hash(`${day}|${band}|${b.id}`) || a.id.localeCompare(b.id))
  const out: T[] = []
  const tracks = new Set<TrackId>()
  for (const a of ranked) {
    if (out.length >= count) break
    if (tracks.has(a.track)) continue
    tracks.add(a.track)
    out.push(a)
  }
  for (const a of ranked) {
    if (out.length >= count) break
    if (!out.includes(a)) out.push(a)
  }
  return out
}

export function trackInfo(id: TrackId) {
  return TRACKS.find((t) => t.id === id)
}
