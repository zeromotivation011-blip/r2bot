// app/kids/worlds/farm/page.tsx — the Smart Farm world (server component)
// Indexable. Agricultural robots: soil sensors and precision irrigation,
// drones and NDVI, picking and weeding robots, autonomous tractors, livestock
// robots, saving water and chemicals. Server-rendered hero, flagship game
// card, teaching text, what each age band learns and every activity link;
// client islands add progress and the world-complete card.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import { byWorld } from '@/lib/kids/activities/content'
import { KIDS_BANDS } from '@/lib/kids/bands'
import { getGame, getWorld } from '@/lib/kids/universe/worlds'
import { TIER_NAMES } from '@/lib/kids/universe/tiers'
import { FarmActivities, FarmProgressCard, type FarmBand } from '@/components/kids/worlds/farm/FarmWorldClient'

export const runtime = 'nodejs'

const PAGE_URL = 'https://www.r2bot.in/kids/worlds/farm'
const TITLE = 'Smart Farm: Farm Robots for Kids — Soil Sensors, Drones, NDVI and Picking Robots'
const DESCRIPTION =
  'A robotics world for kids 5–17 about agricultural robots. Learn how soil sensors decide when to water, how drones use NDVI to find sick plants, how picking robots judge ripeness and how robot tractors steer — with a farm-season game and 24 hands-on activities.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Smart Farm — grow food with drones and sensors',
    description: DESCRIPTION,
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids Smart Farm world' }],
  },
}

const world = getWorld('farm')!
const game = getGame(world.game)!
const activities = byWorld('farm')

const BAND_LEARN: Record<string, string> = {
  explorers: 'Find the robots on a farm, give each one its job, sort ripe fruit from green, program a watering robot, read a soil sensor and set the line that turns the sprinkler on.',
  builders: 'Choose sensors for a robot tractor, build a rule that tells weeds from carrots, tune a noisy irrigation valve, plan round muddy ground, combine soil and forecast checks, and work out drip-line water.',
  inventors: 'Identify real farm robots from their designs, train a ripeness classifier, read an NDVI trace from a drone, trace an irrigation controller in code, stop a pump chattering with hysteresis and plan a multi-stop orchard tour.',
  engineers: 'Pick k to beat bad training labels, choose between NDVI and leaf temperature, estimate a season of water in cubic metres, filter a glitchy probe, order a picking robot’s priorities and design the cheapest night-time sensor kit.',
}

const bands: FarmBand[] = KIDS_BANDS.map((b) => ({
  id: b.id,
  name: b.name,
  ages: b.ages,
  learn: BAND_LEARN[b.id] ?? '',
  items: activities.filter((a) => a.band === b.id).map((a) => ({ id: a.id, title: a.title, track: a.track, difficulty: a.difficulty, template: a.template })),
}))

const GAME_TIERS = ['Read soil sensors and water the thirsty plants', 'Place sensors, set the threshold, plan a drone survey', 'Program a picking robot that light tries to fool', 'Run a whole season: harvest vs water vs energy']

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Smart Farm — agricultural robots for kids',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive activities and game',
  educationalLevel: 'Ages 5–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: [
    'Soil-moisture sensors and irrigation thresholds',
    'Hysteresis and filtering of noisy sensors',
    'NDVI vegetation index from drone images',
    'Lawnmower (boustrophedon) coverage paths',
    'Machine vision and classification for ripeness and weeds',
    'GPS guidance for autonomous tractors',
    'Trade-offs between yield, water, energy and chemicals',
  ],
  hasPart: [
    { '@type': 'LearningResource', name: game.name, url: 'https://www.r2bot.in/kids/play/smart-farm' },
    ...activities.map((a) => ({ '@type': 'LearningResource', name: a.title, url: `https://www.r2bot.in/kids/galaxy/${a.track}/${a.id}` })),
  ],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Smart Farm', path: '/kids/worlds/farm' },
])

