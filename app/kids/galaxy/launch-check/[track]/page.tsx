// app/kids/galaxy/launch-check/[track]/page.tsx — Launch Check for one track (server component)
// noindex and not in the sitemap: it is a personal placement flow. The server
// sends only the missions the ladder can use for any band (params, never the
// solutions) plus light summaries of the track; the client island runs the
// staircase (lib/kids/activities/launch-check.ts) and saves the start point.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { byTrack } from '@/lib/kids/activities/content'
import { ladderIds, launchLadder } from '@/lib/kids/activities/launch-check'
import { summarize } from '@/lib/kids/activities/progress'
import { TRACKS, type TrackId } from '@/lib/kids/activities/types'
import { BAND_ORDER } from '@/lib/kids/bands'
import { TRACK_COPY } from '@/components/kids/galaxy/copy'
import LaunchCheckClient, { type LaunchActivity } from '@/components/kids/galaxy/LaunchCheckClient'

export const runtime = 'nodejs'
export const dynamicParams = false

const BASE = 'https://www.r2bot.in'

export function generateStaticParams() {
  return TRACKS.map((t) => ({ track: t.id }))
}

type Params = Promise<{ track: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { track } = await params
  const t = TRACKS.find((x) => x.id === track)
  if (!t) return {}
  return {
    title: `Launch Check: ${t.name} · Skill Galaxy`,
    description: `Six to eight quick ${t.name.toLowerCase()} missions that find the right starting point for you. No score, no account, stop any time.`,
    alternates: { canonical: `${BASE}/kids/galaxy/launch-check/${t.id}` },
    robots: { index: false, follow: true },
  }
}

export default async function LaunchCheckTrackPage({ params }: { params: Params }) {
  const { track } = await params
  const t = TRACKS.find((x) => x.id === track)
  if (!t) notFound()
  const trackId = t.id as TrackId
  const list = byTrack(trackId)
  const summaries = list.map(summarize)
  const ids = new Set(BAND_ORDER.flatMap((b) => ladderIds(launchLadder(summaries, trackId, b))))
  // Never send solutions to the browser.
  const candidates: LaunchActivity[] = list
    .filter((a) => ids.has(a.id))
    .map((a) => ({
      id: a.id,
      title: a.title,
      track: a.track,
      band: a.band,
      template: a.template,
      difficulty: a.difficulty,
      intro: a.intro,
      takeaway: a.takeaway,
      params: a.params,
      ...(a.concepts?.length ? { concepts: a.concepts } : {}),
      ...(a.badges?.length ? { badges: a.badges } : {}),
    }))

  return (
    <main className="w-full pb-16">
      <div className="mx-auto max-w-5xl px-3 pt-3 sm:px-5">
        <nav aria-label="Breadcrumb" className="text-[15px] text-[#A7B0C0]">
          <Link href="/kids/galaxy/launch-check" className="inline-flex min-h-[44px] items-center rounded-lg hover:text-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
            ← Launch Check
          </Link>
        </nav>
      </div>
      <LaunchCheckClient trackId={trackId} candidates={candidates} summaries={summaries} />
      <article className="mx-auto mt-8 max-w-3xl px-4 text-[17px] leading-relaxed text-[#A7B0C0] sm:px-5">
        <h2 className="font-display text-xl font-bold text-[#EEF2F8]">About the {t.name} Launch Check</h2>
        <p className="mt-2">
          {TRACK_COPY[trackId].about} The Launch Check starts in the middle of your age band and moves up a step each time you solve a mission on
          the first try, and down a step when one is tricky. After six to eight missions it knows where your {t.name} journey should begin.
        </p>
        <p className="mt-2">
          It is not a test: there is no score, nothing is shared, and every mission below your start point stays open to play. You can run it
          again whenever you like.
        </p>
      </article>
    </main>
  )
}
