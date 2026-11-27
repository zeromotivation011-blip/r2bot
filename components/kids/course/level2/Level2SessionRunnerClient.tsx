'use client'

// components/kids/course/level2/Level2SessionRunnerClient.tsx
// The runner for a COMPOSED course session (Level 2, lib/kids/curriculum/level2):
//   1 Episode (storybook, or the Story Theatre cartoon) → 2 Build →
//   3 Practise (a verified Code Lab / Physics Lab arena + Skill Galaxy
//     activities) → 4 Challenge (one tier of a Universe game) → 5 Check → 6 Badge.
//
// Same contracts as the Level 1 runner: resumes through course-state.ts
// (r2bot_kids_course_v1), fits the part with saveDesign, and reports the
// session (and the project) ONLY through reportActivity — once, with a replay
// reporting just an improvement. The challenge is won when the game + tier has
// a personal best in lib/kids-progress (GameShellClient writes it on a won
// round); practise ticks come from the Code Lab and Galaxy stores. Nothing
// here writes XP, badges or bests directly.
//
// Stars (care, never speed): 1 = challenge won and check answered; +1 for each
// of the first two practise items finished (the arena, or Galaxy activities).

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Level2SessionData } from '@/lib/kids/curriculum/level2/resolve'
import type { BlockId } from '@/lib/kids/curriculum/types'
import { loadDesign, ROBOT_CHANGED_EVENT, saveDesign, DEFAULT_DESIGN, type RobotDesign } from '@/lib/kids/robot-design'
import { reportActivity, reportBestRun, type RewardResult } from '@/lib/kids/universe/rewards'
import { getProgress, KIDS_PROGRESS_EVENT } from '@/lib/kids-progress'
import { getActivitiesDone } from '@/lib/kids/activities/progress'
import { cancelSparkSpeech, playSound, sparkSays } from '@/lib/kids-audio'
import { readSessionState, writeSessionState, type SessionState } from '../course-state'
import BuildStepClient from '../BuildStepClient'
import CheckStepClient from '../CheckStepClient'
import BadgeStepClient from '../BadgeStepClient'
import GrownUpsDrawerClient from '../GrownUpsDrawerClient'
import StorybookClient from './StorybookClient'
import '../course.css'

/** rewards.ts DEFAULT_XP.session — the base a replay's XP difference is worked out from. */
const SESSION_XP = 50

const STEPS = [
  { id: 'episode', label: 'Episode', icon: '🎬' },
  { id: 'build', label: 'Build', icon: '🔧' },
  { id: 'practise', label: 'Practise', icon: '🧩' },
  { id: 'challenge', label: 'Challenge', icon: '🏁' },
  { id: 'check', label: 'Check', icon: '❓' },
  { id: 'badge', label: 'Badge', icon: '🏅' },
] as const

/** Plain words for the blocks a session introduces. */
const BLOCK_WORDS: Partial<Record<BlockId, string>> = {
  stop: 'Stop',
  number: 'Type a number',
  drive_distance: 'Drive a distance (cm)',
  set_motors: 'Set left and right motors (%)',
  line_seen: 'Line seen?',
  if_else: 'If … else …',
  forever: 'Forever',
  and: 'and',
  or: 'or',
  not: 'not',
  timer_s: 'Timer (seconds)',
  floor_color: 'Floor colour',
}

function TheatreSkeleton() {
  return <div className="aspect-[4/5] w-full rounded-[28px] border border-white/10 bg-white/[0.04] sm:aspect-video" aria-busy="true" />
}
const StoryPlayer = dynamic(() => import('@/components/kids/story/StoryPlayerLoaderClient'), { ssr: false, loading: TheatreSkeleton })

interface Practised {
  arena: boolean
  activities: Record<string, boolean>
}

function readPractised(d: Level2SessionData): Practised {
  const p = getProgress()
  const done = getActivitiesDone()
  return {
    arena: d.arena.kind === 'code-lab' ? (p.codeMissions?.[d.arena.id] ?? 0) > 0 : false,
    activities: Object.fromEntries(d.activities.map((a) => [a.id, !!done[a.id]])),
  }
}

function practiseCount(p: Practised): number {
  return (p.arena ? 1 : 0) + Object.values(p.activities).filter(Boolean).length
}

function gameWon(bestKey: string): boolean {
  return getProgress().personalBests?.[bestKey] !== undefined
}

