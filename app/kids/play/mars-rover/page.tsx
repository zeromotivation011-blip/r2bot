// app/kids/play/mars-rover/page.tsx — Mars Rover Command (server component)
// The game is a client island loaded with next/dynamic; everything a parent,
// teacher or search engine needs — what real rover driving is, how the game
// models it, and tips for every tier — is rendered here on the server.

import type { Metadata } from 'next'
import Link from 'next/link'
import { GameTeacherStrip } from '@/components/kids/games/GameTeacherStrip'
import { getGame } from '@/lib/kids/universe/worlds'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import MarsRoverClient from '@/components/kids/games/mars-rover/MarsRoverClient'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/play/mars-rover`

const TITLE = 'Mars Rover Game for Kids: Drive a Rover Through the Signal Delay'
const DESCRIPTION =
  'Command a rover on Mars when every message takes minutes to arrive. Kids learn signal delay, dead reckoning, wheel slip, hazard avoidance, power and data budgets — and why Perseverance drives itself with AutoNav. Four tiers, ages 8 to 17.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Mars Rover Command — drive a rover through the signal delay',
    description: 'Plan drives, beat the light delay, catch wheel slip and give your rover rules to think for itself. Cadet to Legend.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Mars Rover Command game' }],
  },
}

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Mars Rover Command',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive simulation',
  educationalLevel: 'Ages 8–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: [
    'Radio signal delay between Earth and Mars',
    'Planning a command sequence in advance',
    'Dead reckoning and wheel slip',
    'Visual odometry and hazard avoidance',
    'Rover autonomy (AutoNav, AEGIS)',
    'Solar power and data bandwidth budgets',
  ],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Mars Rover Command', path: '/kids/play/mars-rover' },
])

const TIERS = [
  {
    name: 'Cadet',
    who: 'about 8 and up, with a grown-up if needed',
    what: 'A short signal delay. Build a list of drives and turns that takes the rover to target ①, finish with Science, and send it. The orange line shows the route you planned.',
    tip: 'Turn first, then drive. The rover turns on the spot, so a 90° turn does not move it. Count squares on the grid, and make sure the last square of your drive is exactly on the target before Science.',
  },
  {
    name: 'Pilot',
    who: 'about 10 and up',
    what: 'A 12-minute delay each way, so every extra plan costs nearly half an hour. Rocks, steep slopes (striped) and deep dunes (dark rippled sand) stand between you and the target.',
    tip: 'Plan the whole route before you send anything. Diagonal turns (45°) make shorter routes. Never let the line cross a dune: a rover that digs into deep sand cannot get out, which is how the real rover Spirit ended its driving days.',
  },
  {
    name: 'Ace',
    who: 'about 12 and up',
    what: 'A 20-minute delay, pale slippery sand and small rocks the orbiter cannot see. The rover counts wheel turns to know where it is, so when the wheels slip its count is wrong.',
    tip: 'Switch on Hazard avoidance so the rover steers round hidden rocks itself, and Visual odometry so it measures real movement from its cameras. When a picture arrives, compare the blue "real spot" with where the rover thinks it is.',
  },
  {
    name: 'Legend',
    who: '14 and up — a real mission-planning challenge',
    what: 'One whole Mars day. Four targets worth different points, a solar battery that charges only when the Sun is high, and relay passes that carry only 40, 60 and 40 MB. Score is the science that reaches Earth, plus energy left for the night. Every map has a par score from our solver: ★ needs 40% of it (about two targets home), ★★ 60% and ★★★ 85%.',
    tip: 'At dawn the heaters are still running and the Sun is weak, so driving straight away drains the battery fast: think about a Wait or the Power guard. Time your samples so their data catches a relay pass. AutoNav needs good position knowledge, so pair it with Visual odometry. Pictures cost bandwidth: take one only when it changes a decision.',
  },
]

export default function MarsRoverPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(learningLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />

      <MarsRoverClient />

      <article className="mx-auto max-w-4xl px-4 pb-16 pt-8 text-[#EEF2F8]">
        <h2 className="font-display text-3xl font-black text-white">Why you cannot drive a Mars rover with a joystick</h2>
        <p className="mt-3 text-[#A7B0C0]">
          Radio waves travel at the speed of light, about 300,000 km every second. That sounds instant, but Mars is far away. When Earth and Mars
          are closest, a message takes about <strong className="text-white">3 minutes</strong> to cross the gap. When they are on opposite sides of
          the Sun it takes about <strong className="text-white">22 minutes</strong>. A question and its answer can take more than 40 minutes. If you
          steered a rover like a remote-control car, it would drive off a cliff long before your &ldquo;stop!&rdquo; arrived.
        </p>
        <p className="mt-3 text-[#A7B0C0]">
          So rover teams work the other way round. Each Mars day (a <em>sol</em>, 24 hours and 39 minutes long) they study the newest pictures, plan a
          whole list of commands, check it in a simulator, and send it in one go. The rover then works through the list on its own. Everything the
          team sees on their screens is already old: a picture shows where the rover <em>was</em> when it was taken, not where it is now.
        </p>

        <h2 className="mt-10 font-display text-2xl font-black text-white">Dead reckoning, wheel slip and visual odometry</h2>
        <p className="mt-3 text-[#A7B0C0]">
          There is no GPS on Mars. A rover works out where it is by counting how many times its wheels have turned, a method sailors called{' '}
          <strong className="text-white">dead reckoning</strong>. On firm ground it works well. On loose sand the wheels can spin while the rover hardly
          moves, so the count says it has gone further than it really has. That error is called <strong className="text-white">slip</strong>, and it
          adds up with every metre. Since 2004 Mars rovers have used <strong className="text-white">visual odometry</strong>: they take pictures as they
          drive and track how rocks and pebbles move between frames, which tells them how far they really travelled. It is slower, because the
          computer has to compare the images, so teams use it where slip is likely.
        </p>

        <h2 className="mt-10 font-display text-2xl font-black text-white">Robots that decide for themselves</h2>
        <p className="mt-3 text-[#A7B0C0]">
          Orbiters such as the Mars Reconnaissance Orbiter photograph the ground in great detail and can spot large boulders, dunes and slopes. They
          cannot see every small rock that could stop a wheel. That is why rovers carry <strong className="text-white">hazard cameras</strong> and
          rules that run without asking Earth. NASA&apos;s Perseverance rover, which landed in Jezero Crater in 2021, has{' '}
          <strong className="text-white">AutoNav</strong>: it builds a 3-D map of the ground in front of it, marks what is unsafe, chooses a path and
          keeps checking while it drives. With it, Perseverance has driven more than 300 metres in a single sol. Rovers also run{' '}
          <strong className="text-white">AEGIS</strong>, software that picks interesting rocks by itself and zaps them with a laser to measure what
          they are made of. Cameras see shapes, not softness, so a deep patch of sand can still fool a rover: Spirit became stuck in soft soil in
          2009 and never drove again.
        </p>
        <p className="mt-3 text-[#A7B0C0]">
          Power and data are budgets too. Spirit and Opportunity ran on solar panels, so they charged only when the Sun was high and needed energy
          left over to keep their electronics warm through nights colder than −70 °C. (Perseverance uses a nuclear power source instead, but its
          daily energy is still limited.) Most data travels home through orbiters that pass overhead a few times a day, and each pass can carry only
          so much, so the team must choose which pictures and measurements to send first.
        </p>

        <h2 className="mt-10 font-display text-2xl font-black text-white">What the game simulates</h2>
        <p className="mt-3 text-[#A7B0C0]">
          Mars Rover Command is a real simulation, not a quiz. The map is built from seeded noise, so it has hills, slopes, sand fields, dunes and
          craters, and every map is checked to have a safe route. Each square is 5 metres and the rover drives one square in 2 minutes, about the top
          speed of a real Mars rover. Commands reach Mars only after the delay; the rover runs them step by step; reports and pictures come back
          after the delay again, and that is all you ever see while playing. Slip on sand is modelled cell by cell, so a rover without visual
          odometry really does lose track of where it is. In Legend the battery charges with the angle of the Sun and drains with every drive and with the heaters that keep the rover warm in the cold morning,
          and data leaves Mars only during relay passes. Time is sped up so a mission fits in a few minutes, and the clock pauses while you plan.
          After each round a debrief explains why things happened, and the map reveals where the rover really drove.
        </p>

        <h2 className="mt-10 font-display text-2xl font-black text-white">The four tiers, and tips for each</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {TIERS.map((t) => (
            <section key={t.name} className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4">
              <h3 className="font-display text-xl font-black text-amber-300">{t.name}</h3>
              <p className="text-xs font-bold uppercase tracking-wide text-[#6E7888]">For {t.who}</p>
              <p className="mt-2 text-[#EEF2F8]">{t.what}</p>
              <p className="mt-2 text-sm text-[#A7B0C0]">
                <span className="font-black text-white">Tip: </span>
                {t.tip}
              </p>
            </section>
          ))}
        </div>

        <h2 className="mt-10 font-display text-2xl font-black text-white">Where you will see this in real life</h2>
        <p className="mt-3 text-[#A7B0C0]">
          The same ideas steer robots on Earth wherever a human cannot react in time: delivery robots that pause for a pedestrian, underwater robots
          that cannot receive radio at all, and robot vacuums that track their wheels and correct with a camera. The further a robot is from its
          people, the more it has to think for itself. Planning ahead, checking your position with more than one sensor and writing good rules are
          exactly the skills real rover drivers use every sol.
        </p>
        <p className="mt-6">
          <Link href="/kids" className="font-bold text-amber-300 underline-offset-4 hover:underline">
            ← Back to the R2BOT Universe
          </Link>
        </p>
        <GameTeacherStrip game={{ id: 'mars-rover', name: getGame('mars-rover')?.name ?? 'R2BOT Kids game' }} />
      </article>
    </>
  )
}
