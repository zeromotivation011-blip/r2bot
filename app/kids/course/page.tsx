// app/kids/course/page.tsx — the R2BOT Kids course: four planets, one per
// curriculum level and age band. Server-rendered and indexable: what each
// level teaches, its story season and where it leads. Level 1 is playable;
// Levels 2–4 are honest about arriving soon.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript } from '@/lib/seo/jsonld'
import { KIDS_BANDS } from '@/lib/kids/bands'
import { LEVELS, PRINCIPLES } from '@/lib/kids/curriculum/levels'
import { PLANETS } from '@/lib/kids/universe/worlds'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'

/** Levels whose 24 sessions are written in full and playable. */
const PLAYABLE = new Set([1])

const TITLE = 'Robotics Course for Kids (Ages 5–17): Four Levels, One Robot'
const DESCRIPTION =
  'The R2BOT Kids robotics course: four levels for ages 5–17, each a 24-session story season. Children build one robot part by part, code it in a real-physics simulator, solve challenges and earn skill badges.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BASE}/kids/course` },
  openGraph: {
    type: 'website',
    url: `${BASE}/kids/course`,
    siteName: 'R2BOT',
    title: 'R2BOT Kids course — four planets, one robot that grows with your child',
    description: 'A story-led robotics course for ages 5–17: build a robot, code it with real physics, earn skill badges.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids course' }],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'R2BOT Kids robotics course',
  description: DESCRIPTION,
  url: `${BASE}/kids/course`,
  itemListElement: LEVELS.map((l, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'Course',
      name: `Level ${l.number} · ${l.name}: ${l.season.title}`,
      description: l.season.premise,
      url: `${BASE}/kids/course/${l.number}`,
      provider: { '@type': 'Organization', name: 'R2BOT', url: BASE },
      educationalLevel: `Ages ${l.ages}`,
      inLanguage: 'en',
      isAccessibleForFree: true,
    },
  })),
}

