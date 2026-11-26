// app/kids/play/maze-mapper/page.tsx — Maze Mapper: The Labyrinth (server component)
// The game is a client island loaded with next/dynamic; everything a parent,
// teacher or search engine needs — how real robots map unknown places, how the
// game models it, and tips for every tier — is rendered here on the server.

import type { Metadata } from 'next'
import Link from 'next/link'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import MazeMapperClient from '@/components/kids/games/maze-mapper/MazeMapperClient'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/play/maze-mapper`

const TITLE = 'Maze Mapper Game for Kids: How Robots Map and Escape a Maze'
const DESCRIPTION =
  'Guide a robot through a fog-covered maze with a range sensor. Kids learn occupancy grid maps, wall-following and why it loops, frontier exploration, BFS and A* path planning, and how robots cope with noisy sensors. Four tiers, ages 8 to 17.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Maze Mapper: The Labyrinth — map the unknown and escape',
    description: 'Occupancy grids, wall-followers, frontier search, BFS and A* in a seeded maze. Cadet to Legend.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Maze Mapper game' }],
  },
}

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Maze Mapper: The Labyrinth',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive simulation',
  educationalLevel: 'Ages 8–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: [
    'Occupancy grid maps (free, occupied, unknown)',
    'Range sensors and sensor beams',
    'Wall-following and why it fails in mazes with loops',
    'Frontier-based exploration',
    'Breadth-first search (BFS) and A* path planning',
    'Sensor noise and log-odds evidence',
  ],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Maze Mapper', path: '/kids/play/maze-mapper' },
])

const TIERS = [
  {
    name: 'Cadet',
    who: 'about 8 and up, with a grown-up if needed',
    what: 'You drive. Every move fires four sensor beams that paint the map: dark green for floor, bright blocks for walls. Find the green exit and drive out — the more of the maze you map first, the more stars.',
    tip: 'Peek into side corridors before you pass them: one step in and the beams reach several squares. Press Hint when you are stuck and a yellow trail leads to the nearest unexplored edge.',
  },
  {
    name: 'Pilot',
    who: 'about 10 and up',
    what: 'The robot drives itself with a wall-follower: keep one hand on a wall and walk. Pick left or right. The robot starts next to a wall that floats free in the middle of the maze — and you have only a few hand-driven moves to fix it.',
    tip: 'If the robot comes back to the same square facing the same way, it will loop forever. The wall it held glows yellow: that is an island. Drive to a wall that touches the outside of the maze, then start the follower again.',
  },
  {
    name: 'Ace',
    who: 'about 12 and up',
    what: 'You choose where to explore. Glowing squares are frontiers, where the known map meets the unknown. Each trip is planned with breadth-first search, and you watch its wavefront ripple out. When the exit appears, plan the escape.',
    tip: 'Nearest-first is a good rule, but the exit is always in the east wall. A far frontier on the east side can be worth more than a near one in the west. Stop exploring as soon as you know a way out.',
  },
  {
    name: 'Legend',
    who: '14 and up — a real engineering challenge',
    what: 'One reading in five is wrong, some vanish, and the wheels slip. You design the robot’s brain: scans per stop, the trust level, the planner (BFS, A* or greedy) and an east hunch. Then compare your brain with others on the same maze.',
    tip: 'A trust level of 55% believes a single echo, so ghost walls block corridors and phantom gaps appear in walls. Raise the trust to about 80% and take one or two scans per stop. Use A* so planning costs less energy, and add some east hunch.',
  },
]

export default function MazeMapperPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(learningLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />

      <MazeMapperClient />

      <article className="mx-auto max-w-4xl px-4 pb-16 pt-8 text-gray-200">
        <h2 className="text-3xl font-black text-white">How a robot maps a place it has never seen</h2>
        <p className="mt-3 text-white/80">
          A robot vacuum in a new home, a rescue robot in a collapsed tunnel and a rover on another planet all face the same puzzle: they have to
          find their way around a place nobody has mapped for them. They cannot see the whole room at once. All they have is a sensor that measures
          how far away the nearest thing is in a few directions — a <strong>range sensor</strong> such as a lidar, a sonar or an infrared sensor.
        </p>
        <p className="mt-3 text-white/80">
          Most robots turn those measurements into an <strong>occupancy grid</strong>: the floor is cut into small squares, and each square is marked
          as <em>free</em>, <em>occupied</em> (a wall or obstacle) or <em>unknown</em>. When a beam travels three squares and hits something, the robot
          learns that the first squares are free and the last one is occupied. Every reading fills in a little more of the grid. That is exactly the
          map you watch appear out of the fog in Maze Mapper.
        </p>

        <h2 className="mt-10 text-2xl font-black text-white">Three ways to explore</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-white/80">
          <li>
            <strong>Wall-following</strong> is the oldest maze trick: keep one hand on the wall and walk. If every wall is joined to the outside
            wall — a maze with no loops — it is guaranteed to reach the exit. But in a maze with loops, some walls are <em>islands</em> that float in
            the middle. Follow an island and you go round in circles forever.
          </li>
          <li>
            <strong>Frontier exploration</strong> sends the robot to the edge between the known and the unknown, because that is where there is
            something new to learn. Robotics researcher Brian Yamauchi described this method in 1997, and many exploring robots still use versions of
            it.
          </li>
          <li>
            <strong>Path planning</strong> finds the best route on the map. <em>Breadth-first search</em> (BFS) spreads out one square at a time like
            a ripple, so the first time it touches the goal it has found a shortest route. <em>A*</em> (said “A-star”, published in 1968) adds a guess
            of the distance still to go, so it searches toward the goal and checks far fewer squares while still finding a shortest route.
          </li>
        </ul>

        <h2 className="mt-10 text-2xl font-black text-white">What the game simulates</h2>
        <p className="mt-3 text-white/80">
          Every maze is generated from a seed by carving a perfect maze and then knocking out some walls to make loops, so the same maze number is
          the same for everyone and a score is fair. The robot moves one square at a time and casts four or eight beams. In the Legend tier the
          sensor is honest only most of the time: about one beam in five reads one square too short or too long, some beams return nothing, and
          the wheels sometimes slip. The map then works like a real one, using <strong>log-odds</strong>: each reading adds a little evidence for
          “free” or “wall”, and a square only counts as known when the evidence passes the trust level you choose. One bad echo gets out-voted by
          many good ones. When the robot really is unsure, it can touch a square with its bumper, which is never wrong.
        </p>
        <p className="mt-3 text-white/80">
          To keep things focused, the robot always knows exactly where it is: its motion sensor notices every wheel slip. Real robots also have
          to work out their own position while they build the map, a harder problem called SLAM (simultaneous localisation and mapping). At the end
          of each round the fog lifts and you see the robot’s map laid over the real maze, with every mistake marked, the robot’s route and the
          shortest route.
        </p>

        <h2 className="mt-10 text-2xl font-black text-white">The four tiers, and tips for each</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {TIERS.map((t) => (
            <section key={t.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-xl font-black text-amber-300">{t.name}</h3>
              <p className="text-xs font-bold uppercase tracking-wide text-white/50">For {t.who}</p>
              <p className="mt-2 text-white/80">{t.what}</p>
              <p className="mt-2 text-sm text-white/75">
                <span className="font-black text-white">Tip: </span>
                {t.tip}
              </p>
            </section>
          ))}
        </div>

        <h2 className="mt-10 text-2xl font-black text-white">Where you will see this in real life</h2>
        <p className="mt-3 text-white/80">
          Robot vacuums with a spinning lidar on top build an occupancy map of your home on their first run, then plan tidy paths room by room.
          Warehouse robots plan routes on grid maps thousands of times an hour. Teams in the DARPA Subterranean Challenge sent robots into caves and
          tunnels with no map at all, exploring frontiers and sharing what they found. The ideas are the same ones you used here: sense, map, choose
          where to look next, and plan a route — while never trusting one reading too much.
        </p>
        <p className="mt-6">
          <Link href="/kids" className="font-bold text-amber-300 underline-offset-4 hover:underline">
            ← Back to the R2BOT Universe
          </Link>
        </p>
      </article>
    </>
  )
}
