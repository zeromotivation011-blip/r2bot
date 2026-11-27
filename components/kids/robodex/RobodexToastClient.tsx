'use client'

// components/kids/robodex/RobodexToastClient.tsx — "You found a real robot!"
//
// THE single hook point for Robodex discovery. Mount it once in the kids shell
// (next/dynamic, ssr:false). It needs no call from activities, games or
// stories: after every reward (REWARD_EVENT) and every progress save
// (KIDS_PROGRESS_EVENT) it re-reads the evidence stores and adds any card the
// child has now earned (lib/kids/robodex/store.ts syncRobodex), then shows one
// small card toast with a link to it. Explicit discoverRobot(id) calls are
// shown the same way (ROBODEX_EVENT).
//
// Where it sits: clear of the Ask Spark button (AskSparkClient: right-4,
// 56px tall at bottom 84px up to 900px wide; right-6 at bottom 24px from 901px)
// and of the phone tab bar (up to 900px). So up to 900px it sits ABOVE the Spark
// button (84 + 56 + 12 = 152px), and from 901px above it too (24 + 56 + 16 = 96px).
//
// Calm and reduced motion: no animation. Explorers with voice on hear the name.
// The store module is loaded on the first event, so the shell's first load
// does not carry the card catalogue.

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { playSound } from '@/lib/kids-audio'
import { KIDS_PROGRESS_EVENT, getProgress } from '@/lib/kids-progress'
import { readAloud } from '@/lib/kids/read-aloud'
import { readKidsSettings, useKidsCalm, useKidsReducedMotion } from '@/lib/kids/settings'
import { REWARD_EVENT } from '@/lib/kids/universe/rewards'

const ROBODEX_EVENT = 'r2bot:kids-robodex' // = ROBODEX_EVENT in lib/kids/robodex/store.ts (kept literal so this file stays tiny)

interface Toast {
  key: number
  id: string
  name: string
  emoji: string
  more: number
}

export default function RobodexToastClient() {
  const [toast, setToast] = useState<Toast | null>(null)
  const reduced = useKidsReducedMotion()
  const calm = useKidsCalm()
  const timer = useRef<number | null>(null)
  const debounce = useRef<number | null>(null)

  useEffect(() => {
    let alive = true

    const sync = () => {
      if (debounce.current) window.clearTimeout(debounce.current)
      debounce.current = window.setTimeout(() => {
        void import('@/lib/kids/robodex/store').then((m) => {
          if (alive) m.syncRobodex()
        })
      }, 400)
    }

    const onFound = (e: Event) => {
      const ids = (e as CustomEvent<{ ids?: string[] }>).detail?.ids ?? []
      if (!ids.length) return
      void import('@/lib/kids/robodex/cards').then(({ getRobodexCard }) => {
        if (!alive) return
        const card = getRobodexCard(ids[0])
        if (!card) return
        setToast({ key: Date.now(), id: card.id, name: card.name, emoji: card.emoji, more: ids.length - 1 })
        playSound('unlock')
        const s = readKidsSettings()
        if (getProgress().band === 'explorers' && s.voice) readAloud(`You found a real robot: the ${card.name}!`)
        if (timer.current) window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setToast(null), 7000)
      })
    }

    window.addEventListener(REWARD_EVENT, sync)
    window.addEventListener(KIDS_PROGRESS_EVENT, sync)
    window.addEventListener(ROBODEX_EVENT, onFound)
    return () => {
      alive = false
      window.removeEventListener(REWARD_EVENT, sync)
      window.removeEventListener(KIDS_PROGRESS_EVENT, sync)
      window.removeEventListener(ROBODEX_EVENT, onFound)
      if (timer.current) window.clearTimeout(timer.current)
      if (debounce.current) window.clearTimeout(debounce.current)
    }
  }, [])

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+152px)] z-[61] flex justify-center px-3 min-[901px]:bottom-24 min-[901px]:justify-end min-[901px]:pr-6"
      data-robodex-toast
    >
      <p className="sr-only" role="status" aria-live="polite">
        {toast ? `New Robodex card: ${toast.name}${toast.more ? ` and ${toast.more} more` : ''}.` : ''}
      </p>
      {toast && (
        <div
          key={toast.key}
          className={`pointer-events-auto flex w-[min(92vw,360px)] items-center gap-3 rounded-[20px] border border-amber-400/50 bg-[#111C32]/95 p-3 shadow-[0_8px_24px_rgba(0,0,0,.45)] ${reduced || calm ? '' : 'motion-safe:animate-[rdxToast_.3s_cubic-bezier(.22,.61,.36,1)]'}`}
        >
          <style>{`@keyframes rdxToast { from { opacity: 0; transform: translateY(10px) scale(.97) } to { opacity: 1; transform: none } }`}</style>
          <span className="text-3xl" aria-hidden>
            {toast.emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold uppercase tracking-wider text-cyan-300">New Robodex card{toast.more ? ` +${toast.more}` : ''}</span>
            <span className="block truncate font-display text-[17px] font-bold text-[#EEF2F8]">{toast.name}</span>
          </span>
          <Link
            href={`/kids/robodex#card-${toast.id}`}
            onClick={() => setToast(null)}
            className="inline-flex min-h-[44px] items-center rounded-xl bg-amber-500 px-3 font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            See it
          </Link>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-xl text-[#A7B0C0] hover:text-[#EEF2F8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            <span aria-hidden>×</span>
          </button>
        </div>
      )}
    </div>
  )
}
