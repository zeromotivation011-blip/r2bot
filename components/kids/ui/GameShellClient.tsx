'use client'

// components/kids/ui/GameShellClient.tsx
// The frame every R2BOT Universe game lives in, so all games feel like ONE
// product: same header, same tier picker, same "How to play", same results
// screen, same reward celebration. A game supplies its canvas/controls as
// children and calls finish() via the render-prop when a round ends.
//
// Immersive play (roadmap #15): the shell hides the tab bar on game routes
// (KidsShell), every control here is 48px, and there is ONE Exit button. Once
// the child has touched the game, the round counts as unsaved work: Exit, any
// other link on the page and a tier change ask first (useLeaveGuard), so a
// stray tap can no longer wipe a half-built round.
//
// Flight Recorder (roadmap #38): the shell opens one GameRecorder per round
// (lib/kids/sim/game-recorder.ts). A game whose sim loop has numbers worth
// seeing calls recordGameFrame(t, {...}) / markGameMoment(t, '…') — one line,
// no props — and the results card offers the graphs with a scrubber.
//
// Phones: the kids tab bar is not drawn on /kids/play/* (KidsShell GAME_ROUTE),
// so nothing fixed sits over the game's controls; the shell's own bottom padding
// clears the home indicator (env(safe-area-inset-bottom)).
//
// The results card, "How to play" and the leave dialog are portalled to <body>:
// inside <main class="kids-main"> (its own z-index stacking context) the kids
// footer, which comes later in the page, painted over the results card on phones.

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ExitButton, useLeaveGuard } from './LeaveGuardClient'
import type { UniverseGame } from '@/lib/kids/universe/worlds'
import { reportBestRun, type RewardResult } from '@/lib/kids/universe/rewards'
import { getProgress } from '@/lib/kids-progress'
import { profileKey } from '@/lib/kids/profiles'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { fireConfetti } from '@/components/kids/Confetti'
import { TIER_NAMES } from '@/lib/kids/universe/tiers'
import { GameRecorder, hasRecording, setActiveGameRecorder, type GameRecording } from '@/lib/kids/sim/game-recorder'

// Loaded only when a child opens it on the results card.
const GameRecorderPanel = dynamic(() => import('@/components/kids/sim/GameRecorderClient'), {
  ssr: false,
  loading: () => <div className="mt-4 h-40 animate-pulse rounded-2xl bg-white/5" aria-hidden />,
})

// Re-exported so existing game imports keep working; the list lives in a plain module.
export { TIER_NAMES }

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
  /** A hint was used this round: the shared rule caps the finish at 2 stars (reportActivity enforces it). */
  hintsUsed?: boolean
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
  /** Where Exit goes (default: the Games hub). */
  exitHref?: string
  children: (api: GameApi) => ReactNode
}

