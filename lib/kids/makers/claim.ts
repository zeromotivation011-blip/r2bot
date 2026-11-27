// lib/kids/makers/claim.ts — works out which `careers` badges this child has
// earned (browser only). Badges are awarded ONLY through rewards.ts: this file
// never writes the progress store. The integrator wires the report callback,
// e.g. in RewardToastClient after a Robodex or Makers event:
//
//   claimCareerBadges((id) => reportActivity({ kind: 'discovery', id: `careers-${id}`, xp: 0, badges: [id] }))
//
// (see the hand-off notes: 'careers' joins BadgeTrack and CAREER_BADGES joins
// UNIVERSE_BADGES; a kind that no quest counts keeps quests honest).

import { getProgress } from '../../kids-progress'
import { conceptStates } from '../universe/mastery'
import type { ConceptId } from '../curriculum/types'
import type { ConceptStatus } from '../universe/mastery'
import { ROBODEX_CARDS } from '../robodex/cards'
import { worldTotals } from '../robodex/discover'
import { readRobodex } from '../robodex/store'
import { careerBadgesDue, careerLights, type CareerBadgeState } from './careers'
import { readHeard } from './heard'

export function careerBadgeState(): CareerBadgeState {
  const p = getProgress()
  const found = new Set(Object.keys(readRobodex().found))
  const totals = worldTotals(ROBODEX_CARDS, found)
  const statuses: Partial<Record<ConceptId, ConceptStatus>> = {}
  for (const s of conceptStates({ conceptLog: p.conceptLog ?? [], conceptSecured: p.conceptSecured ?? {} })) statuses[s.id] = s.status
  return {
    cardsFound: found.size,
    worldsComplete: Object.values(totals).filter((t) => t.total > 0 && t.found === t.total).length,
    storiesHeard: readHeard().length,
    fullCareers: careerLights(statuses).filter((c) => c.have === c.stars.length).length,
  }
}

/** Calls `report` once for each earned badge the child does not own yet. Returns those ids. */
export function claimCareerBadges(report: (badgeId: string) => void): string[] {
  if (typeof window === 'undefined') return []
  const owned = getProgress().badges ?? {}
  const due = careerBadgesDue(careerBadgeState()).filter((id) => !owned[id])
  for (const id of due) report(id)
  return due
}
