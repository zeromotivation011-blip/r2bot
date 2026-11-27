'use client'

// components/kids/classroom/ClassPowerUpCardClient.tsx
//
// The child's side of the Class Power-Up (roadmap #40), on the Universe home
// (rendered by ClassMissionsClient). Renders NOTHING unless this device is in
// a class whose teacher has set a goal (and migration 0056 has run). Shows the
// ONE class meter, a row of anonymous ticks for "who helped this week" (no
// names, no numbers per child), "You helped this week ✓" for this child, and
// the class cosmetic at each milestone. Cached locally so it shows instantly.

import { useCallback, useEffect, useState } from 'react'
import { KIDS_CLASS_EVENT, KIDS_POWER_UP_EVENT, fetchPowerUp, loadMembership, loadPowerUp } from '@/lib/kids/classroom-membership'
import { KIDS_CLASS_DIARY_EVENT } from '@/lib/kids/classroom-diary'
import { GOAL_THEMES, cosmeticLevel, milestonesReached, type ChildPowerUp } from '@/lib/kids/classroom-goal'
import { PowerUpMeter } from './PowerUpMeter'

const REFRESH_MS = 5 * 60 * 1000
const MAX_TICKS = 40

export function ClassPowerUpCardClient({ className = '' }: { className?: string }) {
  const [p, setP] = useState<ChildPowerUp | null>(null)

  const recompute = useCallback(() => {
    setP(loadMembership() ? loadPowerUp() : null)
  }, [])

  useEffect(() => {
    recompute()
    let alive = true
    let last = 0
    const refresh = async () => {
      if (!loadMembership()) return
      last = Date.now()
      await fetchPowerUp()
      if (alive) recompute()
    }
    void refresh()
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, REFRESH_MS)
    // After the child finishes something, the sync runs ~5 s later: refresh a little after that.
    let soon: ReturnType<typeof setTimeout> | null = null
    const onWork = () => {
      if (soon) clearTimeout(soon)
      soon = setTimeout(() => {
        if (Date.now() - last > 15_000) void refresh()
      }, 12_000)
    }
    window.addEventListener(KIDS_POWER_UP_EVENT, recompute)
    window.addEventListener(KIDS_CLASS_EVENT, recompute)
    window.addEventListener(KIDS_CLASS_DIARY_EVENT, onWork)
    return () => {
      alive = false
      clearInterval(t)
      if (soon) clearTimeout(soon)
      window.removeEventListener(KIDS_POWER_UP_EVENT, recompute)
      window.removeEventListener(KIDS_CLASS_EVENT, recompute)
      window.removeEventListener(KIDS_CLASS_DIARY_EVENT, onWork)
    }
  }, [recompute])

  if (!p) return null
  const theme = GOAL_THEMES[p.goal.theme]
  const level = cosmeticLevel(p.done, p.target)
  const latest = milestonesReached(p.done, p.target).slice(-1)[0]
  const ticks = Math.min(MAX_TICKS, p.helpers)
  const flag = level >= 4

  return (
    <section
      aria-labelledby="class-powerup-h"
      className={`rounded-[28px] border bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-6 ${level >= 2 ? 'border-amber-300/70' : 'border-cyan-400/30'} ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span aria-hidden className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-500/20 text-2xl">{flag ? '🏁' : theme.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Class Power-Up</p>
          <h2 id="class-powerup-h" className="font-display text-xl font-bold text-white sm:text-2xl">{p.goal.title}</h2>
        </div>
        {latest && (
          <span className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-amber-500/20 px-3 text-sm font-bold text-amber-100">
            <span aria-hidden>{latest.icon}</span> {latest.name}
          </span>
        )}
      </div>

      <div className="mt-4">
        <PowerUpMeter goal={p.goal} done={p.done} labelId="class-powerup-h" />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-200">Helpers this week</p>
          <p className="mt-1 flex flex-wrap gap-1" aria-label={`${p.helpers === 0 ? 'No one yet' : 'Your class is helping'} this week`}>
            {ticks === 0 ? (
              <span className="text-sm text-slate-400">Be the first!</span>
            ) : (
              Array.from({ length: ticks }, (_, i) => (
                <span key={i} aria-hidden className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500/25 text-xs font-bold text-emerald-200">✓</span>
              ))
            )}
          </p>
        </div>
        <p
          className={`inline-flex min-h-[44px] items-center gap-2 rounded-2xl px-4 font-display font-bold ${p.youHelped ? 'bg-emerald-500/15 text-emerald-200' : 'bg-white/[0.05] text-slate-200'}`}
          role="status"
        >
          {p.youHelped ? <><span aria-hidden>✓</span> You helped this week!</> : <>Finish any mission to help your class <span aria-hidden>⚡</span></>}
        </p>
      </div>
      {p.status === 'complete' && (
        <p className="mt-3 rounded-2xl bg-amber-500/15 p-3 text-center font-display text-lg font-bold text-amber-100">
          <span aria-hidden>🏆</span> Your class did it together! Ask your teacher about the class certificate.
        </p>
      )}
    </section>
  )
}

export default ClassPowerUpCardClient
