'use client'

// components/kids/galaxy/PacingNudgeClient.tsx
// Adaptive pacing inside the activity player (roadmap #29). Two offers, never
// forced, both answering the two first impressions that lose a child:
//   - "Too easy": three first-try wins in a row in this track → "Skip to Ace?"
//     (saves the track's start point and links to the first open Ace mission).
//   - "I'm bad at this": two misses in a row (two wrong checks inside this
//     mission, or two missions in this track not solved first try) → an easier
//     mission on the SAME concept.
// Reads the one progress store (mastery log + start points). Renders nothing
// when there is nothing to offer.

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { ActivitySummary } from '@/lib/kids/activities/progress'
import { aceTarget, easierSameConcept, setTrackStart, shouldOfferEasier, shouldOfferSkip } from '@/lib/kids/activities/pacing'
import { CONCEPT_INFO } from '@/lib/kids/universe/mastery'
import { getBand } from '@/lib/kids/bands'
import { useGalaxyState } from './useGalaxyState'
import { useMastery } from './useMastery'

const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

interface Props {
  activity: Pick<ActivitySummary, 'id' | 'track' | 'band' | 'difficulty' | 'concepts'>
  /** Summaries of the track (ActivitySummary carries concepts). */
  trackActivities: ActivitySummary[]
  /** 'play': only the in-mission "easier one" offer; 'done': both. */
  stage: 'play' | 'done'
  /** Wrong checks in a row inside the current mission. */
  wrongInARow?: number
}

export default function PacingNudgeClient({ activity, trackActivities, stage, wrongInARow = 0 }: Props) {
  const { ready, log, starts } = useMastery()
  const { done, band } = useGalaxyState()
  const [dismissed, setDismissed] = useState<'skip' | 'easier' | null>(null)
  // Saving the start point ends the offer (the track is at Ace now), so keep the confirmation here.
  const [skipped, setSkipped] = useState<{ first: ActivitySummary | undefined } | null>(null)
  const childBand = band ?? activity.band

  const skip = useMemo(() => {
    if (!ready || stage !== 'done') return null
    if (!shouldOfferSkip(log, activity.track, childBand, activity.difficulty, starts[activity.track])) return null
    return aceTarget(trackActivities, activity.track, childBand, done)
  }, [ready, stage, log, activity.track, activity.difficulty, childBand, starts, trackActivities, done])

  const easier = useMemo(() => {
    if (!ready) return undefined
    const offer = stage === 'play' ? wrongInARow >= 2 : shouldOfferEasier(log, activity.track, wrongInARow)
    return offer ? easierSameConcept(trackActivities, activity, done) : undefined
  }, [ready, stage, wrongInARow, log, activity, trackActivities, done])

  const concept = activity.concepts?.[0] ? CONCEPT_INFO[activity.concepts[0]] : undefined

  if (skipped) {
    return (
      <div className="rounded-[20px] border border-amber-400/50 bg-amber-500/10 p-4 sm:p-5" role="status">
        <p className="font-display text-lg font-bold text-[#EEF2F8]">Done: your missions now start at Ace.</p>
        {skipped.first && (
          <Link href={`/kids/galaxy/${skipped.first.track}/${skipped.first.id}`} className={`mt-3 inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-amber-500 px-5 font-display font-bold text-[#1A1103] ${focusRing}`}>
            {skipped.first.title} <span aria-hidden>→</span>
          </Link>
        )}
      </div>
    )
  }

  if (skip && dismissed !== 'skip') {
    return (
      <div className="rounded-[20px] border border-amber-400/50 bg-amber-500/10 p-4 sm:p-5" role="status">
        <p className="font-display text-lg font-bold text-[#EEF2F8]">Three first-try wins in a row! Skip to Ace?</p>
        <p className="mt-1 text-[15px] text-[#A7B0C0]">Your next missions here will start at the Ace level for {getBand(childBand)?.name}. The easier ones stay open.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setSkipped({ first: skip.first })
              setTrackStart(activity.track, skip.start)
            }}
            className={`inline-flex min-h-[48px] items-center rounded-2xl bg-amber-500 px-5 font-display font-bold text-[#1A1103] ${focusRing}`}
          >
            Yes, skip to Ace
          </button>
          <button type="button" onClick={() => setDismissed('skip')} className={`inline-flex min-h-[48px] items-center rounded-2xl border border-white/[0.16] px-5 font-display font-bold text-[#EEF2F8] ${focusRing}`}>
            Not now
          </button>
        </div>
      </div>
    )
  }

  if (easier && dismissed !== 'easier') {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-[20px] border border-[#00B8D4]/40 bg-[#00B8D4]/10 p-4" role="status">
        <p className="min-w-0 flex-1 text-[15px] text-[#EEF2F8]">
          <strong className="font-display">Tricky one?</strong> Try an easier mission{concept ? ` about ${concept.name.toLowerCase()}` : ''} first, then come back.
        </p>
        <Link href={`/kids/galaxy/${easier.track}/${easier.id}`} className={`inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-[#00B8D4]/50 px-4 font-display font-bold text-[#A5F3FC] ${focusRing}`}>
          {easier.title} <span aria-hidden>→</span>
        </Link>
        <button type="button" onClick={() => setDismissed('easier')} className={`inline-flex min-h-[44px] items-center rounded-xl px-3 text-sm font-semibold text-[#A7B0C0] ${focusRing}`}>
          Keep trying this one
        </button>
      </div>
    )
  }
  return null
}
