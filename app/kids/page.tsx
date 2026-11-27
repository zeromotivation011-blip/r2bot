// app/kids/page.tsx — the R2BOT Universe home (server component).
//
// The hero is the Universe map: four course planets (one per age band), the
// game moons, the Hangar and the Worlds belt, with the child's explorer card and "continue your
// mission" — one client island (KidsHubClient) that server-renders every link
// and label, then fills in the child's progress. Everything below it is plain
// server HTML for parents, teachers and search engines: what R2BOT Kids is,
// the four levels and what each one teaches, the seven worlds, every game and
// the real robotics behind it, schools and parents, the app, and the FAQ.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript } from '@/lib/seo/jsonld'
import { KIDS_BANDS } from '@/lib/kids/bands'
import { GAMES, PLANETS, WORLDS, getGame, numberWord } from '@/lib/kids/universe/worlds'
import { LEVELS } from '@/lib/kids/curriculum/levels'
import { LEVEL1_SESSIONS } from '@/lib/kids/curriculum/level1'
import { LEVEL2_SESSIONS } from '@/lib/kids/curriculum/level2'
import { LEVEL3_SESSIONS } from '@/lib/kids/curriculum/level3'
import { LEVEL4_SESSIONS } from '@/lib/kids/curriculum/level4'
import type { LevelNumber } from '@/lib/kids/curriculum/types'
import { InstallAppClient } from '@/components/kids/InstallAppClient'
import type { SessionTitles } from '@/components/kids/universe/ContinueCardClient'
import { KidsHubClient } from './KidsHubClient'
import { KIDS_MORE } from '@/lib/kids/nav'
import { ALL_ACTIVITIES } from '@/lib/kids/activities/content'
import { TRACKS } from '@/lib/kids/activities/types'
import { ClassMissionsClient } from '@/components/kids/classroom/ClassMissionsClient'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'

const TITLE = 'R2BOT Kids: Explore the Robot Universe (Ages 5–17)'
/** Counts come from the data, so the copy never goes stale when a game or world is added. */
const GAMES_WORD = numberWord(GAMES.length)
const WORLDS_WORD = numberWord(WORLDS.length)
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1)

const DESCRIPTION = `A robotics universe for ages 5–17: a story-led course, ${GAMES_WORD} real-physics robot games, ${WORLDS_WORD} worlds from the deep sea to orbit, 400+ hands-on activities, a 3D robot to build and code, and a Hangar of badges. For homes and schools.`

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'robotics for kids',
    'robotics course for children',
    'kids coding robot game',
    'robot games for kids',
    'build a robot online for kids',
    'robotics curriculum for schools',
    'block coding for kids',
    'STEM robotics',
  ],
  alternates: { canonical: `${BASE}/kids` },
  openGraph: {
    type: 'website',
    url: `${BASE}/kids`,
    siteName: 'R2BOT',
    title: 'R2BOT Kids — explore the Robot Universe',
    description: `Four course planets, ${WORLDS_WORD} worlds, ${GAMES_WORD} real-physics robot games and your own robot to build and code. Ages 5–17.`,
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids' }],
  },
}

// The secondary surfaces, from the same list as the shell's More menu.
const MORE_WAYS = KIDS_MORE

