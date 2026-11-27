'use client'

// app/kids/teach/standards/StandardsPdfButtonClient.tsx
// "Download PDF" for one level's standards alignment. jsPDF is loaded on the
// click (lib/kids/classroom-pdf.ts), so the page's first load stays light.

import { useState } from 'react'
import type { StandardsLevel } from '@/lib/kids/classroom-standards'

const SITE = 'https://www.r2bot.in'

export default function StandardsPdfButtonClient({ level }: { level: StandardsLevel }) {
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle')
  async function download() {
    setState('busy')
    try {
      const { downloadStandardsPdf } = await import('@/lib/kids/classroom-pdf')
      await downloadStandardsPdf(level, SITE)
      setState('idle')
    } catch {
      setState('error')
    }
  }
  return (
    <span className="teach-no-print inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void download()}
        disabled={state === 'busy'}
        className="inline-flex min-h-[44px] items-center rounded-xl bg-amber-500 px-4 text-sm font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:opacity-60"
      >
        {state === 'busy' ? 'Making the PDF…' : `Download Level ${level.level} PDF`}
      </button>
      {state === 'error' && <span role="alert" className="text-sm text-rose-200">Could not make the PDF. Try again.</span>}
    </span>
  )
}
