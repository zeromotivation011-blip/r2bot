// app/kids/play/orbit-repair/page.tsx — Orbit Repair Crew (server component)
// The game is a client island loaded with next/dynamic; everything a parent,
// teacher or search engine needs — the real space robotics, how the game
// models it, and tips for every tier — is rendered here on the server.

import type { Metadata } from 'next'
import Link from 'next/link'
import { GameTeacherStrip } from '@/components/kids/games/GameTeacherStrip'
import { getGame } from '@/lib/kids/universe/worlds'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import OrbitRepairClient from '@/components/kids/games/orbit-repair/OrbitRepairClient'

export const runtime = 'nodejs'

const PAGE_URL = 'https://www.r2bot.in/kids/play/orbit-repair'

const TITLE = 'Orbit Repair Crew: Space Robotics Game for Kids — Zero Gravity, Robot Arms and Satellite Servicing'
const DESCRIPTION =
  'Fly a free-flying robot with thruster puffs, capture a drifting cargo ship with a space station’s robot arm, swap a satellite module and service a tumbling satellite with signal delay. Real zero-gravity physics, four tiers for ages 7–17.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Orbit Repair Crew — robots at work in zero gravity',
    description: 'Newton’s first law, momentum, robot-arm capture and teleoperation with delay. Four tiers, Cadet to Legend.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Orbit Repair Crew space robotics game' }],
  },
}

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Orbit Repair Crew',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive simulation',
  educationalLevel: 'Ages 7–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: [
    'Newton’s first law: motion without friction',
    'Newton’s third law: thrusters and reaction',
    'Matching velocity before capture',
    'Conservation of angular momentum on a free-floating spacecraft',
    'Teleoperation with time delay and predictive displays',
    'Fuel budgets and rotating reference frames',
  ],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Space Station', path: '/kids/worlds/station' },
  { name: 'Orbit Repair Crew', path: '/kids/play/orbit-repair' },
])

const TIERS = [
  {
    name: 'Cadet',
    who: 'about 7 and up, with a grown-up if needed',
    what: 'Fly a little helper robot around a station module with tiny thruster puffs. Collect a floating wrench and a lost camera, then park on the charger — slowly enough for its magnet to latch.',
    tip: 'One puff to start, then wait. The robot will not slow down on its own, so near the target give one puff the opposite way. Watch the blue arrow: it shows where the robot is drifting.',
  },
  {
    name: 'Pilot',
    who: 'about 9 and up',
    what: 'A cargo ship drifts past with its thrusters switched off. Drive the station’s robot arm so its hand reaches the grapple pin and moves along with it, then grab when the speed difference is under 5 cm/s.',
    tip: 'Do not aim at where the pin is — aim at where it is going. Start moving the hand the same way as the ship early, then switch on fine mode for the last metre: its top speed is just under the ship’s, so holding the arrow the way the ship drifts keeps you matched while the pin catches up with the hand.',
  },
  {
    name: 'Ace',
    who: 'about 12 and up',
    what: 'Swap a satellite’s broken module for a new one: remove, park, fetch, insert. The servicer is floating free, so every swing of the heavy module twists the whole spacecraft the other way. More than 8° and its antenna loses Earth.',
    tip: 'Moving the module straight toward or away from the spacecraft’s centre twists it much less than swinging it round. Go fast with an empty hand, slow with a full one, and stop before you let go.',
  },
  {
    name: 'Legend',
    who: '14 and up — a real engineering challenge',
    what: 'Fly a servicing spacecraft from 30 m away to a tumbling satellite, from the ground. Commands take 1 s to arrive and the video is 1 s old. Match the tumble, capture the satellite, and keep enough fuel to stop its spin.',
    tip: 'Puff, then wait two seconds before judging. Use the predictor ghost. Sync only when you are close and slow: holding a rotating path costs fuel in proportion to the distance from the spin axis.',
  },
]

