'use client'

// components/kids/course/SessionRunnerClient.tsx
// THE session runner: one course session as a six-beat stepper —
//   1 Episode → 2 Build → 3 Code → 4 Challenge → 5 Check → 6 Badge
// (lib/kids/curriculum/types.ts). It resumes exactly where the child left off
// (course-state.ts, localStorage r2bot_kids_course_v1), fits the session's part
// onto the child's own robot (saveDesign), runs the session's physics challenge
// (SimChallengeClient + lib/kids/sim/arenas/level1), and at the badge reports
// the session — and the project, on "Make it yours" sessions — through
// reportActivity(), the only way rewards are given.
//
// The session's data arrives as props from the server page (one session, not
// the whole ~250 KB season). Heavy pieces (3D episode, 3D bay, physics arena)
// are next/dynamic behind same-size skeletons.

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@/lib/kids/curriculum/types'
import { getLevel1Arena, sessionDesign } from '@/lib/kids/sim/arenas/level1'
import { loadDesign, ROBOT_CHANGED_EVENT, saveDesign, DEFAULT_DESIGN, type RobotDesign } from '@/lib/kids/robot-design'
import { reportActivity, reportBestRun, type RewardResult } from '@/lib/kids/universe/rewards'
import { getProgress, KIDS_PROGRESS_EVENT } from '@/lib/kids-progress'
import { getActivitiesDone } from '@/lib/kids/activities/progress'
import { reusePlayDone, TIER_LABEL, type SessionReuse } from '@/lib/kids/curriculum/level3/reuse-kit'
import { cancelSparkSpeech, playSound, sparkSays } from '@/lib/kids-audio'
import type { SimChallengeOutcome } from '@/components/kids/sim/SimChallengeClient'
import type { PicNode } from '@/lib/kids/sim/challenge'
import { BEATS, readSessionState, writeSessionState, type SessionState } from './course-state'
import EpisodeStepClient from './EpisodeStepClient'
import BuildStepClient from './BuildStepClient'
import CodeStepClient from './CodeStepClient'
import CheckStepClient from './CheckStepClient'
import BadgeStepClient from './BadgeStepClient'
import GrownUpsDrawerClient from './GrownUpsDrawerClient'
import './course.css'

/** rewards.ts DEFAULT_XP.session — the base a replay's XP difference is worked out from. */
const SESSION_XP = 50

function ChallengeSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <div className="h-28 rounded-[20px] bg-white/[0.05]" />
      <div className="h-[44vh] min-h-[280px] rounded-[28px] bg-white/[0.04] lg:h-[520px]" />
      <span className="sr-only">Loading the challenge…</span>
    </div>
  )
}

const SimChallenge = dynamic(() => import('@/components/kids/sim/SimChallengeClient'), { ssr: false, loading: ChallengeSkeleton })

export interface SessionRunnerProps {
  session: Session
  level: number
  levelTitle: string
  actTitle: string
  next: { number: number; title: string } | null
  /** Levels 3–4: the challenge as it can be played today (a game tier, Code Lab mission, Physics Lab arena or Galaxy activity). */
  reuse?: SessionReuse
  /** Where `reuse.play` lives (resolved on the server: Galaxy activities need their track). */
  play?: { title: string; detail: string; href: string | null } | null
}

