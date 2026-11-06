'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Next { signedIn: boolean; completed?: number; total?: number; next?: { title: string; course: string; href: string } | null; daysSince?: number | null }

/** "Continue where you left off" bar for signed-in learners. */
export function ResumeStrip({ compact = false }: { compact?: boolean }) {
  const [d, setD] = useState<Next | null>(null)
  useEffect(() => { fetch('/api/start/next').then((r) => r.json()).then(setD).catch(() => {}) }, [])
  if (!d?.signedIn) return null
  const pct = d.total ? Math.round(((d.completed ?? 0) / d.total) * 100) : 0
  if (!d.next) {
    return <div className="rounded-xl border border-white/10 p-4 text-gray-300">You have finished every Academy lesson. Explore the <Link href="/courses" className="text-amber-500 underline">video courses</Link> or the <Link href="/build" className="text-amber-500 underline">build projects</Link> next.</div>
  }
  const away = (d.daysSince ?? 0) >= 5
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-amber-500">{away ? 'Welcome back — pick up where you stopped' : (d.completed ? 'Continue learning' : 'Your first lesson')}</p>
      <p className="text-white font-bold mt-1">{d.next.title}</p>
      {!compact && <p className="text-gray-400 text-sm">{d.next.course} · {d.completed ?? 0} of {d.total} lessons done ({pct}%)</p>}
      <Link href={d.next.href} className="btn-primary inline-flex items-center mt-3 px-5 min-h-[44px] rounded-xl font-bold">{d.completed ? 'Continue →' : 'Start →'}</Link>
    </div>
  )
}
