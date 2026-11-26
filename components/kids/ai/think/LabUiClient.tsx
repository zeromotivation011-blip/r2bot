'use client'

// components/kids/ai/think/LabUiClient.tsx
// Shared controls for the How Robots Think labs, sized for a child's thumb in
// the R2BOT Kids app: tier tabs, labelled sliders, big buttons, the mission
// card, and useThinkMissions() — the one place these labs call
// reportActivity(), so a mission pays out once and celebrates the same way
// everywhere.

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { reportBestRun } from '@/lib/kids/universe/rewards'
import { playSound } from '@/lib/kids-audio'
import { fireConfetti } from '@/components/kids/Confetti'
import { getProgress } from '@/lib/kids-progress'
import { TIER_NAMES, type TierName } from '@/lib/kids/universe/tiers'
import { loadDone, saveDone, tierFromBand, TIER_AGES, type LabId, type ThinkMission } from '@/lib/kids/ai/think/common'

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(' ')
}

const FOCUS = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

export function TierTabs({ tier, onChange }: { tier: TierName; onChange: (t: TierName) => void }) {
  return (
    <div role="tablist" aria-label="Level" className="grid grid-cols-4 gap-1 rounded-2xl border border-white/10 bg-[#111C32] p-1">
      {TIER_NAMES.map((t) => (
        <button
          key={t}
          role="tab"
          aria-selected={tier === t}
          onClick={() => {
            playSound('click')
            onChange(t)
          }}
          className={cx(
            'min-h-12 rounded-xl px-1 text-center font-display text-sm font-bold transition active:scale-[.97]',
            FOCUS,
            tier === t ? 'bg-amber-500 text-[#1A1103]' : 'text-slate-300',
          )}
        >
          {t}
          <span className={cx('block text-[11px] font-medium', tier === t ? 'text-[#1A1103]/80' : 'text-slate-400')}>{TIER_AGES[t]}</span>
        </button>
      ))}
    </div>
  )
}

