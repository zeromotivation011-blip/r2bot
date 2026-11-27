// lib/kids/robodex/store.ts — the child's Robodex collection on THIS device.
//
// Browser-only (every function is a safe no-op on the server). Per child: the
// key goes through profileKey() (lib/kids/profiles.ts), so each profile on a
// shared device has its own collection. It is NOT in SWAPPED_KEYS (the rule:
// one mechanism per store, never both).
//
//   discoverRobot(id)   mark one card found (for explicit hook points)
//   syncRobodex()       re-read every evidence store and add what was earned
//   ROBODEX_EVENT       fired on window with { ids } when cards are found
//
// Discovering a card pays no XP of its own: the activity or game that revealed
// it already did (lib/kids/universe/rewards.ts). The card is the reward.

import { getProgress, getProgressOf } from '../../kids-progress'
import { ACTIVITIES_KEY, getActivitiesDone } from '../activities/progress'
import { namespacedKey, profileKey, storageKeyFor } from '../profiles'
import { ROBODEX_CARDS, isRobodexCardId } from './cards'
import { buildEvidence, cardsEarned, decodeFound, encodeFound } from './discover'

export const ROBODEX_KEY = 'r2bot_kids_robodex_v1'
export const ROBODEX_EVENT = 'r2bot:kids-robodex'

export interface RobodexState {
  /** Card id -> local day (YYYY-MM-DD) it was found. */
  found: Record<string, string>
  /** Card ids the child has opened at least once (new cards glow until then). */
  seen: string[]
}

export interface RobodexEventDetail {
  ids: string[]
}

const EMPTY: RobodexState = { found: {}, seen: [] }

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function localDay(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function clean(x: unknown): RobodexState {
  if (!x || typeof x !== 'object') return { ...EMPTY, found: {}, seen: [] }
  const o = x as Record<string, unknown>
  const found: Record<string, string> = {}
  if (o.found && typeof o.found === 'object' && !Array.isArray(o.found)) {
    for (const [k, v] of Object.entries(o.found as Record<string, unknown>)) {
      if (isRobodexCardId(k) && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) found[k] = v
    }
  }
  const seen = Array.isArray(o.seen) ? o.seen.filter((id): id is string => isRobodexCardId(id) && id in found) : []
  return { found, seen: [...new Set(seen)] }
}

function readAt(key: string): RobodexState {
  if (!isBrowser()) return { found: {}, seen: [] }
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? clean(JSON.parse(raw)) : { found: {}, seen: [] }
  } catch {
    return { found: {}, seen: [] }
  }
}

function writeAt(key: string, st: RobodexState): boolean {
  if (!isBrowser()) return false
  try {
    window.localStorage.setItem(key, JSON.stringify(st))
    return true
  } catch {
    return false
  }
}

function announce(ids: string[]): void {
  if (!ids.length || !isBrowser()) return
  try {
    window.dispatchEvent(new CustomEvent<RobodexEventDetail>(ROBODEX_EVENT, { detail: { ids } }))
  } catch {
    /* ignore */
  }
}

/** The playing child's collection. */
export function readRobodex(): RobodexState {
  return readAt(profileKey(ROBODEX_KEY))
}

/** One profile's collection without switching to it (parent hub). Read-only. */
export function readRobodexOf(profileId: string | null): RobodexState {
  return readAt(namespacedKey(ROBODEX_KEY, profileId))
}

/** Add cards to the playing child's collection. Returns the ids that were new. */
function addFound(ids: readonly string[], now: Date = new Date()): string[] {
  const key = profileKey(ROBODEX_KEY)
  const st = readAt(key)
  const fresh = ids.filter((id) => isRobodexCardId(id) && !(id in st.found))
  if (!fresh.length) return []
  const day = localDay(now)
  for (const id of fresh) st.found[id] = day
  return writeAt(key, st) ? fresh : []
}

/**
 * Mark one card found because the child just did the thing that reveals it.
 * Returns true when it was new (and fires ROBODEX_EVENT). Use for hook points
 * that have no other evidence store; most cards are found by syncRobodex().
 */
export function discoverRobot(id: string, now: Date = new Date()): boolean {
  const fresh = addFound([id], now)
  announce(fresh)
  return fresh.length > 0
}

/** Every card the playing child's saved progress earns (pure read). */
export function earnedNow(): string[] {
  const p = getProgress()
  return cardsEarned(
    ROBODEX_CARDS,
    buildEvidence({ activitiesDone: getActivitiesDone(), personalBests: p.personalBests, episodesDone: p.episodesDone, conceptSecured: p.conceptSecured }),
  )
}

/** Cards one profile's saved progress earns (parent hub; reads the profile's own stores). */
export function earnedFor(profileId: string | null): string[] {
  const p = getProgressOf(profileId)
  let done: Record<string, unknown> = {}
  if (isBrowser()) {
    try {
      const raw = window.localStorage.getItem(storageKeyFor(ACTIVITIES_KEY, profileId))
      const parsed: unknown = raw ? JSON.parse(raw) : {}
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) done = parsed as Record<string, unknown>
    } catch {
      done = {}
    }
  }
  const st = readRobodexOf(profileId)
  const earned = cardsEarned(ROBODEX_CARDS, buildEvidence({ activitiesDone: done, personalBests: p.personalBests, episodesDone: p.episodesDone, conceptSecured: p.conceptSecured }))
  return [...new Set([...Object.keys(st.found), ...earned])]
}

/**
 * Re-read the evidence and add every earned card that is not yet in the
 * collection. Returns the new ids (and fires ROBODEX_EVENT when there are any).
 * Cheap: a few localStorage reads. Safe to call after every reward.
 */
export function syncRobodex(now: Date = new Date()): string[] {
  if (!isBrowser()) return []
  const fresh = addFound(earnedNow(), now)
  announce(fresh)
  return fresh
}

/** The child opened a card: it stops glowing as "new". */
export function markRobodexSeen(id: string): void {
  const key = profileKey(ROBODEX_KEY)
  const st = readAt(key)
  if (!(id in st.found) || st.seen.includes(id)) return
  st.seen = [...st.seen, id]
  writeAt(key, st)
}

// ── Backup code (lib/kids-progress.ts exportProgressCode `extras`) ──────────────

/** The collection as a short string for the progress backup code (`extras.robodex`). */
export function robodexBackupExtra(profileId?: string | null): string {
  const st = profileId === undefined ? readRobodex() : readRobodexOf(profileId)
  return encodeFound(ROBODEX_CARDS, new Set(Object.keys(st.found)))
}

/** Merge a restored collection into the playing child's (union: a restore never removes a card). Returns how many were added. */
export function restoreRobodexExtra(code: unknown, now: Date = new Date()): number {
  const ids = decodeFound(ROBODEX_CARDS, code)
  return addFound(ids, now).length
}
