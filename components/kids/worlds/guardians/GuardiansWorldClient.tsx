'use client'

// components/kids/worlds/guardians/GuardiansWorldClient.tsx
// Client islands of the Robot Guardians world page:
//   ActivitiesByBand — the world's activities per age band (server-rendered
//                      links; ticks appear once progress is read on the device);
//   ProgressCard     — how much of the world is done, the game tiers cleared,
//                      and the world-complete "Robot Guardian" certificate.
// Progress is read from lib/kids/activities/progress.ts (localStorage) and
// refreshed on KIDS_PROGRESS_EVENT. Nothing here writes progress.

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { getActivitiesDone, type ActivitiesDone } from '@/lib/kids/activities/progress'
import { KIDS_PROGRESS_EVENT, getProgress } from '@/lib/kids-progress'
import { TIER_NAMES } from '@/lib/kids/universe/tiers'
import { fireConfetti } from '@/components/kids/Confetti'

export interface WorldActivity {
  id: string
  title: string
  track: string
  band: string
  difficulty: number
  template: string
}

export interface BandGroup {
  id: string
  name: string
  ages: string
  learn: string
  items: WorldActivity[]
}

function useWorldProgress(gameId: string) {
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

const TEMPLATE_LABEL: Record<string, string> = {
  'spot-in-scene': 'Spot it',
  'classify-sort': 'Sort it',
  'ethics-dilemma': 'Decide',
  'robot-match': 'Match',
  'sensor-choice': 'Sensors',
  'robot-designer': 'Design',
  estimate: 'Estimate',
  'flowchart-builder': 'Program',
}

export function ActivitiesByBand({ bands, gameId }: { bands: BandGroup[]; gameId: string }) {
  const { done } = useWorldProgress(gameId)
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {bands.map((b) => {
        const n = b.items.filter((a) => done[a.id]).length
        return (
          <section key={b.id} aria-labelledby={`band-${b.id}`} className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
            <div className="flex items-baseline justify-between gap-2">
              <h3 id={`band-${b.id}`} className="font-display text-xl font-bold text-[#EEF2F8]">
                {b.name} <span className="text-base font-medium text-[#A7B0C0]">· ages {b.ages}</span>
              </h3>
              <span className="font-display text-sm font-bold text-emerald-300">
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
                      className="flex min-h-[48px] items-center gap-3 rounded-2xl border border-white/10 bg-[#111C32] px-3 py-2 text-[#EEF2F8] transition hover:-translate-y-0.5 hover:border-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-reduce:hover:translate-y-0"
                    >
                      <span
                        aria-hidden
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${d ? 'bg-emerald-400 text-[#0A1120]' : 'bg-white/10 text-[#A7B0C0]'}`}
                      >
                        {d ? '✓' : a.difficulty}
                      </span>
                      <span className="flex-1 text-[15px] font-semibold leading-snug">{a.title}</span>
                      <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[12px] text-[#A7B0C0]">{TEMPLATE_LABEL[a.template] ?? 'Activity'}</span>
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

export function ProgressCard({ ids, gameId }: { ids: string[]; gameId: string }) {
  const { done, tiers, name, ready } = useWorldProgress(gameId)
  const n = ids.filter((id) => done[id]).length
  const stars = ids.reduce((t, id) => t + (done[id]?.stars ?? 0), 0)
  const complete = ready && n === ids.length && ids.length > 0
  const celebrated = useRef(false)

  useEffect(() => {
    if (!complete || celebrated.current) return
    celebrated.current = true
    try {
      const key = `r2bot_world_complete_${gameId}`
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '1')
        fireConfetti()
      }
    } catch {
      /* ignore */
    }
  }, [complete, gameId])

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="world-progress" className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
        <h2 id="world-progress" className="font-display text-xl font-bold text-[#EEF2F8]">
          Your Guardian progress
        </h2>
        <div className="mt-3 flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0" aria-hidden>
            <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="4" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#34D399" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(n / Math.max(1, ids.length)) * 97.4} 97.4`} className="transition-[stroke-dasharray] duration-500" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold text-[#EEF2F8]">{Math.round((n / Math.max(1, ids.length)) * 100)}%</span>
          </div>
          <div className="text-[15px] leading-snug text-[#A7B0C0]">
            <p>
              <b className="font-display text-2xl text-[#EEF2F8]">{n}</b> of {ids.length} activities done
            </p>
            <p>⭐ {stars} stars earned</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm font-bold text-[#EEF2F8]">Safety Inspector tiers cleared</p>
          <ul className="mt-2 grid grid-cols-4 gap-1.5">
            {TIER_NAMES.map((t, i) => (
              <li key={t} className={`rounded-xl px-1 py-2 text-center text-[13px] font-bold ${tiers[i] ? 'bg-amber-500 text-[#1A1103]' : 'bg-white/5 text-[#6E7888]'}`}>
                {tiers[i] ? '✓ ' : ''}
                {t}
              </li>
            ))}
          </ul>
        </div>
        {!ready && <p className="mt-3 text-sm text-[#6E7888]">Progress is saved on this device.</p>}
      </section>

      {complete ? (
        <section aria-labelledby="world-cert" className="relative overflow-hidden rounded-[28px] border-2 border-amber-300/70 bg-gradient-to-br from-emerald-400 via-teal-600 to-[#0A1120] p-6 text-center shadow-[0_8px_24px_rgba(0,0,0,.45)]">
          <p aria-hidden className="text-5xl motion-safe:animate-bounce">🛡️</p>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-50">World complete</p>
          <h2 id="world-cert" className="mt-1 font-display text-3xl font-bold text-white">
            Certified Robot Guardian
          </h2>
          {name && <p className="mt-1 font-display text-xl font-bold text-amber-200">{name}</p>}
          <p className="mx-auto mt-3 max-w-sm text-[16px] leading-snug text-emerald-50">
            You finished all {ids.length} Robot Guardians activities. You can ask the six Harm Check questions of any robot — Body, Data, Fairness, Control, People and Planet — and say how to make it safer.
          </p>
          <p className="mt-3 font-display text-lg font-bold text-white">⭐ {stars} stars</p>
        </section>
      ) : (
        <section aria-labelledby="world-cert-locked" className="rounded-[28px] border-2 border-dashed border-white/15 bg-[#111C32] p-5 text-center">
          <p aria-hidden className="text-4xl opacity-60 grayscale">🛡️</p>
          <h2 id="world-cert-locked" className="mt-1 font-display text-xl font-bold text-[#EEF2F8]">
            Robot Guardian certificate
          </h2>
          <p className="mt-1 text-[15px] text-[#A7B0C0]">
            Finish all {ids.length} activities in this world to become a Certified Robot Guardian. {ids.length - n} to go!
          </p>
        </section>
      )}
    </div>
  )
}
