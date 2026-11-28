'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AUTH_CHANGED_EVENT } from '@/lib/supabase/lazy'
import { KIDS_BANDS, getBand, type BandId } from '@/lib/kids/bands'
import { CLASS_KINDS, DEFAULT_CLASS_KIND, classKindInfo, formatJoinCode, isClassKind, type ClassKind, type KidsClassSummary } from '@/lib/kids/classroom'
import { displayClassKind, rememberClassKind } from '@/lib/kids/classroom-kind-store'
import { teacherFetch } from '@/lib/kids/classroom-api'
import {
  ClassroomError,
  ClassroomNotReady,
  ClassroomSkeleton,
  TeacherSignIn,
} from '@/components/kids/classroom/TeacherGateClient'
import { ParentNote } from '@/components/kids/classroom/ParentNote'
import { SchoolPanelClient } from '@/components/kids/classroom/SchoolPanelClient'

type State =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'not-ready' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; classes: KidsClassSummary[]; suggestedTeacherName: string; kindsReady: boolean | null }

interface ListResponse { classes: KidsClassSummary[]; suggestedTeacherName: string; kindsReady?: boolean }
interface CreateResponse { class: KidsClassSummary }

export default function ClassroomClient() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    const r = await teacherFetch<ListResponse>('/api/kids/classroom/classes')
    if (r.kind === 'ok') {
      setState({
        kind: 'ready',
        classes: r.data.classes,
        suggestedTeacherName: r.data.suggestedTeacherName,
        // An older server sends no kindsReady: fall back to what any listed class says, else unknown.
        kindsReady: typeof r.data.kindsReady === 'boolean' ? r.data.kindsReady : r.data.classes[0] ? r.data.classes[0].kindReady === true : null,
      })
      if (r.data.classes.length === 0) setShowCreate(true)
    } else if (r.kind === 'signed-out') setState({ kind: 'signed-out' })
    else if (r.kind === 'not-ready') setState({ kind: 'not-ready' })
    else setState({ kind: 'error', message: r.kind === 'error' ? r.message : 'Could not load your classes.' })
  }, [])

  useEffect(() => {
    void load()
    const onAuth = () => void load()
    window.addEventListener(AUTH_CHANGED_EVENT, onAuth)
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuth)
  }, [load])

  if (state.kind === 'loading') return <ClassroomSkeleton />
  if (state.kind === 'signed-out') return <TeacherSignIn next="/kids/classroom" />
  if (state.kind === 'not-ready') return <ClassroomNotReady />
  if (state.kind === 'error') return <ClassroomError message={state.message} onRetry={() => void load()} />

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-300">R2BOT Kids · Classroom</p>
          <h1 className="mt-1 text-3xl font-extrabold text-white sm:text-4xl">Your classes</h1>
          <p className="mt-1 text-[15px] text-slate-300">Children join with a code and a nickname. You see their progress here.</p>
        </div>
        {!showCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="min-h-[48px] rounded-xl bg-amber-500 px-5 font-bold text-black hover:bg-amber-400"
          >
            + New class
          </button>
        )}
      </header>

      <SchoolPanelClient />

      {showCreate && (
        <CreateClassForm
          defaultTeacherName={state.suggestedTeacherName}
          kindsReady={state.kindsReady}
          onCancel={state.classes.length ? () => setShowCreate(false) : undefined}
        />
      )}

      {state.classes.length > 0 && (
        <section aria-labelledby="classes-h">
          <h2 id="classes-h" className="sr-only">Classes</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {state.classes.map((c) => {
              const band = getBand(c.band)
              const kind = classKindInfo(displayClassKind(c))
              return (
                <li key={c.id}>
                  <Link
                    href={`/kids/classroom/${c.id}`}
                    className="block h-full rounded-2xl border border-white/10 bg-slate-950/80 p-5 transition hover:border-amber-400/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {kind.mixed
                        ? `${kind.emoji} ${kind.label} · mixed ages`
                        : band ? `${band.emoji} ${band.name} · ${band.grades.split(' · ')[0]}` : c.band}
                    </p>
                    <p className="mt-1 text-xl font-extrabold text-white">{c.className}</p>
                    {c.schoolName && <p className="text-sm text-slate-400">{c.schoolName}</p>}
                    <div className="mt-4 flex items-center justify-between">
                      <span className="rounded-lg bg-amber-500/15 px-2.5 py-1 font-mono text-lg font-black tracking-widest text-amber-300">
                        {formatJoinCode(c.joinCode)}
                      </span>
                      <span className="text-sm text-slate-300">
                        {c.memberCount} {c.memberCount === 1 ? 'child' : 'children'}
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <HowItWorks />
      <ParentNote variant="teacher">
        <p className="mt-3 text-sm text-slate-400">You can share this text with families as it is. It is the same note children and parents see on the join page.</p>
      </ParentNote>
    </div>
  )
}

/**
 * kindsReady: whether migration 0059 has run (null = not known yet). Before it, a club, family or
 * library class behaves like a school class for children: everyone joins at the band picked here.
 */
function CreateClassForm({ defaultTeacherName, kindsReady, onCancel }: { defaultTeacherName: string; kindsReady: boolean | null; onCancel?: () => void }) {
  const router = useRouter()
  const [className, setClassName] = useState('')
  const [teacherName, setTeacherName] = useState(defaultTeacherName)
  const [schoolName, setSchoolName] = useState('')
  const [band, setBand] = useState<BandId>('builders')
  const [kind, setKind] = useState<ClassKind>(DEFAULT_CLASS_KIND)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** A mixed-age class made before 0059: tell the leader on the spot, then go on to the class. */
  const [notYetMixed, setNotYetMixed] = useState<{ id: string; band: BandId } | null>(null)
  const ids = { cls: useId(), teacher: useId(), school: useId(), err: useId() }
  const kindInfo = classKindInfo(kind)

  // The club, family and library guides link here with ?kind=… preselected.
  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get('kind')
    if (isClassKind(k)) setKind(k)
  }, [])
  // A mixed-age class starts on its youngest band (the guides say so), but only once 0059 has run:
  // before it every child joins at this band, so the leader picks the band most members are in.
  useEffect(() => {
    if (kindsReady === true && kind !== 'school') setBand('explorers')
  }, [kindsReady, kind])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!className.trim()) {
      setError('Give the class a name, like “7B” or “Robotics Club”.')
      return
    }
    setBusy(true)
    const r = await teacherFetch<CreateResponse>('/api/kids/classroom/classes', {
      method: 'POST',
      body: JSON.stringify({ className, teacherName, schoolName, band, kind }),
    })
    setBusy(false)
    if (r.kind === 'ok') {
      // Before migration 0059 the server cannot keep the kind: this device does.
      if (!r.data.class.kindReady) {
        rememberClassKind(r.data.class.id, kind)
        if (kind !== 'school') {
          setNotYetMixed({ id: r.data.class.id, band })
          return
        }
      }
      router.push(`/kids/classroom/${r.data.class.id}?new=1`)
      return
    }
    setError(
      r.kind === 'error' ? r.message
        : r.kind === 'signed-out' ? 'Your session ended. Sign in again.'
          : r.kind === 'not-ready' ? 'Classrooms are being switched on. Please try again a little later.'
            : 'Could not create the class.',
    )
  }

  /** Keep or change the band of the class just made (PATCH action 'edit'), then open it. */
  async function confirmBand() {
    if (!notYetMixed) return
    if (notYetMixed.band !== band) {
      setBusy(true)
      const r = await teacherFetch<CreateResponse>(`/api/kids/classroom/classes/${notYetMixed.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'edit', className, teacherName, schoolName, band }),
      })
      setBusy(false)
      if (r.kind !== 'ok') {
        setError('Could not change the band. You can carry on; children will join at the band you first picked.')
        return
      }
    }
    router.push(`/kids/classroom/${notYetMixed.id}?new=1`)
  }

  if (notYetMixed) {
    return (
      <section className="rounded-3xl border border-amber-400/40 bg-slate-950/80 p-5 sm:p-7" aria-labelledby="created-h">
        <h2 id="created-h" className="text-xl font-extrabold text-white">Your {kindInfo.label.toLowerCase()} is made — one thing to check</h2>
        <p role="status" className="mt-3 text-[15px] leading-relaxed text-slate-200">
          R2BOT is still switching on mixed-age groups. Until that update runs, every child who joins this class starts at the
          class band below and does not pick their own. Choose the band most of your members are in. Once the update runs,
          each child keeps their own band, as described.
        </p>
        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-slate-200">Band children join at for now</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {KIDS_BANDS.map((b) => {
              const checked = band === b.id
              return (
                <label
                  key={b.id}
                  className={`flex min-h-[64px] cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${checked ? 'border-amber-400 bg-amber-500/10' : 'border-white/10 bg-black/30 hover:border-white/25'}`}
                >
                  <input type="radio" name="band-now" value={b.id} checked={checked} onChange={() => setBand(b.id)} className="mt-1 h-5 w-5 accent-amber-500" />
                  <span>
                    <span className="block font-bold text-white">{b.emoji} {b.name} <span className="font-normal text-slate-400">· ages {b.ages}</span></span>
                    <span className="block text-xs text-slate-400">{b.grades}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-500/15 p-3 text-sm font-semibold text-red-200">{error}</p>}
        <button
          type="button"
          disabled={busy}
          onClick={() => (error ? router.push(`/kids/classroom/${notYetMixed.id}?new=1`) : void confirmBand())}
          className="mt-4 min-h-[48px] rounded-xl bg-amber-500 px-6 font-bold text-black hover:bg-amber-400 disabled:opacity-60"
        >
          {busy ? 'Saving…' : error ? 'Go to the class' : 'Save and go to the class'}
        </button>
      </section>
    )
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 sm:p-7" aria-labelledby="create-h">
      <h2 id="create-h" className="text-xl font-extrabold text-white">Create a class</h2>
      <p className="mt-1 text-sm text-slate-400">You get a 6-character join code and a printable card for the classroom wall.</p>
      <form onSubmit={onSubmit} className="mt-5 space-y-5" aria-describedby={error ? ids.err : undefined}>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor={ids.cls} className="block text-sm font-semibold text-slate-200">Class name</label>
            <input id={ids.cls} required maxLength={60} value={className} onChange={(e) => setClassName(e.target.value)} placeholder="7B, Robotics Club…"
              className="mt-1.5 min-h-[48px] w-full rounded-xl border border-white/15 bg-black/40 px-3 text-base text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none" />
          </div>
          <div>
            <label htmlFor={ids.teacher} className="block text-sm font-semibold text-slate-200">Your name for children</label>
            <input id={ids.teacher} maxLength={40} value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Ms Rao"
              className="mt-1.5 min-h-[48px] w-full rounded-xl border border-white/15 bg-black/40 px-3 text-base text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none" />
            <p className="mt-1 text-xs text-slate-500">Shown as “You joined Ms Rao’s class!”</p>
          </div>
          <div>
            <label htmlFor={ids.school} className="block text-sm font-semibold text-slate-200">School <span className="font-normal text-slate-500">(optional)</span></label>
            <input id={ids.school} maxLength={100} value={schoolName} onChange={(e) => setSchoolName(e.target.value)}
              className="mt-1.5 min-h-[48px] w-full rounded-xl border border-white/15 bg-black/40 px-3 text-base text-white focus:border-amber-400 focus:outline-none" />
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-slate-200">What kind of group?</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CLASS_KINDS.map((k) => {
              const checked = kind === k.id
              return (
                <label
                  key={k.id}
                  className={`flex min-h-[64px] cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${checked ? 'border-amber-400 bg-amber-500/10' : 'border-white/10 bg-black/30 hover:border-white/25'}`}
                >
                  <input type="radio" name="kind" value={k.id} checked={checked} onChange={() => setKind(k.id)} className="mt-1 h-5 w-5 accent-amber-500" />
                  <span>
                    <span className="block font-bold text-white">{k.emoji} {k.label}</span>
                    <span className="block text-xs text-slate-400">{k.line}</span>
                  </span>
                </label>
              )
            })}
          </div>
          {kindInfo.mixed && (
            <div className="mt-2 space-y-2 text-sm text-slate-300">
              {kindsReady === false ? (
                <p className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-amber-100">
                  Mixed-age groups are still being switched on. Until then, every child joins at the band you pick below and
                  does not choose their own, so pick the band most of your members are in.
                </p>
              ) : (
                <p>Mixed ages: each child picks their own band when they join and keeps it. Your roster shows each child’s band.</p>
              )}
              <p>
                {kind === 'family'
                  ? 'A family class is set up by the parent or carer, for their own children.'
                  : <>Before children join, get written permission from each child’s parent or carer: for a {kindInfo.label.toLowerCase()}, your organisation (not a school) collects that consent. The <Link href="/kids/teach/trust" className="font-semibold text-amber-300 underline">Trust Pack</Link> has a template letter. Children without permission can still use everything that stays on their device.</>}{' '}
                <Link href={kindInfo.guide} className="inline-flex min-h-[44px] items-center font-semibold text-amber-300 hover:underline">How to run a {kindInfo.label.toLowerCase()} →</Link>
              </p>
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-slate-200">{kindInfo.mixed && kindsReady === false ? 'Band every child joins at (for now)' : kindInfo.bandLegend}</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {KIDS_BANDS.map((b) => {
              const checked = band === b.id
              return (
                <label
                  key={b.id}
                  className={`flex min-h-[64px] cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${checked ? 'border-amber-400 bg-amber-500/10' : 'border-white/10 bg-black/30 hover:border-white/25'}`}
                >
                  <input type="radio" name="band" value={b.id} checked={checked} onChange={() => setBand(b.id)} className="mt-1 h-5 w-5 accent-amber-500" />
                  <span>
                    <span className="block font-bold text-white">{b.emoji} {b.name} <span className="font-normal text-slate-400">· ages {b.ages}</span></span>
                    <span className="block text-xs text-slate-400">{b.grades}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        {error && <p id={ids.err} role="alert" className="rounded-xl bg-red-500/15 p-3 text-sm font-semibold text-red-200">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className="min-h-[48px] rounded-xl bg-amber-500 px-6 font-bold text-black hover:bg-amber-400 disabled:opacity-60">
            {busy ? 'Creating…' : 'Create class'}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="min-h-[48px] rounded-xl border border-white/15 px-5 font-semibold text-slate-200 hover:bg-white/5">Cancel</button>
          )}
        </div>
      </form>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { n: 1, t: 'Create a class', d: 'A school class, a club, a family class or a library group. Pick a band; you get a 6-character code.' },
    { n: 2, t: 'Put the card on the wall', d: 'Children go to r2bot.in/kids/join, type the code and a nickname. No email, no account.' },
    { n: 3, t: 'Teach, assign, look', d: 'Use the lesson guides, assign sessions or activities with due dates, and watch stars, missions and robots appear on your roster as children play.' },
  ]
  return (
    <section aria-labelledby="how-h">
      <h2 id="how-h" className="text-lg font-extrabold text-white">How it works</h2>
      <ol className="mt-3 grid gap-3 sm:grid-cols-3">
        {steps.map((s) => (
          <li key={s.n} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <span className="inline-grid h-8 w-8 place-items-center rounded-full bg-amber-500 font-black text-black">{s.n}</span>
            <p className="mt-2 font-bold text-white">{s.t}</p>
            <p className="mt-1 text-sm text-slate-300">{s.d}</p>
          </li>
        ))}
      </ol>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href="/kids/teach" className="inline-flex min-h-[44px] items-center font-semibold text-amber-300 hover:underline">Lesson guides for every session →</Link>
        <Link href="/kids/teach/training" className="inline-flex min-h-[44px] items-center font-semibold text-amber-300 hover:underline">Teacher training with certificate →</Link>
        <Link href="/kids/portfolio/class-certificates" className="inline-flex min-h-[44px] items-center font-semibold text-amber-300 hover:underline">Print a class set of certificates →</Link>
      </p>
    </section>
  )
}
