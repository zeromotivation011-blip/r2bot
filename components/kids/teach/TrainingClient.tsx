'use client'

// components/kids/teach/TrainingClient.tsx
// The interactive bits of /kids/teach/training. The module text is server
// HTML; these islands only keep which modules are done (localStorage, this
// device only — nothing is sent anywhere) and make the certificate PDF.
//
//   <TrainingProgressClient />            progress bar + "resume" link
//   <TrainingCheckClient moduleId check /> the module's question + "done"
//   <TrainingCertificateClient />          name field + PDF, once all are done

import { useCallback, useEffect, useId, useState } from 'react'
import {
  TRAINING_MODULES,
  TRAINING_STORAGE_KEY,
  TRAINING_TOTAL_MINUTES,
  type TrainingCheck,
} from '@/lib/kids/teach/training'

const EVENT = 'r2bot:kids-training'

interface Stored {
  done: Record<string, string>
  name?: string
}

function load(): Stored {
  if (typeof window === 'undefined') return { done: {} }
  try {
    const raw = window.localStorage.getItem(TRAINING_STORAGE_KEY)
    if (!raw) return { done: {} }
    const o = JSON.parse(raw) as Partial<Stored>
    const done: Record<string, string> = {}
    if (o.done && typeof o.done === 'object') {
      for (const [k, v] of Object.entries(o.done)) if (typeof v === 'string' && TRAINING_MODULES.some((m) => m.id === k)) done[k] = v
    }
    return { done, name: typeof o.name === 'string' ? o.name.slice(0, 60) : undefined }
  } catch {
    return { done: {} }
  }
}

