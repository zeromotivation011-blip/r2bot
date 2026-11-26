'use client'

// components/kids/worlds/station/StationWorldClient.tsx
// Client islands of the Space Station world page:
//   StationActivities    — the world's activities per age band (links are in
//                          the server HTML; done-ticks appear once progress is read);
//   StationProgressCard  — how much of the world is done (an orbit that fills
//                          up), Orbit Repair Crew tiers cleared, and the
//                          world-complete celebration card.
// Progress comes from lib/kids/activities/progress.ts and the game's personal
// bests in lib/kids-progress.ts; both refresh on KIDS_PROGRESS_EVENT. Nothing
// here writes progress.

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { getActivitiesDone, type ActivitiesDone } from '@/lib/kids/activities/progress'
import { KIDS_PROGRESS_EVENT, getProgress } from '@/lib/kids-progress'
import { TIER_NAMES } from '@/lib/kids/universe/tiers'
import { fireConfetti } from '@/components/kids/Confetti'

export interface StationActivity {
  id: string
  title: string
  track: string
  difficulty: number
  template: string
}

export interface StationBand {
  id: string
  name: string
  ages: string
  learn: string
  items: StationActivity[]
}

function useStationProgress(gameId: string) {
  const [done, setDone] = useState<ActivitiesDone>({})
  const [tiers, setTiers] = useState<boolean[]>([false, false, false, false])
  const [name, setName] = useState('')
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const read = () => {
      setDone(getActivitiesDone())
      const p = getProgress()
      setTiers(TIER_NAMES.map((_, i) => p.personalBests[`${gameId}:t${i}`] !== undefined))
      setName(p.explorerName || '')
      setReady(true)
    }
    read()
    window.addEventListener(KIDS_PROGRESS_EVENT, read)
    window.addEventListener('storage', read)
    return () => {
      window.removeEventListener(KIDS_PROGRESS_EVENT, read)
      window.removeEventListener('storage', read)
    }
  }, [gameId])
  return { done, tiers, name, ready }
}

const KIND: Record<string, string> = {
  'robot-match': 'Match',
  'classify-sort': 'Sort',
  'sequence-path': 'Program',
  estimate: 'Estimate',
  'threshold-tuner': 'Tune',
  'predict-output': 'Trace code',
  'path-planner': 'Plan route',
  'control-tuner': 'Control',
  'signal-graph': 'Read data',
  'flowchart-builder': 'Flowchart',
  'ethics-dilemma': 'Decide',
}

