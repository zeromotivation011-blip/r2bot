'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface L { id: string; title: string; summary: string; durationMin: number }
interface Props { slug: string; title: string; description: string; level: string; outcomes: string[]; minutes: number; draft: boolean; lessons: L[] }
interface Progress { signedIn: boolean; completed?: string[]; certificateId?: string | null }

export default function CourseOverviewClient(p: Props) {
  const [prog, setProg] = useState<Progress | null>(null)
  useEffect(() => {
    fetch(`/api/courses/progress?course=${encodeURIComponent(p.slug)}`).then((r) => r.json()).then(setProg).catch(() => setProg({ signedIn: false }))
  }, [p.slug])
  const done = new Set(prog?.completed ?? [])
  const pct = Math.round((done.size / p.lessons.length) * 100)
  const next = p.lessons.find((l) => !done.has(l.id)) ?? p.lessons[0]
  return (
    <main className="max-w-3xl mx-auto px-5 py-14">
      <nav className="text-sm text-gray-500 mb-4"><Link href="/courses" className="hover:text-white">Courses</Link> / {p.title}</nav>
      {p.draft && <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-400 text-sm px-3 py-2">Draft preview — not visible to the public.</p>}
      <p className="text-xs font-bold tracking-[0.2em] uppercase text-amber-500">{p.level} · Free · Certificate</p>
      <h1 className="text-3xl md:text-4xl font-black text-white mt-2">{p.title}</h1>
      <p className="text-gray-400 mt-3">{p.description}</p>
      <p className="text-gray-500 text-sm mt-3">{p.lessons.length} lessons · {p.minutes} min</p>

      {prog?.signedIn && (
        <div className="mt-6 rounded-xl border border-white/10 p-4">
          <div className="flex justify-between text-sm text-gray-300"><span>Your progress</span><span>{pct}%</span></div>
          <div className="h-2 rounded bg-white/10 mt-2 overflow-hidden"><div className="h-full bg-amber-500" style={{ width: `${pct}%` }} /></div>
          {prog.certificateId && <Link href={`/verify/${prog.certificateId}`} className="inline-block mt-3 text-amber-500 underline text-sm">View your certificate →</Link>}
        </div>
      )}
      <Link href={`/courses/${p.slug}/${next.id}`} className="btn-primary inline-flex items-center mt-6 px-5 min-h-[48px] rounded-xl font-bold">
        {done.size > 0 && done.size < p.lessons.length ? 'Continue learning →' : 'Start the course →'}
      </Link>
      {prog && !prog.signedIn && <p className="text-gray-500 text-sm mt-3">You can watch without an account. <Link href="/login" className="text-amber-500 underline">Sign in</Link> to save progress and earn the certificate.</p>}

      <h2 className="text-xl font-bold text-white mt-10">What you will be able to do</h2>
      <ul className="mt-3 space-y-1 text-gray-300 list-disc pl-5">{p.outcomes.map((o) => <li key={o}>{o}</li>)}</ul>

      <h2 className="text-xl font-bold text-white mt-10">Lessons</h2>
      <ol className="mt-3 space-y-2">
        {p.lessons.map((l, i) => (
          <li key={l.id}>
            <Link href={`/courses/${p.slug}/${l.id}`} className="flex items-start gap-3 rounded-xl border border-white/10 p-4 hover:border-amber-500/60">
              <span className={`mt-0.5 w-6 h-6 shrink-0 rounded-full text-xs flex items-center justify-center font-bold ${done.has(l.id) ? 'bg-green-500 text-black' : 'bg-white/10 text-gray-300'}`}>{done.has(l.id) ? '✓' : i + 1}</span>
              <span><span className="block text-white font-semibold">{l.title}</span><span className="block text-gray-400 text-sm">{l.summary} · {l.durationMin} min</span></span>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  )
}
