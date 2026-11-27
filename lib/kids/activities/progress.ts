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

import { KIDS_PROGRESS_EVENT, getProgress, saveProgress } from '../../kids-progress'
import { BAND_ORDER, type BandId } from '../bands'
import { applyConceptTry, conceptStates, dayNumber, type ConceptId, type ConceptState, type ConceptTry, type MasteryData } from '../universe/mastery'
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
  /** Concept strands (lib/kids/universe/mastery.ts). */
  concepts?: ConceptId[]
}

export function summarize(a: Activity): ActivitySummary {
  const s: ActivitySummary = { id: a.id, title: a.title, track: a.track, band: a.band, template: a.template, difficulty: a.difficulty }
  if (a.concepts?.length) s.concepts = a.concepts
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

/** What mastery needs to know about an activity run (an ActivitySummary or a full Activity both fit). */
export type ActivityMeta = Pick<ActivitySummary, 'id' | 'template' | 'track' | 'band' | 'difficulty' | 'concepts'>

export interface ConceptOutcome {
  /** Concepts that became secure for the first time with this run. */
  newlySecure: ConceptId[]
  /** Fading concepts this run recharged. */
  recharged: ConceptId[]
}

/**
 * Log one finished run as mastery evidence in the ONE progress store
 * (KidsProgress.conceptLog / conceptSecured). `firstTry` = solved on the first
 * try. Activities without concepts log nothing. Browser only; never throws.
 */
export function logConceptTry(meta: ActivityMeta, firstTry: boolean, now: Date = new Date()): ConceptOutcome {
  const none: ConceptOutcome = { newlySecure: [], recharged: [] }
  if (typeof window === 'undefined' || !meta.concepts?.length) return none
  try {
    const p = getProgress()
    const t: ConceptTry = {
      a: meta.id,
      c: meta.concepts.slice(0, 3),
      t: meta.template,
      k: meta.track,
      b: meta.band,
      v: meta.difficulty,
      d: localDay(now),
      ok: firstTry ? 1 : 0,
    }
    const r = applyConceptTry({ conceptLog: p.conceptLog ?? [], conceptSecured: p.conceptSecured ?? {} }, t)
    saveProgress({ conceptLog: r.conceptLog, conceptSecured: r.conceptSecured })
    return { newlySecure: r.newlySecure, recharged: r.recharged }
  } catch {
    return none
  }
}

/**
 * A run that ended without a solve (the child stopped). Not stored as "done";
 * logged as mastery evidence so adaptive pacing and the teacher grid see it.
 */
export function recordActivityMiss(meta: ActivityMeta): ConceptOutcome {
  return logConceptTry(meta, false)
}

/**
 * Save a finished (correct) activity. Keeps the best stars; counts plays.
 * Pass `meta` (the activity or its summary) to log mastery evidence too, and
 * `assisted: true` when a hint was used (then it never counts as a first-try win).
 */
export function recordActivityResult(
  id: string,
  run: { stars: number; attempts: number; score: number },
  meta?: ActivityMeta,
  opts: { assisted?: boolean } = {},
): RecordOutcome & { concepts: ConceptOutcome } {
  const all = getActivitiesDone()
  const prev = all[id]
  const stars = Math.max(1, Math.min(3, Math.round(run.stars)))
  const improved = !prev || stars > prev.stars
  const record: ActivityRecord = {
    stars: Math.max(stars, prev?.stars ?? 0),
    attempts: improved ? run.attempts : (prev?.attempts ?? run.attempts),
    score: Math.max(run.score, prev?.score ?? 0),
    plays: (prev?.plays ?? 0) + 1,
    at: localDay(),
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
  // A first try with a hint (Spark shows me) is a good finish, but not evidence of mastery.
  const concepts = meta && meta.id === id ? logConceptTry(meta, Math.max(1, run.attempts) === 1 && !opts.assisted) : { newlySecure: [], recharged: [] }
  return { record, firstTime: !prev, improved, previousStars: prev?.stars ?? 0, concepts }
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

// ── Start points (Launch Check, "skip to Ace") ──────────────────────────────

/** Where a child starts in a track: missions before this point stay playable but are not suggested. */
export interface StartPoint {
  band: BandId
  /** 1–5: the first difficulty of the start band that counts as "at the start". */
  minDifficulty: number
}

export type TrackStarts = Partial<Record<TrackId, StartPoint>>

/** At or past a start point (no start = everything is). */
export function atOrPastStart(a: Pick<ActivitySummary, 'band' | 'difficulty'>, start?: StartPoint): boolean {
  if (!start) return true
  const d = bandIndex(a.band) - bandIndex(start.band)
  return d > 0 || (d === 0 && a.difficulty >= start.minDifficulty)
}

/** State of each activity in an ordered list: the first open one at or past the start point is "next". */
export function nodeStates(ordered: ActivitySummary[], done: ActivitiesDone, opts: { start?: StartPoint } = {}): Record<string, NodeState> {
  const out: Record<string, NodeState> = {}
  for (const a of ordered) out[a.id] = done[a.id] ? 'done' : missingPrereqs(a, done).length ? 'locked' : 'open'
  const next = ordered.find((a) => out[a.id] === 'open' && atOrPastStart(a, opts.start)) ?? ordered.find((a) => out[a.id] === 'open')
  if (next) out[next.id] = 'next'
  return out
}

/**
 * What to play next: unlocked, not done, the child's own band first, then the
 * band above, then the band below; same track first when `track` is given.
 * With `starts`, missions before a track's start point come last.
 */
export function nextActivities<T extends ActivitySummary>(
  list: T[],
  done: ActivitiesDone,
  band: BandId,
  opts: { track?: TrackId; exclude?: string; limit?: number; starts?: TrackStarts } = {},
): T[] {
  const limit = opts.limit ?? 3
  const bi = bandIndex(band)
  const bandRank = (b: BandId) => {
    const d = bandIndex(b) - bi
    return d === 0 ? 0 : d === 1 ? 1 : d === -1 ? 2 : 3 + Math.abs(d)
  }
  const before = (a: T) => Number(!atOrPastStart(a, opts.starts?.[a.track]))
  const pool = list.filter((a) => a.id !== opts.exclude && !done[a.id] && missingPrereqs(a, done).length === 0 && Math.abs(bandIndex(a.band) - bi) <= 1)
  const ordered = orderActivities(pool)
  const pos = new Map(ordered.map((a, i) => [a.id, i]))
  ordered.sort(
    (a, b) =>
      Number(opts.track ? a.track !== opts.track : 0) - Number(opts.track ? b.track !== opts.track : 0) ||
      before(a) - before(b) ||
      bandRank(a.band) - bandRank(b.band) ||
      (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0),
  )
  return ordered.slice(0, limit)
}

// ── Mastery ──────────────────────────────────────────────────────────────────
// Two kinds, on purpose:
//   - trackMastery: every mission of a track × band done (the "Master" badge).
//   - concept mastery (secure / fading): lib/kids/universe/mastery.ts, from
//     first-try wins across templates over time. That is the real one.

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

// ── Daily missions (roadmap #28: Recharge missions) ─────────────────────────

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
 * new      the next mission at the child's start point in one track
 * recharge a mission on a FADING concept (or a nearly empty battery), using a
 *          different template from the last win on it: spaced retrieval
 * practice a concept the child is learning, on a template they have not won with
 * stretch  one notch harder than where the child is, in another track
 * explore  a second new mission when there is nothing to recharge yet
 */
export type MissionKind = 'new' | 'recharge' | 'practice' | 'stretch' | 'explore'

export interface DailyMission<T extends ActivitySummary = ActivitySummary> {
  activity: T
  kind: MissionKind
  /** The concept a recharge/practice mission is for. */
  concept?: ConceptId
  /** Its state at the start of the day (battery cells etc.). */
  conceptState?: ConceptState
}

export interface MissionContext {
  done?: ActivitiesDone
  mastery?: MasteryData
  starts?: TrackStarts
}

/** The child's state at the START of `day`: today's play never reshuffles today's missions. */
function asOfDayStart(day: string, ctx: MissionContext): { done: ActivitiesDone; mastery: MasteryData } {
  const t0 = dayNumber(day)
  const done: ActivitiesDone = {}
  for (const [id, r] of Object.entries(ctx.done ?? {})) {
    const n = dayNumber(r.at)
    if (!Number.isFinite(n) || n < t0) done[id] = r
  }
  const log = (ctx.mastery?.conceptLog ?? []).filter((t) => dayNumber(t.d) < t0)
  const secured: Record<string, string> = {}
  for (const [c, d] of Object.entries(ctx.mastery?.conceptSecured ?? {})) if (dayNumber(d) < t0) secured[c] = d
  return { done, mastery: { conceptLog: log, conceptSecured: secured } }
}

/**
 * Today's three Galaxy missions: 1 new + 1 recharge + 1 stretch.
 * Deterministic by date, band and the child's state at the start of the day,
 * so every reload agrees and finishing one does not reshuffle the others.
 * Skipping a day costs nothing: there is no streak, and tomorrow simply picks again.
 */
export function dailyMissionPlan<T extends ActivitySummary>(list: T[], band: BandId, day: string = localDay(), ctx: MissionContext = {}): DailyMission<T>[] {
  const { done, mastery } = asOfDayStart(day, ctx)
  const bi = bandIndex(band)
  const near = (a: T) => Math.abs(bandIndex(a.band) - bi) <= 1
  const unlocked = (a: T) => missingPrereqs(a, done).length === 0
  const h = (s: string) => hash(`${day}|${band}|${s}`)
  const chosen = new Set<string>()
  const out: DailyMission<T>[] = []
  const tracks = [...TRACKS.map((t) => t.id)].sort((a, b) => h(a) - h(b))
  const playedTracks = new Set(list.filter((a) => done[a.id]).map((a) => a.track))

  const nextIn = (track: TrackId): T | undefined =>
    nextActivities(list, done, band, { track, starts: ctx.starts, limit: 4 }).find((a) => a.track === track && !chosen.has(a.id))

  // 1. New: the next mission in one track (a different track each day).
  for (const t of tracks) {
    const a = nextIn(t)
    if (a) {
      out.push({ activity: a, kind: 'new' })
      chosen.add(a.id)
      break
    }
  }

  // 2. Recharge: the most faded concept, on a different template.
  const states = conceptStates(mastery, day)
  const fading = states.filter((s) => s.status === 'fading' || (s.status === 'secure' && s.cells <= 2))
  fading.sort((a, b) => (b.daysSinceWin ?? 0) - (a.daysSinceWin ?? 0) || h(a.id) - h(b.id))
  const learning = states.filter((s) => s.status === 'learning').sort((a, b) => b.progress - a.progress || h(a.id) - h(b.id))
  const pickFor = (s: ConceptState, avoid: Set<string>): T | undefined => {
    const pool = list.filter((a) => a.concepts?.includes(s.id) && near(a) && unlocked(a) && !chosen.has(a.id) && !avoid.has(a.template))
    pool.sort(
      (a, b) =>
        Number(!!done[a.id]) - Number(!!done[b.id]) ||
        Math.abs(bandIndex(a.band) - bi) - Math.abs(bandIndex(b.band) - bi) ||
        (a.concepts?.[0] === s.id ? 0 : 1) - (b.concepts?.[0] === s.id ? 0 : 1) ||
        h(a.id) - h(b.id),
    )
    return pool[0]
  }
  let review: DailyMission<T> | undefined
  for (const s of fading) {
    const a = pickFor(s, new Set(s.lastWinTemplate ? [s.lastWinTemplate] : [])) ?? pickFor(s, new Set())
    if (a) {
      review = { activity: a, kind: 'recharge', concept: s.id, conceptState: s }
      break
    }
  }
  if (!review) {
    for (const s of learning) {
      // Practise on a template the child has not won with on this concept yet.
      const won = new Set(mastery.conceptLog.filter((t) => t.ok === 1 && t.c.includes(s.id)).map((t) => t.t))
      const a = pickFor(s, won) ?? pickFor(s, new Set())
      if (a) {
        review = { activity: a, kind: 'practice', concept: s.id, conceptState: s }
        break
      }
    }
  }
  if (!review) {
    for (const t of tracks) {
      if (out[0] && out[0].activity.track === t) continue
      const a = nextIn(t)
      if (a) {
        review = { activity: a, kind: 'explore' }
        break
      }
    }
  }
  if (review) {
    out.push(review)
    chosen.add(review.activity.id)
  }

  // 3. Stretch: one notch harder than the next mission, in another track (played tracks first).
  const used = new Set(out.map((m) => m.activity.track))
  const stretchTracks = tracks.filter((t) => !used.has(t)).sort((a, b) => Number(!playedTracks.has(a)) - Number(!playedTracks.has(b)))
  for (const t of stretchTracks) {
    const base = nextIn(t)
    if (!base) continue
    const nb = BAND_ORDER[bandIndex(base.band) + 1]
    const harder = list
      .filter(
        (a) =>
          a.track === t &&
          !done[a.id] &&
          !chosen.has(a.id) &&
          unlocked(a) &&
          bandIndex(a.band) - bi <= 1 &&
          ((a.band === base.band && a.difficulty > base.difficulty) || (a.band === nb && a.difficulty <= 2)),
      )
      .sort((a, b) => bandIndex(a.band) - bandIndex(b.band) || a.difficulty - b.difficulty || h(a.id) - h(b.id))[0]
    const pick = harder ?? (base.difficulty >= 3 ? base : undefined)
    if (pick) {
      out.push({ activity: pick, kind: 'stretch' })
      chosen.add(pick.id)
      break
    }
  }

  // Thin catalogue or a finished galaxy: fill from the old date-seeded pool.
  if (out.length < 3) {
    for (const a of legacyDaily(list, band, day, 6)) {
      if (out.length >= 3) break
      if (!chosen.has(a.id)) {
        out.push({ activity: a, kind: out.length === 0 ? 'new' : 'explore' })
        chosen.add(a.id)
      }
    }
  }
  return out.slice(0, 3)
}

/** The original pick: date + band only, three different tracks. Used as a fallback. */
function legacyDaily<T extends ActivitySummary>(list: T[], band: BandId, day: string, count: number): T[] {
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

/** Today's missions as plain activities (kept for older callers; see dailyMissionPlan). */
export function dailyMissions<T extends ActivitySummary>(list: T[], band: BandId, day: string = localDay(), count = 3, ctx: MissionContext = {}): T[] {
  return dailyMissionPlan(list, band, day, ctx)
    .map((m) => m.activity)
    .slice(0, count)
}

export function trackInfo(id: TrackId) {
  return TRACKS.find((t) => t.id === id)
}
