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
import { CONCEPT_IDS, conceptGridCode, conceptStates } from './universe/mastery'
import { clearClassDiary, misconceptionCounts, workDays } from './classroom-diary'
import type { ChildPowerUp } from './classroom-goal'

const KEY = 'r2bot_kids_class_v1'
/** components/kids/course/course-state.ts COURSE_KEY (read-only here; a swapped key, so it is the playing child's). */
const COURSE_KEY = 'r2bot_kids_course_v1'
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
    window.localStorage.removeItem(POWER_UP_KEY)
    clearClassDiary()
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
  const activitiesDone = capIds(doneIds, SNAPSHOT_MAX_ACTIVITIES, SNAPSHOT_ACTIVITY_BYTES)
  // Two digits per activity: best stars, attempts on the best run (9 = nine or more).
  const activityScores = activitiesDone
    .map((id) => `${Math.min(3, Math.max(1, done[id]?.stars ?? 1))}${Math.min(9, Math.max(1, Math.round(done[id]?.attempts ?? 1)))}`)
    .join('')
  // Mastery (roadmap #27/#31): the grid letters and the numbers behind them.
  let concepts = ''
  let conceptEvidence = ''
  try {
    concepts = conceptGridCode(p)
    const states = conceptStates(p)
    const byId = new Map(states.map((x) => [x.id, x]))
    conceptEvidence = CONCEPT_IDS.map((id) => {
      const x = byId.get(id)
      if (!x) return '0.0.0.-'
      const c = (n: number) => Math.min(999, Math.max(0, Math.round(n)))
      return `${c(x.recentWins)}.${c(x.tries)}.${c(x.misses)}.${x.daysSinceWin === null ? '-' : c(x.daysSinceWin)}`
    }).join('|')
  } catch {
    concepts = ''
    conceptEvidence = ''
  }
  // Galaxy activities missed twice or more and never won first try (from the concept log).
  const perActivity = new Map<string, { miss: number; win: number }>()
  for (const t of p.conceptLog ?? []) {
    const cur = perActivity.get(t.a) ?? { miss: 0, win: 0 }
    if (t.ok) cur.win += 1
    else cur.miss += 1
    perActivity.set(t.a, cur)
  }
  const galaxyStuck = Object.fromEntries(
    [...perActivity.entries()]
      .filter(([id, r]) => r.miss >= 2 && r.win === 0 && (done[id]?.stars ?? 0) < 2)
      .sort((a, b) => b[1].miss - a[1].miss)
      .slice(0, 12)
      .map(([id, r]) => [id, Math.min(99, r.miss)]),
  )
  // Game tiers reached: personal bests are "<game>:t<tier>".
  const gameTiers: Record<string, number> = {}
  for (const k of Object.keys(p.personalBests ?? {})) {
    const m = /^([a-z0-9][a-z0-9_-]{0,63}):t(\d)$/.exec(k)
    if (m && gameIds.has(m[1])) gameTiers[m[1]] = Math.max(gameTiers[m[1]] ?? 0, Number(m[2]))
  }
  return {
    v: 1,
    totalStars: p.totalStars,
    completedLevels: p.completedLevels.length,
    completedZones: p.completedZones,
    episodesDone: p.episodesDone ?? {},
    codeMissions: p.codeMissions ?? {},
    robotsBuilt: p.robotsBuilt ?? 0,
    // Roadmap #13: minutes are no longer reported to the class (reward learning, not time).
    totalMinutesPlayed: 0,
    band: p.band,
    robot,
    stuck: stuckTop,
    sessionsDone,
    activitiesDone,
    gamesPlayed: gamesPlayed.slice(0, 30),
    concepts,
    conceptEvidence,
    activityScores,
    galaxyStuck,
    courseStuck: courseStuckSessions(),
    misconceptions: misconceptionCounts(),
    gameTiers,
    days: workDays(),
  }
}

/** Course sessions whose challenge was tried 3+ times with no star and not finished (course state store). */
function courseStuckSessions(): Record<string, number> {
  const out: Record<string, number> = {}
  try {
    const raw = window.localStorage.getItem(COURSE_KEY)
    if (!raw) return out
    const o = JSON.parse(raw) as { sessions?: Record<string, { challengeAttempts?: unknown; challengeStars?: unknown; done?: unknown }> }
    const rows = Object.entries(o.sessions ?? {})
      .filter(([k, v]) => /^L[1-4]-S\d{2}$/.test(k) && !!v && typeof v === 'object')
      .map(([k, v]) => [k, typeof v.challengeAttempts === 'number' ? v.challengeAttempts : 0, v.challengeStars, v.done] as const)
      .filter(([, attempts, stars, isDone]) => attempts >= 3 && !stars && !isDone)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
    for (const [k, attempts] of rows) out[k] = Math.min(99, Math.floor(attempts))
  } catch {
    /* a malformed store just means no signal */
  }
  return out
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

// ── Class Power-Up (roadmap #40, migration 0056) ─────────────────────────────
const POWER_UP_KEY = 'r2bot_kids_class_powerup_v1'
/** Fired on window when the cached class goal changes. */
export const KIDS_POWER_UP_EVENT = 'r2bot:kids-powerup'

export function loadPowerUp(): ChildPowerUp | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(POWER_UP_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as { p?: ChildPowerUp | null }
    const p = o.p
    if (!p || typeof p !== 'object' || !p.goal || typeof p.done !== 'number' || typeof p.target !== 'number') return null
    return p
  } catch {
    return null
  }
}

function savePowerUp(p: ChildPowerUp | null): void {
  try {
    if (p) window.localStorage.setItem(POWER_UP_KEY, JSON.stringify({ at: new Date().toISOString(), p }))
    else window.localStorage.removeItem(POWER_UP_KEY)
    window.dispatchEvent(new CustomEvent(KIDS_POWER_UP_EVENT))
  } catch {
    /* storage blocked: the card shows what came back this time */
  }
}

export type PowerUpOutcome = { kind: 'ok'; powerUp: ChildPowerUp | null } | { kind: 'none' } | { kind: 'unavailable' }

/** The class goal for this browser's class: 'unavailable' before 0056 or offline (the cached one stays). */
export async function fetchPowerUp(): Promise<PowerUpOutcome> {
  const m = loadMembership()
  if (!m) return { kind: 'none' }
  try {
    const res = await fetch('/api/kids/classroom/power-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: m.token, today: localDayString() }),
      cache: 'no-store',
    })
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; removed?: boolean; powerUp?: ChildPowerUp | null }
    if (res.status === 404 && data.removed) {
      clearMembership()
      return { kind: 'none' }
    }
    if (res.ok && data.ok) {
      savePowerUp(data.powerUp ?? null)
      return { kind: 'ok', powerUp: data.powerUp ?? null }
    }
    return { kind: 'unavailable' }
  } catch {
    return { kind: 'unavailable' }
  }
}

function localDayString(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
