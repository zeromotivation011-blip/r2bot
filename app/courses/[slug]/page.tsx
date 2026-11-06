import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { listPublishedCourses, loadCourseBySlug, totalMinutes } from '@/lib/courses'
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
    robots: c.status === 'draft' ? { index: false } : undefined,
  }
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const c = loadCourseBySlug(slug)
  if (!c) notFound()
  const url = `${BASE}/courses/${c.slug}`
  const ld = [
    courseJsonLD(c.title, c.description, url),
    breadcrumbJsonLD([{ name: 'Home', path: '/' }, { name: 'Courses', path: '/courses' }, { name: c.title, path: `/courses/${c.slug}` }]),
  ]
  return (
    <>
      {ld.map((j, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(j) }} />)}
      <CourseOverviewClient
        slug={c.slug} title={c.title} description={c.description} level={c.level}
        outcomes={c.outcomes} minutes={totalMinutes(c)} draft={c.status === 'draft'}
        lessons={c.lessons.map((l) => ({ id: l.id, title: l.title, summary: l.summary, durationMin: l.durationMin }))}
      />
    </>
  )
}
