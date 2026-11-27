'use client'

// components/kids/universe/NextStripClient.tsx — the fixed "what's next" strip
// (roadmap #89, calm and sensory). For a child who needs to know what comes
// next (autistic and ADHD children especially), Calm mode adds ONE line in the
// SAME place on every ordinary kids page, just under the header: "Next: …",
// the same mission the Home card picks (pickMission). It never moves, never
// animates and never pops up; it is not on Home (the mission card is there) or
// on game screens (their own results say what is next).
//
// The shell reserves its height whenever html.kids-calm is set (the settings
// boot script sets that class before first paint), so loading this chunk shifts
// nothing. Session titles live in the curriculum (too big for every page), so
// the strip names the session by number and planet.

import Link from 'next/link'
import { COURSE_OPEN_BANDS } from '@/lib/kids/universe/rewards'
import { PLANETS } from '@/lib/kids/universe/worlds'
import { pickMission } from './ContinueCardClient'
import { hasStarted, useKidsProgress } from './universe-state'

/** Levels whose seasons are open (all four since Wave 2): the same answer as the hub's PLAYABLE_LEVELS. */
const OPEN_LEVELS: readonly number[] = PLANETS.filter((p) => COURSE_OPEN_BANDS.includes(p.band)).map((p) => p.level)

const ROW = 'mx-auto flex h-14 max-w-6xl items-center gap-3 rounded-2xl border border-white/10 bg-[#111C32] px-3'

export default function NextStripClient({ pathname }: { pathname: string }) {
  const progress = useKidsProgress()
  if (!progress) return <div className={ROW} aria-hidden />

  if (!hasStarted(progress)) {
    return (
      <nav aria-label="What's next" className={ROW}>
        <span className="text-xl" aria-hidden>🧭</span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[#EEF2F8]">
          <span className="text-amber-300">Next:</span> set up your explorer on Home
        </span>
        <Link href="/kids" className="inline-flex min-h-[44px] shrink-0 items-center rounded-xl bg-amber-500 px-3 font-bold text-[#1A1103] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
          Go
        </Link>
      </nav>
    )
  }

  const m = pickMission(progress, {}, OPEN_LEVELS)
  const here = pathname === m.href.split('?')[0]
  return (
    <nav aria-label="What's next" className={ROW}>
      <span className="text-xl" aria-hidden>{m.icon}</span>
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[#EEF2F8]">
        <span className="text-amber-300">{here ? 'You are here:' : 'Next:'}</span> {m.title}
        <span className="text-[#A7B0C0]"> · {m.detail}</span>
      </span>
      {!here && (
        <Link
          href={m.href}
          aria-label={`${m.cta}: ${m.title}`}
          className="inline-flex min-h-[44px] shrink-0 items-center rounded-xl bg-amber-500 px-3 font-bold text-[#1A1103] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
        >
          {m.cta}
        </Link>
      )}
    </nav>
  )
}
