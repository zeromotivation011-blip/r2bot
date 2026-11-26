// app/kids/galaxy/[track]/[activity]/page.tsx — one Skill Galaxy activity (server component)
// noindex (one short activity is thin on its own; the track page is the
// indexable one) and NOT in the sitemap. The server renders the mission,
// takeaway and real-world text; the player is a client island that downloads
// only this activity's template.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ALL_ACTIVITIES, byTrack, getActivity } from '@/lib/kids/activities/content'
import { summarize } from '@/lib/kids/activities/progress'
import { TRACKS } from '@/lib/kids/activities/types'
import { getBand } from '@/lib/kids/bands'
import ActivityPlayerClient, { type PlayerActivity } from '@/components/kids/activities/ActivityPlayerClient'
import { TEMPLATE_HOW } from '@/components/kids/galaxy/copy'

export const runtime = 'nodejs'
export const dynamicParams = false

const BASE = 'https://www.r2bot.in'

export function generateStaticParams() {
  return ALL_ACTIVITIES.map((a) => ({ track: a.track, activity: a.id }))
}

type Params = Promise<{ track: string; activity: string }>

async function load(params: Params) {
  const { track, activity } = await params
  const a = getActivity(activity)
  if (!a || a.track !== track) return null
  return a
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const a = await load(params)
  if (!a) return {}
  const t = TRACKS.find((x) => x.id === a.track)
  return {
    title: `${a.title} · ${t?.name ?? ''} · Skill Galaxy`,
    description: a.intro,
    // Noindex: the track page is the one search engines should land on.
    alternates: { canonical: `${BASE}/kids/galaxy/${a.track}/${a.id}` },
    robots: { index: false, follow: true },
  }
}

export default async function ActivityPage({ params }: { params: Params }) {
  const a = await load(params)
  if (!a) notFound()
  const t = TRACKS.find((x) => x.id === a.track) ?? TRACKS[0]
  const band = getBand(a.band)
  // Never send the solution to the browser.
  const player: PlayerActivity = {
    id: a.id,
    title: a.title,
    track: a.track,
    band: a.band,
    template: a.template,
    difficulty: a.difficulty,
    intro: a.intro,
    takeaway: a.takeaway,
    params: a.params,
    ...(a.realWorld ? { realWorld: a.realWorld } : {}),
    ...(a.badges?.length ? { badges: a.badges } : {}),
    ...(a.after?.length ? { after: a.after } : {}),
  }
  const trackSummaries = byTrack(a.track).map(summarize)

  return (
    <main className="w-full pb-16">
      <ActivityPlayerClient activity={player} trackActivities={trackSummaries} />

      <article className="mx-auto mt-6 max-w-3xl px-4 text-[17px] leading-relaxed text-[#A7B0C0] sm:px-5">
        <h2 className="font-display text-xl font-bold text-[#EEF2F8]">About this mission</h2>
        <p className="mt-2">
          “{a.title}” is a {t.name} mission for {band?.name ?? a.band} (ages {band?.ages}), difficulty {a.difficulty} of 5. {TEMPLATE_HOW[a.template]}
        </p>
        <p className="mt-2">
          <span className="font-semibold text-[#EEF2F8]">The mission: </span>
          {a.intro}
        </p>
        <p className="mt-2">
          <span className="font-semibold text-[#EEF2F8]">What it teaches: </span>
          {a.takeaway}
        </p>
        {a.realWorld && (
          <p className="mt-2">
            <span className="font-semibold text-[#EEF2F8]">Where it happens for real: </span>
            {a.realWorld}
          </p>
        )}
        <p className="mt-4">
          <Link href={`/kids/galaxy/${t.id}`} className="font-semibold text-amber-300 underline-offset-4 hover:underline">
            All {t.name} missions
          </Link>{' '}
          ·{' '}
          <Link href="/kids/galaxy" className="font-semibold text-amber-300 underline-offset-4 hover:underline">
            Skill Galaxy
          </Link>
        </p>
      </article>
    </main>
  )
}
