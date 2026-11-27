'use client'

// components/kids/galaxy/TrackClient.tsx
// One constellation, large, with mastery per band. The server page lists the
// same activities as plain text below it.

import { useMemo, useState } from 'react'
import { KIDS_BANDS, getBand } from '@/lib/kids/bands'
import { TRACKS, type TrackId } from '@/lib/kids/activities/types'
import { orderActivities, trackMastery, visibleBands, type ActivitySummary } from '@/lib/kids/activities/progress'
import { Constellation } from './ConstellationClient'
import { MasteryRing, ShowAllToggle } from './GalaxyClient'
import { useGalaxyState } from './useGalaxyState'
import { useMastery } from './useMastery'

export default function TrackClient({ trackId, activities }: { trackId: TrackId; activities: ActivitySummary[] }) {
  const track = TRACKS.find((t) => t.id === trackId) ?? TRACKS[0]
  const { ready, done, band } = useGalaxyState()
  const { starts } = useMastery()
  const [showAll, setShowAll] = useState(false)
  const ordered = useMemo(() => orderActivities(activities), [activities])
  const bands = useMemo(() => new Set(visibleBands(band ?? 'builders', showAll || !band)), [band, showAll])
  const shown = ordered.filter((a) => bands.has(a.band))
  const overall = trackMastery(activities, ready ? done : {}, trackId)

  return (
    <section aria-label={`${track.name} constellation`} className="rounded-[28px] border border-white/[0.08] bg-[#111C32] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-6">
      <div className="flex flex-wrap items-center gap-4">
        <MasteryRing pct={overall.pct} track={track} size={64} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold text-[#EEF2F8]">
            {ready ? `${overall.done} of ${overall.total} missions done` : `${overall.total} missions`}
          </p>
          <ul className="mt-1 flex flex-wrap gap-2" aria-label="Mastery by age band">
            {KIDS_BANDS.map((b) => {
              const m = trackMastery(activities, ready ? done : {}, trackId, b.id)
              if (!m.total) return null
              return (
                <li key={b.id} className={`rounded-full border px-2.5 py-1 text-[13px] font-semibold ${m.mastered && ready ? 'border-[#00B8D4]/50 text-[#67E8F9]' : 'border-white/[0.08] text-[#A7B0C0]'}`}>
                  {b.emoji} {b.name} {ready ? `${m.done}/${m.total}` : m.total}
                  {m.mastered && ready ? ' · Mastered' : ''}
                </li>
              )
            })}
          </ul>
        </div>
        {band && <ShowAllToggle on={showAll} onChange={setShowAll} />}
      </div>
      {!band && <p className="mt-3 text-[15px] text-[#A7B0C0]">Showing every age. Pick your age on the Skill Galaxy page to see your own missions first.</p>}
      {band && !showAll && <p className="mt-3 text-[15px] text-[#A7B0C0]">Showing missions for {getBand(band)?.name} and the bands either side.</p>}
      <div className="mt-4">
        {shown.length ? (
          <Constellation track={track} activities={shown} allOfTrack={ordered} done={done} ready={ready} cols={5} start={starts[trackId]} />
        ) : (
          <p className="rounded-2xl border border-dashed border-white/[0.16] p-4 text-center text-[15px] text-[#A7B0C0]">New missions for your age are landing here soon.</p>
        )}
      </div>
    </section>
  )
}
