'use client'

// components/kids/galaxy/GalaxyClient.tsx
// The Skill Galaxy map: today's three missions, then ten track constellations
// filtered to the child's band ± one (or every age). Receives light activity
// summaries from the server page; reads progress from localStorage.

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { KIDS_BANDS, getBand, type BandId } from '@/lib/kids/bands'
import { TRACKS, type Track, type TrackId } from '@/lib/kids/activities/types'
import { dailyMissions, localDay, orderActivities, trackMastery, visibleBands, type ActivitySummary } from '@/lib/kids/activities/progress'
import { Constellation } from './ConstellationClient'
import { useGalaxyState } from './useGalaxyState'

const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

export function MasteryRing({ pct, track, size = 56 }: { pct: number; track: Track; size?: number }) {
  const r = size / 2 - 5
  const c = 2 * Math.PI * r
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#FC6818" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(c * pct) / 100} ${c}`} className="transition-[stroke-dasharray] duration-700" />
      </svg>
      <span className="absolute text-2xl" aria-hidden>
        {track.icon}
      </span>
    </span>
  )
}

export function BandPicker({ band, onPick, label }: { band: BandId | null; onPick: (b: BandId) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {KIDS_BANDS.map((b) => {
        const on = band === b.id
        return (
          <button
            key={b.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onPick(b.id)}
            className={`flex min-h-[52px] items-center gap-2 rounded-2xl border px-3 text-left transition-transform duration-150 active:scale-[.97] ${focusRing} ${
              on ? 'border-amber-400 bg-amber-500/15 text-[#EEF2F8]' : 'border-white/[0.08] bg-[#111C32] text-[#A7B0C0] hover:border-white/20'
            }`}
          >
            <span className="text-xl" aria-hidden>
              {b.emoji}
            </span>
            <span className="leading-tight">
              <span className="block font-display text-[15px] font-bold">{b.name}</span>
              <span className="block text-[13px]">ages {b.ages}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function ShowAllToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`inline-flex min-h-[44px] items-center gap-3 rounded-2xl px-2 text-[15px] font-semibold text-[#A7B0C0] ${focusRing}`}
    >
      <span className={`relative h-7 w-12 rounded-full transition-colors ${on ? 'bg-amber-500' : 'bg-white/15'}`} aria-hidden>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-[left] duration-200 ${on ? 'left-6' : 'left-1'}`} />
      </span>
      Show all ages
    </button>
  )
}

/** Stars per constellation on the hub (the track page shows every one). */
const HUB_WINDOW = 16

export default function GalaxyClient({ summaries }: { summaries: ActivitySummary[] }) {
  const { ready, done, band, setBand } = useGalaxyState()
  const [showAll, setShowAll] = useState(false)
  const effectiveBand: BandId = band ?? 'builders'
  const bands = useMemo(() => new Set(visibleBands(effectiveBand, showAll || !band)), [effectiveBand, showAll, band])

  const byTrack = useMemo(() => {
    const m = new Map<TrackId, ActivitySummary[]>()
    for (const t of TRACKS) m.set(t.id, orderActivities(summaries.filter((a) => a.track === t.id)))
    return m
  }, [summaries])

  const missions = useMemo(() => (ready ? dailyMissions(summaries, effectiveBand, localDay()) : []), [ready, summaries, effectiveBand])
  const doneCount = ready ? summaries.filter((a) => done[a.id]).length : 0
  const starCount = ready ? summaries.reduce((s, a) => s + (done[a.id]?.stars ?? 0), 0) : 0
  const bandInfo = getBand(effectiveBand)

  return (
    <div className="flex flex-col gap-8">
      {/* Who is exploring */}
      <section aria-labelledby="who-title" className="rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="who-title" className="font-display text-xl font-bold text-[#EEF2F8]">
              {band ? `${bandInfo?.emoji} ${bandInfo?.name} galaxy` : 'Who is exploring?'}
            </h2>
            <p className="mt-1 text-[15px] text-[#A7B0C0]">
              {band ? 'Your age band and the ones either side. Change it any time.' : 'Pick your age so the galaxy shows missions made for you.'}
            </p>
          </div>
          <dl className="flex gap-5 font-display">
            <div>
              <dt className="text-[13px] font-semibold uppercase tracking-wider text-[#6E7888]">Missions done</dt>
              <dd className="text-2xl font-bold text-[#EEF2F8]">
                {ready ? doneCount : '–'}
                <span className="text-base text-[#6E7888]">/{summaries.length}</span>
              </dd>
            </div>
            <div>
              <dt className="text-[13px] font-semibold uppercase tracking-wider text-[#6E7888]">Stars</dt>
              <dd className="text-2xl font-bold text-amber-300">{ready ? starCount : '–'} ★</dd>
            </div>
          </dl>
        </div>
        <div className="mt-4">
          <BandPicker band={band} onPick={setBand} label="Your age band" />
        </div>
        {band && (
          <div className="mt-2">
            <ShowAllToggle on={showAll} onChange={setShowAll} />
          </div>
        )}
      </section>

      {/* Today's missions */}
      <section aria-labelledby="missions-title">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="missions-title" className="font-display text-2xl font-bold text-[#EEF2F8]">
            Today’s Galaxy missions
          </h2>
          <span className="text-sm text-[#6E7888]">New ones every day</span>
        </div>
        <ol className="mt-3 grid gap-3 md:grid-cols-3">
          {!ready
            ? [0, 1, 2].map((i) => <li key={i} className="h-[112px] rounded-[20px] border border-white/[0.08] bg-[#111C32] motion-safe:animate-pulse" />)
            : missions.map((m, i) => {
                const t = TRACKS.find((x) => x.id === m.track) ?? TRACKS[0]
                const d = done[m.id]
                return (
                  <li key={m.id}>
                    <Link
                      href={`/kids/galaxy/${m.track}/${m.id}`}
                      className={`group flex h-full min-h-[112px] items-center gap-4 rounded-[20px] border bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] transition-transform duration-200 hover:-translate-y-0.5 active:scale-[.97] ${focusRing} ${
                        d ? 'border-[#22C55E]/40' : 'border-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${t.gradient} text-2xl`} aria-hidden>
                        {t.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold uppercase tracking-wider text-amber-300">
                          Mission {i + 1} · {t.name}
                        </span>
                        <span className="mt-0.5 block font-display text-lg font-bold leading-tight text-[#EEF2F8]">{m.title}</span>
                        <span className="mt-0.5 block text-sm text-[#A7B0C0]">{d ? `Done · ${'★'.repeat(d.stars)}` : getBand(m.band)?.name}</span>
                      </span>
                      <span aria-hidden className={`text-xl ${d ? 'text-[#22C55E]' : 'text-amber-300'}`}>
                        {d ? '✓' : '→'}
                      </span>
                    </Link>
                  </li>
                )
              })}
        </ol>
      </section>

      {/* The constellations */}
      <section aria-labelledby="map-title">
        <h2 id="map-title" className="font-display text-2xl font-bold text-[#EEF2F8]">
          The ten constellations
        </h2>
        <p className="mt-1 text-[15px] text-[#A7B0C0]">Tap a star to play. The glowing orange star is your next mission.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {TRACKS.map((t) => {
            const all = byTrack.get(t.id) ?? []
            const inBand = all.filter((a) => bands.has(a.band))
            // The hub shows a window of HUB_WINDOW stars per track (from just before the
            // child's next one); the track page has them all. Drawing all ~650 stars here
            // made a 1 MB page and a big layout shift.
            const firstOpen = ready ? Math.max(0, inBand.findIndex((a) => !done[a.id])) : 0
            const start = Math.max(0, Math.min(firstOpen - 3, inBand.length - HUB_WINDOW))
            const shown = inBand.slice(start, start + HUB_WINDOW)
            const m = trackMastery(summaries, ready ? done : {}, t.id, band ?? undefined)
            const hidden = all.length - inBand.length
            return (
              <article key={t.id} aria-labelledby={`track-${t.id}`} className="rounded-[28px] border border-white/[0.08] bg-[#111C32] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-5">
                <header className="flex items-center gap-3">
                  <MasteryRing pct={m.pct} track={t} />
                  <div className="min-w-0 flex-1">
                    <h3 id={`track-${t.id}`} className="font-display text-xl font-bold text-[#EEF2F8]">
                      <Link href={`/kids/galaxy/${t.id}`} className={`inline-flex min-h-[44px] items-center rounded-lg hover:text-amber-300 ${focusRing}`}>
                        {t.name}
                      </Link>
                    </h3>
                    <p className="text-[15px] text-[#A7B0C0]">{t.blurb}</p>
                  </div>
                  <span className="text-right font-display text-sm font-bold text-[#A7B0C0]">
                    {ready ? `${m.pct}%` : ''}
                    {m.mastered && ready && <span className="block text-[13px] text-[#67E8F9]">Mastered</span>}
                  </span>
                </header>
                <div className="mt-3">
                  {shown.length ? (
                    <>
                      <Constellation track={t} activities={shown} allOfTrack={all} done={done} ready={ready} />
                      {inBand.length > shown.length && (
                        <Link href={`/kids/galaxy/${t.id}`} className={`mt-1 flex min-h-[44px] items-center justify-center rounded-xl text-[15px] font-semibold text-amber-300 hover:text-amber-200 ${focusRing}`}>
                          All {inBand.length} {t.name} missions →
                        </Link>
                      )}
                    </>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-white/[0.16] p-4 text-center text-[15px] text-[#A7B0C0]">
                      New missions for your age are landing here soon.
                      {hidden > 0 && (
                        <>
                          {' '}
                          <button type="button" onClick={() => setShowAll(true)} className={`min-h-[44px] font-semibold text-amber-300 underline underline-offset-4 ${focusRing}`}>
                            Show all ages ({hidden})
                          </button>
                        </>
                      )}
                    </p>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
