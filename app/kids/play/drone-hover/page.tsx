// app/kids/play/drone-hover/page.tsx — Sky Port: Drone Pilot (server component)
// The game is a client island loaded with next/dynamic; everything a parent,
// teacher or search engine needs — what the real engineering is, how the game
// models it, and tips for every tier — is rendered here on the server.

import type { Metadata } from 'next'
import Link from 'next/link'
import { GameTeacherStrip } from '@/components/kids/games/GameTeacherStrip'
import { getGame } from '@/lib/kids/universe/worlds'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import DroneHoverClient from '@/components/kids/games/drone-hover/DroneHoverClient'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/play/drone-hover`

const TITLE = 'Drone Pilot Game for Kids: Learn PID Control by Tuning a Drone'
const DESCRIPTION =
  'Keep a drone steady through wind gusts and heavy parcels by designing its brain. Kids learn hover (thrust = weight), P, I and D control, overshoot and cascaded control in a real physics simulator — four tiers from age 8 to 17.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Sky Port: Drone Pilot — tune a drone’s brain',
    description: 'Hover, PID tuning and cascaded control with real drone physics. Four tiers, Cadet to Legend.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Sky Port drone game' }],
  },
}

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Sky Port: Drone Pilot',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive simulation',
  educationalLevel: 'Ages 8–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: ['Hover: thrust equals weight', 'Proportional control and steady-state error', 'PID control', 'Overshoot and settling time', 'Cascaded control loops'],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Sky Port: Drone Pilot', path: '/kids/play/drone-hover' },
])

const TIERS = [
  {
    name: 'Cadet',
    who: 'about 8 and up, with a grown-up if needed',
    what: 'You are the brain. Move the throttle until the drone hangs still in the green band, then do it again when a parcel makes it heavier.',
    tip: 'Watch the thrust gauge, not the drone. When the blue bar sits on the red weight line the drone stops climbing or falling. Make small changes and wait a moment: the motors take a fraction of a second to spin up.',
  },
  {
    name: 'Pilot',
    who: 'about 10 and up',
    what: 'The drone flies itself with a proportional (P) controller. You choose one number, Kp, then a parcel clips on and the target jumps from 3 m to 5 m. To win, finish within 30 cm of the target without overshooting it by more than 75 cm.',
    tip: 'With P alone, extra weight leaves a sag of (extra weight ÷ Kp). A bigger Kp shrinks the sag, but too big and every correction overshoots. Use the dotted prediction line to find the sweet spot.',
  },
  {
    name: 'Ace',
    who: 'about 12 and up',
    what: 'Full PID control through gusts, a heavier parcel, a sudden downdraft and two target changes. To win, the drone must finish within 6 cm of the target with a flight score of at least 550.',
    tip: 'Start with P and D only and get a clean step without wobble. Then add a little I to remove the leftover sag. Too much I makes slow, wide swings. Watch the green I line on the graph grow while the parcel is on.',
  },
  {
    name: 'Legend',
    who: '14 and up — a real engineering challenge',
    what: 'A two-dimensional waypoint course. Three loops work together: an inner loop holds the tilt, an outer loop chooses the tilt to move sideways, and a PID loop holds the height. The parcel drops halfway and the battery sags as it empties. Finishing the course is not enough: a win needs a flight score of at least 520.',
    tip: 'Tune from the inside out. Make the tilt loop fast and well damped first (a drone that wobbles in tilt cannot fly anywhere). Then tune the position loop several times slower. Finally add I to the height loop for the battery sag and the lighter drone after the drop.',
  },
]

export default function DroneHoverPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(learningLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />

      <DroneHoverClient />

      <article className="mx-auto max-w-4xl px-4 pb-16 pt-8 text-gray-200">
        <h2 className="text-3xl font-black text-white">How a drone holds still in the air</h2>
        <p className="mt-3 text-slate-200">
          A hovering drone looks calm, but its computer is working hundreds of times a second. Gravity pulls the drone down with a force called its{' '}
          <strong>weight</strong> (mass × 9.81 m/s²). The spinning propellers push air down, and the air pushes the drone up: that push is{' '}
          <strong>thrust</strong>. When thrust is exactly equal to weight, the forces cancel and the drone neither climbs nor falls. That is what
          hovering means. More thrust than weight and it speeds up upward; less and it speeds up downward.
        </p>
        <p className="mt-3 text-slate-200">
          The hard part is that nothing stays the same. A gust of wind pushes the drone, a parcel makes it heavier, and the battery slowly gets weaker.
          No fixed throttle can cope with all that. So real drones use <strong>feedback control</strong>: they measure their height, compare it with
          the height they want, and change the thrust based on the difference. That difference is called the <strong>error</strong>.
        </p>

        <h2 className="mt-10 text-2xl font-black text-white">P, I and D: three ways to fix an error</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-200">
          <li>
            <strong>P (proportional)</strong> pushes in proportion to the error right now: twice as far from the target, twice the push. P alone has a
            weakness: to hold up a heavier parcel it needs extra thrust, and the only way P makes extra thrust is by keeping some error. The drone
            settles a little too low. Engineers call this <em>steady-state error</em>.
          </li>
          <li>
            <strong>I (integral)</strong> adds up the error over time. As long as the drone sits too low, the I push keeps growing until the error is
            gone. That is how drones hold their height when the payload or battery changes.
          </li>
          <li>
            <strong>D (derivative)</strong> looks at how fast the error is changing and pushes against fast movement, like a brake. It stops the
            drone from overshooting the target and wobbling. Too much D makes the drone jittery, because it also reacts to sensor noise.
          </li>
        </ul>
        <p className="mt-3 text-slate-200">
          Written as engineers write it: <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-amber-200">u = Kp·e + Ki·∫e dt + Kd·de/dt</code>
          . The three numbers Kp, Ki and Kd are the <em>gains</em>, and choosing them is called <strong>tuning</strong>. The same controller, the PID
          controller, steers cars, holds the temperature in ovens and keeps robot arms on their path. Most hobby and professional drone flight
          controllers use PID loops at their heart.
        </p>

        <h2 className="mt-10 text-2xl font-black text-white">What the game simulates</h2>
        <p className="mt-3 text-slate-200">
          Sky Port is a real physics simulation, stepped 200 times a second. The drone has mass and feels gravity. Each motor takes a moment to
          change speed (motor lag), which is the reason too much P makes it overshoot and ring. Air resists motion, and gusts follow the smooth
          &ldquo;1 − cosine&rdquo; shape aircraft engineers use. Power is worked out from rotor momentum theory, so a twitchy controller really does
          use more energy. In Legend the battery voltage sags as it empties and under heavy load, and the motors lose thrust with it. The battery is sped up: a real 1 kg
          drone carries about 40–80 watt-hours and sags over 10–15 minutes, so the game uses a tiny 3 Wh pack to show the same sag in one
          80-second course. Sensors are
          slightly noisy at Ace and Legend, just like a real barometer. The gusts are the same every time you fly a tier, so your score depends only
          on your design.
        </p>
        <p className="mt-3 text-slate-200">
          Flights are scored on what control engineers measure: the <strong>error area</strong> (how far off, for how long), the{' '}
          <strong>overshoot</strong> past a new target, the <strong>settle time</strong>, and the <strong>energy</strong> used. After every flight the
          debrief explains why it happened, so you can see the cause in the graph and change one thing at a time.
        </p>

        <h2 className="mt-10 text-2xl font-black text-white">The four tiers, and tips for each</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {TIERS.map((t) => (
            <section key={t.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-xl font-black text-amber-300">{t.name}</h3>
              <p className="text-xs font-bold uppercase tracking-wide text-white/50">For {t.who}</p>
              <p className="mt-2 text-slate-200">{t.what}</p>
              <p className="mt-2 text-sm text-white/75">
                <span className="font-black text-white">Tip: </span>
                {t.tip}
              </p>
            </section>
          ))}
        </div>

        <h2 className="mt-10 text-2xl font-black text-white">Where you will see this in real life</h2>
        <p className="mt-3 text-slate-200">
          Delivery drones carry parcels of different weights and must hold height when they let go. Camera drones hold position in the wind so the
          video stays steady. Rockets that land themselves use the same ideas of feedback and cascaded loops, only much faster. Next time you see a
          drone hang perfectly still, you will know there is a loop inside it measuring, comparing and correcting — the same loop you designed here.
        </p>
        <p className="mt-6">
          <Link href="/kids" className="font-bold text-amber-300 underline-offset-4 hover:underline">
            ← Back to the R2BOT Universe
          </Link>
        </p>
        <GameTeacherStrip game={{ id: 'drone-hover', name: getGame('drone-hover')?.name ?? 'R2BOT Kids game' }} />
      </article>
    </>
  )
}
