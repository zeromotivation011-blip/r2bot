// app/kids/galaxy/concepts/page.tsx — the sixteen big ideas of robotics (server component)
// Indexable: what each concept strand means at every age, how R2BOT decides a
// child has really learnt it (secure / fading), and the Galaxy missions that
// practise it. The child's own constellations are a client island
// (ConceptConstellationClient) that reads the device's progress store only.

import type { Metadata } from 'next'
import Link from 'next/link'
import { GrownUpLink } from '@/components/kids/app/GrownUpLinkClient'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import { ALL_ACTIVITIES, allSummaries } from '@/lib/kids/activities/content'
import { orderActivities } from '@/lib/kids/activities/progress'
import { CONCEPT_SPIRAL } from '@/lib/kids/curriculum/levels'
import { KIDS_BANDS } from '@/lib/kids/bands'
import { CONCEPT_IDS, CONCEPT_INFO, SECURE_TEMPLATES, SECURE_WINDOW_DAYS, SECURE_WINS } from '@/lib/kids/universe/mastery'
import ConceptConstellationClient from '@/components/kids/galaxy/ConceptConstellationClient'

export const runtime = 'nodejs'

const BASE = 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/galaxy/concepts`
const TITLE = 'The 16 Big Ideas of Robotics for Kids · Skill Constellations'
const DESCRIPTION =
  'Sensors, loops, feedback, forces, data, design, safety and more: the sixteen concept strands of robotics, what each looks like from age 5 to 17, and how kids prove they have really learnt them.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'R2BOT Kids — the 16 big ideas of robotics',
    description: DESCRIPTION,
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids skill constellations' }],
  },
}

const summaries = allSummaries()

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Skill Galaxy', path: '/kids/galaxy' },
  { name: 'Skill constellations', path: '/kids/galaxy/concepts' },
])

const listLd = {
  '@context': 'https://schema.org',
  '@type': 'DefinedTermSet',
  name: 'The big ideas of robotics (R2BOT Kids concept strands)',
  url: PAGE_URL,
  hasDefinedTerm: CONCEPT_IDS.map((id) => ({
    '@type': 'DefinedTerm',
    name: CONCEPT_INFO[id].name,
    description: CONCEPT_INFO[id].kid,
    url: `${PAGE_URL}#about-${id}`,
  })),
}

const link = 'font-semibold text-amber-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 rounded'

