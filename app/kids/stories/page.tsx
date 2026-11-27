// app/kids/stories/page.tsx — Story Theatre: every episode, grouped by age band.
// Server-rendered: titles, loglines and outcomes are real HTML for readers
// and search engines. Only the "Watched" badges are client-side.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import { KIDS_BANDS } from '@/lib/kids/bands'
import { EPISODES, episodeMinutes, episodesForBand } from '@/lib/kids/stories'
import { CAST, MAIN_CAST } from '@/lib/kids/stories/cast'
import type { CharacterId } from '@/lib/kids/stories/types'
import { CastPortrait } from '@/components/kids/story/CastPortrait'
import WatchedBadgeClient from '@/components/kids/story/WatchedBadgeClient'
import '@/components/kids/story/story.css'

export const runtime = 'nodejs'

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')
const PAGE_URL = `${BASE}/kids/stories`

const TITLE = 'Story Theatre: Animated Robotics Stories for Kids'
const DESCRIPTION =
  'Animated, voiced cartoon episodes that teach one robotics idea each — sensors, loops, IF/ELSE, feedback, PID and Mars rovers — with choices kids make and a 3-question quiz. Ages 5–17.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Story Theatre — robotics cartoons for kids',
    description: DESCRIPTION,
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Story Theatre' }],
  },
}

export default function StoriesPage() {
  const listLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'R2BOT Story Theatre episodes',
    itemListElement: EPISODES.map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${PAGE_URL}/${e.slug}`,
      name: e.title,
    })),
  }
  const crumbs = breadcrumbJsonLD([
    { name: 'R2BOT Kids', path: '/kids' },
    { name: 'Story Theatre', path: '/kids/stories' },
  ])

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 text-gray-200 sm:pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(listLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />

      <nav aria-label="Breadcrumb" className="text-sm text-white/60">
        <Link href="/kids" className="inline-flex min-h-[44px] items-center hover:text-white hover:underline">R2BOT Kids</Link>
        <span aria-hidden className="mx-1.5">›</span>
        <span className="text-white/90">Story Theatre</span>
      </nav>

      <header className="mt-4 grid items-center gap-6 md:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="text-sm font-black uppercase tracking-widest text-orange-300">🎬 Story Theatre</p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-white sm:text-5xl">Robotics cartoons where <span className="text-orange-400">you</span> decide what happens</h1>
          <p className="mt-4 max-w-xl text-base text-white/80 sm:text-lg">
            Every episode is a short animated story with Spark the robot and friends. Each one teaches a single
            robotics idea in plain words: a problem, a try, a funny fail, the “aha!”, and a win. Along the way the
            story stops and asks you to choose. At the end, three quick questions earn up to three stars.
          </p>
          <p className="mt-3 text-sm text-white/60">
            {EPISODES.length} episodes · about 4–5 minutes each · voiced, with captions · no account needed
          </p>
        </div>
        <ul className="grid grid-cols-4 gap-2" aria-label="The cast">
          {MAIN_CAST.map((id) => (
            <li key={id} className="rounded-2xl bg-white/[0.05] p-2 text-center ring-1 ring-white/10">
              <CastPortrait who={id as CharacterId} className="mx-auto h-20 w-full sm:h-28" />
              <span className={`mt-1 block text-xs font-black sm:text-sm ${CAST[id].captionClass}`}>{CAST[id].name}</span>
            </li>
          ))}
        </ul>
      </header>

      {KIDS_BANDS.map((band) => {
        const eps = episodesForBand(band.id)
        if (!eps.length) return null
        return (
          <section key={band.id} aria-labelledby={`band-${band.id}`} className="mt-12">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 id={`band-${band.id}`} className="text-2xl font-black text-white sm:text-3xl">
                <span aria-hidden className="mr-2">{band.emoji}</span>{band.name}
              </h2>
              <p className="text-sm font-semibold text-white/60">Ages {band.ages} · {band.grades}</p>
            </div>
            <p className="mt-1 text-sm text-white/70">{band.promise}</p>
            <ul className="mt-4 grid gap-4 md:grid-cols-2">
              {eps.map((e) => (
                <li key={e.slug}>
                  <article className="group relative h-full rounded-3xl bg-white/[0.04] p-5 ring-1 ring-white/10 transition hover:bg-white/[0.07] hover:ring-orange-400/50">
                    <div className={`mb-3 h-1.5 w-16 rounded-full bg-gradient-to-r ${band.gradient}`} />
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-white/60">
                      <span className="rounded-full bg-white/10 px-2.5 py-1">Episode {e.order}</span>
                      <span className="rounded-full bg-white/10 px-2.5 py-1">{episodeMinutes(e)} min</span>
                      <span className="rounded-full bg-white/10 px-2.5 py-1">{e.concept}</span>
                      <WatchedBadgeClient slug={e.slug} />
                    </div>
                    <h3 className="mt-3 text-xl font-black text-white">
                      <Link href={`/kids/stories/${e.slug}`} className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none group-focus-within:underline">
                        {e.title}
                      </Link>
                    </h3>
                    <p className="mt-2 text-white/80">{e.logline}</p>
                    <p className="mt-2 text-sm text-white/50">📍 {e.setting}</p>
                    <h4 className="mt-3 text-xs font-black uppercase tracking-wider text-orange-300">What kids learn</h4>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-white/75">
                      {e.learns.slice(0, 3).map((l) => <li key={l}>{l}</li>)}
                    </ul>
                    <p className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-orange-700 px-4 font-black text-white group-hover:bg-orange-800" aria-hidden>
                      ▶ Watch
                    </p>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      <section aria-labelledby="grown-ups" className="mt-14 rounded-3xl bg-white/[0.04] p-6 ring-1 ring-white/10">
        <h2 id="grown-ups" className="text-2xl font-black text-white">For parents and teachers</h2>
        <div className="mt-3 grid gap-5 text-sm text-white/75 md:grid-cols-3">
          <div>
            <h3 className="font-black text-white">One idea per episode</h3>
            <p className="mt-1">Each story teaches a single concept, accurately, in plain language. The facts are checked, and every episode page has a short note on the real science and a full transcript.</p>
          </div>
          <div>
            <h3 className="font-black text-white">Made to be watched together</h3>
            <p className="mt-1">The characters speak using your device’s built-in voice, and captions are on by default. If the voice is muted, the story still plays at reading pace. It works on phones (sideways or upright), tablets and laptops, and with a keyboard.</p>
          </div>
          <div>
            <h3 className="font-black text-white">Nothing collected</h3>
            <p className="mt-1">No account, no sign-up and no personal data. Stars and “watched” ticks are saved only in this browser, so children can pick up where they left off.</p>
          </div>
        </div>
        <p className="mt-5 text-sm text-white/70">
          After watching, try the idea for real: build a robot in the <Link href="/kids/workshop" className="font-bold text-orange-300 underline-offset-2 hover:underline">Workshop</Link> or
          program one in the <Link href="/kids/code-lab" className="font-bold text-orange-300 underline-offset-2 hover:underline">Code Lab</Link>.
        </p>
      </section>
    </div>
  )
}
