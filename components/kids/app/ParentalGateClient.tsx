'use client'

// components/kids/app/ParentalGateClient.tsx — the "Grown-ups only" check.
//
// The same pattern as the app's offline page (apps/kids-mobile/www/index.html):
// a multiplication question written in words, answered on a keypad. Easy for an
// adult, not something a young child passes by tapping at random (Apple Kids
// category guideline 1.3, Google Play Families). Native <dialog> + showModal()
// gives focus trapping and Escape-to-cancel for free.

import { useCallback, useEffect, useRef, useState } from 'react'

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'C'] as const

function newQuestion(): { a: number; b: number } {
  return { a: 6 + Math.floor(Math.random() * 4), b: 3 + Math.floor(Math.random() * 6) }
}

export interface ParentalGateProps {
  /** Where the link goes, shown to the grown-up. Null = closed. */
  target: string | null
  onPass: () => void
  onCancel: () => void
}

export function ParentalGate({ target, onPass, onCancel }: ParentalGateProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const [q, setQ] = useState(newQuestion)
  const [entry, setEntry] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (target) {
      setQ(newQuestion())
      setEntry('')
      setErr('')
      if (!d.open) d.showModal()
    } else if (d.open) {
      d.close()
    }
  }, [target])

  const press = useCallback((k: string) => {
    setErr('')
    setEntry((e) => (k === '⌫' ? e.slice(0, -1) : k === 'C' ? '' : e.length < 3 ? e + k : e))
  }, [])

  const submit = useCallback(() => {
    if (entry !== '' && Number(entry) === q.a * q.b) {
      onPass()
    } else {
      setQ(newQuestion())
      setEntry('')
      setErr('Not quite — here is a new question.')
    }
  }, [entry, q, onPass])

  // Physical keyboards and switch access type the answer too.
  useEffect(() => {
    if (!target) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (/^[0-9]$/.test(e.key)) { press(e.key); e.preventDefault() }
      else if (e.key === 'Backspace') { press('⌫'); e.preventDefault() }
      else if (e.key === 'Enter') {
        const t = e.target as HTMLElement | null
        if (t?.dataset.gateCancel) return
        e.preventDefault()
        submit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [target, press, submit])

  let host = ''
  try {
    if (target) host = new URL(target, window.location.href).host
  } catch {
    host = ''
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="kids-gate-title"
      onCancel={(e) => { e.preventDefault(); onCancel() }}
      className="w-[min(92vw,380px)] rounded-[28px] border border-white/15 bg-[#111C32] p-6 text-[#EEF2F8] shadow-[0_8px_24px_rgba(0,0,0,.45)] backdrop:bg-[#0A1120]/80"
    >
      <h2 id="kids-gate-title" className="font-display text-2xl font-black">Grown-ups only</h2>
      <p className="mt-2 text-base text-[#A7B0C0]">
        This link leaves R2BOT Kids{host ? <> for <strong className="text-white">{host}</strong></> : null}. Ask a grown-up to answer:
      </p>
      <p className="mt-4 font-display text-xl font-bold text-amber-300" aria-live="polite">
        What is {WORDS[q.a]} times {WORDS[q.b]}?
      </p>
      <p
        className="mt-3 min-h-[56px] rounded-2xl border border-white/15 bg-[#0A1120] px-4 py-3 text-center font-display text-3xl font-black tracking-widest"
        aria-label={entry ? `Answer typed: ${entry}` : 'No answer typed yet'}
      >
        {entry}
      </p>
      <p className="mt-2 min-h-[1.5rem] text-sm font-bold text-rose-300" role="alert">{err}</p>
      <div className="mt-1 grid grid-cols-3 gap-2">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            aria-label={k === '⌫' ? 'Delete' : k === 'C' ? 'Clear' : k}
            className="min-h-[52px] rounded-2xl border border-white/10 bg-[#19263F] font-display text-xl font-black hover:bg-[#223252] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            {k}
          </button>
        ))}
      </div>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          data-gate-cancel="1"
          onClick={onCancel}
          className="min-h-[48px] flex-1 rounded-2xl border border-white/20 font-bold text-[#EEF2F8] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          className="min-h-[48px] flex-1 rounded-2xl bg-amber-500 font-black text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
        >
          Continue
        </button>
      </div>
    </dialog>
  )
}
