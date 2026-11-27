'use client'

// components/kids/profiles/PicturePasswordClient.tsx — the 3-picture password
// (roadmap #41/#90). A 5-year-old cannot type a password, but can remember
// "apple, star, fish". Nine big pictures, three taps, in order. Used to SET a
// password (shows the three back, big, so a grown-up can note them) and to
// ENTER one. Not a security boundary: it keeps siblings and classmates out of
// each other's robots. Every picture is a 64px button with a spoken name.

import { useState } from 'react'
import { PASSWORD_LABELS, PASSWORD_LENGTH, PASSWORD_PICTURES } from '@/lib/kids/profiles'
import { playSound } from '@/lib/kids-audio'

export interface PicturePasswordProps {
  mode: 'set' | 'enter'
  /** Called with the 3 pictures. Return false (enter mode) for a wrong password. */
  onDone: (seq: string[]) => boolean | void
  onCancel?: () => void
  /** Shown above the grid. */
  title?: string
}

const focus = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

export default function PicturePasswordClient({ mode, onDone, onCancel, title }: PicturePasswordProps) {
  const [seq, setSeq] = useState<string[]>([])
  const [wrong, setWrong] = useState(0)
  const [msg, setMsg] = useState('')

  const tap = (e: string) => {
    if (seq.length >= PASSWORD_LENGTH) return
    const next = [...seq, e]
    setSeq(next)
    setMsg('')
    playSound('click')
    if (next.length === PASSWORD_LENGTH && mode === 'enter') {
      const ok = onDone(next)
      if (ok === false) {
        const n = wrong + 1
        setWrong(n)
        setSeq([])
        playSound('wrong')
        setMsg(n >= 3 ? 'Not quite. Ask a grown-up: they can change your pictures in the parent hub.' : 'Not quite. Try your three pictures again!')
      }
    }
  }

  const heading = title ?? (mode === 'set' ? 'Pick 3 secret pictures' : 'Tap your 3 secret pictures')

  return (
    <div className="mx-auto w-full max-w-sm text-center">
      <p className="font-display text-2xl font-bold text-[#EEF2F8]">{heading}</p>
      {mode === 'set' && <p className="mt-1 text-base text-[#A7B0C0]">Remember them in order. That is your key.</p>}

      {/* The three slots */}
      <div className="mt-4 flex justify-center gap-3" aria-live="polite" aria-label={`${seq.length} of ${PASSWORD_LENGTH} pictures chosen`}>
        {Array.from({ length: PASSWORD_LENGTH }, (_, i) => (
          <span
            key={i}
            className={`grid h-16 w-16 place-items-center rounded-2xl border-2 text-4xl ${seq[i] ? 'border-amber-400 bg-amber-400/10' : 'border-dashed border-white/20 bg-[#111C32]'}`}
          >
            {mode === 'enter' && seq[i] ? <span aria-hidden className="h-4 w-4 rounded-full bg-amber-300" /> : <span aria-hidden>{seq[i] ?? ''}</span>}
          </span>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {PASSWORD_PICTURES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => tap(e)}
            disabled={seq.length >= PASSWORD_LENGTH}
            aria-label={PASSWORD_LABELS[e]}
            className={`grid min-h-[72px] place-items-center rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] text-5xl shadow-[0_8px_24px_rgba(0,0,0,.45)] transition-transform hover:border-white/25 active:scale-[.97] motion-reduce:transition-none disabled:opacity-50 ${focus}`}
          >
            <span aria-hidden>{e}</span>
          </button>
        ))}
      </div>

      <p className="mt-3 min-h-[1.5rem] text-base font-semibold text-amber-300" role="status">{msg}</p>

      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {seq.length > 0 && (
          <button type="button" onClick={() => setSeq([])} className={`min-h-[48px] rounded-2xl border border-white/15 bg-[#19263F] px-5 font-bold text-[#EEF2F8] hover:bg-white/10 ${focus}`}>
            Start again
          </button>
        )}
        {mode === 'set' && seq.length === PASSWORD_LENGTH && (
          <button type="button" onClick={() => onDone(seq)} className={`min-h-[48px] rounded-2xl bg-amber-500 px-5 font-bold text-[#1A1103] hover:bg-amber-400 ${focus}`}>
            These are my pictures
          </button>
        )}
        {onCancel && (
          <button type="button" onClick={onCancel} className={`min-h-[48px] rounded-2xl px-5 font-bold text-[#A7B0C0] hover:text-white ${focus}`}>
            Back
          </button>
        )}
      </div>
    </div>
  )
}