const FAQ: { q: string; a: string }[] = [
  {
    q: 'What ages is R2BOT Kids for?',
    a: 'Ages 5 to 17, in four bands that follow school grades: Explorers (5–7), Builders (8–10), Inventors (11–13) and Engineers (14–17). Each band has its own planet and course, and every game has four difficulty tiers — Cadet, Pilot, Ace and Legend — so a seven-year-old and a sixteen-year-old both find a real challenge in the same game.',
  },
  {
    q: 'What is the R2BOT Universe?',
    a: `It is the map your child explores. Four planets hold the course — one 24-session story season per age band — and eight moons hold standalone games about drones, robot arms, circuits, Mars rovers, machine learning, mapping, swarms and robot sumo. Along the edge sit ${WORLDS_WORD} worlds where robots really work — the deep sea, a space station, a hospital, a farm, a city, a robot zoo and Robot Guardians, about robot safety — each with its own game and activities. The Hangar in the middle keeps their robot, avatar and badges.`,
  },
  {
    q: 'Are the games really teaching robotics?',
    a: 'Yes. Every game runs on the real idea underneath it: a drone that is held steady by a PID controller, an arm moved by forward and inverse kinematics, circuits that obey Ohm’s law, a rover that has to plan around a radio delay, a robot brain trained on the child’s own examples. Each game page explains the real-world robotics in plain words.',
  },
  {
    q: 'Does my child need a robot kit?',
    a: 'No. Everything runs in a web browser on a phone, tablet, laptop or classroom smartboard. Robots are built and tested in simulation; the Make at Home activities use paper and household things.',
  },
  {
    q: 'Do children need an account or an email address?',
    a: 'No. Progress, stars, badges and experience points are saved on the device. A child picks an explorer nickname — never a real full name — and if a teacher sets up a class, children join with a class code and that nickname only. No email, password, phone number or birthday, ever.',
  },
  {
    q: 'How are children rewarded?',
    a: 'For learning and effort, never for time spent. Finishing sessions and game rounds earns experience points, levels, badges and new colours and parts for their robot. Children see their own personal bests and how many days they explored this week. There are no leaderboards and no streaks that punish a missed day.',
  },
  {
    q: 'Can schools use it?',
    a: 'Yes. Teachers create a class in a minute, print a join card and follow every child’s progress on one dashboard, with a suggested plan for each age band and no lab or kits needed.',
  },
]

const appJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'R2BOT Kids',
  applicationCategory: 'EducationalApplication',
  applicationSubCategory: 'Robotics education game',
  operatingSystem: 'Any (web browser; installable)',
  description: DESCRIPTION,
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children aged 5 to 17' },
  isAccessibleForFree: true,
  inLanguage: 'en',
  url: `${BASE}/kids`,
  hasPart: GAMES.map((g) => ({
    '@type': 'VideoGame',
    name: g.name,
    description: `${g.hook} Teaches: ${g.teaches}`,
    url: `${BASE}/kids/play/${g.id}`,
  })),
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
}

/** "400+": rounded down to the hundred so the copy never overclaims as activities are added. */
const ACTIVITY_COUNT_LABEL = `${Math.floor(ALL_ACTIVITIES.length / 100) * 100}+`

const SESSION_TITLES: SessionTitles = Object.fromEntries(LEVELS.map((l) => [l.number, l.sessions.map((s) => s.title)]))

/**
 * Sessions written in full, per level (all four since Wave 2). A level whose
 * sessions are not all written shows as arriving soon.
 * Server-only: none of this reaches the client bundle, only the level numbers.
 */
const WRITTEN_SESSIONS: Partial<Record<LevelNumber, readonly { number: number }[]>> = { 1: LEVEL1_SESSIONS, 2: LEVEL2_SESSIONS, 3: LEVEL3_SESSIONS, 4: LEVEL4_SESSIONS }

/** A level is playable when every session in its outline has been written. */
const PLAYABLE_LEVELS: number[] = LEVELS.filter((l) => {
  const written = new Set((WRITTEN_SESSIONS[l.number] ?? []).map((s) => s.number))
  return l.sessions.length > 0 && l.sessions.every((s) => written.has(s.number))
}).map((l) => l.number)

