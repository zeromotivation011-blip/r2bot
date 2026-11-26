// app/api/kids/classroom/school/route.ts
//
// Teacher: "my school" (GET) and every school action (POST { action }).
//   create          { name, displayName }   → you become the school admin
//   join            { code, displayName }   → join as a teacher with the 8-character school code
//   leave                                   → leave (an admin hands over to the longest-serving teacher)
//   rename          { name }                (admin)
//   regenerate-code                         (admin) old code stops working
//   remove-teacher  { teacherId }           (admin)
//   link-class      { classId, link }       → put one of YOUR classes in the school, or take it out
//   delete-school                           (admin) classes stay, they just leave the school
//
// The admin also gets every class in the school with a school-wide summary
// (counts only — nicknames never leave a class's own teacher).
// Needs migration 0055; before it runs everything answers 503 schools-not-ready.

import type { NextRequest } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { anyRateLimited, clientIp, isRateLimited } from '@/lib/rate-limit'
import { EMPTY_SNAPSHOT, cleanText, isBandId, parseSnapshot } from '@/lib/kids/classroom'
import type { KidsSchoolInfo, SchoolClassRow, SchoolSummary, SchoolTeacher } from '@/lib/kids/classroom-schools'
import { normaliseSchoolCode, isValidSchoolCode } from '@/lib/kids/classroom-schools'
import {
  adminOrNull,
  currentTeacher,
  isMissingSchoolSchema,
  isUuid,
  jsonError,
  newSchoolCode,
  notReadyResponse,
  readJsonCapped,
  schoolsNotReadyResponse,
} from '@/lib/kids/classroom-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }
const MAX_SCHOOL_CLASSES = 80
const MAX_SCHOOL_TEACHERS = 40

interface MembershipRow { school_id: string; role: string; display_name: string | null; joined_at: string }
interface SchoolRow { id: string; name: string; school_code: string; created_at: string }
interface TeacherRow { teacher_id: string; role: string; display_name: string | null; joined_at: string }
interface ClassRow { id: string; teacher_id: string; class_name: string; teacher_name: string | null; band: string; school_id: string | null }

type Ctx = { admin: SupabaseClient; user: User }

async function ctx(): Promise<Ctx | Response> {
  const user = await currentTeacher()
  if (!user) return jsonError(401, 'Sign in to manage your school.')
  const admin = adminOrNull()
  if (!admin) return notReadyResponse()
  return { admin, user }
}

async function myMembership(c: Ctx): Promise<MembershipRow | null | 'missing'> {
  const { data, error } = await c.admin
    .from('kids_school_teachers')
    .select('school_id, role, display_name, joined_at')
    .eq('teacher_id', c.user.id)
    .maybeSingle()
  if (error) return isMissingSchoolSchema(error) ? 'missing' : null
  return (data as MembershipRow | null) ?? null
}

async function profileName(c: Ctx): Promise<string> {
  const { data } = await c.admin.from('profiles').select('display_name').eq('id', c.user.id).maybeSingle()
  const n = (data as { display_name?: unknown } | null)?.display_name
  return typeof n === 'string' ? cleanText(n, 40) : ''
}

const weekAgo = () => Date.now() - 7 * 24 * 3600 * 1000

