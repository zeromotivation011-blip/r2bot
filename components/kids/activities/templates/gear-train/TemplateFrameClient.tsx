'use client'

// components/kids/activities/templates/gear-train/TemplateFrameClient.tsx
// The shared attempt loop + feedback panel for the six mechanics templates
// (gear-train, lever-balance, simple-machines, wheel-terrain, centre-of-mass,
// motor-math). It lives here because those six folders are one family; the
// other templates import it with `../gear-train/TemplateFrameClient`.
//
//   const att = useAttempts(onSubmit, onDone)
//   ... att.submit(answer) → CheckResult (also plays the sound)
//   <FeedbackPanel att={att} onRetry={...} />
//
// Rules it enforces for every template: the child can always retry, the
// feedback is the template's own kind explanation, and after three misses a
// "finish for now" exit appears so nobody is trapped.

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { CheckResult, TemplateProps } from '@/lib/kids/activities/types'
import { playSound } from '@/lib/kids-audio'

export interface Attempts<A> {
  result: CheckResult | null
  attempts: number
  done: boolean
  submit: (answer: A) => CheckResult
  /** Clear the last result so the child can change their answer. */
  clear: () => void
  finish: () => void
}

export function useAttempts<P, A>(onSubmit: TemplateProps<P, A>['onSubmit'], onDone: TemplateProps<P, A>['onDone']): Attempts<A> {
  const [result, setResult] = useState<CheckResult | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [done, setDone] = useState(false)
  const attemptsRef = useRef(0)
  const resultRef = useRef<CheckResult | null>(null)

  const submit = useCallback(
    (answer: A) => {
      const r = onSubmit(answer)
      attemptsRef.current += 1
      resultRef.current = r
      setAttempts(attemptsRef.current)
      setResult(r)
      playSound(r.correct ? 'correct' : 'wrong')
      return r
    },
    [onSubmit],
  )

  const clear = useCallback(() => {
    resultRef.current = null
    setResult(null)
  }, [])

  const finish = useCallback(() => {
    if (done) return
    setDone(true)
    const r = resultRef.current
    const correct = !!r?.correct
    const base = r ? (r.score ?? (r.correct ? 1 : 0)) : 0
    // Effort is rewarded, not punished: a later success still earns most of the score.
    const factor = correct ? Math.max(0.5, 1 - 0.1 * (attemptsRef.current - 1)) : 1
    onDone({ correct, attempts: attemptsRef.current, score: Math.round(base * factor * 100) / 100 })
  }, [done, onDone])

  return { result, attempts, done, submit, clear, finish }
}

/** True when the user asked the OS for reduced motion. Updates live. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}

/** requestAnimationFrame loop that pauses while the tab is hidden. `cb` gets seconds since the last frame (capped). */
export function useAnimationFrame(active: boolean, cb: (dt: number) => void): void {
  const cbRef = useRef(cb)
  cbRef.current = cb
  useEffect(() => {
    if (!active) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!document.hidden) cbRef.current(dt)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active])
}

/**
 * Keeps SVG text and tap targets readable when a viewBox is scaled down on a
 * phone. Attach `ref` to the <svg>; `px(n)` is how many viewBox units make n
 * real pixels, and `font(base)` is `base` but never under 12 rendered px.
 * The first render (server and client) assumes 1:1, so hydration matches.
 */
export function useSvgScale<T extends Element = SVGSVGElement>(
  viewBoxWidth: number,
  /** Pass when the svg has a fixed CSS height (then it may be scaled by height, not width). */
  viewBoxHeight?: number,
): {
  ref: RefObject<T | null>
  px: (n: number) => number
  font: (base: number, minPx?: number) => number
} {
  const ref = useRef<T | null>(null)
  const [k, setK] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const update = () => {
      const { width: w, height: h } = el.getBoundingClientRect()
      if (!(w > 0)) return
      // preserveAspectRatio "meet": the smaller of the two scales wins.
      const kw = viewBoxWidth / w
      const kh = viewBoxHeight && h > 0 ? viewBoxHeight / h : 0
      setK(Math.round(Math.max(kw, kh) * 100) / 100)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [viewBoxWidth, viewBoxHeight])
  const px = useCallback((n: number) => n * k, [k])
  const font = useCallback((base: number, minPx = 12) => Math.round(Math.max(base, minPx * k) * 10) / 10, [k])
  return { ref, px, font }
}

export const btnPrimary =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 font-display text-lg font-bold text-[#1A1103] shadow-[0_8px_24px_rgba(0,0,0,.45)] transition-transform duration-150 hover:bg-amber-400 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
export const btnGhost =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-4 font-bold text-[#EEF2F8] transition-transform duration-150 hover:border-white/30 hover:bg-white/10 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
export const chip =
  'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border px-3 font-display font-bold transition-transform duration-150 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

/** The outer card every mechanics template sits in. */
export function TemplateCard({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section
      aria-label={label}
      className="w-full rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-3 text-[#EEF2F8] shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-5"
    >
      {children}
    </section>
  )
}

/** A labelled number readout (big digits in Space Grotesk). */
export function Readout({ label, value, unit, tone = 'plain' }: { label: string; value: string; unit?: string; tone?: 'plain' | 'good' | 'bad' | 'cyan' }) {
  const colour = tone === 'good' ? 'text-[#22C55E]' : tone === 'bad' ? 'text-amber-300' : tone === 'cyan' ? 'text-[#00E5FF]' : 'text-[#EEF2F8]'
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-[#111C32] px-3 py-2">
      <p className="truncate text-xs font-semibold uppercase tracking-wide text-[#A7B0C0]">{label}</p>
      <p className={`font-display text-xl font-bold tabular-nums ${colour}`}>
        {value}
        {unit && <span className="ml-1 text-sm font-semibold text-[#A7B0C0]">{unit}</span>}
      </p>
    </div>
  )
}

interface FeedbackProps<A> {
  att: Attempts<A>
  /** Called when the child taps "Try again" (the template may reset its animation). */
  onRetry?: () => void
}

/** Shows the check result; offers Try again / Finish. Announced to screen readers. */
export function FeedbackPanel<A>({ att, onRetry }: FeedbackProps<A>) {
  const { result, attempts, done } = att
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (result) ref.current?.focus()
  }, [result])
  if (!result) return null
  const good = result.correct
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      aria-live="polite"
      className={`mt-3 rounded-[20px] border p-4 outline-none motion-safe:animate-[fadeIn_.25s_cubic-bezier(.22,.61,.36,1)] ${
        good ? 'border-[#22C55E]/50 bg-[#22C55E]/10' : 'border-amber-400/50 bg-amber-500/10'
      }`}
    >
      <p className={`font-display text-lg font-bold ${good ? 'text-[#22C55E]' : 'text-amber-300'}`}>
        {good ? 'It works!' : attempts >= 3 ? 'Nearly — look at the numbers' : 'Not yet — here is why'}
      </p>
      <p className="mt-1 text-[17px] leading-relaxed text-[#EEF2F8]">{result.feedback}</p>
      {!done && (
        <div className="mt-3 flex flex-wrap gap-2">
          {good ? (
            <button type="button" className={btnPrimary} onClick={att.finish}>
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => {
                  playSound('click')
                  att.clear()
                  onRetry?.()
                }}
              >
                Try again
              </button>
              {attempts >= 3 && (
                <button type="button" className={btnGhost} onClick={att.finish}>
                  Finish for now
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
