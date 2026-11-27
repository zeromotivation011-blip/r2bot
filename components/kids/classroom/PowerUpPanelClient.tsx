'use client'

// components/kids/classroom/PowerUpPanelClient.tsx
//
// Teacher: the Class Power-Up (roadmap #40). Set one shared goal ("Relight
// Lantern Hill: 300 things this month"); every child's work fills one meter on
// the projector and on their home screens; "who helped this week" is a tick
// per child, never a number; milestones unlock the class cosmetic and, at
// 100%, a class certificate.
//
// Before migration 0056 the goal is kept on this device (classroom-api
// loadLocalGoal) so the projector still works; children's cards appear once
// it runs.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { KidsClassSummary, KidsMemberRow } from '@/lib/kids/classroom'
import {
  GOAL_MAX_DAYS,
  GOAL_MAX_TARGET,
  GOAL_MIN_TARGET,
  GOAL_PRESETS,
  GOAL_THEMES,
  GOAL_THEME_IDS,
  addDays,
  goalProgress,
  helpedThisWeek,
  localDay,
  parseGoal,
  suggestedTarget,
  type ClassGoal,
  type GoalThemeId,
} from '@/lib/kids/classroom-goal'
import { loadLocalGoal, saveLocalGoal, teacherFetch } from '@/lib/kids/classroom-api'
import { PowerUpMeter } from './PowerUpMeter'

export interface PowerUpPanelProps {
  classId: string
  cls: KidsClassSummary
  members: KidsMemberRow[]
  /** Tell the page the goal changed (server or device copy). */
  onGoal?: (goal: ClassGoal | null) => void
}

/** The goal in force: the server's once 0056 has run, else this device's copy. */
export function effectiveGoal(classId: string, cls: KidsClassSummary): { goal: ClassGoal | null; onDevice: boolean } {
  if (cls.goalReady) return { goal: cls.goal ?? null, onDevice: false }
  return { goal: loadLocalGoal(classId), onDevice: true }
}

const btn = 'inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

