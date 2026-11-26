'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { AUTH_CHANGED_EVENT } from '@/lib/supabase/lazy'
import { getBand } from '@/lib/kids/bands'
import { teacherFetch, relativeTime, type TeacherResult } from '@/lib/kids/classroom-api'
import { formatSchoolCode, type KidsSchoolInfo, type SchoolResponse } from '@/lib/kids/classroom-schools'
import {
  ClassroomError,
  ClassroomSkeleton,
  TeacherSignIn,
} from '@/components/kids/classroom/TeacherGateClient'

type State =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'not-ready' }
  | { kind: 'error'; message: string }
  | { kind: 'none'; suggestedName: string }
  | { kind: 'ready'; school: KidsSchoolInfo }

const btn = 'inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:opacity-60'
const input = 'mt-1.5 min-h-[48px] w-full rounded-xl border border-white/15 bg-black/40 px-3 text-base text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none'

export default function SchoolClient() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [flash, setFlash] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const apply = useCallback((r: TeacherResult<SchoolResponse>) => {
    if (r.kind === 'ok') {
      if (r.data.school) setState({ kind: 'ready', school: r.data.school })
      else setState({ kind: 'none', suggestedName: r.data.suggestedName ?? '' })
      return true
    }
    if (r.kind === 'signed-out') setState({ kind: 'signed-out' })
    else if (r.kind === 'not-ready') setState({ kind: 'not-ready' })
    else if (r.kind === 'error') setFlash(r.message)
    else setFlash('Something went wrong. Try again.')
    return false
  }, [])

  const load = useCallback(async () => {
    const r = await teacherFetch<SchoolResponse>('/api/kids/classroom/school')
    if (r.kind === 'error') setState({ kind: 'error', message: r.message })
    else apply(r)
  }, [apply])

  useEffect(() => {
    void load()
    const onAuth = () => void load()
    window.addEventListener(AUTH_CHANGED_EVENT, onAuth)
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuth)
  }, [load])

  const act = useCallback(async (body: Record<string, unknown>, ok?: string) => {
    setBusy(true)
    setFlash(null)
    const r = await teacherFetch<SchoolResponse>('/api/kids/classroom/school', { method: 'POST', body: JSON.stringify(body) })
    setBusy(false)
    if (apply(r) && ok) setFlash(ok)
    return r.kind === 'ok'
  }, [apply])

  if (state.kind === 'loading') return <ClassroomSkeleton />
  if (state.kind === 'signed-out') return <TeacherSignIn next="/kids/classroom/school" />
  if (state.kind === 'error') return <ClassroomError message={state.message} onRetry={() => void load()} />
  if (state.kind === 'not-ready') {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-amber-400/30 bg-amber-500/10 p-6 text-center sm:p-8" role="status">
        <div className="text-5xl" aria-hidden>🏫</div>
        <h1 className="mt-3 text-2xl font-extrabold text-white">Schools are being switched on</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-amber-100/90">
          Soon you will be able to create a school and invite colleagues with a school code. Your classes, rosters and join codes work as normal in the meantime.
        </p>
        <Link href="/kids/classroom" className="mt-5 inline-flex min-h-[44px] items-center rounded-xl bg-amber-500 px-5 font-bold text-[#1A1103] hover:bg-amber-400">Back to your classes</Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Link href="/kids/classroom" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-amber-300 hover:underline">← Your classes</Link>
      {flash && <p className="rounded-2xl bg-white/5 p-3 text-sm text-slate-200" role="status">{flash}</p>}
      {state.kind === 'none'
        ? <NoSchool suggestedName={state.suggestedName} busy={busy} act={act} />
        : <SchoolView school={state.school} busy={busy} act={act} />}
    </div>
  )
}

type Act = (body: Record<string, unknown>, ok?: string) => Promise<boolean>

