// app/kids/play/sumo-arena/page.tsx — Robo Sumo Arena (server component)
// The game is a client island loaded with next/dynamic; everything a parent,
// teacher or search engine needs — what robot sumo really is, how the game
// models the physics, and tips for every tier — is rendered here on the server.

import type { Metadata } from 'next'
import Link from 'next/link'
import { GameTeacherStrip } from '@/components/kids/games/GameTeacherStrip'
import { getGame } from '@/lib/kids/universe/worlds'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import SumoArenaClient from '@/components/kids/games/sumo-arena/SumoArenaClient'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/play/sumo-arena`

const TITLE = 'Robot Sumo Game for Kids: Program a Sumo Robot with Real Physics'
const DESCRIPTION =
  'Program your own robot to push rivals out of a real sumo ring. Kids learn state machines (search, charge, recover), distance and edge sensors, traction, mass, momentum and why a wedge wins — four tiers from age 8 to 17.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Robo Sumo Arena — program a sumo robot',
    description: 'State machines, sensors, traction and wedges in a real-physics sumo ring. Four tiers, Cadet to Legend.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Robo Sumo Arena game' }],
  },
}

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Robo Sumo Arena',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive simulation',
  educationalLevel: 'Ages 8–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: [
    'Finite state machines: search, charge and recover',
    'Distance sensors and edge (line) sensors with thresholds',
    'Traction: grip × weight limits how hard a robot can push',
    'DC motor stall force and back-EMF',
    'Mass, momentum and design trade-offs',
    'How a wedge reduces an opponent’s grip',
  ],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Robo Sumo Arena', path: '/kids/play/sumo-arena' },
])

const TIERS = [
  {
    name: 'Cadet',
    who: 'about 8 and up',
    what: 'Pick one of three ready-made behaviours — Hunter, Bulldozer or Statue — and set the motor power. Then watch your own robot fight Bumbles, a gentle dome bot.',
    tip: 'Power is push. At low power your motors cannot shove a rival at all and the bout ends in a draw. A robot that looks for the rival wins faster than one that drives blindly.',
  },
  {
    name: 'Pilot',
    who: 'about 10 and up',
    what: 'The robots start back to back, and your robot starts right at the white line, facing out. Your robot follows three rule cards, checked from the top many times a second: one for the edge sensor, one for the distance sensor, and one for “otherwise”. The starting cards have a bug.',
    tip: 'Read the cards out loud as the robot would: “If I see the white line, keep driving forward…” — that is the bug. When nothing is in sight, the robot should turn to look rather than drive.',
  },
  {
    name: 'Ace',
    who: 'about 12 and up',
    what: 'Program the full state machine: how SEARCH moves, the distance that starts a CHARGE, how long to chase a rival that slipped out of the beam, the edge-sensor threshold, and the timings of RECOVER. Dodger starts behind you at the edge of the ring and shoves you at the bell. Its motors are matched to yours, so the bout tests your program, not your parts.',
    tip: 'Your edge sensors are the only warning you get that you are being shoved out, so the threshold has to sit between black (about 8) and white (about 92). Then the timings decide it: back up long enough to push Dodger away, and turn for only as long as you must. Change one number at a time — the bout is the same every time.',
  },
  {
    name: 'Legend',
    who: '14 and up — a real engineering challenge',
    what: 'Best of three against Sensei, a heavy wedge bot that changes tactics after every round: a wedge rush, a flank attack, or a counter-punch. Between rounds you may re-tune your state machine and change your robot: drive, wedge and ballast, under a 2.5 kg weight limit.',
    tip: 'Read the physics table. If your push is grip-limited, a little ballast pushes harder; if it is motor-limited, extra weight only makes you slower. Two wedges meeting head-on cancel each other out.',
  },
]

export default function SumoArenaPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(learningLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />

      <SumoArenaClient />

      <article className="mx-auto max-w-4xl px-4 pb-16 pt-8 text-[#EEF2F8]">
        <h2 className="font-display text-3xl font-black text-white">What is robot sumo?</h2>
        <p className="mt-3 text-[#C9D1DD]">
          Robot sumo is a real competition, held at schools, universities and robotics events around the world. Two robots start on a round, raised
          ring called a <strong>dohyo</strong> — for the 3 kg class it is 154 cm across, 5 cm high, black, with a 5 cm white line around the edge.
          When the referee starts the bout, each robot tries to push the other out of the ring. The first robot to touch the floor outside the ring
          loses. Nobody steers: in autonomous sumo the robots fight entirely on their own, so the winner is decided by the program and the design
          the builders made before the bout.
        </p>
        <p className="mt-3 text-[#C9D1DD]">
          That makes sumo one of the best ways to learn real robotics. A sumo robot has to <strong>sense</strong> (where is the rival? where is the
          edge?), <strong>decide</strong> (search, attack or escape?) and <strong>act</strong> (drive its motors) dozens of times a second, with
          physics deciding every collision.
        </p>

        <h2 className="mt-10 font-display text-2xl font-black text-white">The state machine inside every sumo robot</h2>
        <p className="mt-3 text-[#C9D1DD]">
          Almost every sumo program is a <strong>finite state machine</strong>. The robot is always in exactly one state and does that state’s job
          until a sensor reading makes it switch:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-[#C9D1DD]">
          <li>
            <strong>SEARCH</strong> — turn or move so the distance sensor sweeps the ring. When the sensor reads a distance below a threshold, switch
            to CHARGE.
          </li>
          <li>
            <strong>CHARGE</strong> — drive at full power toward the rival, steering toward the strongest echo. If the rival vanishes from view for
            too long, go back to SEARCH.
          </li>
          <li>
            <strong>RECOVER</strong> — whenever an edge sensor under the front of the robot sees the white line, back up and turn away before the
            wheels go over the edge. Then search again.
          </li>
        </ul>
        <p className="mt-3 text-[#C9D1DD]">
          Each switch depends on a <strong>threshold</strong>. An edge sensor shines light at the floor and measures how much bounces back: the black
          ring reflects very little, the white line a lot. The program picks a number in between that means “line”. Set it too high and the robot
          never notices the edge; set the distance threshold too short and it only sees a rival that is already on top of it.
        </p>

        <h2 className="mt-10 font-display text-2xl font-black text-white">The physics: why heavier is stronger — up to a point</h2>
        <p className="mt-3 text-[#C9D1DD]">
          A robot pushes by making its wheels push backward on the floor. How hard it can push is limited twice. The <strong>motors</strong> have a
          stall force — their strongest push, when they are not turning. And the <strong>tyres</strong> can only grip so much: the grip limit is the
          friction coefficient × the robot’s weight. Ask for more than that and the wheels just spin. A light robot is grip-limited, so adding weight
          makes it push harder. A heavy robot is motor-limited, so extra weight only makes it slower to speed up. The best design sits where the two
          limits meet, and real teams tune their robot’s weight for exactly that reason. Tracks and legs grip far better than wheels but are slower.
        </p>
        <p className="mt-3 text-[#C9D1DD]">
          A <strong>wedge</strong> is the classic sumo weapon. When it slides under a rival, it carries part of that rival’s weight. The rival’s
          wheels press down less, so they grip less — and a robot with less grip is easy to push. Two wedges meeting head-on cancel out, which is why
          attacking from the side matters.
        </p>

        <h2 className="mt-10 font-display text-2xl font-black text-white">What the game simulates</h2>
        <p className="mt-3 text-[#C9D1DD]">
          Robo Sumo Arena runs on the same Rapier physics engine as the R2BOT robot lab, stepped exactly 60 times a second. Your robot is the robot you
          built in the Workshop, with its real mass from its parts. The motors follow the real DC-motor rule — full push when stalled, less as they
          speed up — and every push is capped by grip × weight for its drive type. Collisions, momentum and spinning out are worked out by the
          engine, not scripted. A robot loses when its centre of mass passes the edge of the ring. There is no luck: each bout has a fixed seed, so
          the same program fights the same bout every time, and after every bout the debrief explains who pushed whom, how hard, and from which side.
        </p>

        <h2 className="mt-10 font-display text-2xl font-black text-white">The four tiers, and tips for each</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {TIERS.map((t) => (
            <section key={t.name} className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4">
              <h3 className="font-display text-xl font-black text-amber-300">{t.name}</h3>
              <p className="text-xs font-bold uppercase tracking-wide text-[#A7B0C0]">For {t.who}</p>
              <p className="mt-2 text-[#C9D1DD]">{t.what}</p>
              <p className="mt-2 text-sm text-[#A7B0C0]">
                <span className="font-black text-white">Tip: </span>
                {t.tip}
              </p>
            </section>
          ))}
        </div>

        <h2 className="mt-10 font-display text-2xl font-black text-white">Where you will see this in real life</h2>
        <p className="mt-3 text-[#C9D1DD]">
          The same ideas run far beyond the sumo ring. Robot vacuums use edge (“cliff”) sensors so they never fall down the stairs, and a state
          machine to switch between cleaning, escaping a corner and docking. Warehouse robots are designed around traction and weight so they can
          push heavy shelves without wheel spin. Self-driving cars switch between behaviours — follow the lane, overtake, stop — with thresholds on
          their sensor readings. Program a sumo robot, and you have used the toolkit real robot engineers use every day.
        </p>
        <p className="mt-6">
          <Link href="/kids" className="inline-flex min-h-[44px] items-center font-bold text-amber-300 underline-offset-4 hover:underline">
            ← Back to the R2BOT Universe
          </Link>
        </p>
        <GameTeacherStrip game={{ id: 'sumo-arena', name: getGame('sumo-arena')?.name ?? 'R2BOT Kids game' }} />
      </article>
    </>
  )
}
