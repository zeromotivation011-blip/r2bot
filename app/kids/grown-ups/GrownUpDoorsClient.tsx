'use client'

// app/kids/grown-ups/GrownUpDoorsClient.tsx — the doors behind the grown-up front door.
//
// Every card is a real <a href> in the server HTML (search engines and no-JS
// readers follow it). A tap asks the parental gate ONCE: after a grown-up has
// answered (here, or on the gated "For grown-ups" footer link that opened this
// page) the rest of the doors open straight away for as long as the page is
// open, and the Parents door hands the parent hub a one-minute pass so it does
// not ask again. Doors that leave R2BOT Kids follow the parent "links out"
// switch: when it is off they show as plain text.

import { useRouter } from 'next/navigation'
import { useEffect, useState, type MouseEvent } from 'react'
import { consumeGrownUpPass, noteGrownUpPass, requireGrownUp } from '@/components/kids/app/ParentalGateClient'
import { useParentControls } from '@/lib/kids/parent-controls'
import { KIDS_GROWNUP_DOORS, type KidsGrownUpDoor } from '@/lib/kids/nav'

const CARD =
  'flex h-full min-h-[132px] gap-4 rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 text-left shadow-[0_8px_24px_rgba(0,0,0,.45)]'

export function GrownUpDoorsClient() {
  const router = useRouter()
  const controls = useParentControls()
  const [unlocked, setUnlocked] = useState(false)

  // Arrived through the gated footer link: the grown-up already answered.
  useEffect(() => {
    if (consumeGrownUpPass()) setUnlocked(true)
  }, [])

  const open = async (e: MouseEvent<HTMLAnchorElement>, d: KidsGrownUpDoor) => {
    // Once unlocked, "open in a new tab" is the grown-up's own choice.
    if (unlocked && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return
    e.preventDefault()
    if (!unlocked) {
      const ok = await requireGrownUp({
        target: d.leaves ? new URL(d.href, window.location.href).href : undefined,
        message: d.leaves ? 'This opens the main R2BOT site.' : undefined,
      })
      if (!ok) return
      setUnlocked(true)
    }
    // The parent hub (and any other <ParentalGate> page) opens without asking again.
    noteGrownUpPass()
    if (d.leaves) window.location.assign(d.href)
    else router.push(d.href)
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Pages for grown-ups">
      {KIDS_GROWNUP_DOORS.map((d) => {
        const body = (
          <>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#19263F] text-2xl" aria-hidden>
              {d.emoji}
            </span>
            <span className="min-w-0">
              <span className="block text-[12px] font-bold uppercase tracking-wide text-[#6E7888]">{d.who}</span>
              <span className="mt-0.5 block font-display text-lg font-bold text-[#EEF2F8]">
                {d.label}
                {d.leaves ? <span className="sr-only"> (leaves R2BOT Kids)</span> : null}
              </span>
              <span className="mt-1 block text-[15px] leading-snug text-[#A7B0C0]">{d.line}</span>
            </span>
          </>
        )
        if (d.leaves && !controls.outboundLinks) {
          return (
            <li key={d.href}>
              <span className={`${CARD} opacity-70`} aria-disabled="true" title="A grown-up switched off links that leave R2BOT Kids on this device.">
                {body}
              </span>
            </li>
          )
        }
        return (
          <li key={d.href}>
            <a
              href={d.href}
              onClick={(e) => void open(e, d)}
              data-grown-up-link=""
              className={`${CARD} transition hover:-translate-y-0.5 hover:border-white/25 active:scale-[.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60`}
            >
              {body}
            </a>
          </li>
        )
      })}
    </ul>
  )
}
