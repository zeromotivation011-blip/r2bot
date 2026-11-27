'use client'

// components/kids/present/JoinCornerClient.tsx — the join code and its QR
// code in a corner of Present mode, so children can join the class from the
// projector. The teacher types the class code once (or it comes in the URL as
// ?code=); it is kept for this browser tab only (sessionStorage). Nothing
// about any child is involved.

import { useEffect, useId, useState } from 'react'
import { formatJoinCode, isValidJoinCode, JOIN_PATH, JOIN_URL_DISPLAY, normaliseJoinCode } from '@/lib/kids/classroom'
import { QrCode } from './QrCode'

const KEY = 'r2bot_present_join_code'
const SITE = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in'

export default function JoinCornerClient({ initialCode, onClose }: { initialCode: string | null; onClose: () => void }) {
  const [code, setCode] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()

  useEffect(() => {
    const fromUrl = initialCode ? normaliseJoinCode(initialCode) : ''
    let stored = ''
    try {
      stored = sessionStorage.getItem(KEY) ?? ''
    } catch {
      /* private mode */
    }
    const c = isValidJoinCode(fromUrl) ? fromUrl : isValidJoinCode(stored) ? stored : null
    setCode(c)
    setEditing(false)
  }, [initialCode])

  const save = () => {
    const c = normaliseJoinCode(draft)
    if (!isValidJoinCode(c)) {
      setError('A class code has 6 letters and numbers, like ABC 234.')
      return
    }
    try {
      sessionStorage.setItem(KEY, c)
    } catch {
      /* ignore */
    }
    setCode(c)
    setError(null)
    setEditing(false)
  }

  const btn = 'min-h-[44px] rounded-xl px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
  if (!code && !editing) {
    // No class code yet: a small button, never a form over the slide.
    return (
      <div className="absolute bottom-3 right-3 z-30 flex gap-1 rounded-2xl border border-white/15 bg-[#111C32]/95 p-1 shadow-[0_8px_24px_rgba(0,0,0,.45)]">
        <button type="button" onClick={() => setEditing(true)} className={`${btn} text-amber-300 hover:bg-white/10`}>+ Show the class join code</button>
        <button type="button" onClick={onClose} className={`${btn} text-slate-300 hover:bg-white/10`} aria-label="Hide">×</button>
      </div>
    )
  }
  return (
    <aside className="absolute bottom-3 right-3 z-30 w-[min(92vw,300px)] rounded-[20px] border border-white/15 bg-[#111C32]/95 p-3 shadow-[0_8px_24px_rgba(0,0,0,.45)]" aria-label="Join our class">
      {code && !editing ? (
        <div className="flex items-center gap-3">
          <QrCode text={`${SITE}${JOIN_PATH}?code=${code}`} size={112} label={`QR code to join the class with code ${formatJoinCode(code)}`} />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Join our class</p>
            <p className="font-display text-3xl font-bold tracking-wider text-white">{formatJoinCode(code)}</p>
            <p className="text-sm text-slate-300">{JOIN_URL_DISPLAY}</p>
            <div className="mt-1 flex gap-1">
              <button type="button" onClick={() => { setDraft(code); setEditing(true) }} className={`${btn} text-amber-300 hover:bg-white/10`}>Change</button>
              <button type="button" onClick={onClose} className={`${btn} text-slate-300 hover:bg-white/10`}>Hide</button>
            </div>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <label htmlFor={inputId} className="block text-sm font-bold text-white">Your class code</label>
          <p className="text-xs text-slate-400">From your Classroom page. Shown here with a QR code.</p>
          <div className="mt-2 flex gap-2">
            <input
              id={inputId}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={9}
              placeholder="ABC 234"
              className="min-h-[44px] w-full min-w-0 rounded-xl border border-white/15 bg-[#0A1120] px-3 font-display text-xl tracking-wider text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            />
            <button type="submit" className={`${btn} bg-amber-500 text-[#1A1103] hover:bg-amber-400`}>Show</button>
          </div>
          {error && <p role="alert" className="mt-1 text-sm font-semibold text-red-200">{error}</p>}
          <button type="button" onClick={() => (code ? setEditing(false) : onClose())} className={`${btn} mt-1 text-slate-300 hover:bg-white/10`}>Cancel</button>
        </form>
      )}
    </aside>
  )
}
