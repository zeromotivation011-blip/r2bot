// app/kids/worlds/page.tsx — the seven Universe worlds (server component, indexable).
//
// One card per world in WORLDS: what it is about, its flagship game, how many
// Skill Galaxy activities it holds and, after hydration, how far this child has
// got (a small client island per card that reads the device's own progress).
// Everything a parent, teacher or search engine needs is server HTML.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import { byWorld } from '@/lib/kids/activities/content'
import { getBand } from '@/lib/kids/bands'
import { getGame, WORLDS } from '@/lib/kids/universe/worlds'
import { WorldProgressBar } from '@/components/kids/universe/WorldProgressClient'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/worlds`

const TITLE = 'Robot Worlds for Kids: Ocean, Space, City, Farm and More'
const DESCRIPTION =
  'Seven robotics worlds for ages 5–17: underwater robots, space station arms, self-driving cars, farm robots, hospital robots, animal-inspired robots and robot safety. Each has a four-tier game and hands-on activities.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'R2BOT Kids worlds — where robots really work',
    description: DESCRIPTION,
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids worlds' }],
  },
}

const worlds = WORLDS.map((w) => {
  const game = getGame(w.game)
  const ids = byWorld(w.id).map((a) => a.id)
  return { world: w, game, ids, band: game ? getBand(game.minBand) : undefined }
})

const totalActivities = worlds.reduce((n, w) => n + w.ids.length, 0)

const listLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'R2BOT Kids worlds',
  itemListElement: worlds.map(({ world }, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    url: `${BASE}/kids/worlds/${world.id}`,
    name: world.name,
  })),
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Worlds', path: '/kids/worlds' },
])

export default function KidsWorldsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(listLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />

      <section className="relative mx-auto max-w-6xl px-4 pb-4 pt-6 sm:pt-10" aria-labelledby="worlds-h">
        <div aria-hidden className="pointer-events-none absolute -top-10 right-0 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(0,184,212,.16),transparent)]" />
        <p className="text-[13px] font-bold uppercase tracking-[.14em] text-amber-300">R2BOT Kids · Worlds</p>
        <h1 id="worlds-h" className="mt-1 font-display text-3xl font-bold leading-tight text-[#EEF2F8] sm:text-[44px]">
          Seven worlds where <span className="text-amber-500">robots really work</span>
        </h1>
        <p className="mt-3 max-w-3xl text-[17px] leading-relaxed text-[#A7B0C0]">
          Dive with an underwater robot, catch a cargo ship with a space station&apos;s arm, keep a city of self-driving cars safe or grow food
          with sensors and drones. Every world has a flagship game with four tiers — Cadet, Pilot, Ace and Legend — and{' '}
          {totalActivities} hands-on activities between them, written for every age from 5 to 17.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6" aria-label="The worlds">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {worlds.map(({ world, game, ids, band }) => (
            <li key={world.id}>
              <Link
                href={`/kids/worlds/${world.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#111C32] shadow-[0_8px_24px_rgba(0,0,0,.45)] transition hover:-translate-y-0.5 hover:border-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <div className={`relative flex h-32 items-center gap-4 overflow-hidden bg-gradient-to-br ${world.gradient} px-5`}>
                  <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/25 to-transparent" />
                  <span aria-hidden className="pointer-events-none absolute -bottom-12 -right-8 h-36 w-36 rounded-full bg-[#0A1120]/35 blur-xl" />
                  <span
                    aria-hidden
                    className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full bg-[#0A1120]/35 text-5xl shadow-[inset_-6px_-8px_14px_rgba(0,0,0,.35)] ring-4 ring-white/15 transition duration-200 group-hover:scale-105 motion-reduce:transition-none"
                  >
                    {world.emoji}
                  </span>
                  <div className="relative min-w-0">
                    <h2 className="font-display text-2xl font-bold leading-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,.45)]">
                      {world.name}
                    </h2>
                    <p className="mt-0.5 text-[15px] font-semibold text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,.45)]">{world.tagline}</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-[15px] leading-snug text-[#A7B0C0]">{world.teaches}</p>
                  {game && (
                    <p className="mt-3 rounded-2xl bg-white/[0.04] px-3 py-2 text-[14px] text-[#EEF2F8]">
                      <span className="font-bold text-cyan-300">Game:</span> {game.emoji} {game.name}
                      {band && <span className="text-[#A7B0C0]"> · from age {band.ages.split('–')[0]}</span>}
                    </p>
                  )}
                  <div className="mt-auto">
                    <WorldProgressBar ids={ids} gameId={world.game} worldName={world.name} />
                    <span className="mt-4 inline-flex min-h-[44px] items-center font-display text-[16px] font-bold text-amber-300 group-hover:underline">
                      Visit {world.name} →
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <article className="mx-auto max-w-4xl space-y-8 px-4 pb-16 pt-8 text-[17px] leading-relaxed text-[#A7B0C0]">
        <section aria-labelledby="how-h">
          <h2 id="how-h" className="font-display text-2xl font-bold text-[#EEF2F8]">How the worlds work</h2>
          <p className="mt-2">
            The course planets teach the core ideas of robotics in order: moving, sensing, deciding, controlling. The worlds show where those ideas
            go to work. Each one is a real place robots are used today — the deep sea, orbit, hospitals, farms, city streets — plus Robot
            Guardians, which is about keeping every robot safe, fair and kind.
          </p>
          <p className="mt-2">
            On a world&apos;s page you will find what the robots there really do, a few facts worth remembering, the flagship game and every
            activity for that world, sorted by age band. Activities are short — a few minutes each — and the game grows from Cadet to Legend, so
            younger and older children can explore the same world together.
          </p>
        </section>
        <section aria-labelledby="fair-h">
          <h2 id="fair-h" className="font-display text-2xl font-bold text-[#EEF2F8]">Progress stays on this device</h2>
          <p className="mt-2">
            Children need no account and give no personal details. The bars above show how many of a world&apos;s activities have been finished on
            this device and whether its game has been played. There are no leaderboards: the only comparison is with your own personal best,
            which you can see in the{' '}
            <Link href="/kids/hangar" className="font-semibold text-amber-300 underline-offset-4 hover:underline">
              Hangar
            </Link>
            .
          </p>
        </section>
        <p className="flex flex-wrap gap-x-6">
          <Link href="/kids" className="inline-flex min-h-[44px] items-center font-bold text-amber-300 underline-offset-4 hover:underline">
            ← Back to the Universe
          </Link>
          <Link href="/kids/play" className="inline-flex min-h-[44px] items-center font-bold text-amber-300 underline-offset-4 hover:underline">
            All games →
          </Link>
        </p>
      </article>
    </>
  )
}
