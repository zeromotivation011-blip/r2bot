// app/kids/printables/page.tsx — Make It at Home (roadmap #44), formerly /kids/activities
// (308 in next.config.mjs, roadmap #6). Server component, indexable: kitchen-table
// robotics builds for homes and classrooms, grouped by the youngest band that can
// do them, each with an adult-safety note, a "try one change" fair test, an
// "I built it" check-in and a link to the real robot in the Robodex.
// Data: lib/kids/builds/builds.ts (checked by lib/kids/builds/verify.ts).

import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbJsonLD, jsonldScript } from '@/lib/seo/jsonld'
import { BAND_ORDER, HAZARDS, HOME_BUILDS } from '@/lib/kids/builds/builds'
import { KIDS_BANDS } from '@/lib/kids/bands'
import { TRACKS } from '@/lib/kids/activities/types'
import { WORLDS } from '@/lib/kids/universe/worlds'
import PrintStyles from '@/components/kids/portfolio/PrintStyles'
import BuiltTicksClient from './BuiltTicksClient'
import PrintButtonClient from './PrintButtonClient'

const BASE = 'https://www.r2bot.in'
const PAGE_URL = `${BASE}/kids/printables`
const TITLE = 'Make It at Home: Robotics Builds for Kids With Household Materials'
const DESCRIPTION = `${HOME_BUILDS.length} kitchen-table robotics builds for ages 5–17: a cardboard robot hand, a bristlebot, a paper-cup echo test, a syringe hydraulic arm, a lemon battery LED and more. Each has an adult-safety note, a fair test and the real robot that uses the same idea.`

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'R2BOT',
    title: 'R2BOT Kids — Make It at Home',
    description: DESCRIPTION,
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Kids Make It at Home' }],
  },
}

const crumbs = breadcrumbJsonLD([
  { name: 'R2BOT Kids', path: '/kids' },
  { name: 'Make It at Home', path: '/kids/printables' },
])

const trackName = (id: string) => TRACKS.find((t) => t.id === id)?.name ?? id
const worldName = (id: string | undefined) => (id ? WORLDS.find((w) => w.id === id)?.name : undefined)

