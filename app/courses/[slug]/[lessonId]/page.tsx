import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { listPublishedCourses, loadCourseBySlug, toPublicLesson, hasVideo } from '@/lib/courses'
import LessonClient from './LessonClient'
import { jsonldScript } from '@/lib/seo/jsonld'

export const revalidate = 86400
export const dynamicParams = true
const BASE = 'https://www.r2bot.in'

export function generateStaticParams() {
  return listPublishedCourses().flatMap((c) => c.lessons.map((l) => ({ slug: c.slug, lessonId: l.id })))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; lessonId: string }> }): Promise<Metadata> {
  const { slug, lessonId } = await params
  const c = loadCourseBySlug(slug)
  const l = c?.lessons.find((x) => x.id === lessonId)
  if (!c || !l) return {}
  return {
    title: `${l.title} — ${c.title}`,
    description: l.summary,
    alternates: { canonical: `${BASE}/courses/${c.slug}/${l.id}` },
    robots: c.status === 'draft' || !hasVideo(l) ? { index: false } : undefined,
  }
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const { slug, lessonId } = await params
  const c = loadCourseBySlug(slug)
  const idx = c ? c.lessons.findIndex((x) => x.id === lessonId) : -1
  if (!c || idx < 0) notFound()
  const l = c.lessons[idx]
  const video = {
    '@context': 'https://schema.org', '@type': 'VideoObject',
    name: l.title, description: l.summary,
    thumbnailUrl: `https://i.ytimg.com/vi/${l.youtubeId}/hqdefault.jpg`,
    embedUrl: `https://www.youtube.com/embed/${l.youtubeId}`,
    uploadDate: c.updated,
  }
  return (
    <>
      {c.status === 'published' && hasVideo(l) && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(video) }} />}
      <LessonClient
        courseSlug={c.slug} courseTitle={c.title} lesson={toPublicLesson(l)}
        index={idx} total={c.lessons.length}
        nextId={c.lessons[idx + 1]?.id ?? null} prevId={c.lessons[idx - 1]?.id ?? null}
        firstReadyId={c.lessons.find(hasVideo)?.id ?? null}
      />
    </>
  )
}
