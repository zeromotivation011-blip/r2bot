// lib/kids/classroom-assignments.ts
//
// Shared, pure helpers for class assignments ("From your teacher" missions),
// added with migration 0055. Safe in the browser and on the server: no
// Supabase, no storage, no catalogue imports (the activity list is heavy and
// stays on the server; see lib/kids/teach/catalogue.ts).
//
// Completion is never reported by the child directly. It is derived from the
// progress snapshot the child's browser already syncs (sessionsDone,
// activitiesDone, gamesPlayed — see parseSnapshot in ./classroom.ts), so the
// teacher sees the same thing the child sees, and nothing new is collected.

import type { ClassSnapshot, KidsMemberRow } from './classroom'

export type AssignmentKind = 'session' | 'activity' | 'game'
export const ASSIGNMENT_KINDS: AssignmentKind[] = ['session', 'activity', 'game']

export const MAX_ASSIGNMENTS_PER_CLASS = 60
export const ASSIGNMENT_NOTE_MAX = 200

/** Same rule as the column CHECK in 0055. */
const ITEM_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isAssignmentKind(x: unknown): x is AssignmentKind {
  return typeof x === 'string' && (ASSIGNMENT_KINDS as string[]).includes(x)
}

export function isItemId(x: unknown): x is string {
  return typeof x === 'string' && ITEM_RE.test(x)
}

/** "2026-12-05" that is a real calendar date within ~2 years, or null. */
export function parseDueDate(x: unknown, now: Date = new Date()): string | null {
  if (typeof x !== 'string' || !DATE_RE.test(x)) return null
  const t = Date.parse(`${x}T00:00:00Z`)
  if (!Number.isFinite(t)) return null
  if (new Date(t).toISOString().slice(0, 10) !== x) return null
  const days = (t - now.getTime()) / 86_400_000
  if (days < -365 || days > 730) return null
  return x
}

/** What the teacher sees, and what the routes return. */
export interface KidsAssignment {
  id: string
  kind: AssignmentKind
  itemId: string
  title: string
  note: string | null
  /** YYYY-MM-DD or null. */
  dueDate: string | null
  createdAt: string
  /** Where the child plays it. Filled by the route from the catalogue. */
  href: string
}

/** A child's view: the same, minus the row id. */
export type ChildMission = Omit<KidsAssignment, 'id' | 'createdAt'>

/** Did this snapshot finish this assignment? */
export function isDoneInSnapshot(a: Pick<KidsAssignment, 'kind' | 'itemId'>, s: ClassSnapshot): boolean {
  if (a.kind === 'session') return (s.sessionsDone[a.itemId] ?? 0) > 0
  if (a.kind === 'activity') return s.activitiesDone.includes(a.itemId)
  return s.gamesPlayed.includes(a.itemId)
}

export interface AssignmentProgress {
  done: number
  total: number
  /** Nicknames still to finish, for the teacher's "who needs a nudge". */
  notDone: string[]
}

export function assignmentProgress(a: Pick<KidsAssignment, 'kind' | 'itemId'>, members: KidsMemberRow[]): AssignmentProgress {
  const notDone: string[] = []
  let done = 0
  for (const m of members) {
    if (isDoneInSnapshot(a, m.snapshot)) done++
    else notDone.push(m.nickname)
  }
  return { done, total: members.length, notDone }
}

export type DueState = 'none' | 'overdue' | 'today' | 'soon' | 'later'

/** Compare a due date with today's LOCAL date (a class runs on local time). */
export function dueState(dueDate: string | null, now: Date = new Date()): DueState {
  if (!dueDate) return 'none'
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  if (dueDate < today) return 'overdue'
  if (dueDate === today) return 'today'
  const days = (Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000
  return days <= 3 ? 'soon' : 'later'
}

/** "Fri 5 Dec" in the reader's locale. */
export function formatDue(dueDate: string): string {
  const d = new Date(`${dueDate}T12:00:00`)
  if (!Number.isFinite(d.getTime())) return dueDate
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

export const KIND_LABEL: Record<AssignmentKind, { label: string; emoji: string }> = {
  session: { label: 'Course session', emoji: '📘' },
  activity: { label: 'Skill Galaxy', emoji: '🌌' },
  game: { label: 'Game', emoji: '🎮' },
}

/** Error code a route returns when migration 0055 has not been run yet. */
export const SCHOOLS_NOT_READY = 'schools-not-ready'
export const SCHOOLS_NOT_READY_MESSAGE =
  'Schools and assignments are being switched on. Your classes work as normal in the meantime.'
