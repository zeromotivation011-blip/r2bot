'use client'

// components/kids/robodex/RobodexShelfClient.tsx — a compact Robodex shelf for
// the Garage (/kids/hangar) or the kids home: how many real robots the child has
// found per world ("Ocean Lab 3/8") and the last few cards, with a link to the
// full Robodex. Reads only this device. The world names come in as props so the
// server decides the labels; the counts come from the store.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { KIDS_PROGRESS_EVENT } from '@/lib/kids-progress'
import { KIDS_PROFILE_EVENT } from '@/lib/kids/profiles'
import { ROBODEX_CARDS, ROBODEX_WORLD_ORDER, getRobodexCard } from '@/lib/kids/robodex/cards'
import { worldTotals } from '@/lib/kids/robodex/discover'
import { ROBODEX_EVENT, readRobodex, syncRobodex } from '@/lib/kids/robodex/store'
import { WORLDS } from '@/lib/kids/universe/worlds'

export default function RobodexShelfClient({ title = 'Robodex' }: { title?: string }) {
  const [found, setFound] = useState<Record<string, string> | null>(null)

  useEffect(() => {
    const read = () => setFound(readRobodex().found)
    syncRobodex()
    read()
    const onChange = () => {
      syncRobodex()
      read()
    }
    window.addEventListener(ROBODEX_EVENT, read)
    window.addEventListener(KIDS_PROGRESS_EVENT, onChange)
    window.addEventListener(KIDS_PROFILE_EVENT, onChange)
    return () => {
      window.removeEventListener(ROBODEX_EVENT, read)
      window.removeEventListener(KIDS_PROGRESS_EVENT, onChange)
      window.removeEventListener(KIDS_PROFILE_EVENT, onChange)
    }
  }, [])

  const ids = new Set(Object.keys(found ?? {}))
  const totals = worldTotals(ROBODEX_CARDS, ids)
  const latest = Object.entries(found ?? {})
    .sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0))
    .slice(0, 4)
    .map(([id]) => getRobodexCard(id))
    .filter((c): c is NonNullable<typeof c> => !!c)

  return (
    <section aria-labelledby="rdx-shelf-h" className="rounded-[20px] border border-white/[0.08] bg-[#111C32] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="rdx-shelf-h" className="font-display text-xl font-bold text-[#EEF2F8]">
          <span aria-hidden>🗂️</span> {title}
        </h2>
        <span className="font-display font-bold text-amber-300">{found ? `${ids.size}/${ROBODEX_CARDS.length}` : `${ROBODEX_CARDS.length}`}</span>
      </div>
      {latest.length > 0 && (
        <p className="mt-2 text-[15px] text-[#A7B0C0]">
          Latest: {latest.map((c) => `${c.emoji} ${c.name}`).join(' · ')}
        </p>
      )}
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {ROBODEX_WORLD_ORDER.map((w) => {
          const world = WORLDS.find((x) => x.id === w)
          const t = totals[w] ?? { found: 0, total: 0 }
          return (
            <li key={w} className="rounded-xl bg-white/[0.04] px-3 py-2">
              <div className="flex justify-between text-[15px] text-[#EEF2F8]">
                <span>
                  <span aria-hidden>{world?.emoji}</span> {world?.name}
                </span>
                <span className="font-display font-bold">
                  {found ? t.found : 0}/{t.total}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${t.total ? Math.round(((found ? t.found : 0) / t.total) * 100) : 0}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
      <Link
        href="/kids/robodex"
        className="mt-3 inline-flex min-h-[48px] items-center rounded-2xl bg-amber-500 px-5 font-display font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
      >
        Open the Robodex
      </Link>
    </section>
  )
}
