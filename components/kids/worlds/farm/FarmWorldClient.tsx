'use client'

// components/kids/worlds/farm/FarmWorldClient.tsx
// Client islands of the Smart Farm world page:
//   FarmActivities   — the world's activities per age band (links are in the
//                      server HTML; done-ticks appear once progress is read);
//   FarmProgressCard — how much of the world is done (a field that grows),
//                      Smart Farm tiers cleared, and the world-complete card.
// Progress comes from lib/kids/activities/progress.ts and the game's personal
// bests in lib/kids-progress.ts; both refresh on KIDS_PROGRESS_EVENT. Nothing
// here writes progress.

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { getActivitiesDone, type ActivitiesDone } from '@/lib/kids/activities/progress'
import { KIDS_PROGRESS_EVENT, getProgress } from '@/lib/kids-progress'
import { TIER_NAMES } from '@/lib/kids/universe/tiers'
import { fireConfetti } from '@/components/kids/Confetti'
// Calm mode (roadmap #89): no bouncing or pulsing of the world's own (fireConfetti already stops itself).
import { useKidsCalm } from '@/lib/kids/settings'

export interface FarmActivity {
  id: string
  title: string
  track: string
  difficulty: number
  template: string
}

export interface FarmBand {
  id: string
  name: string
  ages: string
  learn: string
  items: FarmActivity[]
}

function useFarmProgress(gameId: string) {
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
  'signal-graph': 'Read data',
  'threshold-tuner': 'Tune',
  'sensor-choice': 'Sensors',
  'path-planner': 'Plan route',
  'flowchart-builder': 'Flowchart',
  estimate: 'Estimate',
  'train-mini': 'Train AI',
  'predict-output': 'Trace code',
}

export function FarmActivities({ bands, gameId }: { bands: FarmBand[]; gameId: string }) {
  const { done } = useFarmProgress(gameId)
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {bands.map((b) => {
        const n = b.items.filter((a) => done[a.id]).length
        return (
          <section key={b.id} aria-labelledby={`farm-band-${b.id}`} className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
            <div className="flex items-baseline justify-between gap-2">
              <h3 id={`farm-band-${b.id}`} className="font-display text-xl font-bold text-[#EEF2F8]">
                {b.name} <span className="text-base font-medium text-[#A7B0C0]">· ages {b.ages}</span>
              </h3>
              <span className="font-display text-sm font-bold text-lime-300">
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
                      className="flex min-h-[48px] items-center gap-3 rounded-2xl border border-white/10 bg-[#111C32] px-3 py-2 text-[#EEF2F8] transition hover:-translate-y-0.5 hover:border-lime-300/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    >
                      <span
                        aria-hidden
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${d ? 'bg-lime-400 text-[#0A1120]' : 'bg-white/10 text-[#A7B0C0]'}`}
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

const CROPS = ['🌱', '🌿', '🥬', '🌽', '🍅', '🥕']

export function FarmProgressCard({ ids, gameId }: { ids: string[]; gameId: string }) {
  const calm = useKidsCalm()
  const { done, tiers, name, ready } = useFarmProgress(gameId)
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
      const key = 'r2bot_world_complete_farm'
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '1')
        fireConfetti()
      }
    } catch {
      /* storage blocked: celebrate quietly */
    }
  }, [complete])

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="farm-progress" className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
        <h2 id="farm-progress" className="font-display text-xl font-bold text-[#EEF2F8]">
          Your field
        </h2>
        {/* One plot per activity: it sprouts when the activity is done. */}
        <ol className="mt-3 grid grid-cols-6 gap-1 rounded-2xl bg-[#3b2a1c] p-2" aria-label={`${n} of ${ids.length} plots grown`}>
          {ids.map((id, i) => (
            <li key={id} className={`flex aspect-square items-center justify-center rounded-lg text-lg ${done[id] ? 'bg-lime-700/50' : 'bg-[#2a1d12]'}`} aria-hidden>
              <span className={done[id] ? (calm ? '' : 'motion-safe:animate-[pulse_1.2s_ease-in-out_1]') : 'opacity-25'}>{done[id] ? CROPS[i % CROPS.length] : '·'}</span>
            </li>
          ))}
        </ol>
        <div className="mt-3 text-[15px] leading-snug text-[#A7B0C0]">
          <p>
            <b className="font-display text-2xl text-[#EEF2F8]">{n}</b> of {ids.length} activities done ({pct}%)
          </p>
          <p>⭐ {stars} stars earned</p>
        </div>
        <div className="mt-4">
          <p className="text-sm font-bold text-[#EEF2F8]">Smart Farm tiers cleared</p>
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
        <section aria-labelledby="farm-cert" className="relative overflow-hidden rounded-[28px] border-2 border-amber-300/70 bg-gradient-to-br from-yellow-400 via-green-700 to-[#0A1120] p-6 text-center shadow-[0_8px_24px_rgba(0,0,0,.45)]">
          <p aria-hidden className={`text-5xl ${calm ? '' : 'motion-safe:animate-bounce'}`}>
            🚜
          </p>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-yellow-50">World complete</p>
          <h2 id="farm-cert" className="mt-1 font-display text-3xl font-bold text-white">
            Precision Farmer
          </h2>
          {name && <p className="mt-1 font-display text-xl font-bold text-amber-200">{name}</p>}
          <p className="mx-auto mt-3 max-w-sm text-[16px] leading-snug text-yellow-50">
            You finished all {ids.length} Smart Farm activities and every Smart Farm tier. You can read soil sensors, set irrigation thresholds, map a field with a drone, teach a robot to
            judge ripeness and balance a whole season.
          </p>
          <p className="mt-3 font-display text-lg font-bold text-white">⭐ {stars} stars</p>
        </section>
      ) : (
        <section aria-labelledby="farm-cert-locked" className="rounded-[28px] border-2 border-dashed border-white/15 bg-[#111C32] p-5 text-center">
          <p aria-hidden className="text-4xl opacity-60 grayscale">
            🚜
          </p>
          <h2 id="farm-cert-locked" className="mt-1 font-display text-xl font-bold text-[#EEF2F8]">
            Precision Farmer
          </h2>
          <p className="mt-1 text-[15px] text-[#A7B0C0]">
            Finish all {ids.length} activities and all four Smart Farm tiers to complete this world. {ids.length - n > 0 ? `${ids.length - n} activities` : 'No activities'} and{' '}
            {TIER_NAMES.length - tiersDone} tier{TIER_NAMES.length - tiersDone === 1 ? '' : 's'} to go!
          </p>
        </section>
      )}
    </div>
  )
}
