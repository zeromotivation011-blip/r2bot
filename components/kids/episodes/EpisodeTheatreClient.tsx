'use client'

// components/kids/episodes/EpisodeTheatreClient.tsx
// The Episodes Theatre player (roadmap #8): one Piper-voiced 3D episode, then
// "Play this mission" (the course session it opens) and the next episode.
// The three.js player itself waits behind its own poster tap. When the 3D
// cartoon cannot play here it says so and points at the script on the page.

import Link from 'next/link'
import { useCallback, useState } from 'react'
import EpisodePlayerClient, { type Unavailable } from './EpisodePlayerClient'

export interface EpisodeTheatreProps {
  sessionId: string
  missionHref: string
  missionTitle: string
  nextHref: string | null
  nextTitle: string | null
}

const WHY: Record<Unavailable, string> = {
  'no-webgl': 'This browser cannot show 3D pictures (WebGL is switched off or not supported).',
  'engine-failed': 'The 3D cartoon could not start on this device.',
  'too-slow': 'The 3D cartoon runs too slowly on this device.',
}

const pill =
  'inline-flex min-h-12 items-center justify-center rounded-full px-5 font-display font-bold transition active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

export default function EpisodeTheatreClient({ sessionId, missionHref, missionTitle, nextHref, nextTitle }: EpisodeTheatreProps) {
  const [done, setDone] = useState(false)
  const [unavailable, setUnavailable] = useState<Unavailable | null>(null)
  const onDone = useCallback(() => setDone(true), [])

  return (
    <div>
      {unavailable ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-[28px] border border-white/10 bg-[#111C32] p-6 text-center" role="status">
          <span className="text-5xl" aria-hidden="true">
            📖
          </span>
          <p className="max-w-md font-display text-xl font-bold text-white">{WHY[unavailable]}</p>
          <p className="max-w-md text-[#A7B0C0]">You can read the whole story below, then play the mission — it works on every device.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="#script" className={`${pill} border border-white/15 text-white hover:border-amber-400`}>
              Read the script
            </a>
            <Link href={missionHref} className={`${pill} bg-amber-500 text-[#1A1103] hover:bg-amber-400`}>
              Play this mission
            </Link>
          </div>
        </div>
      ) : (
        <EpisodePlayerClient key={sessionId} sessionId={sessionId} onDone={onDone} onUnavailable={setUnavailable} />
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3" aria-live="polite">
        <p className="w-full text-sm text-[#A7B0C0] sm:w-auto sm:flex-1">
          {done ? `Episode watched! Now it is your turn: ${missionTitle}.` : 'Tip: tap the picture to pause. Join in when Spark asks you!'}
        </p>
        <Link
          href={missionHref}
          data-testid="theatre-mission"
          className={`${pill} ${done ? 'bg-amber-500 text-[#1A1103] hover:bg-amber-400 motion-safe:animate-pulse' : 'bg-amber-500 text-[#1A1103] hover:bg-amber-400'}`}
        >
          <span aria-hidden className="mr-1.5">
            🎮
          </span>
          Play this mission
        </Link>
        {nextHref && (
          <Link href={nextHref} className={`${pill} border border-white/15 text-white hover:border-amber-400`}>
            Next: {nextTitle} →
          </Link>
        )}
      </div>
    </div>
  )
}
