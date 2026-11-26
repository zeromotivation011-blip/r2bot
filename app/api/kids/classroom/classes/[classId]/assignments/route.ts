// app/api/kids/classroom/classes/[classId]/assignments/route.ts
//
// Teacher: the class's assignments (GET), assign a session / activity / game
// with an optional due date (POST), remove one (DELETE ?id=).
// Auth: the signed-in user must own the class (same 404 for "not yours").
// Needs migration 0055: before it runs, every method answers 503
// code "schools-not-ready" and the dashboard shows a friendly notice.
//
// Completion is NOT stored here: the dashboard derives it from the members'
// synced snapshots (lib/kids/classroom-assignments.ts).

import type { NextRequest } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { isRateLimited } from '@/lib/rate-limit'
import { cleanText } from '@/lib/kids/classroom'
import {
  ASSIGNMENT_NOTE_MAX,
  MAX_ASSIGNMENTS_PER_CLASS,
  isAssignmentKind,
  isItemId,
  parseDueDate,
  type AssignmentKind,
  type KidsAssignment,
} from '@/lib/kids/classroom-assignments'
import {
  adminOrNull,
  currentTeacher,
  isMissingSchoolSchema,
  isUuid,
  jsonError,
  loadOwnedClass,
  notReadyResponse,
  readJsonCapped,
  schoolsNotReadyResponse,
} from '@/lib/kids/classroom-server'
import { resolveItem } from '@/lib/kids/teach/catalogue'
import { ASSIGNMENT_COLUMNS as COLUMNS, toAssignment, type AssignmentDbRow } from '@/lib/kids/teach/assignments-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

type Ctx = { params: Promise<{ classId: string }> }

type Guard = { ok: false; res: Response } | { ok: true; admin: SupabaseClient; user: User }

async function guard(classId: string): Promise<Guard> {
  if (!isUuid(classId)) return { ok: false, res: jsonError(404, 'Class not found.') }
  const user = await currentTeacher()
  if (!user) return { ok: false, res: jsonError(401, 'Sign in to manage assignments.') }
  const admin = adminOrNull()
  if (!admin) return { ok: false, res: notReadyResponse() }
  const cls = await loadOwnedClass(admin, classId, user.id)
  if (cls === 'missing-table') return { ok: false, res: notReadyResponse() }
  if (!cls) return { ok: false, res: jsonError(404, 'Class not found.') }
  return { ok: true, admin, user }
}

export async function GET(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const { classId } = await ctx.params
  const g = await guard(classId)
  if (!g.ok) return g.res
  const { data, error } = await g.admin
    .from('kids_assignments')
    .select(COLUMNS)
    .eq('class_id', classId)
    .order('created_at', { ascending: false })
    .limit(MAX_ASSIGNMENTS_PER_CLASS)
  if (error) return isMissingSchoolSchema(error) ? schoolsNotReadyResponse() : jsonError(500, 'Could not load assignments.')
  const assignments = ((data ?? []) as AssignmentDbRow[]).map(toAssignment).filter((a): a is KidsAssignment => !!a)
  return Response.json({ ok: true, assignments }, { headers: NO_STORE })
}

interface CreateBody {
  kind?: unknown
  itemId?: unknown
  dueDate?: unknown
  note?: unknown
}

export async function POST(req: NextRequest, ctx: Ctx): Promise<Response> {
  const { classId } = await ctx.params
  const g = await guard(classId)
  if (!g.ok) return g.res
  if (await isRateLimited({ scope: 'kids-assign:create', subject: g.user.id, windowSeconds: 3600, max: 200 })) {
    return jsonError(429, 'That is a lot of assignments in one hour. Try again a little later.')
  }
  const raw = await readJsonCapped(req, 2048)
  if (!raw || typeof raw !== 'object') return jsonError(400, 'Malformed request.')
  const body = raw as CreateBody
  if (!isAssignmentKind(body.kind) || !isItemId(body.itemId)) return jsonError(400, 'Choose something to assign.')
  const kind: AssignmentKind = body.kind
  const item = resolveItem(kind, body.itemId)
  if (!item) return jsonError(400, 'That item is not in the R2BOT Kids catalogue.')
  const dueDate = body.dueDate === null || body.dueDate === undefined || body.dueDate === '' ? null : parseDueDate(body.dueDate)
  if (body.dueDate && !dueDate) return jsonError(400, 'Pick a due date within the next two years, or leave it empty.')
  const note = cleanText(body.note, ASSIGNMENT_NOTE_MAX) || null

  const { count, error: countErr } = await g.admin
    .from('kids_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', classId)
  if (countErr) return isMissingSchoolSchema(countErr) ? schoolsNotReadyResponse() : jsonError(500, 'Could not assign that.')
  if ((count ?? 0) >= MAX_ASSIGNMENTS_PER_CLASS) {
    return jsonError(409, `A class can have up to ${MAX_ASSIGNMENTS_PER_CLASS} assignments. Remove finished ones first.`)
  }

  const { data, error } = await g.admin
    .from('kids_assignments')
    .insert({
      class_id: classId,
      kind,
      item_id: body.itemId,
      title: item.title.slice(0, 120),
      note,
      due_date: dueDate,
      created_by: g.user.id,
    })
    .select(COLUMNS)
    .single()
  if (error) {
    if (isMissingSchoolSchema(error)) return schoolsNotReadyResponse()
    if (error.code === '23505') return jsonError(409, 'This class already has that assignment.')
    return jsonError(500, 'Could not assign that.')
  }
  const assignment = toAssignment(data as AssignmentDbRow)
  return Response.json({ ok: true, assignment }, { status: 201, headers: NO_STORE })
}

export async function DELETE(req: NextRequest, ctx: Ctx): Promise<Response> {
  const { classId } = await ctx.params
  const g = await guard(classId)
  if (!g.ok) return g.res
  const id = req.nextUrl.searchParams.get('id')
  if (!isUuid(id)) return jsonError(400, 'Which assignment?')
  const { error, count } = await g.admin
    .from('kids_assignments')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('class_id', classId)
  if (error) return isMissingSchoolSchema(error) ? schoolsNotReadyResponse() : jsonError(500, 'Could not remove it.')
  if (!count) return jsonError(404, 'Assignment not found.')
  return Response.json({ ok: true }, { headers: NO_STORE })
}
