'use client'

// components/kids/galaxy/LaunchCheckClient.tsx
// The Launch Check for one track (roadmap #29): 6–8 quick missions on a
// staircase (lib/kids/activities/launch-check.ts) that set the child's start
// point in this track. Three first-try wins in a row offer "skip to Ace?";
// two misses in a row bring an easier mission on the same concept; two wrong
// checks inside one mission offer "try an easier one". Every run is saved like
// any Galaxy run (done, stars, XP via reportActivity, mastery evidence).
// No score is shown or kept, and the child can finish at any moment.

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Activity, TrackId } from '@/lib/kids/activities/types'
import { TRACKS } from '@/lib/kids/activities/types'
import { getBand, type BandId } from '@/lib/kids/bands'
import { LAUNCH_MAX, LAUNCH_SKIP_STREAK, launchAdvance, launchLadder, launchNextItem, launchPlacement, launchStart, launchWinStreak, type LaunchState } from '@/lib/kids/activities/launch-check'
import { nextActivities, type ActivitySummary, type StartPoint } from '@/lib/kids/activities/progress'
import { describeStart, setTrackStart } from '@/lib/kids/activities/pacing'
import { finishGalaxyRun, type GalaxyRunResult } from '@/lib/kids/activities/run'
import { CONCEPT_INFO } from '@/lib/kids/universe/mastery'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { PLAYABLE } from '@/components/kids/activities/registry'
import { BandPicker } from './GalaxyClient'
import { useGalaxyState } from './useGalaxyState'
import { useMastery } from './useMastery'

export type LaunchActivity = Omit<Activity, 'solution' | 'realWorld' | 'after' | 'world'>

interface Props {
  trackId: TrackId
  /** Every mission any band's ladder might use (no solutions). */
  candidates: LaunchActivity[]
  /** Light summaries of the whole track (for "start here"). */
  summaries: ActivitySummary[]
}

type Stage = 'intro' | 'play' | 'between' | 'result'

const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
const primaryBtn = `inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 font-display text-lg font-bold text-[#1A1103] shadow-[0_8px_24px_rgba(252,104,24,.25)] transition-transform duration-150 hover:-translate-y-0.5 active:scale-[.97] ${focusRing}`
const ghostBtn = `inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-white/[0.16] bg-white/[0.04] px-5 font-display text-base font-bold text-[#EEF2F8] transition-transform duration-150 hover:-translate-y-0.5 hover:border-white/30 active:scale-[.97] ${focusRing}`
const card = 'rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-8'