const FACTS = [
  { big: '~70 %', small: 'of the fresh water people take is used by farms' },
  { big: '2 cm', small: 'how closely RTK-GPS tractors can follow a row' },
  { big: 'NIR', small: 'healthy leaves reflect lots of near-infrared light — drone cameras see it, we cannot' },
]

export default function FarmWorldPage() {
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
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/25 to-transparent" />
          {/* navy veil on the text side keeps white text readable on the yellow end of the gradient */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0A1120]/70 via-[#0A1120]/35 to-transparent" />
          {/* sun */}
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-yellow-200/50 blur-2xl" />
          {/* field rows */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(100deg, rgba(10,17,32,.55) 0 10px, transparent 10px 34px)' }} />
          <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-100">A world of the R2BOT Universe</p>
              <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,.35)] sm:text-5xl">Smart Farm</h1>
              <p className="mt-2 max-w-xl text-xl font-semibold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,.4)]">{world.tagline}</p>
              <p className="mt-3 max-w-xl rounded-2xl bg-[#0A1120]/35 p-3 text-[17px] leading-relaxed text-white backdrop-blur-sm">
                Robots that read the soil, fly over fields, pick fruit gently and pull weeds without chemicals. Learn how farmers grow more food with less water — and program
                the machines yourself.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/kids/play/smart-farm"
                  className="inline-flex min-h-[52px] items-center rounded-2xl bg-amber-500 px-5 font-display text-lg font-bold text-[#1A1103] shadow-lg transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 motion-safe:active:scale-[.97]"
                >
                  ▶ Play Smart Farm
                </Link>
                <a
                  href="#activities"
                  className="inline-flex min-h-[52px] items-center rounded-2xl border-2 border-white/70 bg-[#0A1120]/35 px-5 font-display text-lg font-bold text-white transition hover:bg-[#0A1120]/55 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
                >
                  {activities.length} activities
                </a>
              </div>
            </div>
            <div aria-hidden className="hidden h-44 w-44 items-center justify-center rounded-full bg-[#0A1120]/30 text-[96px] ring-8 ring-white/20 md:flex">
              {world.emoji}
            </div>
          </div>
          <dl className="relative mt-6 grid gap-2 sm:grid-cols-3">
            {FACTS.map((f) => (
              <div key={f.big} className="rounded-2xl bg-[#0A1120]/45 px-4 py-3 backdrop-blur-sm">
                <dt className="font-display text-2xl font-bold text-white">{f.big}</dt>
                <dd className="text-[14px] leading-snug text-white/90">{f.small}</dd>
              </div>
            ))}
          </dl>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Flagship game */}
          <section aria-labelledby="flagship" className="self-start overflow-hidden rounded-[28px] border border-white/10 bg-[#111C32] p-0 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
            <div className={`relative bg-gradient-to-r ${game.gradient} px-5 py-4`}>
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-[#0A1120]/45" />
              <p className="relative text-xs font-bold uppercase tracking-[0.18em] text-white">Flagship game · {game.zone}</p>
              <h2 id="flagship" className="relative font-display text-2xl font-bold text-white">
                {game.emoji} {game.name}
              </h2>
            </div>
            <div className="p-5">
              <p className="text-[17px] leading-snug text-[#EEF2F8]">{game.hook}</p>
              <p className="mt-2 text-[15px] leading-snug text-[#A7B0C0]">
                A real farm model underneath: a daily soil-water balance for sand, loam and clay, crop stress when the soil is less than half full, a drone camera whose strip grows
                with height, a picking camera whose colours change with the light, and a season of storms, heatwaves and pests.
              </p>
              <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                {TIER_NAMES.map((t, i) => (
                  <li key={t} className="rounded-2xl bg-white/5 px-3 py-2 text-[14px] text-[#A7B0C0]">
                    <b className="font-display text-amber-300">{t}</b> — {GAME_TIERS[i]}
                  </li>
                ))}
              </ol>
              <Link
                href="/kids/play/smart-farm"
                className="mt-4 inline-flex min-h-[52px] items-center rounded-2xl bg-amber-500 px-5 font-display text-lg font-bold text-[#1A1103] transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-safe:active:scale-[.97]"
              >
                Start farming →
              </Link>
            </div>
          </section>

          <aside>
            <FarmProgressCard ids={activities.map((a) => a.id)} gameId={game.id} />
          </aside>
        </div>

        {/* What this world is about */}
        <article className="max-w-4xl text-[17px] leading-relaxed text-[#A7B0C0]">
          <h2 className="font-display text-3xl font-bold text-[#EEF2F8]">Why farms are full of robots</h2>
          <p className="mt-3">
            Every meal starts on a farm. Farmers must grow more food every year, often with less water, fewer people to help and less fertiliser and weed-killer, because those can
            wash into rivers. Farming already uses about 70 % of the fresh water people take from rivers, lakes and underground. So the big idea of the smart farm is
            <strong className="text-[#EEF2F8]"> precision</strong>: measure each part of the field, then give each part exactly what it needs — water only where the soil is dry,
            spray only the weeds or the sick plants, pick only the ripe fruit.
          </p>
          <p className="mt-3">
            Robots make that possible because they can measure and act on every plant, every day. A soil-moisture sensor reads how wet the ground is and an irrigation
            controller opens a valve when the reading falls below a threshold. A drone flies a lawnmower path over the field with a camera that sees near-infrared light; it
            calculates NDVI, a number that is high for healthy leaves and low for stressed ones, so problems show up before anyone can see them from the path. A picking robot
            judges ripeness from colour, and must not be fooled by sunset light. A robot tractor steers along the rows by satellite positioning to within a few centimetres.
          </p>

          <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">Real robots you will meet here</h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong className="text-[#EEF2F8]">Weed-spotting sprayers and weeders</strong> — John Deere&apos;s See &amp; Spray sprays only the weeds its cameras find; Carbon
              Robotics&apos; LaserWeeder burns weeds with lasers; Naïo&apos;s Oz and the solar-powered FarmDroid hoe them out without chemicals.
            </li>
            <li>
              <strong className="text-[#EEF2F8]">Drones</strong> that map crop health with multispectral and thermal cameras, and spray drones that treat rice paddies and
              steep hillside fields across Asia.
            </li>
            <li>
              <strong className="text-[#EEF2F8]">Milking robots</strong> such as the Lely Astronaut and DeLaval VMS: cows choose when to walk in, and a robot arm with a camera
              attaches the cups. Collars and cameras also track each animal&apos;s health.
            </li>
            <li>
              <strong className="text-[#EEF2F8]">Autonomous tractors and picking robots</strong> — tractors that drive themselves with RTK-GPS, and robots that pick strawberries,
              apples and tomatoes, still one of the hardest jobs in robotics.
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
            The ideas climb with you. A five-year-old learns that a sensor can know the soil is dry before the leaves droop. A ten-year-old sets a threshold on a noisy reading. A
            sixteen-year-old runs a whole season, trading harvest against water, energy and chemicals, and explains which decision cost the most — exactly the questions
            agricultural engineers work on from Kenya to California, India to the Netherlands.
          </p>
        </article>

        {/* Activities by band */}
        <section id="activities" aria-labelledby="activities-title" className="scroll-mt-20 p-0">
          <h2 id="activities-title" className="font-display text-3xl font-bold text-[#EEF2F8]">
            Smart Farm activities
          </h2>
          <p className="mt-1 text-[17px] text-[#A7B0C0]">Six for each age band, easiest first. Start with yours — or try the next band when you are ready.</p>
          <div className="mt-4">
            <FarmActivities bands={bands} gameId={game.id} />
          </div>
        </section>
      </div>
    </>
  )
}
