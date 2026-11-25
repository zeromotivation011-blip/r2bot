// lib/kids/classroom-membership.ts
//
// Browser-only: the child's class membership, kept in localStorage. The token
// is the child's only identity for the class. No Supabase here — every call
// goes to our own route handlers under /api/kids/**.

import { getProgress } from '@/lib/kids-progress'
import { encodeDesign, loadDesign } from './robot-design'
import { isBandId, type ClassSnapshot, type JoinedClassInfo } from './classroom'

const KEY = 'r2bot_kids_class_v1'
/** Fired on window when the membership is created, refreshed or removed. */
export const KIDS_CLASS_EVENT = 'r2bot:kids-class'

export interface StoredMembership extends JoinedClassInfo {
  token: string
  joinedAt: string
}

export function loadMembership(): StoredMembership | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(KEY)
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

export function saveMembership(m: StoredMembership): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(m))
    window.dispatchEvent(new CustomEvent(KIDS_CLASS_EVENT))
  } catch {
    /* storage blocked: the child can still play, they just won't sync */
  }
}

export function clearMembership(): void {
  try {
    window.localStorage.removeItem(KEY)
    window.dispatchEvent(new CustomEvent(KIDS_CLASS_EVENT))
  } catch {
    /* ignore */
  }
}

/** Build the compact snapshot the class sees. Counters and the robot code only. */
export function buildSnapshot(): ClassSnapshot {
  const p = getProgress()
  const stuck: Record<string, number> = {}
  for (const [k, attempts] of Object.entries(p.attemptsByLevel ?? {})) {
    if (attempts >= 2 && (p.starsByLevel?.[k] ?? 0) < 2) stuck[k] = attempts
  }
  const stuckTop = Object.fromEntries(Object.entries(stuck).sort((a, b) => b[1] - a[1]).slice(0, 20))
  // loadDesign() falls back to the default robot when nothing was saved, so
  // only send a robot once the child has actually built one.
  let robot: string | null = null
  if ((p.robotsBuilt ?? 0) > 0) {
    try {
      robot = encodeDesign(loadDesign())
    } catch {
      robot = null
    }
  }
  return {
    v: 1,
    totalStars: p.totalStars,
    completedLevels: p.completedLevels.length,
    completedZones: p.completedZones,
    episodesDone: p.episodesDone ?? {},
    codeMissions: p.codeMissions ?? {},
    robotsBuilt: p.robotsBuilt ?? 0,
    totalMinutesPlayed: Math.round(p.totalMinutesPlayed),
    band: p.band,
    robot,
    stuck: stuckTop,
  }
}

export type SyncOutcome = 'ok' | 'removed' | 'unavailable'

/** POST the snapshot (or just a check). Updates or clears the stored membership. */
export async function syncMembership(includeSnapshot: boolean): Promise<SyncOutcome> {
  const m = loadMembership()
  if (!m) return 'removed'
  try {
    const res = await fetch('/api/kids/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(includeSnapshot ? { token: m.token, snapshot: buildSnapshot() } : { token: m.token }),
      keepalive: true,
    })
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; removed?: boolean; class?: JoinedClassInfo }
    if (res.status === 404 && data.removed) {
      clearMembership()
      return 'removed'
    }
    if (res.ok && data.class) {
      const c = data.class
      if (c.className !== m.className || c.teacherName !== m.teacherName || c.nickname !== m.nickname || c.band !== m.band) {
        saveMembership({ ...m, ...c })
      }
      return 'ok'
    }
    return 'unavailable'
  } catch {
    return 'unavailable'
  }
}
