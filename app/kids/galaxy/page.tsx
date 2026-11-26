// app/kids/galaxy/page.tsx — the Skill Galaxy (server component)
// Ten track constellations of short, hands-on robotics activities. The map is
// a client island fed with light summaries (no params); the teaching text and
// every track link are rendered here on the server.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import { ALL_ACTIVITIES, allSummaries } from '@/lib/kids/activities/content'
import { TRACKS } from '@/lib/kids/activities/types'
import { KIDS_BANDS } from '@/lib/kids/bands'
import GalaxyClient from '@/components/kids/galaxy/GalaxyClient'
import { TRACK_COPY } from '@/components/kids/galaxy/copy'

export const runtime = 'nodejs'

const BASE = 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/galaxy`
const TITLE = 'Skill Galaxy: Hands-On Robotics Activities for Kids 5–17'
const DESCRIPTION =
  'Short, genuinely interactive robotics activities in ten skill tracks: gears, circuits, sensors, code, control, AI and more. Real simulators underneath, four age bands from 5 to 17.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'R2BOT Skill Galaxy — robotics activities for kids',
    description: DESCRIPTION,
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids Skill Galaxy' }],
  },
}

const summaries = allSummaries()

const listLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'R2BOT Skill Galaxy tracks',
  itemListElement: TRACKS.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, url: `${PAGE_URL}/${t.id}` })),
}
const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Skill Galaxy', path: '/kids/galaxy' },
])

export default function GalaxyPage() {
  const counts = new Map(TRACKS.map((t) => [t.id, ALL_ACTIVITIES.filter((a) => a.track === t.id).length]))
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(listLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />

      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-4 sm:px-5">
        <nav aria-label="Breadcrumb" className="text-[15px] text-[#A7B0C0]">
          <Link href="/kids" className="inline-flex min-h-[44px] items-center rounded-lg hover:text-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
            ← R2BOT Kids
          </Link>
        </nav>
        <header className="mb-6 mt-1">
          <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-amber-300">R2BOT Universe</p>
          <h1 className="mt-1 font-display text-[34px] font-bold leading-tight text-[#EEF2F8] sm:text-5xl">Skill Galaxy</h1>
          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-[#A7B0C0]">
            {ALL_ACTIVITIES.length} hands-on robotics missions in ten constellations. Every star is something to build, tune, wire, program or
            predict, with a real simulator underneath — never a plain quiz.
          </p>
        </header>

        <GalaxyClient summaries={summaries} />

        <article className="mt-14 max-w-4xl text-[17px] leading-relaxed text-[#A7B0C0]">
          <h2 className="font-display text-2xl font-bold text-[#EEF2F8]">How the Skill Galaxy works</h2>
          <p className="mt-3">
            Each activity takes a few minutes and teaches one true idea from real robotics. A child chooses gears until a winch turns at the right
            speed, wires a circuit that the solver actually runs, tunes a controller and watches it overshoot, or trains a tiny AI and tests it on
            points it has never seen. Feedback explains what happened and why, then a short takeaway and a real-world example connect the idea to
            robots working today.
          </p>
          <p className="mt-3">
            Activities come in four age bands —{' '}
            {KIDS_BANDS.map((b, i) => (
              <span key={b.id}>
                {b.name} ({b.ages}){i < KIDS_BANDS.length - 2 ? ', ' : i === KIDS_BANDS.length - 2 ? ' and ' : ''}
              </span>
            ))}{' '}
            — and the galaxy shows a child their own band and the bands either side, so nothing is too babyish or out of reach. Stars are earned by
            effort: solving on the first try earns three, and a child who keeps going still earns one. Progress stays on the device; no account or
            personal data is needed.
          </p>

          <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">The ten skill tracks</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {TRACKS.map((t) => (
              <li key={t.id} className="rounded-[20px] border border-white/[0.08] bg-[#111C32] p-4">
                <h3 className="font-display text-lg font-bold text-[#EEF2F8]">
                  <Link href={`/kids/galaxy/${t.id}`} className="inline-flex min-h-[44px] items-center gap-1 rounded hover:text-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
                    <span aria-hidden>{t.icon}</span> {t.name}
                  </Link>{' '}
                  <span className="text-sm font-semibold text-[#6E7888]">· {counts.get(t.id)} missions</span>
                </h3>
                <p className="mt-1 text-[15px]">{TRACK_COPY[t.id].about}</p>
              </li>
            ))}
          </ul>
          <p className="mt-8">
            Looking for longer adventures? Try the{' '}
            <Link href="/kids/code-lab" className="font-semibold text-amber-300 underline-offset-4 hover:underline">
              Code Lab
            </Link>{' '}
            or build your own robot in the{' '}
            <Link href="/kids/workshop" className="font-semibold text-amber-300 underline-offset-4 hover:underline">
              Workshop
            </Link>
            .
          </p>
        </article>
      </main>
    </>
  )
}
