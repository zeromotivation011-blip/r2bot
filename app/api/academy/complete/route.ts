// POST /api/academy/complete — record that a signed-in learner finished an
// Academy lesson. The lesson must exist in /content/academy; if it declares a
// quiz, the answers are graded here (the key never reaches the browser, see
// publicQuiz()). On pass — or when there is no quiz — a row is upserted into
// academy_completions with the service role, which is the only writer.
//
// Before migration 0053 runs the table does not exist (Postgres 42P01). The
// route then answers 200 {recorded:false} so the lesson page keeps working;
// /api/certificates degrades open in the same window.
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { getAcademyLesson, ACADEMY_PASS_MARK } from '@/lib/academy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TRACKS = ['spark', 'wire', 'forge', 'edge'] as const
type Track = (typeof TRACKS)[number]

function isTrack(s: unknown): s is Track {
  return typeof s === 'string' && (TRACKS as readonly string[]).includes(s)
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Sign in to save your progress.' }, { status: 401 })

  let b: { track?: unknown; lessonSlug?: unknown; answers?: unknown }
  try { b = await req.json() } catch { return Response.json({ error: 'Invalid JSON.' }, { status: 400 }) }

  const track = b.track
  const lessonSlug = typeof b.lessonSlug === 'string' ? b.lessonSlug.trim() : ''
  if (!isTrack(track) || !/^[a-z0-9][a-z0-9-]{0,120}$/.test(lessonSlug)) {
    return Response.json({ error: 'Invalid lesson.' }, { status: 400 })
  }

  const lesson = getAcademyLesson(track, lessonSlug)
  if (!lesson) return Response.json({ error: 'Lesson not found.' }, { status: 404 })

  // Grade the quiz, if the lesson has one. A failed attempt says which were
  // wrong, never which option was right — the same rule as the video courses.
  const quiz = lesson.quiz ?? []
  let score = 1
  let review: { ok: boolean; why: string | null }[] | undefined
  if (quiz.length > 0) {
    const answers = Array.isArray(b.answers) ? b.answers.map((x) => (typeof x === 'number' ? x : -1)) : []
    let correct = 0
    review = quiz.map((qq, i) => {
      const ok = answers[i] === qq.answer
      if (ok) correct++
      return { ok, why: ok ? (qq.why ?? null) : null }
    })
    score = correct / quiz.length
    if (score < ACADEMY_PASS_MARK) {
      return Response.json({ passed: false, recorded: false, score, review }, { status: 200 })
    }
  }

  const { error } = await createSupabaseAdminClient()
    .from('academy_completions')
    .upsert(
      { user_id: user.id, track, lesson_slug: lessonSlug },
      { onConflict: 'user_id,track,lesson_slug', ignoreDuplicates: true },
    )

  if (error) {
    if (error.code === '42P01') {
      // Migration 0053 not applied yet: the lesson still counts in the UI.
      console.warn('[academy/complete] academy_completions missing — run migration 0053')
      return Response.json({ passed: true, recorded: false, score, review }, { status: 200 })
    }
    return Response.json({ error: 'Could not save progress.' }, { status: 500 })
  }

  return Response.json({ passed: true, recorded: true, score, review }, { status: 200 })
}
