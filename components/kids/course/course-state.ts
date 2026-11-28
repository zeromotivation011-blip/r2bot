// components/kids/course/course-state.ts
// Where each course session is up to, so a child picks up exactly where they
// left off (the beat, the stars already won, the part already fitted). UI
// state only: XP, badges and "session finished" live in lib/kids-progress.ts
// and are written by reportActivity() alone.
//
// localStorage key r2bot_kids_course_v1, per child through profileKey():
//   { v: 1, last: "L1-S09", sessions: { "L1-S09": { step: 3, reached: 3, … } } }

import type { PicNode } from '@/lib/kids/sim/challenge'
import { profileKey } from '@/lib/kids/profiles'

export const COURSE_KEY = 'r2bot_kids_course_v1'
export const COURSE_EVENT = 'r2bot:kids-course'

/** The six beats of every session, in order (lib/kids/curriculum/types.ts). */
export const BEATS = [
  { id: 'episode', label: 'Episode', icon: '🎬', verb: 'Watch' },
  { id: 'build', label: 'Build', icon: '🔧', verb: 'Build' },
  { id: 'code', label: 'Code', icon: '🧩', verb: 'Learn' },
  { id: 'challenge', label: 'Challenge', icon: '🏁', verb: 'Solve' },
  { id: 'check', label: 'Check', icon: '❓', verb: 'Think' },
  { id: 'badge', label: 'Badge', icon: '🏅', verb: 'Earn' },
] as const

export type BeatId = (typeof BEATS)[number]['id']

export interface SessionState {
  /** The beat on screen (0–5). */
  step: number
  /** The furthest beat reached (beats up to here can be revisited). */
  reached: number
  /** The session's part was fitted (the 'build' reward is reported once). */
  built?: boolean
  /** Best challenge stars this session (0 = not solved yet). */
  challengeStars?: number
  challengeAttempts?: number
  /** The three check questions were answered at least once. */
  checked?: boolean
  /** The session's badge step was completed and reported. */
  done?: boolean
  /** Stars reported to the rewards engine last time (replays only report an improvement). */
  reportedStars?: number
  /** The challenge's first success was reported as kind 'challenge' (weekly quest), once. */
  challengeReported?: boolean
  /** The child's picture program in the challenge, so a reload keeps their work. */
  program?: PicNode[]
  updated: string
}

interface CourseStore {
  v: 1
  last?: string
  sessions: Record<string, SessionState>
}

const EMPTY: CourseStore = { v: 1, sessions: {} }

function readStore(): CourseStore {
  if (typeof window === 'undefined') return { ...EMPTY, sessions: {} }
  try {
    const raw = window.localStorage.getItem(profileKey(COURSE_KEY))
    if (!raw) return { ...EMPTY, sessions: {} }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || (parsed as { v?: unknown }).v !== 1) return { ...EMPTY, sessions: {} }
    const p = parsed as CourseStore
    return { v: 1, last: typeof p.last === 'string' ? p.last : undefined, sessions: p.sessions && typeof p.sessions === 'object' ? p.sessions : {} }
  } catch {
    return { ...EMPTY, sessions: {} }
  }
}

function clampStep(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.floor(n) : 0
  return Math.max(0, Math.min(BEATS.length - 1, v))
}

export function readSessionState(id: string): SessionState {
  const s = readStore().sessions[id]
  if (!s) return { step: 0, reached: 0, updated: new Date().toISOString() }
  const step = clampStep(s.step)
  return { ...s, step, reached: Math.max(step, clampStep(s.reached)) }
}

export function readAllSessionStates(): Record<string, SessionState> {
  return readStore().sessions
}

export function lastSessionId(): string | undefined {
  return readStore().last
}

export function writeSessionState(id: string, patch: Partial<SessionState>): SessionState {
  const store = readStore()
  const prev = store.sessions[id] ?? { step: 0, reached: 0, updated: '' }
  const next: SessionState = { ...prev, ...patch, updated: new Date().toISOString() }
  next.step = clampStep(next.step)
  next.reached = Math.max(next.step, clampStep(next.reached))
  store.sessions[id] = next
  store.last = id
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(profileKey(COURSE_KEY), JSON.stringify(store))
      window.dispatchEvent(new CustomEvent(COURSE_EVENT))
    } catch {
      /* storage blocked: the session still works, it just will not resume */
    }
  }
  return next
}

/** Fisher–Yates with Math.random: a fresh order per child per attempt (the curriculum asks for it). */
export function shuffledOrder(n: number, keepOrder = false): number[] {
  const idx = Array.from({ length: n }, (_, i) => i)
  if (keepOrder) return idx
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx
}

/** "L1-S07" → 7 */
export function sessionNumberOf(id: string): number | null {
  const m = /^L\d-S(\d+)$/.exec(id)
  return m ? Number(m[1]) : null
}
