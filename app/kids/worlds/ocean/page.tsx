// app/kids/worlds/ocean/page.tsx — the Ocean Lab world (server component)
// Indexable. Underwater robots: buoyancy, pressure, light, sonar, tethers,
// currents and navigation without GPS. Server-rendered hero, flagship game
// card, teaching text, what each age band learns and every activity link;
// client islands add progress and the world-complete card.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import { byWorld } from '@/lib/kids/activities/content'
import { KIDS_BANDS } from '@/lib/kids/bands'
import { getGame, getWorld } from '@/lib/kids/universe/worlds'
import { TIER_NAMES } from '@/lib/kids/universe/tiers'
import { OceanActivities, OceanProgressCard, type OceanBand } from '@/components/kids/worlds/ocean/OceanWorldClient'

export const runtime = 'nodejs'

const PAGE_URL = 'https://www.r2bot.in/kids/worlds/ocean'
const TITLE = 'Ocean Lab: Underwater Robots for Kids — ROVs, AUVs, Sonar and Buoyancy'
const DESCRIPTION =
  'A robotics world for kids 5–17 about underwater robots. Learn buoyancy and ballast, why pressure rises with depth, how sonar finds things in the dark, and how robots navigate without GPS — with a deep-sea rescue game and 24 hands-on activities.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Ocean Lab — dive with robots into the deep sea',
    description: DESCRIPTION,
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids Ocean Lab world' }],
  },
}

const world = getWorld('ocean')!
const game = getGame(world.game)!
const activities = byWorld('ocean')

const BAND_LEARN: Record<string, string> = {
  explorers: 'Meet the three kinds of sea robot, find out why things float or sink, hear fish on a sonar and program a drone to its docking cage.',
  builders: 'Work out the pressure 50 m down, choose between a cable robot and a free one, turn an echo time into a distance, plan routes round currents and kelp, and stop an ROV without overshooting.',
  inventors: 'Measure the depth of the sea from an echo, read a noisy depth sensor, meet famous deep-sea robots, stop flicker with hysteresis, tune P and D on a heavy ROV, and see why dead reckoning drifts.',
  engineers: 'Find the fastest a mapping sonar can ping, classify sonar contacts with a rule, filter a spiky forward sonar, hold an ROV still in a current with PID, trim ballast in code and plan with A*.',
}

const bands: OceanBand[] = KIDS_BANDS.map((b) => ({
  id: b.id,
  name: b.name,
  ages: b.ages,
  learn: BAND_LEARN[b.id] ?? '',
  items: activities.filter((a) => a.band === b.id).map((a) => ({ id: a.id, title: a.title, track: a.track, difficulty: a.difficulty, template: a.template })),
}))

const GAME_TIERS = ['Harbour rescue with sonar hints', 'Ballast, currents and sonar circles', 'Program an AUV that is out of contact', 'Map a reef on a battery budget']

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Ocean Lab — underwater robots for kids',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive activities and game',
  educationalLevel: 'Ages 5–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: [
    'Buoyancy, ballast and neutral buoyancy',
    'Pressure increases about 1 atmosphere per 10 m of seawater',
    'Light fades with depth, red first',
    'Sonar ranging with the speed of sound in water',
    'Tethered ROVs, autonomous AUVs and gliders',
    'Navigation without GPS: dead reckoning, DVL, acoustic positioning',
  ],
  hasPart: [
    { '@type': 'LearningResource', name: game.name, url: 'https://www.r2bot.in/kids/play/ocean-rescue' },
    ...activities.map((a) => ({ '@type': 'LearningResource', name: a.title, url: `https://www.r2bot.in/kids/galaxy/${a.track}/${a.id}` })),
  ],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Ocean Lab', path: '/kids/worlds/ocean' },
])

const FACTS = [
  { big: '1 atm', small: 'more pressure for every 10 m of seawater' },
  { big: '1,500 m/s', small: 'speed of sound in seawater — sonar’s ruler' },
  { big: '0', small: 'GPS signals reach a robot underwater' },
]

