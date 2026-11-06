// GET /api/courses/progress?course=<slug> — the signed-in learner's progress.
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ signedIn: false })
  const many = req.nextUrl.searchParams.get('courses')
  if (many) {
    // Journey view: lesson counts and certificates for several courses at once.
    const slugs = many.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 20)
    const [rows, certs] = await Promise.all([
      supabase.from('lesson_completions').select('course_slug, lesson_slug').eq('user_id', user.id).in('course_slug', slugs),
      supabase.from('certificates').select('lesson_slug, certificate_id').eq('user_id', user.id).in('lesson_slug', slugs.map((x) => `course:${x}`)),
    ])
    const counts: Record<string, number> = {}
    for (const r of rows.data ?? []) counts[r.course_slug as string] = (counts[r.course_slug as string] ?? 0) + 1
    const certificates: Record<string, string> = {}
    for (const c of certs.data ?? []) certificates[(c.lesson_slug as string).replace('course:', '')] = c.certificate_id as string
    return Response.json({ signedIn: true, counts, certificates })
  }
  const course = req.nextUrl.searchParams.get('course') ?? ''
  const [done, watch, cert, assign] = await Promise.all([
    supabase.from('lesson_completions').select('lesson_slug').eq('user_id', user.id).eq('course_slug', course),
    supabase.from('video_watch').select('lesson_slug, position_s, max_pct').eq('user_id', user.id).eq('course_slug', course),
    supabase.from('certificates').select('certificate_id').eq('user_id', user.id).eq('lesson_slug', `course:${course}`).maybeSingle(),
    supabase.from('course_assignments').select('answer').eq('user_id', user.id).eq('course_slug', course).maybeSingle(),
  ])
  return Response.json({
    signedIn: true,
    completed: (done.data ?? []).map((r) => r.lesson_slug as string),
    watch: Object.fromEntries((watch.data ?? []).map((r) => [r.lesson_slug as string, { position: r.position_s as number, maxPct: r.max_pct as number }])),
    certificateId: (cert.data?.certificate_id as string | undefined) ?? null,
    assignment: (assign.data?.answer as string | undefined) ?? null,
  })
}
