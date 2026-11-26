'use client'

// components/kids/teach/GuideActionsClient.tsx
// Print and "Download PDF" for a session's teacher guide. jsPDF is imported
// on the click (lib/kids/teach/pdf.ts), never in the page's first load.

import { useState } from 'react'
import type { TeacherGuide } from '@/lib/kids/teach/guides'

const SITE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app')
  ? process.env.NEXT_PUBLIC_SITE_URL
  : 'https://www.r2bot.in'

export function GuideActionsClient({ guide }: { guide: TeacherGuide }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pdf() {
    setBusy(true)
    setError(null)
    try {
      const { downloadGuidePdf } = await import('@/lib/kids/teach/pdf')
      await downloadGuidePdf(guide, SITE)
    } catch {
      setError('The PDF could not be made on this device. Use Print and choose “Save as PDF” instead.')
    } finally {
      setBusy(false)
    }
  }

  const btn = 'inline-flex min-h-[48px] items-center gap-2 rounded-xl px-4 font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
  return (
    <>
      <button type="button" onClick={() => void pdf()} disabled={busy} className={`${btn} bg-amber-500 text-[#1A1103] hover:bg-amber-400 disabled:opacity-60`}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0l-5-5m5 5l5-5M4 21h16" /></svg>
        {busy ? 'Making PDF…' : 'Download PDF'}
      </button>
      <button type="button" onClick={() => window.print()} className={`${btn} border border-white/15 bg-white/[0.04] text-white hover:bg-white/10`}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M6 14h12v7H6z" /></svg>
        Print
      </button>
      {error && <p role="alert" className="basis-full text-sm font-semibold text-red-200">{error}</p>}
    </>
  )
}

export default GuideActionsClient