export default function OrbitRepairPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(learningLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />

      <OrbitRepairClient />

      <article className="mx-auto max-w-4xl px-4 pb-16 pt-8 text-[17px] leading-relaxed text-[#A7B0C0]">
        <h2 className="font-display text-3xl font-bold text-[#EEF2F8]">Why moving in space is so strange</h2>
        <p className="mt-3">
          On Earth, almost everything that moves slows down by itself. A ball rolling across the floor stops because of friction and air. In orbit,
          a space station and everything inside it are falling around the Earth together, so nothing presses on the floor and there is no friction to
          slow things down — and outside, there is no air either. That makes <strong className="text-[#EEF2F8]">Newton’s first law</strong> easy to
          see: a moving object keeps moving in a straight line at the same speed until a force changes it. Give a robot one push and it drifts across
          the module until it hits a wall. To stop, you need a push the other way.
        </p>
        <p className="mt-3">
          Spacecraft and floating robots push themselves with small <strong className="text-[#EEF2F8]">thrusters</strong> (or, inside a station,
          fans that blow air). They work by <strong className="text-[#EEF2F8]">Newton’s third law</strong>: the thruster throws gas one way and the
          gas pushes the robot the other way. The same law catches out robot arms. An arm on a spacecraft that swings a heavy part one way makes the
          whole spacecraft turn the other way, because nothing is holding it still. Engineers call this the reaction, and they design arm moves and
          control systems to keep it small.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">Real robots that work in orbit</h2>
        <p className="mt-3">
          Large space stations have long robotic arms that move astronauts and equipment and <strong className="text-[#EEF2F8]">capture
          visiting cargo ships</strong>. Some cargo ships do not dock by themselves: they fly up close, hold still, switch their thrusters off and
          drift freely while an operator steers the arm’s hand onto a grapple fixture on the ship and closes it. Only then is the ship pulled in and
          bolted to the station. Small <strong className="text-[#EEF2F8]">free-flying robots</strong> work inside stations too — cube-shaped helpers
          that move around on fans, carry cameras, and help scientists test robot ideas in weightlessness.
        </p>
        <p className="mt-3">
          Further out, <strong className="text-[#EEF2F8]">satellite servicing</strong> is a growing field. Servicing spacecraft have docked with
          old communication satellites to give them extra years of life, and missions are being developed to refuel satellites, replace parts and
          remove dead satellites and debris. A dead satellite may be slowly <strong className="text-[#EEF2F8]">tumbling</strong>, which makes
          catching it much harder than catching one that holds still.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">What the game simulates</h2>
        <p className="mt-3">
          Orbit Repair Crew is a real physics model stepped 60 times a second. Thruster puffs are impulses: each one changes velocity by a fixed
          amount, and nothing else slows the robot except a wall. The robot arm is moved the way real operators move one, with a hand controller that
          sets the speed of the hand; the arm’s joints follow, and the hand speeds up and slows down gradually because the arm is heavy. A capture
          only works when the hand is at the pin <em>and</em> moving at the same speed, because any speed difference is momentum that has to go
          somewhere. In Ace, the spacecraft’s turn comes from conservation of angular momentum, and reaction wheels take it out with a limited
          torque. In Legend, commands and video are delayed, and matching a tumbling satellite costs fuel every second in proportion to
          ω²r — the centripetal acceleration of a rotating path. One thing is left out on purpose: real orbits bend long approaches into curves.
          Close to another spacecraft, over a few minutes, the straight lines in the game are a fair picture.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">The four tiers, and tips for each</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {TIERS.map((t) => (
            <section key={t.name} className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4">
              <h3 className="font-display text-xl font-bold text-amber-300">{t.name}</h3>
              <p className="text-xs font-bold uppercase tracking-wide text-[#6E7888]">For {t.who}</p>
              <p className="mt-2 text-[#EEF2F8]">{t.what}</p>
              <p className="mt-2 text-[15px]">
                <span className="font-bold text-[#EEF2F8]">Tip: </span>
                {t.tip}
              </p>
            </section>
          ))}
        </div>

        <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">Why engineers fly slowly</h2>
        <p className="mt-3">
          Videos of robot arms in space can look painfully slow. That is deliberate. A slow approach leaves time to react, keeps the speed difference
          at capture tiny, and keeps the reaction on the spacecraft small. When a robot is controlled from Earth, the delay makes slowness even more
          important: by the time you see a problem, the robot has already moved on. Real teleoperators use predictor displays, careful
          “move, wait, check” habits and onboard autonomy that can stop the robot by itself. Those are exactly the skills the Legend tier asks for.
        </p>
        <p className="mt-6 flex flex-wrap gap-4">
          <Link href="/kids/worlds/station" className="inline-flex min-h-[44px] items-center font-bold text-amber-300 underline-offset-4 hover:underline">
            ← The Space Station world
          </Link>
          <Link href="/kids" className="inline-flex min-h-[44px] items-center font-bold text-amber-300 underline-offset-4 hover:underline">
            Back to the R2BOT Universe
          </Link>
        </p>
        <GameTeacherStrip game={{ id: 'orbit-repair', name: getGame('orbit-repair')?.name ?? 'R2BOT Kids game' }} />
      </article>
    </>
  )
}
