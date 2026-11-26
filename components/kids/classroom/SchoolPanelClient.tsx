'use client'

// components/kids/classroom/SchoolPanelClient.tsx
// A compact "Your school" card for the top of the teacher's Classroom page.
// Links to /kids/classroom/school for everything else. Before migration 0055
// runs it shows a muted one-liner; it never blocks the classes below it.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { teacherFetch } from '@/lib/kids/classroom-api'
import type { SchoolResponse } from '@/lib/kids/classroom-schools'

type State =
  | { kind: 'loading' }
  | { kind: 'hidden' }
  | { kind: 'not-ready' }
  | { kind: 'ready'; data: SchoolResponse }

export function SchoolPanelClient() {
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let alive = true
    void teacherFetch<SchoolResponse>('/api/kids/classroom/school').then((r) => {
      if (!alive) return
      if (r.kind === 'ok') setState({ kind: 'ready', data: r.data })
      else if (r.kind === 'not-ready') setState({ kind: 'not-ready' })
      else setState({ kind: 'hidden' })
    })
    return () => { alive = false }
  }, [])

  if (state.kind === 'loading') return <div className="h-[92px] rounded-2xl bg-white/[0.03]" aria-hidden />
  if (state.kind === 'hidden') return null
  if (state.kind === 'not-ready') {
    return (
      <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400" role="status">
        🏫 Schools (shared classes for colleagues) are being switched on. Everything else works as normal.
      </p>
    )
  }

  const s = state.data.school
  if (!s) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/80 p-4">
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid h-11 w-11 place-items-center rounded-xl bg-white/[0.06] text-2xl">🏫</span>
          <div>
            <p className="font-bold text-white">Teaching with colleagues?</p>
            <p className="text-sm text-slate-400">Create a school, or join one with a school code, to see every class in one place.</p>
          </div>
        </div>
        <Link href="/kids/classroom/school" className="inline-flex min-h-[44px] items-center rounded-xl border border-white/15 px-4 text-sm font-bold text-white hover:bg-white/5">Set up a school</Link>
      </div>
    )
  }

  return (
    <Link href="/kids/classroom/school" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/[0.07] p-4 transition hover:border-amber-400/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
      <span className="flex items-center gap-3">
        <span aria-hidden className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500 text-2xl">🏫</span>
        <span>
          <span className="block font-bold text-white">{s.name}</span>
          <span className="block text-sm text-slate-300">
            {s.role === 'admin' ? 'You are the school admin' : 'You teach here'} · {s.teachers.length} {s.teachers.length === 1 ? 'teacher' : 'teachers'}
            {s.summary ? ` · ${s.summary.classes} classes · ${s.summary.children} children` : ''}
          </span>
        </span>
      </span>
      <span className="text-sm font-bold text-amber-300">{s.role === 'admin' ? 'School dashboard →' : 'School →'}</span>
    </Link>
  )
}

export default SchoolPanelClient
