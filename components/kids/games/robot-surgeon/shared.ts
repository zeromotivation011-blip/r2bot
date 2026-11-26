// components/kids/games/robot-surgeon/shared.ts
// Small pieces every Robot Hospital tier uses: a seeded random generator (so a
// score is fair and repeatable), an animation loop that pauses when the tab is
// hidden, a reduced-motion check, canvas sizing and the world's colours.

'use client'

import { useEffect, useRef, useState } from 'react'

/** mulberry32 — tiny, fast, seeded PRNG. Same seed, same game. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Standard normal sample from a uniform source (Box–Muller). */
export function gauss(r: () => number): number {
  const u = Math.max(1e-9, r())
  const v = r()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** True when the child (or their device) asked for less motion. */
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
 * requestAnimationFrame loop with a fixed-step simulation. `step(dt)` runs at
 * `hz`; `draw()` once per frame. Stops while the tab is hidden (no catch-up
 * burst when it comes back) and when `running` is false. Disposed on unmount.
 */
export function useSimLoop(running: boolean, step: (dt: number) => void, draw: () => void, hz = 60) {
  const stepRef = useRef(step)
  const drawRef = useRef(draw)
  stepRef.current = step
  drawRef.current = draw
  useEffect(() => {
    let raf = 0
    let last = -1
    let acc = 0
    const dt = 1 / hz
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (document.hidden) {
        last = -1
        return
      }
      if (running) {
        if (last < 0) last = now
        acc += Math.min(0.1, (now - last) / 1000)
        last = now
        let n = 0
        while (acc >= dt && n < 8) {
          stepRef.current(dt)
          acc -= dt
          n++
        }
      } else {
        last = -1
        acc = 0
      }
      drawRef.current()
    }
    raf = requestAnimationFrame(frame)
    const vis = () => {
      last = -1
      acc = 0
    }
    document.addEventListener('visibilitychange', vis)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [running, hz])
}

/** Resize a canvas to its CSS box × devicePixelRatio; returns a 2D context in CSS pixels. */
export function fitCanvas(c: HTMLCanvasElement | null): { ctx: CanvasRenderingContext2D; w: number; h: number } | null {
  if (!c) return null
  const ctx = c.getContext('2d')
  if (!ctx) return null
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = c.clientWidth
  const h = c.clientHeight
  if (w === 0 || h === 0) return null
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr)
    c.height = Math.round(h * dpr)
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { ctx, w, h }
}

export const COL = {
  void: '#0A1120',
  s1: '#111C32',
  s2: '#19263F',
  text1: '#EEF2F8',
  text2: '#A7B0C0',
  text3: '#6E7888',
  amber: '#FC6818',
  amberSoft: '#FFA878',
  cyan: '#00E5FF',
  cyanDim: '#00B8D4',
  green: '#22C55E',
  rose: '#FB7185',
  red: '#EF4444',
  floor: '#1B2A44',
  wall: '#33476B',
}

/** Rounded rectangle path. */
export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + k, y)
  ctx.arcTo(x + w, y, x + w, y + h, k)
  ctx.arcTo(x + w, y + h, x, y + h, k)
  ctx.arcTo(x, y + h, x, y, k)
  ctx.arcTo(x, y, x + w, y, k)
  ctx.closePath()
}

/** Kind haptic tap on phones that support it (never required). */
export function buzz(ms: number) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(ms)
  } catch {
    /* not supported */
  }
}
