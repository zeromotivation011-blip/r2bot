// app/api/kids/classroom/classes/[classId]/route.ts
//
// Teacher: one class with its roster (GET), regenerate the join code, edit
// names, set the Power-Up goal or the band locks (PATCH; band locks need
// migration 0058 and answer 503 until it runs), delete the class and every
// member row (DELETE).
// Auth: signed-in user must own the class. A class that exists but belongs to
// someone else answers exactly like one that does not exist (404).

import type { NextRequest } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { cleanText, isBandId } from '@/lib/kids/classroom'
import { parseGoal } from '@/lib/kids/classroom-goal'
import {
  CLASS_COLUMNS,
  MEMBER_COLUMNS,
  adminOrNull,
  bandLockNotReadyResponse,
  currentTeacher,
  isMissingBandLockColumn,
  loadBandLocks,
  goalsNotReadyResponse,
  isMissingGoalColumn,
  isUuid,
  loadClassGoal,
  jsonError,
  loadOwnedClass,
  newJoinCode,
  notReadyResponse,
  readJsonCapped,
  toClassSummary,
  toMemberRow,
  type ClassDbRow,
  type MemberDbRow,
} from '@/lib/kids/classroom-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

type Ctx = { params: Promise<{ classId: string }> }

type Guard =
  | { ok: false; res: Response }
  | { ok: true; admin: SupabaseClient; cls: ClassDbRow; user: User }

async function guard(classId: string): Promise<Guard> {
  if (!isUuid(classId)) return { ok: false, res: jsonError(404, 'Class not found.') }
  const user = await currentTeacher()
  if (!user) return { ok: false, res: jsonError(401, 'Sign in to see this class.') }
  const admin = adminOrNull()
  if (!admin) return { ok: false, res: notReadyResponse() }
  const cls = await loadOwnedClass(admin, classId, user.id)
  if (cls === 'missing-table') return { ok: false, res: notReadyResponse() }
  if (!cls) return { ok: false, res: jsonError(404, 'Class not found.') }
  return { ok: true, admin, cls, user }
}

export async function GET(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const { classId } = await ctx.params
  const g = await guard(classId)
  if (!g.ok) return g.res
  const { data, error } = await g.admin
    .from('kids_class_members')
    .select(MEMBER_COLUMNS)
    .eq('class_id', classId)
    .order('created_at', { ascending: true })
  if (error) return jsonError(500, 'Could not load the roster.')
  const locks = await loadBandLocks(g.admin, classId)
  const members = ((data ?? []) as MemberDbRow[]).map(toMemberRow).map((m) => ({
    ...m,
    bandLock: locks === 'not-ready' ? null : locks.members[m.id] ?? null,
  }))
  const goal = await loadClassGoal(g.admin, classId)
  const summary = {
    ...toClassSummary(g.cls, members.length),
    goal: goal === 'not-ready' ? null : goal,
    goalReady: goal !== 'not-ready',
    bandLocked: locks === 'not-ready' ? false : locks.classLocked,
    bandLockReady: locks !== 'not-ready',
  }
  return Response.json(
    { ok: true, class: summary, members },
    { headers: NO_STORE },
  )
}

interface PatchBody {
  action?: unknown
  className?: unknown
  teacherName?: unknown
  schoolName?: unknown
  band?: unknown
  goal?: unknown
  locked?: unknown
  memberId?: unknown
}