export function GameShell({ game, howToPlay, lesson, exitHref = '/kids/play', children }: Props) {
  const [tier, setTier] = useState(0)
  const [round, setRound] = useState(0)
  const [help, setHelp] = useState(false)
  const [result, setResult] = useState<{ round: RoundResult; reward: RewardResult | null; best?: number; rec: GameRecording | null } | null>(null)
  const [showRec, setShowRec] = useState(false)
  // Dialogs render into <body> (see the header note); only after mount, so SSR never touches document.
  const [portalOk, setPortalOk] = useState(false)
  useEffect(() => setPortalOk(true), [])
  const toBody = (node: ReactNode) => (portalOk ? createPortal(node, document.body) : null)
  // One recording per round; games write to it through recordGameFrame() (no props).
  const recRef = useRef<GameRecorder | null>(null)
  useEffect(() => {
    const r = new GameRecorder()
    recRef.current = r
    setActiveGameRecorder(r)
    return () => {
      setActiveGameRecorder(null)
      recRef.current = null
    }
  }, [game.id, tier, round])
  const helpBtn = useRef<HTMLButtonElement>(null)
  // Unsaved work: the child has touched this round and it has no result yet.
  const [dirty, setDirty] = useState(false)
  const guard = useLeaveGuard(dirty && !result)
  const markDirty = () => {
    if (!dirty && !result) setDirty(true)
  }

  // ?tier=2 or ?tier=ace opens the game on that tier ("Your next mission", course sessions).
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('tier')
    if (!raw) return
    const byName = TIER_NAMES.findIndex((t) => t.toLowerCase() === raw.toLowerCase())
    const n = byName >= 0 ? byName : Number(raw)
    if (Number.isInteger(n) && n > 0 && n < game.tiers) {
      setTier(n)
      setRound((r) => r + 1) // games key their state on the round: start fresh on the new tier
    }
  }, [game.tiers])

  useEffect(() => {
    try {
      const seen = localStorage.getItem(profileKey(`r2bot_game_seen_${game.id}`))
      if (!seen) {
        setHelp(true)
        localStorage.setItem(profileKey(`r2bot_game_seen_${game.id}`), '1')
      }
    } catch {
      /* ignore */
    }
  }, [game.id])

  const restart = useCallback(() => {
    setResult(null)
    setDirty(false)
    setRound((r) => r + 1)
  }, [])

  /** Tier buttons: a new tier starts a new round, so ask first when this one is half-played. */
  const pickTier = async (i: number) => {
    primeAudio()
    if (i === tier) return
    if (dirty && !result) {
      const ok = await guard.ask({
        title: `Switch to ${TIER_NAMES[i]}?`,
        line: 'That starts a new round, so this one will not be saved.',
        stay: 'Keep this round',
        go: `Play ${TIER_NAMES[i]}`,
      })
      if (!ok) return
    }
    setTier(i)
    restart()
  }

  // XP only for a first win or a better score on this game + tier (reportBestRun):
  // replaying a round you already won, without beating your best, earns nothing,
  // so XP and quests cannot be farmed. The reward sounds and the level-up
  // ceremony come from RewardToastClient; the shell only says "round won/lost".
  const finish = useCallback(
    (r: RoundResult) => {
      let reward: RewardResult | null = null
      let best: number | undefined
      if (r.stars > 0) {
        const id = `${game.id}:t${tier}`
        best = getProgress().personalBests[id]
        reward = reportBestRun({
          kind: 'game',
          id,
          stars: r.stars,
          score: r.score,
          lowerIsBetter: r.lowerIsBetter,
          badges: r.badges,
          attempts: r.attempts,
          hintsUsed: r.hintsUsed,
          xp: 20 + tier * 15,
        })
        playSound('correct')
        if (r.stars === 3) fireConfetti()
      } else {
        playSound('wrong')
      }
      setDirty(false)
      const snap = recRef.current?.snapshot() ?? null
      setShowRec(false)
      setResult({ round: r, reward, best: reward ? undefined : best, rec: hasRecording(snap) ? snap : null })
    },
    [game.id, tier],
  )

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-3 px-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <ExitButton href={exitHref} onExit={guard.requestLeave} />
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
                onClick={() => void pickTier(i)}
                className={`min-h-[48px] min-w-[48px] rounded-lg px-2.5 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 sm:px-3 ${tier === i ? 'bg-amber-400 text-[#1A1103]' : 'text-white/70 hover:text-white'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            ref={helpBtn}
            type="button"
            onClick={() => setHelp(true)}
            className="min-h-[48px] min-w-[48px] rounded-xl border border-white/15 bg-white/5 px-3 font-black text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            aria-label="How to play"
          >
            ?
          </button>
        </div>
      </div>

      {/* Any touch or key inside the game makes the round "unsaved work" (see useLeaveGuard). */}
      <div className="relative" onPointerDownCapture={markDirty} onKeyDownCapture={markDirty}>
        {children({ tier, round, finish, restart })}

        {result && toBody(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1120]/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Round results">
            <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl border-2 border-amber-300/50 bg-gradient-to-b from-[#19263F] to-[#0A1120] p-6 text-center shadow-2xl">
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
              <p className="mt-3 rounded-2xl bg-white/5 p-3 text-sm text-slate-300">
                <span className="font-black text-amber-300">What you learned: </span>
                {lesson}
              </p>
              {!result.reward && result.round.stars > 0 && result.best !== undefined && (
                <p className="mt-3 text-sm font-semibold text-[#A7B0C0]">
                  Your best on {TIER_NAMES[tier]} is {Number.isInteger(result.best) ? result.best : result.best.toFixed(1)}. Beat it to earn more XP!
                </p>
              )}
              {result.reward && (
                <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm font-bold">
                  <span className="rounded-full bg-amber-400/20 px-3 py-1 text-amber-200">+{result.reward.xpGained} XP</span>
                  {result.reward.newBadges.map((b) => (
                    <span key={b.id} className="rounded-full bg-emerald-400/20 px-3 py-1 text-emerald-200">
                      {b.icon} {b.name}
                    </span>
                  ))}
                  {result.reward.levelAfter > result.reward.levelBefore && (
                    <span className="rounded-full bg-amber-400/20 px-3 py-1 text-amber-200">Rank {result.reward.levelAfter}!</span>
                  )}
                </div>
              )}
              {result.rec && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowRec((v) => !v)}
                    aria-expanded={showRec}
                    data-testid="open-recorder"
                    className="mt-4 min-h-[48px] w-full rounded-2xl border border-white/15 bg-white/5 px-4 text-sm font-black text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                  >
                    📼 {showRec ? 'Hide the Flight Recorder' : 'Watch the Flight Recorder'}
                  </button>
                  {showRec && <GameRecorderPanel rec={result.rec} />}
                </>
              )}
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={restart} className="min-h-[48px] rounded-2xl bg-amber-400 px-5 font-black text-[#1A1103]">
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

      {help && toBody(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1120]/80 p-4" role="dialog" aria-modal="true" aria-label="How to play">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/15 bg-[#19263F] p-6 text-white">
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
              className="mt-5 min-h-[48px] w-full rounded-2xl bg-amber-400 font-black text-[#1A1103]"
            >
              Let’s go!
            </button>
          </div>
        </div>
      )}
      {guard.dialog && toBody(guard.dialog)}
    </div>
  )
}
