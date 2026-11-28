// app/kids/code-lab/[missionId]/page.tsx — one Code Lab mission (server component)

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { breadcrumbJsonLD, jsonldScript } from '@/lib/seo/jsonld'
import { getBand } from '@/lib/kids/bands'
import { CAPABILITY_NEEDS } from '@/lib/kids/robot-design'
import { BLOCK_INFO } from '@/lib/kids/code-lab/blocks'
import { getMission, MISSIONS, nextMission, previousInBand, toPublic } from '@/lib/kids/code-lab/missions'
import MissionLoaderClient from './MissionLoaderClient'

export const runtime = 'nodejs'
export const dynamicParams = false

const BASE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'

export function generateStaticParams() {
  return MISSIONS.map((m) => ({ missionId: m.id }))
}

type Params = Promise<{ missionId: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { missionId } = await params
  const m = getMission(missionId)
  if (!m) return {}
  const band = getBand(m.band)
  const url = `${BASE}/kids/code-lab/${m.id}`
  const title = `${m.title} — Code Lab mission for kids${band ? ` ${band.ages}` : ''}`
  const description = `${m.task} ${m.learningGoal}`
  return {
    title,
    description,
    alternates: { canonical: url },
    // A mission is a playable puzzle with ~100 words of text: valuable to a child,
    // thin to a search engine. 24 of them would be the scaled-thin-pages footprint
    // CLAUDE.md §6 warns about, so /kids/code-lab (the full list) is the indexed page.
    robots: { index: false, follow: true },
    openGraph: { type: 'website', url, siteName: 'R2BOT', title, description, images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'R2BOT Code Lab' }] },
  }
}

export default async function MissionPage({ params }: { params: Params }) {
  const { missionId } = await params
  const m = getMission(missionId)
  if (!m) notFound()
  const band = getBand(m.band)
  const next = nextMission(m)
  const prev = previousInBand(m)
  const special = m.needs.filter((c) => c !== 'move')

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: m.title,
    description: m.story,
    url: `${BASE}/kids/code-lab/${m.id}`,
    learningResourceType: 'Interactive coding exercise',
    educationalLevel: band ? `Ages ${band.ages}` : undefined,
    teaches: m.learningGoal,
    isAccessibleForFree: true,
    inLanguage: 'en',
    isPartOf: { '@type': 'CreativeWorkSeries', name: 'R2BOT Code Lab', url: `${BASE}/kids/code-lab` },
  }
  const crumbs = breadcrumbJsonLD([
    { name: 'Robot World', path: '/kids' },
    { name: 'Code Lab', path: '/kids/code-lab' },
    { name: m.title, path: `/kids/code-lab/${m.id}` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(crumbs) }} />
      <header className="mx-auto max-w-6xl px-4 pb-4 pt-6 text-gray-200">
        <nav aria-label="Breadcrumb" className="text-sm">
          <Link href="/kids/code-lab" className="-my-3 inline-flex min-h-[44px] items-center font-bold text-amber-300 underline-offset-4 hover:underline">
            ← Code Lab
          </Link>
          {band && (
            <span className="text-slate-300">
              {' '}
              · {band.emoji} {band.name} · mission {m.order}
            </span>
          )}
        </nav>
        <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
          <span aria-hidden>{m.emoji}</span> {m.title}
        </h1>
        <p className="mt-2 max-w-3xl text-lg text-slate-200">{m.story}</p>
        <div className="mt-3 grid max-w-4xl gap-2 text-sm sm:grid-cols-3">
          <p className="rounded-2xl bg-white/5 p-3">
            <strong className="block text-amber-300">🎯 Your mission</strong>
            {m.task}
          </p>
          <p className="rounded-2xl bg-white/5 p-3">
            <strong className="block text-emerald-300">🧠 You will learn</strong>
            {m.learningGoal}
          </p>
          <p className="rounded-2xl bg-white/5 p-3">
            <strong className="block text-sky-300">🔧 Your robot needs</strong>
            {special.length ? special.map((c) => CAPABILITY_NEEDS[c]).join(' + ') : 'Just something to move with.'}
            <span className="mt-1 block text-slate-300">
              Blocks: {m.palette.map((t) => BLOCK_INFO[t].label).join(', ')}. ⭐⭐⭐ in {m.budget} {m.budget === 1 ? 'block' : 'blocks'} or fewer.
            </span>
          </p>
        </div>
      </header>

      <MissionLoaderClient
        mission={toPublic(m)}
        next={next ? { id: next.id, title: next.title } : null}
        previous={prev ? { id: prev.id, title: prev.title } : null}
      />
    </>
  )
}
