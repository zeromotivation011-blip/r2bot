'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AUTH_CHANGED_EVENT } from '@/lib/supabase/lazy'
import { getBand } from '@/lib/kids/bands'
import { JOIN_URL_DISPLAY, formatJoinCode, type KidsClassSummary, type KidsMemberRow } from '@/lib/kids/classroom'
import { relativeTime, teacherFetch } from '@/lib/kids/classroom-api'
import { classTotals, hardestMissions, memberStats, rosterCsv, stuckLevels } from '@/lib/kids/classroom-stats'
import {
  ClassroomError,
  ClassroomNotReady,
  ClassroomSkeleton,
  TeacherSignIn,
} from '@/components/kids/classroom/TeacherGateClient'
import { ParentNote } from '@/components/kids/classroom/ParentNote'
import { RobotMiniCard } from '@/components/kids/classroom/RobotMiniCard'
import { LessonPlanPanel } from '@/components/kids/classroom/LessonPlanPanel'
import { AssignmentsPanelClient } from '@/components/kids/classroom/AssignmentsPanelClient'

type State =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'not-ready' }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; cls: KidsClassSummary; members: KidsMemberRow[] }

interface DetailResponse { class: KidsClassSummary; members: KidsMemberRow[] }

export default function ClassDetailClient({ classId }: { classId: string }) {
  const router = useRouter()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [isNew, setIsNew] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<null | 'code' | 'delete' | { member: string }>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setState({ kind: 'loading' })
    const r = await teacherFetch<DetailResponse>(`/api/kids/classroom/classes/${encodeURIComponent(classId)}`)
    if (r.kind === 'ok') setState({ kind: 'ready', cls: r.data.class, members: r.data.members })
    else if (r.kind === 'error') setState({ kind: 'error', message: r.message })
    else setState({ kind: r.kind })
  }, [classId])

  useEffect(() => {
    setIsNew(new URLSearchParams(window.location.search).get('new') === '1')
    void load()
    const onAuth = () => void load()
    window.addEventListener(AUTH_CHANGED_EVENT, onAuth)
    // Light polling while the page is open, so a lesson's stars appear live.
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void load(true)
    }, 60_000)
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuth)
      clearInterval(t)
    }
  }, [load])

  const ready = state.kind === 'ready' ? state : null
  const totals = useMemo(() => (ready ? classTotals(ready.members) : null), [ready])
  const stuck = useMemo(() => (ready ? stuckLevels(ready.members) : []), [ready])
  const hard = useMemo(() => (ready ? hardestMissions(ready.members) : []), [ready])
  const idle = useMemo(() => {
    if (!ready) return []
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000
    return ready.members.filter((m) => Date.parse(m.lastActiveAt) < weekAgo).map((m) => m.nickname)
  }, [ready])

  if (state.kind === 'loading') return <ClassroomSkeleton />
  if (state.kind === 'signed-out') return <TeacherSignIn next={`/kids/classroom/${classId}`} />
  if (state.kind === 'not-ready') return <ClassroomNotReady />
  if (state.kind === 'error') return <ClassroomError message={state.message} onRetry={() => void load()} />
  if (state.kind === 'not-found') {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-slate-950/80 p-8 text-center">
        <h1 className="text-2xl font-extrabold text-white">Class not found</h1>
        <p className="mt-2 text-slate-300">It may have been deleted, or it belongs to another account.</p>
        <Link href="/kids/classroom" className="mt-5 inline-flex min-h-[44px] items-center rounded-xl bg-amber-500 px-5 font-bold text-black">Your classes</Link>
      </div>
    )
  }

  const { cls, members } = state
  const band = getBand(cls.band)

  async function regenerate() {
    setBusy(true)
    const r = await teacherFetch<{ class: KidsClassSummary }>(`/api/kids/classroom/classes/${classId}`, {
      method: 'PATCH', body: JSON.stringify({ action: 'regenerate-code' }),
    })
    setBusy(false)
    setConfirm(null)
    if (r.kind === 'ok') {
      setState({ kind: 'ready', cls: { ...cls, joinCode: r.data.class.joinCode }, members })
      setFlash('New code made. The old one no longer works; children already in the class stay in.')
    } else setFlash(r.kind === 'error' ? r.message : 'Could not make a new code.')
  }

  async function deleteClass() {
    setBusy(true)
    const r = await teacherFetch<{ ok: boolean }>(`/api/kids/classroom/classes/${classId}`, { method: 'DELETE' })
    setBusy(false)
    if (r.kind === 'ok') router.push('/kids/classroom')
    else {
      setConfirm(null)
      setFlash(r.kind === 'error' ? r.message : 'Could not delete the class.')
    }
  }

  async function removeMember(id: string) {
    setBusy(true)
    const r = await teacherFetch<{ ok: boolean }>(`/api/kids/classroom/classes/${classId}/members/${id}`, { method: 'DELETE' })
    setBusy(false)
    setConfirm(null)
    if (r.kind === 'ok') {
      setState({ kind: 'ready', cls: { ...cls, memberCount: members.length - 1 }, members: members.filter((m) => m.id !== id) })
    } else setFlash(r.kind === 'error' ? r.message : 'Could not remove the student.')
  }

  function downloadCsv() {
    const blob = new Blob([rosterCsv(members)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `r2bot-kids-${cls.className.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase() || 'class'}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const btn = 'inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-bold'

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <Link href="/kids/classroom" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-amber-300 hover:underline">← Your classes</Link>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              {band ? `${band.emoji} ${band.name} · ${band.grades}` : cls.band}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold text-white sm:text-4xl">{cls.className}</h1>
            <p className="text-slate-300">
              {[cls.teacherName, cls.schoolName].filter(Boolean).join(' · ') || 'Add your name so children see whose class they joined.'}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-5 py-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">Join code</p>
            <p className="font-mono text-4xl font-black tracking-[0.2em] text-amber-300">{formatJoinCode(cls.joinCode)}</p>
            <p className="text-xs text-amber-100/80">{JOIN_URL_DISPLAY}</p>
          </div>
        </div>

        {isNew && (
          <p className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-100" role="status">
            Class created. Print the join card for the wall, or write the code on the board — children go to <strong>{JOIN_URL_DISPLAY}</strong>.
          </p>
        )}
        {flash && <p className="rounded-2xl bg-white/5 p-3 text-sm text-slate-200" role="status">{flash}</p>}

        <div className="flex flex-wrap gap-2">
          <Link href={`/kids/classroom/${classId}/card`} className={`${btn} bg-amber-500 text-black hover:bg-amber-400`}>🖨️ Print join card</Link>
          <button type="button" onClick={downloadCsv} disabled={!members.length} className={`${btn} border border-white/15 text-slate-100 hover:bg-white/5 disabled:opacity-50`}>⬇️ Download CSV</button>
          <Link href="/kids/teach" className={`${btn} border border-white/15 text-slate-100 hover:bg-white/5`}>📘 Lesson guides</Link>
          <button type="button" onClick={() => void load()} className={`${btn} border border-white/15 text-slate-100 hover:bg-white/5`}>↻ Refresh</button>
          {confirm === 'code' ? (
            <span className="flex flex-wrap items-center gap-2 rounded-xl bg-white/5 px-3 py-1">
              <span className="text-sm text-slate-200">Old code stops working. Continue?</span>
              <button type="button" disabled={busy} onClick={() => void regenerate()} className={`${btn} bg-amber-500 text-black`}>Make new code</button>
              <button type="button" onClick={() => setConfirm(null)} className={`${btn} text-slate-300`}>Cancel</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirm('code')} className={`${btn} border border-white/15 text-slate-100 hover:bg-white/5`}>New join code</button>
          )}
          {confirm === 'delete' ? (
            <span className="flex flex-wrap items-center gap-2 rounded-xl bg-red-500/10 px-3 py-1">
              <span className="text-sm text-red-100">Delete the class and every child’s class progress?</span>
              <button type="button" disabled={busy} onClick={() => void deleteClass()} className={`${btn} bg-red-500 text-white`}>Delete</button>
              <button type="button" onClick={() => setConfirm(null)} className={`${btn} text-slate-300`}>Cancel</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirm('delete')} className={`${btn} border border-red-400/40 text-red-200 hover:bg-red-500/10`}>Delete class</button>
          )}
        </div>
      </header>

      {totals && (
        <section aria-labelledby="totals-h">
          <h2 id="totals-h" className="sr-only">Class totals</h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ['Children', totals.children, '🧒'],
              ['Active this week', totals.activeThisWeek, '📅'],
              ['Stars', totals.stars, '⭐'],
              ['Episodes watched', totals.episodes, '🎬'],
              ['Missions solved', totals.missions, '🧩'],
              ['Levels done', totals.levels, '🗺️'],
            ].map(([label, value, emoji]) => (
              <div key={String(label)} className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400"><span aria-hidden>{emoji} </span>{label}</dt>
                <dd className="mt-1 text-2xl font-extrabold text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {(stuck.length > 0 || hard.length > 0 || (idle.length > 0 && members.length > 0)) && (
        <section aria-labelledby="insights-h" className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 sm:p-6">
          <h2 id="insights-h" className="text-lg font-extrabold text-white">Where to help next</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            {stuck.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-amber-300">Most retried in Robot World</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-200">
                  {stuck.map((s) => (
                    <li key={s.key}><strong className="text-white">{s.label}</strong> — {s.children} children, {s.attempts} tries</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-slate-400">A good one to work through together on the board.</p>
              </div>
            )}
            {hard.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-amber-300">Code Lab: solved, but only just</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-200">
                  {hard.map((h) => (
                    <li key={h.id}><strong className="text-white">{h.label}</strong> — {h.oneStar} of {h.solved} with one star</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-slate-400">One star usually means a long program. Ask: “can a loop make it shorter?”</p>
              </div>
            )}
            {idle.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-amber-300">Not played for a week</h3>
                <p className="mt-2 text-sm text-slate-200">{idle.slice(0, 12).join(', ')}{idle.length > 12 ? ` and ${idle.length - 12} more` : ''}</p>
              </div>
            )}
          </div>
        </section>
      )}

      <AssignmentsPanelClient classId={classId} band={cls.band} members={members} />

      <section aria-labelledby="roster-h">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="roster-h" className="text-lg font-extrabold text-white">Roster</h2>
          <p className="text-xs text-slate-400">Updates when children play. Nicknames only — no contact details are ever collected.</p>
        </div>
        {members.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-white/15 bg-slate-950/60 p-8 text-center">
            <p className="text-slate-200">No one has joined yet.</p>
            <p className="mt-1 text-sm text-slate-400">Children go to <strong className="text-white">{JOIN_URL_DISPLAY}</strong> and type <strong className="font-mono text-amber-300">{formatJoinCode(cls.joinCode)}</strong>.</p>
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/80">
            <table className="w-full min-w-[860px] text-left text-sm">
              <caption className="sr-only">Children in {cls.className} and their progress</caption>
              <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th scope="col" className="px-4 py-3">Nickname</th>
                  <th scope="col" className="px-3 py-3">⭐ Stars</th>
                  <th scope="col" className="px-3 py-3">🎬 Stories</th>
                  <th scope="col" className="px-3 py-3">🧩 Code Lab</th>
                  <th scope="col" className="px-3 py-3">🗺️ Levels</th>
                  <th scope="col" className="px-3 py-3">Robot</th>
                  <th scope="col" className="px-3 py-3">Last active</th>
                  <th scope="col" className="px-3 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const s = memberStats(m)
                  const confirming = typeof confirm === 'object' && confirm !== null && confirm.member === m.id
                  return (
                    <tr key={m.id} className="border-b border-white/5 last:border-0">
                      <th scope="row" className="px-4 py-3 font-bold text-white">{m.nickname}</th>
                      <td className="px-3 py-3 text-slate-100">{s.stars}</td>
                      <td className="px-3 py-3 text-slate-100">{s.episodes}</td>
                      <td className="px-3 py-3 text-slate-100">
                        {s.missions}
                        {s.missions > 0 && <span className="ml-1 text-xs text-slate-400">({s.missionStars}/{s.missions * 3}★)</span>}
                      </td>
                      <td className="px-3 py-3 text-slate-100">{s.levels}</td>
                      <td className="px-3 py-3"><RobotMiniCard code={m.snapshot.robot} /></td>
                      <td className="px-3 py-3 text-slate-300">{relativeTime(m.lastActiveAt)}</td>
                      <td className="px-3 py-3 text-right">
                        {confirming ? (
                          <span className="inline-flex gap-1">
                            <button type="button" disabled={busy} onClick={() => void removeMember(m.id)} className={`${btn} bg-red-500 text-white`}>Remove</button>
                            <button type="button" onClick={() => setConfirm(null)} className={`${btn} text-slate-300`}>Keep</button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirm({ member: m.id })}
                            className={`${btn} text-slate-400 hover:bg-red-500/10 hover:text-red-200`}
                            aria-label={`Remove ${m.nickname} from the class`}
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <LessonPlanPanel band={cls.band} />

      <ParentNote variant="teacher">
        <p className="mt-3 text-sm text-slate-400">Removing a child here deletes their nickname and class progress from R2BOT. Their progress on their own device is not touched.</p>
      </ParentNote>
    </div>
  )
}
