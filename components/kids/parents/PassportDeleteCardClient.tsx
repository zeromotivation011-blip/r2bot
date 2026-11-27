'use client'

// components/kids/parents/PassportDeleteCardClient.tsx — "Delete my Passport"
// in the parent hub (the hub is already behind the parental gate). The same
// implementation as the Garage (components/kids/hangar/passport-delete.ts):
//   - the Passport this device updates for the child playing now, one tap;
//   - or any Passport, by typing the words from its card (a parent who has the
//     card can delete it from any device, as the Trust Pack says).
// Progress on this device is never touched.

import { useEffect, useId, useState, type FormEvent } from 'react'
import { deletePassportAsGrownUp } from '@/components/kids/hangar/passport-delete'
import { PASSPORT_PARSE_MESSAGES, parsePassport } from '@/lib/kids/passport'
import { loadSavedPassport } from '@/lib/kids/passport-client'
import { KIDS_PROFILE_EVENT } from '@/lib/kids/profiles'

const card = 'rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-6'
const h2 = 'font-display text-xl font-bold text-[#EEF2F8] sm:text-2xl'
const focus = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
const danger = `min-h-[48px] rounded-2xl border-2 border-rose-400/70 px-4 font-bold text-rose-200 hover:bg-rose-500/10 disabled:opacity-60 ${focus}`

type Status = { kind: 'idle' } | { kind: 'ok' | 'error'; text: string }

export default function PassportDeleteCardClient() {
  const ids = useId()
  const [saved, setSaved] = useState<string | null>(null)
  const [words, setWords] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  useEffect(() => {
    const read = () => setSaved(loadSavedPassport()?.code ?? null)
    read()
    window.addEventListener(KIDS_PROFILE_EVENT, read)
    return () => window.removeEventListener(KIDS_PROFILE_EVENT, read)
  }, [])

  const run = async (code: string) => {
    setBusy(true)
    setStatus({ kind: 'idle' })
    try {
      const r = await deletePassportAsGrownUp(code, { gate: false })
      if (r.kind === 'cancelled') return
      if (r.kind === 'failed') {
        // The shared messages point at the Garage's backup code; say it plainly here.
        const text = r.notReady
          ? 'Robot Passports are not switched on yet, so nothing is saved on R2BOT to delete.'
          : r.offline
            ? 'No internet right now. Try again when this device is online.'
            : r.error
        setStatus({ kind: 'error', text })
        return
      }
      setSaved(loadSavedPassport()?.code ?? null)
      setWords('')
      setStatus({ kind: 'ok', text: r.text })
    } finally {
      setBusy(false)
    }
  }

  const byWords = (e: FormEvent) => {
    e.preventDefault()
    const p = parsePassport(words)
    if (!p.ok) {
      setStatus({ kind: 'error', text: PASSPORT_PARSE_MESSAGES[p.reason] })
      return
    }
    void run(p.code)
  }

  return (
    <section aria-labelledby="hub-passport" className={`${card} print:hidden`}>
      <h2 id="hub-passport" className={h2}>Robot Passport</h2>
      <p className="mt-1 text-[15px] leading-relaxed text-[#A7B0C0]">
        A Robot Passport keeps a copy of your child&rsquo;s progress on R2BOT under three secret words and a number, so it can move to another
        device. It holds no name, email or birthday, and it is deleted by itself after 400 days unused. You can delete it now.
      </p>

      {saved ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-[15px] text-[#EEF2F8]">
            This device updates <span className="font-display font-bold">{saved}</span>.
          </p>
          <button type="button" onClick={() => void run(saved)} disabled={busy} className={danger} data-testid="hub-passport-delete">
            {busy ? 'Deleting…' : 'Delete my Passport'}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-[15px] text-[#A7B0C0]">This device is not updating a Passport for the child playing now.</p>
      )}

      <form onSubmit={byWords} className="mt-4 rounded-[20px] border border-white/10 bg-[#0A1120]/60 p-3">
        <label htmlFor={`${ids}-w`} className="font-display text-base font-bold text-white">
          Delete a Passport from its card
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            id={`${ids}-w`}
            value={words}
            onChange={(e) => setWords(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="MAGNET-OTTER-NOVA-7"
            className={`min-h-[48px] min-w-0 flex-1 rounded-2xl border border-white/15 bg-[#111C32] px-3 text-[#EEF2F8] placeholder:text-[#6E7888] ${focus}`}
          />
          <button type="submit" disabled={busy} className={danger}>
            Delete it
          </button>
        </div>
      </form>

      <p className={`mt-2 min-h-[1.25rem] text-sm font-semibold ${status.kind === 'error' ? 'text-rose-300' : 'text-emerald-300'}`} role="status">
        {status.kind === 'idle' ? '' : status.text}
      </p>
    </section>
  )
}