function NoSchool({ suggestedName, busy, act }: { suggestedName: string; busy: boolean; act: Act }) {
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState(suggestedName)
  const [code, setCode] = useState('')
  const [joinName, setJoinName] = useState(suggestedName)
  const ids = { name: useId(), dn: useId(), code: useId(), jn: useId() }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-300">R2BOT Kids · Schools</p>
        <h1 className="mt-1 text-3xl font-extrabold text-white sm:text-4xl">Bring your colleagues in</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-slate-300">
          A school groups the classes of several teachers. The admin sees every class with a school-wide summary — counts only;
          children’s nicknames stay with their own teacher. Each teacher keeps full control of their own classes.
        </p>
      </header>
      <div className="grid gap-5 lg:grid-cols-2">
        <form
          className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 sm:p-6"
          onSubmit={(e) => { e.preventDefault(); void act({ action: 'create', name, displayName }, 'School created. Share the school code with your colleagues.') }}
        >
          <h2 className="text-xl font-extrabold text-white">Create a school</h2>
          <p className="mt-1 text-sm text-slate-400">You become the school admin. Your existing classes join the school.</p>
          <label htmlFor={ids.name} className="mt-4 block text-sm font-semibold text-slate-200">School name</label>
          <input id={ids.name} required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Greenfield Primary" className={input} />
          <label htmlFor={ids.dn} className="mt-4 block text-sm font-semibold text-slate-200">Your name for colleagues</label>
          <input id={ids.dn} maxLength={40} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ms Rao" className={input} />
          <button type="submit" disabled={busy || name.trim().length < 2} className={`${btn} mt-5 min-h-[48px] bg-amber-500 px-6 text-base text-[#1A1103] hover:bg-amber-400`}>{busy ? 'Working…' : 'Create school'}</button>
        </form>
        <form
          className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 sm:p-6"
          onSubmit={(e) => { e.preventDefault(); void act({ action: 'join', code, displayName: joinName }, 'You joined the school.') }}
        >
          <h2 className="text-xl font-extrabold text-white">Join your school</h2>
          <p className="mt-1 text-sm text-slate-400">Ask your school admin for the 8-character school code (not a class code).</p>
          <label htmlFor={ids.code} className="mt-4 block text-sm font-semibold text-slate-200">School code</label>
          <input id={ids.code} required value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABCD 2345" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={12} className={`${input} font-mono text-lg uppercase tracking-widest`} />
          <label htmlFor={ids.jn} className="mt-4 block text-sm font-semibold text-slate-200">Your name for colleagues</label>
          <input id={ids.jn} maxLength={40} value={joinName} onChange={(e) => setJoinName(e.target.value)} placeholder="Mr Okafor" className={input} />
          <button type="submit" disabled={busy || code.replace(/[\s-]/g, '').length < 8} className={`${btn} mt-5 min-h-[48px] border border-white/15 px-6 text-base text-white hover:bg-white/5`}>{busy ? 'Working…' : 'Join school'}</button>
        </form>
      </div>
    </div>
  )
}