export default function KidsHubPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(appJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(faqJsonLd) }} />

      {/* ── Hero: the Universe ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-6 pt-5 sm:pt-8" aria-labelledby="universe-h">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[.14em] text-amber-300">R2BOT Kids · ages 5–17</p>
            <h1 id="universe-h" className="mt-1 font-display text-3xl font-bold leading-tight tracking-tight text-[#EEF2F8] sm:text-[44px]">
              Explore the <span className="text-amber-500">Robot Universe</span>
            </h1>
          </div>
          <p className="hidden max-w-md text-[17px] text-[#A7B0C0] sm:block">
            Fly to a planet to start your course, land on a moon to play, or visit a world where robots really work.
          </p>
        </div>
        {/* Renders nothing unless this device joined a class that has missions. */}
        <ClassMissionsClient className="mb-4" />
        <KidsHubClient sessionTitles={SESSION_TITLES} playableLevels={PLAYABLE_LEVELS} />
      </section>

      {/* ── What it is ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="what-h">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 id="what-h" className="font-display text-2xl font-bold text-[#EEF2F8] sm:text-3xl">
              A whole universe of robotics, from first steps to real engineering
            </h2>
            <p className="mt-3 text-[17px] leading-relaxed text-[#A7B0C0]">
              R2BOT Kids teaches robotics the way engineers actually do it: sense, think, act — then test, fix and try
              again. Children build one robot and keep upgrading it, follow a story season on their own planet, and
              play games that run on the real science underneath: feedback control, kinematics, electric circuits,
              planning, mapping and machine learning.
            </p>
            <p className="mt-3 text-[17px] leading-relaxed text-[#A7B0C0]">
              It works in any web browser on a phone, tablet, laptop or classroom board, with no kit and no account.
              Progress stays on the device. Children are rewarded for learning and effort — experience points, levels,
              badges and new parts for their robot — and only ever compared with their own personal best.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: '🪐', t: 'Four course planets', d: 'A 24-session story season for each age band, every session ending in a build, a coding challenge and a short check.' },
              { icon: '🎮', t: `${cap(GAMES_WORD)} real games`, d: 'Drones, robot arms, circuits, rovers, robot brains, mazes, swarms, sumo and one for every world — each with Cadet to Legend tiers.' },
              { icon: '🧭', t: `${cap(WORLDS_WORD)} worlds`, d: 'The deep sea, a space station, a hospital, a farm, a city, a robot zoo and Robot Guardians: where robots really work.' },
              { icon: '🌌', t: `${ACTIVITY_COUNT_LABEL} activities`, d: 'The Skill Galaxy: ten tracks of short, hands-on missions — tune, wire, sort, program — at four age levels.' },
              { icon: '🏫', t: 'Ready for classrooms', d: 'Teachers assign sessions and activities to a class; children join with a code and a nickname, nothing more.' },
              { icon: '🤖', t: 'One robot, always yours', d: 'Built part by part in 3D. A robot without a distance sensor really cannot see the wall.' },
              { icon: '🏅', t: 'Rewards for learning', d: 'Badges say what the child can now do. No leaderboards, no punishing streaks.' },
            ].map((f) => (
              <li key={f.t} className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4">
                <span className="text-2xl" aria-hidden>
                  {f.icon}
                </span>
                <h3 className="mt-1 font-display text-lg font-bold text-[#EEF2F8]">{f.t}</h3>
                <p className="mt-1 text-[15px] text-[#A7B0C0]">{f.d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── The four levels ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="levels-h">
        <h2 id="levels-h" className="font-display text-2xl font-bold text-[#EEF2F8] sm:text-3xl">
          Four planets, four levels — one robotics journey
        </h2>
        <p className="mt-2 max-w-2xl text-[17px] text-[#A7B0C0]">
          Each level follows school grades and builds on the last. The ideas are the ones real robotics engineers use,
          explained with things children already know. Every child can visit every planet.
        </p>
        <ol className="mt-6 grid gap-4 md:grid-cols-2">
          {PLANETS.map((pl) => {
            const b = KIDS_BANDS.find((x) => x.id === pl.band)
            const lv = LEVELS.find((l) => l.number === pl.level)
            if (!b) return null
            return (
              <li key={pl.id}>
                <Link
                  href={`/kids/course/${pl.level}`}
                  className="group flex h-full gap-4 rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] transition hover:-translate-y-0.5 hover:border-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                >
                  <span
                    className={`grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br ${pl.gradient} text-3xl shadow-[inset_-6px_-8px_14px_rgba(0,0,0,.45)]`}
                    aria-hidden
                  >
                    {pl.emoji}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold uppercase tracking-wide text-amber-300">
                      Level {pl.level} · {b.name} · ages {b.ages}
                    </span>
                    <span className="mt-0.5 block font-display text-xl font-bold text-[#EEF2F8]">{pl.name}</span>
                    <span className="block text-[13px] font-semibold text-[#6E7888]">{b.grades}</span>
                    {lv && (
                      <span className="mt-2 block text-[15px] text-[#EEF2F8]">
                        Season: <em className="not-italic font-semibold">{lv.season.title}</em> — {lv.sessions.length} sessions.
                      </span>
                    )}
                    <span className="mt-1 block text-[15px] text-[#A7B0C0]">
                      <strong className="font-semibold text-[#EEF2F8]">By the end:</strong> {b.outcome}
                    </span>
                    <span className="mt-3 inline-block text-[15px] font-bold text-amber-300 group-hover:underline">Visit {pl.name} →</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      </section>

      {/* ── The Skill Galaxy ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="galaxy-h">
        <h2 id="galaxy-h" className="font-display text-2xl font-bold text-[#EEF2F8] sm:text-3xl">
          The Skill Galaxy: {ACTIVITY_COUNT_LABEL} hands-on robotics activities
        </h2>
        <p className="mt-2 max-w-3xl text-[17px] text-[#A7B0C0]">
          Short missions, each a few minutes long, grouped into ten tracks. Every one is something to do — balance a
          lever, tune a controller, wire a circuit, sort data for a robot brain, plan a rover&apos;s path — written for
          one of the four age bands, with a hint and an explanation of the real robotics afterwards. Course sessions
          point to the activities that practise them, and teachers can assign them to a class.
        </p>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {TRACKS.map((t) => (
            <li key={t.id}>
              <Link
                href={`/kids/galaxy/${t.id}`}
                className="flex h-full min-h-[48px] flex-col rounded-[20px] border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
              >
                <span className="text-2xl" aria-hidden>{t.icon}</span>
                <span className="mt-1 font-display font-bold text-[#EEF2F8]">{t.name}</span>
                <span className="text-[14px] text-[#A7B0C0]">{t.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4">
          <Link href="/kids/galaxy" className="inline-flex min-h-[44px] items-center font-bold text-amber-300 underline-offset-4 hover:underline">
            Open the Skill Galaxy →
          </Link>
        </p>
      </section>

      {/* ── The worlds ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="worlds-h">
        <h2 id="worlds-h" className="font-display text-2xl font-bold text-[#EEF2F8] sm:text-3xl">
          {cap(WORLDS_WORD)} worlds where robots really work
        </h2>
        <p className="mt-2 max-w-3xl text-[17px] text-[#A7B0C0]">
          The course teaches the ideas; the worlds show them at work. Each world is a real place robots are used today, with its own
          four-tier game and activities for every age band.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {WORLDS.map((w) => {
            const g = getGame(w.game)
            return (
              <li key={w.id}>
                <Link
                  href={`/kids/worlds/${w.id}`}
                  className="group flex h-full min-h-[48px] items-start gap-3 rounded-[20px] border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                >
                  <span
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br ${w.gradient} text-2xl shadow-[inset_-4px_-6px_10px_rgba(0,0,0,.4)]`}
                    aria-hidden
                  >
                    {w.emoji}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display font-bold text-[#EEF2F8]">{w.name}</span>
                    <span className="block text-[14px] text-[#A7B0C0]">{w.tagline}</span>
                    {g && <span className="mt-1 block text-[13px] font-semibold text-cyan-300">Game: {g.name}</span>}
                  </span>
                </Link>
              </li>
            )
          })}
          <li>
            <Link
              href="/kids/worlds"
              className="flex h-full min-h-[48px] items-center justify-center rounded-[20px] border border-dashed border-amber-400/40 p-4 font-display font-bold text-amber-300 transition hover:border-amber-300 hover:bg-amber-500/[0.06] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            >
              All worlds →
            </Link>
          </li>
        </ul>
      </section>

      {/* ── The games ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="games-h">
        <h2 id="games-h" className="font-display text-2xl font-bold text-[#EEF2F8] sm:text-3xl">
          {cap(GAMES_WORD)} games with real robotics inside
        </h2>
        <p className="mt-2 max-w-2xl text-[17px] text-[#A7B0C0]">
          No tap-the-right-answer busywork. Each game runs on a real system, and each has four tiers — Cadet, Pilot, Ace
          and Legend — so it grows with your child.
        </p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GAMES.map((g) => {
            const b = KIDS_BANDS.find((x) => x.id === g.minBand)
            return (
              <li key={g.id}>
                <Link
                  href={`/kids/play/${g.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#111C32] shadow-[0_8px_24px_rgba(0,0,0,.45)] transition hover:-translate-y-0.5 hover:border-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                >
                  <span className={`flex h-20 items-center justify-between bg-gradient-to-br ${g.gradient} px-4`}>
                    <span className="text-4xl drop-shadow" aria-hidden>
                      {g.emoji}
                    </span>
                    <span className="rounded-full bg-[#0A1120]/70 px-2 py-0.5 text-[12px] font-bold text-[#EEF2F8]">{g.zone}</span>
                  </span>
                  <span className="flex flex-1 flex-col p-4">
                    <span className="font-display text-lg font-bold leading-snug text-[#EEF2F8]">{g.name}</span>
                    <span className="mt-1 text-[15px] text-[#EEF2F8]/90">{g.hook}</span>
                    <span className="mt-2 text-[14px] text-[#A7B0C0]">
                      <strong className="font-semibold text-[#EEF2F8]">Teaches:</strong> {g.teaches}
                    </span>
                    {b && (
                      <span className="mt-auto pt-3 text-[13px] font-semibold text-cyan-300">
                        Recommended from {b.name} ({b.ages}) · {g.tiers} tiers
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      {/* ── More ways to play ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-8" aria-labelledby="more-h">
        <h2 id="more-h" className="font-display text-xl font-bold text-[#EEF2F8] sm:text-2xl">
          More ways to play
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MORE_WAYS.map((m) => (
            <li key={m.href}>
              <Link
                href={m.href}
                className="flex h-full min-h-[48px] items-start gap-3 rounded-[20px] border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
              >
                <span className="text-2xl" aria-hidden>
                  {m.emoji}
                </span>
                <span>
                  <span className="block font-display font-bold text-[#EEF2F8]">{m.label}</span>
                  <span className="block text-[14px] text-[#A7B0C0]">{m.line}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Schools, parents, class code ───────────────────────────────────── */}
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 md:grid-cols-3" aria-label="For schools and parents">
        <Link
          href="/kids/schools"
          className="rounded-[28px] border border-amber-400/40 bg-gradient-to-br from-amber-500/15 to-transparent p-6 transition hover:border-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 md:col-span-2"
        >
          <p className="text-sm font-bold uppercase tracking-wider text-amber-300">For schools</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-[#EEF2F8]">Run a robotics class with no lab and no kits</h2>
          <p className="mt-2 text-[#A7B0C0]">
            Create a class in a minute, print a join card, and follow every child’s sessions, games and robots on one
            dashboard — with a plan for each age band.
          </p>
          <span className="mt-4 inline-block font-bold text-amber-300">See how schools use it →</span>
        </Link>
        <div className="grid gap-4">
          <Link
            href="/kids/join"
            className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            <h2 className="font-display text-lg font-bold text-[#EEF2F8]">🎟️ Got a class code?</h2>
            <p className="mt-1 text-[15px] text-[#A7B0C0]">Join your teacher’s class with just a nickname.</p>
          </Link>
          <Link
            href="/kids/parents"
            className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            <h2 className="font-display text-lg font-bold text-[#EEF2F8]">👪 For parents</h2>
            <p className="mt-1 text-[15px] text-[#A7B0C0]">What your child learns, screen-time tips and how progress works.</p>
          </Link>
        </div>
      </section>

      {/* ── App install ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col items-start gap-4 rounded-[28px] border border-white/10 bg-[#111C32] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kids-icon.svg" alt="" width={56} height={56} className="h-14 w-14 rounded-2xl" />
            <div>
              <h2 className="font-display text-xl font-bold text-[#EEF2F8]">Put R2BOT Kids on your home screen</h2>
              <p className="mt-1 text-[15px] text-[#A7B0C0]">
                It opens full-screen like an app, remembers your explorer, and keeps working on a weak connection.
              </p>
            </div>
          </div>
          <InstallAppClient />
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 pb-24 pt-10" aria-labelledby="faq-h">
        <h2 id="faq-h" className="font-display text-2xl font-bold text-[#EEF2F8]">
          Questions parents and teachers ask
        </h2>
        <dl className="mt-4 divide-y divide-white/10">
          {FAQ.map((f) => (
            <div key={f.q} className="py-4">
              <dt className="font-display text-lg font-bold text-[#EEF2F8]">{f.q}</dt>
              <dd className="mt-1 text-[16px] leading-relaxed text-[#A7B0C0]">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  )
}
