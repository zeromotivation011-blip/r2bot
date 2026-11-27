// app/kids/maths/[concept]/page.tsx — one Robot Maths concept (roadmap #86):
// the maths it uses at each band, a worked example per band, a small
// interactive and the matching Skill Galaxy mission. Server component,
// indexable; all four bands are in the server HTML.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import MathsBandFocusClient from '@/components/kids/maths/MathsBandFocusClient'
import { breadcrumbJsonLD, jsonldScript } from '@/lib/seo/jsonld'
import { KIDS_BANDS } from '@/lib/kids/bands'
import { getActivity } from '@/lib/kids/activities/content'
import { TRACKS } from '@/lib/kids/activities/types'
import { MATHS_CONCEPTS, getMathsConcept } from '@/lib/kids/maths/concepts'

export const runtime = 'nodejs'
export const dynamicParams = false

// The interactive is small but client-only; the skeleton keeps its exact height.
const MathsWidget = dynamic(() => import('@/components/kids/maths/MathsWidgetClient'), {
  loading: () => <div className="h-[300px] rounded-[20px] border border-white/10 bg-[#111C32]" aria-hidden />,
})

const BASE = 'https://www.r2bot.in'

export function generateStaticParams() {
  return MATHS_CONCEPTS.map((c) => ({ concept: c.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ concept: string }> }): Promise<Metadata> {
  const { concept } = await params
  const c = getMathsConcept(concept)
  if (!c) return {}
  const url = `${BASE}/kids/maths/${c.id}`
  const title = `Robot Maths: ${c.title} — the maths inside robots, ages 5–17`
  return {
    title,
    description: c.summary,
    alternates: { canonical: url },
    openGraph: { type: 'article', url, siteName: 'R2BOT', title: `R2BOT Kids — ${c.title}: the maths inside`, description: c.summary, images: [{ url: '/og-default.png', width: 1200, height: 630, alt: `Robot Maths: ${c.title}` }] },
  }
}

const link = 'rounded font-semibold text-amber-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

export default async function MathsConceptPage({ params }: { params: Promise<{ concept: string }> }) {
  const { concept } = await params
  const c = getMathsConcept(concept)
  if (!c) notFound()

  const crumbs = breadcrumbJsonLD([
    { name: 'R2BOT Kids', path: '/kids' },
    { name: 'Robot Maths', path: '/kids/maths' },
    { name: c.title, path: `/kids/maths/${c.id}` },
  ])
  const learnLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: `Robot Maths: ${c.title}`,
    description: c.summary,
    url: `${BASE}/kids/maths/${c.id}`,
    educationalLevel: KIDS_BANDS.map((b) => `${b.name} (ages ${b.ages})`),
    teaches: KIDS_BANDS.map((b) => c.bands[b.id].topic),
    learningResourceType: 'Worked example',
    typicalAgeRange: '5-17',
    isAccessibleForFree: true,
  }
  const others = MATHS_CONCEPTS.filter((x) => x.id !== c.id)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(learnLd) }} />
      <div className="mx-auto w-full max-w-5xl px-3 pb-24 pt-4 sm:px-5">
        <nav aria-label="Breadcrumb" className="text-[15px] text-[#A7B0C0]">
          <Link href="/kids/maths" className="inline-flex min-h-[44px] items-center rounded-lg hover:text-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
            ← Robot Maths
          </Link>
        </nav>
        <header className="mb-6 mt-1">
          <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-amber-300">The maths inside</p>
          <h1 className="mt-1 font-display text-[32px] font-bold leading-tight text-[#EEF2F8] sm:text-5xl">
            <span aria-hidden>{c.emoji} </span>
            {c.title}
          </h1>
          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-[#EEF2F8]">{c.hook}</p>
          <p className="mt-2 max-w-3xl text-[17px] leading-relaxed text-[#A7B0C0]">{c.robots}</p>
          <div className="mt-4">
            <MathsBandFocusClient />
          </div>
        </header>

        <MathsWidget widget={c.widget} />

        <div className="mt-10 grid gap-6">
          {KIDS_BANDS.map((b) => {
            const m = c.bands[b.id]
            const a = getActivity(m.activity)
            const track = a ? TRACKS.find((t) => t.id === a.track) : undefined
            return (
              <section
                key={b.id}
                id={`band-${b.id}`}
                data-maths-band={b.id}
                aria-labelledby={`h-${b.id}`}
                className="scroll-mt-24 rounded-[20px] border border-white/10 bg-[#111C32] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] data-[your-band]:border-amber-400/70 sm:p-6"
              >
                <p className="text-[14px] font-bold uppercase tracking-[0.14em] text-cyan-300">
                  {b.name} · ages {b.ages}
                </p>
                <h2 id={`h-${b.id}`} className="mt-1 font-display text-2xl font-bold text-[#EEF2F8]">
                  {m.topic}
                </h2>
                <p className="mt-2 text-[17px] leading-relaxed text-[#A7B0C0]">{m.explain}</p>

                <div className="mt-4 rounded-2xl border border-white/[0.08] bg-[#19263F] p-4">
                  <h3 className="font-display text-lg font-bold text-[#EEF2F8]">Worked example</h3>
                  <p className="mt-1 text-[17px] text-[#EEF2F8]">{m.example.question}</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-6 text-[16px] text-[#A7B0C0]">
                    {m.example.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                  <p className="mt-2 text-[17px] font-semibold text-[#EEF2F8]">
                    Answer: <span className="text-amber-300">{m.example.answer}</span>
                  </p>
                </div>

                <p className="mt-4 text-[16px] text-[#A7B0C0]">
                  <span className="font-semibold text-[#EEF2F8]">Away from the screen: </span>
                  {m.offScreen}
                </p>

                {a && track && (
                  <Link
                    href={`/kids/galaxy/${a.track}/${a.id}`}
                    className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-amber-400/50 bg-amber-500/10 px-5 font-display text-[16px] font-bold text-amber-300 transition hover:bg-amber-500/20 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                  >
                    Mission: {a.title} <span className="text-[14px] font-semibold text-[#A7B0C0]">· {track.name} track</span> →
                  </Link>
                )}
              </section>
            )
          })}
        </div>

        <section className="mt-10 max-w-4xl text-[17px] leading-relaxed text-[#A7B0C0]" aria-labelledby="see-also">
          <h2 id="see-also" className="font-display text-2xl font-bold text-[#EEF2F8]">
            See this maths at work
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {c.seeAlso.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="inline-flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-[#19263F] px-4 text-[16px] font-semibold text-[#EEF2F8] hover:border-amber-400/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
          <h2 className="mt-8 font-display text-2xl font-bold text-[#EEF2F8]">More Robot Maths</h2>
          <ul className="mt-3 grid gap-1 sm:grid-cols-2">
            {others.map((o) => (
              <li key={o.id}>
                <Link href={`/kids/maths/${o.id}`} className={`${link} inline-flex min-h-[44px] items-center`}>
                  {o.emoji} {o.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
