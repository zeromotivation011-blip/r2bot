'use client'

// components/kids/games/robot-brain/DrawPadClient.tsx
// The drawing pad: finger, pen or mouse (pointer events, touch-action none).
// Reports the drawing while you draw (throttled) so the brain predicts live.

import { useCallback, useEffect, useRef } from 'react'
import { paintDrawing } from './scene'
import type { Drawing, Pt } from './symbols'

interface Props {
  drawing: Drawing
  onChange: (d: Drawing) => void
  ink: string
  disabled?: boolean
  label: string
}

export function DrawPadClient({ drawing, onChange, ink, disabled, label }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const live = useRef<Drawing>(drawing)
  const drawingNow = useRef(false)
  const lastEmit = useRef(0)
  const sizeRef = useRef(260)

  const paint = useCallback(() => {
    const c = canvasRef.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const s = sizeRef.current
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, s, s)
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, s, s)
    ctx.strokeStyle = 'rgba(15,23,42,0.07)'
    ctx.lineWidth = 1
    for (let i = 1; i < 8; i++) {
      const p = (s * i) / 8
      ctx.beginPath()
      ctx.moveTo(p, 0)
      ctx.lineTo(p, s)
      ctx.moveTo(0, p)
      ctx.lineTo(s, p)
      ctx.stroke()
    }
    paintDrawing(ctx, live.current, 0, 0, s, ink, Math.max(5, s * 0.03))
  }, [ink])

  // External changes (clear, sample, after adding) replace what is shown.
  useEffect(() => {
    if (!drawingNow.current) {
      live.current = drawing
      paint()
    }
  }, [drawing, paint])

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const size = () => {
      const r = c.getBoundingClientRect()
      sizeRef.current = r.width
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      c.width = Math.round(r.width * dpr)
      c.height = Math.round(r.width * dpr)
      paint()
    }
    size()
    const ro = new ResizeObserver(size)
    ro.observe(c)
    return () => ro.disconnect()
  }, [paint])

  const toPt = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = Math.min(0.995, Math.max(0.005, (e.clientX - r.left) / r.width))
    const y = Math.min(0.995, Math.max(0.005, (e.clientY - r.top) / r.height))
    return [x, y]
  }

  const emit = (force: boolean) => {
    const now = performance.now()
    if (force || now - lastEmit.current > 70) {
      lastEmit.current = now
      onChange(live.current.map((s) => s.slice()))
    }
  }

  return (
    <canvas
      ref={canvasRef}
      aria-label={label}
      role="img"
      className={`aspect-square w-full touch-none select-none rounded-[20px] border-4 ${disabled ? 'cursor-not-allowed border-white/10 opacity-60' : 'cursor-crosshair border-amber-400/70'} shadow-[0_8px_24px_rgba(0,0,0,.45)]`}
      onPointerDown={(e) => {
        if (disabled) return
        e.currentTarget.setPointerCapture(e.pointerId)
        drawingNow.current = true
        live.current = [...live.current, [toPt(e)]]
        paint()
      }}
      onPointerMove={(e) => {
        if (!drawingNow.current) return
        const s = live.current[live.current.length - 1]
        const p = toPt(e)
        const q = s[s.length - 1]
        if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.006) return
        s.push(p)
        paint()
        emit(false)
      }}
      onPointerUp={() => {
        if (!drawingNow.current) return
        drawingNow.current = false
        emit(true)
      }}
      onPointerCancel={() => {
        if (!drawingNow.current) return
        drawingNow.current = false
        emit(true)
      }}
    />
  )
}
