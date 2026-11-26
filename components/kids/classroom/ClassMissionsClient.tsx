'use client'

// components/kids/classroom/ClassMissionsClient.tsx
//
// "From your teacher" missions on the child's Universe home. Renders NOTHING
// unless this browser has joined a class AND the teacher has assigned
// something, so it is safe to mount for every child.
//
// The list comes from /api/kids/missions with the member token (no account,
// no Supabase in the browser); it is cached locally so it shows instantly and
// offline. "Done" is decided from the child's OWN local progress — the same
// data the class sync sends — so a tick appears the moment they finish.
// Before migration 0055 runs the route answers 503 and the card stays hidden.
//
//   <ClassMissionsClient />            full card
//   <ClassMissionsClient compact />    one line + the next mission (for tight spots)

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { KIDS_PROGRESS_EVENT, getProgress } from '@/lib/kids-progress'
import { getActivitiesDone } from '@/lib/kids/activities/progress'
import {
  KIDS_CLASS_EVENT,
  KIDS_MISSIONS_EVENT,
  fetchMissions,
  loadMembership,
  loadMissions,
  syncMembership,
} from '@/lib/kids/classroom-membership'
import { dueState, formatDue, type ChildMission } from '@/lib/kids/classroom-assignments'

const REFRESH_MS = 5 * 60 * 1000

const KIND: Record<ChildMission['kind'], { label: string; icon: string; tint: string }> = {
  session: { label: 'Course', icon: '📘', tint: 'from-amber-400/25 to-orange-600/10' },
  activity: { label: 'Skill Galaxy', icon: '🌌', tint: 'from-cyan-400/25 to-sky-600/10' },
  game: { label: 'Game', icon: '🎮', tint: 'from-emerald-400/25 to-teal-600/10' },
}

function isDoneLocally(m: ChildMission): boolean {
  if (m.kind === 'session') return (getProgress().sessionsDone?.[m.itemId] ?? 0) > 0
  if (m.kind === 'activity') return !!getActivitiesDone()[m.itemId]
  const prefix = `${m.itemId}:`
  return Object.keys(getProgress().personalBests ?? {}).some((k) => k.startsWith(prefix))
}

interface Row extends ChildMission {
  done: boolean
}

export interface ClassMissionsProps {
  compact?: boolean
  className?: string
}

export function ClassMissionsClient({ compact = false, className = '' }: ClassMissionsProps) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [teacher, setTeacher] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)

  const recompute = useCallback(() => {
    const m = loadMembership()
    if (!m) {
      setRows(null)
      return
    }
    setTeacher(m.teacherName)
    const cached = loadMissions()
    setRows(cached ? cached.missions.map((x) => ({ ...x, done: isDoneLocally(x) })) : null)
  }, [])

  useEffect(() => {
    recompute()
    let alive = true
    const refresh = async () => {
      if (!loadMembership()) return
      const before = new Set(loadMissions()?.missions.filter((x) => x.kind === 'activity').map((x) => x.itemId) ?? [])
      const r = await fetchMissions()
      if (!alive) return
      recompute()
      // New activity assigned: re-sync so the class sees it at the front of the list.
      if (r.kind === 'ok' && r.missions.some((x) => x.kind === 'activity' && !before.has(x.itemId))) {
        void syncMembership(true)
      }
    }
    void refresh()
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, REFRESH_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    window.addEventListener(KIDS_PROGRESS_EVENT, recompute)
    window.addEventListener(KIDS_MISSIONS_EVENT, recompute)
    window.addEventListener(KIDS_CLASS_EVENT, recompute)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      clearInterval(t)
      window.removeEventListener(KIDS_PROGRESS_EVENT, recompute)
      window.removeEventListener(KIDS_MISSIONS_EVENT, recompute)
      window.removeEventListener(KIDS_CLASS_EVENT, recompute)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [recompute])

  const { todo, done } = useMemo(() => {
    const list = rows ?? []
    const order = (a: Row, b: Row) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')
    return { todo: list.filter((r) => !r.done).sort(order), done: list.filter((r) => r.done) }
  }, [rows])

  if (!rows || rows.length === 0) return null

  const who = teacher ? `${teacher}` : 'your teacher'
  const allDone = todo.length === 0

  if (compact) {
    const next = todo[0]
    return (
      <Link
        href={next ? next.href : '/kids'}
        className={`flex min-h-[56px] items-center gap-3 rounded-[20px] border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-white hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${className}`}
      >
        <span aria-hidden className="text-2xl">🍎</span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold uppercase tracking-wider text-amber-300">From {who}</span>
          <span className="block truncate font-display font-bold">{next ? next.title : 'All missions done!'}</span>
        </span>
        <span className="rounded-full bg-amber-500 px-2.5 py-0.5 font-display text-sm font-bold text-[#1A1103]">{done.length}/{rows.length}</span>
      </Link>
    )
  }

  return (
    <section
      aria-labelledby="class-missions-h"
      className={`rounded-[28px] border border-amber-400/30 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-6 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500 text-2xl">🍎</span>
          <div>
            <h2 id="class-missions-h" className="font-display text-xl font-bold text-white sm:text-2xl">From your teacher</h2>
            <p className="text-sm text-slate-300">Missions from {who}</p>
          </div>
        </div>
        <p className="font-display text-lg font-bold text-amber-300" aria-label={`${done.length} of ${rows.length} done`}>
          {done.length}<span className="text-slate-400">/{rows.length}</span> <span aria-hidden>✓</span>
        </p>
      </div>

      {allDone ? (
        <p className="mt-4 rounded-2xl bg-emerald-500/15 p-4 text-center font-display text-lg font-bold text-emerald-200" role="status">
          You did every mission! <span aria-hidden>🎉</span>
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {todo.map((m) => {
            const k = KIND[m.kind]
            const due = dueState(m.dueDate)
            return (
              <li key={`${m.kind}:${m.itemId}`}>
                <Link
                  href={m.href}
                  className={`group flex h-full min-h-[88px] items-center gap-3 rounded-[20px] border border-white/10 bg-gradient-to-br ${k.tint} p-3 transition hover:-translate-y-0.5 hover:border-amber-400/60 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-reduce:transform-none`}
                >
                  <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-black/30 text-2xl">{k.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-300">{k.label}</span>
                    <span className="block font-display text-lg font-bold leading-snug text-white">{m.title}</span>
                    {m.note && <span className="mt-0.5 block text-sm text-slate-300">“{m.note}”</span>}
                    {m.dueDate && (
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${due === 'overdue' ? 'bg-rose-500/20 text-rose-200' : due === 'today' || due === 'soon' ? 'bg-amber-500/20 text-amber-200' : 'bg-white/10 text-slate-200'}`}>
                        {due === 'today' ? 'Due today' : due === 'overdue' ? `Was due ${formatDue(m.dueDate)}` : `Due ${formatDue(m.dueDate)}`}
                      </span>
                    )}
                  </span>
                  <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-500 font-bold text-[#1A1103] transition group-hover:scale-110 motion-reduce:transform-none">▶</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {done.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            aria-expanded={showDone}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-2 text-sm font-semibold text-emerald-300 hover:bg-white/5"
          >
            <span aria-hidden>✓</span> {done.length} done {showDone ? '— hide' : '— show'}
          </button>
          {showDone && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {done.map((m) => (
                <li key={`${m.kind}:${m.itemId}`}>
                  <Link href={m.href} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 text-sm font-semibold text-emerald-100">
                    <span aria-hidden>{KIND[m.kind].icon}</span> {m.title} <span aria-hidden>✓</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

export default ClassMissionsClient
