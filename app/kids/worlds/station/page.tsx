// app/kids/worlds/station/page.tsx — the Space Station world (server component)
// Indexable. Space robotics: zero-gravity motion, robot arms that capture
// cargo ships, free-flying helpers, satellite servicing and teleoperation with
// delay. Server-rendered hero, flagship game card, teaching text, what each age
// band learns and every activity link; client islands add progress and the
// world-complete card.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import { byWorld } from '@/lib/kids/activities/content'
import { KIDS_BANDS } from '@/lib/kids/bands'
import { getGame, getWorld } from '@/lib/kids/universe/worlds'
import { TIER_NAMES } from '@/lib/kids/universe/tiers'
import { StationActivities, StationProgressCard, type StationBand } from '@/components/kids/worlds/station/StationWorldClient'

export const runtime = 'nodejs'

const PAGE_URL = 'https://www.r2bot.in/kids/worlds/station'
const TITLE = 'Space Station: Space Robotics for Kids — Robot Arms, Zero Gravity and Satellite Repair'
const DESCRIPTION =
  'A robotics world for kids 5–17 about robots in orbit. Learn why things keep drifting in zero gravity, how a station’s robot arm catches cargo ships, how satellites are serviced and how to steer a robot through a signal delay — with a space repair game and 24 hands-on activities.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Space Station — robot arms working in orbit',
    description: DESCRIPTION,
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids Space Station world' }],
  },
}

const world = getWorld('station')!
const game = getGame(world.game)!
const activities = byWorld('station')

const BAND_LEARN: Record<string, string> = {
  explorers: 'Meet the robots of the station, find out what floats and why, see that every push sends you the other way, program a helper robot and learn to stop by puffing backwards.',
  builders: 'Get to know the whole orbit robot team, work out how far a drifting robot goes, trace a coast-and-brake program, plan a quiet route, dock gently with P control and write an inspection loop.',
  inventors: 'Decide when a robot can be steered live and when it needs a plan, calculate recoil with momentum, read the safe capture window, add D to stop a frictionless swing, build a capture checklist and weigh debris against repairs.',
  engineers: 'Work out the fuel cost of matching a tumble, trace what signal delay does to a stop command, beat a leaky thruster with PID, plan an approach with A*, order abort checks and decide how much a robot may do alone.',
}

const bands: StationBand[] = KIDS_BANDS.map((b) => ({
  id: b.id,
  name: b.name,
  ages: b.ages,
  learn: BAND_LEARN[b.id] ?? '',
  items: activities.filter((a) => a.band === b.id).map((a) => ({ id: a.id, title: a.title, track: a.track, difficulty: a.difficulty, template: a.template })),
}))

const GAME_TIERS = ['Fly a helper robot with thruster puffs', 'Catch a drifting cargo ship with the arm', 'Swap a module without twisting the spacecraft', 'Service a tumbling satellite with signal delay']

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Space Station — space robotics for kids',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive activities and game',
  educationalLevel: 'Ages 5–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: [
    'Newton’s first law: in orbit, moving things keep moving',
    'Newton’s third law: thrusters, pushes and recoil',
    'Conservation of momentum',
    'Robot arm capture: match speed before grabbing',
    'Satellite servicing and space debris',
    'Teleoperation with signal delay, and robot autonomy',
  ],
  hasPart: [
    { '@type': 'LearningResource', name: game.name, url: 'https://www.r2bot.in/kids/play/orbit-repair' },
    ...activities.map((a) => ({ '@type': 'LearningResource', name: a.title, url: `https://www.r2bot.in/kids/galaxy/${a.track}/${a.id}` })),
  ],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Space Station', path: '/kids/worlds/station' },
])

const FACTS = [
  { big: 'Almost 0', small: 'friction: only a whisper of air slows a drifting robot inside' },
  { big: '≈ 90 min', small: 'for a low-orbit station to circle the Earth once' },
  { big: '2.6 s', small: 'for a signal to reach the Moon and back' },
]

