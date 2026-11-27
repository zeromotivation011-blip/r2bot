// app/kids/printables/[id]/page.tsx — one Make It at Home build (roadmap #44, safety #79).
// Server component, indexable, statically generated for every build in
// lib/kids/builds/builds.ts (unknown ids 404). Everything a parent, teacher or
// search engine needs is server-rendered: safety, materials, steps, the idea,
// the fair test, the real robot and a "go deeper" part. The only island is the
// "I built it" check-in. Prints cleanly (PrintStyles).

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { breadcrumbJsonLD, jsonldScript } from '@/lib/seo/jsonld'
import { HAZARDS, HOME_BUILDS, buildRewardId, getBuild } from '@/lib/kids/builds/builds'
import { KIDS_BANDS } from '@/lib/kids/bands'
import { TRACKS } from '@/lib/kids/activities/types'
import { WORLDS } from '@/lib/kids/universe/worlds'
import { ROBODEX_CARDS } from '@/lib/kids/robodex/cards'
import PrintStyles from '@/components/kids/portfolio/PrintStyles'
import PrintButtonClient from '../PrintButtonClient'
import BuildCheckInClient from './BuildCheckInClient'

const BASE = 'https://www.r2bot.in'

export const dynamicParams = false

export function generateStaticParams() {
  return HOME_BUILDS.map((b) => ({ id: b.id }))
}

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const b = getBuild(id)
  if (!b) return {}
  const url = `${BASE}/kids/printables/${b.id}`
  const description = `${b.line} A kitchen-table robotics build for ages ${b.ages}: materials, an adult-safety note, step-by-step instructions, a fair test and the real robot that uses the same idea.`
  return {
    title: `${b.title}: Robotics Build for Kids at Home`,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'article', url, siteName: 'R2BOT', title: `${b.title} — R2BOT Kids Make It at Home`, description, images: [{ url: '/og-default.png', width: 1200, height: 630, alt: b.title }] },
  }
}

const h2 = 'font-display text-2xl font-bold text-[#EEF2F8]'
const link = 'font-semibold text-amber-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 rounded'