export function StationActivities({ bands, gameId }: { bands: StationBand[]; gameId: string }) {
  const { done } = useStationProgress(gameId)
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {bands.map((b) => {
        const n = b.items.filter((a) => done[a.id]).length
        return (
          <section
            key={b.id}
            aria-labelledby={`station-band-${b.id}`}
            className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)]"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 id={`station-band-${b.id}`} className="font-display text-xl font-bold text-[#EEF2F8]">
                {b.name} <span className="text-base font-medium text-[#A7B0C0]">· ages {b.ages}</span>
              </h3>
              <span className="font-display text-sm font-bold text-cyan-300">
                {n}/{b.items.length}
              </span>
            </div>
            <p className="mt-1 text-[15px] leading-snug text-[#A7B0C0]">{b.learn}</p>
            <ol className="mt-3 flex flex-col gap-1.5">
              {b.items.map((a) => {
                const d = done[a.id]
                return (
                  <li key={a.id}>
                    <Link
                      href={`/kids/galaxy/${a.track}/${a.id}`}
                      className="flex min-h-[48px] items-center gap-3 rounded-2xl border border-white/10 bg-[#111C32] px-3 py-2 text-[#EEF2F8] transition hover:-translate-y-0.5 hover:border-cyan-300/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    >
                      <span
                        aria-hidden
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${d ? 'bg-cyan-400 text-[#0A1120]' : 'bg-white/10 text-[#A7B0C0]'}`}
                      >
                        {d ? '✓' : a.difficulty}
                      </span>
                      <span className="flex-1 text-[15px] font-semibold leading-snug">{a.title}</span>
                      <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[12px] text-[#A7B0C0]">{KIND[a.template] ?? 'Activity'}</span>
                      {d && <span className="sr-only">(done, {d.stars} stars)</span>}
                    </Link>
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}
    </div>
  )
}

/** An orbit ring that fills up as activities are done, with a satellite riding the leading edge. */
function OrbitGauge({ pct }: { pct: number }) {
  const r = 44
  const c = 2 * Math.PI * r
  const a = (pct / 100) * 2 * Math.PI - Math.PI / 2
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0" aria-hidden>
      <defs>
        <radialGradient id="station-earth" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#4fb3ff" />
          <stop offset="70%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#0b2d5c" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="26" fill="url(#station-earth)" />
      <path d="M44 52c6-4 12-2 14 3s-4 9-9 8-8-7-5-11zM64 66c5-2 10 0 10 4s-5 6-9 4-4-6-1-8z" fill="#4ade80" opacity=".8" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="6" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="#FC6818"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        transform="rotate(-90 60 60)"
        className="transition-[stroke-dasharray] duration-500 motion-reduce:transition-none"
      />
      <g transform={`translate(${60 + Math.cos(a) * r} ${60 + Math.sin(a) * r})`}>
        <rect x="-5" y="-4" width="10" height="8" rx="2" fill="#EEF2F8" />
        <rect x="-13" y="-2" width="7" height="4" fill="#60a5fa" />
        <rect x="6" y="-2" width="7" height="4" fill="#60a5fa" />
      </g>
    </svg>
  )
}

export function StationProgressCard({ ids, gameId }: { ids: string[]; gameId: string }) {
  const { done, tiers, name, ready } = useStationProgress(gameId)
  const n = ids.filter((id) => done[id]).length
  const stars = ids.reduce((t, id) => t + (done[id]?.stars ?? 0), 0)
  const tiersDone = tiers.filter(Boolean).length
  const complete = ready && n === ids.length && ids.length > 0 && tiersDone === TIER_NAMES.length
  const pct = Math.round((n / Math.max(1, ids.length)) * 100)
  const celebrated = useRef(false)

  useEffect(() => {
    if (!complete || celebrated.current) return
    celebrated.current = true
    try {
      const key = 'r2bot_world_complete_station'
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '1')
        fireConfetti()
      }
    } catch {
      /* storage blocked: celebrate quietly */
    }
  }, [complete])

  const rank = pct >= 100 ? 'Mission specialist' : pct >= 50 ? 'Arm operator' : pct >= 20 ? 'Flight cadet' : 'Ground crew'

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="station-progress" className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
        <h2 id="station-progress" className="font-display text-xl font-bold text-[#EEF2F8]">
          Your mission log
        </h2>
        <div className="mt-3 flex items-center gap-4">
          <OrbitGauge pct={pct} />
          <div className="text-[15px] leading-snug text-[#A7B0C0]">
            <p>
              <b className="font-display text-2xl text-[#EEF2F8]">{n}</b> of {ids.length} activities ({pct}%)
            </p>
            <p>⭐ {stars} stars earned</p>
            <p className="mt-1">
              Rank: <b className="text-cyan-200">{rank}</b>
            </p>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm font-bold text-[#EEF2F8]">Orbit Repair Crew tiers cleared</p>
          <ul className="mt-2 grid grid-cols-4 gap-1.5">
            {TIER_NAMES.map((t, i) => (
              <li key={t} className={`rounded-xl px-1 py-2 text-center text-[13px] font-bold ${tiers[i] ? 'bg-amber-500 text-[#1A1103]' : 'bg-white/5 text-[#6E7888]'}`}>
                {tiers[i] ? '✓ ' : ''}
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-3 text-sm text-[#6E7888]">Progress is saved on this device only.</p>
      </section>

      {complete ? (
        <section
          aria-labelledby="station-cert"
          className="relative overflow-hidden rounded-[28px] border-2 border-amber-300/70 bg-gradient-to-br from-slate-300 via-indigo-900 to-[#0A1120] p-6 text-center shadow-[0_8px_24px_rgba(0,0,0,.45)]"
        >
          <p aria-hidden className="text-5xl motion-safe:animate-bounce">
            🛰️
          </p>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-white">World complete</p>
          <h2 id="station-cert" className="mt-1 font-display text-3xl font-bold text-white">
            Orbital Robotics Specialist
          </h2>
          {name && <p className="mt-1 font-display text-xl font-bold text-amber-200">{name}</p>}
          <p className="mx-auto mt-3 max-w-sm text-[16px] leading-snug text-white/90">
            You finished all {ids.length} Space Station activities and every Orbit Repair Crew tier. You can fly with puffs, match speeds before a
            capture, keep a spacecraft steady while its arm moves, and plan around a signal delay.
          </p>
          <p className="mt-3 font-display text-lg font-bold text-white">⭐ {stars} stars</p>
        </section>
      ) : (
        <section aria-labelledby="station-cert-locked" className="rounded-[28px] border-2 border-dashed border-white/15 bg-[#111C32] p-5 text-center">
          <p aria-hidden className="text-4xl opacity-60 grayscale">
            🛰️
          </p>
          <h2 id="station-cert-locked" className="mt-1 font-display text-xl font-bold text-[#EEF2F8]">
            Orbital Robotics Specialist
          </h2>
          <p className="mt-1 text-[15px] text-[#A7B0C0]">
            Finish all {ids.length} activities and all four Orbit Repair Crew tiers to complete the Space Station.{' '}
            {ids.length - n > 0 ? `${ids.length - n} activities` : 'No activities'} and {TIER_NAMES.length - tiersDone} tier{TIER_NAMES.length - tiersDone === 1 ? '' : 's'} to go!
          </p>
        </section>
      )}
    </div>
  )
}
