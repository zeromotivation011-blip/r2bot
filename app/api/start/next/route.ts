// GET /api/start/next — the learner's next lesson across the Academy courses.
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { loadCourse } from '@/lib/academy/content-loader'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Order a beginner should follow.
const ORDER = ['spark-foundations', 'wire-arduino-robotics', 'forge-ros2', 'edge-ai-robotics']

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ signedIn: false })

  const { data } = await supabase.from('lesson_completions').select('course_slug, lesson_slug, completed_at').eq('user_id', user.id)
  const done = new Set((data ?? []).map((r) => `${r.course_slug}/${r.lesson_slug}`))
  const last = (data ?? []).map((r) => r.completed_at as string).sort().pop() ?? null

  let total = 0
  let next: { title: string; course: string; href: string } | null = null
  for (const slug of ORDER) {
    const course = loadCourse(slug)
    if (!course) continue
    for (const m of course.modules) {
      for (const l of m.lessons) {
        total++
        if (!next && !done.has(`${slug}/${l.slug}`)) {
          next = { title: l.title, course: course.title, href: `/academy/c/${slug}/learn/${l.slug}` }
        }
      }
    }
  }
  const completed = ORDER.reduce((n, slug) => n + (loadCourse(slug)?.modules.flatMap((m) => m.lessons).filter((l) => done.has(`${slug}/${l.slug}`)).length ?? 0), 0)
  const daysSince = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : null
  return Response.json({ signedIn: true, completed, total, next, daysSince })
}
