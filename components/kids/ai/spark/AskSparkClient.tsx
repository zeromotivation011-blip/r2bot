'use client'

// components/kids/ai/spark/AskSparkClient.tsx
// The floating "Ask Spark" button for R2BOT Kids. Mount once in the kids
// shell. Tapping it (or any screen calling openSpark()) opens the full-screen
// Spark sheet, which is code-split and only downloaded on first use (prefetched
// when the browser is idle so the first open is instant on slow phones).

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { OPEN_SPARK_EVENT, type OpenSparkDetail } from '@/lib/kids/ai/spark/open'

const loadSheet = () => import('./SparkSheetClient')
const SparkSheet = dynamic(loadSheet, { ssr: false })

/** Screens where the floating button would get in the way (grown-up pages, full-screen joins). */
const DEFAULT_HIDE_ON = ['/kids/classroom', '/kids/join', '/kids/parents', '/kids/teach', '/kids/schools']

export interface AskSparkProps {
  /** Path prefixes where the floating button is hidden. openSpark() still works there. */
  hideOn?: string[]
}

export default function AskSparkClient({ hideOn = DEFAULT_HIDE_ON }: AskSparkProps) {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)
  const [request, setRequest] = useState<OpenSparkDetail | null>(null)
  const [requestId, setRequestId] = useState(0)
  // Rendered into <body> through a portal so no stacking context in the shell
  // (sticky header, z-indexed main/footer) can sit above the button or sheet.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const show = useCallback((detail: OpenSparkDetail | null) => {
    setRequest(detail)
    setRequestId((n) => n + 1)
    setOpen(true)
  }, [])

  useEffect(() => {
    const onOpen = (e: Event) => show((e as CustomEvent<OpenSparkDetail>).detail ?? null)
    window.addEventListener(OPEN_SPARK_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_SPARK_EVENT, onOpen)
  }, [show])

  // Prefetch the sheet when the phone is idle.
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
    const t = w.requestIdleCallback ? w.requestIdleCallback(() => void loadSheet(), { timeout: 4000 }) : window.setTimeout(() => void loadSheet(), 3000)
    return () => {
      if (!w.requestIdleCallback) window.clearTimeout(t)
    }
  }, [])

  const hidden = hideOn.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (!mounted) return null
  return createPortal(
    <>
      {!hidden && !open && (
        <button
          type="button"
          onClick={() => show(null)}
          aria-label="Ask Spark, your robot helper"
          className="fixed right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-amber-500 pl-2 pr-4 font-display text-base font-extrabold text-[#1A1103] shadow-[0_8px_24px_rgba(0,0,0,.45)] transition-transform duration-200 hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-95 bottom-[calc(env(safe-area-inset-bottom)+84px)] min-[901px]:bottom-6 min-[901px]:right-6"
        >
          <SparkFace />
          <span>Ask Spark</span>
        </button>
      )}
      {open && <SparkSheet key={requestId} initial={request} onClose={() => setOpen(false)} />}
    </>,
    document.body,
  )
}

/** Small inline Spark face: no image request, crisp at any size. */
export function SparkFace({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
      <circle cx="20" cy="20" r="19" fill="#0A1120" />
      <rect x="9" y="11" width="22" height="18" rx="7" fill="#FF8A4C" />
      <rect x="12" y="15" width="16" height="9" rx="4" fill="#0A1120" />
      <circle cx="16.5" cy="19.5" r="2.2" fill="#00E5FF" />
      <circle cx="23.5" cy="19.5" r="2.2" fill="#00E5FF" />
      <line x1="20" y1="11" x2="20" y2="6.5" stroke="#FF8A4C" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="5.5" r="2" fill="#FFA878" />
    </svg>
  )
}
