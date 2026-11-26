// app/kids/worlds/city/page.tsx — the Robot City world (server component)
// Indexable. Robots on city streets: self-driving cars (perception, prediction,
// planning, control), stopping distances, right-of-way, smart traffic lights,
// pavement delivery robots, multi-robot coordination, edge cases and the people
// who still matter — safety drivers and remote assistants.
// Server-rendered hero, flagship game card, teaching text, what each age band
// learns and every activity link; client islands add progress and the
// world-complete card.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import { byWorld } from '@/lib/kids/activities/content'
import { KIDS_BANDS } from '@/lib/kids/bands'
import { getGame, getWorld } from '@/lib/kids/universe/worlds'
import { TIER_NAMES } from '@/lib/kids/universe/tiers'
import { CityActivities, CityProgressCard, type CityBand } from '@/components/kids/worlds/city/CityWorldClient'

export const runtime = 'nodejs'

const PAGE_URL = 'https://www.r2bot.in/kids/worlds/city'
const TITLE = 'Robot City: Self-Driving Cars for Kids — Stopping Distance, Smart Traffic Lights and Delivery Robots'
const DESCRIPTION =
  'A robotics world for kids 5–17 about robots on city streets. Learn how self-driving cars see with cameras, lidar and radar, why stopping distance grows with speed squared, how smart traffic lights work and how robots handle the unexpected — with a four-tier game and 24 hands-on activities.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Robot City — self-driving cars and smart streets',
    description: DESCRIPTION,
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids Robot City world' }],
  },
}

const world = getWorld('city')!
const game = getGame(world.game)!
const activities = byWorld('city')

const BAND_LEARN: Record<string, string> = {
  explorers: 'Meet the robots that work on city streets, find them on Main Street, decide when it is safe to cross, plan a delivery robot’s route to the door, choose its sensors and help it share the pavement politely.',
  builders: 'Add up reaction and braking distance, spot people stepping into a lidar’s view, set the distance at which a car brakes, program a robot that crosses at the lights, plan around a busy market and trace a traffic-light cycle.',
  inventors: 'Match real street robots to their jobs, choose between camera, lidar and radar, discover that double the speed needs four times the braking distance, build a smart traffic light, tune cruise control and weigh up a robotaxi company’s rules.',
  engineers: 'Work out the fastest speed you can stop within the distance you can see, build a brake-or-ignore rule from sensor data, read radar cut-ins, tune a truck platoon, simulate a stop step by step and set a robotaxi’s priorities.',
}

const bands: CityBand[] = KIDS_BANDS.map((b) => ({
  id: b.id,
  name: b.name,
  ages: b.ages,
  learn: BAND_LEARN[b.id] ?? '',
  items: activities.filter((a) => a.band === b.id).map((a) => ({ id: a.id, title: a.title, track: a.track, difficulty: a.difficulty, template: a.template })),
}))

const GAME_TIERS = ['Help a delivery robot cross three roads', 'Tune speed and gap against stopping distance', 'Time the lights of a busy junction', 'Write a robotaxi’s rules and pass 6 safety tests']

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Robot City — self-driving cars and smart streets for kids',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive activities and game',
  educationalLevel: 'Ages 5–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: [
    'How self-driving cars perceive, predict, plan and act',
    'Cameras, lidar and radar, and why cars combine them',
    'Stopping distance: reaction distance plus braking distance, growing with speed squared',
    'Right-of-way at crossings and junctions',
    'Smart traffic lights and signal timing',
    'Pavement delivery robots, remote assistance and safety testing',
  ],
  hasPart: [
    { '@type': 'LearningResource', name: game.name, url: 'https://www.r2bot.in/kids/play/robot-city' },
    ...activities.map((a) => ({ '@type': 'LearningResource', name: a.title, url: `https://www.r2bot.in/kids/galaxy/${a.track}/${a.id}` })),
  ],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Robot City', path: '/kids/worlds/city' },
])

const FACTS = [
  { big: '× 4', small: 'braking distance when you double your speed — it grows with speed squared' },
  { big: '3', small: 'kinds of eyes on many self-driving cars: cameras, lidar and radar' },
  { big: '6 km/h', small: 'about the top speed of a pavement delivery robot — walking pace' },
]

