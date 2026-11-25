// lib/kids/universe/tiers.ts
// The difficulty tier names every Universe game shares. A plain module (no
// React, no game shell) so lightweight surfaces such as the Hangar can show
// personal bests per tier without pulling the game shell into their bundle.

export const TIER_NAMES = ['Cadet', 'Pilot', 'Ace', 'Legend'] as const

export type TierName = (typeof TIER_NAMES)[number]
