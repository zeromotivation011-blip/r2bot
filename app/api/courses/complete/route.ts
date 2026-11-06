// POST /api/courses/complete — grade a lesson's quiz on the server, require
// enough watch time, record completion, and issue a certificate when the whole
// course is done. Answers are never sent to the browser.
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { loadCourseBySlug, PASS_MARK, WATCH_REQUIRED } from '@/lib/courses'

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
    return Response.json({ passed: false, score, review }, { status: 200 })
  }

  const { error } = await supabase.from('lesson_completions').upsert(
    { user_id: user.id, course_slug: courseSlug, lesson_slug: lessonId, xp_earned: 0 },
    { onConflict: 'user_id,course_slug,lesson_slug' },
  )
  if (error) return Response.json({ error: 'Could not save progress.' }, { status: 500 })

  const { data: rows } = await supabase
    .from('lesson_completions').select('lesson_slug')
    .eq('user_id', user.id).eq('course_slug', courseSlug)
  const done = new Set((rows ?? []).map((r) => r.lesson_slug as string))
  const completed = course.lessons.filter((l) => done.has(l.id)).length
  const courseComplete = completed >= course.lessons.length

  let certificateId: string | null = null
  if (courseComplete) {
    const admin = createSupabaseAdminClient()
    const key = `course:${courseSlug}`
    const { data: existing } = await admin.from('certificates').select('certificate_id')
      .eq('user_id', user.id).eq('lesson_slug', key).maybeSingle()
    if (existing?.certificate_id) certificateId = existing.certificate_id as string
    else {
      // Needs migration 0043 (adds track 'video'); until then this fails quietly.
      const { data: ins } = await admin.from('certificates')
        .insert({ user_id: user.id, track: 'video', lesson_slug: key, lesson_title: course.title })
        .select('certificate_id').single()
      certificateId = (ins?.certificate_id as string | undefined) ?? null
    }
  }
  return Response.json({ passed: true, score, review, completed, total: course.lessons.length, courseComplete, certificateId })
}