const btnPrimary =
  'min-h-[52px] rounded-2xl bg-amber-500 px-6 font-display text-lg font-bold text-[#1A1103] shadow-[0_8px_24px_rgba(252,104,24,.35)] hover:bg-amber-400 active:scale-[.97] disabled:bg-white/[0.08] disabled:text-[#6E7888] disabled:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
const card = 'rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)]'

export default function Level2SessionRunnerClient({ data, level = 2 }: { data: Level2SessionData; level?: number }) {
  const { session, arena, activities, game, theatre, next } = data
  const id = session.id
  const [hydrated, setHydrated] = useState(false)
  const [st, setSt] = useState<SessionState>({ step: 0, reached: 0, updated: '' })
  const [resumedAt, setResumedAt] = useState<number | null>(null)
  const [design, setDesign] = useState<RobotDesign>(DEFAULT_DESIGN)
  const [watched, setWatched] = useState(false)
  const [mode, setMode] = useState<'story' | 'cartoon'>('story')
  const [practised, setPractised] = useState<Practised>({ arena: false, activities: {} })
  const [won, setWon] = useState(false)
  const [result, setResult] = useState<RewardResult | null>(null)
  const [replay, setReplay] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)
  const reportedRef = useRef(false)

  const refresh = useCallback(() => {
    setPractised(readPractised(data))
    setWon(gameWon(data.game.bestKey))
  }, [data])

  useEffect(() => {
    const s = readSessionState(id)
    setSt(s)
    if (s.step > 0 && !s.done) setResumedAt(s.step)
    setWatched(s.reached > 0)
    setReplay(!!getProgress().sessionsDone[id])
    setDesign(loadDesign())
    refresh()
    setHydrated(true)
    const onRobot = () => setDesign(loadDesign())
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener(ROBOT_CHANGED_EVENT, onRobot)
    window.addEventListener(KIDS_PROGRESS_EVENT, refresh)
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener(ROBOT_CHANGED_EVENT, onRobot)
      window.removeEventListener(KIDS_PROGRESS_EVENT, refresh)
      window.removeEventListener('storage', refresh)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
      cancelSparkSpeech()
    }
  }, [id, refresh])

  const patch = useCallback((p: Partial<SessionState>) => setSt(writeSessionState(id, p)), [id])

  // The challenge counts once the game tier has a win (now or earlier).
  useEffect(() => {
    if (!hydrated || !won || (st.challengeStars ?? 0) > 0) return
    const first = !st.challengeReported
    // The weekly quest "Solve 3 robot challenges" counts the course challenge, once per session.
    if (first) reportBestRun({ kind: 'challenge', id: `${id}-challenge`, stars: 1, score: 1 })
    patch({ challengeStars: 1, ...(first ? { challengeReported: true } : {}) })
  }, [hydrated, won, st.challengeStars, st.challengeReported, id, patch])

  const stars = Math.min(3, 1 + Math.min(2, practiseCount(practised)))

  const canEnter = (i: number, s: SessionState = st): boolean => {
    if (i <= s.reached) return true
    if (i !== s.reached + 1) return false
    if (i === 2) return !!s.built
    if (i === 4) return (s.challengeStars ?? 0) > 0
    if (i === 5) return !!s.checked
    return true
  }

  const goTo = (i: number) => {
    if (!canEnter(i)) return
    cancelSparkSpeech()
    playSound('click')
    setResumedAt(null)
    patch({ step: i, reached: Math.max(st.reached, i) })
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    topRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  // The badge: report the session (and the project) once; a replay with more stars reports only the difference.
  useEffect(() => {
    if (!hydrated || st.step !== 5 || reportedRef.current) return
    const prevStars = Math.max(st.done ? (st.reportedStars ?? 0) : 0, getProgress().sessionsDone[id] ?? 0)
    reportedRef.current = true
    if (prevStars >= stars) {
      if (!st.done) patch({ done: true, reportedStars: prevStars })
      return
    }
    let total: RewardResult
    if (prevStars > 0) {
      const mult = (n: number) => 0.6 + 0.2 * n
      const diff = Math.round(SESSION_XP * mult(stars)) - Math.round(SESSION_XP * mult(prevStars))
      total = reportActivity({ kind: 'session', id, stars, xp: diff / mult(stars), badges: [session.badge.id] })
    } else {
      const r = reportActivity({ kind: 'session', id, stars, badges: [session.badge.id] })
      total = r
      if (session.project) {
        const p = reportActivity({ kind: 'project', id: session.project.id, stars })
        total = { ...p, xpGained: r.xpGained + p.xpGained, levelBefore: r.levelBefore }
      }
    }
    setResult(total)
    patch({ done: true, reportedStars: stars })
  }, [hydrated, st.step, st.done, st.reportedStars, stars, id, session, patch])

  useEffect(() => {
    if (st.step !== 5) reportedRef.current = false
  }, [st.step])

  const onApply = (d: RobotDesign) => {
    saveDesign(d)
    setDesign(d)
    if (!st.built) reportBestRun({ kind: 'build', id: `${id}-build`, score: 1 })
    patch({ built: true })
  }

  const onWatched = useCallback(() => setWatched(true), [])
  const step = st.step
  const practiseTotal = activities.length + (arena.kind === 'code-lab' ? 1 : 0)
  const project = session.project

  return (
    <div className="course-runner mx-auto max-w-6xl px-4 pb-10 pt-3 sm:pt-5" data-testid="session-runner" data-step={STEPS[step].id} data-hydrated={hydrated ? 'yes' : 'no'}>
      <div ref={topRef} className="flex scroll-mt-2 items-center gap-2">
        <Link
          href={`/kids/course/${level}`}
          className="-ml-2 flex min-h-[44px] min-w-0 items-center gap-1 rounded-2xl px-2 text-sm font-bold text-amber-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
        >
          <span aria-hidden>←</span>
          <span className="truncate">{data.levelTitle}</span>
        </Link>
        <span className="ml-auto" />
        <GrownUpsDrawerClient title={`Session ${session.number}: ${session.title}`} objectives={session.objectives} teacher={session.teacher} parent={session.parent} project={project} />
      </div>
      <div className="mt-1">
        <p className="font-display text-xs font-bold uppercase tracking-wider text-[#A7B0C0]">
          Session {session.number} of 24 · {data.actTitle}
        </p>
        <h1 className="font-display text-2xl font-bold leading-tight text-[#EEF2F8] sm:text-3xl">{session.title}</h1>
      </div>

      <nav aria-label="Session steps" className="mt-3">
        <ol className="grid grid-cols-6 gap-1 sm:gap-2">
          {STEPS.map((b, i) => {
            const current = i === step
            const done = i < st.reached || (i === 5 && st.done)
            const enter = hydrated && canEnter(i)
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  disabled={!enter}
                  aria-current={current ? 'step' : undefined}
                  data-testid={`beat-${b.id}`}
                  className={`flex min-h-[56px] w-full flex-col items-center justify-center gap-0.5 rounded-2xl border px-0.5 py-1 font-black transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 sm:min-h-[52px] sm:flex-row sm:gap-1.5 sm:px-2 ${
                    current
                      ? 'border-amber-300 bg-amber-500 text-[#1A1103] shadow-[0_6px_18px_rgba(252,104,24,.35)]'
                      : done
                        ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20'
                        : enter
                          ? 'border-white/15 bg-white/[0.06] text-[#EEF2F8] hover:bg-white/10'
                          : 'border-white/10 bg-transparent text-[#6E7888]'
                  }`}
                >
                  <span className="text-lg leading-none sm:text-xl" aria-hidden>
                    {done && !current ? '✓' : b.icon}
                  </span>
                  <span className="text-[10.5px] leading-tight sm:text-sm">
                    <span className="sr-only">Step {i + 1}: </span>
                    {b.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      {resumedAt !== null && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-[15px] text-cyan-100" role="status">
          <span className="mr-auto">👋 Welcome back! You were at {STEPS[resumedAt].label}.</span>
          <button type="button" onClick={() => setResumedAt(null)} aria-label="Dismiss" className="h-11 w-11 rounded-xl text-lg hover:bg-white/10">
            ×
          </button>
        </div>
      )}

      <div className="mt-4 min-h-[60vh]">
        {!hydrated ? (
          <div className="mx-auto aspect-[4/5] w-full max-w-4xl rounded-[28px] border border-white/10 bg-white/[0.03] sm:aspect-video" aria-busy="true" />
        ) : step === 0 ? (
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="mr-auto min-w-0 font-display text-xs font-bold uppercase tracking-wider text-cyan-300">
                Episode {session.number} · <span className="normal-case tracking-normal">{session.episode.title}</span>
              </h2>
              {theatre && (
                <div className="flex gap-1 rounded-2xl bg-white/[0.05] p-1" role="group" aria-label="How to watch">
                  {(
                    [
                      ['story', '📖 Island story'],
                      ['cartoon', '🎬 Cartoon'],
                    ] as const
                  ).map(([m, label]) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      aria-pressed={mode === m}
                      className={`min-h-[44px] rounded-xl px-3 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${mode === m ? 'bg-amber-500 text-[#1A1103]' : 'text-[#EEF2F8] hover:bg-white/10'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {mode === 'cartoon' && theatre ? (
              <div className="flex flex-col gap-2">
                <p className="text-[15px] text-[#A7B0C0]">
                  Bonus cartoon about the same idea: “{theatre.title}” (about {theatre.minutes} min). The island story is the one the season follows.
                </p>
                <StoryPlayer episode={theatre.episode} next={theatre.next} />
              </div>
            ) : (
              <StorybookClient episode={session.episode} sessionNumber={session.number} onDone={onWatched} />
            )}
            <div className="flex flex-wrap items-center justify-end gap-3">
              {!watched && <p className="mr-auto text-[15px] text-[#A7B0C0]">Read to the end, then build your robot.</p>}
              <button type="button" onClick={() => goTo(1)} data-testid="beat-next" className={watched ? btnPrimary : `${btnPrimary} !bg-white/[0.08] !text-[#EEF2F8] !shadow-none`}>
                {watched ? 'Next: Build →' : 'Skip to Build →'}
              </button>
            </div>
          </div>
        ) : step === 1 ? (
          <BuildStepClient build={session.build} sessionNumber={session.number} design={design} built={!!st.built} onApply={onApply} onNext={() => goTo(2)} />
        ) : step === 2 ? (
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-3" data-testid="practise">
            {session.newBlocks.length > 0 && (
              <div className={card}>
                <p className="font-display text-xs font-bold uppercase tracking-wider text-cyan-300">New blocks today</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {session.newBlocks.map((b) => (
                    <li key={b} className="rounded-xl bg-amber-400/15 px-3 py-2 font-mono text-[15px] font-bold text-amber-200 ring-1 ring-amber-400/40">
                      {BLOCK_WORDS[b] ?? b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {project && (
              <details className="rounded-[20px] border border-amber-400/40 bg-amber-400/[0.06] p-4" open>
                <summary className="cursor-pointer font-display text-lg font-bold text-amber-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
                  🌟 Your project: {project.title}
                </summary>
                <p className="mt-2 text-[16px] leading-relaxed text-[#EEF2F8]">{project.brief}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-[#A7B0C0]">
                  {project.constraints.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </details>
            )}
            <div className={card}>
              <div className="flex items-start gap-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-cyan-400/15 text-3xl ring-1 ring-cyan-400/40" aria-hidden>
                  {arena.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xs font-bold uppercase tracking-wider text-cyan-300">{arena.kind === 'code-lab' ? 'Code Lab mission' : 'Physics Lab arena'}</p>
                  <h2 className="font-display text-xl font-bold leading-tight text-[#EEF2F8]">
                    {arena.title} {practised.arena && <span className="text-emerald-300">✓</span>}
                  </h2>
                  <p className="mt-1 text-[16px] leading-snug text-[#EEF2F8]">{arena.task}</p>
                  <p className="mt-1 text-[14px] text-[#A7B0C0]">{arena.lesson}</p>
                  {arena.kind === 'physics' && <p className="mt-1 text-[14px] text-[#A7B0C0]">In the Physics Lab, pick “{arena.title.replace(' (Physics Lab)', '')}” from the challenge list.</p>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={arena.href} className={`${btnPrimary} inline-flex items-center`} data-testid="open-arena">
                  Open {arena.kind === 'code-lab' ? 'the mission' : 'the Physics Lab'} →
                </Link>
                <button type="button" onClick={() => sparkSays(arena.task)} className="min-h-[52px] rounded-2xl border border-cyan-400/40 px-4 font-black text-cyan-200 hover:bg-cyan-400/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
                  🔊 Read it
                </button>
              </div>
            </div>
            <div className={card}>
              <p className="font-display text-xs font-bold uppercase tracking-wider text-cyan-300">Skill Galaxy practice</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {activities.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={a.href}
                      className="flex min-h-[88px] flex-col gap-1 rounded-2xl border border-white/10 bg-[#111C32] p-3 hover:border-amber-400/50 hover:bg-[#19263F] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                    >
                      <span className="flex items-center gap-2 font-bold text-[#EEF2F8]">
                        <span aria-hidden>{a.trackIcon}</span>
                        <span className="min-w-0 flex-1">{a.title}</span>
                        {practised.activities[a.id] && <span className="text-emerald-300" aria-label="done">✓</span>}
                      </span>
                      <span className="text-[14px] leading-snug text-[#A7B0C0]">{a.why}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <p className="mr-auto text-[15px] text-[#A7B0C0]" role="status">
                Practised {practiseCount(practised)} of {practiseTotal}. Each one you finish adds a star (up to ★★★).
              </p>
              <button type="button" onClick={() => goTo(3)} data-testid="beat-next" className={btnPrimary}>
                Next: Challenge →
              </button>
            </div>
          </div>
        ) : step === 3 ? (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3" data-testid="challenge">
            <div className={card}>
              <div className="flex items-start gap-3">
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-amber-400/15 text-4xl ring-1 ring-amber-400/40" aria-hidden>
                  {game.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xs font-bold uppercase tracking-wider text-cyan-300">Challenge · {game.tierName} tier</p>
                  <h2 className="font-display text-2xl font-bold leading-tight text-[#EEF2F8]">{game.name}</h2>
                  <p className="mt-1 text-[16px] leading-snug text-[#EEF2F8]">{game.goal}</p>
                </div>
              </div>
              <p className="mt-3 rounded-2xl bg-[#111C32] p-3 text-[15px] leading-relaxed text-[#A7B0C0]">
                <span className="font-bold text-amber-200">Spark: </span>
                {game.link}
              </p>
              <p className="mt-2 text-[14px] text-[#A7B0C0]">In the game, choose the {game.tierName} tier at the top. Win a round, then come back here.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={game.href} className={`${btnPrimary} inline-flex items-center`} data-testid="open-game">
                  Play {game.name} →
                </Link>
                <button type="button" onClick={() => sparkSays(`${game.goal} ${game.link}`)} className="min-h-[52px] rounded-2xl border border-cyan-400/40 px-4 font-black text-cyan-200 hover:bg-cyan-400/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
                  🔊 Read it
                </button>
              </div>
            </div>
            <div
              className={`flex flex-col gap-2 rounded-[20px] border p-3 sm:flex-row sm:items-center ${won ? 'border-emerald-400/40 bg-emerald-400/10' : 'border-white/10 bg-[#111C32]'}`}
              role="status"
              data-cue={won ? 'ok' : 'info'}
            >
              <p className="min-w-0 flex-1 text-[15px] font-semibold text-[#EEF2F8]">
                {won ? `✓ You have won ${game.name} on ${game.tierName}. Challenge done!` : `Not won yet on ${game.tierName}. Play it, win a round, and this turns green.`}
              </p>
              {!won && (
                <button type="button" onClick={refresh} className="min-h-[48px] shrink-0 rounded-2xl border border-amber-400/50 px-4 text-sm font-black text-amber-300 hover:bg-amber-400/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
                  Check again
                </button>
              )}
              <button type="button" onClick={() => goTo(4)} disabled={!canEnter(4)} data-testid="beat-next" className={`${btnPrimary} shrink-0`}>
                {canEnter(4) ? 'Next: Check →' : 'Win it to go on'}
              </button>
            </div>
          </div>
        ) : step === 4 ? (
          <CheckStepClient quiz={session.quiz} sessionKey={session.id} checked={!!st.checked} onChecked={() => patch({ checked: true })} onNext={() => goTo(5)} />
        ) : (
          <BadgeStepClient
            badge={session.badge}
            stars={stars}
            rewardNote={session.reward.note}
            project={project}
            result={result}
            replay={replay}
            levelHref={`/kids/course/${level}`}
            next={next ? { href: `/kids/course/${level}/${next.number}`, title: next.title, number: next.number } : null}
            onReplayChallenge={() => goTo(2)}
          />
        )}
      </div>
    </div>
  )
}
