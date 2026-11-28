// lib/kids/classroom-api.ts
//
// Browser helpers for the teacher pages. They call our own route handlers
// (app/api/kids/classroom/**), which read the Supabase session from cookies —
// so the teacher pages never load the Supabase browser client themselves.

import { hasSupabaseSessionCookie } from '@/lib/supabase/lazy'
import { CLASSROOM_NOT_READY, KIND_NOT_READY } from './classroom'
import { SCHOOLS_NOT_READY } from './classroom-assignments'
import { GOALS_NOT_READY, parseGoal, type ClassGoal } from './classroom-goal'
import type { InsightCatalogue } from './classroom-insights'

export type TeacherResult<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'signed-out' }
  | { kind: 'not-ready' }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string }

export async function teacherFetch<T>(url: string, init?: RequestInit): Promise<TeacherResult<T>> {
  if (!hasSupabaseSessionCookie()) return { kind: 'signed-out' }
  try {
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      credentials: 'same-origin',
      cache: 'no-store',
    })
    const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string } & T
    if (res.status === 401) return { kind: 'signed-out' }
    if (res.status === 503 && (data.code === CLASSROOM_NOT_READY || data.code === SCHOOLS_NOT_READY || data.code === GOALS_NOT_READY || data.code === KIND_NOT_READY)) return { kind: 'not-ready' }
    if (res.status === 404) return { kind: 'not-found' }
    if (!res.ok) return { kind: 'error', message: data.error ?? 'Something went wrong. Try again.' }
    return { kind: 'ok', data }
  } catch {
    return { kind: 'error', message: 'Network error. Check your connection and try again.' }
  }
}

/** "3 min ago", "yesterday", "12 Nov". */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '—'
  const s = Math.max(0, Math.round((now - t) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  if (d === 1) return 'yesterday'
  if (d < 7) return `${d} days ago`
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

// ── Wave 2: insights catalogue and the teacher-device goal ───────────────────

let cataloguePromise: Promise<InsightCatalogue | null> | null = null

/** The public lookup tables behind the Gradebook and Class Mind Map (cached per page load). */
export function fetchInsightCatalogue(): Promise<InsightCatalogue | null> {
  if (!cataloguePromise) {
    cataloguePromise = fetch('/api/kids/classroom/insights-catalogue')
      .then(async (r) => {
        if (!r.ok) return null
        const data = (await r.json()) as { catalogue?: InsightCatalogue }
        return data.catalogue ?? null
      })
      .catch(() => null)
      .then((c) => {
        if (!c) cataloguePromise = null // let a later call retry
        return c
      })
  }
  return cataloguePromise
}

const LOCAL_GOAL_PREFIX = 'r2bot_kids_teacher_goal_v1:'

/**
 * Before migration 0056 a teacher's Class Power-Up goal lives on their own
 * device (keyed by class id) so the projector meter still works. Teacher data
 * only — never a child's.
 */
export function loadLocalGoal(classId: string): ClassGoal | null {
  if (typeof window === 'undefined') return null
  try {
    return parseGoal(JSON.parse(window.localStorage.getItem(LOCAL_GOAL_PREFIX + classId) ?? 'null'))
  } catch {
    return null
  }
}

export function saveLocalGoal(classId: string, goal: ClassGoal | null): void {
  try {
    if (goal) window.localStorage.setItem(LOCAL_GOAL_PREFIX + classId, JSON.stringify(goal))
    else window.localStorage.removeItem(LOCAL_GOAL_PREFIX + classId)
  } catch {
    /* storage blocked */
  }
}

/** Save a file the browser made (CSV) without a server round trip. */
export function downloadText(text: string, filename: string, type = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function fileSlug(s: string): string {
  return s.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'class'
}