function store(next: Stored): void {
  try {
    window.localStorage.setItem(TRAINING_STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* private mode: progress lasts for this visit only */
  }
  window.dispatchEvent(new CustomEvent(EVENT))
}

function useTraining(): [Stored | null, (fn: (s: Stored) => Stored) => void] {
  const [state, setState] = useState<Stored | null>(null)
  useEffect(() => {
    const read = () => setState(load())
    read()
    window.addEventListener(EVENT, read)
    window.addEventListener('storage', read)
    return () => {
      window.removeEventListener(EVENT, read)
      window.removeEventListener('storage', read)
    }
  }, [])
  const update = useCallback((fn: (s: Stored) => Stored) => store(fn(load())), [])
  return [state, update]
}

export function TrainingProgressClient() {
  const [s] = useTraining()
  const done = s ? Object.keys(s.done).length : 0
  const total = TRAINING_MODULES.length
  const next = s ? TRAINING_MODULES.find((m) => !s.done[m.id]) : TRAINING_MODULES[0]
  const pct = Math.round((done / total) * 100)
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4 sm:p-5" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-lg font-bold text-white">
          {s === null ? `${total} modules · about ${TRAINING_TOTAL_MINUTES} minutes` : done === total ? 'All modules done — your certificate is ready' : `${done} of ${total} modules done`}
        </p>
        {s !== null && next && (
          <a href={`#${next.id}`} className="inline-flex min-h-[44px] items-center rounded-xl bg-amber-500 px-4 text-sm font-bold text-[#1A1103] hover:bg-amber-400">
            {done === 0 ? 'Start module 1' : `Resume: module ${next.number}`}
          </a>
        )}
        {s !== null && !next && (
          <a href="#certificate" className="inline-flex min-h-[44px] items-center rounded-xl bg-amber-500 px-4 text-sm font-bold text-[#1A1103] hover:bg-amber-400">Get the certificate</a>
        )}
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Training progress">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
      </div>
      <ol className="mt-3 flex flex-wrap gap-2" aria-label="Modules">
        {TRAINING_MODULES.map((m) => {
          const ok = !!s?.done[m.id]
          return (
            <li key={m.id}>
              <a href={`#${m.id}`} className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 text-sm font-semibold ${ok ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200' : 'border-white/10 text-slate-300 hover:border-white/25'}`}>
                <span aria-hidden>{ok ? '✓' : m.number}</span>
                <span className="max-w-[12rem] truncate">{m.title}</span>
                {ok && <span className="sr-only">(done)</span>}
              </a>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export function TrainingCheckClient({ moduleId, check }: { moduleId: string; check: TrainingCheck }) {
  const [s, update] = useTraining()
  const [picked, setPicked] = useState<number | null>(null)
  const name = useId()
  const done = !!s?.done[moduleId]
  const correct = picked === check.answer

  function choose(i: number) {
    setPicked(i)
    if (i === check.answer) {
      update((cur) => ({ ...cur, done: { ...cur.done, [moduleId]: new Date().toISOString() } }))
    }
  }

  return (
    <fieldset className="mt-6 rounded-[20px] border border-amber-400/25 bg-amber-500/[0.06] p-4 sm:p-5">
      <legend className="px-1 text-xs font-bold uppercase tracking-wider text-amber-300">Quick check</legend>
      <p className="font-bold text-white">{check.question}</p>
      <div className="mt-3 grid gap-2">
        {check.options.map((o, i) => {
          const chosen = picked === i
          const state = chosen ? (i === check.answer ? 'border-emerald-400 bg-emerald-500/15' : 'border-amber-300/70 bg-amber-500/10') : 'border-white/10 bg-black/20 hover:border-white/30'
          return (
            <label key={o} className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-[15px] text-slate-100 transition ${state}`}>
              <input type="radio" name={name} checked={chosen} onChange={() => choose(i)} className="h-5 w-5 shrink-0 accent-amber-500" />
              {o}
            </label>
          )
        })}
      </div>
      <div aria-live="polite">
        {picked !== null && (
          <p className={`mt-3 rounded-xl p-3 text-sm ${correct ? 'bg-emerald-500/15 text-emerald-100' : 'bg-white/5 text-slate-200'}`}>
            <strong>{correct ? 'Yes. ' : 'Not quite — try another. '}</strong>{check.why}
          </p>
        )}
        {done && picked === null && (
          <p className="mt-3 text-sm font-semibold text-emerald-300">✓ Module done on this device.</p>
        )}
      </div>
    </fieldset>
  )
}

export function TrainingCertificateClient() {
  const [s, update] = useTraining()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const id = useId()

  useEffect(() => {
    if (s?.name && !name) setName(s.name)
  }, [s, name])

  const done = s ? Object.keys(s.done).length : 0
  const total = TRAINING_MODULES.length
  const complete = done >= total

  async function download(e: React.FormEvent) {
    e.preventDefault()
    const clean = name.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60)
    if (clean.length < 2) {
      setError('Type your name as you want it on the certificate.')
      return
    }
    setError(null)
    setBusy(true)
    update((cur) => ({ ...cur, name: clean }))
    try {
      const dates = Object.values(load().done).map((d) => Date.parse(d)).filter(Number.isFinite)
      const { downloadTrainingCertificate } = await import('@/lib/kids/teach/pdf')
      await downloadTrainingCertificate({
        name: clean,
        modules: total,
        minutes: TRAINING_TOTAL_MINUTES,
        date: dates.length ? new Date(Math.max(...dates)) : new Date(),
      })
    } catch {
      setError('The PDF could not be made on this device. Try another browser.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="certificate" className="scroll-mt-24 rounded-[28px] border border-amber-400/40 bg-gradient-to-b from-amber-500/[0.12] to-white/[0.02] p-6 sm:p-8" aria-labelledby="cert-h">
      <h2 id="cert-h" className="font-display text-2xl font-bold text-white">Your certificate</h2>
      {!complete ? (
        <p className="mt-2 text-[15px] leading-relaxed text-slate-200">
          Answer each module’s quick check to finish it. {s === null ? '' : `You have ${total - done} to go.`} Your certificate appears here when all {total} are done.
          Progress is kept on this device only.
        </p>
      ) : (
        <form onSubmit={download} className="mt-3 max-w-xl space-y-3" noValidate>
          <p className="text-[15px] text-slate-200">All {total} modules done. Type your name as it should appear — it stays on this device.</p>
          <label htmlFor={id} className="block text-sm font-semibold text-slate-200">Name on the certificate</label>
          <input
            id={id}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            autoComplete="name"
            placeholder="Ms A. Rao"
            className="min-h-[48px] w-full rounded-xl border border-white/15 bg-black/40 px-3 text-base text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/40"
          />
          {error && <p role="alert" className="text-sm font-semibold text-red-200">{error}</p>}
          <button type="submit" disabled={busy} className="inline-flex min-h-[48px] items-center rounded-xl bg-amber-500 px-6 font-bold text-[#1A1103] hover:bg-amber-400 disabled:opacity-60">
            {busy ? 'Making your certificate…' : 'Download certificate (PDF)'}
          </button>
        </form>
      )}
    </section>
  )
}
