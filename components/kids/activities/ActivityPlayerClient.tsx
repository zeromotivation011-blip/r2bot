'use client'

// components/kids/activities/ActivityPlayerClient.tsx
// The ONE frame every Skill Galaxy activity plays in:
//   intro card (read aloud) → the template → takeaway + real-world card,
//   rewards (through reportActivity) and what to play next.
// Only the template this activity uses is downloaded (components/kids/activities/registry.ts).
// The server page passes the activity WITHOUT its solution, and light
// summaries of the same track for the "next" suggestions.

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Activity } from '@/lib/kids/activities/types'
import { TRACKS, activityXp } from '@/lib/kids/activities/types'
import { getBand } from '@/lib/kids/bands'
import {
  getActivitiesDone,
  masteryBadgeId,
  nextActivities,
  recordActivityResult,
  starsForAttempts,
  trackMastery,
  type ActivitySummary,
} from '@/lib/kids/activities/progress'
import { reportActivity, type RewardResult } from '@/lib/kids/universe/rewards'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { fireConfetti } from '@/components/kids/Confetti'
import { useGalaxyState } from '@/components/kids/galaxy/useGalaxyState'
import { PLAYABLE } from './registry'
import { canSpeak, setVoiceMuted, speakNatural, stopSpeaking, voiceMuted, warmNaturalVoices } from './speech'

export type PlayerActivity = Omit<Activity, 'solution'>

interface Props {
  activity: PlayerActivity
  /** Summaries of the activity's track (for next suggestions and mastery). */
  trackActivities: ActivitySummary[]
}

type Stage = 'intro' | 'play' | 'done'

interface Finish {
  correct: boolean
  attempts: number
  score: number
  stars: number
  reward: RewardResult | null
  improved: boolean
  bestStars: number
  mastery: { badge: string; earned: boolean } | null
}

const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
const primaryBtn = `inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 font-display text-lg font-bold text-[#1A1103] shadow-[0_8px_24px_rgba(252,104,24,.25)] transition-transform duration-150 hover:-translate-y-0.5 active:scale-[.97] ${focusRing}`
const ghostBtn = `inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-white/[0.16] bg-white/[0.04] px-5 font-display text-base font-bold text-[#EEF2F8] transition-transform duration-150 hover:-translate-y-0.5 hover:border-white/30 active:scale-[.97] ${focusRing}`