export default async function BuildPage({ params }: Props) {
  const { id } = await params
  const b = getBuild(id)
  if (!b) notFound()

  const band = KIDS_BANDS.find((k) => k.id === b.minBand)!
  const track = TRACKS.find((t) => t.id === b.track)
  const world = b.world ? WORLDS.find((w) => w.id === b.world) : undefined
  const card = ROBODEX_CARDS.find((c) => c.id === b.robodex)!
  const robodexHref = `/kids/robodex#about-${card.id}`
  const i = HOME_BUILDS.findIndex((x) => x.id === b.id)
  const prev = HOME_BUILDS[(i - 1 + HOME_BUILDS.length) % HOME_BUILDS.length]
  const next = HOME_BUILDS[(i + 1) % HOME_BUILDS.length]
  const sameTrack = HOME_BUILDS.filter((x) => x.track === b.track && x.id !== b.id).slice(0, 3)

  const howTo = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: b.title,
    description: b.line,
    totalTime: `PT${b.minutes}M`,
    supply: b.materials.map((m) => ({ '@type': 'HowToSupply', name: m })),
    step: b.steps.map((s, n) => ({ '@type': 'HowToStep', position: n + 1, text: s })),
    educationalLevel: `Ages ${b.ages}`,
    url: `${BASE}/kids/printables/${b.id}`,
  }
  const crumbs = breadcrumbJsonLD([
    { name: 'R2BOT Kids', path: '/kids' },
    { name: 'Make It at Home', path: '/kids/printables' },
    { name: b.title, path: `/kids/printables/${b.id}` },
  ])

  return (
    <>
      <PrintStyles />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(howTo) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />
      <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-4">
        <nav aria-label="Breadcrumb" className="no-print text-[15px] text-[#A7B0C0]">
          <Link href="/kids/printables" className="inline-flex min-h-[44px] items-center rounded-lg hover:text-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
            ← Make It at Home
          </Link>
        </nav>

        <article className="print-sheet text-[17px] leading-relaxed text-[#A7B0C0]">
          <header>
            <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-amber-300">
              Make It at Home · {track?.name ?? b.track}
              {world ? ` · ${world.name}` : ''}
            </p>
            <h1 className="mt-1 font-display text-[32px] font-bold leading-tight text-[#EEF2F8] sm:text-[44px]">
              <span aria-hidden>{b.emoji} </span>
              {b.title}
            </h1>
            <p className="mt-2 text-lg text-[#EEF2F8]">{b.line}</p>
            <ul className="mt-3 flex flex-wrap gap-2 text-[14px] font-semibold" aria-label="At a glance">
              <li className="rounded-full border border-white/15 px-3 py-1">Ages {b.ages}</li>
              <li className="rounded-full border border-white/15 px-3 py-1">About {b.minutes} minutes</li>
              <li className="rounded-full border border-white/15 px-3 py-1">
                From {band.name} ({band.ages})
              </li>
              {b.adultRequired && <li className="rounded-full border border-amber-400/60 bg-amber-500/10 px-3 py-1 text-amber-200">A grown-up must be there</li>}
            </ul>
            <div className="no-print mt-4">
              <PrintButtonClient label="Print this build" />
            </div>
          </header>

          <section aria-labelledby="safety-h" className="mt-6 rounded-[20px] border border-amber-400/50 bg-amber-500/[0.08] p-4 sm:p-5">
            <h2 id="safety-h" className="font-display text-xl font-bold text-amber-200">
              Grown-ups: safety first
            </h2>
            <p className="mt-1 text-[#EEF2F8]">{b.safety}</p>
            <ul className="mt-3 grid gap-2">
              {b.hazards.map((h) => (
                <li key={h} className="text-[15px]">
                  <strong className="text-[#EEF2F8]">
                    <span aria-hidden>{HAZARDS[h].icon} </span>
                    {HAZARDS[h].label}:
                  </strong>{' '}
                  {HAZARDS[h].rule}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[14px]">No R2BOT build ever uses mains electricity.</p>
          </section>

          <section aria-labelledby="need-h" className="mt-8">
            <h2 id="need-h" className={h2}>You need</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              {b.materials.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="steps-h" className="mt-8">
            <h2 id="steps-h" className={h2}>How to build it</h2>
            <ol className="mt-2 list-decimal space-y-2 pl-6 text-[#EEF2F8]">
              {b.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="idea-h" className="mt-8">
            <h2 id="idea-h" className={h2}>The robotics idea</h2>
            <p className="mt-2">{b.idea}</p>
          </section>

          <section aria-labelledby="test-h" className="mt-8 rounded-[20px] border border-cyan-400/30 bg-cyan-500/[0.06] p-4 sm:p-5">
            <h2 id="test-h" className="font-display text-xl font-bold text-cyan-100">Try one change: a fair test</h2>
            <p className="mt-1">Guess what will happen first, then test it. Change only one thing.</p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-3">
              <div>
                <dt className="font-display font-bold text-[#EEF2F8]">Change</dt>
                <dd>{b.fairTest.change}</dd>
              </div>
              <div>
                <dt className="font-display font-bold text-[#EEF2F8]">Keep the same</dt>
                <dd>{b.fairTest.keep}</dd>
              </div>
              <div>
                <dt className="font-display font-bold text-[#EEF2F8]">Measure</dt>
                <dd>{b.fairTest.measure}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="real-h" className="mt-8">
            <h2 id="real-h" className={h2}>The real robot</h2>
            <p className="mt-2">
              <span aria-hidden>{card.emoji} </span>
              <strong className="text-[#EEF2F8]">{card.name}</strong> ({card.type.toLowerCase()}): {card.front}
            </p>
            <p className="mt-2">{b.realRobot}</p>
            <p className="no-print mt-2">
              <Link href={robodexHref} className={link}>
                Read its card in the Robodex →
              </Link>
            </p>
          </section>

          <section aria-labelledby="deeper-h" className="mt-8">
            <h2 id="deeper-h" className={h2}>Go deeper (ages 11–17)</h2>
            <p className="mt-2">{b.deeper}</p>
          </section>

          <section aria-labelledby="ask-h" className="mt-8">
            <h2 id="ask-h" className={h2}>Talk about it</h2>
            <p className="mt-2">
              A question to ask afterwards: <em className="text-[#EEF2F8]">{b.ask}</em> Let the child explain in their own words; there is
              no single right answer, and “I don’t know yet, let’s test it” is a great engineering answer.
            </p>
          </section>
        </article>

        <div className="mt-10">
          <BuildCheckInClient
            id={b.id}
            rewardId={buildRewardId(b.id)}
            title={b.title}
            question={b.check.q}
            options={b.check.options}
            answer={b.check.answer}
            why={b.check.why}
            change={b.fairTest.change}
            outcomes={b.fairTest.outcomes}
            robodexHref={robodexHref}
            robodexName={card.name}
          />
        </div>

        {sameTrack.length > 0 && (
          <section aria-labelledby="more-h" className="no-print mt-10">
            <h2 id="more-h" className={h2}>More {track?.name ?? ''} builds</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-3">
              {sameTrack.map((x) => (
                <li key={x.id}>
                  <Link href={`/kids/printables/${x.id}`} className="flex min-h-[56px] items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#111C32] px-3 font-semibold text-[#EEF2F8] hover:border-amber-400/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
                    <span aria-hidden>{x.emoji}</span> {x.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <nav aria-label="Other builds" className="no-print mt-8 flex flex-wrap justify-between gap-3">
          <Link href={`/kids/printables/${prev.id}`} className="inline-flex min-h-[48px] items-center rounded-2xl border border-white/15 px-4 font-semibold text-[#EEF2F8] hover:border-amber-400/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
            ← {prev.title}
          </Link>
          <Link href={`/kids/printables/${next.id}`} className="inline-flex min-h-[48px] items-center rounded-2xl border border-white/15 px-4 font-semibold text-[#EEF2F8] hover:border-amber-400/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
            {next.title} →
          </Link>
        </nav>
      </div>
    </>
  )
}
