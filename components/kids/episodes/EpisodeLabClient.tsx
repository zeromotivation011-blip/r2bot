'use client'

// components/kids/episodes/EpisodeLabClient.tsx
// The preview page's player wrapper: plays one Level 1 episode standalone,
// then offers the next one. With ?record=1 it fills the window (1280×720 in
// the recorder) and hides everything else.

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import EpisodePlayerClient from './EpisodePlayerClient'

export interface EpisodeLabProps {
  sessionId: string
  nextId: string | null
  nextTitle: string | null
}

export default function EpisodeLabClient({ sessionId, nextId, nextTitle }: EpisodeLabProps) {
  const [record, setRecord] = useState(false)
  const [done, setDone] = useState(false)
  useEffect(() => {
    setRecord(new URLSearchParams(window.location.search).get('record') === '1')
  }, [])
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
      <EpisodePlayerClient sessionId={sessionId} onDone={onDone} />
      <div className="mt-3 flex min-h-12 flex-wrap items-center justify-between gap-3" aria-live="polite">
        <p className="text-sm text-[#A7B0C0]">
          {done ? 'Episode watched — nice work!' : 'Tip: tap the picture to pause. Captions follow every word.'}
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
