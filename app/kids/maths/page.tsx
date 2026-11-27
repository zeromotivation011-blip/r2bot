// app/kids/maths/page.tsx — Robot Maths: "the maths inside" (roadmap #86).
// Server component, indexable. Six robotics concepts, each with the maths it
// uses at every band, and one Skill Galaxy activity per band. Data:
// lib/kids/maths/concepts.ts; activities: lib/kids/activities/content/maths.ts.

import type { Metadata } from 'next'
import Link from 'next/link'
import MathsBandFocusClient from '@/components/kids/maths/MathsBandFocusClient'
import { breadcrumbJsonLD, jsonldScript } from '@/lib/seo/jsonld'
import { KIDS_BANDS } from '@/lib/kids/bands'
import { MATHS_BAND_TOPICS, MATHS_CONCEPTS } from '@/lib/kids/maths/concepts'
import { numberWord } from '@/lib/kids/universe/worlds'

export const runtime = 'nodejs'

const BASE = 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/maths`
const TITLE = 'Robot Maths for Kids and Teens: the Maths Inside Real Robots'
const DESCRIPTION =
  'The maths robots really use, at every age: counting steps and left/right (5–7), coordinates and headings (8–10), ratios, percentages and graphs (11–13), and vectors, trigonometry for a robot arm and averaging noisy sensors (14–17). Worked examples and hands-on missions.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'R2BOT Kids — Robot Maths: the maths inside',
    description: DESCRIPTION,
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids Robot Maths' }],
  },
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Robot Maths', path: '/kids/maths' },
])

const listLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Robot Maths: the maths inside robots',
  url: PAGE_URL,
  numberOfItems: MATHS_CONCEPTS.length,
  itemListElement: MATHS_CONCEPTS.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.title, url: `${PAGE_URL}/${c.id}` })),
}

const link = 'rounded font-semibold text-amber-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

export default function RobotMathsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(listLd) }} />
      <div className="mx-auto w-full max-w-6xl px-3 pb-24 pt-4 sm:px-5">
        <nav aria-label="Breadcrumb" className="text-[15px] text-[#A7B0C0]">
          <Link href="/kids" className="inline-flex min-h-[44px] items-center rounded-lg hover:text-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
            ← R2BOT Kids
          </Link>
        </nav>
        <header className="mb-6 mt-1">
          <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-amber-300">Robot Maths</p>
          <h1 className="mt-1 font-display text-[34px] font-bold leading-tight text-[#EEF2F8] sm:text-5xl">The maths inside robots</h1>
          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-[#A7B0C0]">
            Every robot runs on maths. Counting tells it how far to go, angles tell it which way to face, ratios make its gears strong, and averages
            let it trust a noisy sensor. Pick a robot idea and see the maths inside it, at your age, then try it in a mission.
          </p>
          <div className="mt-4">
            <MathsBandFocusClient anchorPrefix="" />
          </div>
        </header>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MATHS_CONCEPTS.map((c) => (
            <li key={c.id}>
              <Link
                href={`/kids/maths/${c.id}`}
                className="group flex h-full min-h-[44px] flex-col rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] transition hover:-translate-y-0.5 hover:border-white/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <span aria-hidden className="text-4xl">{c.emoji}</span>
                <span className="mt-2 font-display text-xl font-bold text-[#EEF2F8] group-hover:text-amber-300">{c.title}</span>
                <span className="mt-1 text-[16px] leading-snug text-[#A7B0C0]">{c.hook}</span>
                <span className="mt-3 text-[14px] text-cyan-300">Four levels of maths · four missions</span>
              </Link>
            </li>
          ))}
        </ul>

        <article className="mt-12 max-w-4xl text-[17px] leading-relaxed text-[#A7B0C0]">
          <h2 className="font-display text-2xl font-bold text-[#EEF2F8]">The same robot, four levels of maths</h2>
          <p className="mt-3">
            R2BOT Kids has four age groups. Each Robot Maths page shows all four, so a younger child can see where the maths is going and an older one can
            see where it came from. The robot stays the same; only the maths grows.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {KIDS_BANDS.map((b) => (
              <li key={b.id} id={b.id} data-maths-band={b.id} className="scroll-mt-24 rounded-2xl border border-white/[0.08] bg-[#111C32] p-4 data-[your-band]:border-amber-400/70">
                <p className="font-display text-lg font-bold text-[#EEF2F8]">
                  {b.name} <span className="text-[15px] font-semibold text-[#A7B0C0]">ages {b.ages}</span>
                </p>
                <p className="mt-1 text-[16px]">{MATHS_BAND_TOPICS[b.id]}.</p>
              </li>
            ))}
          </ul>

          <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">Why maths through robots?</h2>
          <p className="mt-3">
            Plenty of young people decide early that they are “not a maths person”, and some rule out engineering because of it. Robots change the
            question. Maths stops being a page of sums and becomes the reason the rover reaches the rock, the gripper closes on the cup and the drone
            stays level. When a 9-year-old turns a robot to face west, they have just added angles. When a 16-year-old works out where a robot arm’s
            hand is, they are using the same trigonometry as the arm on a space station.
          </p>
          <p className="mt-3">
            Each of the {numberWord(MATHS_CONCEPTS.length)} pages has a short explanation for every age, a worked example with every step shown, a small
            interactive to play with, an idea to try away from the screen, and a matching mission in the{' '}
            <Link href="/kids/galaxy" className={link}>
              Skill Galaxy
            </Link>
            . The missions are real puzzles with real checking: a program that must print the right heading, a gearbox that must hit a speed, a graph
            that must be read correctly. Getting one wrong gives a kind, specific hint, and stars come from finishing, never from comparing with anyone
            else.
          </p>

          <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">For parents and teachers</h2>
          <p className="mt-3">
            The topics follow what schools teach at each age: counting and direction in the early years, coordinates, angles and multiplication in
            the middle years, ratio, proportion, percentages and graphs at 11–13, and vectors, trigonometry and statistics at 14–17. Every worked
            example on these pages is checked automatically, so the numbers are right. The pages work as short starters for a lesson, and the
            missions as practice; children need no account and give no personal details. Teachers will find more classroom material in{' '}
            <Link href="/kids/teach" className={link}>
              R2BOT Kids for teachers
            </Link>
            .
          </p>
        </article>
      </div>
    </>
  )
}