export function PowerUpPanelClient({ classId, cls, members, onGoal }: PowerUpPanelProps) {
  const [goal, setGoal] = useState<ClassGoal | null>(null)
  const [onDevice, setOnDevice] = useState(false)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [today, setToday] = useState('')

  useEffect(() => {
    const e = effectiveGoal(classId, cls)
    setGoal(e.goal)
    setOnDevice(e.onDevice)
    setToday(localDay())
  }, [classId, cls])

  const diaries = useMemo(() => members.map((m) => m.snapshot.days), [members])
  const progress = useMemo(() => (goal && today ? goalProgress(goal, diaries, today) : null), [goal, diaries, today])
  const helpers = useMemo(
    () => (today ? members.filter((m) => helpedThisWeek(m.snapshot.days, today)).map((m) => m.nickname) : []),
    [members, today],
  )

  async function save(next: ClassGoal | null) {
    setBusy(true)
    setMsg(null)
    const r = await teacherFetch<{ goal: ClassGoal | null }>(`/api/kids/classroom/classes/${encodeURIComponent(classId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'goal', goal: next }),
    })
    setBusy(false)
    if (r.kind === 'ok') {
      setGoal(next)
      setOnDevice(false)
      setEditing(false)
      onGoal?.(next)
      setMsg(next ? 'Goal saved. It is on every child’s home screen now.' : 'Goal ended.')
    } else if (r.kind === 'not-ready') {
      saveLocalGoal(classId, next)
      setGoal(next)
      setOnDevice(true)
      setEditing(false)
      onGoal?.(next)
      setMsg(next ? 'Saved on this device. The projector shows it now; children’s home screens will show it once class goals are switched on.' : 'Goal ended.')
    } else {
      setMsg(r.kind === 'error' ? r.message : 'Could not save the goal. Try again.')
    }
  }

  async function certificate() {
    if (!goal || !progress) return
    const { downloadClassCertificate } = await import('@/lib/kids/classroom-pdf')
    await downloadClassCertificate({
      className: cls.className,
      teacherName: cls.teacherName,
      schoolName: cls.schoolName,
      goal,
      done: progress.done,
      helpers: progress.helpers,
      date: new Date(),
    })
  }

  return (
    <section aria-labelledby="powerup-h" className="rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Class Power-Up</p>
          <h2 id="powerup-h" className="font-display text-2xl font-bold text-white">{goal ? goal.title : 'One goal for the whole class'}</h2>
          <p className="mt-1 max-w-2xl text-[15px] text-slate-300">
            {goal
              ? `${GOAL_THEMES[goal.theme].icon} ${progress?.status === 'complete' ? 'Complete!' : progress?.status === 'ended' ? 'This goal has ended.' : progress?.status === 'upcoming' ? `Starts ${goal.start}.` : `${progress?.daysLeft ?? 0} days left.`} Every finished lesson, activity, game round and mission fills the same meter, once per child per day. No scores, no ranking.`
              : 'Set a shared target. Every child’s work fills one meter on the projector and on their home screens, and milestones unlock a class banner, a class flag and a class certificate.'}
          </p>
        </div>
        {goal && !editing && (
          <div className="flex flex-wrap gap-2">
            <Link href={`/kids/classroom/${classId}/projector`} className={`${btn} bg-amber-500 text-[#1A1103] hover:bg-amber-400`}>📽️ Projector view</Link>
            <button type="button" onClick={() => setEditing(true)} className={`${btn} border border-white/15 text-slate-100 hover:bg-white/5`}>Edit</button>
            <button type="button" disabled={busy} onClick={() => void save(null)} className={`${btn} border border-white/15 text-slate-300 hover:bg-white/5`}>End goal</button>
          </div>
        )}
      </div>

      {onDevice && goal && (
        <p className="mt-3 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3 text-sm text-cyan-100">
          Saved on this device for now: the projector shows it, and children’s home screens will show it once class goals are switched on.
        </p>
      )}
      {msg && <p role="status" className="mt-3 rounded-2xl bg-white/5 p-3 text-sm text-slate-200">{msg}</p>}

      {goal && progress && !editing && (
        <div className="mt-5 space-y-5">
          <PowerUpMeter goal={goal} done={progress.done} labelId="powerup-h" />
          <div>
            <h3 className="text-sm font-bold text-white">Who helped this week <span className="font-normal text-slate-400">(ticks, never counts)</span></h3>
            {helpers.length === 0 ? (
              <p className="mt-1 text-sm text-slate-400">No one yet this week. One finished activity puts a tick here.</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {helpers.map((n) => (
                  <li key={n} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 text-sm font-semibold text-emerald-100">
                    <span aria-hidden>✓</span> {n}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {progress.status === 'complete' && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4">
              <span aria-hidden className="text-3xl">🏆</span>
              <p className="flex-1 text-sm text-amber-100">The class did it. Print the class certificate for the wall: it names the class, never a child.</p>
              <button type="button" onClick={() => void certificate()} className={`${btn} bg-amber-500 text-[#1A1103] hover:bg-amber-400`}>Download class certificate</button>
            </div>
          )}
        </div>
      )}

      {(!goal || editing) && (
        <GoalForm
          initial={goal}
          classSize={members.length}
          busy={busy}
          onCancel={goal ? () => setEditing(false) : undefined}
          onSave={(g) => void save(g)}
        />
      )}
    </section>
  )
}

function GoalForm({ initial, classSize, busy, onSave, onCancel }: {
  initial: ClassGoal | null
  classSize: number
  busy: boolean
  onSave: (g: ClassGoal) => void
  onCancel?: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? GOAL_PRESETS[0].title)
  const [theme, setTheme] = useState<GoalThemeId>(initial?.theme ?? GOAL_PRESETS[0].theme)
  const [target, setTarget] = useState<number>(initial?.target ?? suggestedTarget(classSize, GOAL_PRESETS[0].perChild))
  const [start, setStart] = useState(initial?.start ?? '')
  const [end, setEnd] = useState(initial?.end ?? '')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!start) setStart(localDay())
    if (!end) setEnd(addDays(localDay(), GOAL_PRESETS[0].days - 1))
  }, [start, end])

  function pickPreset(i: number) {
    const p = GOAL_PRESETS[i]
    setTitle(p.title)
    setTheme(p.theme)
    setTarget(suggestedTarget(classSize, p.perChild))
    const s = start || localDay()
    setEnd(addDays(s, p.days - 1))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const g = parseGoal({ v: 1, title, target: Number(target), start, end, theme })
    if (!g) {
      setError(`Give the goal a name, a number from ${GOAL_MIN_TARGET} to ${GOAL_MAX_TARGET}, and an end date after the start (at most ${GOAL_MAX_DAYS} days).`)
      return
    }
    setError(null)
    onSave(g)
  }

  const field = 'mt-1 block min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0A1120] px-3 text-white focus:border-amber-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/40'
  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <fieldset>
        <legend className="text-sm font-bold text-white">Start from a story goal</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {GOAL_PRESETS.map((p, i) => (
            <button
              key={p.title}
              type="button"
              onClick={() => pickPreset(i)}
              aria-pressed={title === p.title}
              className={`flex min-h-[56px] items-center gap-2 rounded-2xl border px-3 text-left text-sm font-semibold ${title === p.title ? 'border-amber-400 bg-amber-500/15 text-white' : 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/30'} focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60`}
            >
              <span aria-hidden className="text-2xl">{GOAL_THEMES[p.theme].icon}</span> {p.title}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-semibold text-slate-200 lg:col-span-2">
          Goal name
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} required className={field} />
        </label>
        <label className="text-sm font-semibold text-slate-200">
          Target (things done together)
          <input type="number" inputMode="numeric" min={GOAL_MIN_TARGET} max={GOAL_MAX_TARGET} value={target} onChange={(e) => setTarget(Number(e.target.value))} className={field} />
        </label>
        <label className="text-sm font-semibold text-slate-200">
          Meter look
          <select value={theme} onChange={(e) => setTheme(e.target.value as GoalThemeId)} className={field}>
            {GOAL_THEME_IDS.map((id) => <option key={id} value={id}>{GOAL_THEMES[id].icon} {GOAL_THEMES[id].name}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-200">
          Starts
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={field} />
        </label>
        <label className="text-sm font-semibold text-slate-200">
          Ends
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={field} />
        </label>
      </div>
      <p className="text-sm text-slate-400">
        Suggested: about {Math.max(1, Math.round(target / Math.max(1, classSize)))} things per child. A child counts each lesson, activity, game or mission once a day, so replaying one game cannot fill the meter.
      </p>
      {error && <p role="alert" className="rounded-xl bg-rose-500/15 p-3 text-sm text-rose-100">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={`${btn} bg-amber-500 text-[#1A1103] hover:bg-amber-400 disabled:opacity-60`}>{busy ? 'Saving…' : initial ? 'Save goal' : 'Start the Power-Up'}</button>
        {onCancel && <button type="button" onClick={onCancel} className={`${btn} text-slate-300 hover:bg-white/5`}>Cancel</button>}
      </div>
    </form>
  )
}

export default PowerUpPanelClient
