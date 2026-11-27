'use client'

// components/kids/maths/MathsBandFocusClient.tsx — "Your maths" chip on the Robot
// Maths pages. The page is server-rendered with all four bands (for search and
// for teachers); this island reads the child's band from the one progress store
// and points them at their section. Nothing is written.

import { useEffect, useState } from 'react'
import { getProgress, KIDS_PROGRESS_EVENT } from '@/lib/kids-progress'
import { getBand, type BandId } from '@/lib/kids/bands'

export default function MathsBandFocusClient({ anchorPrefix = 'band-' }: { anchorPrefix?: string }) {
  const [band, setBand] = useState<BandId | null>(null)

  useEffect(() => {
    const read = () => setBand(getProgress().band)
    read()
    window.addEventListener(KIDS_PROGRESS_EVENT, read)
    return () => window.removeEventListener(KIDS_PROGRESS_EVENT, read)
  }, [])

  // Mark the child's own section so it stands out (data attribute styled by the page).
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-maths-band]')
    els.forEach((el) => {
      if (el.dataset.mathsBand === band) el.setAttribute('data-your-band', '')
      else el.removeAttribute('data-your-band')
    })
  }, [band])

  const b = getBand(band)
  // Same height before and after hydration: no layout shift.
  return (
    <div className="min-h-[48px]">
      {b ? (
        <a
          href={`#${anchorPrefix}${b.id}`}
          className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-amber-500 px-5 font-display text-[16px] font-bold text-[#1A1103] transition hover:bg-amber-400 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
        >
          Jump to your maths: {b.name} ({b.ages}) ↓
        </a>
      ) : (
        <p className="py-3 text-[15px] text-[#A7B0C0]">Pick your age group on the R2BOT Kids home page and we will point you to your maths.</p>
      )}
    </div>
  )
}
