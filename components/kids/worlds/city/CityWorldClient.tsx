'use client'

// components/kids/worlds/city/CityWorldClient.tsx
// Client islands of the Robot City world page:
//   CityActivities   — the world's activities per age band (links are in
//                          the server HTML; done-ticks appear once progress is read);
//   CityProgressCard — how much of the world is done, Robot City tiers
//                          cleared, and the world-complete celebration card.
// Progress comes from lib/kids/activities/progress.ts and the game's personal
// bests in lib/kids-progress.ts; both refresh on KIDS_PROGRESS_EVENT. Nothing
// here writes progress.

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { getActivitiesDone, type ActivitiesDone } from '@/lib/kids/activities/progress'
import { KIDS_PROGRESS_EVENT, getProgress } from '@/lib/kids-progress'
import { TIER_NAMES } from '@/lib/kids/universe/tiers'
import { fireConfetti } from '@/components/kids/Confetti'

export interface CityActivity {
  id: string
  title: string
  track: string
  difficulty: number
  template: string
}

export interface CityBand {
  id: string
  name: string
  ages: string
  learn: string
  items: CityActivity[]
}

function useCityProgress(gameId: string) {
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
  'spot-in-scene': 'Spot it',
  'classify-sort': 'Sort',
  'sequence-path': 'Program',
  'sensor-choice': 'Pick sensors',
  'ethics-dilemma': 'Decide',
  'signal-graph': 'Read data',
  'threshold-tuner': 'Tune',
  estimate: 'Estimate',
  'predict-output': 'Trace code',
  'path-planner': 'Plan route',
  'control-tuner': 'Control',
  'flowchart-builder': 'Flowchart',
}

export function CityActivities({ bands, gameId }: { bands: CityBand[]; gameId: string }) {
  const { done } = useCityProgress(gameId)
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {bands.map((b) => {
        const n = b.items.filter((a) => done[a.id]).length
        return (
          <section key={b.id} aria-labelledby={`city-band-${b.id}`} className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
            <div className="flex items-baseline justify-between gap-2">
              <h3 id={`city-band-${b.id}`} className="font-display text-xl font-bold text-[#EEF2F8]">
                {b.name} <span className="text-base font-medium text-[#A7B0C0]">· ages {b.ages}</span>
              </h3>
              <span className="font-display text-sm font-bold text-sky-300">
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
                      className="flex min-h-[48px] items-center gap-3 rounded-2xl border border-white/10 bg-[#111C32] px-3 py-2 text-[#EEF2F8] transition hover:-translate-y-0.5 hover:border-sky-300/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    >
                      <span
                        aria-hidden
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${d ? 'bg-emerald-400 text-[#0A1120]' : 'bg-white/10 text-[#A7B0C0]'}`}
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

/** A night skyline: one building lights up for every finished activity. */
function Skyline({ lit, total }: { lit: number; total: number }) {
  const w = 280
  const step = w / Math.max(1, total)
  const heights = Array.from({ length: total }, (_, i) => 22 + ((i * 37) % 5) * 6)
  return (
    <svg viewBox={`0 0 ${w} 60`} className="h-14 w-full" aria-hidden>
      <rect x="0" y="0" width={w} height="60" rx="10" fill="#07101F" />
      {heights.map((h, i) => (
        <g key={i}>
          <rect x={i * step + 1} y={60 - h} width={step - 2} height={h} rx="1.5" fill={i < lit ? '#19263F' : '#0F1A2E'} />
          {i < lit &&
            [0, 1, 2].map((r) => <rect key={r} x={i * step + step / 2 - 1.5} y={60 - h + 4 + r * 6} width="3" height="3" fill={r === 0 ? '#00E5FF' : '#FFA878'} opacity={h > 10 + r * 6 ? 1 : 0} />)}
        </g>
      ))}
    </svg>
  )
}

export function CityProgressCard({ ids, gameId }: { ids: string[]; gameId: string }) {
  const { done, tiers, name, ready } = useCityProgress(gameId)
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
      const key = 'r2bot_world_complete_city'
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '1')
        fireConfetti()
      }
    } catch {
      /* storage blocked: celebrate quietly */
    }
  }, [complete])

  const rank = pct === 100 ? 'City Robotics Chief' : pct >= 66 ? 'Traffic Engineer' : pct >= 33 ? 'Street Robot Pilot' : pct > 0 ? 'Crossing Cadet' : 'Visitor'

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="city-progress" className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
        <h2 id="city-progress" className="font-display text-xl font-bold text-[#EEF2F8]">
          Your city pass
        </h2>
        <div className="mt-3">
          <Skyline lit={n} total={ids.length} />
        </div>
        <div className="mt-2 text-[15px] leading-snug text-[#A7B0C0]">
          <p>
            <b className="font-display text-2xl text-[#EEF2F8]">{n}</b> of {ids.length} activities done ({pct}%)
          </p>
          <p>⭐ {stars} stars earned</p>
          <p className="mt-1">
            Role: <b className="text-sky-200">{rank}</b>
          </p>
        </div>
        <div className="mt-4">
          <p className="text-sm font-bold text-[#EEF2F8]">Robot City tiers cleared</p>
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
        <section aria-labelledby="city-cert" className="relative overflow-hidden rounded-[28px] border-2 border-amber-300/70 bg-gradient-to-br from-sky-500 via-[#19263F] to-[#0A1120] p-6 text-center shadow-[0_8px_24px_rgba(0,0,0,.45)]">
          <p aria-hidden className="text-5xl motion-safe:animate-bounce">
            🏙️
          </p>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-sky-50">World complete</p>
          <h2 id="city-cert" className="mt-1 font-display text-3xl font-bold text-white">
            Chief City Robotics Engineer
          </h2>
          {name && <p className="mt-1 font-display text-xl font-bold text-amber-200">{name}</p>}
          <p className="mx-auto mt-3 max-w-sm text-[16px] leading-snug text-sky-50">
            You finished all {ids.length} Robot City activities and every tier of the game. You can cross streets safely, set speeds from stopping distances, time a
            busy junction and write the rules that keep a robotaxi safe when the unexpected happens.
          </p>
          <p className="mt-3 font-display text-lg font-bold text-white">⭐ {stars} stars</p>
        </section>
      ) : (
        <section aria-labelledby="city-cert-locked" className="rounded-[28px] border-2 border-dashed border-white/15 bg-[#111C32] p-5 text-center">
          <p aria-hidden className="text-4xl opacity-60 grayscale">
            🏙️
          </p>
          <h2 id="city-cert-locked" className="mt-1 font-display text-xl font-bold text-[#EEF2F8]">
            Chief City Robotics Engineer
          </h2>
          <p className="mt-1 text-[15px] text-[#A7B0C0]">
            Finish all {ids.length} activities and all four Robot City tiers to complete this world.{' '}
            {ids.length - n > 0 ? `${ids.length - n} activities` : 'No activities'} and {TIER_NAMES.length - tiersDone} tier{TIER_NAMES.length - tiersDone === 1 ? '' : 's'} to go!
          </p>
        </section>
      )}
    </div>
  )
}
