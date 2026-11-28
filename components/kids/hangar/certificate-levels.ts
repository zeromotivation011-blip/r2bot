// components/kids/hangar/certificate-levels.ts
//
// Which course certificates the Garage offers (pure, safe anywhere):
//   - every level whose 24 sessions are all finished gets its certificate;
//   - one more card shows the level to work on next, following the child's
//     band (Explorers → Level 1 … Engineers → Level 4): their band's level if
//     it is not finished, else the next unfinished level above it, else the
//     lowest unfinished one. A child with no band starts from Level 1. Nothing
//     next once all four are finished.

import { BAND_ORDER, type BandId } from '@/lib/kids/bands'

export type CourseLevel = 1 | 2 | 3 | 4

export const COURSE_LEVELS: readonly CourseLevel[] = [1, 2, 3, 4]
/** Every level's season has 24 sessions (docs/kids-universe.md). */
export const SESSIONS_PER_COURSE_LEVEL = 24

export function sessionsFinished(sessionsDone: Readonly<Record<string, number>> | undefined, level: CourseLevel): number {
  let n = 0
  for (let i = 1; i <= SESSIONS_PER_COURSE_LEVEL; i++) {
    if ((sessionsDone?.[`L${level}-S${String(i).padStart(2, '0')}`] ?? 0) > 0) n++
  }
  return n
}

/** The course level that matches a band (Explorers 1 … Engineers 4), or 1 when no band is set. */
export function bandLevel(band: BandId | null | undefined): CourseLevel {
  const i = band ? BAND_ORDER.indexOf(band) : -1
  return (i >= 0 ? i + 1 : 1) as CourseLevel
}

export interface CertificatePlan {
  /** Levels with every session finished, lowest first. */
  finished: CourseLevel[]
  /** The level to suggest next, or null when all four are finished. */
  next: CourseLevel | null
}

export function certificatePlan(sessionsDone: Readonly<Record<string, number>> | undefined, band: BandId | null | undefined): CertificatePlan {
  const finished = COURSE_LEVELS.filter((l) => sessionsFinished(sessionsDone, l) >= SESSIONS_PER_COURSE_LEVEL)
  const open = COURSE_LEVELS.filter((l) => !finished.includes(l))
  if (!open.length) return { finished, next: null }
  const start = bandLevel(band)
  const next = open.find((l) => l >= start) ?? open[0]
  return { finished, next }
}