export default function CoursePage() {
  return (
    <div className="pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(jsonLd) }} />
      <header className="mx-auto max-w-6xl px-4 pb-2 pt-6 sm:pt-10">
        <nav aria-label="Breadcrumb" className="text-sm text-[#6E7888]">
          <Link href="/kids" className="-my-3 inline-block py-3 font-semibold text-amber-300 hover:underline">
            R2BOT Kids
          </Link>{' '}
          / Course
        </nav>
        <p className="mt-2 font-display text-sm font-bold uppercase tracking-wider text-amber-300">The course</p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-[#EEF2F8] sm:text-5xl">Four planets. One robot that grows with you.</h1>
        <p className="mt-3 max-w-3xl text-[17px] leading-relaxed text-[#A7B0C0] sm:text-lg">
          Each planet is one level of the course and one story season of 24 sessions. In every session a child watches an
          episode, adds a part to their own robot, learns a new block, solves a mission in a real-physics simulator,
          answers three questions and earns a skill badge. Every sixth session is a &ldquo;Make it yours&rdquo; project they design.
        </p>
      </header>

      <section aria-labelledby="planets-h" className="mx-auto max-w-6xl px-4 pb-0 pt-6">
        <h2 id="planets-h" className="sr-only">
          The four levels
        </h2>
        <ol className="grid gap-5 lg:grid-cols-2">
          {LEVELS.map((l) => {
            const planet = PLANETS.find((p) => p.level === l.number)
            const band = KIDS_BANDS.find((b) => b.id === l.band)
            const playable = PLAYABLE.has(l.number)
            if (!planet || !band) return null
            return (
              <li key={l.number}>
                <Link
                  href={`/kids/course/${l.number}`}
                  data-testid="planet-card"
                  className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] transition hover:-translate-y-0.5 hover:border-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-[.99] sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`grid h-16 w-16 shrink-0 sm:h-20 sm:w-20 place-items-center rounded-full bg-gradient-to-br ${planet.gradient} text-3xl sm:text-4xl shadow-[inset_-8px_-10px_18px_rgba(0,0,0,.45),0_0_30px_rgba(252,104,24,.15)] transition-transform motion-safe:group-hover:rotate-6`}
                      aria-hidden
                    >
                      {planet.emoji}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-black uppercase tracking-wide text-amber-300">
                        Level {l.number} · {band.name} · ages {l.ages}
                      </p>
                      <h3 className="font-display text-2xl font-bold leading-tight text-[#EEF2F8]">{planet.name}</h3>
                      <p className="text-[13px] font-semibold text-[#6E7888]">{band.grades}</p>
                      <span
                        className={`mt-1.5 inline-block rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide sm:hidden ${playable ? 'bg-amber-500 text-[#1A1103]' : 'bg-cyan-400/15 text-cyan-200'}`}
                        aria-hidden
                      >
                        {playable ? 'Play now' : 'Arriving soon'}
                      </span>
                    </div>
                    <span
                      className={`ml-auto hidden shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide sm:inline-block ${playable ? 'bg-amber-500 text-[#1A1103]' : 'bg-cyan-400/15 text-cyan-200'}`}
                    >
                      {playable ? 'Play now' : 'Arriving soon'}
                    </span>
                  </div>
                  <p className="mt-4 font-display text-lg font-bold text-[#EEF2F8]">
                    Season: <em className="not-italic text-amber-200">{l.season.title}</em>
                  </p>
                  <p className="mt-1 text-[15px] leading-relaxed text-[#A7B0C0]">{l.season.premise}</p>
                  <div className="mt-4 rounded-2xl bg-black/20 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-cyan-300">By the end, your child can</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-[#EEF2F8]">{band.outcome}</p>
                  </div>
                  <p className="mt-4 text-[14px] text-[#A7B0C0]">
                    {l.sessions.length} sessions · {l.projects.length} projects · certificate: {l.certificate.title}
                  </p>
                  <span className="mt-4 inline-flex min-h-[48px] items-center self-start rounded-2xl bg-white/[0.08] px-5 font-display font-bold text-[#EEF2F8] transition group-hover:bg-white/15">
                    {playable ? 'Open the season map →' : 'See the season plan →'}
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      </section>

      <section aria-labelledby="how-h" className="mx-auto max-w-6xl px-4 pb-0 pt-14">
        <h2 id="how-h" className="font-display text-2xl font-bold text-[#EEF2F8] sm:text-3xl">
          How every session works
        </h2>
        <ol className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['🎬', 'Episode', 'A short animated story with voices and captions sets up the problem.'],
            ['🔧', 'Build', 'Add or upgrade one part of your robot, and see what goes wrong without it.'],
            ['🧩', 'Code', 'Spark shows the new block in a worked example, one step at a time.'],
            ['🏁', 'Challenge', 'Solve a mission in a real-physics 3D arena. Stars reward care, never speed.'],
            ['❓', 'Check', 'Three spoken questions, each followed by the reason — never a score.'],
            ['🏅', 'Badge', 'A skill badge that says what you can now do.'],
          ].map(([icon, name, text]) => (
            <li key={name} className="rounded-[20px] border border-white/10 bg-[#111C32] p-4">
              <span className="text-3xl" aria-hidden>
                {icon}
              </span>
              <h3 className="mt-2 font-display text-lg font-bold text-[#EEF2F8]">{name}</h3>
              <p className="mt-1 text-[14px] leading-snug text-[#A7B0C0]">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="principles-h" className="mx-auto max-w-3xl px-4 pb-0 pt-14 text-[#A7B0C0]">
        <h2 id="principles-h" className="font-display text-2xl font-bold text-[#EEF2F8] sm:text-3xl">
          What makes this course different
        </h2>
        <dl className="mt-4 space-y-5">
          {PRINCIPLES.map((p) => (
            <div key={p.title}>
              <dt className="font-display text-lg font-bold text-[#EEF2F8]">{p.title}</dt>
              <dd className="mt-1 leading-relaxed">{p.body}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8">
          Teachers: every session has a 40-minute plan, an unplugged warm-up, discussion questions and common
          misconceptions — open &ldquo;For grown-ups&rdquo; inside any session, or see{' '}
          <Link href="/kids/schools" className="-my-3 inline-block py-3 font-semibold text-amber-300 underline-offset-4 hover:underline">
            R2BOT Kids for schools
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