export function Btn({
  children,
  onClick,
  kind = 'secondary',
  disabled,
  pressed,
  className,
  label,
}: {
  children: ReactNode
  onClick: () => void
  kind?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  pressed?: boolean
  className?: string
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={label}
      className={cx(
        'min-h-12 rounded-2xl px-4 font-display text-base font-bold transition active:scale-[.97] disabled:opacity-40',
        FOCUS,
        kind === 'primary' && 'bg-amber-500 text-[#1A1103] shadow-[0_8px_24px_rgba(0,0,0,.45)]',
        kind === 'secondary' && (pressed ? 'border border-amber-400 bg-amber-500/20 text-amber-200' : 'border border-white/15 bg-white/[0.06] text-white'),
        kind === 'ghost' && 'text-slate-300 underline-offset-4',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  hint,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format?: (v: number) => string
  hint?: string
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold text-slate-200">{label}</span>
        <span className="font-display font-bold tabular-nums text-amber-300">{format ? format(value) : value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cx('think-range mt-1 h-11 w-full cursor-pointer accent-amber-500', FOCUS)}
      />
      {hint && <span className="block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

export function Stat({ label, value, tone = 'plain' }: { label: string; value: string; tone?: 'plain' | 'good' | 'bad' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={cx('font-display text-xl font-bold tabular-nums', tone === 'good' ? 'text-emerald-400' : tone === 'bad' ? 'text-rose-300' : 'text-white')}>{value}</div>
    </div>
  )
}

export function Panel({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-3 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-4', className)}>
      {title && <h3 className="mb-2 font-display text-base font-bold text-white">{title}</h3>}
      {children}
    </section>
  )
}

/** Tier from the child's saved band (once, after mount), changeable by tabs. */
export function useTier(): [TierName, (t: TierName) => void] {
  const [tier, setTier] = useState<TierName>('Cadet')
  useEffect(() => {
    setTier(tierFromBand(getProgress().band))
  }, [])
  return [tier, setTier]
}

export interface MissionState<M extends ThinkMission> {
  done: string[]
  /** The mission just completed, for the celebration card. */
  justDone: M | null
  dismiss: () => void
  /** Call with every mission whose check passes right now. */
  complete: (m: M) => void
}

export function useThinkMissions<M extends ThinkMission>(lab: LabId): MissionState<M> {
  const [done, setDone] = useState<string[]>([])
  const [justDone, setJustDone] = useState<M | null>(null)
  const doneRef = useRef<string[]>([])
  useEffect(() => {
    // The local list, plus missions the progress store already paid for (a restored
    // backup carries personalBests but not this device-only list).
    const prefix = `think-${lab}-`
    const paid = Object.keys(getProgress().personalBests)
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length))
    doneRef.current = Array.from(new Set([...loadDone(lab), ...paid]))
    setDone(doneRef.current)
  }, [lab])
  const complete = useCallback(
    (m: M) => {
      if (doneRef.current.includes(m.id)) return
      doneRef.current = [...doneRef.current, m.id]
      saveDone(lab, doneRef.current)
      setDone(doneRef.current)
      setJustDone(m)
      // score 1 = 'finished once': reportBestRun pays the first finish only, on any device.
      reportBestRun({ kind: 'activity', id: `think-${lab}-${m.id}`, xp: m.xp, badges: m.badges, score: 1 })
      playSound('star')
      fireConfetti()
    },
    [lab],
  )
  const dismiss = useCallback(() => setJustDone(null), [])
  return { done, justDone, dismiss, complete }
}

export function MissionList<M extends ThinkMission>({
  missions,
  done,
  activeId,
  onPick,
}: {
  missions: M[]
  done: string[]
  activeId?: string | null
  onPick?: (m: M) => void
}) {
  return (
    <ol className="space-y-2">
      {missions.map((m, i) => {
        const isDone = done.includes(m.id)
        const active = activeId === m.id
        const body = (
          <>
            <span
              aria-hidden
              className={cx(
                'mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full font-display text-sm font-bold',
                isDone ? 'bg-emerald-500 text-[#06240F]' : 'bg-white/10 text-slate-200',
              )}
            >
              {isDone ? '✓' : i + 1}
            </span>
            <span className="min-w-0 text-left">
              <span className="block font-display font-bold text-white">
                {m.title}
                {isDone && <span className="sr-only"> (done)</span>}
              </span>
              <span className="block text-sm text-slate-300">{m.goal}</span>
            </span>
          </>
        )
        return (
          <li key={m.id}>
            {onPick ? (
              <button
                type="button"
                onClick={() => onPick(m)}
                aria-pressed={active}
                className={cx(
                  'flex min-h-12 w-full gap-3 rounded-2xl border p-3 transition active:scale-[.99]',
                  FOCUS,
                  active ? 'border-amber-400 bg-amber-500/10' : 'border-white/10 bg-white/[0.03]',
                )}
              >
                {body}
              </button>
            ) : (
              <div className={cx('flex gap-3 rounded-2xl border p-3', isDone ? 'border-emerald-500/40 bg-emerald-500/[0.06]' : 'border-white/10 bg-white/[0.03]')}>{body}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** Mission-complete card. `hold` keeps it out of the way (e.g. while a test run plays) without losing it. */
export function MissionDone<M extends ThinkMission>({ mission, onClose, hold = false }: { mission: M | null; onClose: () => void; hold?: boolean }) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (mission && !hold) ref.current?.focus({ preventScroll: true })
  }, [mission, hold])
  if (!mission || hold) return null
  return (
    <div role="status" aria-live="polite" className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-40 mx-auto max-w-md rounded-[20px] border border-emerald-400/50 bg-[#0E2A22] p-4 shadow-[0_8px_24px_rgba(0,0,0,.6)] motion-safe:animate-[slide-up-fade_.25s_cubic-bezier(.22,.61,.36,1)]">
      <p className="font-display text-lg font-bold text-emerald-300">Mission complete: {mission.title}</p>
      <p className="mt-1 text-[15px] text-slate-100">{mission.lesson}</p>
      <p className="mt-1 text-sm font-semibold text-amber-300">+{mission.xp} XP</p>
      <button ref={ref} type="button" onClick={onClose} className={cx('mt-3 min-h-12 w-full rounded-2xl bg-amber-500 font-display font-bold text-[#1A1103]', FOCUS)}>
        Keep going
      </button>
    </div>
  )
}

/** Logical-pixel canvas sizing that stays sharp on high-DPI phones but caps the cost on cheap ones. */
export function fitCanvas(c: HTMLCanvasElement, cssW: number, cssH: number): CanvasRenderingContext2D | null {
  const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)
  const w = Math.max(1, Math.round(cssW * dpr))
  const h = Math.max(1, Math.round(cssH * dpr))
  if (c.width !== w || c.height !== h) {
    c.width = w
    c.height = h
  }
  const ctx = c.getContext('2d')
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return ctx
}

/** Width of an element, kept current on resize/rotation. */
export function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setW(el.clientWidth)
    update()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}