export default function ConceptsPage() {
  const examples = new Map(
    CONCEPT_IDS.map((id) => {
      const tagged = orderActivities(ALL_ACTIVITIES.filter((a) => a.concepts?.[0] === id))
      const perBand = KIDS_BANDS.map((b) => tagged.find((a) => a.band === b.id)).filter((a): a is (typeof tagged)[number] => !!a)
      return [id, { picks: perBand, total: ALL_ACTIVITIES.filter((a) => a.concepts?.includes(id)).length }]
    }),
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(listLd) }} />

      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-4 sm:px-5">
        <nav aria-label="Breadcrumb" className="text-[15px] text-[#A7B0C0]">
          <Link href="/kids/galaxy" className="inline-flex min-h-[44px] items-center rounded-lg hover:text-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
            ← Skill Galaxy
          </Link>
        </nav>
        <header className="mb-6 mt-1">
          <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-amber-300">R2BOT Universe</p>
          <h1 className="mt-1 font-display text-[34px] font-bold leading-tight text-[#EEF2F8] sm:text-5xl">Skill constellations</h1>
          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-[#A7B0C0]">
            Robotics rests on sixteen big ideas, from “a robot senses, thinks and acts” to feedback control, data and safety. Every Skill Galaxy
            mission practises one to three of them, and each idea is a constellation in your sky.
          </p>
        </header>

        <ConceptConstellationClient summaries={summaries} title="Your constellations" />

        <article className="mt-14 max-w-4xl text-[17px] leading-relaxed text-[#A7B0C0]">
          <h2 className="font-display text-2xl font-bold text-[#EEF2F8]">How we know an idea has really stuck</h2>
          <p className="mt-3">
            Finishing a mission is not the same as learning the idea behind it. A child can get lucky once, or follow a pattern without
            understanding it. So R2BOT Kids marks a concept as <strong className="text-[#EEF2F8]">secure</strong> only after {SECURE_WINS}{' '}
            missions solved on the first try, using at least {SECURE_TEMPLATES} different kinds of mission, all within {SECURE_WINDOW_DAYS} days.
            Solving the same idea as a gear puzzle and again as a prediction shows the idea has moved from one game into the child’s head.
          </p>
          <p className="mt-3">
            Memory fades when it is not used, for children and adults alike. When {SECURE_WINDOW_DAYS} days pass without a first-try win, a secure
            concept shows as <strong className="text-[#EEF2F8]">fading</strong> and its battery runs low. The daily missions then include a{' '}
            <strong className="text-[#EEF2F8]">Recharge</strong>: one mission on that idea, deliberately in a different format from the last
            one. Pulling an idea back out of memory after a gap, called spaced retrieval practice, is one of the best-evidenced ways to make
            learning last. One first-try win recharges the battery. Missing a day costs nothing: there is no streak to lose.
          </p>
          <p className="mt-3">
            New to the galaxy, or finding things too easy? A short{' '}
            <Link href="/kids/galaxy/launch-check" className={link}>
              Launch Check
            </Link>{' '}
            of six to eight quick missions finds a good starting point in each track. Everything stays on the device: no account, no personal
            details, no scores compared with anyone else.
          </p>

          <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">The sixteen big ideas, at every age</h2>
          <p className="mt-3">
            Each idea comes back every year at a deeper level, so a six-year-old and a sixteen-year-old practise the same strand in different
            ways. These are the same strands the R2BOT Kids course is built on.
          </p>
          <div className="mt-5 grid gap-4">
            {CONCEPT_IDS.map((id) => {
              const info = CONCEPT_INFO[id]
              const ex = examples.get(id)
              return (
                <section key={id} id={`about-${id}`} aria-labelledby={`h-${id}`} className="scroll-mt-24 rounded-[20px] border border-white/[0.08] bg-[#111C32] p-4 sm:p-5">
                  <h3 id={`h-${id}`} className="font-display text-xl font-bold text-[#EEF2F8]">
                    <span aria-hidden>{info.icon}</span> {info.name}
                  </h3>
                  <p className="mt-1 text-[#EEF2F8]">{info.kid}</p>
                  <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                    {KIDS_BANDS.map((b, i) => {
                      const text = CONCEPT_SPIRAL[id][i]
                      if (!text || text === '—') return null
                      return (
                        <div key={b.id} className="rounded-2xl bg-white/[0.03] p-3">
                          <dt className="text-[13px] font-bold uppercase tracking-wider text-[#6E7888]">
                            {b.emoji} {b.name} · ages {b.ages}
                          </dt>
                          <dd className="mt-1 text-[15px] leading-snug">{text}</dd>
                        </div>
                      )
                    })}
                  </dl>
                  {ex && ex.picks.length > 0 && (
                    <p className="mt-3 text-[15px]">
                      <span className="text-[#6E7888]">{ex.total} missions practise it, for example: </span>
                      {ex.picks.map((a, i) => (
                        <span key={a.id}>
                          <Link href={`/kids/galaxy/${a.track}/${a.id}`} className={`${link} inline-flex min-h-[44px] items-center`}>
                            {a.title}
                          </Link>
                          {i < ex.picks.length - 1 ? ' · ' : ''}
                        </span>
                      ))}
                    </p>
                  )}
                </section>
              )
            })}
          </div>

          <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">For parents and teachers</h2>
          <p className="mt-3">
            The constellations are a child’s own picture of what they know, not a grade. Teachers using an R2BOT Kids class see the same
            sixteen strands per child, so a lesson can start from the idea that is fading rather than the next page in the book. Parents can
            find a plain-words summary of the week in the{' '}
            <GrownUpLink href="/kids/parents" grant className={link}>
              parents’ page
            </GrownUpLink>
            .
          </p>
        </article>
      </main>
    </>
  )
}
