'use client'

// components/kids/games/smart-farm/FarmPartsClient.tsx
// Shared pieces of Smart Farm: buttons, a slider with ± steppers, a segmented
// choice, the "why it happened" debrief, the NDVI legend, a soil-sensor gauge
// and a playback hook that steps a simulation (pauses when the tab is hidden,
// jumps straight to the end for reduced motion).

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { playSound } from '@/lib/kids-audio'
import { ndviColour } from './model'

export const BTN_PRIMARY =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 font-display text-lg font-bold text-[#1A1103] shadow-lg transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:cursor-not-allowed disabled:opacity-40 motion-safe:active:scale-[.97]'
export const BTN_GHOST =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 font-display font-bold text-[#EEF2F8] transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:opacity-40 motion-safe:active:scale-[.97]'
export const CARD = 'rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)]'

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

/**
 * Plays frames 0..count-1 at `ms` per frame. Returns the current frame (-1 =
 * not started), whether it is playing, and controls. Pauses while the tab is
 * hidden; with reduced motion it jumps to the last frame at once.
 */
export function usePlayback(count: number, ms: number, onDone?: () => void) {
  const [frame, setFrame] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const reduced = useReducedMotion()
  const done = useRef(onDone)
  done.current = onDone

  const start = useCallback(() => {
    if (reduced) {
      setFrame(count - 1)
      setPlaying(false)
      done.current?.()
      return
    }
    setFrame(0)
    setPlaying(true)
  }, [count, reduced])

  const skip = useCallback(() => {
    setFrame(count - 1)
    setPlaying(false)
    done.current?.()
  }, [count])

  const reset = useCallback(() => {
    setFrame(-1)
    setPlaying(false)
  }, [])

  useEffect(() => {
    if (!playing) return
    let id = 0
    const tick = () => {
      if (document.hidden) return
      setFrame((f) => {
        if (f >= count - 1) return f
        return f + 1
      })
    }
    id = window.setInterval(tick, ms)
    return () => window.clearInterval(id)
  }, [playing, ms, count])

  useEffect(() => {
    if (playing && frame >= count - 1) {
      setPlaying(false)
      done.current?.()
    }
  }, [frame, playing, count])

  return { frame, playing, start, skip, reset }
}

/** Bring the playing field into view (phones stack the controls below it). */
export function showField(el: HTMLElement | null) {
  if (!el) return
  const r = el.getBoundingClientRect()
  if (r.top >= 0 && r.top < window.innerHeight * 0.4) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
}

export function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  hint,
  disabled,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (v: number) => void
  hint?: ReactNode
  disabled?: boolean
}) {
  const set = (v: number) => {
    const c = Math.max(min, Math.min(max, Math.round(v / step) * step))
    if (c !== value) playSound('click')
    onChange(+c.toFixed(4))
  }
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[15px] font-bold text-[#EEF2F8]">
          {label}
        </label>
        <output htmlFor={id} className="font-display text-lg font-bold text-amber-300">
          {Number.isInteger(step) ? value : value.toFixed(2)}
          {unit}
        </output>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <button type="button" disabled={disabled} aria-label={`Less ${label}`} onClick={() => set(value - step)} className={`${BTN_GHOST} min-w-[44px] px-0`}>
          −
        </button>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => set(Number(e.target.value))}
          className="h-11 flex-1 cursor-pointer accent-amber-500"
        />
        <button type="button" disabled={disabled} aria-label={`More ${label}`} onClick={() => set(value + step)} className={`${BTN_GHOST} min-w-[44px] px-0`}>
          +
        </button>
      </div>
      {hint && <p className="mt-1 text-[13px] leading-snug text-[#A7B0C0]">{hint}</p>}
    </div>
  )
}

export function Choice<T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string
  value: T
  options: { value: T; label: string; sub?: string }[]
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className="text-[15px] font-bold text-[#EEF2F8]">{label}</legend>
      <div className="mt-1 flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => {
              playSound('click')
              onChange(o.value)
            }}
            className={`min-h-[44px] rounded-xl border px-3 py-1 text-left text-[14px] font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:opacity-50 ${
              value === o.value ? 'border-amber-400 bg-amber-500 text-[#1A1103]' : 'border-white/15 bg-white/5 text-[#EEF2F8] hover:bg-white/10'
            }`}
          >
            {o.label}
            {o.sub && <span className={`block text-[11px] font-semibold ${value === o.value ? 'text-[#1A1103]/80' : 'text-[#A7B0C0]'}`}>{o.sub}</span>}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function Debrief({ title = 'Why it happened', tips, children }: { title?: string; tips: string[]; children?: ReactNode }) {
  return (
    <section className="rounded-[20px] border border-cyan-300/30 bg-cyan-400/[0.07] p-4" aria-live="polite">
      <h3 className="font-display text-lg font-bold text-cyan-200">🔍 {title}</h3>
      {children}
      {tips.length > 0 && (
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-snug text-[#EEF2F8]">
          {tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function NdviLegend() {
  const stops = [0.1, 0.3, 0.5, 0.7, 0.9]
  return (
    <div className="text-[12px] text-[#A7B0C0]">
      <div className="flex h-3 overflow-hidden rounded-full" aria-hidden>
        {stops.map((s) => (
          <span key={s} className="flex-1" style={{ background: ndviColour(s) }} />
        ))}
      </div>
      <div className="mt-0.5 flex justify-between">
        <span>0.1 bare soil / sick</span>
        <span>0.9 healthy</span>
      </div>
    </div>
  )
}

/** A soil-moisture gauge: the needle level, a line marking "too dry". */
export function Gauge({ value, line, label }: { value: number; line?: number; label: string }) {
  const v = Math.max(0, Math.min(100, value))
  const dry = line !== undefined && v < line
  return (
    <div className="flex items-end gap-1" role="img" aria-label={`${label}: ${Math.round(v)} %${dry ? ', too dry' : ''}`}>
      <div className="relative h-14 w-4 overflow-hidden rounded-full bg-[#0A1120] ring-1 ring-white/20">
        <div className={`absolute inset-x-0 bottom-0 transition-[height] duration-300 motion-reduce:transition-none ${dry ? 'bg-rose-500' : 'bg-cyan-400'}`} style={{ height: `${v}%` }} />
        {line !== undefined && <div className="absolute inset-x-0 h-0.5 bg-amber-300" style={{ bottom: `${line}%` }} />}
      </div>
      <span className={`font-display text-sm font-bold ${dry ? 'text-rose-300' : 'text-cyan-200'}`}>{Math.round(v)}%</span>
    </div>
  )
}

export function StepBadge({ n, of, label }: { n: number; of: number; label: string }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">
      Step {n} of {of} · {label}
    </p>
  )
}
