// app/kids/worlds/zoo/page.tsx — the Robo Zoo world (server component)
// Indexable. Biomimicry: robots that copy gecko feet, snakes, insects, birds,
// fish, octopus arms and four-legged gaits. Server-rendered hero, flagship
// game card, teaching text, what each age band learns and every activity
// link; client islands add progress and the world-complete card.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import { byWorld } from '@/lib/kids/activities/content'
import { KIDS_BANDS } from '@/lib/kids/bands'
import { getGame, getWorld } from '@/lib/kids/universe/worlds'
import { TIER_NAMES } from '@/lib/kids/universe/tiers'
import { ZooActivities, ZooProgressCard, type ZooBand } from '@/components/kids/worlds/zoo/ZooWorldClient'

export const runtime = 'nodejs'

const PAGE_URL = 'https://www.r2bot.in/kids/worlds/zoo'
const TITLE = 'Robo Zoo: Biomimicry for Kids — Robots Inspired by Geckos, Snakes, Birds and Fish'
const DESCRIPTION =
  'A robotics world for kids 5–17 about biomimicry. Discover gecko-inspired climbing robots, snake robots for pipes and rubble, insect-sized flapping robots, four-legged walkers and robot fish — with the Bio-Bot Lab game and 24 hands-on activities.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Robo Zoo — robots that learned from animals',
    description: DESCRIPTION,
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids Robo Zoo world' }],
  },
}

const world = getWorld('zoo')!
const game = getGame(world.game)!
const activities = byWorld('zoo')

const BAND_LEARN: Record<string, string> = {
  explorers: 'Match animal tricks to jobs, spot robot animals on a farm, choose a soft or hard grip, send a goat-bot over rocks and build a window-climbing gecko robot.',
  builders: 'Meet famous bio-bots, choose legs or wheels from the height of the bumps, balance a goat-bot on a slope, count a RoboBee’s flaps and design a pipe-inspecting snake on a battery budget.',
  inventors: 'Name bio-bots from their design, build a rule for static and dynamic gaits, size gecko pads with a safety factor, load a pack robot, work out walking energy from the cost of transport and cross mud and rocks.',
  engineers: 'Match each robot to the physics it borrows, find the Froude-number rule for walking and running, scale flapping power with f³, survive a downhill emergency stop with margin, compute crawl speed and design a multi-terrain explorer.',
}

const bands: ZooBand[] = KIDS_BANDS.map((b) => ({
  id: b.id,
  name: b.name,
  ages: b.ages,
  learn: BAND_LEARN[b.id] ?? '',
  items: activities.filter((a) => a.band === b.id).map((a) => ({ id: a.id, title: a.title, track: a.track, difficulty: a.difficulty, template: a.template })),
}))

const GAME_TIERS = ['Match the animal trick to the challenge', 'Tune a gait, a snake wave and a flap rate', 'Combine modules on one small battery', 'Design for unknown terrain, then explain']

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Robo Zoo — biomimicry and bio-inspired robots for kids',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive activities and game',
  educationalLevel: 'Ages 5–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: [
    'Biomimicry in engineering',
    'Gecko-inspired dry adhesion',
    'Snake robots and friction',
    'Flapping flight: lift and power',
    'Static and dynamic stability, support polygon, duty factor',
    'Energy cost of transport',
    'Soft robotic grippers',
  ],
  hasPart: [
    { '@type': 'LearningResource', name: game.name, url: 'https://www.r2bot.in/kids/play/bio-bots' },
    ...activities.map((a) => ({ '@type': 'LearningResource', name: a.title, url: `https://www.r2bot.in/kids/galaxy/${a.track}/${a.id}` })),
  ],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Robo Zoo', path: '/kids/worlds/zoo' },
])

const FACTS = [
  { big: '3 feet', small: 'down at all times keeps a walking robot statically stable' },
  { big: '~120 / s', small: 'wing beats of Harvard’s insect-sized RoboBee' },
  { big: '0 glue', small: 'gecko feet hold on with forces between molecules' },
]

