// app/kids/play/circuit-city/page.tsx — Circuit City (server component)
// The game is a client island loaded with next/dynamic; everything a parent,
// teacher or search engine needs — what real electronics is, how the game
// models it, and tips for every tier — is rendered here on the server.

import type { Metadata } from 'next'
import Link from 'next/link'
import { GameTeacherStrip } from '@/components/kids/games/GameTeacherStrip'
import { getGame } from '@/lib/kids/universe/worlds'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import CircuitCityClient from '@/components/kids/games/circuit-city/CircuitCityClient'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/play/circuit-city`

const TITLE = 'Circuit City: Electronics Game for Kids with a Real Circuit Simulator'
const DESCRIPTION =
  "Build real circuits to power a city: batteries, switches, LEDs, resistors, motors and light sensors on a breadboard. Kids learn complete circuits, series vs parallel, Ohm's law and voltage dividers — four tiers from age 7 to 17."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Circuit City — wire up a city with real electronics',
    description: "Complete circuits, series vs parallel, Ohm's law and an automatic night-light. A real circuit solver, four tiers from Cadet to Legend.",
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Circuit City electronics game' }],
  },
}

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'Circuit City',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive simulation',
  educationalLevel: 'Ages 7–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: ['Complete (closed) circuits', 'Series and parallel circuits', "Ohm's law", 'LED current limiting', 'Short circuits', 'Voltage dividers and light sensors', 'Comparators'],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Circuit City', path: '/kids/play/circuit-city' },
])

const TIERS = [
  {
    name: 'Cadet',
    who: 'about 7 and up, with a grown-up if needed',
    what: 'Light up a family’s house. Draw wires from the battery to the house light so they make one complete loop, then add a switch so the light can be turned off.',
    tip: 'Follow the path with your finger: out of the battery’s + end, through the light, and back into the − end. If there is a gap anywhere, nothing flows. A switch is just a gap you can open and close.',
  },
  {
    name: 'Pilot',
    who: 'about 9 and up',
    what: 'Power three LED streetlights from a 6 V battery so they all shine brightly — and so the other two stay on when a storm knocks one out.',
    tip: 'Try the lamps in a single row first and see what happens. In series they share the 6 V, and every LED needs about 2 V just to start glowing. Build a ladder instead: a + rail, a − rail, and each lamp as its own rung. Mind the + leg: LEDs only work one way round.',
  },
  {
    name: 'Ace',
    who: 'about 11 and up',
    what: 'Keep a bare red LED shop sign between 10 and 20 milliamps by choosing its resistor, and make a motor turn the Ferris wheel at the same time.',
    tip: 'Ohm’s law: the resistor must drop the voltage the LED does not use. R = (V − Vf) ÷ I = (6 − 2) ÷ 0.015 ≈ 267 Ω, so pick the nearest real value. Give the motor its own parallel path: it needs hundreds of milliamps and would starve if it shared the LED’s resistor.',
  },
  {
    name: 'Legend',
    who: '14 and up — a real design challenge',
    what: 'Design an automatic night-light: a light sensor (LDR) and a resistor form a voltage divider, a comparator watches the divider’s middle voltage and switches a white LED on when it gets dark. Daytime power must stay under 10 mW.',
    tip: 'Work out the divider voltage at 100 lux and at 10 lux and put your threshold between them. Then check the power: P = V² ÷ R, so a 10 kΩ divider wastes about a hundred times less than a 100 Ω one. The white LED needs about 3 V, so its resistor is (4.5 − 3) ÷ 0.015 = 100 Ω.',
  },
]

export default function CircuitCityPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(learningLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />

      <CircuitCityClient />

      <article className="mx-auto max-w-4xl px-4 pb-16 pt-8 text-[#A7B0C0]">
        <h2 className="font-display text-3xl font-black text-white">How electricity powers a city</h2>
        <p className="mt-3">
          Every light, phone charger and robot runs on the same simple idea: a <strong className="text-white">circuit</strong> is a complete loop. A
          battery pushes electric charge out of its + end, the charge flows through wires and parts, and it returns to the − end. The push is called{' '}
          <strong className="text-white">voltage</strong> (measured in volts, V). The flow is called <strong className="text-white">current</strong>{' '}
          (measured in amps, A, or milliamps, mA — thousandths of an amp). Anything that slows the flow has{' '}
          <strong className="text-white">resistance</strong> (measured in ohms, Ω). Break the loop anywhere and the current stops everywhere in it.
          That is all a switch does: it opens a gap.
        </p>
        <p className="mt-3">
          The three are tied together by <strong className="text-white">Ohm’s law</strong>:{' '}
          <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-amber-200">V = I × R</code>. Double the voltage and the current doubles;
          double the resistance and it halves. Robot builders use it every day — to keep LEDs safe, to read sensors and to make sure a motor gets the
          current it needs.
        </p>

        <h2 className="mt-10 font-display text-2xl font-black text-white">Series and parallel</h2>
        <p className="mt-3">
          Parts in <strong className="text-white">series</strong> sit one after another on a single path. The same current goes through all of them,
          and they share the battery’s voltage. If one breaks, the path is broken and everything goes off — like old fairy lights. Parts in{' '}
          <strong className="text-white">parallel</strong> each have their own path between the same two points, so each gets the full voltage and
          one failing does not affect the others. Homes and streets are wired in parallel for exactly that reason.
        </p>

        <h2 className="mt-10 font-display text-2xl font-black text-white">LEDs, resistors and short circuits</h2>
        <p className="mt-3">
          An LED (light-emitting diode) is a one-way valve for current: it only conducts from its longer + leg (the anode) to its − leg (the cathode),
          and it needs a minimum voltage before it starts — about 2 V for red and 3 V for white. Above that, its current climbs very steeply, so an LED
          wired straight to a battery takes far too much current and burns out. A <strong className="text-white">resistor</strong> in series limits
          the current. Most small LEDs are rated for about 20 mA.
        </p>
        <p className="mt-3">
          A <strong className="text-white">short circuit</strong> is a path from + to − with almost no resistance. The current is limited only by the
          battery’s own internal resistance, so several amps can flow: the wire and battery get hot and the battery empties fast. In real life that can
          melt wires or start a fire, which is why circuits have fuses.
        </p>

        <h2 className="mt-10 font-display text-2xl font-black text-white">What the game simulates</h2>
        <p className="mt-3">
          Circuit City contains a real circuit solver. Every time you change anything, it uses <strong className="text-white">nodal analysis</strong>{' '}
          — the method in every electronics textbook and in professional simulators like SPICE — to calculate the voltage at every dot on the board and
          the current through every part. Batteries have realistic internal resistance (about 0.15 Ω per AA cell), LEDs switch on at their forward
          voltage and are modelled piecewise, motors and buzzers behave like their real resistance, and the light sensor follows the curve of a real
          LDR (about 10 kΩ at 10 lux, a few hundred ohms in daylight). The yellow dots move at a speed proportional to the current, and wire colour
          shows voltage. The multimeter reads the same numbers a real one would.
        </p>
        <p className="mt-3">
          The comparator in the Legend tier is a module: a comparator chip that watches one voltage and drives an electronic switch, like the ones in
          real automatic streetlights. After every test, the debrief explains what happened and why, using your own measured numbers.
        </p>

        <h2 className="mt-10 font-display text-2xl font-black text-white">The four tiers, and tips for each</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {TIERS.map((t) => (
            <section key={t.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="font-display text-xl font-black text-amber-300">{t.name}</h3>
              <p className="text-xs font-bold uppercase tracking-wide text-white/50">For {t.who}</p>
              <p className="mt-2">{t.what}</p>
              <p className="mt-2 text-sm text-white/75">
                <span className="font-black text-white">Tip: </span>
                {t.tip}
              </p>
            </section>
          ))}
        </div>

        <h2 className="mt-10 font-display text-2xl font-black text-white">Where you will see this in real life</h2>
        <p className="mt-3">
          A robot’s status LEDs each have their own current-limiting resistor. Its motors run on a separate, heavier circuit so they cannot starve the
          electronics. Its light and distance sensors are often read through voltage dividers, and comparators or microcontrollers turn those voltages
          into decisions. Automatic streetlights, garden lights and phone screens that dim in the dark all use the same light-sensing idea you build in
          the Legend tier.
        </p>
        <p className="mt-6">
          <Link href="/kids" className="font-bold text-amber-300 underline-offset-4 hover:underline">
            ← Back to the R2BOT Universe
          </Link>
        </p>
        <GameTeacherStrip game={{ id: 'circuit-city', name: getGame('circuit-city')?.name ?? 'R2BOT Kids game' }} />
      </article>
    </>
  )
}
