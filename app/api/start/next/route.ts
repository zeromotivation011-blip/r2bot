// GET /api/start/next — the signed-in learner's next lesson on the course path.
//
// This used to walk the retired /academy/c/* curricula and hand back hrefs into
// pages that are now redirects. It reads the video course path instead, which
// is where progress is actually recorded (lesson_completions.course_slug), and
// it only ever points at a lesson whose video exists.
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { hasVideo, listPublishedCourses } from '@/lib/courses'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ signedIn: false })

  const { data } = await supabase
    .from('lesson_completions')
    .select('course_slug, lesson_slug, completed_at')
    .eq('user_id', user.id)

  const done = new Set((data ?? []).map((r) => `${r.course_slug}/${r.lesson_slug}`))
  const last = (data ?? []).map((r) => r.completed_at as string).sort().pop() ?? null

  // Courses in path order; a lesson with no recorded video is not a next step.
  const courses = listPublishedCourses()
  let total = 0
  let completed = 0
  let next: { title: string; course: string; href: string } | null = null

  for (const course of courses) {
    for (const lesson of course.lessons) {
      if (!hasVideo(lesson)) continue
      total++
      const key = `${course.slug}/${lesson.id}`
      if (done.has(key)) {
        completed++
      } else if (!next) {
        next = {
          title: lesson.title,
          course: course.title,
          href: `/courses/${course.slug}/${lesson.id}`,
        }
      }
    }
  }

  const daysSince = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000) : null
  return Response.json({ signedIn: true, completed, total, next, daysSince })
}
