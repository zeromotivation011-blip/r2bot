// lib/kids/misconceptions/store.ts
//
// BROWSER. Records which misconception a child's wrong course-check pick
// revealed (roadmap #30), in the ONE progress store (lib/kids-progress.ts,
// field `checkMisconceptions`), so it follows the child's profile, travels in
// the backup code and never lowers on a restore.
//
// What is kept: "<session>.<misconception id>" -> times chosen, most recent
// last, at most MISCONCEPTION_STORE_MAX keys. Never the question, the answer
// text or when it was chosen. It stays on the device; a class receives only
// these counts in its snapshot (lib/kids/classroom-membership.ts), and only
// after the child has joined a class.
//
// Not a reward: it never goes through reportActivity and never changes XP,
// stars or badges.

import { getProgress, saveProgress } from '@/lib/kids-progress'
import { MISCONCEPTION_COUNT_MAX, MISCONCEPTION_STORE_MAX, cleanMisconceptionCounts, misconceptionKey } from './keys'

export { optionMisconception } from './keys'

/**
 * A child picked a WRONG option that reveals `misconceptionId` in session
 * `sessionId` ("L1-S05"). Safe to call anywhere: a no-op on the server, with a
 * malformed id, or when storage is blocked. Never throws.
 */
export function recordCheckMisconception(sessionId: string, misconceptionId: string): void {
  if (typeof window === 'undefined') return
  const key = misconceptionKey(sessionId, misconceptionId)
  if (!key) return
  try {
    const cur = cleanMisconceptionCounts(getProgress().checkMisconceptions)
    const n = Math.min(MISCONCEPTION_COUNT_MAX, (cur[key] ?? 0) + 1)
    // Re-insert at the end so the object's order is "least recent first".
    delete cur[key]
    cur[key] = n
    const keys = Object.keys(cur)
    const kept = keys.length > MISCONCEPTION_STORE_MAX ? Object.fromEntries(keys.slice(-MISCONCEPTION_STORE_MAX).map((k) => [k, cur[k]])) : cur
    saveProgress({ checkMisconceptions: kept })
  } catch {
    /* storage blocked: the check still works, nothing is recorded */
  }
}

/** The playing child's counts, most recent FIRST, at most `max` keys. */
export function recentCheckMisconceptions(max: number = MISCONCEPTION_STORE_MAX): Record<string, number> {
  if (typeof window === 'undefined') return {}
  const entries = Object.entries(cleanMisconceptionCounts(getProgress().checkMisconceptions))
  return Object.fromEntries(entries.reverse().slice(0, Math.max(0, max)))
}
