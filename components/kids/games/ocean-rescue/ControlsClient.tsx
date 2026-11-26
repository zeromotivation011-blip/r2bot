'use client'

// components/kids/games/ocean-rescue/ControlsClient.tsx
// Small shared controls for Deep Sea Rescue: a hold-to-thrust pad button, a
// labelled slider with ± steppers, and the "why it happened" debrief card.

import { useCallback, useEffect, useRef, type ReactNode } from 'react'

/** Pressed while a finger/mouse is down on it (thrusters). */
export function PadButton({ label, onChange, children, className = '' }: { label: string; onChange: (down: boolean) => void; children: ReactNode; className?: string }) {
  const down = useRef(false)
  const set = useCallback(
    (v: boolean) => {
      if (down.current === v) return
      down.current = v
      onChange(v)
    },
    [onChange],
  )
  useEffect(() => () => set(false), [set])
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault()
        ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
        set(true)
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onLostPointerCapture={() => set(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          set(true)
        }
      }}
      onKeyUp={(e) => {
        if (e.key === 'Enter' || e.key === ' ') set(false)
      }}
      onBlur={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
      className={`flex h-14 w-14 select-none items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-2xl font-black text-white transition-transform hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-95 active:bg-amber-400/30 ${className}`}
      style={{ touchAction: 'none' }}
    >
      {children}
    </button>
  )
}

export interface SliderProps {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (v: number) => void
  disabled?: boolean
  help?: ReactNode
  decimals?: number
}

export function PlanSlider({ id, label, value, min, max, step, unit, onChange, disabled, help, decimals = 0 }: SliderProps) {
  const clampV = (v: number) => Math.round(Math.max(min, Math.min(max, v)) / step) * step
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-3">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="font-display font-bold text-white">
          {label}
        </label>
        <span className="font-display text-lg font-bold text-amber-300">
          {value.toFixed(decimals)} <span className="text-sm text-white/60">{unit}</span>
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          aria-label={`Less ${label}`}
          disabled={disabled}
          onClick={() => onChange(clampV(value - step))}
          className="h-11 w-11 shrink-0 rounded-xl border border-white/20 bg-white/10 text-xl font-black text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:opacity-40"
        >
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
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-11 w-full cursor-pointer accent-amber-400 disabled:cursor-not-allowed"
          aria-describedby={help ? `${id}-help` : undefined}
        />
        <button
          type="button"
          aria-label={`More ${label}`}
          disabled={disabled}
          onClick={() => onChange(clampV(value + step))}
          className="h-11 w-11 shrink-0 rounded-xl border border-white/20 bg-white/10 text-xl font-black text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:opacity-40"
        >
          +
        </button>
      </div>
      {help && (
        <p id={`${id}-help`} className="mt-1 text-sm text-[#A7B0C0]">
          {help}
        </p>
      )}
    </div>
  )
}

export function Debrief({ won, title, why, onContinue }: { won: boolean; title: string; why: string[]; onContinue: () => void }) {
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    btn.current?.focus({ preventScroll: true })
  }, [])
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0A1120]/75 p-3 backdrop-blur-[2px]" role="dialog" aria-modal="false" aria-label="Why it happened">
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-[20px] border border-white/15 bg-gradient-to-b from-[#19263F] to-[#111C32] p-4 pb-3 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-5 sm:pb-4">
        <p className={`font-display text-xl font-bold ${won ? 'text-emerald-300' : 'text-amber-300'}`}>{won ? 'Mission complete!' : 'Not this time — here is why'}</p>
        <p className="mt-1 text-[#EEF2F8]">{title}</p>
        <h3 className="mt-3 text-sm font-bold uppercase tracking-wide text-cyan-300">Why it happened</h3>
        <ul className="mt-1 space-y-1.5 text-[15px] text-[#A7B0C0]">
          {why.map((w, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="text-cyan-300">
                ›
              </span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
        <div className="sticky bottom-0 -mx-1 mt-3 bg-gradient-to-t from-[#111C32] via-[#111C32] to-transparent px-1 pt-3">
          <button
            ref={btn}
            type="button"
            onClick={onContinue}
            className="min-h-[48px] w-full rounded-2xl bg-amber-500 font-display font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            See my result →
          </button>
        </div>
      </div>
    </div>
  )
}
