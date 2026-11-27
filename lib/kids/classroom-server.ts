// lib/kids/classroom-server.ts
//
// Server-only helpers for the Kids Classroom route handlers (app/api/kids/**).
// Never import this from a client component: it uses node:crypto and the
// service-role Supabase client.

import { createHash, randomBytes, randomInt } from 'node:crypto'
import type { PostgrestError, SupabaseClient, User } from '@supabase/supabase-js'
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server'
import {
  CLASSROOM_NOT_READY,
  CLASSROOM_NOT_READY_MESSAGE,
  EMPTY_SNAPSHOT,
  JOIN_CODE_ALPHABET,
  JOIN_CODE_LENGTH,
  effectiveBandLock,
  isBandId,
  parseSnapshot,
  type KidsClassSummary,
  type KidsMemberRow,
} from './classroom'
import { SCHOOLS_NOT_READY, SCHOOLS_NOT_READY_MESSAGE } from './classroom-assignments'
import type { BandId } from './bands'
import { GOALS_NOT_READY, GOALS_NOT_READY_MESSAGE, parseGoal, type ClassGoal } from './classroom-goal'

export function newJoinCode(): string {
  let s = ''
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) s += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)]
  return s
}

/** 32 random bytes, URL-safe. Lives only in the child's browser. */
export function newMemberToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** A plausible member token: 43 base64url characters. Anything else is refused before a lookup. */
export function isTokenShape(x: unknown): x is string {
  return typeof x === 'string' && /^[A-Za-z0-9_-]{43}$/.test(x)
}

export function isUuid(x: unknown): x is string {
  return typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x)
}

/** True when the error means migration 0054 has not been run (table missing). */
export function isMissingTable(err: PostgrestError | null | undefined): boolean {
  if (!err) return false
  if (err.code === '42P01' || err.code === 'PGRST205' || err.code === 'PGRST204') return true
  return /kids_class(es|_members)/.test(err.message ?? '') && /(does not exist|could not find|schema cache)/i.test(err.message ?? '')
}

export function notReadyResponse(): Response {
  return Response.json({ ok: false, error: CLASSROOM_NOT_READY_MESSAGE, code: CLASSROOM_NOT_READY }, { status: 503 })
}

export function jsonError(status: number, error: string): Response {
  return Response.json({ ok: false, error }, { status })
}

/** The service-role client, or null when the key is not configured (then everything answers 503). */
export function adminOrNull(): SupabaseClient | null {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null
  return createSupabaseAdminClient()
}

/** The signed-in teacher from the request cookies, or null. */
export async function currentTeacher(): Promise<User | null> {
  try {
    const sb = await createSupabaseServerClient()
    const { data } = await sb.auth.getUser()
    return data.user ?? null
  } catch {
    return null
  }
}

/** Read a JSON body with a hard byte cap. Returns undefined when too large or not JSON. */
export async function readJsonCapped(req: Request, maxBytes: number): Promise<unknown> {
  const text = await req.text().catch(() => '')
  if (!text || new TextEncoder().encode(text).length > maxBytes) return undefined
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

// ── Row mapping ──────────────────────────────────────────────────────────────
export interface ClassDbRow {
  id: string
  teacher_id: string
  class_name: string
  teacher_name: string | null
  school_name: string | null
  band: string
  join_code: string
  created_at: string
}

export interface MemberDbRow {
  id: string
  class_id: string
  nickname: string
  snapshot: unknown
  created_at: string
  last_active_at: string
}

export const CLASS_COLUMNS = 'id, teacher_id, class_name, teacher_name, school_name, band, join_code, created_at'
export const MEMBER_COLUMNS = 'id, class_id, nickname, snapshot, created_at, last_active_at'

export function toClassSummary(r: ClassDbRow, memberCount: number): KidsClassSummary {
  return {
    id: r.id,
    className: r.class_name,
    teacherName: r.teacher_name,
    schoolName: r.school_name,
    band: isBandId(r.band) ? r.band : 'builders',
    joinCode: r.join_code,
    createdAt: r.created_at,
    memberCount,
  }
}

export function toMemberRow(r: MemberDbRow): KidsMemberRow {
  return {
    id: r.id,
    nickname: r.nickname,
    snapshot: parseSnapshot(r.snapshot) ?? EMPTY_SNAPSHOT,
    createdAt: r.created_at,
    lastActiveAt: r.last_active_at,
  }
}

/**
 * Load a class only if `teacherId` owns it. Returns 'missing-table' before the
 * migration, null when not found / not theirs (same answer, so ids cannot be probed).
 */
export async function loadOwnedClass(
  admin: SupabaseClient, classId: string, teacherId: string,
): Promise<ClassDbRow | null | 'missing-table'> {
  const { data, error } = await admin
    .from('kids_classes')
    .select(CLASS_COLUMNS)
    .eq('id', classId)
    .eq('teacher_id', teacherId)
    .maybeSingle()
  if (error) return isMissingTable(error) ? 'missing-table' : null
  return (data as ClassDbRow | null) ?? null
}

// ── Schools and assignments (migration 0055) ─────────────────────────────────
// Kept apart from the 0054 helpers so a missing 0055 never takes classes down.

export const SCHOOL_CODE_LENGTH = 8

export function newSchoolCode(): string {
  let s = ''
  for (let i = 0; i < SCHOOL_CODE_LENGTH; i++) s += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)]
  return s
}

