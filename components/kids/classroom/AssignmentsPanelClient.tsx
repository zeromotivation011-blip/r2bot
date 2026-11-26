'use client'

// components/kids/classroom/AssignmentsPanelClient.tsx
//
// Teacher, on a class page: assign course sessions, Skill Galaxy activities or
// games with an optional due date and note, and see per-assignment completion
// derived from the roster's synced snapshots. Children see these as
// "From your teacher" missions (ClassMissionsClient).
// Before migration 0055 runs the panel shows a friendly "being switched on" note.

import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import Link from 'next/link'
import { KIDS_BANDS, type BandId } from '@/lib/kids/bands'
import type { KidsMemberRow } from '@/lib/kids/classroom'
import { teacherFetch } from '@/lib/kids/classroom-api'
import {
  ASSIGNMENT_NOTE_MAX,
  KIND_LABEL,
  MAX_ASSIGNMENTS_PER_CLASS,
  assignmentProgress,
  dueState,
  formatDue,
  type AssignmentKind,
  type KidsAssignment,
} from '@/lib/kids/classroom-assignments'
import type { Catalogue } from '@/lib/kids/teach/catalogue'
import { ShareToClassroom } from '@/components/kids/teach/ShareToClassroom'

type State =
  | { kind: 'loading' }
  | { kind: 'not-ready' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; assignments: KidsAssignment[] }

export interface AssignmentsPanelProps {
  classId: string
  band: BandId
  members: KidsMemberRow[]
}

const btn = 'inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

