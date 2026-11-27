// app/kids/play/swarm-reef/page.tsx — Swarm Reef (server component)
// The game is a client island loaded with next/dynamic; everything a parent,
// teacher or search engine needs — what swarm robotics is, how the game models
// it, and tips for every tier — is rendered here on the server.

import type { Metadata } from 'next'
import Link from 'next/link'
import { GameTeacherStrip } from '@/components/kids/games/GameTeacherStrip'
import { getGame } from '@/lib/kids/universe/worlds'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import SwarmReefClient from '@/components/kids/games/swarm-reef/SwarmReefClient'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/play/swarm-reef`

const TITLE = 'Swarm Robotics Game for Kids: Boids and Emergence'
const DESCRIPTION =
  'Command a swarm of underwater robots by setting the rules each robot follows: separation, alignment, cohesion, obstacle avoidance and a shared trail. Kids learn emergence and decentralised control in a real boids simulation — four tiers from age 8 to 17.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Swarm Reef — command 40 robots with three simple rules',
    description: 'Boids, emergence and swarm search-and-rescue in a real simulation. Four tiers, Cadet to Legend.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Swarm Reef game' }],
  },
}

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Swarm Reef',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive simulation',
  educationalLevel: 'Ages 8–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: [
    'Emergent behaviour from simple local rules',
    'Separation, alignment and cohesion (boids)',
    'Decentralised control and sensing radius',
    'Self-healing formations',
    'Coverage search with a shared pheromone-like trail (stigmergy)',
  ],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Swarm Reef', path: '/kids/play/swarm-reef' },
])

const TIERS = [
  {
    name: 'Cadet',
    who: 'about 8 and up, with a grown-up if needed',
    what: 'Feeding time. Forty robots must reach the food, but only the gold scouts can smell it. A current keeps pushing robots away. Get 70% of the swarm to the food in 50 seconds.',
    tip: 'Tap a blue robot and watch it. If it has no neighbours inside its circle, nothing tells it where to go. Cohesion keeps robots near each other and alignment makes them swim the same way, so the whole group follows the few scouts. If the scouts race off alone, turn “Go to food” down a little.',
  },
  {
    name: 'Pilot',
    who: 'about 10 and up',
    what: 'The narrow gap. Every robot knows where the food is, but a rock wall with a gap only six robots wide stands in the way. Wall crashes and robot-to-robot bumps are counted.',
    tip: 'Without obstacle avoidance a robot only learns about the wall by hitting it. Turn avoidance up so robots feel the wall early and slide along it to the gap. Separation keeps a safe bubble around each robot; alignment turns a scrum into a neat queue. Too much cohesion packs the swarm into a ball too fat for the gap.',
  },
  {
    name: 'Ace',
    who: 'about 12 and up',
    what: 'Light-show formation. Form a ring, keep it even when 12 of the 36 robots suddenly fail, then stretch into a 700-unit line. Each shape is scored on how close robots are to it and how evenly they are spaced.',
    tip: 'Cohesion is the enemy here: the middle of your neighbours on a ring is inside the ring. Turn it off and let separation do the spacing. After the failure the gaps between survivors grow to about 52 units — if the sensing radius is smaller than a gap, no robot can feel the gap, so it never closes. For the line, a firm shape pull stops robots being pushed off it.',
  },
  {
    name: 'Legend',
    who: '14 and up — a real research problem',
    what: 'Search and rescue. Fourteen robots with limited batteries must find six hidden beacons and search as much of the reef as possible. Moving costs energy and so does sensing: a bigger radius sees more but drains faster, and every crash or bump costs battery too. The mission ends when the last battery is flat.',
    tip: 'A flock is a terrible search pattern — it searches like one big robot. Spread out with separation and almost no cohesion. Then give the swarm a memory: robots leave a fading trail and “explore” steers each one away from trails, toward unsearched water. Make the trail strong enough to notice: like any real sensor, a robot’s trail sensor has a detection threshold, and a very faint trail reads as clean water. For three stars, balance the trail strength against how fast it fades, and pick a radius that sees enough without killing the battery — a big radius searches a wide strip but dies early.',
  },
]

export default function SwarmReefPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(learningLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />

      <SwarmReefClient />

      <article className="mx-auto max-w-4xl px-4 pb-16 pt-8 text-slate-200">
        <h2 className="font-display text-3xl font-black text-white">How a swarm thinks without a leader</h2>
        <p className="mt-3 text-slate-300">
          Watch a school of fish turn, or a flock of starlings ripple across the evening sky. Thousands of animals move as if they were one, yet no
          fish is in charge and no bird can see the whole flock. Each one only notices the few neighbours around it. In 1987 the computer scientist
          Craig Reynolds showed that just three rules, followed by every individual, are enough to produce this behaviour. He called his simulated
          birds <strong>boids</strong>:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-300">
          <li>
            <strong>Separation</strong> — move away from neighbours that are too close, so you don’t collide.
          </li>
          <li>
            <strong>Alignment</strong> — steer toward the average direction your neighbours are moving.
          </li>
          <li>
            <strong>Cohesion</strong> — steer toward the average position of your neighbours, so you stay with the group.
          </li>
        </ul>
        <p className="mt-3 text-slate-300">
          None of these rules says “make a flock”. The flock <strong>emerges</strong> from many simple decisions made at the same time. That idea,
          <strong> emergence</strong>, is at the heart of <strong>swarm robotics</strong>: instead of one expensive robot with a big brain, engineers
          use many cheap robots with small brains, each acting on local information. The result is <strong>decentralised</strong> control. There is
          no single point of failure: if some robots break, the rest carry on.
        </p>

        <h2 className="mt-10 font-display text-2xl font-black text-white">What the game simulates</h2>
        <p className="mt-3 text-slate-300">
          Swarm Reef is a real boids simulation stepped 60 times a second. Every robot has a position, a velocity, a top speed and a thruster
          limit (all the rule pushes added together are capped, so it cannot stop or turn instantly), and it feels water drag and an ocean
          current. Each step, every robot looks only at the neighbours inside its own{' '}
          <strong>sensing radius</strong> and adds up the pushes from each rule, multiplied by the <strong>weights</strong> you set. Separation acts
          only inside a smaller personal space, just as in Reynolds’ model. Collisions with rocks and with other robots are detected and counted.
          Random numbers come from a fixed seed and the rules lock while the swarm swims, so the same rules always give the same run and your
          score depends only on your design.
        </p>
        <p className="mt-3 text-slate-300">
          The Cadet level is based on a famous result in animal behaviour: in 2005, Iain Couzin and colleagues showed that a small number of
          informed individuals can guide a whole group, as long as everyone else just stays together. In Legend, the robots share a fading trail,
          like ants marking paths with chemical pheromones. Scientists call coordination through marks left in the environment{' '}
          <strong>stigmergy</strong>. Here the trail works the other way round to an ant’s food trail: it says “already searched — go somewhere
          else”, which spreads the swarm across the map.
        </p>

        <h2 className="mt-10 font-display text-2xl font-black text-white">The four tiers, and tips for each</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {TIERS.map((t) => (
            <section key={t.name} className="rounded-[20px] border border-white/10 bg-white/5 p-4">
              <h3 className="font-display text-xl font-black text-amber-300">{t.name}</h3>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">For {t.who}</p>
              <p className="mt-2 text-slate-300">{t.what}</p>
              <p className="mt-2 text-sm text-slate-300">
                <span className="font-black text-white">Tip: </span>
                {t.tip}
              </p>
            </section>
          ))}
        </div>

        <h2 className="mt-10 font-display text-2xl font-black text-white">Where you will see swarms in real life</h2>
        <p className="mt-3 text-slate-300">
          <strong>Drone light shows</strong> fly hundreds or thousands of drones to draw pictures in the night sky. In most shows today a ground
          computer plans every drone’s path in advance, and each drone flies its own route using precise positioning. Researchers are working on
          shows where drones keep their spacing and repair the picture themselves when one drops out — exactly the self-healing you build in the Ace
          tier. <strong>Warehouse robot fleets</strong> move shelves and parcels for online shops; a central system usually assigns the jobs, but
          each robot still uses its own sensors and simple traffic rules so hundreds of them can share the floor without collisions.
        </p>
        <p className="mt-3 text-slate-300">
          In research labs, the Harvard <strong>Kilobot</strong> project made 1,024 coin-sized robots arrange themselves into shapes using only
          messages to their nearest neighbours. Swarms of small drones and underwater robots are being tested for search and rescue, mapping
          coral reefs and checking crops, because many small robots can cover a large area quickly and keep working if a few are lost. The next time
          you see a flock of birds, you will know there is no leader up there — just a few simple rules, followed by everyone at once.
        </p>
        <p className="mt-6">
          <Link href="/kids" className="font-bold text-amber-300 underline-offset-4 hover:underline">
            ← Back to the R2BOT Universe
          </Link>
        </p>
        <GameTeacherStrip game={{ id: 'swarm-reef', name: getGame('swarm-reef')?.name ?? 'R2BOT Kids game' }} />
      </article>
    </>
  )
}
