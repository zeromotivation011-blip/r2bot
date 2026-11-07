'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import CourseWaitlist from '@/components/CourseWaitlist'

interface L { id: string; title: string; summary: string; durationMin: number; videoReady: boolean }
interface Nav { slug: string; title: string }
interface Props {
  slug: string; title: string; description: string; tagline?: string; outcome?: string
  level: string; order?: number; totalCourses: number; whoFor?: string; prerequisites?: string; presenters?: string[]
  outcomes: string[]; minutes: number; draft: boolean; lessons: L[]
  finalActivity?: { title: string; prompt: string }
  prev: Nav | null; next: Nav | null
}
interface Progress { signedIn: boolean; completed?: string[]; certificateId?: string | null; assignment?: string | null }

export default function CourseOverviewClient(p: Props) {
  const [prog, setProg] = useState<Progress | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)

  useEffect(() => {
    fetch(`/api/courses/progress?course=${encodeURIComponent(p.slug)}`).then((r) => r.json()).then((d: Progress) => {
      setProg(d)
      if (d.assignment) setText(d.assignment)
    }).catch(() => setProg({ signedIn: false }))
  }, [p.slug])

  const done = new Set(prog?.completed ?? [])
  const readyCount = p.lessons.filter((l) => l.videoReady).length
  const pct = Math.round((done.size / p.lessons.length) * 100)
  // Never start someone on a lesson whose video does not exist. Course 2's
  // first lesson is not recorded while lessons 2-10 are, so "Start the course"
  // used to land on an empty player.
  const next =
    p.lessons.find((l) => l.videoReady && !done.has(l.id)) ??
    p.lessons.find((l) => l.videoReady) ??
    p.lessons[0]
  const allLessonsDone = done.size >= p.lessons.length
  const submitted = !!prog?.assignment

  async function submit() {
    setBusy(true); setMsg(null)
    try {
      const r = await fetch('/api/courses/assignment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseSlug: p.slug, answer: text }) })
      const d = await r.json()
      if (!r.ok) setMsg({ ok: false, t: d.error ?? 'Something went wrong.' })
      else {
        setProg((x) => ({ ...(x ?? { signedIn: true }), assignment: text.trim(), certificateId: d.certificateId ?? x?.certificateId ?? null }))
        setMsg({ ok: true, t: d.certificateId ? 'Saved. Your certificate is ready below.' : 'Saved. Finish all lessons to unlock your certificate.' })
      }
    } catch { setMsg({ ok: false, t: 'Network problem. Try again.' }) }
    setBusy(false)
  }

  return (
    <main className="max-w-3xl mx-auto px-5 py-14">
      <nav className="text-sm text-gray-500 mb-4"><Link href="/courses" className="hover:text-white">Courses</Link> / {p.title}</nav>
      {p.draft && <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-400 text-sm px-3 py-2">Draft preview — not visible to the public.</p>}
      <p className="text-xs font-bold tracking-[0.2em] uppercase text-amber-500">{p.order ? `Course ${p.order} of ${p.totalCourses} · ` : ''}{p.level} · Free · Certificate</p>
      <h1 className="text-3xl md:text-4xl font-black text-white mt-2">{p.title}</h1>
      {p.tagline && <p className="text-lg text-gray-300 mt-2">{p.tagline}</p>}
      <p className="text-gray-400 mt-3">{p.description}</p>
      <p className="text-gray-500 text-sm mt-3">{p.lessons.length} lessons · about {p.minutes} min · quiz after every lesson{p.finalActivity ? ' · final activity' : ''}{p.presenters?.length ? ` · with ${p.presenters.join(', ')}` : ''}</p>
      {/* A course with no videos is a dead end. Turn it into the one useful
          action on the page instead of ten rows that all say "Coming soon". */}
      {readyCount === 0 ? (
        <CourseWaitlist courseSlug={p.slug} courseTitle={p.title} />
      ) : readyCount < p.lessons.length ? (
        <p className="mt-4 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-300 text-sm px-3 py-2">
          {readyCount} of {p.lessons.length} lesson videos are live. The rest are being recorded, and each lesson below shows its own state.
        </p>
      ) : null}

      {prog?.signedIn && (
        <div className="mt-6 rounded-xl border border-white/10 p-4">
          <div className="flex justify-between text-sm text-gray-300"><span>Your progress</span><span>{pct}%</span></div>
          <div className="h-2 rounded bg-white/10 mt-2 overflow-hidden"><div className="h-full bg-amber-500" style={{ width: `${pct}%` }} /></div>
          {prog.certificateId && <Link href={`/verify/${prog.certificateId}`} className="inline-block mt-3 text-amber-500 underline text-sm">🎓 View your certificate →</Link>}
        </div>
      )}
      {readyCount > 0 && (
        <Link href={`/courses/${p.slug}/${next.id}`} className="btn-primary inline-flex items-center mt-6 px-5 min-h-[48px] rounded-xl font-bold">
          {done.size > 0 && done.size < p.lessons.length ? 'Continue learning →' : 'Start the course →'}
        </Link>
      )}
      {prog && !prog.signedIn && <p className="text-gray-500 text-sm mt-3">You can watch without an account. <Link href="/login" className="text-amber-500 underline">Sign in</Link> to save progress and earn the certificate.</p>}

      <h2 className="text-xl font-bold text-white mt-10">What you will be able to do</h2>
      {p.outcome && <p className="text-gray-300 mt-2">{p.outcome}</p>}
      <ul className="mt-3 space-y-1 text-gray-300 list-disc pl-5">{p.outcomes.map((o) => <li key={o}>{o}</li>)}</ul>
      {(p.whoFor || p.prerequisites) && (
        <dl className="mt-6 grid gap-3 text-sm">
          {p.whoFor && <div><dt className="text-gray-500 uppercase text-xs tracking-wider">Who it is for</dt><dd className="text-gray-300 mt-1">{p.whoFor}</dd></div>}
          {p.prerequisites && <div><dt className="text-gray-500 uppercase text-xs tracking-wider">Before you start</dt><dd className="text-gray-300 mt-1">{p.prerequisites}</dd></div>}
        </dl>
      )}

      <h2 className="text-xl font-bold text-white mt-10">Lessons</h2>
      <ol className="mt-3 space-y-2">
        {p.lessons.map((l, i) => {
          const num = (
            <span className={`mt-0.5 w-6 h-6 shrink-0 rounded-full text-xs flex items-center justify-center font-bold ${done.has(l.id) ? 'bg-green-500 text-black' : 'bg-white/10 text-gray-300'}`}>{done.has(l.id) ? '✓' : i + 1}</span>
          )
          const body = (
            <span className="flex-1"><span className="block text-white font-semibold">{l.title}</span><span className="block text-gray-400 text-sm">{l.summary} · {l.durationMin} min</span></span>
          )
          return (
            <li key={l.id}>
              {l.videoReady ? (
                <Link href={`/courses/${p.slug}/${l.id}`} className="flex items-start gap-3 rounded-xl border border-white/10 p-4 hover:border-amber-500/60">
                  {num}{body}
                </Link>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-dashed border-white/10 p-4 opacity-70">
                  {num}{body}
                  <span className="text-[11px] shrink-0 rounded-full border border-white/20 px-2 py-0.5 text-gray-400">Not recorded yet</span>
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {p.finalActivity && (
        <section id="final-activity" className="mt-10 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-amber-500">Final activity</p>
          <h2 className="text-xl font-bold text-white mt-1">{p.finalActivity.title}</h2>
          <p className="text-gray-300 mt-2">{p.finalActivity.prompt}</p>
          {!prog?.signedIn ? (
            <p className="text-gray-400 text-sm mt-3"><Link href="/login" className="text-amber-500 underline">Sign in</Link> to write and save your answer.</p>
          ) : (
            <>
              <label htmlFor="fa" className="sr-only">Your answer</label>
              <textarea id="fa" value={text} onChange={(e) => setText(e.target.value)} rows={6} maxLength={1500}
                placeholder="Write your answer here (at least a few sentences)…"
                className="mt-3 w-full rounded-xl bg-black/40 border border-white/15 p-3 text-gray-100 focus:border-amber-500 outline-none" />
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <button onClick={submit} disabled={busy || text.trim().length < 30} className="btn-primary px-5 min-h-[44px] rounded-xl font-bold disabled:opacity-50">{busy ? 'Saving…' : submitted ? 'Update my answer' : 'Submit my answer'}</button>
                <span className="text-xs text-gray-500">{text.trim().length}/1500</span>
                {submitted && <span className="text-green-400 text-sm">✓ Submitted</span>}
              </div>
              {msg && <p className={`text-sm mt-2 ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.t}</p>}
              <p className="text-xs text-gray-500 mt-3">Your certificate unlocks when all {p.lessons.length} lessons are passed{allLessonsDone ? ' (done)' : ''} and this activity is submitted.</p>
            </>
          )}
        </section>
      )}

      <div className="mt-12 flex justify-between gap-3 flex-wrap">
        {p.prev ? <Link href={`/courses/${p.prev.slug}`} className="rounded-xl border border-white/15 px-4 py-3 text-gray-300 text-sm">← Previous course: {p.prev.title}</Link> : <span />}
        {p.next && <Link href={`/courses/${p.next.slug}`} className="rounded-xl border border-amber-500/40 px-4 py-3 text-amber-400 text-sm font-semibold">Next course: {p.next.title} →</Link>}
      </div>
    </main>
  )
}
