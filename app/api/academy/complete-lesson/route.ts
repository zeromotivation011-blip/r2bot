// app/api/academy/complete-lesson/route.ts — Mark a lesson complete
// Upserts to lesson_completions. When all lessons in the course are done,
// also issues a course-level row in the existing public.certificates table
// (with lesson_slug = `course:<courseSlug>` to namespace from lesson certs).

import type { NextRequest } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { loadCourse } from '@/lib/academy/content-loader'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isTrack(s: unknown): s is 'spark' | 'wire' | 'forge' | 'edge' {
  return s === 'spark' || s === 'wire' || s === 'forge' || s === 'edge'
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Sign in to track progress.' }, { status: 401 })

  let body: { courseSlug?: unknown; lessonSlug?: unknown; xpEarned?: unknown }
  try { body = await req.json() } catch { return Response.json({ error: 'Invalid JSON body.' }, { status: 400 }) }

  const courseSlug = typeof body.courseSlug === 'string' ? body.courseSlug.trim() : ''
  const lessonSlug = typeof body.lessonSlug === 'string' ? body.lessonSlug.trim() : ''
  if (!courseSlug || !lessonSlug) {
    return Response.json({ error: 'courseSlug and lessonSlug are required.' }, { status: 400 })
  }
  const xpEarned = typeof body.xpEarned === 'number' && Number.isFinite(body.xpEarned)
    ? Math.max(0, Math.floor(body.xpEarned))
    : 0

  // Validate the course/lesson exist in the MDX content.
  const course = loadCourse(courseSlug)
  if (!course) return Response.json({ error: 'Course not found.' }, { status: 404 })
  const totalLessons = course.total_lessons
  const lessonInCourse = course.modules.some((m) => m.lessons.some((l) => l.slug === lessonSlug))
  if (!lessonInCourse) {
    return Response.json({ error: 'Lesson not part of this course.' }, { status: 404 })
  }

  // Upsert this lesson as complete. ON CONFLICT keeps the earliest completed_at
  // but bumps xp_earned to the max value seen.
  const { error: upsertErr } = await supabase
    .from('lesson_completions')
    .upsert(
      {
        user_id: user.id,
        course_slug: courseSlug,
        lesson_slug: lessonSlug,
        xp_earned: xpEarned,
      },
      { onConflict: 'user_id,course_slug,lesson_slug' },
    )
  if (upsertErr) {
    return Response.json({ error: upsertErr.message }, { status: 500 })
  }

  // Count completed lessons in this course for the user.
  const { count } = await supabase
    .from('lesson_completions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('course_slug', courseSlug)

  const courseComplete = (count ?? 0) >= totalLessons
  let certificateId: string | null = null

  if (courseComplete && isTrack(course.track)) {
    // Issue a course-level cert if one doesn't already exist. Reuse the
    // existing `certificates` table; namespace with `course:<slug>` so it
    // never collides with lesson-level rows.
    const courseLessonSlug = `course:${courseSlug}`
    const admin = createSupabaseAdminClient()
    const { data: existing } = await admin
      .from('certificates')
      .select('certificate_id')
      .eq('user_id', user.id)
      .eq('lesson_slug', courseLessonSlug)
      .maybeSingle()
    if (existing?.certificate_id) {
      certificateId = existing.certificate_id as string
    } else {
      const { data: inserted, error: insErr } = await admin
        .from('certificates')
        .insert({
          user_id: user.id,
          track: course.track,
          lesson_slug: courseLessonSlug,
          lesson_title: course.title,
        })
        .select('certificate_id')
        .single()
      if (!insErr && inserted) certificateId = inserted.certificate_id as string
    }
  }

  return Response.json({
    success: true,
    courseComplete,
    lessonsCompleted: count ?? 0,
    totalLessons,
    certificateId,
  })
}
