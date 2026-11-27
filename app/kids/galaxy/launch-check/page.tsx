// app/kids/galaxy/launch-check/page.tsx — Launch Check hub (server component)
// noindex and not in the sitemap: a personal placement flow. Lists the ten
// tracks; the client island shows where this child starts in each one.

import type { Metadata } from 'next'
import Link from 'next/link'
import { TRACKS } from '@/lib/kids/activities/types'
import { LAUNCH_MAX, LAUNCH_MIN } from '@/lib/kids/activities/launch-check'
import LaunchCheckHubClient from '@/components/kids/galaxy/LaunchCheckHubClient'

export const runtime = 'nodejs'

export const metadata: Metadata = {
  title: 'Launch Check · Skill Galaxy',
  description: 'A few quick missions per track that find the right starting point in the R2BOT Skill Galaxy. No score, no account.',
  alternates: { canonical: 'https://www.r2bot.in/kids/galaxy/launch-check' },
  robots: { index: false, follow: true },
}

export default function LaunchCheckHubPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-3 pb-16 pt-4 sm:px-5">
      <nav aria-label="Breadcrumb" className="text-[15px] text-[#A7B0C0]">
        <Link href="/kids/galaxy" className="inline-flex min-h-[44px] items-center rounded-lg hover:text-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
          ← Skill Galaxy
        </Link>
      </nav>
      <header className="mb-6 mt-1">
        <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-amber-300">Skill Galaxy</p>
        <h1 className="mt-1 font-display text-[34px] font-bold leading-tight text-[#EEF2F8] sm:text-5xl">Launch Check</h1>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-[#A7B0C0]">
          Too easy is boring and too hard is no fun. Pick a track and play {LAUNCH_MIN} to {LAUNCH_MAX} quick missions: each first-try win
          makes the next one harder, each tricky one makes the next one easier. Then your map starts in the right place. No score, and every
          mission stays open.
        </p>
      </header>
      <LaunchCheckHubClient tracks={TRACKS.map((t) => ({ id: t.id, name: t.name, icon: t.icon, gradient: t.gradient, blurb: t.blurb }))} />
    </main>
  )
}
