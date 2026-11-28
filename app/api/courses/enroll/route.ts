// POST /api/courses/enroll — record that a signed-in learner has enrolled in a course.
// Idempotent: enrolling twice is a no-op (unique on user_id, course_slug). Separate from
// video_watch/lesson_completions on purpose — this is an explicit intent signal, not an
// inferred one, so it can answer "how many have enrolled" directly.
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { listPublishedCourses } from '@/lib/courses'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Sign in to enroll.' }, { status: 401 })

  let courseSlug = ''
  try {
    const body = await req.json()
    courseSlug = String(body?.courseSlug ?? '')
  } catch {
    return Response.json({ error: 'Bad request.' }, { status: 400 })
  }
  const known = listPublishedCourses().some((c) => c.slug === courseSlug)
  if (!known) return Response.json({ error: 'Unknown course.' }, { status: 400 })

  const { error } = await supabase
    .from('course_enrollments')
    .upsert({ user_id: user.id, course_slug: courseSlug }, { onConflict: 'user_id,course_slug', ignoreDuplicates: true })
  if (error) return Response.json({ error: 'Could not save enrollment.' }, { status: 500 })

  return Response.json({ enrolled: true })
}
