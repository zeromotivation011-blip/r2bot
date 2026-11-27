'use client'

// components/kids/parents/ParentTimeKeeperClient.tsx — the gentle side of the
// parent controls (lib/kids/parent-controls.ts).
//
// Mounted once in the kids shell. It counts play time on this device while a
// kids page is visible, and shows a small, kind banner:
//   - five minutes before the daily budget runs out ("a good time to finish"),
//   - when it has run out ("time for a break"),
//   - during quiet hours.
// It NEVER locks the screen or stops an activity mid-way: a child finishes the
// mission they are in. Nothing is sent anywhere.

import { useEffect, useState } from 'react'
import { tickKidsUsage, useKidsTimeStatus, type KidsTimeState } from '@/lib/kids/parent-controls'

const TICK_MS = 15_000
/** After "Okay", the over-time / quiet banner comes back after this long. */
const REMIND_MS = 10 * 60_000

const COPY: Record<Exclude<KidsTimeState, 'ok'>, { icon: string; title: string; line: (left: number | null) => string }> = {
  'winding-down': {
    icon: '⏳',
    title: 'Almost time for a break',
    line: (left) => `About ${left ?? 5} ${left === 1 ? 'minute' : 'minutes'} left today. A good moment to finish this mission.`,
  },
  over: {
    icon: '🔋',
    title: 'That’s today’s robot time',
    line: () => 'Finish what you’re doing, then give your eyes a rest. Spark will be here tomorrow!',
  },
  quiet: {
    icon: '🌙',
    title: 'It’s quiet time',
    line: () => 'Robots are recharging. Finish up, then it’s time to rest.',
  },
}

export function ParentTimeKeeper() {
  const status = useKidsTimeStatus()
  const [hidden, setHidden] = useState<{ state: KidsTimeState; until: number } | null>(null)
  const [, setClock] = useState(0)

  // Count time while the page is visible (pauses in a background tab).
  useEffect(() => {
    let timer = 0
    const start = () => {
      window.clearInterval(timer)
      if (document.visibilityState !== 'visible') return
      tickKidsUsage(20)
      timer = window.setInterval(() => {
        tickKidsUsage(20)
        setClock((n) => n + 1) // re-check quiet hours as the clock moves
      }, TICK_MS)
    }
    start()
    document.addEventListener('visibilitychange', start)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', start)
    }
  }, [])

  if (status.state === 'ok') return null
  if (hidden && hidden.state === status.state && Date.now() < hidden.until) return null
  const c = COPY[status.state]

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 top-[calc(76px+env(safe-area-inset-top))] z-[45] mx-auto flex max-w-md items-center gap-3 rounded-[20px] border border-amber-400/40 bg-[#19263F] p-3 pl-4 text-left shadow-[0_8px_24px_rgba(0,0,0,.45)] motion-safe:animate-[kidsTimeIn_.25s_cubic-bezier(.22,.61,.36,1)] print:hidden"
    >
      <style>{'@keyframes kidsTimeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}'}</style>
      <span aria-hidden className="text-3xl">{c.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base font-bold text-[#EEF2F8]">{c.title}</span>
        <span className="block text-sm leading-snug text-[#A7B0C0]">{c.line(status.minutesLeft)}</span>
      </span>
      <button
        type="button"
        onClick={() => setHidden({ state: status.state, until: status.state === 'winding-down' ? Number.MAX_SAFE_INTEGER : Date.now() + REMIND_MS })}
        className="min-h-[44px] min-w-[44px] shrink-0 rounded-2xl bg-amber-500 px-4 font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
      >
        Okay
      </button>
    </div>
  )
}

export default ParentTimeKeeper
