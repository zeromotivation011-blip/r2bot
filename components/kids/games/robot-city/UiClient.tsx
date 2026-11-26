'use client'

// components/kids/games/robot-city/UiClient.tsx
// Shared controls for Robot City: a hold button (touch + keyboard), a
// labelled slider with ± steppers, a segmented choice, a stat tile and the
// "why it happened" debrief card shown before the results.

import { useCallback, useEffect, useRef, type ReactNode } from 'react'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

/** Pressed while a finger/mouse/key is down on it. */
export function HoldButton({ label, onChange, children, className = '' }: { label: string; onChange: (down: boolean) => void; children: ReactNode; className?: string }) {
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
        ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
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
      style={{ touchAction: 'none' }}
      className={`flex min-h-[52px] min-w-[52px] select-none items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-xl font-bold text-white transition-transform hover:bg-white/15 active:bg-amber-400/30 motion-safe:active:scale-95 ${FOCUS} ${className}`}
    >
      {children}
    </button>
  )
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
  fmt,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (v: number) => void
  hint?: string
  disabled?: boolean
  fmt?: (v: number) => string
}) {
  const decimals = step < 1 ? (String(step).split('.')[1]?.length ?? 1) : 0
  const show = fmt ? fmt(value) : value.toFixed(decimals)
  const nudge = (d: number) => onChange(Math.min(max, Math.max(min, Number((value + d * step).toFixed(6)))))
  return (
    <div className={disabled ? 'opacity-50' : ''}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[15px] font-semibold text-[#EEF2F8]">
          {label}
        </label>
        <span className="font-display text-lg font-bold text-amber-300">
          {show}
          <span className="ml-1 text-sm font-medium text-[#A7B0C0]">{unit}</span>
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <button type="button" disabled={disabled} onClick={() => nudge(-1)} aria-label={`Less ${label}`} className={`h-11 w-11 shrink-0 rounded-xl border border-white/15 bg-white/5 text-xl font-bold text-white hover:bg-white/10 ${FOCUS}`}>
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
          className="h-11 w-full cursor-pointer accent-amber-500"
        />
        <button type="button" disabled={disabled} onClick={() => nudge(1)} aria-label={`More ${label}`} className={`h-11 w-11 shrink-0 rounded-xl border border-white/15 bg-white/5 text-xl font-bold text-white hover:bg-white/10 ${FOCUS}`}>
          +
        </button>
      </div>
      {hint && <p className="mt-1 text-[13px] leading-snug text-[#A7B0C0]">{hint}</p>}
    </div>
  )
}

export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <div className={disabled ? 'opacity-50' : ''}>
      <p className="text-[15px] font-semibold text-[#EEF2F8]">{label}</p>
      <div role="radiogroup" aria-label={label} className="mt-1 flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`min-h-[44px] flex-1 rounded-xl px-3 text-[15px] font-bold transition ${FOCUS} ${value === o.value ? 'bg-amber-500 text-[#1A1103]' : 'border border-white/15 bg-white/5 text-[#EEF2F8] hover:bg-white/10'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Stat({ label, value, tone = 'plain' }: { label: string; value: ReactNode; tone?: 'plain' | 'good' | 'warn' | 'bad' }) {
  const c = tone === 'good' ? 'text-emerald-300' : tone === 'warn' ? 'text-amber-300' : tone === 'bad' ? 'text-rose-300' : 'text-[#EEF2F8]'
  return (
    <div className="rounded-2xl bg-white/5 px-3 py-2">
      <p className="text-[12px] font-bold uppercase tracking-wide text-[#6E7888]">{label}</p>
      <p className={`font-display text-xl font-bold ${c}`}>{value}</p>
    </div>
  )
}

export function Panel({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] ${className}`}>
      {title && <h2 className="mb-2 font-display text-lg font-bold text-[#EEF2F8]">{title}</h2>}
      {children}
    </section>
  )
}

export function PrimaryButton({ onClick, children, disabled, className = '' }: { onClick: () => void; children: ReactNode; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[52px] rounded-2xl bg-amber-500 px-5 font-display text-lg font-bold text-[#1A1103] shadow-lg transition hover:bg-amber-400 disabled:opacity-50 motion-safe:active:scale-[.97] ${FOCUS} ${className}`}
    >
      {children}
    </button>
  )
}

export function GhostButton({ onClick, children, disabled, className = '', pressed }: { onClick: () => void; children: ReactNode; disabled?: boolean; className?: string; pressed?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      className={`min-h-[48px] rounded-2xl border-2 px-4 font-bold transition disabled:opacity-50 ${pressed ? 'border-amber-300 bg-amber-400/20 text-amber-100' : 'border-white/20 bg-white/5 text-[#EEF2F8] hover:bg-white/10'} ${FOCUS} ${className}`}
    >
      {children}
    </button>
  )
}

export interface DebriefLine {
  icon: string
  text: string
}

/** "Why it happened": the round's story told from the numbers, then Results. */
export function Debrief({ title, lines, onContinue, good }: { title: string; lines: DebriefLine[]; onContinue: () => void; good: boolean }) {
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    btn.current?.focus()
  }, [])
  return (
    <div role="region" aria-label="Why it happened" className={`rounded-[20px] border-2 p-4 ${good ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-amber-300/50 bg-amber-500/10'}`}>
      <h3 className="font-display text-xl font-bold text-[#EEF2F8]">{title}</h3>
      <p className="text-[13px] font-bold uppercase tracking-wide text-[#A7B0C0]">Why it happened</p>
      <ul className="mt-2 space-y-1.5">
        {lines.map((l, i) => (
          <li key={i} className="flex gap-2 text-[15px] leading-snug text-[#EEF2F8]">
            <span aria-hidden>{l.icon}</span>
            <span>{l.text}</span>
          </li>
        ))}
      </ul>
      <button
        ref={btn}
        type="button"
        onClick={onContinue}
        className={`mt-3 min-h-[48px] rounded-2xl bg-amber-500 px-5 font-display font-bold text-[#1A1103] hover:bg-amber-400 ${FOCUS}`}
      >
        See my result →
      </button>
    </div>
  )
}
