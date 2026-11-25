// app/api/kids/classroom/classes/[classId]/route.ts
//
// Teacher: one class with its roster (GET), regenerate the join code or edit
// names (PATCH), delete the class and every member row (DELETE).
// Auth: signed-in user must own the class. A class that exists but belongs to
// someone else answers exactly like one that does not exist (404).

import type { NextRequest } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { cleanText, isBandId } from '@/lib/kids/classroom'
import {
  CLASS_COLUMNS,
  MEMBER_COLUMNS,
  adminOrNull,
  currentTeacher,
  isUuid,
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
  const members = ((data ?? []) as MemberDbRow[]).map(toMemberRow)
  return Response.json(
    { ok: true, class: toClassSummary(g.cls, members.length), members },
    { headers: NO_STORE },
  )
}

interface PatchBody {
  action?: unknown
  className?: unknown
  teacherName?: unknown
  schoolName?: unknown
  band?: unknown
}

export async function PATCH(req: NextRequest, ctx: Ctx): Promise<Response> {
  const { classId } = await ctx.params
  const g = await guard(classId)
  if (!g.ok) return g.res
  const raw = await readJsonCapped(req, 2048)
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