export async function PATCH(req: NextRequest, ctx: Ctx): Promise<Response> {
  const { classId } = await ctx.params
  const g = await guard(classId)
  if (!g.ok) return g.res
  const raw = await readJsonCapped(req, 4096)
  if (!raw || typeof raw !== 'object') return jsonError(400, 'Malformed request.')
  const body = raw as PatchBody

  if (body.action === 'regenerate-code') {
    // The old code stops working at once. Children already in the class stay in.
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data, error } = await g.admin
        .from('kids_classes')
        .update({ join_code: newJoinCode(), updated_at: new Date().toISOString() })
        .eq('id', classId)
        .eq('teacher_id', g.user.id)
        .select(CLASS_COLUMNS)
        .single()
      if (!error && data) return Response.json({ ok: true, class: toClassSummary(data as ClassDbRow, 0) }, { headers: NO_STORE })
      if (error?.code !== '23505') break
    }
    return jsonError(500, 'Could not make a new code. Try again.')
  }

  if (body.action === 'edit') {
    const className = cleanText(body.className, 60)
    if (!className) return jsonError(400, 'Give the class a name.')
    const update: Record<string, string | null> = {
      class_name: className,
      teacher_name: cleanText(body.teacherName, 40) || null,
      school_name: cleanText(body.schoolName, 100) || null,
      updated_at: new Date().toISOString(),
    }
    if (isBandId(body.band)) update.band = body.band
    const { data, error } = await g.admin
      .from('kids_classes')
      .update(update)
      .eq('id', classId)
      .eq('teacher_id', g.user.id)
      .select(CLASS_COLUMNS)
      .single()
    if (error || !data) return jsonError(500, 'Could not save the class.')
    return Response.json({ ok: true, class: toClassSummary(data as ClassDbRow, 0) }, { headers: NO_STORE })
  }

  if (body.action === 'goal') {
    // Class Power-Up (roadmap #40). null clears the goal.
    const goal = body.goal === null ? null : parseGoal(body.goal)
    if (body.goal !== null && !goal) return jsonError(400, 'Give the goal a name, a number between 10 and 5000 and an end date within three months.')
    const { error } = await g.admin
      .from('kids_classes')
      .update({ goal, updated_at: new Date().toISOString() })
      .eq('id', classId)
      .eq('teacher_id', g.user.id)
    if (error) return isMissingGoalColumn(error) ? goalsNotReadyResponse() : jsonError(500, 'Could not save the goal.')
    return Response.json({ ok: true, goal }, { headers: NO_STORE })
  }

  if (body.action === 'band-lock-class') {
    // Roadmap #29: every child plays at the class band (their device follows on the next sync).
    if (typeof body.locked !== 'boolean') return jsonError(400, 'Say whether the class band is locked.')
    const { error } = await g.admin
      .from('kids_classes')
      .update({ band_locked: body.locked, updated_at: new Date().toISOString() })
      .eq('id', classId)
      .eq('teacher_id', g.user.id)
    if (error) return isMissingBandLockColumn(error) ? bandLockNotReadyResponse() : jsonError(500, 'Could not save the band setting.')
    return Response.json({ ok: true, bandLocked: body.locked }, { headers: NO_STORE })
  }

  if (body.action === 'band-lock-member') {
    // Roadmap #29: one child's band (null = follow the class). Only a member of THIS class.
    if (!isUuid(body.memberId)) return jsonError(400, 'Which child?')
    if (body.band !== null && !isBandId(body.band)) return jsonError(400, 'Pick a band, or “follow the class”.')
    const { data, error } = await g.admin
      .from('kids_class_members')
      .update({ band_lock: body.band })
      .eq('id', body.memberId)
      .eq('class_id', classId)
      .select('id')
    if (error) return isMissingBandLockColumn(error) ? bandLockNotReadyResponse() : jsonError(500, 'Could not save the band.')
    if (!data || data.length === 0) return jsonError(404, 'That child is not in this class.')
    return Response.json({ ok: true, memberId: body.memberId, bandLock: body.band }, { headers: NO_STORE })
  }

  return jsonError(400, 'Unknown action.')
}

export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const { classId } = await ctx.params
  const g = await guard(classId)
  if (!g.ok) return g.res
  // Members go with it (on delete cascade): no child data outlives the class.
  const { error } = await g.admin.from('kids_classes').delete().eq('id', classId).eq('teacher_id', g.user.id)
  if (error) return jsonError(500, 'Could not delete the class.')
  return Response.json({ ok: true })
}
