// components/kids/hangar/cosmetics.ts
// What the child has chosen to wear in the Hangar, and what they own.
//
// Storage (the Hangar contract — this comment is its documentation):
//   - PAINT is the robot's primary colour, so it is saved INTO the robot design
//     (`saveDesign` in lib/kids/robot-design.ts). Every surface that draws the
//     robot (Workshop, Code Lab, AR) then shows the new paint for free.
//   - DECAL, TRAIL and SKIN are Hangar-only looks with no effect on what the
//     robot can do, so they live in their own localStorage key,
//     `r2bot_kids_hangar_v1` = { decal, trail, skin, workshopColour, booster }.
//     `booster` = the Spark Trail Rocket Booster add-on is on (owned only
//     when `earnedParts` holds 'robot-rocket-pack'; drawn in the bay only).
//     `workshopColour` remembers the colour the child picked in the Workshop
//     before their first earned paint, so "Workshop colour" can put it back.
//
// Ownership is read from lib/kids-progress.ts (`unlocks`, `badges`, `xp`).
// This file never writes progress; lib/kids/universe/rewards.ts owns that.
//
// Pure data + localStorage helpers. No three.js here.

import type { KidsProgress } from '@/lib/kids-progress'
import { UNLOCKS, getBadge, levelInfo, type Unlock } from '@/lib/kids/universe/rewards'

export const HANGAR_KEY = 'r2bot_kids_hangar_v1'
export const HANGAR_CHANGED_EVENT = 'r2bot:kids-hangar'

export type CosmeticKind = 'paint' | 'decal' | 'trail' | 'skin'

export interface HangarCosmetics {
  decal: string | null
  trail: string | null
  skin: string | null
  /** The Workshop colour before an earned paint replaced it. */
  workshopColour: string | null
  /** The Spark Trail Rocket Booster add-on is fitted (Hangar bay only). */
  booster: boolean
}

export const EMPTY_COSMETICS: HangarCosmetics = { decal: null, trail: null, skin: null, workshopColour: null, booster: false }

/** The Spark Trail part that unlocks the booster add-on. */
export const BOOSTER_PART_ID = 'robot-rocket-pack'

const HEX = /^#[0-9A-Fa-f]{6}$/

function str(x: unknown): string | null {
  return typeof x === 'string' && x.length < 64 ? x : null
}

export function loadCosmetics(): HangarCosmetics {
  if (typeof window === 'undefined') return { ...EMPTY_COSMETICS }
  try {
    const raw = window.localStorage.getItem(HANGAR_KEY)
    if (!raw) return { ...EMPTY_COSMETICS }
    const o: unknown = JSON.parse(raw)
    if (!o || typeof o !== 'object') return { ...EMPTY_COSMETICS }
    const r = o as Record<string, unknown>
    const wc = str(r.workshopColour)
    return { decal: str(r.decal), trail: str(r.trail), skin: str(r.skin), workshopColour: wc && HEX.test(wc) ? wc : null, booster: r.booster === true }
  } catch {
    return { ...EMPTY_COSMETICS }
  }
}

export function saveCosmetics(c: HangarCosmetics): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(HANGAR_KEY, JSON.stringify(c))
    window.dispatchEvent(new CustomEvent(HANGAR_CHANGED_EVENT))
  } catch {
    /* storage blocked: the look simply is not remembered */
  }
}

/**
 * True when the child owns the unlock. The rewards engine records unlocks in
 * `progress.unlocks` the next time it runs; we also honour an unlock whose
 * condition is already met, so a child never sees "locked" for something
 * they have visibly earned (e.g. progress synced from a class).
 */
export function owns(u: Unlock, p: KidsProgress): boolean {
  if (p.unlocks.includes(u.id)) return true
  if (u.atLevel !== undefined && levelInfo(p.xp).level >= u.atLevel) return true
  if (u.byBadge !== undefined && Boolean(p.badges[u.byBadge])) return true
  return false
}

/** "Reach Rank 5" / "Earn the PID Tuner badge" — what the child has to do. */
export function howToEarn(u: Unlock): string {
  if (u.atLevel !== undefined) return `Reach Rank ${u.atLevel}`
  if (u.byBadge) {
    const b = getBadge(u.byBadge)
    return `Earn the ${b ? b.name : u.byBadge} badge`
  }
  return 'Keep exploring'
}

export function unlocksOf(kind: CosmeticKind): Unlock[] {
  return UNLOCKS.filter((u) => u.kind === kind)
}

/** Drop any chosen look the child no longer owns (progress reset, new device). */
export function ownedOnly(c: HangarCosmetics, p: KidsProgress): HangarCosmetics {
  const keep = (id: string | null, kind: CosmeticKind) => {
    if (!id) return null
    const u = UNLOCKS.find((x) => x.id === id && x.kind === kind)
    return u && owns(u, p) ? id : null
  }
  return {
    ...c,
    decal: keep(c.decal, 'decal'),
    trail: keep(c.trail, 'trail'),
    skin: keep(c.skin, 'skin'),
    booster: c.booster && p.earnedParts.includes(BOOSTER_PART_ID),
  }
}

/** Short look descriptions, said in the picker and used as alt text. */
export const LOOK_NOTES: Record<string, string> = {
  'decal-lightning': 'A glowing lightning bolt on the front of your robot.',
  'decal-eye': 'A sensor eye that glows cyan, for robots that look before they move.',
  'decal-wave': 'A wavy line, the badge of every line-following robot.',
  'decal-gear': 'A golden gear for engineers who pick the right ratio.',
  'trail-sparkle': 'Twinkling sparks follow your robot when it drives.',
  'trail-rainbow': 'A rainbow ribbon streams out behind your robot.',
  'trail-plasma': 'A hot plasma glow, as smooth as a tuned controller.',
  'skin-mars': 'Red Martian dust and scratches from a long rover drive.',
  'skin-circuit': 'Green circuit-board traces all over the body.',
}
