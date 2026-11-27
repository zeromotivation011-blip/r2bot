'use client'

// components/kids/present/LessonTimerClient.tsx — the lesson timer in Present
// mode: one countdown per phase (5/10/20/5 by default, LESSON_SHAPE). The
// phase follows the slide; the teacher can also tap a phase, pause, or add a
// minute. At zero the clock turns orange and a soft chime plays (if sound is
// on in the kids settings). Nothing is stored.

import { useEffect, useRef, useState } from 'react'
import { playSound } from '@/lib/kids-audio'

export interface TimerPhase {
  label: string
  minutes: number
}

function mmss(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function LessonTimerClient({ phases, phase, onPhase }: { phases: TimerPhase[]; phase: number; onPhase: (i: number) => void }) {
  const [left, setLeft] = useState(() => (phases[phase]?.minutes ?? 5) * 60)
  const [running, setRunning] = useState(false)
  const chimed = useRef(false)

  // A new phase resets the clock; a running clock keeps running.
  useEffect(() => {
    setLeft((phases[phase]?.minutes ?? 5) * 60)
    chimed.current = false
  }, [phase, phases])

  useEffect(() => {
    if (!running) return
    let last = performance.now()
    const id = window.setInterval(() => {
      const now = performance.now()
      const dt = (now - last) / 1000
      last = now
      setLeft((l) => l - dt)
    }, 250)
    return () => window.clearInterval(id)
  }, [running])

  useEffect(() => {
    if (left <= 0 && running && !chimed.current) {
      chimed.current = true
      playSound('correct')
    }
  }, [left, running])

  // Keyboard: T starts/pauses (Present mode ignores keys typed into inputs).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input, textarea, select')) return
      if (e.key === 't' || e.key === 'T') setRunning((r) => !r)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const over = left <= 0
  const btn = 'min-h-[44px] min-w-[44px] rounded-xl px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
  return (
    <div className="flex flex-wrap items-center gap-1.5 md:gap-2" role="group" aria-label="Lesson timer">
      <button
        type="button"
        onClick={() => onPhase((phase + 1) % phases.length)}
        className={`${btn} bg-amber-500 text-[#1A1103] md:hidden`}
        aria-label={`Part: ${phases[phase]?.label ?? ''}. Tap for the next part.`}
      >
        {phases[phase]?.minutes}′ {phases[phase]?.label} ›
      </button>
      <ol className="hidden flex-wrap gap-1 md:flex" aria-label="Lesson phases">
        {phases.map((p, i) => (
          <li key={`${p.label}-${i}`}>
            <button
              type="button"
              onClick={() => onPhase(i)}
              aria-current={i === phase ? 'step' : undefined}
              className={`${btn} ${i === phase ? 'bg-amber-500 text-[#1A1103]' : 'bg-white/[0.06] text-slate-200 hover:bg-white/10'}`}
            >
              {p.minutes}′ {p.label}
            </button>
          </li>
        ))}
      </ol>
      <span
        className={`min-w-[5.5ch] rounded-xl px-3 py-1 text-center font-display text-2xl font-bold tabular-nums md:py-1.5 md:text-3xl ${over ? 'bg-amber-500 text-[#1A1103]' : 'bg-white/[0.06] text-white'}`}
        aria-live="off"
        aria-label={over ? 'Time is up for this part' : `${mmss(left)} left in ${phases[phase]?.label ?? 'this part'}`}
      >
        {over ? 'Time!' : mmss(left)}
      </span>
      <button type="button" onClick={() => setRunning((r) => !r)} aria-pressed={running} className={`${btn} bg-white/[0.06] text-white hover:bg-white/10`}>
        {running ? 'Pause' : 'Start'}
      </button>
      <button type="button" onClick={() => { setLeft((l) => Math.max(0, l) + 60); chimed.current = false }} className={`${btn} bg-white/[0.06] text-white hover:bg-white/10`} aria-label="Add one minute">
        +1′
      </button>
    </div>
  )
}