/** A tiny stylised street map for the hero (decorative). */
function StreetArt() {
  return (
    <svg aria-hidden viewBox="0 0 220 220" className="h-48 w-48">
      <rect x="0" y="0" width="220" height="220" rx="36" fill="#0A1120" fillOpacity=".35" />
      <rect x="92" y="0" width="36" height="220" fill="#2A2F3A" />
      <rect x="0" y="92" width="220" height="36" fill="#2A2F3A" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={`z${i}`} x={94 + i * 6} y="132" width="3" height="12" fill="#fff" opacity=".85" />
      ))}
      <rect x="20" y="20" width="56" height="56" rx="8" fill="#19263F" />
      <rect x="144" y="20" width="56" height="56" rx="8" fill="#22345A" />
      <rect x="20" y="144" width="56" height="56" rx="8" fill="#22345A" />
      <rect x="144" y="144" width="56" height="56" rx="8" fill="#19263F" />
      <rect x="98" y="30" width="12" height="22" rx="3" fill="#FC6818" />
      <circle cx="104" cy="36" r="3" fill="#1A1103" />
      <rect x="160" y="104" width="22" height="12" rx="3" fill="#00B8D4" />
      <rect x="46" y="134" width="12" height="9" rx="2" fill="#FFA878" />
      <circle cx="82" cy="84" r="5" fill="#22C55E" />
      <circle cx="138" cy="138" r="5" fill="#EF4444" />
    </svg>
  )
}

