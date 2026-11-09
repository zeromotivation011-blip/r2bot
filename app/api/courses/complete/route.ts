// POST /api/courses/complete — grade a lesson's quiz on the server, require
// enough watch time, record completion, and issue a certificate when the whole
// course is done. Answers are never sent to the browser.
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { loadCourseBySlug, PASS_MARK, WATCH_REQUIRED, hasVideo } from '@/lib/courses'
import { issueCertificateIfEarned } from '@/lib/course-certificate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Sign in to save your progress.' }, { status: 401 })

  let b: { courseSlug?: unknown; lessonId?: unknown; watched?: unknown; answers?: unknown }
  try { b = await req.json() } catch { return Response.json({ error: 'Invalid JSON.' }, { status: 400 }) }
  const courseSlug = typeof b.courseSlug === 'string' ? b.courseSlug : ''
  const lessonId = typeof b.lessonId === 'string' ? b.lessonId : ''
  const watched = typeof b.watched === 'number' && Number.isFinite(b.watched) ? Math.min(1, Math.max(0, b.watched)) : 0
  const answers = Array.isArray(b.answers) ? b.answers.map((x) => (typeof x === 'number' ? x : -1)) : []

  const course = loadCourseBySlug(courseSlug)
  const lesson = course?.lessons.find((l) => l.id === lessonId)
  if (!course || !lesson) return Response.json({ error: 'Lesson not found.' }, { status: 404 })

  if (!hasVideo(lesson)) return Response.json({ error: 'This lesson\'s video is not published yet.', code: 'NO_VIDEO' }, { status: 409 })
  if (watched < WATCH_REQUIRED) {
    return Response.json({ error: 'Watch most of the video first.', code: 'WATCH' }, { status: 422 })
  }

  let correct = 0
  const review = lesson.quiz.map((qq, i) => {
    const ok = answers[i] === qq.answer
    if (ok) correct++
    return { ok, why: qq.why ?? null, answer: qq.answer }
  })
  const score = lesson.quiz.length ? correct / lesson.quiz.length : 1
  if (score < PASS_MARK) {
    // Failed attempt: say which were wrong, never which option was right,
    // otherwise one failed submit reveals the whole key.
    return Response.json({ passed: false, score, review: review.map((r) => ({ ok: r.ok, why: r.ok ? r.why : null, answer: null })) }, { status: 200 })
  }

  // Service-role write: owners can only read lesson_completions since 0051,
  // so a fake completion cannot be inserted around the grading above.
  const { error } = await createSupabaseAdminClient().from('lesson_completions').upsert(
    { user_id: user.id, course_slug: courseSlug, lesson_slug: lessonId, xp_earned: 0 },
    { onConflict: 'user_id,course_slug,lesson_slug' },
  )
  if (error) return Response.json({ error: 'Could not save progress.' }, { status: 500 })

  const earned = await issueCertificateIfEarned(supabase, user.id, course)
  const completed = earned.lessonsDone
  const courseComplete = completed >= course.lessons.length
  const certificateId = earned.certificateId
  return Response.json({ passed: true, score, review, completed, total: course.lessons.length, courseComplete, certificateId, needsAssignment: courseComplete && !earned.assignmentOk })
}
