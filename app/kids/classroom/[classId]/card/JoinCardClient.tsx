'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBand } from '@/lib/kids/bands'
import { JOIN_URL_DISPLAY, formatJoinCode, type KidsClassSummary } from '@/lib/kids/classroom'
import { teacherFetch } from '@/lib/kids/classroom-api'
import {
  ClassroomError,
  ClassroomNotReady,
  ClassroomSkeleton,
  TeacherSignIn,
} from '@/components/kids/classroom/TeacherGateClient'

type State =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'not-ready' }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; cls: KidsClassSummary }

export default function JoinCardClient({ classId }: { classId: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let alive = true
    void teacherFetch<{ class: KidsClassSummary }>(`/api/kids/classroom/classes/${encodeURIComponent(classId)}`).then((r) => {
      if (!alive) return
      if (r.kind === 'ok') setState({ kind: 'ready', cls: r.data.class })
      else if (r.kind === 'error') setState({ kind: 'error', message: r.message })
      else setState({ kind: r.kind })
    })
    return () => { alive = false }
  }, [classId])

  if (state.kind === 'loading') return <ClassroomSkeleton />
  if (state.kind === 'signed-out') return <TeacherSignIn next={`/kids/classroom/${classId}/card`} />
  if (state.kind === 'not-ready') return <ClassroomNotReady />
  if (state.kind === 'error') return <ClassroomError message={state.message} onRetry={() => window.location.reload()} />
  if (state.kind === 'not-found') {
    return <p className="text-center text-slate-200">Class not found. <Link href="/kids/classroom" className="text-amber-300 underline">Your classes</Link></p>
  }

  const { cls } = state
  const band = getBand(cls.band)
  const who = cls.teacherName ? `${cls.teacherName}’s class` : 'our class'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/kids/classroom/${classId}`} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-amber-300 hover:underline">← Back to {cls.className}</Link>
        <button type="button" onClick={() => window.print()} className="min-h-[48px] rounded-xl bg-amber-500 px-6 font-bold text-black hover:bg-amber-400">🖨️ Print</button>
      </div>

      <article id="r2-join-card" className="rounded-[28px] border-4 border-[#111C32] bg-white p-8 text-[#111C32] shadow-2xl sm:p-12">
        <header className="text-center">
          <p className="text-lg font-extrabold uppercase tracking-[0.2em] text-orange-600">R2BOT Kids · Robot Class</p>
          <h1 className="mt-2 text-4xl font-black sm:text-5xl">Join {who}!</h1>
          <p className="mt-2 text-xl font-semibold text-slate-600">
            {cls.className}{band ? ` · ${band.emoji} ${band.name}` : ''}{cls.schoolName ? ` · ${cls.schoolName}` : ''}
          </p>
        </header>

        <div className="mt-8 rounded-3xl border-4 border-dashed border-orange-500 bg-orange-50 px-4 py-6 text-center">
          <p className="text-lg font-bold uppercase tracking-wider text-orange-700">Class code</p>
          <p className="mt-1 font-mono text-[clamp(3.5rem,14vw,7rem)] font-black leading-none tracking-[0.12em]">{formatJoinCode(cls.joinCode)}</p>
        </div>

        <ol className="mt-8 space-y-4 text-2xl font-bold">
          <li className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#111C32] text-white">1</span>
            <span>Go to <span className="whitespace-nowrap rounded-lg bg-slate-100 px-2 font-mono text-orange-700">{JOIN_URL_DISPLAY}</span></span>
          </li>
          <li className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#111C32] text-white">2</span>
            <span>Type the class code</span>
          </li>
          <li className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#111C32] text-white">3</span>
            <span>Type your first name or a robot name — that’s it! 🚀</span>
          </li>
        </ol>

        <p className="mt-10 border-t-2 border-slate-200 pt-4 text-center text-base text-slate-500">
          No email. No password. No account. Your teacher sees your stars and your robot.
        </p>
      </article>
    </div>
  )
}