function Stars({ n, size = 'text-4xl' }: { n: number; size?: string }) {
  return (
    <span className={`inline-flex gap-1 ${size}`} role="img" aria-label={`${n} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <span key={i} aria-hidden className={i < n ? 'drop-shadow-[0_0_12px_rgba(252,168,120,.6)]' : 'opacity-20 grayscale'}>
          ⭐
        </span>
      ))}
    </span>
  )
}

function DifficultyDots({ d }: { d: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Difficulty ${d} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} aria-hidden className={`h-2 w-2 rounded-full ${i <= d ? 'bg-amber-400' : 'bg-white/15'}`} />
      ))}
    </span>
  )
}

export default function ActivityPlayerClient({ activity, trackActivities }: Props) {
  const track = TRACKS.find((t) => t.id === activity.track) ?? TRACKS[0]
  const band = getBand(activity.band)
  const { ready, done, band: childBand } = useGalaxyState()
  const [stage, setStage] = useState<Stage>('intro')
  const [run, setRun] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [finish, setFinish] = useState<Finish | null>(null)
  const [muted, setMuted] = useState(true)
  const [speaking, setSpeaking] = useState(false)
  const [speechOk, setSpeechOk] = useState(true)
  const stopRef = useRef<() => void>(() => undefined)
  const doneHeading = useRef<HTMLHeadingElement>(null)
  const stageTop = useRef<HTMLDivElement>(null)
  const Play = PLAYABLE[activity.template]

  const speak = useCallback((text: string) => {
    stopRef.current()
    setSpeaking(true)
    stopRef.current = speakNatural(text, () => setSpeaking(false))
  }, [])

  // Read the mission aloud once on arrival (the tap that brought the child here
  // counts as a gesture in most browsers; if not, the Hear-it button is there).
  useEffect(() => {
    const cleanup = warmNaturalVoices()
    setSpeechOk(canSpeak())
    const m = voiceMuted()
    setMuted(m)
    let t: ReturnType<typeof setTimeout> | null = null
    if (!m && canSpeak()) t = setTimeout(() => speak(activity.intro), 350)
    return () => {
      cleanup()
      if (t) clearTimeout(t)
      stopRef.current()
      stopSpeaking()
    }
  }, [activity.intro, speak])

  const previousBest = ready ? (done[activity.id]?.stars ?? 0) : 0

  const start = () => {
    primeAudio()
    stopRef.current()
    setSpeaking(false)
    playSound('click')
    setAttempts(0)
    setFinish(null)
    setStage('play')
    setRun((r) => r + 1)
    requestAnimationFrame(() => stageTop.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
  }

  const onChecked = useCallback(() => {
    setAttempts((n) => n + 1)
  }, [])

  const onDone = useCallback(
    (r: { correct: boolean; attempts: number; score: number }) => {
      const tries = Math.max(1, r.attempts)
      if (!r.correct) {
        setFinish({ correct: false, attempts: tries, score: r.score, stars: 0, reward: null, improved: false, bestStars: getActivitiesDone()[activity.id]?.stars ?? 0, mastery: null })
        setStage('done')
        return
      }
      const stars = starsForAttempts(tries)
      const before = getActivitiesDone()
      const outcome = recordActivityResult(activity.id, { stars, attempts: tries, score: r.score })
      const after = { ...before, [activity.id]: outcome.record }

      // Mastery: every activity of this track in this band is done.
      const badge = masteryBadgeId(activity.track, activity.band)
      const was = trackMastery(trackActivities, before, activity.track, activity.band).mastered
      const now = trackMastery(trackActivities, after, activity.track, activity.band).mastered
      const masteryEarned = now && !was

      let reward: RewardResult | null = null
      if (outcome.improved) {
        // First finish, or more stars than before: report once. Replays without
        // improvement earn nothing, so XP can't be farmed by repeating.
        const extra = outcome.firstTime ? 0 : -Math.round(activityXp(activity) * 0.5)
        reward = reportActivity({
          kind: 'activity',
          id: activity.id,
          xp: Math.max(5, activityXp(activity) + extra),
          stars,
          score: Math.round(r.score * 100),
          attempts: tries,
          badges: [...(activity.badges ?? []), ...(masteryEarned ? [badge] : [])],
        })
      }
      playSound(stars === 3 ? 'levelup' : 'star')
      if (stars === 3 || masteryEarned) fireConfetti()
      setFinish({
        correct: true,
        attempts: tries,
        score: r.score,
        stars,
        reward,
        improved: outcome.improved,
        bestStars: outcome.record.stars,
        mastery: now ? { badge, earned: masteryEarned } : null,
      })
      setStage('done')
    },
    [activity, trackActivities],
  )

  useEffect(() => {
    if (stage === 'done') {
      doneHeading.current?.focus()
      stageTop.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
  }, [stage])

  const suggestions = useMemo(() => {
    const d = { ...done }
    if (finish?.correct) d[activity.id] = { stars: finish.bestStars, attempts: finish.attempts, score: finish.score, plays: 1, at: '' }
    return nextActivities(trackActivities, d, childBand ?? activity.band, { track: activity.track, exclude: activity.id, limit: 2 })
  }, [done, finish, activity.id, activity.band, activity.track, childBand, trackActivities])

  const mastery = useMemo(() => {
    const d = { ...done }
    if (finish?.correct) d[activity.id] = { stars: finish.bestStars, attempts: 1, score: 1, plays: 1, at: '' }
    return trackMastery(trackActivities, d, activity.track, activity.band)
  }, [done, finish, activity.id, activity.track, activity.band, trackActivities])

  const toggleVoice = () => {
    const next = !muted
    setVoiceMuted(next)
    setMuted(next)
    if (next) {
      stopRef.current()
      setSpeaking(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 pb-10 pt-3 sm:px-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/kids/galaxy/${track.id}`} className={`${ghostBtn} min-h-[44px] px-3 text-sm`}>
          <span aria-hidden>←</span> {track.icon} {track.name}
        </Link>
        <span className="ml-auto" />
        {stage === 'play' && attempts > 0 && (
          <span className="rounded-full border border-white/[0.08] bg-[#111C32] px-3 py-2 text-sm font-semibold text-[#A7B0C0]" aria-live="polite">
            Try {attempts}
          </span>
        )}
        <button type="button" onClick={toggleVoice} aria-pressed={!muted} className={`${ghostBtn} min-h-[44px] px-3 text-sm`} aria-label={muted ? 'Turn voice on' : 'Turn voice off'}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4V5z" />
            {muted ? <path d="m23 9-6 6M17 9l6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />}
          </svg>
          <span className="hidden sm:inline">{muted ? 'Voice off' : 'Voice on'}</span>
        </button>
      </div>

      <div ref={stageTop} className="scroll-mt-24" />

      {stage === 'intro' && (
        <section
          aria-labelledby="mission-title"
          className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-8"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br ${track.gradient} text-4xl shadow-[0_8px_24px_rgba(0,0,0,.45)]`} aria-hidden>
              {track.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-[#A7B0C0]">
                <span className="text-amber-300">Mission</span>
                {band && (
                  <span>
                    {band.emoji} {band.name} · ages {band.ages}
                  </span>
                )}
                <DifficultyDots d={activity.difficulty} />
                {previousBest > 0 && (
                  <span className="inline-flex items-center gap-1 text-[#EEF2F8]">
                    Best <Stars n={previousBest} size="text-sm" />
                  </span>
                )}
              </p>
              <h1 id="mission-title" className="mt-2 font-display text-[28px] font-bold leading-tight text-[#EEF2F8] sm:text-4xl">
                {activity.title}
              </h1>
              <p className="mt-3 text-[19px] leading-relaxed text-[#EEF2F8] sm:text-xl">{activity.intro}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={start} className={primaryBtn} autoFocus>
                  {previousBest > 0 ? 'Play again' : 'Start mission'} <span aria-hidden>→</span>
                </button>
                {speechOk && (
                  <button
                    type="button"
                    onClick={() => {
                      if (muted) {
                        setVoiceMuted(false)
                        setMuted(false)
                      }
                      if (speaking) {
                        stopRef.current()
                        setSpeaking(false)
                      } else speak(activity.intro)
                    }}
                    className={ghostBtn}
                  >
                    <span aria-hidden>{speaking ? '■' : '🔊'}</span> {speaking ? 'Stop' : 'Hear it'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {stage === 'play' && (
        <section aria-label={`Activity: ${activity.title}`} className="flex flex-col gap-3">
          <div className="flex items-start gap-3 rounded-[20px] border border-white/[0.08] bg-[#111C32] p-3 sm:p-4">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${track.gradient} text-xl`} aria-hidden>
              {track.icon}
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-bold leading-tight text-[#EEF2F8] sm:text-xl">{activity.title}</h1>
              <p className="mt-0.5 text-[15px] leading-snug text-[#A7B0C0]">{activity.intro}</p>
            </div>
          </div>
          <Play key={run} params={activity.params} band={activity.band} onChecked={onChecked} onDone={onDone} />
        </section>
      )}

      {stage === 'done' && finish && (
        <section aria-labelledby="done-title" className="flex flex-col gap-4">
          <div className="rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 text-center shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-8">
            {finish.correct ? (
              <>
                <Stars n={finish.stars} size="text-5xl" />
                <h2 id="done-title" ref={doneHeading} tabIndex={-1} className="mt-3 font-display text-3xl font-bold text-[#EEF2F8] focus:outline-none">
                  {finish.stars === 3 ? 'First try. Brilliant!' : finish.stars === 2 ? 'Solved it!' : 'You kept going and solved it!'}
                </h2>
                <p className="mt-1 text-[#A7B0C0]">
                  {finish.attempts === 1 ? 'Solved in 1 try.' : `Solved in ${finish.attempts} tries.`}
                  {!finish.improved && ` Your best is still ${finish.bestStars} ${finish.bestStars === 1 ? 'star' : 'stars'}.`}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm font-bold">
                  {finish.reward ? (
                    <span className="rounded-full bg-amber-500 px-3 py-1.5 text-[#1A1103]">+{finish.reward.xpGained} XP</span>
                  ) : (
                    <span className="rounded-full border border-white/[0.16] px-3 py-1.5 text-[#A7B0C0]">Practice run: beat your best stars to earn XP</span>
                  )}
                  {finish.reward?.newBadges.map((b) => (
                    <span key={b.id} className="rounded-full bg-[#22C55E]/15 px-3 py-1.5 text-[#86EFAC]">
                      {b.icon} {b.name}
                    </span>
                  ))}
                  {finish.mastery?.earned && (
                    <span className="rounded-full bg-[#00B8D4]/15 px-3 py-1.5 text-[#67E8F9]">
                      {track.icon} {track.name} Master · {band?.name}
                    </span>
                  )}
                  {finish.reward && finish.reward.levelAfter > finish.reward.levelBefore && (
                    <span className="rounded-full bg-amber-300/20 px-3 py-1.5 text-amber-200">Level {finish.reward.levelAfter}!</span>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-5xl" aria-hidden>
                  🛰️
                </p>
                <h2 id="done-title" ref={doneHeading} tabIndex={-1} className="mt-3 font-display text-3xl font-bold text-[#EEF2F8] focus:outline-none">
                  Good exploring. Come back to this one!
                </h2>
                <p className="mt-1 text-[#A7B0C0]">Real engineers try things many times. Read the big idea below, then have another go.</p>
              </>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={start} className={finish.correct ? ghostBtn : primaryBtn}>
                {finish.correct ? 'Play again' : 'Try again'}
              </button>
              <Link href="/kids/galaxy" className={finish.correct && suggestions.length === 0 ? primaryBtn : ghostBtn}>
                Skill Galaxy
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-[20px] border border-amber-400/30 bg-[#111C32] p-5">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">The big idea</h3>
              <p className="mt-2 text-lg leading-relaxed text-[#EEF2F8]">{activity.takeaway}</p>
              {speechOk && !muted && (
                <button type="button" onClick={() => speak(activity.takeaway)} className={`mt-3 min-h-[44px] rounded-xl px-2 text-sm font-semibold text-amber-300 hover:text-amber-200 ${focusRing}`}>
                  <span aria-hidden>🔊</span> Hear it
                </button>
              )}
            </article>
            {activity.realWorld && (
              <article className="rounded-[20px] border border-[#00B8D4]/30 bg-[#111C32] p-5">
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#67E8F9]">For real</h3>
                <p className="mt-2 text-lg leading-relaxed text-[#EEF2F8]">{activity.realWorld}</p>
              </article>
            )}
          </div>

          <div className="rounded-[20px] border border-white/[0.08] bg-[#111C32] p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-base font-bold text-[#EEF2F8]">
                {track.icon} {track.name} · {band?.name}
              </h3>
              <span className="font-display text-sm font-bold text-[#A7B0C0]">
                {mastery.done}/{mastery.total} · {mastery.pct}%
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={mastery.pct} aria-label={`${track.name} mastery`}>
              <div className={`h-full rounded-full bg-gradient-to-r ${track.gradient} transition-[width] duration-500`} style={{ width: `${mastery.pct}%` }} />
            </div>
            {suggestions.length > 0 && (
              <>
                <h3 className="mt-5 font-display text-base font-bold text-[#EEF2F8]">Next mission</h3>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {suggestions.map((s, i) => (
                    <li key={s.id}>
                      <Link
                        href={`/kids/galaxy/${s.track}/${s.id}`}
                        className={`flex min-h-[56px] items-center gap-3 rounded-2xl border px-4 py-3 transition-transform duration-150 hover:-translate-y-0.5 active:scale-[.98] ${focusRing} ${i === 0 && finish.correct ? 'border-amber-400/60 bg-amber-500/10' : 'border-white/[0.08] bg-white/[0.03]'}`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${track.gradient}`} aria-hidden>
                          ★
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-display font-bold text-[#EEF2F8]">{s.title}</span>
                          <span className="block text-sm text-[#A7B0C0]">{getBand(s.band)?.name}</span>
                        </span>
                        <span aria-hidden className="text-amber-300">
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

