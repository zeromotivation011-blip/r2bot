// GET /api/courses/progress?course=<slug> — the signed-in learner's progress.
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ signedIn: false })
  const course = req.nextUrl.searchParams.get('course') ?? ''
  const [done, watch, cert] = await Promise.all([
    supabase.from('lesson_completions').select('lesson_slug').eq('user_id', user.id).eq('course_slug', course),
    supabase.from('video_watch').select('lesson_slug, position_s, max_pct').eq('user_id', user.id).eq('course_slug', course),
    supabase.from('certificates').select('certificate_id').eq('user_id', user.id).eq('lesson_slug', `course:${course}`).maybeSingle(),
  ])
  return Response.json({
    signedIn: true,
    completed: (done.data ?? []).map((r) => r.lesson_slug as string),
    watch: Object.fromEntries((watch.data ?? []).map((r) => [r.lesson_slug as string, { position: r.position_s as number, maxPct: r.max_pct as number }])),
    certificateId: (cert.data?.certificate_id as string | undefined) ?? null,
  })
}
