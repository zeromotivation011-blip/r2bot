'use client'

// components/kids/story/WatchedBadgeClient.tsx
// "Watched ✓ ★★☆" badge for an episode card, read from this device only.

import { useEffect, useState } from 'react'
import { getProgress, KIDS_PROGRESS_EVENT } from '@/lib/kids-progress'

export default function WatchedBadgeClient({ slug }: { slug: string }) {
  const [stars, setStars] = useState(0)
  useEffect(() => {
    const read = () => setStars(getProgress().episodesDone[slug] ?? 0)
    read()
    window.addEventListener(KIDS_PROGRESS_EVENT, read)
    return () => window.removeEventListener(KIDS_PROGRESS_EVENT, read)
  }, [slug])
  if (!stars) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-200 ring-1 ring-emerald-400/40">
      <span aria-hidden>✓</span> Watched
      <span className="text-amber-300" aria-label={`${stars} of 3 stars`}>
        {'★'.repeat(stars)}
        <span className="text-white/25">{'★'.repeat(3 - stars)}</span>
      </span>
    </span>
  )
}
