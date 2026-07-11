import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { loadLesson } from '@/lib/academy/content-loader'
import { LessonPlayer } from '@/components/academy/LessonPlayer'
import { ProPaywall } from '@/components/ProPaywall'
import { MarkCompleteButton } from '@/components/academy/MarkCompleteButton'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUserSubscription, isFreeCourse } from '@/lib/subscription'

interface PageProps {
  params: Promise<{ courseSlug: string; lessonSlug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { courseSlug, lessonSlug } = await params
  const data = loadLesson(courseSlug, lessonSlug)
  if (!data) return { title: 'Lesson not found · R2BOT Academy' }
  return {
    title: `${data.lesson.title} · ${data.course.title}`,
    description: data.lesson.objectives.join(' · '),
  }
}

export default async function LearnPage({ params }: PageProps) {
  const { courseSlug, lessonSlug } = await params
  const data = loadLesson(courseSlug, lessonSlug)
  if (!data) notFound()

  // Pro gate: free courses never gated; others require Pro.
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const sub = await getUserSubscription(user?.id)
  const locked = !isFreeCourse(courseSlug) && !sub.isPro

  return (
    <CopilotProvider>
      <Nav />
      {locked ? (
        <main style={{ paddingTop: 110, paddingBottom: 80, minHeight: '100vh', background: '#0a0a0f' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
            <p style={{ fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: '#fbbf24', fontWeight: 900, margin: '0 0 6px' }}>
              {data.course.title}
            </p>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: '#fff', margin: '0 0 12px', lineHeight: 1.2 }}>
              {data.lesson.title}
            </h1>
            {data.lesson.objectives.length > 0 && (
              <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 720 }}>
                {data.lesson.objectives.join(' · ')}
              </p>
            )}
            <ProPaywall>
              <LessonPlayer course={data.course} lesson={data.lesson} />
            </ProPaywall>
          </div>
        </main>
      ) : (
        <>
          <LessonPlayer course={data.course} lesson={data.lesson} />
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
            <MarkCompleteButton
              courseSlug={courseSlug}
              lessonSlug={lessonSlug}
              xpReward={data.lesson.xp_reward ?? 50}
            />
          </div>
        </>
      )}
    </CopilotProvider>
  )
}
