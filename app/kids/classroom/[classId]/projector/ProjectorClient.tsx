'use client'

// app/kids/classroom/[classId]/projector/ProjectorClient.tsx
//
// Big-screen view for the classroom wall. Shows the class goal meter, the
// milestones and the class cosmetic, "who helped this week" as ticks beside
// nicknames (never a number per child), and — on a second tab — the Class
// Mind Map with names left out. Refreshes every 30 s while visible. A
// "Full screen" button hides the browser chrome.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AUTH_CHANGED_EVENT } from '@/lib/supabase/lazy'
import { JOIN_URL_DISPLAY, formatJoinCode, type KidsClassSummary, type KidsMemberRow } from '@/lib/kids/classroom'
import { fetchInsightCatalogue, teacherFetch } from '@/lib/kids/classroom-api'
import { GOAL_THEMES, goalProgress, helpedThisWeek, localDay, type ClassGoal } from '@/lib/kids/classroom-goal'
import type { InsightCatalogue } from '@/lib/kids/classroom-insights'
import { ClassroomError, ClassroomNotReady, ClassroomSkeleton, TeacherSignIn } from '@/components/kids/classroom/TeacherGateClient'
import { PowerUpMeter } from '@/components/kids/classroom/PowerUpMeter'
import { ClassMindMapClient } from '@/components/kids/classroom/ClassMindMapClient'
import { effectiveGoal } from '@/components/kids/classroom/PowerUpPanelClient'

type State =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'not-ready' }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; cls: KidsClassSummary; members: KidsMemberRow[] }

const btn = 'inline-flex min-h-[48px] items-center justify-center rounded-xl px-5 font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

