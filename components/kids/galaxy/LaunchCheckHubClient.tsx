'use client'

// components/kids/galaxy/LaunchCheckHubClient.tsx
// The ten tracks with this child's Launch Check start point (from the one
// progress store). Links are real <a>s, so the list works before hydration.

import Link from 'next/link'
import type { TrackId } from '@/lib/kids/activities/types'
import { describeStart } from '@/lib/kids/activities/pacing'
import { useMastery } from './useMastery'

const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

export interface HubTrack {
  id: TrackId
  name: string
  icon: string
  gradient: string
  blurb: string
}

export default function LaunchCheckHubClient({ tracks }: { tracks: HubTrack[] }) {
  const { ready, starts } = useMastery()
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {tracks.map((t) => {
        const s = starts[t.id]
        return (
          <li key={t.id}>
            <Link
              href={`/kids/galaxy/launch-check/${t.id}`}
              className={`flex min-h-[88px] items-center gap-4 rounded-[20px] border bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] transition-transform duration-200 hover:-translate-y-0.5 active:scale-[.98] ${focusRing} ${
                s ? 'border-[#22C55E]/40' : 'border-white/[0.08] hover:border-white/20'
              }`}
            >
              <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${t.gradient} text-2xl`} aria-hidden>
                {t.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg font-bold text-[#EEF2F8]">{t.name}</span>
                <span className="block text-[14px] text-[#A7B0C0]">{t.blurb}</span>
                <span className={`mt-1 block text-[13px] font-bold ${s ? 'text-[#86EFAC]' : 'text-amber-300'}`}>
                  {!ready ? ' ' : s ? `Start: ${describeStart(s)} · check again` : 'Not checked yet'}
                </span>
              </span>
              <span aria-hidden className="text-xl text-amber-300">
                →
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
