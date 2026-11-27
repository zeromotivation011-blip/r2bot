// app/kids/lab/power/page.tsx — Power Lab (roadmap #39), server component.
// The teaching text is rendered here on the server; the pack builder, sag graph
// and solar sizer are a light client island, and the battery-powered simulator
// inside it loads Rapier, three.js and Blockly only through next/dynamic.

import type { Metadata } from 'next'
import PowerLabClient from '@/components/kids/sim/PowerLabClient'
import { PresentButton } from '@/components/kids/present/PresentButton'
import { breadcrumbJsonLD, jsonldScript } from '@/lib/seo/jsonld'

export const runtime = 'nodejs'

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/lab/power`

const TITLE = 'Robot Battery Lab for Kids: Series, Parallel, Voltage Sag and Solar'
const DESCRIPTION =
  'Build a battery pack from cells in series and parallel, watch voltage sag under load, size a solar panel for a garden robot, then drive a real-physics robot home to its charger before the battery runs flat. Ages 8–17.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'Power Lab — how robots use batteries',
    description: 'Series and parallel packs, voltage sag, solar sizing and a battery-powered robot simulator.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Power Lab' }],
  },
}

const learningLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: 'R2BOT Power Lab',
  description: DESCRIPTION,
  url: PAGE_URL,
  learningResourceType: 'Interactive simulation',
  educationalLevel: 'Ages 8–17',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'children' },
  teaches: ['Cells in series and parallel', 'Battery capacity and energy (mAh and Wh)', 'Internal resistance and voltage sag', 'Sizing a solar panel and battery', 'Planning a robot route within an energy budget'],
  isAccessibleForFree: true,
  inLanguage: 'en',
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Power Lab', path: '/kids/lab/power' },
])

export default function PowerLabPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(learningLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />
      <header className="mx-auto max-w-6xl px-4 pb-4 pt-6">
        <p className="text-sm font-black uppercase tracking-wider text-amber-300">R2BOT Kids · Power Lab</p>
        <h1 className="mt-1 font-display text-3xl font-black text-white sm:text-4xl">How robots use batteries</h1>
        <p className="mt-2 max-w-3xl text-lg text-slate-200">
          Energy is the limit every real robot engineer fights. A Mars rover, a vacuum robot and a delivery drone all ask the same questions: how much energy do I carry,
          how fast do I spend it, and can I get back to the charger in time? Build a pack, load it, power it with the sun, then drive a robot home before it runs flat.
        </p>
        <div className="mt-3">
          <PresentButton source={{ kind: 'sim', id: 'power' }} />
        </div>
      </header>

      <PowerLabClient />

      <article className="mx-auto max-w-4xl space-y-5 px-4 pb-16 text-slate-200">
        <h2 className="font-display text-2xl font-black text-white">What you are learning</h2>
        <section>
          <h3 className="text-lg font-black text-white">Series and parallel</h3>
          <p>
            One cell gives a small voltage: about 1.2 V for a rechargeable AA, 1.5 V for an alkaline AA and 3.6 V for a lithium-ion cell. Put cells in a row, plus to minus,
            and their voltages add: four 1.2 V cells in series make 4.8 V, enough for the small motors in the simulator. Put rows side by side and the voltage stays the same,
            but the capacity (how long the pack lasts, measured in milliamp-hours) adds, and so does the current the pack can safely give. Engineers write this as 4S2P: four in
            series, two in parallel.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-black text-white">Voltage sag and brownouts</h3>
          <p>
            A battery is not a perfect source. It has a little resistance inside, so when a robot pulls a big current, some voltage is lost inside the battery itself (current
            times resistance). Motors pull the most when they start, push something heavy or climb. If the voltage dips too low, the robot’s computer can switch off for a
            moment: a brownout. Alkaline cells sag far more than rechargeable NiMH or lithium cells, and adding cells in parallel halves the resistance, which is why real
            robots use them.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-black text-white">Where the energy goes</h3>
          <p>
            In the simulator the battery drains from three places, just like a real robot. The computer and sensors draw a small current all the time, even while the robot
            waits, and a light or a camera draws more. Each motor draws current in proportion to how hard it pushes: a heavier body, a thick rug, a slope or a load in the claw all
            cost more. A slow robot is not automatically thrifty: it pays the computer’s current for longer. The Flight Recorder’s battery graph shows the current jump at every
            start and the voltage dip that comes with it.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-black text-white">Solar sizing</h3>
          <p>
            A solar robot must collect each day the energy it spends each day. Energy is power times time (watts × hours = watt-hours). The sky gives a number of “full-sun
            hours” — about one and a half on a cloudy winter day and up to seven in a desert — and a real panel loses about a quarter of its rating to heat, dust and the
            charger. The battery must also carry the robot through the night and any cloudy days, and engineers use only about 80 % of it so it lasts for years.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-black text-white">Return to charger</h3>
          <p>
            Robot vacuums and warehouse robots watch their own battery and head home before it is empty. In the challenges your program can read 🔋 battery %, so you can write
            “if the battery is below 30 %, go home”. Plan the route, drive smoothly, and stop on the charging pad to fill up. The numbers here are typical values for real cells;
            real batteries also change with temperature, age and brand.
          </p>
        </section>
      </article>
    </>
  )
}