export default function StationWorldPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(learningLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-3 pb-16 pt-3 sm:px-4">
        <nav aria-label="Breadcrumb">
          <Link
            href="/kids"
            className="inline-flex min-h-[44px] items-center rounded-xl border border-white/15 bg-white/5 px-3 font-bold text-[#EEF2F8] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            ← Universe
          </Link>
        </nav>

        {/* Hero, in the world's own gradient */}
        <header className={`relative overflow-hidden rounded-[28px] bg-gradient-to-b ${world.gradient} p-6 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-10`}>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/25 to-transparent" />
          {/* stars and the curve of the Earth */}
          <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 400 200">
            {[
              [30, 120], [80, 150], [140, 110], [210, 140], [260, 95], [330, 130], [370, 105], [55, 170], [300, 165], [180, 175],
            ].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill="#fff" opacity="0.7" />
            ))}
          </svg>
          <div aria-hidden className="pointer-events-none absolute -bottom-[340px] left-1/2 h-[420px] w-[140%] -translate-x-1/2 rounded-[50%] bg-gradient-to-b from-sky-400 via-blue-700 to-[#0A1120] shadow-[0_-12px_60px_rgba(56,189,248,.55)]" />
          <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#0A1120]/80">A world of the R2BOT Universe</p>
              <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-[#0A1120] sm:text-5xl">Space Station</h1>
              <p className="mt-2 max-w-xl text-xl font-semibold text-[#0A1120]">{world.tagline}</p>
              <p className="mt-3 max-w-xl rounded-2xl bg-[#0A1120]/55 p-3 text-[17px] leading-relaxed text-white backdrop-blur-sm">
                High above the Earth, everything floats and nothing slows down. Robot arms catch visiting ships, little robots drift around inside,
                and repair spacecraft fix satellites. Learn how they move, grab and steer — even when the signal is late.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/kids/play/orbit-repair"
                  className="inline-flex min-h-[52px] items-center rounded-2xl bg-amber-500 px-5 font-display text-lg font-bold text-[#1A1103] shadow-lg transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 motion-safe:active:scale-[.97]"
                >
                  ▶ Play Orbit Repair Crew
                </Link>
                <a
                  href="#activities"
                  className="inline-flex min-h-[52px] items-center rounded-2xl border-2 border-white/70 bg-[#0A1120]/45 px-5 font-display text-lg font-bold text-white transition hover:bg-[#0A1120]/65 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
                >
                  {activities.length} activities
                </a>
              </div>
            </div>
            <div aria-hidden className="hidden h-44 w-44 items-center justify-center rounded-full bg-[#0A1120]/40 text-[96px] ring-8 ring-white/20 md:flex motion-safe:animate-[pulse_6s_ease-in-out_infinite]">
              {world.emoji}
            </div>
          </div>
          <dl className="relative mt-6 grid gap-2 sm:grid-cols-3">
            {FACTS.map((f) => (
              <div key={f.big} className="rounded-2xl bg-[#0A1120]/60 px-4 py-3 backdrop-blur-sm">
                <dt className="font-display text-2xl font-bold text-white">{f.big}</dt>
                <dd className="text-[14px] leading-snug text-white/85">{f.small}</dd>
              </div>
            ))}
          </dl>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Flagship game */}
          <section aria-labelledby="flagship" className="self-start overflow-hidden rounded-[28px] border border-white/10 bg-[#111C32] p-0 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
            <div className={`bg-gradient-to-r ${game.gradient} px-5 py-4`}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0A1120]/80">Flagship game · {game.zone}</p>
              <h2 id="flagship" className="font-display text-2xl font-bold text-[#0A1120]">
                {game.emoji} {game.name}
              </h2>
            </div>
            <div className="p-5">
              <p className="text-[17px] leading-snug text-[#EEF2F8]">{game.hook}</p>
              <p className="mt-2 text-[15px] leading-snug text-[#A7B0C0]">
                A real physics model underneath: thruster puffs that change speed and nothing that takes it away, a robot arm that must match a
                drifting ship before it grabs, a spacecraft that twists when its arm swings, and a mission flown through a two-second signal delay.
              </p>
              <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                {TIER_NAMES.map((t, i) => (
                  <li key={t} className="rounded-2xl bg-white/5 px-3 py-2 text-[14px] text-[#A7B0C0]">
                    <b className="font-display text-amber-300">{t}</b> — {GAME_TIERS[i]}
                  </li>
                ))}
              </ol>
              <Link
                href="/kids/play/orbit-repair"
                className="mt-4 inline-flex min-h-[52px] items-center rounded-2xl bg-amber-500 px-5 font-display text-lg font-bold text-[#1A1103] transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-safe:active:scale-[.97]"
              >
                Start the mission →
              </Link>
            </div>
          </section>

          <aside>
            <StationProgressCard ids={activities.map((a) => a.id)} gameId={game.id} />
          </aside>
        </div>

        {/* What this world is about */}
        <article className="max-w-4xl text-[17px] leading-relaxed text-[#A7B0C0]">
          <h2 className="font-display text-3xl font-bold text-[#EEF2F8]">Why space needs robots</h2>
          <p className="mt-3">
            A space station in low orbit races around the Earth about once every 90 minutes. Everything on board — the station, the astronauts, a
            dropped spoon — is falling around the planet together, so nothing presses down on anything else. That is why things float. It also means
            nothing rubs against a floor and, outside, there is no air: a push starts something moving and it keeps going in a straight line until
            another push stops it. This is <strong className="text-[#EEF2F8]">Newton’s first law</strong>, and in orbit you can see it every day.
          </p>
          <p className="mt-3">
            Working outside is slow and risky for people: a spacewalk takes hours of preparation, and a spacesuit is clumsy for small jobs. So
            robots do a lot of the heavy and careful work. They move big pieces of equipment, catch visiting spacecraft and help astronauts on
            spacewalks. Further out, robots fly to satellites to inspect, refuel or repair them, because there is nobody else up there to do it.
          </p>

          <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">Real robots you will meet here</h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong className="text-[#EEF2F8]">Station robot arms</strong> — long arms with many joints, fixed to the outside of the station. They
              can move along it, carry equipment, hold astronauts during spacewalks and grab cargo ships that have stopped their thrusters and are
              drifting freely nearby.
            </li>
            <li>
              <strong className="text-[#EEF2F8]">Two-handed fixer robots</strong> that ride on the end of a big arm and use smaller arms and tools to
              swap boxes and parts, so astronauts need fewer spacewalks.
            </li>
            <li>
              <strong className="text-[#EEF2F8]">Free-flying helpers</strong> — small cube-shaped robots that move around inside a station using fans,
              carrying cameras and testing new ideas for robots that work alongside people.
            </li>
            <li>
              <strong className="text-[#EEF2F8]">Servicing spacecraft</strong> that have docked with ageing communication satellites to keep them
              working for years longer, and new missions designed to refuel satellites and remove space debris.
            </li>
          </ul>

          <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">The big ideas</h2>
          <p className="mt-3">
            <strong className="text-[#EEF2F8]">Every push has a push back.</strong> A thruster shoots gas one way and the spacecraft moves the other
            way. A robot arm that swings a heavy part twists the spacecraft it sits on. <strong className="text-[#EEF2F8]">Match before you
            grab:</strong> catching something means moving at its speed first, or the difference has to be absorbed by the grapple.{' '}
            <strong className="text-[#EEF2F8]">Slow is smooth:</strong> final approaches happen at a few centimetres per second.{' '}
            <strong className="text-[#EEF2F8]">Delay changes everything:</strong> radio is fast, but at a Moon rover the reply comes back about 2.6
            seconds later, and from Mars it takes many minutes — so far-away robots need plans and the ability to keep themselves safe.
          </p>

          <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">What you learn at every age</h2>
          <ul className="mt-3 space-y-2">
            {KIDS_BANDS.map((b) => (
              <li key={b.id}>
                <b className="text-[#EEF2F8]">
                  {b.name} ({b.ages}):
                </b>{' '}
                {BAND_LEARN[b.id]}
              </li>
            ))}
          </ul>
          <p className="mt-3">
            The ideas climb with you. A five-year-old discovers that pushing on a wall sends you the other way. A nine-year-old works out how far a
            drifting robot goes in half a minute. A twelve-year-old uses momentum to find a robot’s recoil. A sixteen-year-old works out what it
            costs to match a tumbling satellite and plans for a signal that arrives too late to help.
          </p>
        </article>

        {/* Activities by band */}
        <section id="activities" aria-labelledby="activities-title" className="scroll-mt-20 p-0">
          <h2 id="activities-title" className="font-display text-3xl font-bold text-[#EEF2F8]">
            Space Station activities
          </h2>
          <p className="mt-1 text-[17px] text-[#A7B0C0]">Six for each age band, easiest first. Start with yours — or float up to the next band when you are ready.</p>
          <div className="mt-4">
            <StationActivities bands={bands} gameId={game.id} />
          </div>
        </section>
      </div>
    </>
  )
}
