// components/kids/games/bio-bots/useAnim.ts
// Animation clocks for Bio-Bot Lab. Both pause while the tab is hidden and
// respect prefers-reduced-motion (runs jump straight to their end; idle loops
// stand still). Everything stops on unmount.

import { useEffect, useRef, useState } from 'react'

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

/** Seconds of visible time since mount, while `active`. Frozen at 0 with reduced motion. */
export function useClock(active: boolean): number {
  const reduced = useReducedMotion()
  const [t, setT] = useState(0)
  useEffect(() => {
    if (!active || reduced) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!document.hidden) setT((v) => v + dt)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, reduced])
  return t
}

/**
 * Progress 0→1 of a run that starts whenever `runId` changes to a positive
 * number. Calls onDone once at the end. With reduced motion it ends at once.
 */
export function useRun(runId: number, durationMs: number, onDone: () => void): number {
  const reduced = useReducedMotion()
  const [p, setP] = useState(0)
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    if (runId <= 0) {
      setP(0)
      return
    }
    if (reduced) {
      setP(1)
      const id = window.setTimeout(() => done.current(), 0)
      return () => window.clearTimeout(id)
    }
    let raf = 0
    let elapsed = 0
    let last = performance.now()
    let finished = false
    setP(0)
    const tick = (now: number) => {
      const dt = Math.min(50, now - last)
      last = now
      if (!document.hidden) elapsed += dt
      const v = Math.min(1, elapsed / durationMs)
      setP(v)
      if (v >= 1) {
        if (!finished) {
          finished = true
          done.current()
        }
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [runId, durationMs, reduced])
  return p
}

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** Map p from [a,b] to [0,1], clamped. */
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a))
export const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
