'use client'

// components/kids/worlds/zoo/ZooWorldClient.tsx
// Client islands of the Robo Zoo world page:
//   ZooActivities    — the world's activities per age band (links are in the
//                      server HTML; done-ticks appear once progress is read);
//   ZooProgressCard  — the child's "zoo map" (one enclosure lights up per
//                      finished activity), Bio-Bot Lab tiers cleared, and the
//                      world-complete celebration card.
// Progress is read from lib/kids/activities/progress.ts and the game's
// personal bests in lib/kids-progress.ts; both refresh on KIDS_PROGRESS_EVENT.
// Nothing here writes progress.

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { getActivitiesDone, type ActivitiesDone } from '@/lib/kids/activities/progress'
import { KIDS_PROGRESS_EVENT, getProgress } from '@/lib/kids-progress'
import { TIER_NAMES } from '@/lib/kids/universe/tiers'
import { fireConfetti } from '@/components/kids/Confetti'
// Calm mode (roadmap #89): no bouncing or pulsing of the world's own (fireConfetti already stops itself).
import { useKidsCalm } from '@/lib/kids/settings'

export interface ZooActivity {
  id: string
  title: string
  track: string
  difficulty: number
  template: string
}

export interface ZooBand {
  id: string
  name: string
  ages: string
  learn: string
  items: ZooActivity[]
}

function useZooProgress(gameId: string) {
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
  'wheel-terrain': 'Test drive',
  'centre-of-mass': 'Balance',
  'robot-designer': 'Design',
  estimate: 'Estimate',
}

export function ZooActivities({ bands, gameId }: { bands: ZooBand[]; gameId: string }) {
  const { done } = useZooProgress(gameId)
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {bands.map((b) => {
        const n = b.items.filter((a) => done[a.id]).length
        return (
          <section key={b.id} aria-labelledby={`zoo-band-${b.id}`} className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
            <div className="flex items-baseline justify-between gap-2">
              <h3 id={`zoo-band-${b.id}`} className="font-display text-xl font-bold text-[#EEF2F8]">
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

/** One enclosure per activity, in band order: the animal whose trick the zoo copies. */
const ENCLOSURES = ['🦎', '🐍', '🐟', '🐐', '🐙', '🐝', '🦅', '🐕', '🐆', '🦘', '🐢', '🕷️', '🐜', '🐘', '🐭', '🦀', '🐦', '🐈', '🐛', '🐎', '🦜', '🐪', '🐇', '🦭']

export function ZooProgressCard({ ids, gameId }: { ids: string[]; gameId: string }) {
  const calm = useKidsCalm()
  const { done, tiers, name, ready } = useZooProgress(gameId)
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
      const key = 'r2bot_world_complete_zoo'
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
      <section aria-labelledby="zoo-progress" className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
        <h2 id="zoo-progress" className="font-display text-xl font-bold text-[#EEF2F8]">
          Your zoo map
        </h2>
        <p className="mt-1 text-[15px] text-[#A7B0C0]">
          <b className="font-display text-2xl text-[#EEF2F8]">{n}</b> of {ids.length} activities done ({pct}%) · ⭐ {stars}
        </p>
        <ul className="mt-3 grid grid-cols-6 gap-1.5" aria-label={`${n} of ${ids.length} enclosures opened`}>
          {ids.map((id, i) => {
            const d = !!done[id]
            return (
              <li
                key={id}
                aria-hidden
                className={`flex aspect-square items-center justify-center rounded-xl text-xl transition motion-reduce:transition-none ${d ? 'bg-lime-400/25 ring-2 ring-lime-300/70' : 'bg-white/5 opacity-40 grayscale'}`}
              >
                {ENCLOSURES[i % ENCLOSURES.length]}
              </li>
            )
          })}
        </ul>
        <div className="mt-4">
          <p className="text-sm font-bold text-[#EEF2F8]">Bio-Bot Lab tiers cleared</p>
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
        <section aria-labelledby="zoo-cert" className="relative overflow-hidden rounded-[28px] border-2 border-amber-300/70 bg-gradient-to-br from-lime-400 via-green-800 to-[#0A1120] p-6 text-center shadow-[0_8px_24px_rgba(0,0,0,.45)]">
          <p aria-hidden className={`text-5xl ${calm ? '' : 'motion-safe:animate-bounce'}`}>
            🦎
          </p>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-lime-50">World complete</p>
          <h2 id="zoo-cert" className="mt-1 font-display text-3xl font-bold text-white">
            Chief Biomimicry Engineer
          </h2>
          {name && <p className="mt-1 font-display text-xl font-bold text-amber-200">{name}</p>}
          <p className="mx-auto mt-3 max-w-sm text-[16px] leading-snug text-lime-50">
            You finished all {ids.length} Robo Zoo activities and every Bio-Bot Lab tier. You can pick the right animal trick for a job, keep a walker
            stable, make a snake grip, size wings for lift and design a robot that carries only what it needs.
          </p>
          <p className="mt-3 font-display text-lg font-bold text-white">⭐ {stars} stars</p>
        </section>
      ) : (
        <section aria-labelledby="zoo-cert-locked" className="rounded-[28px] border-2 border-dashed border-white/15 bg-[#111C32] p-5 text-center">
          <p aria-hidden className="text-4xl opacity-60 grayscale">
            🦎
          </p>
          <h2 id="zoo-cert-locked" className="mt-1 font-display text-xl font-bold text-[#EEF2F8]">
            Chief Biomimicry Engineer
          </h2>
          <p className="mt-1 text-[15px] text-[#A7B0C0]">
            Finish all {ids.length} activities and all four Bio-Bot Lab tiers to complete the Robo Zoo.{' '}
            {ids.length - n > 0 ? `${ids.length - n} activities` : 'No activities'} and {TIER_NAMES.length - tiersDone} tier{TIER_NAMES.length - tiersDone === 1 ? '' : 's'} to go!
          </p>
        </section>
      )}
    </div>
  )
}
