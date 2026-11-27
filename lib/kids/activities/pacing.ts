// lib/kids/activities/pacing.ts
// Adaptive pacing for the Skill Galaxy (roadmap #29). Pure helpers plus two
// tiny store functions:
//
//   - Tiers: the Universe's four tiers (lib/kids/universe/tiers.ts) mapped onto
//     a band's difficulty 1–5: Cadet 1–2 · Pilot 3 · Ace 4 · Legend 5.
//   - Start points per track (KidsProgress.galaxyStart), set by the Launch Check
//     or by accepting "skip to Ace?". Missions before a start point stay open;
//     they are just not suggested.
//   - Three first-try wins in a row in a track → offer "skip to Ace?".
//   - Two misses in a row (in a track, or two wrong checks inside one mission)
//     → offer an easier mission on the same concept.
//
// Offers, never forced: the child can always say no, and nothing is lost.

import { getProgress, saveProgress } from '../../kids-progress'
import { BAND_ORDER, type BandId } from '../bands'
import { TIER_NAMES, type TierName } from '../universe/tiers'
import type { ConceptTry } from '../universe/mastery'
import { missingPrereqs, type ActivitiesDone, type ActivitySummary, type StartPoint, type TrackStarts } from './progress'
import { TRACKS, type TrackId } from './types'

// ── Tiers ────────────────────────────────────────────────────────────────────

const TIER_MIN: Record<TierName, number> = { Cadet: 1, Pilot: 3, Ace: 4, Legend: 5 }

export function tierForDifficulty(d: number): TierName {
  return d >= 5 ? 'Legend' : d >= 4 ? 'Ace' : d >= 3 ? 'Pilot' : 'Cadet'
}

export function minDifficultyForTier(t: TierName): number {
  return TIER_MIN[t]
}

export { TIER_NAMES, type TierName }

// ── Start points in the store ────────────────────────────────────────────────

const START_RE = /^(explorers|builders|inventors|engineers):([1-5])$/

export function parseStart(v: string | undefined): StartPoint | undefined {
  const m = typeof v === 'string' ? START_RE.exec(v) : null
  return m ? { band: m[1] as BandId, minDifficulty: Number(m[2]) } : undefined
}

export function formatStart(s: StartPoint): string {
  return `${s.band}:${Math.min(5, Math.max(1, Math.round(s.minDifficulty)))}`
}

/** All start points from a progress object (or the store). */
export function startsFrom(galaxyStart: Record<string, string> | undefined): TrackStarts {
  const out: TrackStarts = {}
  for (const t of TRACKS) {
    const s = parseStart(galaxyStart?.[t.id])
    if (s) out[t.id] = s
  }
  return out
}

export function readStarts(): TrackStarts {
  return startsFrom(getProgress().galaxyStart)
}

/** Save a track's start point (browser). Fires KIDS_PROGRESS_EVENT. */
export function setTrackStart(track: TrackId, start: StartPoint): void {
  const p = getProgress()
  saveProgress({ galaxyStart: { ...(p.galaxyStart ?? {}), [track]: formatStart(start) } })
}

export function describeStart(s: StartPoint | undefined): string {
  if (!s) return 'From the start'
  const band = s.band.charAt(0).toUpperCase() + s.band.slice(1)
  return `${band} · ${tierForDifficulty(s.minDifficulty)}`
}

// ── Runs in a track ──────────────────────────────────────────────────────────

/** Trailing run in a track: consecutive first-try wins, or consecutive misses, at the end of the log. */
export function trackRun(log: readonly ConceptTry[], track: TrackId): { wins: number; misses: number } {
  const mine = log.filter((t) => t.k === track)
  let wins = 0
  let misses = 0
  for (let i = mine.length - 1; i >= 0; i--) {
    if (mine[i].ok === 1) {
      if (misses) break
      wins++
    } else {
      if (wins) break
      misses++
    }
  }
  return { wins, misses }
}

export const SKIP_AFTER_WINS = 3
export const EASIER_AFTER_MISSES = 2

/**
 * Offer "skip to Ace?" when the child has won the last three missions of this
 * track first try, the mission just played was below Ace, and the track's start
 * point is not already at Ace or beyond in this band.
 */
export function shouldOfferSkip(log: readonly ConceptTry[], track: TrackId, band: BandId, playedDifficulty: number, start?: StartPoint): boolean {
  if (trackRun(log, track).wins < SKIP_AFTER_WINS) return false
  if (playedDifficulty >= 4) return false
  if (start && (BAND_ORDER.indexOf(start.band) > BAND_ORDER.indexOf(band) || (start.band === band && start.minDifficulty >= 4))) return false
  return true
}

/** The Ace start point for a band, and the first Ace mission there that is open. */
export function aceTarget<T extends ActivitySummary>(list: readonly T[], track: TrackId, band: BandId, done: ActivitiesDone): { start: StartPoint; first: T | undefined } {
  const start: StartPoint = { band, minDifficulty: 4 }
  const first = list
    .filter((a) => a.track === track && a.band === band && a.difficulty >= 4 && !done[a.id] && missingPrereqs(a, done).length === 0)
    .sort((a, b) => a.difficulty - b.difficulty || a.title.localeCompare(b.title))[0]
  return { start, first }
}

export function shouldOfferEasier(log: readonly ConceptTry[], track: TrackId, wrongChecksInARow = 0): boolean {
  return wrongChecksInARow >= EASIER_AFTER_MISSES || trackRun(log, track).misses >= EASIER_AFTER_MISSES
}

/**
 * An easier mission on the same concept: shares the activity's first concept
 * (else any of its concepts), is easier (lower difficulty in the same band, or
 * the band below), unlocked, not this one. Not-done first, same track first,
 * closest difficulty first.
 */
export function easierSameConcept<T extends ActivitySummary>(
  list: readonly T[],
  activity: Pick<ActivitySummary, 'id' | 'track' | 'band' | 'difficulty' | 'concepts'>,
  done: ActivitiesDone,
): T | undefined {
  const bi = BAND_ORDER.indexOf(activity.band)
  const level = (a: Pick<ActivitySummary, 'band' | 'difficulty'>) => BAND_ORDER.indexOf(a.band) * 5 + a.difficulty
  const here = level(activity)
  const concepts = activity.concepts ?? []
  for (const pool of [concepts.slice(0, 1), concepts]) {
    if (!pool.length) continue
    const c = list
      .filter(
        (a) =>
          a.id !== activity.id &&
          a.concepts?.some((x) => pool.includes(x)) &&
          level(a) < here &&
          BAND_ORDER.indexOf(a.band) >= bi - 1 &&
          missingPrereqs(a, done).length === 0,
      )
      .sort(
        (a, b) =>
          Number(!!done[a.id]) - Number(!!done[b.id]) ||
          Number(a.track !== activity.track) - Number(b.track !== activity.track) ||
          here - level(a) - (here - level(b)) ||
          a.id.localeCompare(b.id),
      )[0]
    if (c) return c
  }
  return undefined
}
