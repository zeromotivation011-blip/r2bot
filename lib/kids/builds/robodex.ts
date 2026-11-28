// lib/kids/builds/robodex.ts
//
// The Robodex "build" trigger (optional roadmap item after #44): answering the
// "I built it" check-in on a Make It at Home build discovers the Robodex card of
// the real robot that does the same thing (HomeBuild.robodex). Check-ins made
// before this existed, or restored from a backup code, discover their cards the
// next time the child opens the build or the Make It at Home list — so no
// earned card is ever missed, and nothing is ever removed.
//
// Discovering a card pays no XP (lib/kids/robodex/store.ts): the check-in's own
// reportBestRun already did. The Robodex store (and its card catalogue) is
// loaded only when there is something to discover, so the build pages stay light.

import type { BuildsState } from './store'

/** Robodex card ids earned by the checked-in builds (build id -> card id map from the server), de-duplicated. */
export function cardsForCheckIns(built: Readonly<BuildsState>, cardByBuild: Readonly<Record<string, string>>): string[] {
  const out = new Set<string>()
  for (const id of Object.keys(built)) {
    const card = cardByBuild[id]
    if (card) out.add(card)
  }
  return [...out]
}

/**
 * Discover these cards for the playing child. Browser-only; never throws.
 * Returns the ids that were new (each fires ROBODEX_EVENT, so the Robodex toast
 * can celebrate).
 */
export async function discoverBuildCards(cardIds: readonly string[]): Promise<string[]> {
  if (typeof window === 'undefined' || cardIds.length === 0) return []
  try {
    const { discoverRobot } = await import('../robodex/store')
    return cardIds.filter((id) => discoverRobot(id))
  } catch {
    return []
  }
}
