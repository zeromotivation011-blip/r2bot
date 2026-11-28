// app/api/kids/classroom/classes/route.ts
//
// Teacher: list my Kids classes (GET) and create one (POST).
// Auth: the signed-in R2BOT user from the request cookies. Every query is
// scoped to teacher_id = that user. Service-role client, so this works the
// same whatever RLS says; RLS (migration 0054) is the second lock.

import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isRateLimited } from '@/lib/rate-limit'
import { DEFAULT_CLASS_KIND, MAX_CLASSES_PER_TEACHER, cleanText, isBandId, isClassKind, type KidsClassSummary } from '@/lib/kids/classroom'
import {
  CLASS_COLUMNS,
  adminOrNull,
  currentTeacher,
  isMissingKindColumn,
  isMissingTable,
  jsonError,
  loadTeacherClassKinds,
  newJoinCode,
  notReadyResponse,
  readJsonCapped,
  toClassSummary,
  type ClassDbRow,
} from '@/lib/kids/classroom-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET(): Promise<Response> {
  const user = await currentTeacher()
  if (!user) return jsonError(401, 'Sign in to see your classes.')
  const admin = adminOrNull()
  if (!admin) return notReadyResponse()

  const { data, error } = await admin
    .from('kids_classes')
    .select(CLASS_COLUMNS)
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false })
  if (error) return isMissingTable(error) ? notReadyResponse() : jsonError(500, 'Could not load classes.')
  const rows = (data ?? []) as ClassDbRow[]

  // One head-only count per class (at most MAX_CLASSES_PER_TEACHER). Fetching
  // every member row would hit PostgREST's 1,000-row cap and undercount.
  const counts = new Map<string, number>()
  await Promise.all(
    rows.map(async (r) => {
      const { count } = await admin
        .from('kids_class_members')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', r.id)
      counts.set(r.id, count ?? 0)
    }),
  )

  // A friendly default for "what children see": the profile's display name.
  let suggestedTeacherName = ''
  const { data: profile } = await admin.from('profiles').select('display_name').eq('id', user.id).maybeSingle()
  if (profile && typeof (profile as { display_name?: unknown }).display_name === 'string') {
    suggestedTeacherName = cleanText((profile as { display_name: string }).display_name, 40)
  }

  // Roadmap #84 (migration 0059): read apart, so a missing column never hides the list.
  const kinds = await loadTeacherClassKinds(admin, user.id)
  const classes: KidsClassSummary[] = rows.map((r) => ({
    ...toClassSummary(r, counts.get(r.id) ?? 0),
    kind: kinds === 'not-ready' ? DEFAULT_CLASS_KIND : kinds.get(r.id) ?? DEFAULT_CLASS_KIND,
    kindReady: kinds !== 'not-ready',
  }))
  // kindsReady: false before 0059, so the create form can warn a club, family or library leader
  // that children will join at the class band until then (it holds even with no class yet).
  return Response.json({ ok: true, classes, suggestedTeacherName, kindsReady: kinds !== 'not-ready' }, { headers: NO_STORE })
}

interface CreateBody {
  className?: unknown
  teacherName?: unknown
  schoolName?: unknown
  band?: unknown
  /** Roadmap #84: school (default), club, family or library. */
  kind?: unknown
}

export async function POST(req: NextRequest): Promise<Response> {
  const user = await currentTeacher()
  if (!user) return jsonError(401, 'Sign in to create a class.')
  if (await isRateLimited({ scope: 'kids-class:create', subject: user.id, windowSeconds: 3600, max: 20 })) {
    return jsonError(429, 'You have created a lot of classes in the last hour. Try again later.')
  }
  const raw = await readJsonCapped(req, 2048)
  if (!raw || typeof raw !== 'object') return jsonError(400, 'Malformed request.')
  const body = raw as CreateBody

  const className = cleanText(body.className, 60)
  const teacherName = cleanText(body.teacherName, 40)
  const schoolName = cleanText(body.schoolName, 100)
  if (!className) return jsonError(400, 'Give the class a name, like “7B” or “Robotics Club”.')
  if (!isBandId(body.band)) return jsonError(400, 'Choose a grade band.')
  if (body.kind !== undefined && !isClassKind(body.kind)) return jsonError(400, 'Choose what kind of group this is.')
  const kind = isClassKind(body.kind) ? body.kind : DEFAULT_CLASS_KIND

  const admin = adminOrNull()
  if (!admin) return notReadyResponse()

  const { count, error: countErr } = await admin
    .from('kids_classes')
    .select('id', { count: 'exact', head: true })
    .eq('teacher_id', user.id)
  if (countErr) return isMissingTable(countErr) ? notReadyResponse() : jsonError(500, 'Could not create the class.')
  if ((count ?? 0) >= MAX_CLASSES_PER_TEACHER) {
    return jsonError(409, `You can have up to ${MAX_CLASSES_PER_TEACHER} classes. Delete an old one first.`)
  }

  // Join codes are unique; retry on the rare collision. A school class is the
  // column default, so it is only written for the other kinds; before 0059
  // runs that insert fails on the missing column and is retried without it
  // (kindReady: false tells the leader's device to keep the kind itself).
  let withKind = kind !== DEFAULT_CLASS_KIND
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, error } = await admin
      .from('kids_classes')
      .insert({
        teacher_id: user.id,
        class_name: className,
        teacher_name: teacherName || null,
        school_name: schoolName || null,
        band: body.band,
        join_code: newJoinCode(),
        ...(withKind ? { kind } : {}),
      })
      .select(CLASS_COLUMNS)
      .single()
    if (!error && data) {
      const created = data as ClassDbRow
      await linkToMySchool(admin, created.id, user.id)
      const kindReady = kind === DEFAULT_CLASS_KIND ? true : withKind
      return Response.json({ ok: true, class: { ...toClassSummary(created, 0), kind, kindReady } }, { status: 201, headers: NO_STORE })
    }
    // First: a missing kind column (PGRST204 also reads as "missing table").
    if (error && withKind && isMissingKindColumn(error)) {
      withKind = false
      continue
    }
    if (error && isMissingTable(error)) return notReadyResponse()
    if (error?.code !== '23505') return jsonError(500, 'Could not create the class.')
  }
  return jsonError(500, 'Could not create the class. Try again.')
}

/**
 * A teacher in a school (migration 0055) gets new classes in that school.
 * Best effort and silent: before 0055 runs the lookup fails and nothing changes.
 */
async function linkToMySchool(admin: SupabaseClient, classId: string, teacherId: string): Promise<void> {
  try {
    const { data, error } = await admin
      .from('kids_school_teachers')
      .select('school_id')
      .eq('teacher_id', teacherId)
      .maybeSingle()
    if (error || !data) return
    await admin.from('kids_classes').update({ school_id: (data as { school_id: string }).school_id }).eq('id', classId).eq('teacher_id', teacherId)
  } catch {
    /* schools not switched on yet */
  }
}
