// app/kids/play/page.tsx — the Games tab: every Universe game in one place.
//
// Server-rendered and indexable: the cards are plain links, and the text under
// them explains the tiers, the rewards and what each game really teaches, for
// parents, teachers and search engines. The games themselves live at
// /kids/play/<id> (one page each, registry in lib/kids/universe/worlds.ts).

import type { Metadata } from 'next'
import Link from 'next/link'
import { GrownUpLink } from '@/components/kids/app/GrownUpLinkClient'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import { GAMES, numberWord } from '@/lib/kids/universe/worlds'
import { TIER_NAMES } from '@/lib/kids/universe/tiers'
import { KIDS_BANDS } from '@/lib/kids/bands'

const BASE = 'https://www.r2bot.in'
/** From the data, so the count never goes stale. */
const GAMES_WORD_CAP = ((w: string) => w.charAt(0).toUpperCase() + w.slice(1))(numberWord(GAMES.length))
const URL = `${BASE}/kids/play`

export const metadata: Metadata = {
  title: `Robot Games for Kids: ${GAMES.length} Real-Physics Robotics Games (Ages 5–17)`,
  description:
    `${GAMES_WORD_CAP} free robotics games for ages 5–17 that run on real science: tune a drone’s PID controller, program a sumo robot, steer a Mars rover through radio delay, pilot an underwater robot, catch a spacecraft with a robot arm and more.`,
  alternates: { canonical: URL },
  openGraph: {
    type: 'website',
    url: URL,
    siteName: 'R2BOT',
    title: 'R2BOT Kids games — real robotics inside every game',
    description: 'Drones, robot arms, circuits, rovers, robot brains, mazes, swarms, sumo, and games for the ocean, space, city, farm, hospital, zoo and robot safety worlds. Four tiers each, Cadet to Legend.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids games' }],
  },
}

const listJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'R2BOT Kids robotics games',
  itemListElement: GAMES.map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: `${BASE}/kids/play/${g.id}`, name: g.name })),
}

const TIER_WHO: Record<(typeof TIER_NAMES)[number], string> = {
  Cadet: 'learn the controls and the idea, with generous help',
  Pilot: 'the real challenge for most players, with fewer hints',
  Ace: 'tighter limits: the system has to be tuned, not guessed',
  Legend: 'engineering-level: noise, delay and hard constraints',
}

export default function KidsGamesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(listJsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonldScript(breadcrumbJsonLD([
            { name: 'R2BOT Kids', path: '/kids' },
            { name: 'Games', path: '/kids/play' },
          ])),
        }}
      />
      <section className="mx-auto max-w-6xl px-4 pb-6 pt-6 sm:pt-10" aria-labelledby="games-h">
        <p className="text-[13px] font-bold uppercase tracking-[.14em] text-amber-300">R2BOT Kids · Games</p>
        <h1 id="games-h" className="mt-1 font-display text-3xl font-bold text-[#EEF2F8] sm:text-4xl">
          {GAMES_WORD_CAP} robot games with real robotics inside
        </h1>
        <p className="mt-3 max-w-3xl text-[17px] leading-relaxed text-[#A7B0C0]">
          Pick a game. Every one runs on a real system — physics, feedback control, kinematics, circuits, planning or
          machine learning — so what works in the game is what works on a real robot. Each has four tiers, from Cadet to
          Legend, so a seven-year-old and a sixteen-year-old both find their edge.
        </p>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GAMES.map((g) => {
            const b = KIDS_BANDS.find((x) => x.id === g.minBand)
            return (
              <li key={g.id}>
                <Link
                  href={`/kids/play/${g.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#111C32] shadow-[0_8px_24px_rgba(0,0,0,.45)] transition hover:-translate-y-0.5 hover:border-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <span className={`flex h-24 items-center justify-between bg-gradient-to-br ${g.gradient} px-4`}>
                    <span className="text-5xl drop-shadow" aria-hidden>{g.emoji}</span>
                    <span className="rounded-full bg-[#0A1120]/70 px-3 py-1 text-[12px] font-bold text-white">{g.zone}</span>
                  </span>
                  <span className="flex flex-1 flex-col p-4">
                    <span className="font-display text-lg font-bold text-[#EEF2F8]">{g.name}</span>
                    <span className="mt-1 text-[15px] text-[#A7B0C0]">{g.hook}</span>
                    {b && <span className="mt-2 text-[13px] font-semibold text-[#6E7888]">From age {b.ages.split('–')[0]} · {g.tiers} tiers</span>}
                    <span className="mt-auto pt-3 text-[15px] font-bold text-amber-300 group-hover:underline">Play →</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      <article className="mx-auto max-w-4xl space-y-8 px-4 pb-16 pt-6 text-[17px] leading-relaxed text-[#A7B0C0]">
        <section aria-labelledby="real-h">
          <h2 id="real-h" className="font-display text-2xl font-bold text-[#EEF2F8]">What each game really teaches</h2>
          <p className="mt-2">
            These are not quizzes dressed up as games. Under each one is the same idea a robotics engineer works with,
            explained on the game&apos;s own page in plain words.
          </p>
          <dl className="mt-4 space-y-3">
            {GAMES.map((g) => (
              <div key={g.id} className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <dt className="font-display font-bold text-[#EEF2F8]">
                  <Link href={`/kids/play/${g.id}`} className="inline-flex min-h-[44px] items-center underline-offset-4 hover:underline">{g.emoji} {g.name}</Link>
                </dt>
                <dd className="mt-1 text-[15px]">{g.teaches}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="tiers-h">
          <h2 id="tiers-h" className="font-display text-2xl font-bold text-[#EEF2F8]">Four tiers: Cadet, Pilot, Ace, Legend</h2>
          <p className="mt-2">
            Every game uses the same four tiers, so a child always knows where they are. Start anywhere; the game
            remembers each tier&apos;s best result on this device.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6">
            {TIER_NAMES.map((t) => (
              <li key={t}><strong className="text-[#EEF2F8]">{t}</strong> — {TIER_WHO[t]}.</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="fair-h">
          <h2 id="fair-h" className="font-display text-2xl font-bold text-[#EEF2F8]">Fair scoring, personal bests, no leaderboards</h2>
          <p className="mt-2">
            Rounds that score are deterministic: the same plan gives the same result, so a star is earned, not lucky.
            Stars, experience points and badges go to the child&apos;s own Hangar, and the only comparison is with
            their own personal best. There are no leaderboards, no timers that reward rushing and no streaks that punish
            a missed day. Nothing is bought, and no game asks for a name or an email.
          </p>
        </section>

        <section aria-labelledby="class-h">
          <h2 id="class-h" className="font-display text-2xl font-bold text-[#EEF2F8]">Using the games in class</h2>
          <p className="mt-2">
            Each game works on a phone, tablet, laptop or classroom board, with touch or a keyboard. Teachers can share
            any game to Google Classroom from its page; the{' '}
            <GrownUpLink href="/kids/teach" grant className="font-bold text-amber-300 underline-offset-4 hover:underline">teacher hub</GrownUpLink>{' '}
            has session guides and a short training course.
            For a guided path, the{' '}
            <Link href="/kids/course" className="font-bold text-amber-300 underline-offset-4 hover:underline">course</Link>{' '}
            and the{' '}
            <Link href="/kids/galaxy" className="font-bold text-amber-300 underline-offset-4 hover:underline">Skill Galaxy</Link>{' '}
            cover the same ideas step by step.
          </p>
        </section>
      </article>
    </>
  )
}
