'use client'

import { useState } from 'react'

/**
 * Shown on a course whose videos are not recorded yet, in place of ten rows
 * that all said "Coming soon". A dead end becomes the one thing worth doing on
 * the page: leave an email and hear about it once, when it opens.
 *
 * Posts to /api/leads, so the person gets a welcome email within seconds.
 */
export default function CourseWaitlist({ courseSlug, courseTitle }: { courseSlug: string; courseTitle: string }) {
  const [email, setEmail] = useState('')
  const [trap, setTrap] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    setError(null)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'course-waitlist',
          page: `/courses/${courseSlug}`,
          meta: { course: courseSlug },
          honeypot: trap,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; pending?: boolean }
      if (!res.ok || !data.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setState('err')
        return
      }
      setPending(data.pending === true)
      setState('ok')
    } catch {
      setError('Network error. Please try again.')
      setState('err')
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Being recorded</p>
      <h2 className="mt-1 text-xl font-bold text-white">The videos for this course are not out yet</h2>
      <p className="mt-2 text-sm text-gray-300">
        The full lesson plan is below, so you can see exactly what {courseTitle} covers. Leave your
        email and you will hear from me once — the day it opens.
      </p>

      {state === 'ok' ? (
        <p className="mt-4 font-bold text-green-400">
          {pending
            ? 'Almost done. Check your inbox and click the confirmation link — then you will hear from me the day this course opens.'
            : 'Done. You will get one email the day this course opens.'}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-wrap gap-2">
          <input
            type="text" tabIndex={-1} autoComplete="off" aria-hidden name="company"
            value={trap} onChange={(e) => setTrap(e.target.value)}
            className="absolute -left-[9999px] h-px w-px opacity-0"
          />
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com" aria-label="Your email"
            className="min-h-[44px] flex-1 basis-[220px] rounded-xl border border-white/20 bg-black/30 px-4 text-white placeholder:text-gray-500"
          />
          <button
            type="submit" disabled={state === 'sending'}
            className="min-h-[44px] rounded-xl bg-amber-500 px-5 font-bold text-black disabled:opacity-60"
          >
            {state === 'sending' ? '…' : 'Tell me when it opens'}
          </button>
        </form>
      )}
      {state === 'err' && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <p className="mt-3 text-xs text-gray-500">
        Meanwhile, the one-minute Quick Lessons and the courses that are already recorded are free to
        start.
      </p>
    </section>
  )
}
