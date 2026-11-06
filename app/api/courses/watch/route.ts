// POST /api/courses/watch — best-effort save of the resume position and the
// furthest point watched. Failures are silent: this must never block learning.
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { loadCourseBySlug } from '@/lib/courses'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ ok: false }, { status: 401 })
  let b: { courseSlug?: unknown; lessonId?: unknown; position?: unknown; maxPct?: unknown }
  try { b = await req.json() } catch { return Response.json({ ok: false }, { status: 400 }) }
  const courseSlug = typeof b.courseSlug === 'string' ? b.courseSlug : ''
  const lessonId = typeof b.lessonId === 'string' ? b.lessonId : ''
  const course = loadCourseBySlug(courseSlug)
  if (!course || !course.lessons.some((l) => l.id === lessonId)) return Response.json({ ok: false }, { status: 404 })
  const position = Math.max(0, Math.floor(Number(b.position) || 0))
  const maxPct = Math.min(1, Math.max(0, Number(b.maxPct) || 0))
  const { error } = await supabase.from('video_watch').upsert(
    { user_id: user.id, course_slug: courseSlug, lesson_slug: lessonId, position_s: position, max_pct: maxPct, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,course_slug,lesson_slug' },
  )
  return Response.json({ ok: !error })
}