async function buildInfo(c: Ctx, m: MembershipRow): Promise<KidsSchoolInfo | Response> {
  const { data: school, error } = await c.admin
    .from('kids_schools')
    .select('id, name, school_code, created_at')
    .eq('id', m.school_id)
    .maybeSingle()
  if (error) return isMissingSchoolSchema(error) ? schoolsNotReadyResponse() : jsonError(500, 'Could not load your school.')
  if (!school) return jsonError(404, 'School not found.')
  const s = school as SchoolRow
  const isAdmin = m.role === 'admin'

  const { data: tData } = await c.admin
    .from('kids_school_teachers')
    .select('teacher_id, role, display_name, joined_at')
    .eq('school_id', s.id)
    .order('joined_at', { ascending: true })
    .limit(MAX_SCHOOL_TEACHERS)
  const teacherRows = (tData ?? []) as TeacherRow[]
  const nameOf = new Map(teacherRows.map((t) => [t.teacher_id, t.display_name]))
  const teachers: SchoolTeacher[] = teacherRows.map((t) => ({
    // Ids only for the admin, who needs them to remove someone.
    id: isAdmin ? t.teacher_id : null,
    displayName: t.display_name || 'A teacher',
    role: t.role === 'admin' ? 'admin' : 'teacher',
    joinedAt: t.joined_at,
    isMe: t.teacher_id === c.user.id,
  }))

  // My own classes, with whether each is in the school (for link/unlink).
  const { data: mine } = await c.admin
    .from('kids_classes')
    .select('id, teacher_id, class_name, teacher_name, band, school_id')
    .eq('teacher_id', c.user.id)
    .order('created_at', { ascending: false })
  const myClasses = ((mine ?? []) as ClassRow[]).map((r) => ({ id: r.id, className: r.class_name, inSchool: r.school_id === s.id }))

  let classes: SchoolClassRow[] | null = null
  let summary: SchoolSummary | null = null
  if (isAdmin) {
    const { data: cData } = await c.admin
      .from('kids_classes')
      .select('id, teacher_id, class_name, teacher_name, band, school_id')
      .eq('school_id', s.id)
      .order('created_at', { ascending: true })
      .limit(MAX_SCHOOL_CLASSES)
    const rows = (cData ?? []) as ClassRow[]
    const cutoff = weekAgo()
    classes = await Promise.all(rows.map(async (r): Promise<SchoolClassRow> => {
      const [{ data: members }, { count: assignments }] = await Promise.all([
        c.admin.from('kids_class_members').select('snapshot, last_active_at').eq('class_id', r.id).limit(100),
        c.admin.from('kids_assignments').select('id', { count: 'exact', head: true }).eq('class_id', r.id),
      ])
      const ms = (members ?? []) as { snapshot: unknown; last_active_at: string }[]
      let stars = 0
      let sessions = 0
      let activities = 0
      let active = 0
      for (const mm of ms) {
        const snap = parseSnapshot(mm.snapshot) ?? EMPTY_SNAPSHOT
        stars += snap.totalStars
        sessions += Object.keys(snap.sessionsDone).length
        activities += snap.activitiesDone.length
        if (Date.parse(mm.last_active_at) >= cutoff) active++
      }
      return {
        id: r.id,
        className: r.class_name,
        teacherName: r.teacher_name || nameOf.get(r.teacher_id) || 'A teacher',
        band: isBandId(r.band) ? r.band : 'builders',
        children: ms.length,
        activeThisWeek: active,
        stars,
        sessionsDone: sessions,
        activitiesDone: activities,
        assignments: assignments ?? 0,
        mine: r.teacher_id === c.user.id,
      }
    }))
    summary = {
      classes: classes.length,
      teachers: teachers.length,
      children: classes.reduce((a, x) => a + x.children, 0),
      activeThisWeek: classes.reduce((a, x) => a + x.activeThisWeek, 0),
      stars: classes.reduce((a, x) => a + x.stars, 0),
      sessionsDone: classes.reduce((a, x) => a + x.sessionsDone, 0),
      activitiesDone: classes.reduce((a, x) => a + x.activitiesDone, 0),
      assignments: classes.reduce((a, x) => a + x.assignments, 0),
    }
  }

  return {
    id: s.id,
    name: s.name,
    role: isAdmin ? 'admin' : 'teacher',
    code: isAdmin ? s.school_code : null,
    myDisplayName: m.display_name,
    createdAt: s.created_at,
    teachers,
    myClasses,
    classes,
    summary,
  }
}

export async function GET(): Promise<Response> {
  const c = await ctx()
  if (c instanceof Response) return c
  const m = await myMembership(c)
  if (m === 'missing') return schoolsNotReadyResponse()
  if (!m) return Response.json({ ok: true, school: null, suggestedName: await profileName(c) }, { headers: NO_STORE })
  const info = await buildInfo(c, m)
  if (info instanceof Response) return info
  return Response.json({ ok: true, school: info }, { headers: NO_STORE })
}

interface PostBody {
  action?: unknown
  name?: unknown
  displayName?: unknown
  code?: unknown
  teacherId?: unknown
  classId?: unknown
  link?: unknown
  /** Honeypot. */
  website?: unknown
}

