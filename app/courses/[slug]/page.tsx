import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { listPublishedCourses, loadCourseBySlug, totalMinutes, hasVideo } from '@/lib/courses'
import { courseJsonLD, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import CourseOverviewClient from './CourseOverviewClient'

export const revalidate = 86400
export const dynamicParams = true
const BASE = 'https://www.r2bot.in'

export function generateStaticParams() {
  return listPublishedCourses().map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const c = loadCourseBySlug(slug)
  if (!c) return {}
  return {
    title: `${c.title} — Free Video Course`,
    description: c.description,
    alternates: { canonical: `${BASE}/courses/${c.slug}` },
    // A course with no recorded videos is a plan, not a course: keep it out of
    // the index until it has something to watch, so we never rank for a page
    // whose every lesson says "not recorded yet".
    robots: c.status === 'draft' || !c.lessons.some(hasVideo) ? { index: false } : undefined,
  }
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const c = loadCourseBySlug(slug)
  if (!c) notFound()
  const url = `${BASE}/courses/${c.slug}`
  const all = listPublishedCourses()
  const at = all.findIndex((x) => x.slug === c.slug)
  const prev = at > 0 ? all[at - 1] : null
  const nxt = at >= 0 && at < all.length - 1 ? all[at + 1] : null
  const ld = [
    courseJsonLD(c.title, c.description, url),
    breadcrumbJsonLD([{ name: 'Home', path: '/' }, { name: 'Courses', path: '/courses' }, { name: c.title, path: `/courses/${c.slug}` }]),
  ]
  return (
    <>
      {ld.map((j, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(j) }} />)}
      <CourseOverviewClient
        slug={c.slug} title={c.title} description={c.description} tagline={c.tagline} outcome={c.outcome}
        level={c.levelLabel ?? c.level} order={c.order} totalCourses={all.length}
        whoFor={c.whoFor} prerequisites={c.prerequisites} presenters={c.presenters}
        outcomes={c.outcomes} minutes={totalMinutes(c)} draft={c.status === 'draft'}
        lessons={c.lessons.map((l) => ({ id: l.id, title: l.title, summary: l.summary, durationMin: l.durationMin, videoReady: hasVideo(l) }))}
        finalActivity={c.finalActivity ? { title: c.finalActivity.title, prompt: c.finalActivity.prompt } : undefined}
        prev={prev ? { slug: prev.slug, title: prev.title } : null} next={nxt ? { slug: nxt.slug, title: nxt.title } : null}
      />
    </>
  )
}