export function AssignmentsPanelClient({ classId, band, members }: AssignmentsPanelProps) {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [picking, setPicking] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const r = await teacherFetch<{ assignments: KidsAssignment[] }>(`/api/kids/classroom/classes/${encodeURIComponent(classId)}/assignments`)
    if (r.kind === 'ok') setState({ kind: 'ready', assignments: r.data.assignments })
    else if (r.kind === 'not-ready') setState({ kind: 'not-ready' })
    else setState({ kind: 'error', message: r.kind === 'error' ? r.message : 'Could not load assignments.' })
  }, [classId])

  useEffect(() => {
    void load()
  }, [load])

  async function remove(id: string) {
    const r = await teacherFetch<{ ok: boolean }>(`/api/kids/classroom/classes/${encodeURIComponent(classId)}/assignments?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    setConfirmId(null)
    if (r.kind === 'ok' && state.kind === 'ready') {
      setState({ kind: 'ready', assignments: state.assignments.filter((a) => a.id !== id) })
    } else setFlash(r.kind === 'error' ? r.message : 'Could not remove it.')
  }

  const assigned = useMemo(
    () => new Set(state.kind === 'ready' ? state.assignments.map((a) => `${a.kind}:${a.itemId}`) : []),
    [state],
  )

  return (
    <section aria-labelledby="assign-h" className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="assign-h" className="text-lg font-extrabold text-white">Assignments</h2>
          <p className="text-sm text-slate-400">Children see these as “From your teacher” missions. Ticks come from their synced progress.</p>
        </div>
        {state.kind === 'ready' && !picking && (
          <button type="button" onClick={() => setPicking(true)} className={`${btn} bg-amber-500 text-[#1A1103] hover:bg-amber-400`} disabled={state.assignments.length >= MAX_ASSIGNMENTS_PER_CLASS}>
            + Assign
          </button>
        )}
      </div>

      {flash && <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-slate-200" role="status">{flash}</p>}

      {state.kind === 'loading' && <div className="mt-4 h-24 rounded-2xl bg-white/5" aria-hidden />}
      {state.kind === 'not-ready' && (
        <p className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100" role="status">
          Assignments are being switched on. Your class, roster and join code work as normal in the meantime.
        </p>
      )}
      {state.kind === 'error' && (
        <p className="mt-4 rounded-2xl bg-red-500/10 p-4 text-sm text-red-100" role="alert">
          {state.message} <button type="button" onClick={() => void load()} className="ml-2 font-bold underline">Try again</button>
        </p>
      )}

      {state.kind === 'ready' && picking && (
        <AssignPicker
          classId={classId}
          band={band}
          assigned={assigned}
          onAssigned={(a) => {
            setState({ kind: 'ready', assignments: [a, ...state.assignments] })
            setFlash(`Assigned “${a.title}”. Children see it next time they open R2BOT Kids.`)
          }}
          onClose={() => setPicking(false)}
        />
      )}

      {state.kind === 'ready' && state.assignments.length === 0 && !picking && (
        <div className="mt-4 rounded-2xl border border-dashed border-white/15 p-6 text-center">
          <p className="text-slate-200">Nothing assigned yet.</p>
          <p className="mt-1 text-sm text-slate-400">Assign a course session for this week, or a short Skill Galaxy activity as homework.</p>
        </div>
      )}

      {state.kind === 'ready' && state.assignments.length > 0 && (
        <ul className="mt-4 space-y-3">
          {state.assignments.map((a) => {
            const prog = assignmentProgress(a, members)
            const pct = prog.total ? Math.round((prog.done / prog.total) * 100) : 0
            const due = dueState(a.dueDate)
            const k = KIND_LABEL[a.kind]
            const expanded = open === a.id
            return (
              <li key={a.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400"><span aria-hidden>{k.emoji} </span>{k.label}</p>
                    <p className="font-bold text-white">
                      <Link href={a.href} className="hover:text-amber-300" target="_blank" rel="noopener">{a.title}</Link>
                    </p>
                    {a.note && <p className="text-sm text-slate-300">“{a.note}”</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {a.dueDate && (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${due === 'overdue' ? 'bg-rose-500/20 text-rose-200' : due === 'today' || due === 'soon' ? 'bg-amber-500/20 text-amber-200' : 'bg-white/10 text-slate-200'}`}>
                        {due === 'today' ? 'Due today' : `Due ${formatDue(a.dueDate)}`}
                      </span>
                    )}
                    <ShareToClassroom path={a.href} title={a.title} variant="chip" />
                    {confirmId === a.id ? (
                      <span className="inline-flex gap-1">
                        <button type="button" onClick={() => void remove(a.id)} className={`${btn} bg-red-500 text-white`}>Remove</button>
                        <button type="button" onClick={() => setConfirmId(null)} className={`${btn} text-slate-300`}>Keep</button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setConfirmId(a.id)} className={`${btn} text-slate-400 hover:bg-red-500/10 hover:text-red-200`} aria-label={`Remove assignment ${a.title}`}>Remove</button>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={`${a.title}: ${prog.done} of ${prog.total} children finished`} aria-valuemin={0} aria-valuemax={prog.total} aria-valuenow={prog.done}>
                    <div className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-400' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="shrink-0 text-sm font-bold text-white">{prog.done}/{prog.total}</span>
                  {prog.notDone.length > 0 && prog.total > 0 && (
                    <button type="button" onClick={() => setOpen(expanded ? null : a.id)} aria-expanded={expanded} className={`${btn} px-2 text-amber-300 hover:bg-white/5`}>
                      {expanded ? 'Hide' : 'Who’s left?'}
                    </button>
                  )}
                </div>
                {expanded && (
                  <p className="mt-2 text-sm text-slate-300">
                    Not finished yet: {prog.notDone.slice(0, 40).join(', ')}{prog.notDone.length > 40 ? ` and ${prog.notDone.length - 40} more` : ''}.
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// ── Picker ───────────────────────────────────────────────────────────────────

let catalogueCache: Catalogue | null = null

function AssignPicker({ classId, band, assigned, onAssigned, onClose }: {
  classId: string
  band: BandId
  assigned: Set<string>
  onAssigned: (a: KidsAssignment) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<AssignmentKind>('session')
  const [cat, setCat] = useState<Catalogue | null>(catalogueCache)
  const [catError, setCatError] = useState(false)
  const [q, setQ] = useState('')
  const [track, setTrack] = useState<string>('all')
  const [bandFilter, setBandFilter] = useState<string>(band)
  const [due, setDue] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ids = { q: useId(), track: useId(), band: useId(), due: useId(), note: useId() }

  useEffect(() => {
    if (catalogueCache) return
    let alive = true
    fetch('/api/kids/classroom/catalogue')
      .then((r) => (r.ok ? (r.json() as Promise<Catalogue>) : Promise.reject(new Error('catalogue'))))
      .then((d) => {
        catalogueCache = d
        if (alive) setCat(d)
      })
      .catch(() => alive && setCatError(true))
    return () => { alive = false }
  }, [])

  const items = useMemo(() => {
    if (!cat) return []
    const needle = q.trim().toLowerCase()
    const match = (s: string) => !needle || s.toLowerCase().includes(needle)
    if (tab === 'session') {
      return cat.sessions.filter((s) => match(`${s.number} ${s.title} ${s.objective}`)).map((s) => ({
        id: s.id, title: `Session ${s.number}: ${s.title}`, sub: s.objective, href: s.href,
      }))
    }
    if (tab === 'activity') {
      const icon = new Map(cat.tracks.map((t) => [t.id, `${t.icon} ${t.name}`]))
      return cat.activities
        .filter((a) => (track === 'all' || a.track === track) && (bandFilter === 'all' || a.band === bandFilter) && match(`${a.title} ${a.id}`))
        .slice(0, 80)
        .map((a) => ({ id: a.id, title: a.title, sub: `${icon.get(a.track) ?? a.track} · ${KIDS_BANDS.find((b) => b.id === a.band)?.name ?? a.band} · level ${a.difficulty}`, href: a.href }))
    }
    return cat.games.filter((g) => match(`${g.title} ${g.hook}`)).map((g) => ({
      id: g.id, title: `${g.emoji} ${g.title}`, sub: `${g.hook} From ${KIDS_BANDS.find((b) => b.id === g.minBand)?.name ?? g.minBand}.`, href: g.href,
    }))
  }, [cat, tab, q, track, bandFilter])

  const totalActivities = useMemo(() => {
    if (!cat || tab !== 'activity') return 0
    return cat.activities.filter((a) => (track === 'all' || a.track === track) && (bandFilter === 'all' || a.band === bandFilter)).length
  }, [cat, tab, track, bandFilter])

  async function assign(itemId: string) {
    setBusy(itemId)
    setError(null)
    const r = await teacherFetch<{ assignment: KidsAssignment }>(`/api/kids/classroom/classes/${encodeURIComponent(classId)}/assignments`, {
      method: 'POST',
      body: JSON.stringify({ kind: tab, itemId, dueDate: due || null, note: note || null }),
    })
    setBusy(null)
    if (r.kind === 'ok' && r.data.assignment) onAssigned(r.data.assignment)
    else setError(r.kind === 'error' ? r.message : r.kind === 'not-ready' ? 'Assignments are being switched on. Try again a little later.' : 'Could not assign that.')
  }

  const input = 'min-h-[44px] w-full rounded-xl border border-white/15 bg-black/40 px-3 text-base text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none'
  const today = new Date()
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <div className="mt-4 rounded-2xl border border-amber-400/30 bg-black/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="What to assign" className="inline-flex rounded-xl bg-white/5 p-1">
          {(['session', 'activity', 'game'] as AssignmentKind[]).map((k) => (
            <button
              key={k}
              role="tab"
              type="button"
              aria-selected={tab === k}
              onClick={() => { setTab(k); setQ('') }}
              className={`min-h-[40px] rounded-lg px-3 text-sm font-bold ${tab === k ? 'bg-amber-500 text-[#1A1103]' : 'text-slate-200 hover:bg-white/5'}`}
            >
              {KIND_LABEL[k].emoji} {k === 'session' ? 'Course sessions' : k === 'activity' ? 'Skill Galaxy' : 'Games'}
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} className={`${btn} border border-white/15 text-slate-200 hover:bg-white/5`}>Done</button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={tab === 'activity' ? '' : 'lg:col-span-2'}>
          <label htmlFor={ids.q} className="block text-xs font-semibold text-slate-300">Search</label>
          <input id={ids.q} value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === 'activity' ? 'gears, sensor, loop…' : 'Search'} className={`${input} mt-1`} />
        </div>
        {tab === 'activity' && (
          <>
            <div>
              <label htmlFor={ids.track} className="block text-xs font-semibold text-slate-300">Track</label>
              <select id={ids.track} value={track} onChange={(e) => setTrack(e.target.value)} className={`${input} mt-1`}>
                <option value="all">All tracks</option>
                {cat?.tracks.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={ids.band} className="block text-xs font-semibold text-slate-300">Band</label>
              <select id={ids.band} value={bandFilter} onChange={(e) => setBandFilter(e.target.value)} className={`${input} mt-1`}>
                <option value="all">All bands</option>
                {KIDS_BANDS.map((b) => <option key={b.id} value={b.id}>{b.emoji} {b.name} ({b.ages})</option>)}
              </select>
            </div>
          </>
        )}
        <div className={tab === 'activity' ? 'sm:col-span-2 lg:col-span-4 grid gap-3 sm:grid-cols-2' : 'lg:col-span-2 grid gap-3 sm:grid-cols-2'}>
          <div>
            <label htmlFor={ids.due} className="block text-xs font-semibold text-slate-300">Due date <span className="font-normal text-slate-500">(optional)</span></label>
            <input id={ids.due} type="date" min={minDate} value={due} onChange={(e) => setDue(e.target.value)} className={`${input} mt-1 [color-scheme:dark]`} />
          </div>
          <div>
            <label htmlFor={ids.note} className="block text-xs font-semibold text-slate-300">Note to children <span className="font-normal text-slate-500">(optional)</span></label>
            <input id={ids.note} value={note} maxLength={ASSIGNMENT_NOTE_MAX} onChange={(e) => setNote(e.target.value)} placeholder="Try for three stars!" className={`${input} mt-1`} />
          </div>
        </div>
      </div>

      {error && <p role="alert" className="mt-3 rounded-xl bg-red-500/15 p-3 text-sm font-semibold text-red-200">{error}</p>}

      <div className="mt-4" aria-live="polite">
        {catError && <p className="text-sm text-red-200">Could not load the list. Check your connection and reopen.</p>}
        {!cat && !catError && <div className="h-40 rounded-xl bg-white/5" aria-hidden />}
        {cat && (
          <>
            {tab === 'activity' && (
              <p className="mb-2 text-xs text-slate-400">
                {totalActivities > items.length ? `Showing ${items.length} of ${totalActivities} — search or filter to narrow down.` : `${items.length} activities`}
              </p>
            )}
            <ul className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
              {items.length === 0 && <li className="p-4 text-center text-sm text-slate-400">Nothing matches. Try another word or filter.</li>}
              {items.map((it) => {
                const done = assigned.has(`${tab}:${it.id}`)
                return (
                  <li key={it.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/70 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white">{it.title}</p>
                      <p className="truncate text-xs text-slate-400">{it.sub}</p>
                    </div>
                    <a href={it.href} target="_blank" rel="noopener" className="hidden min-h-[44px] items-center px-2 text-xs font-semibold text-slate-300 hover:text-amber-300 sm:inline-flex">Preview</a>
                    {done ? (
                      <span className="inline-flex min-h-[44px] items-center px-3 text-sm font-bold text-emerald-300">Assigned ✓</span>
                    ) : (
                      <button type="button" disabled={busy !== null} onClick={() => void assign(it.id)} className={`${btn} bg-amber-500 text-[#1A1103] hover:bg-amber-400 disabled:opacity-60`} aria-label={`Assign ${it.title}`}>
                        {busy === it.id ? 'Assigning…' : 'Assign'}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

export default AssignmentsPanelClient