async function answer(c: Ctx): Promise<Response> {
  const m = await myMembership(c)
  if (m === 'missing') return schoolsNotReadyResponse()
  if (!m) return Response.json({ ok: true, school: null, suggestedName: await profileName(c) }, { headers: NO_STORE })
  const info = await buildInfo(c, m)
  if (info instanceof Response) return info
  return Response.json({ ok: true, school: info }, { headers: NO_STORE })
}

export async function POST(req: NextRequest): Promise<Response> {
  const c = await ctx()
  if (c instanceof Response) return c
  const raw = await readJsonCapped(req, 2048)
  if (!raw || typeof raw !== 'object') return jsonError(400, 'Malformed request.')
  const body = raw as PostBody
  if (typeof body.website === 'string' && body.website.trim() !== '') return jsonError(400, 'Malformed request.')
  const action = typeof body.action === 'string' ? body.action : ''

  if (await isRateLimited({ scope: 'kids-school:action', subject: c.user.id, windowSeconds: 600, max: 60 })) {
    return jsonError(429, 'Too many changes in a few minutes. Try again shortly.')
  }

  const m = await myMembership(c)
  if (m === 'missing') return schoolsNotReadyResponse()

  // ── Not in a school yet ──────────────────────────────────────────────────
  if (action === 'create' || action === 'join') {
    if (m) return jsonError(409, 'You are already in a school. Leave it first to create or join another.')
    const displayName = cleanText(body.displayName, 40) || (await profileName(c)) || null

    if (action === 'create') {
      const name = cleanText(body.name, 100)
      if (name.length < 2) return jsonError(400, 'Give the school a name, like “Greenfield Primary”.')
      if (await isRateLimited({ scope: 'kids-school:create', subject: c.user.id, windowSeconds: 86400, max: 5 })) {
        return jsonError(429, 'You have created several schools today. Try again tomorrow.')
      }
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error } = await c.admin
          .from('kids_schools')
          .insert({ name, school_code: newSchoolCode(), created_by: c.user.id })
          .select('id')
          .single()
        if (error) {
          if (isMissingSchoolSchema(error)) return schoolsNotReadyResponse()
          if (error.code === '23505') continue
          return jsonError(500, 'Could not create the school.')
        }
        const schoolId = (data as { id: string }).id
        const { error: tErr } = await c.admin
          .from('kids_school_teachers')
          .insert({ school_id: schoolId, teacher_id: c.user.id, role: 'admin', display_name: displayName })
        if (tErr) {
          await c.admin.from('kids_schools').delete().eq('id', schoolId)
          return jsonError(tErr.code === '23505' ? 409 : 500, tErr.code === '23505' ? 'You are already in a school.' : 'Could not create the school.')
        }
        // Bring the creator's existing classes along.
        await c.admin.from('kids_classes').update({ school_id: schoolId }).eq('teacher_id', c.user.id).is('school_id', null)
        return answer(c)
      }
      return jsonError(500, 'Could not create the school. Try again.')
    }

    // join
    if (await anyRateLimited([
      { scope: 'kids-school:join', subject: c.user.id, windowSeconds: 3600, max: 20 },
      { scope: 'kids-school:join-ip', subject: clientIp(req.headers), windowSeconds: 3600, max: 60 },
    ])) {
      return jsonError(429, 'Too many tries. Wait a while and check the code with your school admin.')
    }
    const code = normaliseSchoolCode(typeof body.code === 'string' ? body.code : '')
    if (!isValidSchoolCode(code)) return jsonError(400, 'A school code has 8 letters and numbers, like ABCD 2345.')
    const { data: school, error } = await c.admin.from('kids_schools').select('id').eq('school_code', code).maybeSingle()
    if (error) return isMissingSchoolSchema(error) ? schoolsNotReadyResponse() : jsonError(500, 'Could not join.')
    if (!school) return jsonError(404, 'We could not find that school code. Check it with your school admin.')
    const schoolId = (school as { id: string }).id
    const { count } = await c.admin.from('kids_school_teachers').select('teacher_id', { count: 'exact', head: true }).eq('school_id', schoolId)
    if ((count ?? 0) >= MAX_SCHOOL_TEACHERS) return jsonError(409, 'This school has the most teachers it can have.')
    const { error: jErr } = await c.admin
      .from('kids_school_teachers')
      .insert({ school_id: schoolId, teacher_id: c.user.id, role: 'teacher', display_name: displayName })
    if (jErr) return jsonError(jErr.code === '23505' ? 409 : 500, jErr.code === '23505' ? 'You are already in a school.' : 'Could not join.')
    await c.admin.from('kids_classes').update({ school_id: schoolId }).eq('teacher_id', c.user.id).is('school_id', null)
    return answer(c)
  }

  if (!m) return jsonError(404, 'You are not in a school yet.')
  const isAdmin = m.role === 'admin'

  if (action === 'leave') {
    if (isAdmin) {
      // Hand the school to the longest-serving colleague, or close it if alone.
      const { data: others } = await c.admin
        .from('kids_school_teachers')
        .select('teacher_id')
        .eq('school_id', m.school_id)
        .neq('teacher_id', c.user.id)
        .order('joined_at', { ascending: true })
        .limit(1)
      const next = (others ?? [])[0] as { teacher_id: string } | undefined
      if (next) {
        await c.admin.from('kids_school_teachers').update({ role: 'admin' }).eq('school_id', m.school_id).eq('teacher_id', next.teacher_id)
      } else {
        await c.admin.from('kids_classes').update({ school_id: null }).eq('school_id', m.school_id)
        await c.admin.from('kids_schools').delete().eq('id', m.school_id)
        return answer(c)
      }
    }
    await c.admin.from('kids_classes').update({ school_id: null }).eq('school_id', m.school_id).eq('teacher_id', c.user.id)
    const { error } = await c.admin.from('kids_school_teachers').delete().eq('school_id', m.school_id).eq('teacher_id', c.user.id)
    if (error) return jsonError(500, 'Could not leave the school.')
    return answer(c)
  }

  if (action === 'link-class') {
    if (!isUuid(body.classId)) return jsonError(400, 'Which class?')
    const link = body.link !== false
    const { data, error } = await c.admin
      .from('kids_classes')
      .update({ school_id: link ? m.school_id : null })
      .eq('id', body.classId)
      .eq('teacher_id', c.user.id)
      .select('id')
    if (error) return isMissingSchoolSchema(error) ? schoolsNotReadyResponse() : jsonError(500, 'Could not update the class.')
    if (!data || data.length === 0) return jsonError(404, 'Class not found.')
    return answer(c)
  }

  if (!isAdmin) return jsonError(403, 'Only the school admin can do that.')

  if (action === 'rename') {
    const name = cleanText(body.name, 100)
    if (name.length < 2) return jsonError(400, 'Give the school a name.')
    const { error } = await c.admin.from('kids_schools').update({ name, updated_at: new Date().toISOString() }).eq('id', m.school_id)
    if (error) return jsonError(500, 'Could not rename the school.')
    return answer(c)
  }

  if (action === 'regenerate-code') {
    for (let attempt = 0; attempt < 5; attempt++) {
      const { error } = await c.admin
        .from('kids_schools')
        .update({ school_code: newSchoolCode(), updated_at: new Date().toISOString() })
        .eq('id', m.school_id)
      if (!error) return answer(c)
      if (error.code !== '23505') return jsonError(500, 'Could not make a new code.')
    }
    return jsonError(500, 'Could not make a new code. Try again.')
  }

  if (action === 'remove-teacher') {
    if (!isUuid(body.teacherId)) return jsonError(400, 'Which teacher?')
    if (body.teacherId === c.user.id) return jsonError(400, 'To leave the school yourself, use “Leave school”.')
    await c.admin.from('kids_classes').update({ school_id: null }).eq('school_id', m.school_id).eq('teacher_id', body.teacherId)
    const { error, count } = await c.admin
      .from('kids_school_teachers')
      .delete({ count: 'exact' })
      .eq('school_id', m.school_id)
      .eq('teacher_id', body.teacherId)
    if (error) return jsonError(500, 'Could not remove the teacher.')
    if (!count) return jsonError(404, 'That teacher is not in your school.')
    return answer(c)
  }

  if (action === 'delete-school') {
    await c.admin.from('kids_classes').update({ school_id: null }).eq('school_id', m.school_id)
    const { error } = await c.admin.from('kids_schools').delete().eq('id', m.school_id)
    if (error) return jsonError(500, 'Could not delete the school.')
    return answer(c)
  }

  return jsonError(400, 'Unknown action.')
}
