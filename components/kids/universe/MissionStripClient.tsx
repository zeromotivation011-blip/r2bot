'use client'

// components/kids/universe/MissionStripClient.tsx
// Phone only: one compact row above the Universe map so a child's first screen
// always has its next step on it. A new explorer gets "Start exploring"; a
// returning one gets the whole strip as a link to the mission the Continue card picks
// (pickMission). Fixed height in every state (skeleton included), so the map
// below never moves.

import Link from 'next/link'
import type { KidsProgress } from '@/lib/kids-progress'
import { Avatar, displayAvatarId } from './avatars'
import { pickMission, type SessionTitles } from './ContinueCardClient'
import { hasStarted } from './universe-state'

export interface MissionStripProps {
  progress: KidsProgress | null
  onboarded: boolean
  titles: SessionTitles
  playable: readonly number[]
  onStart: () => void
}

const BOX = 'flex h-[72px] min-w-0 items-center gap-3 rounded-[22px] border border-white/10 bg-[#111C32] py-2.5 pl-2.5 pr-2.5 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:hidden'
const CTA =
  'inline-flex h-[52px] shrink-0 items-center justify-center rounded-2xl bg-amber-500 px-4 font-display text-[17px] font-bold text-[#1A1103] shadow-lg shadow-amber-500/25 transition active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

export function MissionStripClient({ progress, onboarded, titles, playable, onStart }: MissionStripProps) {
  if (!progress) {
    return (
      <div className={BOX} aria-hidden>
        <div className="h-[52px] w-[52px] shrink-0 animate-pulse rounded-2xl bg-white/10 motion-reduce:animate-none" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-1/2 rounded bg-white/10" />
          <div className="h-4 w-3/4 rounded bg-white/10" />
        </div>
        <div className="h-[52px] w-28 shrink-0 rounded-2xl bg-white/10" />
      </div>
    )
  }

  if (!onboarded && !hasStarted(progress)) {
    return (
      <div className={`${BOX} uv-pop`}>
        <span className="shrink-0" aria-hidden>
          <Avatar id={displayAvatarId(progress.avatar, progress.band)} color={progress.avatar?.color ?? '#FC6818'} size={52} />
        </span>
        <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-[#EEF2F8]">
          New here? <span className="text-[#A7B0C0]">Set up your explorer.</span>
        </p>
        <button type="button" onClick={onStart} className={CTA}>
          Start exploring
        </button>
      </div>
    )
  }

  // The whole strip is the link (72px tall), so the mission title gets the
  // room it needs instead of being squeezed beside a button.
  const m = pickMission(progress, titles, playable)
  return (
    <Link
      href={m.href}
      aria-label={`${m.cta}: ${m.title}`}
      className={`${BOX} uv-pop group transition active:scale-[.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60`}
    >
      <span
        className={`grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${m.gradient} text-2xl shadow-[inset_-4px_-5px_10px_rgba(0,0,0,.35)]`}
        aria-hidden
      >
        {m.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-bold uppercase tracking-wide text-amber-300">{m.eyebrow}</span>
        <span className="line-clamp-2 font-display text-[16px] font-bold leading-tight text-[#EEF2F8]">{m.title}</span>
      </span>
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500 font-display text-xl font-bold text-[#1A1103] shadow-lg shadow-amber-500/25"
        aria-hidden
      >
        →
      </span>
    </Link>
  )
}
