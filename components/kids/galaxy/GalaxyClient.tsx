'use client'

// components/kids/galaxy/GalaxyClient.tsx
// The Skill Galaxy map: today's three missions, then ten track constellations
// filtered to the child's band ± one (or every age). Receives light activity
// summaries from the server page; reads progress from localStorage.

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { KIDS_BANDS, getBand, type BandId } from '@/lib/kids/bands'
import { TRACKS, type Track, type TrackId } from '@/lib/kids/activities/types'
import { dailyMissionPlan, localDay, orderActivities, trackMastery, visibleBands, type ActivitySummary, type MissionKind } from '@/lib/kids/activities/progress'
import { describeStart } from '@/lib/kids/activities/pacing'
import { CONCEPT_INFO } from '@/lib/kids/universe/mastery'
import { Constellation } from './ConstellationClient'
import { useGalaxyState } from './useGalaxyState'
import { useMastery } from './useMastery'

/** Today's three missions: what each kind means, in the child's words. */
const MISSION_KIND: Record<MissionKind, { label: string; chip: string }> = {
  new: { label: 'New', chip: 'text-amber-300' },
  recharge: { label: 'Recharge', chip: 'text-amber-300' },
  practice: { label: 'Practise', chip: 'text-[#67E8F9]' },
  stretch: { label: 'Stretch', chip: 'text-[#86EFAC]' },
  explore: { label: 'Explore', chip: 'text-amber-300' },
}

function BatteryMini({ cells }: { cells: number }) {
  return (
    <span className="inline-flex items-center gap-[2px] rounded border border-white/25 p-[2px] align-middle" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={`h-2 w-1.5 rounded-[1px] ${i < cells ? 'bg-amber-400' : 'bg-white/10'}`} />
      ))}
    </span>
  )
}

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

