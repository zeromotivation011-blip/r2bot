// lib/kids/classroom-api.ts
//
// Browser helpers for the teacher pages. They call our own route handlers
// (app/api/kids/classroom/**), which read the Supabase session from cookies —
// so the teacher pages never load the Supabase browser client themselves.

import { hasSupabaseSessionCookie } from '@/lib/supabase/lazy'
import { CLASSROOM_NOT_READY } from './classroom'

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
    if (res.status === 503 && data.code === CLASSROOM_NOT_READY) return { kind: 'not-ready' }
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
