// lib/kids/makers/heard.ts — which Maker stories this child has heard or read.
//
// Browser-only, per child through profileKey() (not in SWAPPED_KEYS). Stores
// only maker ids from MAKERS; nothing personal. Used for the "Meet the Makers"
// badge and to mark stories already heard.

import { profileKey } from '../profiles'
import { getMaker } from './makers'

export const MAKERS_HEARD_KEY = 'r2bot_kids_makers_heard_v1'
export const MAKERS_HEARD_EVENT = 'r2bot:kids-makers-heard'

export function readHeard(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(profileKey(MAKERS_HEARD_KEY))
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? [...new Set(parsed.filter((x): x is string => typeof x === 'string' && !!getMaker(x)))] : []
  } catch {
    return []
  }
}

/** Mark a story heard (played to the end, or read to the end). Returns true when it was new. */
export function markHeard(id: string): boolean {
  if (typeof window === 'undefined' || !getMaker(id)) return false
  const cur = readHeard()
  if (cur.includes(id)) return false
  try {
    window.localStorage.setItem(profileKey(MAKERS_HEARD_KEY), JSON.stringify([...cur, id]))
    window.dispatchEvent(new CustomEvent(MAKERS_HEARD_EVENT, { detail: { id } }))
    return true
  } catch {
    return false
  }
}
