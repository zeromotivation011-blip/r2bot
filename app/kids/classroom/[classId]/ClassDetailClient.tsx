'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AUTH_CHANGED_EVENT } from '@/lib/supabase/lazy'
import { getBand } from '@/lib/kids/bands'
import { JOIN_URL_DISPLAY, formatJoinCode, type KidsClassSummary, type KidsMemberRow } from '@/lib/kids/classroom'
import { downloadText, fetchInsightCatalogue, fileSlug, relativeTime, teacherFetch } from '@/lib/kids/classroom-api'
import { classTotals, memberStats, rosterCsv } from '@/lib/kids/classroom-stats'
import type { InsightCatalogue } from '@/lib/kids/classroom-insights'
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
import { PowerUpPanelClient } from '@/components/kids/classroom/PowerUpPanelClient'
import { ClassMindMapClient, WhereToHelpClient } from '@/components/kids/classroom/ClassMindMapClient'
import { GradebookClient } from '@/components/kids/classroom/GradebookClient'
import { BandLockPanelClient } from '@/components/kids/classroom/BandLockPanelClient'

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
  const [catalogue, setCatalogue] = useState<InsightCatalogue | null>(null)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setState({ kind: 'loading' })
    const r = await teacherFetch<DetailResponse>(`/api/kids/classroom/classes/${encodeURIComponent(classId)}`)
    if (r.kind === 'ok') setState({ kind: 'ready', cls: r.data.class, members: r.data.members })
    else if (r.kind === 'error') setState({ kind: 'error', message: r.message })
    else setState({ kind: r.kind })
  }, [classId])

  const ready0 = state.kind === 'ready'
  useEffect(() => {
    if (!ready0 || catalogue) return
    let alive = true
    void fetchInsightCatalogue().then((c) => {
      if (alive) setCatalogue(c)
    })
    return () => {
      alive = false
    }
  }, [ready0, catalogue])

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
    downloadText(rosterCsv(members), `r2bot-kids-${fileSlug(cls.className)}-${new Date().toISOString().slice(0, 10)}.csv`)
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
          <Link href={`/kids/classroom/${classId}/card`} className={`${btn} bg-amber-500 text-[#1A1103] hover:bg-amber-400`}>🖨️ Print join card</Link>
          <Link href={`/kids/classroom/${classId}/projector`} className={`${btn} border border-white/15 text-slate-100 hover:bg-white/5`}>📽️ Projector view</Link>
          <Link href={`/kids/present?code=${cls.joinCode}`} className={`${btn} border border-white/15 text-slate-100 hover:bg-white/5`}>🖥️ Present</Link>
          <Link href="/kids/portfolio/class-certificates" className={`${btn} border border-white/15 text-slate-100 hover:bg-white/5`}>🏅 Class certificates</Link>
          <button type="button" onClick={downloadCsv} disabled={!members.length} className={`${btn} border border-white/15 text-slate-100 hover:bg-white/5 disabled:opacity-50`}>⬇️ Roster CSV</button>
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
              ['Played this week', totals.activeThisWeek, '📅'],
              ['Course sessions', totals.sessions, '📘'],
              ['Skill Galaxy runs', totals.activities, '🌌'],
              ['Stars', totals.stars, '⭐'],
              ['Robots built', totals.robotsBuilt, '🤖'],
            ].map(([label, value, emoji]) => (
              <div key={String(label)} className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400"><span aria-hidden>{emoji} </span>{label}</dt>
                <dd className="mt-1 text-2xl font-extrabold text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <nav aria-label="On this page" className="-mt-4 flex gap-2 overflow-x-auto pb-1 text-sm">
        {[
          ['#powerup-h', 'Power-Up'],
          ['#mindmap-h', 'Mind Map'],
          ['#help-h', 'Where to help'],
          ['#gradebook-h', 'Gradebook'],
          ['#roster-h', 'Roster'],
          ['#band-h', 'Bands'],
        ].map(([href, label]) => (
          <a key={href} href={href} className="inline-flex min-h-[44px] shrink-0 items-center rounded-full border border-white/15 bg-white/[0.04] px-4 font-semibold text-slate-100 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">{label}</a>
        ))}
      </nav>

      <PowerUpPanelClient
        classId={classId}
        cls={cls}
        members={members}
        onGoal={(goal) => setState({ kind: 'ready', cls: { ...cls, goal: cls.goalReady ? goal : cls.goal }, members })}
      />

      <ClassMindMapClient members={members} catalogue={catalogue} />

      <WhereToHelpClient members={members} catalogue={catalogue} />

      <GradebookClient cls={cls} members={members} catalogue={catalogue} />

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
            <table className="w-full min-w-[960px] text-left text-sm">
              <caption className="sr-only">Children in {cls.className} and their progress</caption>
              <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th scope="col" className="px-4 py-3">Nickname</th>
                  <th scope="col" className="px-3 py-3">📘 Sessions</th>
                  <th scope="col" className="px-3 py-3">🌌 Galaxy</th>
                  <th scope="col" className="px-3 py-3">🧠 Secure</th>
                  <th scope="col" className="px-3 py-3">🎮 Games</th>
                  <th scope="col" className="px-3 py-3">⭐ Stars</th>
                  <th scope="col" className="px-3 py-3">🧩 Code Lab</th>
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
                      <td className="px-3 py-3 text-slate-100">{s.sessions}</td>
                      <td className="px-3 py-3 text-slate-100">{s.activities}</td>
                      <td className="px-3 py-3 text-slate-100">{s.secure}</td>
                      <td className="px-3 py-3 text-slate-100">{s.games}</td>
                      <td className="px-3 py-3 text-slate-100">{s.stars}</td>
                      <td className="px-3 py-3 text-slate-100">
                        {s.missions}
                        {s.missions > 0 && <span className="ml-1 text-xs text-slate-400">({s.missionStars}/{s.missions * 3}★)</span>}
                      </td>
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

      <BandLockPanelClient
        classId={classId}
        cls={cls}
        members={members}
        onClassLocked={(locked) => setState({ kind: 'ready', cls: { ...cls, bandLocked: locked }, members })}
        onMemberLock={(memberId, b) => setState({ kind: 'ready', cls, members: members.map((m) => (m.id === memberId ? { ...m, bandLock: b } : m)) })}
      />

      {(cls.band === 'engineers' || members.some((m) => m.snapshot.band === 'engineers')) && (
        <section aria-labelledby="nextstep-h" className="rounded-[28px] border border-amber-400/30 bg-amber-500/[0.06] p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Graduate to R2BOT</p>
          <h2 id="nextstep-h" className="font-display text-2xl font-bold text-white">Your next step, for Engineers</h2>
          <p className="mt-1 max-w-3xl text-[15px] text-slate-200">
            Engineers (14–17) who are ready for more can open <strong className="text-white">Your next step</strong>: it maps the concepts each of them has
            secured to Quick Lessons, Academy lessons, Robot Projects, the ROS 2 Playground and Career Paths. It is worked out on the child’s own device;
            nothing is sent to you or compared with anyone.
          </p>
          <Link href="/kids/next-step" className="mt-3 inline-flex min-h-[44px] items-center rounded-xl bg-amber-500 px-4 text-sm font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
            See “Your next step” →
          </Link>
        </section>
      )}

      <LessonPlanPanel band={cls.band} />

      <ParentNote variant="teacher">
        <p className="mt-3 text-sm text-slate-400">Removing a child here deletes their nickname and class progress from R2BOT. Their progress on their own device is not touched.</p>
      </ParentNote>
    </div>
  )
}