export default function LaunchCheckClient({ trackId, candidates, summaries }: Props) {
  const track = TRACKS.find((t) => t.id === trackId) ?? TRACKS[0]
  const { ready, band, setBand, done } = useGalaxyState()
  const { starts } = useMastery()
  const [stage, setStage] = useState<Stage>('intro')
  const [state, setState] = useState<LaunchState | null>(null)
  const [current, setCurrent] = useState<string | null>(null)
  const [wrongInARow, setWrongInARow] = useState(0)
  const [last, setLast] = useState<GalaxyRunResult | null>(null)
  const [skipOffered, setSkipOffered] = useState(false)
  const [placement, setPlacement] = useState<StartPoint | null>(null)
  const [skipped, setSkipped] = useState(false)
  const [round, setRound] = useState(0)
  const top = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  const childBand: BandId = band ?? 'builders'
  const byId = useMemo(() => new Map(candidates.map((a) => [a.id, a])), [candidates])
  const candidateSummaries = useMemo(() => summaries.filter((s) => byId.has(s.id)), [summaries, byId])
  const rungs = useMemo(() => launchLadder(candidateSummaries, trackId, childBand), [candidateSummaries, trackId, childBand])
  const activity = current ? byId.get(current) : undefined
  const Play = activity ? PLAYABLE[activity.template] : null
  const existing = starts[trackId]

  useEffect(() => {
    if (stage !== 'play') heading.current?.focus()
    top.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [stage, current])

  const begin = () => {
    primeAudio()
    playSound('click')
    const s = launchStart(rungs, childBand)
    setState(s)
    setSkipOffered(false)
    setSkipped(false)
    setPlacement(null)
    setLast(null)
    const first = launchNextItem(rungs, s, candidateSummaries)
    setCurrent(first ?? null)
    setWrongInARow(0)
    setRound((r) => r + 1)
    setStage(first ? 'play' : 'result')
  }

  const finish = useCallback(
    (s: LaunchState, forced?: StartPoint) => {
      const p = forced ?? launchPlacement(rungs, s)
      setTrackStart(trackId, p)
      setPlacement(p)
      setStage('result')
      playSound('levelup')
    },
    [rungs, trackId],
  )

  const record = useCallback(
    (r: { correct: boolean; attempts: number; score: number }) => {
      if (!activity || !state) return
      const res = finishGalaxyRun(activity, r, summaries)
      setLast(res)
      const next = launchAdvance(rungs, state, { id: activity.id, ok: res.firstTry })
      setState(next)
      playSound(res.firstTry ? 'star' : 'click')
      setStage('between')
    },
    [activity, state, rungs, summaries],
  )

  const onChecked = useCallback((r: { correct: boolean }) => {
    setWrongInARow((n) => (r.correct ? 0 : n + 1))
  }, [])

  const goNext = () => {
    if (!state) return
    if (state.done) {
      finish(state)
      return
    }
    const id = launchNextItem(rungs, state, candidateSummaries)
    if (!id) {
      finish(state)
      return
    }
    setCurrent(id)
    setWrongInARow(0)
    setRound((r) => r + 1)
    setStage('play')
  }

  const streak = state ? launchWinStreak(state) : 0
  const offerSkip = stage === 'between' && !!state && !state.done && !skipOffered && streak >= LAUNCH_SKIP_STREAK
  const startMission = useMemo(() => {
    if (!placement) return undefined
    return nextActivities(summaries, done, placement.band, { track: trackId, starts: { [trackId]: placement }, limit: 1 })[0]
  }, [placement, summaries, done, trackId])

  const count = state?.items.length ?? 0

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 pt-2 sm:px-5">
      <div ref={top} className="scroll-mt-24" />

      {stage === 'intro' && (
        <section aria-labelledby="lc-title" className={card}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br ${track.gradient} text-4xl`} aria-hidden>
              {track.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-amber-300">Launch Check</p>
              <h1 id="lc-title" ref={heading} tabIndex={-1} className="mt-1 font-display text-[30px] font-bold leading-tight text-[#EEF2F8] focus:outline-none sm:text-4xl">
                Where should your {track.name} journey start?
              </h1>
              <p className="mt-3 text-[18px] leading-relaxed text-[#EEF2F8]">
                Up to {LAUNCH_MAX} quick missions. Solve one on the first try and the next is a bit harder; find one tricky and the next is a bit
                easier. There is no score. Stop whenever you like.
              </p>
              {existing && ready && (
                <p className="mt-3 rounded-2xl border border-[#00B8D4]/30 bg-[#00B8D4]/10 px-4 py-3 text-[15px] text-[#A5F3FC]">
                  Your start now: <strong>{describeStart(existing)}</strong>. Run it again to move it.
                </p>
              )}
              {ready && !band && (
                <div className="mt-5">
                  <p className="mb-2 font-display font-bold text-[#EEF2F8]">First, how old are you?</p>
                  <BandPicker band={band} onPick={setBand} label="Your age band" />
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={begin} disabled={!ready || !band || !rungs.length} className={`${primaryBtn} disabled:cursor-not-allowed disabled:opacity-50`}>
                  Start Launch Check <span aria-hidden>→</span>
                </button>
                <Link href={`/kids/galaxy/${track.id}`} className={ghostBtn}>
                  Skip it: see all missions
                </Link>
              </div>
              {ready && band && !rungs.length && <p className="mt-3 text-[15px] text-[#A7B0C0]">No missions for your age in this track yet.</p>}
            </div>
          </div>
        </section>
      )}

      {stage === 'play' && activity && Play && (
        <section aria-label={`Launch Check mission: ${activity.title}`} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">Launch Check · {track.name}</span>
            <ol className="flex gap-1.5" aria-label={`Mission ${count + 1} of up to ${LAUNCH_MAX}`}>
              {Array.from({ length: LAUNCH_MAX }, (_, i) => (
                <li
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full ${i < count ? (state?.items[i]?.ok ? 'bg-[#22C55E]' : 'bg-amber-300') : i === count ? 'bg-white ring-2 ring-amber-400/60' : 'bg-white/15'}`}
                />
              ))}
            </ol>
            <button type="button" onClick={() => state && (count > 0 ? finish(state) : setStage('intro'))} className={`${ghostBtn} ml-auto min-h-[44px] px-3 text-sm`}>
              Finish now
            </button>
          </div>
          <div className="flex items-start gap-3 rounded-[20px] border border-white/[0.08] bg-[#111C32] p-3 sm:p-4">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${track.gradient} text-xl`} aria-hidden>
              {track.icon}
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-bold leading-tight text-[#EEF2F8] sm:text-xl">{activity.title}</h1>
              <p className="mt-0.5 text-[15px] leading-snug text-[#A7B0C0]">{activity.intro}</p>
            </div>
          </div>
          {wrongInARow >= 2 && (
            <div className="flex flex-wrap items-center gap-3 rounded-[20px] border border-amber-400/40 bg-amber-500/10 p-3" role="status">
              <p className="flex-1 text-[15px] text-[#EEF2F8]">This one is tricky. Want an easier mission on the same idea?</p>
              <button type="button" onClick={() => record({ correct: false, attempts: 3, score: 0 })} className={`${ghostBtn} min-h-[44px] px-4 text-sm`}>
                Try an easier one
              </button>
            </div>
          )}
          <Play key={`${round}-${activity.id}`} params={activity.params} band={activity.band} onChecked={onChecked} onDone={record} />
        </section>
      )}

      {stage === 'between' && last && state && (
        <section aria-labelledby="lc-between" className={`${card} text-center`}>
          <p className="text-5xl" aria-hidden>
            {last.firstTry ? '🚀' : last.correct ? '🛠️' : '🛰️'}
          </p>
          <h2 id="lc-between" ref={heading} tabIndex={-1} className="mt-2 font-display text-3xl font-bold text-[#EEF2F8] focus:outline-none">
            {last.firstTry ? 'First try!' : last.correct ? 'Solved it!' : 'Good exploring.'}
          </h2>
          <p className="mt-1 text-[#A7B0C0]">
            {last.firstTry ? 'The next one is a step harder.' : 'The next one is a step easier.'}
            {last.reward ? ` +${last.reward.xpGained} XP.` : ''}
          </p>
          {last.newlySecure.length > 0 && (
            <p className="mt-3 inline-flex rounded-full bg-[#22C55E]/15 px-3 py-1.5 text-sm font-bold text-[#86EFAC]">
              New constellation lit: {last.newlySecure.map((c) => CONCEPT_INFO[c].name).join(', ')}
            </p>
          )}
          {offerSkip ? (
            <div className="mx-auto mt-5 max-w-xl rounded-[20px] border border-amber-400/50 bg-amber-500/10 p-4">
              <p className="font-display text-xl font-bold text-[#EEF2F8]">
                {streak} first-try wins in a row! Skip to Ace?
              </p>
              <p className="mt-1 text-[15px] text-[#A7B0C0]">Start your {track.name} missions at the Ace level for {getBand(childBand)?.name}. You can still play the easier ones.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSkipOffered(true)
                    setSkipped(true)
                    finish(state, { band: childBand, minDifficulty: 4 })
                  }}
                  className={primaryBtn}
                >
                  Yes, skip to Ace
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSkipOffered(true)
                    goNext()
                  }}
                  className={ghostBtn}
                >
                  Keep checking
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={goNext} className={primaryBtn} autoFocus>
                {state.done ? 'See my start' : 'Next mission'} <span aria-hidden>→</span>
              </button>
            </div>
          )}
        </section>
      )}

      {stage === 'result' && (
        <section aria-labelledby="lc-result" className={`${card} text-center`}>
          <p className="text-5xl" aria-hidden>
            🧭
          </p>
          <h2 id="lc-result" ref={heading} tabIndex={-1} className="mt-2 font-display text-3xl font-bold text-[#EEF2F8] focus:outline-none">
            {placement ? `Your ${track.name} start: ${describeStart(placement)}` : 'Launch Check finished'}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-[17px] text-[#A7B0C0]">
            {skipped
              ? 'Straight to Ace. If it ever feels too hard, the easier missions are all still open.'
              : 'The glowing star on the map now starts here. Everything before it stays open if you want to play it.'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {startMission && (
              <Link href={`/kids/galaxy/${startMission.track}/${startMission.id}`} className={primaryBtn}>
                Start: {startMission.title} <span aria-hidden>→</span>
              </Link>
            )}
            <Link href="/kids/galaxy/launch-check" className={ghostBtn}>
              Check another track
            </Link>
            <Link href="/kids/galaxy/concepts" className={ghostBtn}>
              My constellations
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
