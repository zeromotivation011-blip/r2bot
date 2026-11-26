'use client'

// components/kids/course/BadgeStepClient.tsx
// Beat 6 of a session: the badge. A celebration of the skill the child just
// showed (the badge says what they can now do), the stars their challenge
// earned, what the rewards engine gave them, and the way on. For "Make it
// yours" project sessions, the "I can" self-checks — reflection only, never
// a gate.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Badge, Project } from '@/lib/kids/curriculum/types'
import type { RewardResult } from '@/lib/kids/universe/rewards'
import { useConfetti } from '@/components/kids/Confetti'
import { sparkSays } from '@/lib/kids-audio'

interface Props {
  badge: Badge
  stars: number
  rewardNote: string
  project?: Project
  result: RewardResult | null
  /** The session had been finished before (a replay). */
  replay: boolean
  levelHref: string
  next: { href: string; title: string; number: number } | null
  onReplayChallenge: () => void
}

export default function BadgeStepClient({ badge, stars, rewardNote, project, result, replay, levelHref, next, onReplayChallenge }: Props) {
  const confetti = useConfetti()
  const [ticks, setTicks] = useState<Set<number>>(new Set())

  useEffect(() => {
    const t = window.setTimeout(() => {
      confetti.fire()
      sparkSays(`You earned the ${badge.name} badge! ${badge.earnedFor}`)
    }, 350)
    return () => window.clearTimeout(t)
  }, [badge, confetti])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div
        className="relative overflow-hidden rounded-[28px] border border-amber-400/40 bg-[radial-gradient(ellipse_at_50%_0%,rgba(252,104,24,.28),rgba(17,28,50,1)_65%)] p-6 text-center shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-8"
        data-testid="badge-card"
      >
        <div
          className="course-rays pointer-events-none absolute left-1/2 top-[120px] sm:top-[128px] h-[340px] w-[340px] rounded-full opacity-40 [background:repeating-conic-gradient(rgba(255,168,120,.35)_0deg_8deg,transparent_8deg_24deg)] motion-safe:animate-[course-rays_18s_linear_infinite]"
          aria-hidden
        />
        <p className="relative font-display text-sm font-bold uppercase tracking-[0.2em] text-amber-300">{replay ? 'Badge — already yours' : 'New badge!'}</p>
        <div className="relative mx-auto mt-3 grid h-32 w-32 place-items-center rounded-full border-4 border-amber-300 bg-gradient-to-b from-amber-400 to-amber-600 text-6xl shadow-[0_0_0_10px_rgba(252,104,24,.18),0_12px_40px_rgba(252,104,24,.45)] motion-safe:animate-[course-badge-in_.7s_cubic-bezier(.22,.61,.36,1)]">
          <span aria-hidden>{badge.icon}</span>
        </div>
        <h2 className="relative mt-4 font-display text-3xl font-bold text-[#EEF2F8] sm:text-4xl">{badge.name}</h2>
        <p className="relative mx-auto mt-2 max-w-xl text-[17px] leading-relaxed text-[#EEF2F8]">{badge.earnedFor}</p>
        <p className="relative mt-3 flex items-center justify-center gap-1 text-3xl" aria-label={`${stars} of 3 stars in the challenge`}>
          {[1, 2, 3].map((k) => (
            <span key={k} className={k <= stars ? '' : 'opacity-25 grayscale'} aria-hidden>
              ⭐
            </span>
          ))}
        </p>
        {result && result.xpGained > 0 && (
          <p className="relative mt-3 inline-flex rounded-full bg-black/30 px-4 py-1.5 font-display text-lg font-bold text-amber-200" data-testid="xp-gained">
            +{result.xpGained} XP{result.levelAfter > result.levelBefore ? ` · Level ${result.levelAfter}!` : ''}
          </p>
        )}
        {replay && !result && <p className="relative mt-3 text-[15px] text-[#A7B0C0]">You finished this session before. Win more stars in the challenge to grow your XP.</p>}
        <p className="relative mt-4 text-[15px] text-[#A7B0C0]">🎁 {rewardNote}</p>
      </div>

      {project && (
        <div className="rounded-[20px] border border-white/10 bg-[#111C32] p-5">
          <h3 className="font-display text-xl font-bold text-[#EEF2F8]">🌟 {project.title}: look back</h3>
          <p className="mt-1 text-[15px] text-[#A7B0C0]">Tick what you can do. An empty box just means “my next step”.</p>
          <ul className="mt-3 flex flex-col gap-2">
            {project.selfCheck.map((s, i) => {
              const on = ticks.has(i)
              return (
                <li key={s}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => {
                      const n = new Set(ticks)
                      if (on) n.delete(i)
                      else n.add(i)
                      setTicks(n)
                    }}
                    className={`flex min-h-[52px] w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${on ? 'border-emerald-300/70 bg-emerald-400/10' : 'border-white/15 bg-[#19263F]'}`}
                  >
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 ${on ? 'border-emerald-300 bg-emerald-400 text-[#06210F]' : 'border-white/30'}`} aria-hidden>
                      {on ? '✓' : ''}
                    </span>
                    <span className="text-[16px] font-semibold text-[#EEF2F8]">{s}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-[14px] text-[#A7B0C0]">Show it to your family or class: what did you design, and which bug did you fix?</p>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {next ? (
          <Link
            href={next.href}
            data-testid="next-session"
            className="flex min-h-[56px] flex-1 items-center justify-center rounded-2xl bg-amber-500 px-6 text-center font-display text-lg font-bold text-[#1A1103] shadow-[0_8px_24px_rgba(252,104,24,.35)] transition-transform hover:bg-amber-400 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            Next: Session {next.number} · {next.title} →
          </Link>
        ) : (
          <Link
            href="/kids/hangar"
            className="flex min-h-[56px] flex-1 items-center justify-center rounded-2xl bg-amber-500 px-6 font-display text-lg font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            Season complete — visit the Hangar 🏆
          </Link>
        )}
        <Link
          href={levelHref}
          className="flex min-h-[56px] items-center justify-center rounded-2xl bg-white/[0.08] px-5 font-bold text-[#EEF2F8] hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
        >
          Season map
        </Link>
        {stars < 3 && (
          <button
            type="button"
            onClick={onReplayChallenge}
            className="min-h-[56px] rounded-2xl border border-amber-400/50 px-5 font-bold text-amber-300 hover:bg-amber-400/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            Try for {stars === 2 ? 'the third star' : 'more stars'}
          </button>
        )}
      </div>
    </div>
  )
}
