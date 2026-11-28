'use client'

// components/kids/classroom/ClassKindPanelClient.tsx
//
// Leader: what kind of group this class is (roadmap #84) — a school class (one
// band), or a club, family class or library group (mixed: each child keeps their
// own band). Saved with PATCH action 'kind' (migration 0059). Before 0059 runs
// the server answers "not ready" and the choice is kept on this device
// (lib/kids/classroom-kind-store.ts); the class page sends it once 0059 exists.

import { useId, useState } from 'react'
import Link from 'next/link'
import { CLASS_KINDS, classKindInfo, isClassKind, type ClassKind } from '@/lib/kids/classroom'
import { forgetClassKind, rememberClassKind } from '@/lib/kids/classroom-kind-store'
import { teacherFetch } from '@/lib/kids/classroom-api'

export interface ClassKindPanelProps {
  classId: string
  kind: ClassKind
  /** False before migration 0059: the kind lives on this device. */
  ready: boolean
  /** The whole-class band lock is on (a mixed class lifts it). */
  bandLocked: boolean
  onKind: (kind: ClassKind, bandLocked?: boolean) => void
}

export function ClassKindPanelClient({ classId, kind, ready, bandLocked, onKind }: ClassKindPanelProps) {
  const [choice, setChoice] = useState<ClassKind>(kind)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const selId = useId()
  const info = classKindInfo(kind)

  async function save() {
    if (choice === kind) return
    setBusy(true)
    setMsg(null)
    const r = await teacherFetch<{ kind: ClassKind; bandLocked?: boolean }>(`/api/kids/classroom/classes/${classId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'kind', kind: choice }),
    })
    if (r.kind === 'ok') {
      forgetClassKind(classId)
      onKind(choice, r.data.bandLocked)
      setMsg(`Saved: ${classKindInfo(choice).label}.`)
    } else if (r.kind === 'not-ready') {
      // Before 0059: keep it on this device. A mixed class must not keep a whole-class band lock.
      rememberClassKind(classId, choice)
      let lifted: boolean | undefined
      if (classKindInfo(choice).mixed && bandLocked) {
        const u = await teacherFetch<{ bandLocked: boolean }>(`/api/kids/classroom/classes/${classId}`, {
          method: 'PATCH',
          body: JSON.stringify({ action: 'band-lock-class', locked: false }),
        })
        if (u.kind === 'ok') lifted = false
      }
      onKind(choice, lifted)
      setMsg('Saved on this device. It will be saved for the class once the database update has run.')
    } else {
      setMsg(r.kind === 'error' ? r.message : 'Could not save. Try again.')
    }
    setBusy(false)
  }

  return (
    <section aria-labelledby="kind-h" className="rounded-[28px] border border-white/10 bg-[#111C32] p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Kind of group</p>
      <h2 id="kind-h" className="font-display text-2xl font-bold text-white">{info.emoji} {info.label}</h2>
      <p className="mt-1 max-w-3xl text-[15px] text-slate-300">
        {info.line}{' '}
        <Link href={info.guide} className="inline-flex min-h-[44px] items-center font-semibold text-amber-300 hover:underline">
          {kind === 'school' ? 'Lesson guides →' : `How to run a ${info.label.toLowerCase()} →`}
        </Link>
      </p>
      {!ready && (
        <p className="mt-2 text-sm text-slate-400" role="note">
          Kept on this device for now: children joining see a school class until the database update has run.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor={selId} className="text-sm font-semibold text-slate-200">Change to</label>
        <select
          id={selId}
          value={choice}
          disabled={busy}
          onChange={(e) => isClassKind(e.target.value) && setChoice(e.target.value)}
          className="min-h-[44px] rounded-xl border border-white/15 bg-[#19263F] px-3 text-sm font-semibold text-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:opacity-60"
        >
          {CLASS_KINDS.map((k) => (
            <option key={k.id} value={k.id}>{k.emoji} {k.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || choice === kind}
          className="inline-flex min-h-[44px] items-center rounded-xl bg-amber-500 px-4 text-sm font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
      {msg && <p className="mt-3 rounded-2xl bg-white/5 p-3 text-sm text-slate-200" role="status">{msg}</p>}
    </section>
  )
}

export default ClassKindPanelClient
