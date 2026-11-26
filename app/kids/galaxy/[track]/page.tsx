// app/kids/galaxy/[track]/page.tsx — one Skill Galaxy track (server component)
// Indexable: the track's teaching text and every activity (title, mission,
// takeaway) are rendered here; the constellation is a client island.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { jsonldScript, breadcrumbJsonLD } from '@/lib/seo/jsonld'
import { byTrack } from '@/lib/kids/activities/content'
import { summarize } from '@/lib/kids/activities/progress'
import { TRACKS, type TrackId } from '@/lib/kids/activities/types'
import { KIDS_BANDS } from '@/lib/kids/bands'
import TrackClient from '@/components/kids/galaxy/TrackClient'
import { TRACK_COPY } from '@/components/kids/galaxy/copy'

export const runtime = 'nodejs'
export const dynamicParams = false

const BASE = 'https://www.r2bot.in'

export function generateStaticParams() {
  return TRACKS.map((t) => ({ track: t.id }))
}

function findTrack(id: string) {
  return TRACKS.find((t) => t.id === id)
}

export async function generateMetadata({ params }: { params: Promise<{ track: string }> }): Promise<Metadata> {
  const { track: id } = await params
  const t = findTrack(id)
  if (!t) return {}
  const url = `${BASE}/kids/galaxy/${t.id}`
  const n = byTrack(t.id).length
  const title = `${t.name} Robotics Activities for Kids · Skill Galaxy`
  const description = `${n} hands-on ${t.name.toLowerCase()} missions for ages 5–17: ${TRACK_COPY[t.id].skills.join(', ')}. Interactive, with real simulators underneath.`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', url, siteName: 'R2BOT', title, description, images: [{ url: '/og-default.png', width: 1200, height: 630, alt: `R2BOT Skill Galaxy: ${t.name}` }] },
  }
}

export default async function TrackPage({ params }: { params: Promise<{ track: string }> }) {
  const { track: id } = await params
  const t = findTrack(id)
  if (!t) notFound()
  const trackId: TrackId = t.id
  const list = byTrack(trackId)
  const copy = TRACK_COPY[trackId]
  const crumbs = breadcrumbJsonLD([
    { name: 'R2BOT Kids', path: '/kids' },
    { name: 'Skill Galaxy', path: '/kids/galaxy' },
    { name: t.name, path: `/kids/galaxy/${t.id}` },
  ])
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${t.name} — R2BOT Skill Galaxy`,
    itemListElement: list.map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.title })),
  }
  const others = TRACKS.filter((x) => x.id !== trackId)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(ld) }} />
      <main className="mx-auto w-full max-w-5xl px-3 pb-16 pt-4 sm:px-5">
        <nav aria-label="Breadcrumb" className="text-[15px] text-[#A7B0C0]">
          <Link href="/kids/galaxy" className="inline-flex min-h-[44px] items-center rounded-lg hover:text-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
            ← Skill Galaxy
          </Link>
        </nav>
        <header className="mb-6 mt-1 flex items-center gap-4">
          <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br ${t.gradient} text-3xl shadow-[0_8px_24px_rgba(0,0,0,.45)]`} aria-hidden>
            {t.icon}
          </span>
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-amber-300">Skill Galaxy</p>
            <h1 className="font-display text-[32px] font-bold leading-tight text-[#EEF2F8] sm:text-[44px]">{t.name}</h1>
          </div>
        </header>
        <p className="mb-6 max-w-3xl text-lg leading-relaxed text-[#A7B0C0]">{copy.about}</p>

        <TrackClient trackId={trackId} activities={list.map(summarize)} />

        <section className="mt-12" aria-labelledby="all-missions">
          <h2 id="all-missions" className="font-display text-2xl font-bold text-[#EEF2F8]">
            Every {t.name} mission
          </h2>
          <p className="mt-1 text-[15px] text-[#A7B0C0]">Skills: {copy.skills.join(' · ')}.</p>
          {KIDS_BANDS.map((b) => {
            const inBand = list.filter((a) => a.band === b.id)
            if (!inBand.length) return null
            return (
              <div key={b.id} className="mt-6">
                <h3 className="font-display text-lg font-bold text-[#EEF2F8]">
                  {b.emoji} {b.name} <span className="text-[15px] font-semibold text-[#6E7888]">· ages {b.ages}</span>
                </h3>
                <ol className="mt-2 grid gap-3">
                  {inBand.map((a) => (
                    <li key={a.id} className="rounded-[20px] border border-white/[0.08] bg-[#111C32] p-4">
                      <h4 className="font-display text-lg font-bold">
                        <Link href={`/kids/galaxy/${t.id}/${a.id}`} className="text-[#EEF2F8] hover:text-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
                          {a.title}
                        </Link>
                      </h4>
                      <p className="mt-1 text-[15px] leading-relaxed text-[#A7B0C0]">{a.intro}</p>
                      <p className="mt-2 text-[15px] leading-relaxed text-[#EEF2F8]">
                        <span className="font-semibold text-amber-300">The idea: </span>
                        {a.takeaway}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )
          })}
          {!list.length && <p className="mt-4 text-[#A7B0C0]">The first {t.name} missions are being built now.</p>}
        </section>

        <nav aria-label="Other tracks" className="mt-12">
          <h2 className="font-display text-xl font-bold text-[#EEF2F8]">More constellations</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {others.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/kids/galaxy/${o.id}`}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#111C32] px-3 text-[15px] font-semibold text-[#EEF2F8] hover:border-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                >
                  <span aria-hidden>{o.icon}</span> {o.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
    </>
  )
}
