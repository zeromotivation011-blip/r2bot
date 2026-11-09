import type { Metadata } from 'next'
import Link from 'next/link'
import { SHORTS, SHORT_COURSES, shortsInCourse, liveShorts } from '@/lib/shorts'
import { ProgressBar, StartOrContinue, Tick, CourseProgress } from '@/components/shorts/ShortsClient'
import { CourseCover } from '@/components/shorts/CourseCover'
import InlineSignup from '@/components/InlineSignup'
import { authorRef } from '@/lib/author'
import { jsonldScript } from '@/lib/seo/jsonld'

const BASE = 'https://www.r2bot.in'
export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Quick Lessons: How Robots Work in 60 Seconds',
  description:
    'Free one-minute robotics lessons with video, animated demos and a quick check. Five short courses on sensors, motors, control, hands and robots at work.',
  alternates: {
    canonical: `${BASE}/shorts`,
    languages: { en: `${BASE}/shorts`, 'zh-CN': `${BASE}/zh/shorts`, hi: `${BASE}/hi/shorts`, es: `${BASE}/es/shorts` },
  },
}

/**
 * The Quick Lessons hub.
 *
 * It used to be 47 cards dumped under five headings, preceded by an empty
 * progress bar reading "0 of 47 finished". A visitor arriving from a
 * sixty-second video was asked to choose from forty-seven options with no
 * indication of where to begin or how they relate.
 *
 * Now: one place to start, then five courses as courses — each with cover art,
 * a count, an outcome and its own page. The full list is still here, one fold
 * down, for people who prefer to browse.
 */
export default function ShortsHub() {
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'R2BOT Quick Lesson courses',
      itemListElement: SHORT_COURSES.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${BASE}/shorts/course/${c.slug}`,
        name: c.title,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: 'Quick Lessons: how robots work in one minute',
      description:
        'Five short courses of one-minute robotics lessons, each with a video, an interactive demo and a question.',
      url: `${BASE}/shorts`,
      provider: { '@type': 'Organization', name: 'R2BOT', url: BASE },
      author: authorRef(),
      isAccessibleForFree: true,
      hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', courseWorkload: `PT${liveShorts().length}M` },
    },
  ]

  const first = SHORT_COURSES[0]

  return (
    <main className="mx-auto max-w-5xl px-5 pb-20 pt-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(ld) }} />

      <p className="r2-eyebrow">Quick Lessons</p>
      <h1 className="r2-display">
        How robots work, one minute at a time
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-gray-300">
        Watch a one-minute video, play with a live demo, answer one question. {liveShorts().length} lessons
        in five short courses — free, no account, nothing to install.
      </p>

      <ul className="mt-5 flex flex-wrap gap-2 text-xs text-gray-300">
        {[`${liveShorts().length} lessons`, '1 minute each', 'A demo in every lesson', 'Free · no sign-up'].map((t) => (
          <li key={t} className="rounded-full border border-white/10 px-3 py-1">
            {t}
          </li>
        ))}
      </ul>

      <ProgressBar slugs={liveShorts().map((s) => s.slug)} />

      {/* One obvious action, which becomes "continue" once there is progress. */}
      <StartOrContinue
        lessons={liveShorts().map((s) => ({ slug: s.slug, title: s.title, summary: s.summary }))}
      />

      <h2 className="mt-14 text-2xl font-bold text-white">Five short courses</h2>
      <p className="mt-1 text-gray-400">Take them in any order. Each one stands on its own.</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {SHORT_COURSES.map((c, i) => {
          const lessons = shortsInCourse(c.slug)
          return (
            <Link
              key={c.slug}
              href={`/shorts/course/${c.slug}`}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition hover:border-amber-500/60"
            >
              <CourseCover
                slug={c.slug}
                icon={c.icon}
                index={i + 1}
                title={c.title}
                className="aspect-[16/9] w-full"
              />
              <div className="p-5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-lg font-bold text-white group-hover:text-amber-300">{c.title}</h3>
                  <CourseProgress slugs={lessons.map((l) => l.slug)} />
                </div>
                <p className="mt-1 text-sm text-gray-400">{c.blurb}</p>
                <p className="mt-3 text-xs text-gray-500">
                  {lessons.length} lessons · about {lessons.length} min
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="mt-12">
        <InlineSignup />
      </div>

      {/* The full list, for people who would rather scan than be guided. */}
      <h2 className="mt-14 text-2xl font-bold text-white">Every lesson</h2>
      <p className="mt-1 text-gray-400">All {liveShorts().length}, grouped by course.</p>

      {SHORT_COURSES.map((c) => (
        <section key={c.slug} className="mt-8">
          <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-gray-400">
            <Link href={`/shorts/course/${c.slug}`} className="hover:text-amber-400">
              {c.icon} {c.title}
            </Link>
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shortsInCourse(c.slug).map((s) => (
              <Link
                key={s.slug}
                href={`/shorts/${s.slug}`}
                className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition hover:border-amber-500/50"
              >
                {/* Landscape crop of the landscape thumbnail. It was being
                    squeezed into a 64x114 portrait box, which cropped every
                    thumbnail to an unreadable sliver. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://i.ytimg.com/vi/${s.ids[0]}/mqdefault.jpg`}
                  alt=""
                  width={320}
                  height={180}
                  loading="lazy"
                  className="aspect-[16/9] w-full object-cover"
                />
                <div className="p-3">
                  <p className="text-sm font-bold leading-snug text-white">
                    {s.title.split(':')[0]} <Tick slug={s.slug} />
                  </p>
                  {/* Clamped with CSS, not cut mid-word with slice(0, 80). */}
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-400">{s.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <p className="mt-14 text-gray-400">
        Finished these? The{' '}
        <Link href="/courses" className="r2-link">free course path</Link> covers the
        same ground in longer videos, with quizzes and a certificate — start with{' '}
        <Link href={`/shorts/course/${first.slug}`} className="r2-link">
          {first.title}
        </Link>{' '}
        if you are not sure yet.
      </p>
    </main>
  )
}