export default function OceanWorldPage() {
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
          <div aria-hidden className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-[#0A1120]/40 blur-2xl" />
          {/* light rays */}
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-30">
            <div className="absolute -top-10 left-[12%] h-[140%] w-16 rotate-[14deg] bg-gradient-to-b from-white/50 to-transparent blur-md" />
            <div className="absolute -top-10 left-[34%] h-[120%] w-10 rotate-[10deg] bg-gradient-to-b from-white/40 to-transparent blur-md" />
            <div className="absolute -top-10 left-[58%] h-[130%] w-14 rotate-[16deg] bg-gradient-to-b from-white/30 to-transparent blur-md" />
          </div>
          <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-50/90">A world of the R2BOT Universe</p>
              <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">Ocean Lab</h1>
              <p className="mt-2 max-w-xl text-xl font-semibold text-cyan-50">{world.tagline}</p>
              <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-cyan-50/90">
                The deep sea is dark, cold and crushing — and almost entirely unexplored. Robots go where people cannot. Learn how they float, see,
                hear and find their way down there.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/kids/play/ocean-rescue"
                  className="inline-flex min-h-[52px] items-center rounded-2xl bg-amber-500 px-5 font-display text-lg font-bold text-[#1A1103] shadow-lg transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 motion-safe:active:scale-[.97]"
                >
                  ▶ Play Deep Sea Rescue
                </Link>
                <a
                  href="#activities"
                  className="inline-flex min-h-[52px] items-center rounded-2xl border-2 border-white/60 bg-[#0A1120]/25 px-5 font-display text-lg font-bold text-white transition hover:bg-[#0A1120]/45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
                >
                  {activities.length} activities
                </a>
              </div>
            </div>
            <div aria-hidden className="hidden h-44 w-44 items-center justify-center rounded-full bg-[#0A1120]/30 text-[96px] ring-8 ring-white/15 md:flex">
              {world.emoji}
            </div>
          </div>
          <dl className="relative mt-6 grid gap-2 sm:grid-cols-3">
            {FACTS.map((f) => (
              <div key={f.big} className="rounded-2xl bg-[#0A1120]/35 px-4 py-3 backdrop-blur-sm">
                <dt className="font-display text-2xl font-bold text-white">{f.big}</dt>
                <dd className="text-[14px] leading-snug text-cyan-50/90">{f.small}</dd>
              </div>
            ))}
          </dl>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Flagship game */}
          <section aria-labelledby="flagship" className="self-start overflow-hidden rounded-[28px] border border-white/10 bg-[#111C32] p-0 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
            <div className={`bg-gradient-to-r ${game.gradient} px-5 py-4`}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-50">Flagship game · {game.zone}</p>
              <h2 id="flagship" className="font-display text-2xl font-bold text-white">
                {game.emoji} {game.name}
              </h2>
            </div>
            <div className="p-5">
              <p className="text-[17px] leading-snug text-[#EEF2F8]">{game.hook}</p>
              <p className="mt-2 text-[15px] leading-snug text-[#A7B0C0]">
                A real force model underneath: buoyancy against weight, thrusters, water drag, a tether pushed by the current and sonar echoes timed at
                1,500 m/s. At the top tiers you lose contact and must program an autonomous robot instead.
              </p>
              <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                {TIER_NAMES.map((t, i) => (
                  <li key={t} className="rounded-2xl bg-white/5 px-3 py-2 text-[14px] text-[#A7B0C0]">
                    <b className="font-display text-amber-300">{t}</b> — {GAME_TIERS[i]}
                  </li>
                ))}
              </ol>
              <Link
                href="/kids/play/ocean-rescue"
                className="mt-4 inline-flex min-h-[52px] items-center rounded-2xl bg-amber-500 px-5 font-display text-lg font-bold text-[#1A1103] transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-safe:active:scale-[.97]"
              >
                Start the dive →
              </Link>
            </div>
          </section>

          <aside>
            <OceanProgressCard ids={activities.map((a) => a.id)} gameId={game.id} />
          </aside>
        </div>

        {/* What this world is about */}
        <article className="max-w-4xl text-[17px] leading-relaxed text-[#A7B0C0]">
          <h2 className="font-display text-3xl font-bold text-[#EEF2F8]">Why the ocean needs robots</h2>
          <p className="mt-3">
            The ocean covers about 71 % of our planet, and its average depth is around 3,700 m. Sunlight is too weak for plants below about 200 m,
            and below about 1,000 m it is completely dark. The water also presses harder the deeper you go: about one extra atmosphere for every
            10 m. People can only stay down there inside thick-walled submarines, so most of the work is done by robots — exploring, filming new
            animals, checking undersea pipelines and internet cables, finding lost equipment and mapping the seafloor, much of which has still
            never been mapped in detail.
          </p>
          <p className="mt-3">
            Underwater robots face problems that robots on land never meet. They must balance their weight against the push of the water
            (buoyancy), or they sink or float away. Radio waves and GPS do not work underwater, so they cannot be steered by radio or find their
            position from satellites. Instead they use <strong className="text-[#EEF2F8]">sound</strong>: sonar to see in the dark, acoustic
            beacons to find things and talk, and sonar beams bounced off the seabed to measure their own speed. Currents push them off course, and a
            cable to the ship gets dragged by every current it passes through.
          </p>

          <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">Real robots you will meet here</h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong className="text-[#EEF2F8]">ROVs</strong> on a tether, driven live by pilots on a ship — like Jason, which has sampled hot
              deep-sea vents for decades, and small inspection ROVs used in harbours, fish farms and on offshore wind farms.
            </li>
            <li>
              <strong className="text-[#EEF2F8]">AUVs</strong> that follow their own program, like Boaty McBoatface, an Autosub Long Range that
              measured deep, cold currents near Antarctica, and survey AUVs that have found aircraft wrecks thousands of metres down.
            </li>
            <li>
              <strong className="text-[#EEF2F8]">Gliders</strong> that change their buoyancy to sink and rise and can collect data for months; one
              called RU27 crossed the Atlantic in 2009.
            </li>
            <li>
              <strong className="text-[#EEF2F8]">Deep divers</strong> like Nereus, which reached the bottom of the Challenger Deep in 2009, almost
              11,000 m down, where the pressure is over 1,000 atmospheres.
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
            The ideas climb with you. A five-year-old learns that things heavier than the water they push aside sink. A ten-year-old turns an echo
            time into a distance. A sixteen-year-old plans a sonar survey the way ocean engineers do, trading swath width, detail, battery and time —
            and discovers why a robot that cannot feel the current drifts away from where it thinks it is.
          </p>
        </article>

        {/* Activities by band */}
        <section id="activities" aria-labelledby="activities-title" className="scroll-mt-20 p-0">
          <h2 id="activities-title" className="font-display text-3xl font-bold text-[#EEF2F8]">
            Ocean Lab activities
          </h2>
          <p className="mt-1 text-[17px] text-[#A7B0C0]">Six for each age band, easiest first. Start with yours — or dive into the next band when you are ready.</p>
          <div className="mt-4">
            <OceanActivities bands={bands} gameId={game.id} />
          </div>
        </section>
      </div>
    </>
  )
}
