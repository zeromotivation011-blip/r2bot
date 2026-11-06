// Shared certificate rule for video courses: every lesson passed, plus the
// final activity submitted (when the course has one and the table exists).
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import type { Course } from '@/lib/courses'

type Sb = { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

/** True when the learner has submitted the course's final activity (or none is required). */
export async function assignmentDone(sb: Sb, userId: string, course: Course): Promise<boolean> {
  if (!course.finalActivity) return true
  const { data, error } = await sb.from('course_assignments').select('id')
    .eq('user_id', userId).eq('course_slug', course.slug).maybeSingle()
  // Migration 0046 not run yet: do not block certificates on a missing table.
  if (error && (error.code === '42P01' || /course_assignments/.test(error.message ?? ''))) return true
  return !!data
}

/** Issue (or fetch) the certificate when the rule is met. Returns its id or null. */
export async function issueCertificateIfEarned(sb: Sb, userId: string, course: Course): Promise<{ certificateId: string | null; lessonsDone: number; assignmentOk: boolean }> {
  const { data: rows } = await sb.from('lesson_completions').select('lesson_slug')
    .eq('user_id', userId).eq('course_slug', course.slug)
  const done = new Set(((rows ?? []) as { lesson_slug: string }[]).map((r) => r.lesson_slug))
  const lessonsDone = course.lessons.filter((l) => done.has(l.id)).length
  const assignmentOk = await assignmentDone(sb, userId, course)
  if (lessonsDone < course.lessons.length || !assignmentOk) return { certificateId: null, lessonsDone, assignmentOk }

  const admin = createSupabaseAdminClient()
  const key = `course:${course.slug}`
  const { data: existing } = await admin.from('certificates').select('certificate_id')
    .eq('user_id', userId).eq('lesson_slug', key).maybeSingle()
  if (existing?.certificate_id) return { certificateId: existing.certificate_id as string, lessonsDone, assignmentOk }
  const { data: ins } = await admin.from('certificates')
    .insert({ user_id: userId, track: 'video', lesson_slug: key, lesson_title: course.title })
    .select('certificate_id').single()
  return { certificateId: (ins?.certificate_id as string | undefined) ?? null, lessonsDone, assignmentOk }
}
