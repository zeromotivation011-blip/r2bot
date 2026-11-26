'use client'

// components/kids/teach/CertificateButtonClient.tsx
//
// A child's level certificate. Until every session of the level is finished it
// shows how far they are ("14 of 24 sessions — 10 to go"); then a button makes
// a printable PDF with the explorer name, their robot's name and the date.
// Everything comes from local progress; the name typed here never leaves the
// device. Wording comes from the curriculum (lib/kids/curriculum/levels.ts),
// loaded on the click only, so this island stays tiny.
//
//   <CertificateButtonClient level={1} />

import { useEffect, useId, useState } from 'react'
import { KIDS_PROGRESS_EVENT, getProgress } from '@/lib/kids-progress'
import { loadDesign } from '@/lib/kids/robot-design'
import { loadMembership } from '@/lib/kids/classroom-membership'
import { checkNickname } from '@/lib/kids/classroom'

/** Sessions per level (Level 1 is written in full: 24 sessions in four acts). */
export const SESSIONS_PER_LEVEL = 24

export function levelSessionIds(level: number): string[] {
  return Array.from({ length: SESSIONS_PER_LEVEL }, (_, i) => `L${level}-S${String(i + 1).padStart(2, '0')}`)
}

interface Status {
  done: number
  complete: boolean
  name: string
  robotName: string
  badges: number
}

function read(level: number): Status {
  const p = getProgress()
  const ids = levelSessionIds(level)
  const done = ids.filter((id) => (p.sessionsDone?.[id] ?? 0) > 0).length
  let robotName = 'my robot'
  try {
    robotName = loadDesign().name || robotName
  } catch {
    /* default */
  }
  const name = p.explorerName || loadMembership()?.nickname || ''
  const badges = Object.keys(p.badges ?? {}).length
  return { done, complete: done >= ids.length, name, robotName, badges }
}

export interface CertificateButtonProps {
  level: 1 | 2 | 3 | 4
  className?: string
}

export function CertificateButtonClient({ level, className = '' }: CertificateButtonProps) {
  const [s, setS] = useState<Status | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [made, setMade] = useState(false)
  const id = useId()

  useEffect(() => {
    const refresh = () => {
      const next = read(level)
      setS(next)
      setName((cur) => cur || next.name)
    }
    refresh()
    window.addEventListener(KIDS_PROGRESS_EVENT, refresh)
    return () => window.removeEventListener(KIDS_PROGRESS_EVENT, refresh)
  }, [level])

  // Reserve the final height so nothing shifts after hydration.
  if (!s) return <div className={`min-h-[132px] rounded-[20px] bg-white/[0.03] ${className}`} aria-hidden />

  const pct = Math.round((s.done / SESSIONS_PER_LEVEL) * 100)

  if (!s.complete) {
    return (
      <div className={`rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/[0.06] text-2xl grayscale">📜</span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold text-white">Level {level} certificate</p>
            <p className="text-sm text-slate-300">
              {s.done} of {SESSIONS_PER_LEVEL} sessions done — {SESSIONS_PER_LEVEL - s.done} to go!
            </p>
          </div>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={`Level ${level} sessions finished`} aria-valuemin={0} aria-valuemax={SESSIONS_PER_LEVEL} aria-valuenow={s.done}>
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }

  async function download(e: React.FormEvent) {
    e.preventDefault()
    const check = checkNickname(name)
    if (!check.ok) {
      setError(check.error)
      return
    }
    setError(null)
    setBusy(true)
    try {
      const [{ levelByNumber }, { downloadKidCertificate }] = await Promise.all([
        import('@/lib/kids/curriculum/levels'),
        import('@/lib/kids/teach/pdf'),
      ])
      const lvl = levelByNumber(level)
      await downloadKidCertificate({
        name: check.nickname,
        robotName: s!.robotName,
        level,
        title: lvl.certificate.title.replace(/^R2BOT Kids\s*·\s*/, '') || lvl.name,
        wording: lvl.certificate.wording,
        sessions: s!.done,
        badges: s!.badges,
        date: new Date(),
      })
      setMade(true)
    } catch {
      setError('Your certificate could not be made on this device. Ask a grown-up to try another browser.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={download} className={`rounded-[20px] border border-amber-400/50 bg-gradient-to-br from-amber-500/20 to-white/[0.03] p-4 sm:p-5 ${className}`} noValidate>
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-amber-500 text-3xl motion-safe:animate-bounce">📜</span>
        <div>
          <p className="font-display text-xl font-bold text-white">You finished Level {level}!</p>
          <p className="text-sm text-amber-100/90">All {SESSIONS_PER_LEVEL} sessions. Your certificate is ready.</p>
        </div>
      </div>
      <label htmlFor={id} className="mt-4 block text-sm font-semibold text-slate-200">Name on your certificate</label>
      <div className="mt-1.5 flex flex-wrap gap-2">
        <input
          id={id}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          autoComplete="off"
          placeholder="Your explorer name"
          className="min-h-[48px] min-w-0 flex-1 rounded-xl border border-white/15 bg-black/40 px-3 text-lg text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/40"
        />
        <button type="submit" disabled={busy} className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-amber-500 px-5 font-bold text-[#1A1103] hover:bg-amber-400 active:scale-[.97] disabled:opacity-60 motion-reduce:transform-none">
          {busy ? 'Making it…' : made ? 'Download again' : 'Get my certificate'}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-400">First name or a made-up name. It stays on this device.</p>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-200">{error}</p>}
      {made && !error && <p role="status" className="mt-2 text-sm font-semibold text-emerald-200">Saved! Ask a grown-up to print it.</p>}
    </form>
  )
}

export default CertificateButtonClient
