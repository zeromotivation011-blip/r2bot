// lib/kids/classroom-membership-store.ts
//
// Browser-only: the child's stored class membership (read side only) and its
// event. Split out of classroom-membership.ts so the Kids shell (every /kids
// page) can ask "is this device in a class?" without pulling the snapshot
// builder, the mastery maths and the Skill Galaxy catalogue into the shared
// layout bundle. KidsClassSync loads classroom-membership.ts lazily, and only
// on a device that has joined a class. classroom-membership.ts re-exports
// everything here, so other callers keep importing from there.

import { isBandId, type JoinedClassInfo } from './classroom'

/** A swapped key (lib/kids/profiles.ts SWAPPED_KEYS): always the playing child's. */
export const CLASS_MEMBERSHIP_KEY = 'r2bot_kids_class_v1'
/** Fired on window when the membership is created, refreshed or removed. */
export const KIDS_CLASS_EVENT = 'r2bot:kids-class'

export interface StoredMembership extends JoinedClassInfo {
  token: string
  joinedAt: string
}

export function loadMembership(): StoredMembership | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CLASS_MEMBERSHIP_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as Partial<StoredMembership>
    if (typeof o.token !== 'string' || typeof o.className !== 'string' || typeof o.nickname !== 'string') return null
    return {
      token: o.token,
      className: o.className,
      teacherName: typeof o.teacherName === 'string' ? o.teacherName : null,
      band: isBandId(o.band) ? o.band : 'builders',
      nickname: o.nickname,
      joinedAt: typeof o.joinedAt === 'string' ? o.joinedAt : new Date().toISOString(),
    }
  } catch {
    return null
  }
}