export default function PrintablesPage() {
  const listLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'R2BOT Kids Make It at Home builds',
    url: PAGE_URL,
    numberOfItems: HOME_BUILDS.length,
    itemListElement: HOME_BUILDS.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.title, url: `${PAGE_URL}/${b.id}` })),
  }
  const groups = BAND_ORDER.map((band) => ({ band: KIDS_BANDS.find((k) => k.id === band)!, builds: HOME_BUILDS.filter((b) => b.minBand === band) }))
  const adultCount = HOME_BUILDS.filter((b) => b.adultRequired).length

  return (
    <>
      <PrintStyles />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(listLd) }} />
      <div className="print-sheet mx-auto w-full max-w-6xl px-4 pb-24 pt-6">
        <header className="max-w-3xl">
          <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-amber-300">R2BOT Kids · Make It at Home</p>
          <h1 className="mt-1 font-display text-[34px] font-bold leading-tight text-[#EEF2F8] sm:text-5xl">Build real robot ideas at the kitchen table</h1>
          <p className="mt-3 text-lg leading-relaxed text-[#A7B0C0]">
            {HOME_BUILDS.length} builds made from things most homes and classrooms already have: card, tape, paper cups, straws, a few
            coins. Each one is a real robotics idea you can hold in your hands — a hand that grips with tendons, a bottle diver that
            controls its buoyancy, a lever, a sensor, a map. When you have built one, tell Spark with the “I built it” check-in and it
            goes into your portfolio as a project.
          </p>
          <div className="no-print mt-4 flex flex-wrap gap-3">
            <Link href="/kids/portfolio" className="inline-flex min-h-[48px] items-center rounded-2xl bg-amber-500 px-5 font-display font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
              My portfolio →
            </Link>
            <PrintButtonClient label="Print this list" />
          </div>
          <BuiltTicksClient total={HOME_BUILDS.length} cardByBuild={Object.fromEntries(HOME_BUILDS.map((b) => [b.id, b.robodex]))} />
        </header>

        {groups.map(({ band, builds }) => (
          <section key={band.id} aria-labelledby={`band-${band.id}`} className="mt-10">
            <h2 id={`band-${band.id}`} className="font-display text-2xl font-bold text-[#EEF2F8]">
              <span aria-hidden>{band.emoji} </span>From {band.name} ({band.ages})
            </h2>
            <p className="mt-1 text-[15px] text-[#A7B0C0]">Older children can do every build in this group too, and each page has a “go deeper” part for ages 11–17.</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {builds.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/kids/printables/${b.id}`}
                    data-build={b.id}
                    className="group flex h-full min-h-[132px] flex-col rounded-[20px] border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] transition hover:-translate-y-0.5 hover:border-amber-400/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-reduce:transform-none"
                  >
                    <span className="flex items-start gap-3">
                      <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/[0.06] text-2xl">{b.emoji}</span>
                      <span className="min-w-0">
                        <span className="block font-display text-lg font-bold leading-snug text-[#EEF2F8] group-hover:text-amber-200">{b.title}</span>
                        <span className="mt-0.5 block text-[13px] font-semibold text-[#A7B0C0]">
                          Ages {b.ages} · {b.minutes} min · {trackName(b.track)}
                          {worldName(b.world) ? ` · ${worldName(b.world)}` : ''}
                        </span>
                      </span>
                    </span>
                    <span className="mt-2 block text-[15px] leading-snug text-[#A7B0C0]">{b.line}</span>
                    <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-3 text-[12px] font-semibold">
                      {b.adultRequired && <span className="rounded-full border border-amber-400/50 bg-amber-500/10 px-2 py-0.5 text-amber-200">Grown-up needed</span>}
                      {b.hazards.map((h) => (
                        <span key={h} className="rounded-full border border-white/10 px-2 py-0.5 text-[#A7B0C0]">
                          <span aria-hidden>{HAZARDS[h].icon} </span>
                          {HAZARDS[h].label}
                        </span>
                      ))}
                      <span className="built-tick hidden rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-200">✓ Built</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <article className="mt-14 max-w-3xl text-[17px] leading-relaxed text-[#A7B0C0]">
          <h2 className="font-display text-2xl font-bold text-[#EEF2F8]">For grown-ups: keeping builds safe</h2>
          <p className="mt-3">
            Every build lists what could hurt someone and what to do about it, and {adultCount} of the {HOME_BUILDS.length} say a grown-up
            must be there the whole time. No build uses mains electricity. Button and coin cells only appear in builds for ages 11 and up,
            always with a grown-up holding the cell: a swallowed button battery can cause serious internal burns within hours, so if you
            think one has been swallowed, go to emergency care straight away and do not wait for symptoms.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {(Object.keys(HAZARDS) as (keyof typeof HAZARDS)[]).filter((h) => h !== 'lithium-pack').map((h) => (
              <li key={h} className="rounded-2xl border border-white/[0.08] bg-[#111C32] p-3 text-[15px]">
                <strong className="text-[#EEF2F8]">
                  <span aria-hidden>{HAZARDS[h].icon} </span>
                  {HAZARDS[h].label}.
                </strong>{' '}
                {HAZARDS[h].rule}
              </li>
            ))}
          </ul>
          <h2 className="mt-10 font-display text-2xl font-bold text-[#EEF2F8]">How each build teaches</h2>
          <p className="mt-3">
            Each page follows the same pattern, so children learn the habits of engineers as well as the idea. First they build the thing
            and get it working. Then they try ONE change — longer blades, a different floor, a stiffer spring — while keeping everything
            else the same, and record what happened: a fair test. A short question checks the idea behind it, and a link opens the card of
            a real robot that uses the same trick, from a Mars helicopter to a milking robot. Older children get a “go deeper” part with
            numbers, a graph or a model.
          </p>
          <p className="mt-3">
            Nothing is uploaded. The “I built it” check-in is a question, not a photo, and it is saved only on this device, in the
            child’s portfolio, where teenagers can add a one-line reflection. Use your browser’s print button on any build page for a
            clean paper copy for the fridge or the classroom.
          </p>
          <p className="mt-3">
            Looking for more? The <Link href="/kids/robodex" className="inline-flex min-h-[44px] items-center font-semibold text-amber-300 underline-offset-4 hover:underline">Robodex</Link> holds
            every real robot linked here, and the <Link href="/kids/galaxy" className="inline-flex min-h-[44px] items-center font-semibold text-amber-300 underline-offset-4 hover:underline">Skill Galaxy</Link> has
            on-screen missions on the same ideas.
          </p>
        </article>
      </div>
    </>
  )
}
