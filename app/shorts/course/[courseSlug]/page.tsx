import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SHORTS, SHORT_COURSES, shortsInCourse } from '@/lib/shorts'
import { CourseCover } from '@/components/shorts/CourseCover'
import { StartOrContinue, Tick, CourseProgress } from '@/components/shorts/ShortsClient'
import InlineSignup from '@/components/InlineSignup'
import ShareBar from '@/components/ShareBar'
import { authorRef } from '@/lib/author'

/**
 * A mini-course landing page.
 *
 * The Quick Lessons hub was 47 cards in five unlabelled groups: a wall, not a
 * path. The lessons were already grouped into five courses in the data, but
 * that grouping existed nowhere a visitor or a crawler could land on. Each
 * course now has its own page with an outcome, an ordered lesson list and one
 * place to start — five new pages written to answer one real question each
 * ("how do robots sense the world"), instead of one page trying to answer all
 * five.
 */

const BASE = 'https://www.r2bot.in'
export const revalidate = 86400
export const dynamicParams = false

export function generateStaticParams() {
  return SHORT_COURSES.map((c) => ({ courseSlug: c.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseSlug: string }>
}): Promise<Metadata> {
  const { courseSlug } = await params
  const course = SHORT_COURSES.find((c) => c.slug === courseSlug)
  if (!course) return {}
  const n = shortsInCourse(course.slug).length
  return {
    title: `${course.title}: ${n} One-Minute Lessons`,
    description: `${course.blurb} ${n} free one-minute video lessons, each with a demo you can play with and one question to check it landed.`.slice(0, 158),
    alternates: { canonical: `${BASE}/shorts/course/${course.slug}` },
    openGraph: {
      type: 'article',
      url: `${BASE}/shorts/course/${course.slug}`,
      title: `${course.title} — ${n} one-minute lessons`,
      description: course.blurb,
    },
  }
}

export default async function ShortCoursePage({
  params,
}: {
  params: Promise<{ courseSlug: string }>
}) {
  const { courseSlug } = await params
  const course = SHORT_COURSES.find((c) => c.slug === courseSlug)
  if (!course) notFound()

  const lessons = shortsInCourse(course.slug)
  const index = SHORT_COURSES.findIndex((c) => c.slug === course.slug)
  const next = SHORT_COURSES[index + 1] ?? null
  const prev = index > 0 ? SHORT_COURSES[index - 1] : null
  const minutes = lessons.length

  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: course.title,
      description: course.blurb,
      url: `${BASE}/shorts/course/${course.slug}`,
      provider: { '@type': 'Organization', name: 'R2BOT', url: BASE },
      author: authorRef(),
      isAccessibleForFree: true,
      educationalLevel: 'Beginner',
      timeRequired: `PT${minutes}M`,
      hasCourseInstance: {
        '@type': 'CourseInstance',
        courseMode: 'online',
        courseWorkload: `PT${minutes}M`,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `${course.title} lessons`,
      itemListElement: lessons.map((l, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${BASE}/shorts/${l.slug}`,
        name: l.title,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Quick Lessons', item: `${BASE}/shorts` },
        { '@type': 'ListItem', position: 2, name: course.title, item: `${BASE}/shorts/course/${course.slug}` },
      ],
    },
  ]

  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 pt-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />

      <Link href="/shorts" className="text-sm text-gray-400 hover:text-white">
        ← Quick Lessons
      </Link>

      <div className="mt-4 grid gap-6 md:grid-cols-[260px_1fr] md:items-start">
        <CourseCover
          slug={course.slug}
          icon={course.icon}
          index={index + 1}
          title={course.title}
          className="w-full rounded-2xl border border-white/10"
        />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500">
            Course {index + 1} of {SHORT_COURSES.length} · Free
          </p>
          <h1 className="mt-2 text-3xl font-black text-white md:text-4xl">{course.title}</h1>
          <p className="mt-3 text-lg text-gray-300">{course.blurb}</p>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
            <span>{lessons.length} lessons</span>
            <span aria-hidden>·</span>
            <span>about {minutes} min in total</span>
            <span aria-hidden>·</span>
            <span>no account needed</span>
            <CourseProgress slugs={lessons.map((l) => l.slug)} />
          </p>
        </div>
      </div>

      {course.outcome && (
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
            After this course you can
          </h2>
          <p className="mt-2 text-lg text-white">{course.outcome}</p>
        </section>
      )}

      <StartOrContinue
        lessons={lessons.map((l) => ({ slug: l.slug, title: l.title, summary: l.summary }))}
      />

      <h2 className="mt-12 text-2xl font-bold text-white">The lessons, in order</h2>
      <ol className="mt-4 space-y-2">
        {lessons.map((l, i) => (
          <li key={l.slug}>
            <Link
              href={`/shorts/${l.slug}`}
              className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-amber-500/60"
            >
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold text-gray-300">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-white">
                  {l.title.split(':')[0]} <Tick slug={l.slug} />
                </span>
                <span className="mt-0.5 block text-sm text-gray-400">{l.summary}</span>
              </span>
              <span className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-gray-400">
                1 min
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <div className="mt-10">
        <InlineSignup />
      </div>

      <nav className="mt-10 flex flex-wrap justify-between gap-4 border-t border-white/10 pt-6 text-sm">
        {prev ? (
          <Link href={`/shorts/course/${prev.slug}`} className="text-amber-500 hover:underline">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/shorts/course/${next.slug}`} className="text-amber-500 hover:underline">
            Next course: {next.title} →
          </Link>
        ) : (
          <Link href="/courses" className="text-amber-500 hover:underline">
            Ready for the full video course path? →
          </Link>
        )}
      </nav>

      <div className="mt-8">
        <ShareBar url={`${BASE}/shorts/course/${course.slug}`} title={course.title} />
      </div>

      <p className="mt-8 text-sm text-gray-500">
        Going deeper: every lesson links into{' '}
        <Link href="/atlas" className="text-amber-500 underline">the Atlas</Link>, and the{' '}
        <Link href="/courses" className="text-amber-500 underline">free course path</Link> covers the
        same ground in longer videos with quizzes and certificates.
      </p>
    </main>
  )
}
