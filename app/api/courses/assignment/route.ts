// POST /api/courses/assignment — save the learner's final activity for a course,
// then issue the certificate if all lessons are also complete.
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { loadCourseBySlug, ASSIGNMENT_MIN_CHARS, ASSIGNMENT_MAX_CHARS } from '@/lib/courses'
import { issueCertificateIfEarned } from '@/lib/course-certificate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Sign in to submit.' }, { status: 401 })

  let b: { courseSlug?: unknown; answer?: unknown }
  try { b = await req.json() } catch { return Response.json({ error: 'Invalid JSON.' }, { status: 400 }) }
  const courseSlug = typeof b.courseSlug === 'string' ? b.courseSlug : ''
  const answer = typeof b.answer === 'string' ? b.answer.trim() : ''
  const course = loadCourseBySlug(courseSlug)
  if (!course?.finalActivity) return Response.json({ error: 'No final activity for this course.' }, { status: 404 })
  if (answer.length < ASSIGNMENT_MIN_CHARS) return Response.json({ error: `Please write at least ${ASSIGNMENT_MIN_CHARS} characters.` }, { status: 422 })
  if (answer.length > ASSIGNMENT_MAX_CHARS) return Response.json({ error: `Please keep it under ${ASSIGNMENT_MAX_CHARS} characters.` }, { status: 422 })

  const { error } = await supabase.from('course_assignments').upsert(
    { user_id: user.id, course_slug: courseSlug, answer, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,course_slug' },
  )
  if (error) return Response.json({ error: 'Could not save. Please try again in a moment.' }, { status: 500 })

  const earned = await issueCertificateIfEarned(supabase, user.id, course)
  return Response.json({ saved: true, certificateId: earned.certificateId, lessonsDone: earned.lessonsDone, total: course.lessons.length })
}