export function BandPicker({ band, onPick, label, locked = null }: { band: BandId | null; onPick: (b: BandId) => void; label: string; locked?: BandId | null }) {
  const lockedInfo = locked ? getBand(locked) : null
  if (lockedInfo)
    return (
      <p className="flex min-h-[52px] items-center gap-2 rounded-2xl border border-cyan-400/30 bg-[#111C32] px-3 text-[15px] text-[#EEF2F8]" data-testid="band-locked">
        <span className="text-xl" aria-hidden>
          {lockedInfo.emoji}
        </span>
        <span>
          Your teacher chose <strong className="font-display">{lockedInfo.name}</strong> (ages {lockedInfo.ages}).
        </span>
      </p>
    )
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
  const { ready, done, band, lockedBand, setBand } = useGalaxyState()
  const mastery = useMastery()
  const [showAll, setShowAll] = useState(false)
  const effectiveBand: BandId = band ?? 'builders'
  const bands = useMemo(() => new Set(visibleBands(effectiveBand, showAll || !band)), [effectiveBand, showAll, band])

  const byTrack = useMemo(() => {
    const m = new Map<TrackId, ActivitySummary[]>()
    for (const t of TRACKS) m.set(t.id, orderActivities(summaries.filter((a) => a.track === t.id)))
    return m
  }, [summaries])

  const missionsReady = ready && mastery.ready
  const missions = useMemo(
    () =>
      missionsReady
        ? dailyMissionPlan(summaries, effectiveBand, localDay(), {
            done,
            mastery: { conceptLog: mastery.log, conceptSecured: mastery.secured },
            starts: mastery.starts,
          })
        : [],
    [missionsReady, summaries, effectiveBand, done, mastery.log, mastery.secured, mastery.starts],
  )
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
          <BandPicker band={band} onPick={setBand} label="Your age band" locked={lockedBand} />
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
          <span className="text-sm text-[#6E7888]">New ones every day · skipping a day costs nothing</span>
        </div>
        <ol className="mt-3 grid gap-3 md:grid-cols-3">
          {!missionsReady
            ? [0, 1, 2].map((i) => <li key={i} className="h-[112px] rounded-[20px] border border-white/[0.08] bg-[#111C32] motion-safe:animate-pulse" />)
            : missions.map(({ activity: m, kind, concept, conceptState }) => {
                const t = TRACKS.find((x) => x.id === m.track) ?? TRACKS[0]
                const rec = done[m.id]
                const d = rec && rec.at === localDay() ? rec : undefined
                const k = MISSION_KIND[kind]
                const forConcept = concept ? CONCEPT_INFO[concept] : undefined
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
                        <span className={`block text-[13px] font-semibold uppercase tracking-wider ${k.chip}`}>
                          {kind === 'recharge' && <span aria-hidden>⚡ </span>}
                          {k.label} · {forConcept ? forConcept.name : t.name}
                        </span>
                        <span className="mt-0.5 block font-display text-lg font-bold leading-tight text-[#EEF2F8]">{m.title}</span>
                        <span className="mt-0.5 block text-sm text-[#A7B0C0]">
                          {d ? (
                            `Done today · ${'★'.repeat(d.stars)}`
                          ) : kind === 'recharge' && conceptState ? (
                            <>
                              <BatteryMini cells={conceptState.cells} /> Battery low: one first-try win recharges it
                            </>
                          ) : kind === 'practice' ? (
                            'Light another star in this constellation'
                          ) : kind === 'stretch' ? (
                            'A step harder than usual'
                          ) : (
                            `${t.name} · ${getBand(m.band)?.name}`
                          )}
                        </span>
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

      {/* Launch Check + skill constellations */}
      <section aria-label="Your start and your skills" className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/kids/galaxy/launch-check"
          className={`flex min-h-[88px] items-center gap-4 rounded-[20px] border border-white/[0.08] bg-[#111C32] p-4 transition-transform duration-200 hover:-translate-y-0.5 hover:border-white/20 active:scale-[.98] ${focusRing}`}
        >
          <span className="text-3xl" aria-hidden>
            🧭
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-bold text-[#EEF2F8]">Launch Check</span>
            <span className="block text-[14px] text-[#A7B0C0]">
              {mastery.ready && Object.keys(mastery.starts).length
                ? `Start points set in ${Object.keys(mastery.starts).length} of ${TRACKS.length} tracks`
                : 'A few quick missions find the right place to start'}
            </span>
          </span>
          <span aria-hidden className="text-amber-300">
            →
          </span>
        </Link>
        <Link
          href="/kids/galaxy/concepts"
          className={`flex min-h-[88px] items-center gap-4 rounded-[20px] border border-white/[0.08] bg-[#111C32] p-4 transition-transform duration-200 hover:-translate-y-0.5 hover:border-white/20 active:scale-[.98] ${focusRing}`}
        >
          <span className="text-3xl" aria-hidden>
            ✨
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-bold text-[#EEF2F8]">Skill constellations</span>
            <span className="block text-[14px] text-[#A7B0C0]">
              {mastery.ready && mastery.states.some((s) => s.status !== 'new')
                ? `${mastery.states.filter((s) => s.status === 'secure').length} secure · ${mastery.states.filter((s) => s.status === 'fading').length} to recharge`
                : 'Sixteen big ideas to light up'}
            </span>
          </span>
          <span aria-hidden className="text-amber-300">
            →
          </span>
        </Link>
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
                    <p className="text-[15px] text-[#A7B0C0]">
                      {t.blurb}
                      {mastery.starts[t.id] && <span className="ml-1 text-[13px] font-semibold text-[#86EFAC]">· Start: {describeStart(mastery.starts[t.id])}</span>}
                    </p>
                  </div>
                  <span className="text-right font-display text-sm font-bold text-[#A7B0C0]">
                    {ready ? `${m.pct}%` : ''}
                    {m.mastered && ready && <span className="block text-[13px] text-[#67E8F9]">Mastered</span>}
                  </span>
                </header>
                <div className="mt-3">
                  {shown.length ? (
                    <>
                      <Constellation track={t} activities={shown} allOfTrack={all} done={done} ready={ready} start={mastery.starts[t.id]} />
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