export default function SessionRunnerClient({ session, level, levelTitle, actTitle, next, reuse, play }: SessionRunnerProps) {
  const id = session.id
  const [hydrated, setHydrated] = useState(false)
  const [st, setSt] = useState<SessionState>({ step: 0, reached: 0, updated: '' })
  const [resumedAt, setResumedAt] = useState<number | null>(null)
  const [design, setDesign] = useState<RobotDesign>(DEFAULT_DESIGN)
  const [watched, setWatched] = useState(false)
  const [result, setResult] = useState<RewardResult | null>(null)
  const [replay, setReplay] = useState(false)
  const [hint, setHint] = useState(0)
  const topRef = useRef<HTMLDivElement>(null)
  const reportedRef = useRef(false)

  const arena = useMemo(() => getLevel1Arena(id), [id])

  // Resume.
  useEffect(() => {
    const s = readSessionState(id)
    setSt(s)
    if (s.step > 0 && !s.done) setResumedAt(s.step)
    setWatched(s.reached > 0)
    setReplay(!!getProgress().sessionsDone[id])
    setDesign(loadDesign())
    setHydrated(true)
    const onRobot = () => setDesign(loadDesign())
    window.addEventListener(ROBOT_CHANGED_EVENT, onRobot)
    return () => {
      window.removeEventListener(ROBOT_CHANGED_EVENT, onRobot)
      cancelSparkSpeech()
    }
  }, [id])

  const patch = useCallback(
    (p: Partial<SessionState>) => {
      setSt(writeSessionState(id, p))
    },
    [id],
  )

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

  // The badge: report the session (and the project) once. A replay with more
  // stars reports only the XP difference, and never the project again — so
  // replaying (or self-claiming a craft star) cannot farm XP.
  useEffect(() => {
    if (!hydrated || st.step !== 5 || reportedRef.current) return
    const stars = Math.max(1, st.challengeStars ?? 1)
    const prevStars = Math.max(st.done ? (st.reportedStars ?? 0) : 0, getProgress().sessionsDone[id] ?? 0)
    reportedRef.current = true
    if (prevStars >= stars) {
      if (!st.done) patch({ done: true, reportedStars: prevStars })
      return
    }
    let total: RewardResult
    if (prevStars > 0) {
      // Session base XP 50 (rewards.ts DEFAULT_XP), scaled 0.6 + 0.2 × stars there.
      const mult = (s: number) => 0.6 + 0.2 * s
      const diff = Math.round(SESSION_XP * mult(stars)) - Math.round(SESSION_XP * mult(prevStars))
      total = reportActivity({ kind: 'session', id, stars, xp: diff / mult(stars), badges: [session.badge.id], attempts: st.challengeAttempts })
    } else {
      const r = reportActivity({ kind: 'session', id, stars, badges: [session.badge.id], attempts: st.challengeAttempts })
      total = r
      if (session.project) {
        const p = reportActivity({ kind: 'project', id: session.project.id, stars })
        total = { ...p, xpGained: r.xpGained + p.xpGained, levelBefore: r.levelBefore }
      }
    }
    setResult(total)
    patch({ done: true, reportedStars: stars })
  }, [hydrated, st.step, st.done, st.reportedStars, st.challengeStars, st.challengeAttempts, id, session, patch])

  // Leaving the badge step re-arms the report (a better challenge result can be reported later).
  useEffect(() => {
    if (st.step !== 5) reportedRef.current = false
  }, [st.step])

  const onApply = (d: RobotDesign) => {
    saveDesign(d)
    setDesign(d)
    // score 1 = 'done once': the progress store (and so a restored backup) remembers it.
    if (!st.built) reportBestRun({ kind: 'build', id: `${id}-build`, score: 1 })
    patch({ built: true })
  }

  const onChallenge = useCallback(
    (o: SimChallengeOutcome) => {
      // localStorage is the source of truth (no side effects inside a state updater).
      const prev = readSessionState(id)
      const best = Math.max(prev.challengeStars ?? 0, o.success ? o.stars : 0)
      const first = o.success && !prev.challengeReported
      // The weekly quest "Solve 3 robot challenges" counts the course's challenge, once per session.
      if (first) reportBestRun({ kind: 'challenge', id: `${id}-challenge`, stars: o.stars, attempts: o.attempts, score: 1 })
      setSt(writeSessionState(id, { challengeStars: best, challengeAttempts: o.attempts, ...(first ? { challengeReported: true } : {}) }))
    },
    [id],
  )

  /** The reused challenge (Levels 3–4) was finished: one star, reported once like an arena win. */
  const onReuseDone = useCallback(() => {
    const prev = readSessionState(id)
    if ((prev.challengeStars ?? 0) > 0) return
    if (!prev.challengeReported) reportBestRun({ kind: 'challenge', id: `${id}-challenge`, stars: 1, attempts: 1, score: 1 })
    setSt(writeSessionState(id, { challengeStars: 1, challengeAttempts: prev.challengeAttempts ?? 1, challengeReported: true }))
  }, [id])

  // A game tier, Code Lab mission or Galaxy activity done elsewhere counts as soon as the child is back.
  useEffect(() => {
    if (!reuse || !hydrated || arena) return
    const check = () => {
      if (reusePlayDone(reuse.play, getProgress(), getActivitiesDone())) onReuseDone()
    }
    check()
    const onVis = () => {
      if (document.visibilityState === 'visible') check()
    }
    window.addEventListener(KIDS_PROGRESS_EVENT, check)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener(KIDS_PROGRESS_EVENT, check)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [reuse, hydrated, arena, onReuseDone])

  const onProgramChange = useCallback((nodes: PicNode[]) => patch({ program: nodes }), [patch])

  const challengeDesign = useMemo(() => (arena ? sessionDesign(arena, design) : design), [arena, design])
  const step = st.step
  const beat = BEATS[step]
  const solved = (st.challengeStars ?? 0) > 0
  const project = session.project

  return (
    <div className="course-runner mx-auto max-w-6xl px-4 pb-10 pt-3 sm:pt-5" data-testid="session-runner" data-step={beat.id} data-hydrated={hydrated ? 'yes' : 'no'}>
      {/* Header */}
      <div ref={topRef} className="flex scroll-mt-2 items-center gap-2">
        <Link
          href={`/kids/course/${level}`}
          className="-ml-2 flex min-h-[44px] min-w-0 items-center gap-1 rounded-2xl px-2 text-sm font-bold text-amber-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
        >
          <span aria-hidden>←</span>
          <span className="truncate">{levelTitle}</span>
        </Link>
        <span className="ml-auto" />
        <GrownUpsDrawerClient title={`Session ${session.number}: ${session.title}`} objectives={session.objectives} teacher={session.teacher} parent={session.parent} project={project} />
      </div>
      <div className="mt-1">
        <p className="font-display text-xs font-bold uppercase tracking-wider text-[#A7B0C0]">
          Session {session.number} of 24 · {actTitle}
          {project && !/^make it yours/i.test(session.title) && <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-amber-500 px-2 py-0.5 text-[11px] text-[#1A1103]">Make it yours</span>}
        </p>
        <h1 className="font-display text-2xl font-bold leading-tight text-[#EEF2F8] sm:text-3xl">{session.title}</h1>
      </div>

      {/* Stepper */}
      <nav aria-label="Session steps" className="mt-3">
        <ol className="grid grid-cols-6 gap-1 sm:gap-2">
          {BEATS.map((b, i) => {
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
          <span className="mr-auto">👋 Welcome back! You were at {BEATS[resumedAt].label}.</span>
          <button type="button" onClick={() => goTo(0)} className="min-h-[44px] rounded-xl px-3 text-sm font-bold underline-offset-4 hover:underline">
            Watch the episode again
          </button>
          <button type="button" onClick={() => setResumedAt(null)} aria-label="Dismiss" className="h-11 w-11 rounded-xl text-lg hover:bg-white/10">
            ×
          </button>
        </div>
      )}

      {/* The beat */}
      <div className="mt-4 min-h-[60vh]">
        {!hydrated ? (
          <div className="mx-auto aspect-[4/5] w-full max-w-4xl rounded-[28px] border border-white/10 bg-white/[0.03] sm:aspect-video" aria-busy="true" />
        ) : step === 0 ? (
          <EpisodeStepClient
            sessionId={id}
            sessionNumber={session.number}
            episode={session.episode}
            watched={watched}
            onWatched={() => setWatched(true)}
            onNext={() => goTo(1)}
            storybookOnly={level >= 2}
          />
        ) : step === 1 ? (
          <BuildStepClient build={session.build} sessionNumber={session.number} design={design} built={!!st.built} onApply={onApply} onNext={() => goTo(2)} />
        ) : step === 2 ? (
          <CodeStepClient code={session.code} challenge={session.challenge} newBlocks={session.newBlocks} onNext={() => goTo(3)} />
        ) : step === 3 ? (
          <div className="flex flex-col gap-3">
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
            {arena ? (
              <SimChallenge arena={arena} design={challengeDesign} onResult={onChallenge} initialNodes={st.program} onProgramChange={onProgramChange} />
            ) : reuse ? (
              <div className="rounded-[24px] border border-cyan-400/30 bg-[#111C32] p-5" data-testid="reuse-play">
                <p className="font-display text-xs font-bold uppercase tracking-wider text-cyan-300">Today&rsquo;s challenge</p>
                <h2 className="mt-1 font-display text-xl font-bold text-[#EEF2F8] sm:text-2xl">
                  {play?.title ?? session.challenge.title}
                  {reuse.play.kind === 'game' && !play && <span className="ml-2 text-base text-amber-300">({TIER_LABEL[reuse.play.tier]} tier)</span>}
                </h2>
                <p className="mt-2 text-[16px] leading-relaxed text-[#EEF2F8]">{reuse.play.goal}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-[#A7B0C0]">{session.challenge.mission}</p>
                {reuse.play.kind === 'game' && (
                  <p className="mt-2 text-[15px] text-[#A7B0C0]">
                    The game opens on the <span className="font-bold text-amber-300">{TIER_LABEL[reuse.play.tier]}</span> tier. Win a round there (or on a harder tier), then come back here.
                  </p>
                )}
                {reuse.play.kind === 'sim-demo' && (
                  <p className="mt-2 text-[15px] text-[#A7B0C0]">The lab opens on this arena. Solve it there, then come back here: the lab remembers it.</p>
                )}
                <div className="mt-4 flex flex-wrap gap-3">
                  {play?.href && (
                    <Link
                      href={play.href}
                      className="flex min-h-[52px] items-center rounded-2xl bg-amber-500 px-6 font-display text-lg font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                    >
                      Play it →
                    </Link>
                  )}
                  {/* A lab arena counts itself (the lab records the solve); only a Galaxy activity is self-reported. */}
                  {!solved && reuse.play.kind === 'activity' && (
                    <button
                      type="button"
                      onClick={onReuseDone}
                      data-testid="reuse-done"
                      className="min-h-[52px] rounded-2xl border border-emerald-400/50 px-5 font-bold text-emerald-200 hover:bg-emerald-400/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                    >
                      ✓ I finished it
                    </button>
                  )}
                  {solved && <p className="flex min-h-[52px] items-center font-bold text-emerald-300" role="status">✓ Done! Carry on to the check.</p>}
                </div>
              </div>
            ) : (
              <p className="rounded-2xl bg-amber-400/10 p-4 text-amber-100">This challenge is still being built. You can carry on to the questions.</p>
            )}
            <div className="flex flex-col gap-2 rounded-[20px] border border-white/10 bg-[#111C32] p-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                {hint > 0 ? (
                  <p className="flex items-start gap-2 text-[15px] font-semibold text-amber-100">
                    <span aria-hidden>💡</span>
                    {session.challenge.hints[hint - 1]}
                  </p>
                ) : (
                  <p className="text-[15px] text-[#A7B0C0]">Need a nudge? Spark has three hints.</p>
                )}
              </div>
              {hint < 3 && (
                <button
                  type="button"
                  onClick={() => {
                    sparkSays(session.challenge.hints[hint])
                    setHint(hint + 1)
                  }}
                  className="min-h-[48px] shrink-0 rounded-2xl border border-amber-400/50 px-4 text-sm font-black text-amber-300 hover:bg-amber-400/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                >
                  {hint === 0 ? 'Hint' : 'Another hint'} ({hint + 1} of 3)
                </button>
              )}
              <button
                type="button"
                onClick={() => goTo(4)}
                disabled={!solved}
                data-testid="beat-next"
                className="min-h-[52px] shrink-0 rounded-2xl bg-amber-500 px-6 font-display text-lg font-bold text-[#1A1103] shadow-[0_8px_24px_rgba(252,104,24,.35)] hover:bg-amber-400 active:scale-[.97] disabled:bg-white/[0.08] disabled:text-[#6E7888] disabled:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
              >
                {solved ? 'Next: Check →' : 'Solve it to go on'}
              </button>
            </div>
          </div>
        ) : step === 4 ? (
          <CheckStepClient quiz={session.quiz} sessionKey={session.id} checked={!!st.checked} onChecked={() => patch({ checked: true })} onNext={() => goTo(5)} />
        ) : (
          <BadgeStepClient
            badge={session.badge}
            stars={Math.max(1, st.challengeStars ?? 1)}
            rewardNote={session.reward.note}
            project={project}
            result={result}
            replay={replay}
            levelHref={`/kids/course/${level}`}
            next={next ? { href: `/kids/course/${level}/${next.number}`, title: next.title, number: next.number } : null}
            onReplayChallenge={() => goTo(3)}
          />
        )}
      </div>
    </div>
  )
}