function SchoolView({ school: s, busy, act }: { school: KidsSchoolInfo; busy: boolean; act: Act }) {
  const [confirm, setConfirm] = useState<null | 'leave' | 'code' | 'delete' | { teacher: string }>(null)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(s.name)
  const isAdmin = s.role === 'admin'
  const renameId = useId()

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-300">R2BOT Kids · School {isAdmin ? 'admin' : ''}</p>
          {renaming ? (
            <form className="mt-1 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); void act({ action: 'rename', name: newName }, 'School renamed.').then((ok) => ok && setRenaming(false)) }}>
              <label htmlFor={renameId} className="sr-only">School name</label>
              <input id={renameId} value={newName} maxLength={100} onChange={(e) => setNewName(e.target.value)} className={`${input} mt-0 max-w-sm`} />
              <button type="submit" disabled={busy} className={`${btn} bg-amber-500 text-[#1A1103]`}>Save</button>
              <button type="button" onClick={() => setRenaming(false)} className={`${btn} text-slate-300`}>Cancel</button>
            </form>
          ) : (
            <h1 className="mt-1 text-3xl font-extrabold text-white sm:text-4xl">
              {s.name}
              {isAdmin && <button type="button" onClick={() => setRenaming(true)} className={`${btn} ml-2 align-middle text-slate-400 hover:text-white`} aria-label="Rename the school">Rename</button>}
            </h1>
          )}
          <p className="mt-1 text-slate-300">{s.teachers.length} {s.teachers.length === 1 ? 'teacher' : 'teachers'}{s.myDisplayName ? ` · you are “${s.myDisplayName}”` : ''}</p>
        </div>
        {isAdmin && s.code && (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-5 py-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">School code — for teachers only</p>
            <p className="font-mono text-3xl font-black tracking-[0.18em] text-amber-300">{formatSchoolCode(s.code)}</p>
            <p className="text-xs text-amber-100/80">Colleagues enter it on r2bot.in/kids/classroom/school</p>
          </div>
        )}
      </header>

      {isAdmin && s.summary && (
        <section aria-labelledby="sum-h">
          <h2 id="sum-h" className="text-lg font-extrabold text-white">School at a glance</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Classes', s.summary.classes, '🏫'],
              ['Children', s.summary.children, '🧒'],
              ['Active this week', s.summary.activeThisWeek, '📅'],
              ['Stars earned', s.summary.stars, '⭐'],
              ['Sessions finished', s.summary.sessionsDone, '📘'],
              ['Galaxy activities', s.summary.activitiesDone, '🌌'],
              ['Assignments set', s.summary.assignments, '🍎'],
              ['Teachers', s.summary.teachers, '👩‍🏫'],
            ].map(([label, value, emoji]) => (
              <div key={String(label)} className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400"><span aria-hidden>{emoji} </span>{label}</dt>
                <dd className="mt-1 text-2xl font-extrabold text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {isAdmin && s.classes && (
        <section aria-labelledby="cls-h">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="cls-h" className="text-lg font-extrabold text-white">Every class in the school</h2>
            <p className="text-xs text-slate-400">Counts only. Nicknames stay with each class’s own teacher.</p>
          </div>
          {s.classes.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-white/15 p-6 text-center text-slate-300">No classes yet. Teachers’ classes appear here as soon as they join.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/80">
              <table className="w-full min-w-[760px] text-left text-sm">
                <caption className="sr-only">Classes in {s.name}</caption>
                <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th scope="col" className="px-4 py-3">Class</th>
                    <th scope="col" className="px-3 py-3">Teacher</th>
                    <th scope="col" className="px-3 py-3">Band</th>
                    <th scope="col" className="px-3 py-3">Children</th>
                    <th scope="col" className="px-3 py-3">Active (7 days)</th>
                    <th scope="col" className="px-3 py-3">⭐ Stars</th>
                    <th scope="col" className="px-3 py-3">📘 Sessions</th>
                    <th scope="col" className="px-3 py-3">🍎 Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {s.classes.map((c) => {
                    const band = getBand(c.band)
                    return (
                      <tr key={c.id} className="border-b border-white/5 last:border-0">
                        <th scope="row" className="px-4 py-3 font-bold text-white">
                          {c.mine ? <Link href={`/kids/classroom/${c.id}`} className="text-amber-300 hover:underline">{c.className}</Link> : c.className}
                        </th>
                        <td className="px-3 py-3 text-slate-200">{c.teacherName}</td>
                        <td className="px-3 py-3 text-slate-300">{band ? `${band.emoji} ${band.name}` : c.band}</td>
                        <td className="px-3 py-3 text-slate-100">{c.children}</td>
                        <td className="px-3 py-3 text-slate-100">{c.activeThisWeek}{c.children > 0 && <span className="ml-1 text-xs text-slate-400">({Math.round((c.activeThisWeek / c.children) * 100)}%)</span>}</td>
                        <td className="px-3 py-3 text-slate-100">{c.stars}</td>
                        <td className="px-3 py-3 text-slate-100">{c.children > 0 ? (c.sessionsDone / c.children).toFixed(1) : '0'}<span className="ml-1 text-xs text-slate-400">avg</span></td>
                        <td className="px-3 py-3 text-slate-100">{c.assignments}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="mine-h" className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 sm:p-6">
        <h2 id="mine-h" className="text-lg font-extrabold text-white">Your classes in this school</h2>
        <p className="mt-1 text-sm text-slate-400">New classes you create join the school automatically. Take one out if it is not a school class (an after-school club, say).</p>
        {s.myClasses.length === 0 ? (
          <p className="mt-3 text-sm text-slate-300"><Link href="/kids/classroom" className="font-semibold text-amber-300 hover:underline">Create your first class</Link> — it will join the school.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/5">
            {s.myClasses.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link href={`/kids/classroom/${c.id}`} className="font-semibold text-white hover:text-amber-300">{c.className}</Link>
                <span className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${c.inSchool ? 'text-emerald-300' : 'text-slate-400'}`}>{c.inSchool ? 'In the school' : 'Not in the school'}</span>
                  <button type="button" disabled={busy} onClick={() => void act({ action: 'link-class', classId: c.id, link: !c.inSchool })} className={`${btn} border border-white/15 text-slate-100 hover:bg-white/5`}>
                    {c.inSchool ? 'Take out' : 'Add to school'}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="t-h">
        <h2 id="t-h" className="text-lg font-extrabold text-white">Teachers</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {s.teachers.map((t, i) => {
            const confirming = typeof confirm === 'object' && confirm !== null && t.id !== null && confirm.teacher === t.id
            return (
              <li key={`${t.displayName}-${i}`} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                <div>
                  <p className="font-bold text-white">{t.displayName}{t.isMe && <span className="ml-1 text-xs font-semibold text-slate-400">(you)</span>}</p>
                  <p className="text-xs text-slate-400">{t.role === 'admin' ? 'School admin' : 'Teacher'} · joined {relativeTime(t.joinedAt)}</p>
                </div>
                {isAdmin && !t.isMe && t.id && (
                  confirming ? (
                    <span className="inline-flex gap-1">
                      <button type="button" disabled={busy} onClick={() => { void act({ action: 'remove-teacher', teacherId: t.id }, `${t.displayName} was removed. Their classes left the school; nothing was deleted.`); setConfirm(null) }} className={`${btn} bg-red-500 text-white`}>Remove</button>
                      <button type="button" onClick={() => setConfirm(null)} className={`${btn} text-slate-300`}>Keep</button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setConfirm({ teacher: t.id as string })} className={`${btn} text-slate-400 hover:bg-red-500/10 hover:text-red-200`} aria-label={`Remove ${t.displayName} from the school`}>Remove</button>
                  )
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="danger-h" className="rounded-3xl border border-white/10 p-5">
        <h2 id="danger-h" className="text-sm font-bold uppercase tracking-wider text-slate-400">School settings</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {isAdmin && (confirm === 'code' ? (
            <span className="flex flex-wrap items-center gap-2 rounded-xl bg-white/5 px-3 py-1">
              <span className="text-sm text-slate-200">The old school code stops working. Teachers already in stay in.</span>
              <button type="button" disabled={busy} onClick={() => { void act({ action: 'regenerate-code' }, 'New school code made.'); setConfirm(null) }} className={`${btn} bg-amber-500 text-[#1A1103]`}>Make new code</button>
              <button type="button" onClick={() => setConfirm(null)} className={`${btn} text-slate-300`}>Cancel</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirm('code')} className={`${btn} border border-white/15 text-slate-100 hover:bg-white/5`}>New school code</button>
          ))}
          {confirm === 'leave' ? (
            <span className="flex flex-wrap items-center gap-2 rounded-xl bg-white/5 px-3 py-1">
              <span className="text-sm text-slate-200">{isAdmin ? 'The longest-serving teacher becomes admin (or the school closes if you are alone). ' : ''}Your classes leave the school; nothing is deleted.</span>
              <button type="button" disabled={busy} onClick={() => { void act({ action: 'leave' }, 'You left the school.'); setConfirm(null) }} className={`${btn} bg-amber-500 text-[#1A1103]`}>Leave</button>
              <button type="button" onClick={() => setConfirm(null)} className={`${btn} text-slate-300`}>Cancel</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirm('leave')} className={`${btn} border border-white/15 text-slate-100 hover:bg-white/5`}>Leave school</button>
          )}
          {isAdmin && (confirm === 'delete' ? (
            <span className="flex flex-wrap items-center gap-2 rounded-xl bg-red-500/10 px-3 py-1">
              <span className="text-sm text-red-100">Close the school for everyone? Classes and children’s progress are kept; they just stop being grouped.</span>
              <button type="button" disabled={busy} onClick={() => { void act({ action: 'delete-school' }, 'The school was closed. Every class is still there.'); setConfirm(null) }} className={`${btn} bg-red-500 text-white`}>Close school</button>
              <button type="button" onClick={() => setConfirm(null)} className={`${btn} text-slate-300`}>Cancel</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirm('delete')} className={`${btn} border border-red-400/40 text-red-200 hover:bg-red-500/10`}>Close school</button>
          ))}
        </div>
      </section>
    </div>
  )
}