export default function ZooWorldPage() {
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
          {/* navy wash behind the text so white type keeps AA contrast on the bright lime */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0A1120]/60 via-[#0A1120]/30 to-transparent" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-[#0A1120]/35 blur-2xl" />
          {/* leaf canopy */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden opacity-25">
            <div className="absolute -right-8 -top-10 h-40 w-40 rounded-[60%_40%_60%_40%] bg-lime-200 blur-sm" />
            <div className="absolute right-24 -top-16 h-32 w-32 rounded-[40%_60%_40%_60%] bg-green-200 blur-sm" />
            <div className="absolute -left-10 top-1/3 h-28 w-28 rounded-[60%_40%_60%_40%] bg-lime-100 blur-sm" />
          </div>
          <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-50/90">A world of the R2BOT Universe</p>
              <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">Robo Zoo</h1>
              <p className="mt-2 max-w-xl text-xl font-semibold text-lime-50">{world.tagline}</p>
              <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-white/90">
                Geckos climb glass. Snakes slip through gaps. Goats never fall off cliffs. Engineers study these animals and build robots that use the
                same tricks. Come and meet them — then build your own.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/kids/play/bio-bots"
                  className="inline-flex min-h-[52px] items-center rounded-2xl bg-amber-500 px-5 font-display text-lg font-bold text-[#1A1103] shadow-lg transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 motion-safe:active:scale-[.97]"
                >
                  ▶ Play Bio-Bot Lab
                </Link>
                <a
                  href="#activities"
                  className="inline-flex min-h-[52px] items-center rounded-2xl border-2 border-white/60 bg-[#0A1120]/25 px-5 font-display text-lg font-bold text-white transition hover:bg-[#0A1120]/45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
                >
                  {activities.length} activities
                </a>
              </div>
            </div>
            <div aria-hidden className="relative hidden h-48 w-48 md:block">
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-[#0A1120]/30 text-[96px] ring-8 ring-white/15">{world.emoji}</div>
              <span className="absolute -left-2 top-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#0A1120]/45 text-3xl ring-4 ring-white/15">🐍</span>
              <span className="absolute -right-2 top-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#0A1120]/45 text-3xl ring-4 ring-white/15">🐝</span>
              <span className="absolute -bottom-1 left-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#0A1120]/45 text-3xl ring-4 ring-white/15">🐐</span>
              <span className="absolute -bottom-2 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#0A1120]/45 text-3xl ring-4 ring-white/15">🐟</span>
            </div>
          </div>
          <dl className="relative mt-6 grid gap-2 sm:grid-cols-3">
            {FACTS.map((f) => (
              <div key={f.big} className="rounded-2xl bg-[#0A1120]/40 px-4 py-3 backdrop-blur-sm">
                <dt className="font-display text-2xl font-bold text-white">{f.big}</dt>
                <dd className="text-[14px] leading-snug text-lime-50/90">{f.small}</dd>
              </div>
            ))}
          </dl>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Flagship game */}
          <section aria-labelledby="flagship" className="self-start overflow-hidden rounded-[28px] border border-white/10 bg-[#111C32] shadow-[0_8px_24px_rgba(0,0,0,.45)]">
            <div className={`bg-gradient-to-r ${game.gradient} px-5 py-4`}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-50">Flagship game · {game.zone}</p>
              <h2 id="flagship" className="font-display text-2xl font-bold text-white">
                {game.emoji} {game.name}
              </h2>
            </div>
            <div className="p-5">
              <p className="text-[17px] leading-snug text-[#EEF2F8]">{game.hook}</p>
              <p className="mt-2 text-[15px] leading-snug text-[#A7B0C0]">
                A real model underneath: the support polygon of a walking robot computed at every instant, wall friction for a snake in a pipe, lift
                against weight for flapping wings, gecko pads that must hold twice the robot’s weight, and the cost of transport for every metre.
              </p>
              <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                {TIER_NAMES.map((t, i) => (
                  <li key={t} className="rounded-2xl bg-white/5 px-3 py-2 text-[14px] text-[#A7B0C0]">
                    <b className="font-display text-amber-300">{t}</b> — {GAME_TIERS[i]}
                  </li>
                ))}
              </ol>
              <Link
                href="/kids/play/bio-bots"
                className="mt-4 inline-flex min-h-[52px] items-center rounded-2xl bg-amber-500 px-5 font-display text-lg font-bold text-[#1A1103] transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-safe:active:scale-[.97]"
              >
                Open the lab →
              </Link>
            </div>
          </section>

          <aside>
            <ZooProgressCard ids={activities.map((a) => a.id)} gameId={game.id} />
          </aside>
        </div>

        {/* What this world is about */}
        <article className="max-w-4xl text-[17px] leading-relaxed text-[#A7B0C0]">
          <h2 className="font-display text-3xl font-bold text-[#EEF2F8]">Why engineers copy animals</h2>
          <p className="mt-3">
            Most robots still roll on wheels, and wheels are brilliant on smooth floors and roads. But the world is full of places where wheels are
            hopeless: stairs, rubble after an earthquake, the inside of a pipe, a glass wall, a coral reef, a tree branch. Animals live in every one of
            those places, and evolution has had a very long time to find what works. <strong className="text-[#EEF2F8]">Biomimicry</strong> — also called
            bio-inspired design — means studying how an animal solves a problem and building a machine that uses the same principle.
          </p>
          <p className="mt-3">
            The important word is <em>principle</em>. A gecko robot does not need scales or a tail; it needs feet that touch glass closely enough for
            the tiny forces between molecules to add up. A snake robot does not need to eat; it needs a chain of joints that can press against walls
            and turn that push into grip. Understanding the principle is what lets an engineer build it out of motors, plastic and code — and decide
            when an animal trick is worth its weight.
          </p>

          <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">Real robots you will meet here</h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong className="text-[#EEF2F8]">Gecko climbers.</strong> Stanford’s Stickybot climbed glass in 2006 using toe pads of tiny angled
              stalks copied from gecko feet. Gecko-style grippers are now tested for grabbing objects in space, where suction does not work.
            </li>
            <li>
              <strong className="text-[#EEF2F8]">Snake robots.</strong> Carnegie Mellon University’s snake robots inspect pipes and joined search teams
              after the 2017 Mexico City earthquake. Norway’s Eelume is a swimming snake robot designed to live on the seabed and inspect equipment.
            </li>
            <li>
              <strong className="text-[#EEF2F8]">Insect-scale flyers.</strong> Harvard’s RoboBee, about the size of a paper clip, flaps its wings about
              120 times a second. TU Delft’s DelFly is another flapping-wing flyer.
            </li>
            <li>
              <strong className="text-[#EEF2F8]">Four-legged walkers.</strong> Robots such as Spot (USA) and ANYmal (Switzerland) inspect factories,
              tunnels, power plants and offshore platforms, using gaits that animals use.
            </li>
            <li>
              <strong className="text-[#EEF2F8]">Fish, octopus and birds.</strong> MIT’s soft robot fish SoFi filmed real fish on a reef in Fiji in 2018;
              soft grippers inspired by octopus arms handle fruit and fragile food; Stanford’s SNAG perches on branches with falcon-like feet.
            </li>
          </ul>

          <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">The big ideas</h2>
          <p className="mt-3">
            <strong className="text-[#EEF2F8]">Stability:</strong> a robot that could freeze mid-step without falling is statically stable — its centre
            of mass stays over the area made by the feet on the ground. Fast gaits trade that for dynamic stability: they stay up by moving.{' '}
            <strong className="text-[#EEF2F8]">Grip:</strong> friction is μ times how hard surfaces press together; adhesion holds without pressing.{' '}
            <strong className="text-[#EEF2F8]">Lift:</strong> wings must push down more air than the robot weighs.{' '}
            <strong className="text-[#EEF2F8]">Energy:</strong> the cost of transport — energy ÷ (weight × distance) — lets you compare a mouse, a horse and a
            robot, and shows why every extra kilogram matters.
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
            The ideas grow with you. A six-year-old discovers that a soft grip saves a tomato that a hard pincer would burst. A ten-year-old finds out
            why a wheel cannot climb a step taller than its radius. A sixteen-year-old uses the Froude number to compare a mouse with an elephant, and
            designs one robot for terrain it has never seen — trading weight, energy and stability exactly as real robot engineers do.
          </p>
        </article>

        {/* Activities by band */}
        <section id="activities" aria-labelledby="activities-title" className="scroll-mt-20">
          <h2 id="activities-title" className="font-display text-3xl font-bold text-[#EEF2F8]">
            Robo Zoo activities
          </h2>
          <p className="mt-1 text-[17px] text-[#A7B0C0]">Six for each age band, easiest first. Start with yours — or visit the next band when you are ready.</p>
          <div className="mt-4">
            <ZooActivities bands={bands} gameId={game.id} />
          </div>
        </section>
      </div>
    </>
  )
}
