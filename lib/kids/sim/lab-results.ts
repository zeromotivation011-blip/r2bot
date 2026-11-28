// lib/kids/sim/lab-results.ts
// The Physics Lab and Power Lab result store (build log #23). A solved arena is
// kept in the ONE progress store as a personal best, `personalBests["lab:<id>"]`,
// written only through reportBestRun, so:
//   * the first solve pays the challenge reward once, and only a faster solve pays again
//     (half XP, the rewards rule for anything that can be replayed);
//   * it is per child (the progress store is per profile) and rides in the backup code
//     with every other personal best (progress-backup.verify checks a restore keeps it);
//   * a Level 3–4 course session that plays a lab arena reads it (reusePlayDone) instead
//     of asking the child to say "I finished it".
//
// The score is HIGHER-IS-BETTER on purpose: tenths of a second to spare under the arena's
// time limit (at least 1 for any success). A backup restore merges personal bests by taking
// the larger number, so a time stored as "lower is better" would be merged the wrong way.
// Nothing else writes these keys.

import type { RunResult } from './run'
import type { Arena } from './arena'
import { labResultId, labSolved } from './lab-links'
import { reportBestRun, type RewardResult } from '../universe/rewards'
import { getProgress } from '../../kids-progress'

export { labResultId, labSolved }

/** A successful run as stored: tenths of a second to spare under the time limit, at least 1. */
export function labScore(arena: Pick<Arena, 'timeLimit'>, result: Pick<RunResult, 'time'>): number {
  return Math.max(1, Math.round((arena.timeLimit - result.time) * 10))
}

/** The run time a stored score stands for, seconds (one decimal). */
export function labTimeOf(arena: Pick<Arena, 'timeLimit'>, score: number): number {
  return Math.max(0, Math.round((arena.timeLimit * 10 - score)) / 10)
}

/**
 * Report a finished lab run. Only a success counts (a missing-part refusal never runs, so it
 * cannot succeed). Returns the reward for a first solve or a faster one, or null.
 */
export function reportLabRun(demoId: string, arena: Pick<Arena, 'timeLimit'>, result: RunResult | null): RewardResult | null {
  if (!result || !result.success) return null
  return reportBestRun({ kind: 'challenge', id: labResultId(demoId), score: labScore(arena, result) })
}

/** The child's best time on a lab arena, seconds, or null when it is not solved yet. */
export function labBestTime(demoId: string, arena: Pick<Arena, 'timeLimit'>): number | null {
  const v = getProgress().personalBests[labResultId(demoId)]
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? labTimeOf(arena, v) : null
}
