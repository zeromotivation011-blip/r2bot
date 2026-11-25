'use client'

// components/kids/ui/GameShellClient.tsx
// The frame every R2BOT Universe game lives in, so all games feel like ONE
// product: same header, same tier picker, same "How to play", same results
// screen, same reward celebration. A game supplies its canvas/controls as
// children and calls finish() via the render-prop when a round ends.

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { UniverseGame } from '@/lib/kids/universe/worlds'
import { reportActivity, type RewardResult } from '@/lib/kids/universe/rewards'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { fireConfetti } from '@/components/kids/Confetti'

export const TIER_NAMES = ['Cadet', 'Pilot', 'Ace', 'Legend'] as const

export interface RoundResult {
  /** 0 = failed round, 1–3 stars otherwise. */
  stars: number
  /** Number shown big on the results card (e.g. 1280 points, 12.4 s). */
  score: number
  scoreLabel: string
  /** True when a lower score is better (times). */
  lowerIsBetter?: boolean
  /** One sentence: what happened and why (teach from the result). */
  message: string
  badges?: string[]
  attempts?: number
}

export interface GameApi {
  tier: number
  /** Increments on restart so the game can reset its state. */
  round: number
  finish: (r: RoundResult) => void
  restart: () => void
}

interface Props {
  game: UniverseGame
  howToPlay: ReactNode
  /** What the child learns — shown on the results card. */
  lesson: string
  children: (api: GameApi) => ReactNode
}

export function GameShell({ game, howToPlay, lesson, children }: Props) {
  const [tier, setTier] = useState(0)
  const [round, setRound] = useState(0)
  const [help, setHelp] = useState(false)
  const [result, setResult] = useState<{ round: RoundResult; reward: RewardResult | null } | null>(null)
  const helpBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    try {
      const seen = localStorage.getItem(`r2bot_game_seen_${game.id}`)
      if (!seen) {
        setHelp(true)
        localStorage.setItem(`r2bot_game_seen_${game.id}`, '1')
      }
    } catch {
      /* ignore */
    }
  }, [game.id])

  const restart = useCallback(() => {
    setResult(null)
    setRound((r) => r + 1)
  }, [])

  const finish = useCallback(
    (r: RoundResult) => {
      let reward: RewardResult | null = null
      if (r.stars > 0) {
        reward = reportActivity({
          kind: 'game',
          id: `${game.id}:t${tier}`,
          stars: r.stars,
          score: r.score,
          lowerIsBetter: r.lowerIsBetter,
          badges: r.badges,
          attempts: r.attempts,
          xp: 20 + tier * 15,
        })
        playSound('levelup')
        if (r.stars === 3) fireConfetti()
      } else {
        playSound('wrong')
      }
      setResult({ round: r, reward })
    },
    [game.id, tier],
  )

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-3 px-3 pb-6 pt-3 sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/kids" className="inline-flex min-h-[44px] items-center rounded-xl border border-white/15 bg-white/5 px-3 font-bold text-white/80 hover:bg-white/10">
          ← Universe
        </Link>
        <h1 className="flex items-center gap-2 text-xl font-black text-white sm:text-2xl">
          <span aria-hidden>{game.emoji}</span> {game.name}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-xl border border-white/15 bg-white/5 p-1" role="radiogroup" aria-label="Difficulty">
            {TIER_NAMES.slice(0, game.tiers).map((t, i) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={tier === i}
                onClick={() => {
                  primeAudio()
                  setTier(i)
                  restart()
                }}
                className={`min-h-[40px] rounded-lg px-2.5 text-sm font-black sm:px-3 ${tier === i ? 'bg-amber-400 text-slate-900' : 'text-white/70 hover:text-white'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            ref={helpBtn}
            type="button"
            onClick={() => setHelp(true)}
            className="min-h-[44px] rounded-xl border border-white/15 bg-white/5 px-3 font-black text-white hover:bg-white/10"
            aria-label="How to play"
          >
            ?
          </button>
        </div>
      </div>

      <div className="relative">
        {children({ tier, round, finish, restart })}

        {result && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-slate-950/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Round results">
            <div className="w-full max-w-md rounded-3xl border-2 border-amber-300/50 bg-gradient-to-b from-violet-950 to-slate-950 p-6 text-center shadow-2xl">
              <p className="text-4xl" aria-label={`${result.round.stars} stars`}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={i < result.round.stars ? '' : 'opacity-20 grayscale'}>⭐</span>
                ))}
              </p>
              <p className="mt-3 text-4xl font-black text-white">
                {Number.isInteger(result.round.score) ? result.round.score : result.round.score.toFixed(1)}
                <span className="ml-2 text-base font-bold text-white/60">{result.round.scoreLabel}</span>
              </p>
              {result.reward?.newPersonalBest && <p className="mt-1 font-black text-emerald-300">New personal best!</p>}
              <p className="mt-3 text-white/85">{result.round.message}</p>
              <p className="mt-3 rounded-2xl bg-white/5 p-3 text-sm text-violet-100/80">
                <span className="font-black text-amber-300">What you learned: </span>
                {lesson}
              </p>
              {result.reward && (
                <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm font-bold">
                  <span className="rounded-full bg-amber-400/20 px-3 py-1 text-amber-200">+{result.reward.xpGained} XP</span>
                  {result.reward.newBadges.map((b) => (
                    <span key={b.id} className="rounded-full bg-emerald-400/20 px-3 py-1 text-emerald-200">
                      {b.icon} {b.name}
                    </span>
                  ))}
                  {result.reward.levelAfter > result.reward.levelBefore && (
                    <span className="rounded-full bg-fuchsia-400/20 px-3 py-1 text-fuchsia-200">Level {result.reward.levelAfter}!</span>
                  )}
                </div>
              )}
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={restart} className="min-h-[48px] rounded-2xl bg-amber-400 px-5 font-black text-slate-900">
                  {result.round.stars > 0 ? 'Play again' : 'Try again'}
                </button>
                {result.round.stars > 0 && tier < game.tiers - 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setTier((t) => t + 1)
                      restart()
                    }}
                    className="min-h-[48px] rounded-2xl border-2 border-amber-300/60 px-5 font-black text-amber-200"
                  >
                    Next: {TIER_NAMES[tier + 1]} →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {help && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-label="How to play">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/15 bg-slate-900 p-6 text-white">
            <h2 className="text-2xl font-black">
              {game.emoji} How to play
            </h2>
            <div className="mt-3 space-y-2 text-white/85">{howToPlay}</div>
            <p className="mt-4 rounded-2xl bg-white/5 p-3 text-sm text-white/70">
              <span className="font-black text-amber-300">Real robotics inside: </span>
              {game.teaches}
            </p>
            <button
              type="button"
              autoFocus
              onClick={() => {
                primeAudio()
                setHelp(false)
                helpBtn.current?.focus()
              }}
              className="mt-5 min-h-[48px] w-full rounded-2xl bg-amber-400 font-black text-slate-900"
            >
              Let’s go!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
