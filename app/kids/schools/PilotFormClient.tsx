'use client'

// "Request a school pilot". Goes through the one capture path: POST /api/leads
// → captureLead() in lib/lead-capture.ts, source 'kids-schools'. Adults only:
// this is the school's contact, never a child's. The page is indexable and can be
// landed on directly, so the form itself sits behind the parental gate: a child
// who arrives here sees a locked card, never a name or email field.

import { useId, useState } from 'react'
import { ParentalGate } from '@/components/kids/app/ParentalGateClient'

const ROLES = ['Teacher', 'Head of department / coordinator', 'Principal / head teacher', 'IT or digital lead', 'Parent-teacher association', 'Other'] as const

export default function PilotFormClient() {
  return (
    <ParentalGate title="For teachers and school leaders" lead="The pilot form asks for a grown-up's name and work email.">
      <PilotForm />
    </ParentalGate>
  )
}

function PilotForm() {
  const [f, setF] = useState({ name: '', email: '', school: '', country: '', role: '', students: '', website: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const id = useId()

  function set<K extends keyof typeof f>(k: K, v: string) {
    setF((p) => ({ ...p, [k]: v }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!f.name.trim() || !f.email.trim() || !f.school.trim() || !f.country.trim() || !f.role) {
      setError('Please fill in your name, work email, school, country and role.')
      return
    }
    setStatus('sending')
    try {
      const students = f.students.trim() ? Math.max(0, Math.min(100_000, Math.floor(Number(f.students)) || 0)) : null
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: f.email,
          name: f.name,
          source: 'kids-schools',
          page: window.location.pathname,
          honeypot: f.website,
          meta: {
            schoolName: f.school.slice(0, 120),
            country: f.country.slice(0, 60),
            role: f.role,
            ...(students ? { students } : {}),
          },
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; pending?: boolean }
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setStatus('idle')
        return
      }
      try {
        ;(window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('event', 'lead_capture', { method: 'kids-schools' })
      } catch { /* ignore */ }
      setPending(data.pending === true)
      setStatus('sent')
    } catch {
      setError('Network error. Please try again.')
      setStatus('idle')
    }
  }

  if (status === 'sent') {
    return (
      <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-8 text-center" role="status">
        <div className="text-4xl" aria-hidden>🎉</div>
        <h3 className="mt-2 text-xl font-extrabold text-white">Thank you — request received.</h3>
        <p className="mt-2 text-slate-200">
          We onboard school pilots in small groups and will reply personally about {f.school || 'your school'}.
          {pending ? ' We have also sent a one-click email to confirm your address.' : ''}
        </p>
        <p className="mt-3 text-sm text-slate-400">Want to look now? Create a class at <a href="/kids/classroom" className="font-semibold text-amber-300 underline">/kids/classroom</a> — it takes a minute.</p>
      </div>
    )
  }

  const input = 'mt-1.5 min-h-[48px] w-full rounded-xl border border-white/15 bg-black/40 px-3 text-base text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none'
  const label = 'block text-sm font-semibold text-slate-200'

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-describedby={error ? `${id}-err` : undefined}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-name`} className={label}>Your name</label>
          <input id={`${id}-name`} autoComplete="name" maxLength={80} value={f.name} onChange={(e) => set('name', e.target.value)} className={input} required />
        </div>
        <div>
          <label htmlFor={`${id}-email`} className={label}>Work email</label>
          <input id={`${id}-email`} type="email" autoComplete="email" maxLength={254} value={f.email} onChange={(e) => set('email', e.target.value)} className={input} required />
        </div>
        <div>
          <label htmlFor={`${id}-school`} className={label}>School</label>
          <input id={`${id}-school`} autoComplete="organization" maxLength={120} value={f.school} onChange={(e) => set('school', e.target.value)} className={input} required />
        </div>
        <div>
          <label htmlFor={`${id}-country`} className={label}>Country</label>
          <input id={`${id}-country`} autoComplete="country-name" maxLength={60} value={f.country} onChange={(e) => set('country', e.target.value)} className={input} required />
        </div>
        <div>
          <label htmlFor={`${id}-role`} className={label}>Your role</label>
          <select id={`${id}-role`} value={f.role} onChange={(e) => set('role', e.target.value)} className={input} required>
            <option value="">Choose…</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-students`} className={label}>Number of students <span className="font-normal text-slate-500">(optional)</span></label>
          <input id={`${id}-students`} type="number" inputMode="numeric" min={1} max={100000} value={f.students} onChange={(e) => set('students', e.target.value)} className={input} />
        </div>
      </div>
      {/* Honeypot: hidden from people and assistive tech. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set('website', e.target.value)} /></label>
      </div>
      {error && <p id={`${id}-err`} role="alert" className="rounded-xl bg-red-500/15 p-3 text-sm font-semibold text-red-200">{error}</p>}
      <button type="submit" disabled={status === 'sending'} className="min-h-[52px] w-full rounded-xl bg-amber-500 px-6 text-lg font-extrabold text-black hover:bg-amber-400 disabled:opacity-60 sm:w-auto">
        {status === 'sending' ? 'Sending…' : 'Request a school pilot'}
      </button>
      <p className="text-xs text-slate-400">
        We use these details only to reply about a pilot and, if you confirm, to send R2BOT updates. Unsubscribe any time. Please do not enter children’s details here.
      </p>
    </form>
  )
}