export default function CityWorldPage() {
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
        <header className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br ${world.gradient} p-6 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-10`}>
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0A1120]/75 via-[#0A1120]/40 to-transparent" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/20 to-transparent" />
          {/* skyline */}
          <svg aria-hidden viewBox="0 0 600 80" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full opacity-30">
            <path d="M0 80 V50 H40 V30 H70 V55 H110 V20 H150 V45 H190 V35 H230 V60 H270 V15 H300 V50 H340 V28 H380 V58 H420 V38 H460 V22 H500 V52 H540 V34 H600 V80 Z" fill="#0A1120" />
          </svg>
          <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-50">A world of the R2BOT Universe</p>
              <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">Robot City</h1>
              <p className="mt-2 max-w-xl text-xl font-semibold text-sky-50">{world.tagline}</p>
              <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-white/90">
                Help a delivery robot cross busy roads, tune a self-driving car so it can always stop in time, time the lights of a busy junction and write
                the rules a robotaxi follows when a ball bounces into the road. Here safety always comes first.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/kids/play/robot-city"
                  className="inline-flex min-h-[52px] items-center rounded-2xl bg-amber-500 px-5 font-display text-lg font-bold text-[#1A1103] shadow-lg transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 motion-safe:active:scale-[.97]"
                >
                  ▶ Play Robot City
                </Link>
                <a
                  href="#activities"
                  className="inline-flex min-h-[52px] items-center rounded-2xl border-2 border-white/60 bg-[#0A1120]/30 px-5 font-display text-lg font-bold text-white transition hover:bg-[#0A1120]/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
                >
                  {activities.length} activities
                </a>
              </div>
            </div>
            <div className="hidden md:block">
              <StreetArt />
            </div>
          </div>
          <dl className="relative mt-6 grid gap-2 sm:grid-cols-3">
            {FACTS.map((f) => (
              <div key={f.big} className="rounded-2xl bg-[#0A1120]/50 px-4 py-3 backdrop-blur-sm">
                <dt className="font-display text-2xl font-bold text-white">{f.big}</dt>
                <dd className="text-[14px] leading-snug text-white/90">{f.small}</dd>
              </div>
            ))}
          </dl>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Flagship game */}
          <section aria-labelledby="flagship" className="self-start overflow-hidden rounded-[28px] border border-white/10 bg-[#111C32] shadow-[0_8px_24px_rgba(0,0,0,.45)]">
            <div className={`relative bg-gradient-to-r ${game.gradient} px-5 py-4`}>
              <div aria-hidden className="absolute inset-0 bg-[#0A1120]/35" />
              <p className="relative text-xs font-bold uppercase tracking-[0.18em] text-sky-50">Flagship game · {game.zone}</p>
              <h2 id="flagship" className="relative font-display text-2xl font-bold text-white">
                {game.emoji} {game.name}
              </h2>
            </div>
            <div className="p-5">
              <p className="text-[17px] leading-snug text-[#EEF2F8]">{game.hook}</p>
              <p className="mt-2 text-[15px] leading-snug text-[#A7B0C0]">
                A real model underneath every tier: cars with stopping distances and right-of-way rules, a self-driving car that reacts 0.5 s after it
                perceives, a queue simulation of human and robot drivers at a junction, and a robotaxi whose rules are tested on six scenarios.
              </p>
              <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                {TIER_NAMES.map((t, i) => (
                  <li key={t} className="rounded-2xl bg-white/5 px-3 py-2 text-[14px] text-[#A7B0C0]">
                    <b className="font-display text-amber-300">{t}</b> — {GAME_TIERS[i]}
                  </li>
                ))}
              </ol>
              <Link
                href="/kids/play/robot-city"
                className="mt-4 inline-flex min-h-[52px] items-center rounded-2xl bg-amber-500 px-5 font-display text-lg font-bold text-[#1A1103] transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-safe:active:scale-[.97]"
              >
                Hit the streets →
              </Link>
            </div>
          </section>

          <aside>
            <CityProgressCard ids={activities.map((a) => a.id)} gameId={game.id} />
          </aside>
        </div>

        {/* What this world is about */}
        <article className="max-w-4xl text-[17px] leading-relaxed text-[#A7B0C0]">
          <h2 className="font-display text-3xl font-bold text-[#EEF2F8]">How robots move around a city</h2>
          <p className="mt-3">
            A city street is one of the hardest places a robot can work. People, bikes, buses, dogs and balls all move at once, the weather changes, and the
            rules of the road differ from country to country. A self-driving car handles it with the same loop many times a second. It{' '}
            <strong className="text-[#EEF2F8]">perceives</strong> the world with cameras (colours, signs, lane lines), lidar (exact 3-D shapes from laser light)
            and radar (distance and speed, even in fog and rain). It <strong className="text-[#EEF2F8]">predicts</strong> what each road user will do next. It{' '}
            <strong className="text-[#EEF2F8]">plans</strong> a safe path and speed, and it <strong className="text-[#EEF2F8]">controls</strong> the steering,
            accelerator and brakes to follow that plan.
          </p>
          <p className="mt-3">
            The most important number in Robot City is the <strong className="text-[#EEF2F8]">stopping distance</strong>: the distance travelled while
            reacting, plus the braking distance. Braking distance grows with the square of speed, so going twice as fast needs four times as far to brake. That
            one idea explains speed limits near schools, following gaps, and why a robot must slow down when fog or a parked van hides the road ahead.
          </p>
          <p className="mt-3">
            Cities are shared by many robots at once. Smart traffic lights use sensors to give each road a fair turn. Delivery robots on pavements give way to
            people. And when a robot meets something it does not understand — road works with a worker waving, or a police officer directing traffic — it stops
            safely and asks a person. Real robotaxi companies run remote assistance centres for exactly that, and new self-driving cars are tested with trained
            safety drivers before they ever drive alone.
          </p>

          <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">Real robots you will meet here</h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong className="text-[#EEF2F8]">Waymo robotaxis</strong>, which began as a Google project in 2009 and have offered fully driverless rides to
              the public in the USA since 2020.
            </li>
            <li>
              <strong className="text-[#EEF2F8]">Apollo Go</strong>, Baidu’s robotaxi service, which carries passengers in Wuhan and other cities in China.
            </li>
            <li>
              <strong className="text-[#EEF2F8]">Starship delivery robots</strong>, from a company founded in Estonia, which drive along pavements at walking
              pace to deliver food on campuses and in towns.
            </li>
            <li>
              <strong className="text-[#EEF2F8]">Nuro R2</strong>, a small road-going delivery vehicle with no seats and no steering wheel, built only to carry
              goods.
            </li>
            <li>
              <strong className="text-[#EEF2F8]">Adaptive traffic-light systems</strong> such as SCOOT, from the UK, and SCATS, from Sydney, which change signal
              timings as traffic changes in cities around the world.
            </li>
          </ul>

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
            The ideas climb with you. A six-year-old learns that a robot waits for the green walking signal and that, when in doubt, waiting is safe. A
            ten-year-old adds reaction distance to braking distance. A thirteen-year-old discovers why doubling the speed quadruples the braking distance. A
            sixteen-year-old solves for the fastest speed that can still stop within the distance the sensors can see — and writes the rules that keep a robotaxi
            safe when the unexpected happens.
          </p>
        </article>

        {/* Activities by band */}
        <section id="activities" aria-labelledby="activities-title" className="scroll-mt-20">
          <h2 id="activities-title" className="font-display text-3xl font-bold text-[#EEF2F8]">
            Robot City activities
          </h2>
          <p className="mt-1 text-[17px] text-[#A7B0C0]">Six for each age band, easiest first. Start with yours — or explore the next district when you are ready.</p>
          <div className="mt-4">
            <CityActivities bands={bands} gameId={game.id} />
          </div>
        </section>
      </div>
    </>
  )
}
