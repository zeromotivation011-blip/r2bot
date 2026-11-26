'use client'

// components/kids/episodes/EpisodeLabClient.tsx
// The preview page's player wrapper: plays one Level 1 episode standalone,
// then offers the next one. With ?record=1 it fills the window (1280×720 in
// the recorder) and hides everything else. When the 3D cartoon cannot play
// here (no WebGL, too slow), it says so and points at the script below.

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import EpisodePlayerClient, { type Unavailable } from './EpisodePlayerClient'

export interface EpisodeLabProps {
  sessionId: string
  nextId: string | null
  nextTitle: string | null
}

const WHY: Record<Unavailable, string> = {
  'no-webgl': 'This browser cannot show 3D pictures (WebGL is switched off or not supported).',
  'engine-failed': 'The 3D cartoon could not start on this device.',
  'too-slow': 'The 3D cartoon runs too slowly on this device.',
}

export default function EpisodeLabClient({ sessionId, nextId, nextTitle }: EpisodeLabProps) {
  const [record, setRecord] = useState(false)
  const [done, setDone] = useState(false)
  const [unavailable, setUnavailable] = useState<Unavailable | null>(null)
  useEffect(() => {
    setRecord(new URLSearchParams(window.location.search).get('record') === '1')
  }, [])
  useEffect(() => setUnavailable(null), [sessionId])
  const onDone = useCallback(() => setDone(true), [])

  if (record) {
    // A portal, so the app shell's own stacking contexts cannot sit on top of the video.
    return createPortal(
      <div className="fixed inset-0 z-[2147483000] bg-[#0A1120]">
        <EpisodePlayerClient sessionId={sessionId} onDone={onDone} />
      </div>,
      document.body,
    )
  }
  return (
    <div>
      {unavailable ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-[28px] border border-white/10 bg-[#111C32] p-6 text-center" role="status">
          <span className="text-5xl" aria-hidden="true">
            📖
          </span>
          <p className="max-w-md font-display text-xl font-bold text-white">{WHY[unavailable]}</p>
          <p className="max-w-md text-[#A7B0C0]">In the course, this episode opens as an illustrated storybook instead. Here, you can read the whole script below.</p>
          <a href="#script" className="inline-flex min-h-12 items-center rounded-full bg-amber-500 px-5 font-display font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
            Read the script
          </a>
        </div>
      ) : (
        <EpisodePlayerClient key={sessionId} sessionId={sessionId} onDone={onDone} onUnavailable={setUnavailable} />
      )}
      <div className="mt-3 flex min-h-12 flex-wrap items-center justify-between gap-3" aria-live="polite">
        <p className="text-sm text-[#A7B0C0]">
          {done ? 'Episode watched — nice work!' : 'Tip: tap the picture to pause. Join in when Spark asks you!'}
        </p>
        {nextId && (
          <Link
            href={`/kids/lab/episodes/${nextId}`}
            className={`inline-flex h-12 items-center rounded-full px-5 font-display font-bold transition active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
              done ? 'bg-amber-500 text-[#1A1103] hover:bg-amber-400' : 'border border-white/15 text-white hover:border-amber-400'
            }`}
          >
            Next: {nextTitle} →
          </Link>
        )}
      </div>
    </div>
  )
}