/** True when the error means migration 0055 has not been run (table or column missing). */
export function isMissingSchoolSchema(err: PostgrestError | null | undefined): boolean {
  if (!err) return false
  if (err.code === '42P01' || err.code === '42703' || err.code === 'PGRST205' || err.code === 'PGRST204' || err.code === 'PGRST200') return true
  return /(kids_schools|kids_school_teachers|kids_assignments|school_id|kids_school_role)/.test(err.message ?? '') &&
    /(does not exist|could not find|schema cache|relationship)/i.test(err.message ?? '')
}

export function schoolsNotReadyResponse(): Response {
  return Response.json(
    { ok: false, error: SCHOOLS_NOT_READY_MESSAGE, code: SCHOOLS_NOT_READY },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  )
}

// ── Class Power-Up goal (migration 0056) ─────────────────────────────────────
// Read and written apart from CLASS_COLUMNS, so a missing 0056 never takes the
// class page down: the goal simply reads as "not ready".

/** True when the error means migration 0056 has not run (kids_classes.goal missing). */
export function isMissingGoalColumn(err: PostgrestError | null | undefined): boolean {
  if (!err) return false
  if (err.code === '42703' || err.code === 'PGRST204') return true
  return /goal/.test(err.message ?? '') && /(does not exist|could not find|schema cache)/i.test(err.message ?? '')
}

export function goalsNotReadyResponse(): Response {
  return Response.json(
    { ok: false, error: GOALS_NOT_READY_MESSAGE, code: GOALS_NOT_READY },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  )
}

/** The class goal, or 'not-ready' before 0056. */
export async function loadClassGoal(admin: SupabaseClient, classId: string): Promise<ClassGoal | null | 'not-ready'> {
  const { data, error } = await admin.from('kids_classes').select('goal').eq('id', classId).maybeSingle()
  if (error) return isMissingGoalColumn(error) ? 'not-ready' : null
  return parseGoal((data as { goal?: unknown } | null)?.goal)
}

// ── Band lock (roadmap #29, migration 0058) ──────────────────────────────────
// Read and written apart from CLASS_COLUMNS / MEMBER_COLUMNS, so a missing 0058
// never takes the class page, the roster or the child's sync down.

export const BAND_LOCK_NOT_READY = 'band-lock-not-ready'
export const BAND_LOCK_NOT_READY_MESSAGE = 'Band settings are being switched on — they will work once the database update has run.'

/** True when the error means migration 0058 has not run (band_locked / band_lock missing). */
export function isMissingBandLockColumn(err: PostgrestError | null | undefined): boolean {
  if (!err) return false
  if (err.code === '42703' || err.code === 'PGRST204') return true
  return /band_lock/.test(err.message ?? '') && /(does not exist|could not find|schema cache)/i.test(err.message ?? '')
}

export function bandLockNotReadyResponse(): Response {
  return Response.json(
    { ok: false, error: BAND_LOCK_NOT_READY_MESSAGE, code: BAND_LOCK_NOT_READY },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  )
}

export interface ClassBandLocks {
  classLocked: boolean
  /** member id -> band the teacher set for that child. */
  members: Record<string, BandId>
}

/** The class's band locks, or 'not-ready' before 0058. */
export async function loadBandLocks(admin: SupabaseClient, classId: string): Promise<ClassBandLocks | 'not-ready'> {
  const cls = await admin.from('kids_classes').select('band_locked').eq('id', classId).maybeSingle()
  if (cls.error) return isMissingBandLockColumn(cls.error) ? 'not-ready' : { classLocked: false, members: {} }
  const mem = await admin.from('kids_class_members').select('id, band_lock').eq('class_id', classId).not('band_lock', 'is', null)
  if (mem.error) return isMissingBandLockColumn(mem.error) ? 'not-ready' : { classLocked: false, members: {} }
  const members: Record<string, BandId> = {}
  for (const r of (mem.data ?? []) as { id: string; band_lock: unknown }[]) if (isBandId(r.band_lock)) members[r.id] = r.band_lock
  return { classLocked: (cls.data as { band_locked?: unknown } | null)?.band_locked === true, members }
}

/** The band one member must play at (their lock, else the class's when locked), null when free or before 0058. */
export async function loadMemberBandLock(admin: SupabaseClient, memberId: string): Promise<BandId | null> {
  const { data, error } = await admin
    .from('kids_class_members')
    .select('band_lock, kids_classes(band, band_locked)')
    .eq('id', memberId)
    .maybeSingle()
  if (error || !data) return null
  const row = data as unknown as { band_lock: unknown; kids_classes: { band: unknown; band_locked: unknown } | null }
  return effectiveBandLock(row.kids_classes?.band, row.kids_classes?.band_locked === true, row.band_lock)
}
