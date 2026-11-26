// lib/kids/classroom-membership.ts
//
// Browser-only: the child's class membership, kept in localStorage. The token
// is the child's only identity for the class. No Supabase here — every call
// goes to our own route handlers under /api/kids/**.

import { getProgress } from '@/lib/kids-progress'
import { encodeDesign, loadDesign } from './robot-design'
import { getActivitiesDone } from './activities/progress'
import { GAMES } from './universe/worlds'
import {
  SNAPSHOT_ACTIVITY_BYTES,
  SNAPSHOT_MAX_ACTIVITIES,
  capIds,
  isBandId,
  type ClassSnapshot,
  type JoinedClassInfo,
} from './classroom'
import { isAssignmentKind, type ChildMission } from './classroom-assignments'

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
    window.localStorage.removeItem(MISSIONS_KEY)
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
  // Skill Galaxy: the class's assigned activities first (so the teacher's
  // completion count is exact even when the list is capped), then the most
  // recently finished.
  const assigned = new Set(loadMissions()?.missions.filter((m) => m.kind === 'activity').map((m) => m.itemId) ?? [])
  const done = getActivitiesDone()
  const doneIds = Object.keys(done).sort((a, b) => {
    const pa = assigned.has(a) ? 1 : 0
    const pb = assigned.has(b) ? 1 : 0
    if (pa !== pb) return pb - pa
    return (done[b].at || '').localeCompare(done[a].at || '')
  })
  // Games: a game counts as played once it has a personal best ("<game>:t<tier>").
  const gameIds = new Set(GAMES.map((g) => g.id))
  const gamesPlayed = Array.from(new Set(Object.keys(p.personalBests ?? {}).map((k) => k.split(':')[0]))).filter((id) => gameIds.has(id))
  const sessionsDone: Record<string, number> = {}
  for (const [k, v] of Object.entries(p.sessionsDone ?? {})) if (/^L[1-4]-S\d{2}$/.test(k) && v > 0) sessionsDone[k] = Math.min(3, v)
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
    sessionsDone,
    activitiesDone: capIds(doneIds, SNAPSHOT_MAX_ACTIVITIES, SNAPSHOT_ACTIVITY_BYTES),
    gamesPlayed: gamesPlayed.slice(0, 30),
  }
}

// ── "From your teacher" missions (migration 0055) ───────────────────────────
const MISSIONS_KEY = 'r2bot_kids_class_missions_v1'
/** Fired on window when the cached missions change. */
export const KIDS_MISSIONS_EVENT = 'r2bot:kids-missions'

export interface CachedMissions {
  /** ISO time of the fetch. */
  at: string
  missions: ChildMission[]
}

export function loadMissions(): CachedMissions | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(MISSIONS_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as Partial<CachedMissions>
    if (!Array.isArray(o.missions) || typeof o.at !== 'string') return null
    const missions = o.missions.filter(
      (m): m is ChildMission =>
        !!m && typeof m === 'object' && isAssignmentKind((m as ChildMission).kind) &&
        typeof (m as ChildMission).itemId === 'string' && typeof (m as ChildMission).title === 'string' &&
        typeof (m as ChildMission).href === 'string' && (m as ChildMission).href.startsWith('/kids/'),
    )
    return { at: o.at, missions }
  } catch {
    return null
  }
}

function saveMissions(missions: ChildMission[]): void {
  try {
    window.localStorage.setItem(MISSIONS_KEY, JSON.stringify({ at: new Date().toISOString(), missions }))
    window.dispatchEvent(new CustomEvent(KIDS_MISSIONS_EVENT))
  } catch {
    /* storage blocked: the card simply shows what came back this time */
  }
}

export type MissionsOutcome =
  | { kind: 'ok'; missions: ChildMission[] }
  | { kind: 'none' }
  | { kind: 'unavailable' }

/**
 * Ask the class for its missions with the member token. 'none' when this
 * browser is not in a class (or was removed); 'unavailable' before 0055 runs
 * or offline — the caller then keeps showing the cached list, if any.
 */
export async function fetchMissions(): Promise<MissionsOutcome> {
  const m = loadMembership()
  if (!m) return { kind: 'none' }
  try {
    const res = await fetch('/api/kids/missions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: m.token }),
      cache: 'no-store',
    })
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; removed?: boolean; missions?: ChildMission[] }
    if (res.status === 404 && data.removed) {
      clearMembership()
      return { kind: 'none' }
    }
    if (res.ok && Array.isArray(data.missions)) {
      saveMissions(data.missions)
      return { kind: 'ok', missions: loadMissions()?.missions ?? data.missions }
    }
    return { kind: 'unavailable' }
  } catch {
    return { kind: 'unavailable' }
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