export default function ProjectorClient({ classId }: { classId: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [tab, setTab] = useState<'goal' | 'mind'>('goal')
  const [catalogue, setCatalogue] = useState<InsightCatalogue | null>(null)
  const [goal, setGoal] = useState<ClassGoal | null>(null)
  const [today, setToday] = useState('')
  const wrap = useRef<HTMLDivElement>(null)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setState({ kind: 'loading' })
    const r = await teacherFetch<{ class: KidsClassSummary; members: KidsMemberRow[] }>(`/api/kids/classroom/classes/${encodeURIComponent(classId)}`)
    if (r.kind === 'ok') {
      setState({ kind: 'ready', cls: r.data.class, members: r.data.members })
      setGoal(effectiveGoal(classId, r.data.class).goal)
    } else if (r.kind === 'error') setState({ kind: 'error', message: r.message })
    else setState({ kind: r.kind })
    setToday(localDay())
  }, [classId])

  useEffect(() => {
    void load()
    const onAuth = () => void load()
    window.addEventListener(AUTH_CHANGED_EVENT, onAuth)
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void load(true)
    }, 30_000)
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuth)
      clearInterval(t)
    }
  }, [load])

  useEffect(() => {
    if (tab !== 'mind' || catalogue) return
    void fetchInsightCatalogue().then(setCatalogue)
  }, [tab, catalogue])

  const ready = state.kind === 'ready' ? state : null
  const progress = useMemo(() => (ready && goal && today ? goalProgress(goal, ready.members.map((m) => m.snapshot.days), today) : null), [ready, goal, today])
  const helpers = useMemo(() => (ready && today ? ready.members.filter((m) => helpedThisWeek(m.snapshot.days, today)).map((m) => m.nickname) : []), [ready, today])

  if (state.kind === 'loading') return <ClassroomSkeleton />
  if (state.kind === 'signed-out') return <TeacherSignIn next={`/kids/classroom/${classId}/projector`} />
  if (state.kind === 'not-ready') return <ClassroomNotReady />
  if (state.kind === 'error') return <ClassroomError message={state.message} onRetry={() => void load()} />
  if (state.kind === 'not-found') {
    return (
      <div className="mx-auto max-w-xl rounded-[28px] border border-white/10 bg-[#111C32] p-8 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Class not found</h1>
        <Link href="/kids/classroom" className={`${btn} mt-5 bg-amber-500 text-[#1A1103]`}>Your classes</Link>
      </div>
    )
  }

  const { cls, members } = state
  const theme = goal ? GOAL_THEMES[goal.theme] : null

  function fullScreen() {
    const el = wrap.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
    else void el.requestFullscreen?.().catch(() => undefined)
  }

  return (
    <div ref={wrap} className="min-h-[80vh] space-y-6 overflow-y-auto rounded-[28px] bg-[#0A1120] p-4 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href={`/kids/classroom/${classId}`} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-amber-300 hover:underline">← Back to the class</Link>
          <h1 className="font-display text-4xl font-bold text-white sm:text-6xl">{cls.className}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">Join at {JOIN_URL_DISPLAY}</p>
            <p className="font-mono text-2xl font-black tracking-[0.2em] text-amber-300">{formatJoinCode(cls.joinCode)}</p>
          </div>
          <button type="button" onClick={fullScreen} className={`${btn} border border-white/15 text-white hover:bg-white/5`}>⛶ Full screen</button>
        </div>
      </header>

      <div role="tablist" aria-label="Projector view" className="flex gap-2">
        {([['goal', '⚡ Class Power-Up'], ['mind', '🧠 Class Mind Map']] as const).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`${btn} ${tab === id ? 'bg-amber-500 text-[#1A1103]' : 'border border-white/15 text-slate-100 hover:bg-white/5'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'goal' && (
        <section role="tabpanel" aria-labelledby="proj-goal-h" className="space-y-8">
          {!goal || !progress || !theme ? (
            <div className="rounded-[28px] border border-dashed border-white/15 p-10 text-center">
              <h2 id="proj-goal-h" className="font-display text-3xl font-bold text-white">No class goal yet</h2>
              <p className="mt-2 text-lg text-slate-300">Set one on the class page: one target the whole class fills together.</p>
              <Link href={`/kids/classroom/${classId}#powerup-h`} className={`${btn} mt-5 bg-amber-500 text-[#1A1103]`}>Set a goal</Link>
            </div>
          ) : (
            <>
              <div className="text-center">
                <p className="text-lg font-bold uppercase tracking-widest text-amber-300"><span aria-hidden>{theme.icon}</span> Class Power-Up</p>
                <h2 id="proj-goal-h" className="mt-1 font-display text-4xl font-bold text-white sm:text-6xl">{goal.title}</h2>
                <p className="mt-2 text-xl text-slate-300">
                  {progress.status === 'complete'
                    ? 'We did it, together! 🎉'
                    : progress.status === 'ended'
                      ? 'This goal has ended. What a team effort.'
                      : progress.status === 'upcoming'
                        ? `Starts ${goal.start}`
                        : `${progress.daysLeft} day${progress.daysLeft === 1 ? '' : 's'} to go · every lesson, activity and game round counts`}
                </p>
              </div>
              <PowerUpMeter goal={goal} done={progress.done} size="projector" labelId="proj-goal-h" />
              {progress.status === 'complete' && (
                <p className="text-center font-display text-3xl font-bold text-amber-300"><span aria-hidden>🏁</span> The class flag is ours!</p>
              )}
              <div>
                <h3 className="font-display text-2xl font-bold text-white">Who helped this week</h3>
                {helpers.length === 0 ? (
                  <p className="mt-2 text-lg text-slate-400">The first finished activity this week puts a tick here.</p>
                ) : (
                  <ul className="mt-3 flex flex-wrap gap-3">
                    {helpers.map((n) => (
                      <li key={n} className="inline-flex min-h-[52px] items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-5 text-xl font-bold text-emerald-100">
                        <span aria-hidden>✓</span> {n}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'mind' && (
        <div role="tabpanel">
          <ClassMindMapClient members={members} catalogue={catalogue} projector />
        </div>
      )}
    </div>
  )
}
