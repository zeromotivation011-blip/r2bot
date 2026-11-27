// lib/kids/activities/run.ts
// Finish one Skill Galaxy run in ONE call (browser): save "done" + best stars,
// log the mastery evidence, award XP/badges through reportActivity (only on a
// first finish or more stars, so replays never farm XP), and report concept
// changes. Used by the Launch Check; the activity player can use it too.

import { reportActivity, type RewardResult } from '../universe/rewards'
import type { ConceptId } from '../universe/mastery'
import {
  getActivitiesDone,
  masteryBadgeId,
  recordActivityMiss,
  recordActivityResult,
  starsForAttempts,
  trackMastery,
  type ActivityMeta,
  type ActivitySummary,
} from './progress'
import { activityXp } from './types'

export interface GalaxyRunResult {
  correct: boolean
  firstTry: boolean
  stars: number
  improved: boolean
  bestStars: number
  reward: RewardResult | null
  /** Every mission of this track × band is now done. */
  trackMasteryEarned: boolean
  newlySecure: ConceptId[]
  recharged: ConceptId[]
}

export function finishGalaxyRun(
  a: ActivityMeta & { badges?: string[] },
  r: { correct: boolean; attempts: number; score: number },
  trackList: ActivitySummary[] = [],
): GalaxyRunResult {
  const tries = Math.max(1, r.attempts)
  if (!r.correct) {
    const c = recordActivityMiss(a)
    return {
      correct: false,
      firstTry: false,
      stars: 0,
      improved: false,
      bestStars: getActivitiesDone()[a.id]?.stars ?? 0,
      reward: null,
      trackMasteryEarned: false,
      newlySecure: c.newlySecure,
      recharged: c.recharged,
    }
  }
  const stars = starsForAttempts(tries)
  const before = getActivitiesDone()
  const outcome = recordActivityResult(a.id, { stars, attempts: tries, score: r.score }, a)
  const after = { ...before, [a.id]: outcome.record }
  const badge = masteryBadgeId(a.track, a.band)
  const earned = trackList.length > 0 && trackMastery(trackList, after, a.track, a.band).mastered && !trackMastery(trackList, before, a.track, a.band).mastered
  let reward: RewardResult | null = null
  if (outcome.improved) {
    const base = activityXp({ difficulty: Math.min(5, Math.max(1, Math.round(a.difficulty))) as 1 | 2 | 3 | 4 | 5 })
    const extra = outcome.firstTime ? 0 : -Math.round(base * 0.5)
    reward = reportActivity({
      kind: 'activity',
      id: a.id,
      xp: Math.max(5, base + extra),
      stars,
      score: Math.round(r.score * 100),
      attempts: tries,
      badges: [...(a.badges ?? []), ...(earned ? [badge] : [])],
    })
  }
  return {
    correct: true,
    firstTry: tries === 1,
    stars,
    improved: outcome.improved,
    bestStars: outcome.record.stars,
    reward,
    trackMasteryEarned: earned,
    newlySecure: outcome.concepts.newlySecure,
    recharged: outcome.concepts.recharged,
  }
}
