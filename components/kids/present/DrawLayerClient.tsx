'use client'

// components/kids/present/DrawLayerClient.tsx — freeze-and-draw: a canvas
// over the frozen stage where the teacher circles, points and underlines with
// a finger, pen or mouse. Strokes live in memory only and vanish on "Done".

import { useCallback, useEffect, useRef, useState } from 'react'

type Pt = { x: number; y: number }
type Stroke = { color: string; width: number; pts: Pt[] }

const COLOURS = [
  { name: 'Orange', value: '#FC6818' },
  { name: 'Cyan', value: '#00E5FF' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Green', value: '#22C55E' },
]

export default function DrawLayerClient({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokes = useRef<Stroke[]>([])
  const current = useRef<Stroke | null>(null)
  const [color, setColor] = useState(COLOURS[0].value)
  const [count, setCount] = useState(0)

  const redraw = useCallback(() => {
    const c = canvasRef.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const s of [...strokes.current, ...(current.current ? [current.current] : [])]) {
      ctx.strokeStyle = s.color
      ctx.lineWidth = s.width
      ctx.beginPath()
      s.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
      if (s.pts.length === 1) ctx.lineTo(s.pts[0].x + 0.1, s.pts[0].y)
      ctx.stroke()
    }
  }, [])

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const fit = () => {
      const r = c.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      c.width = Math.max(1, Math.round(r.width * dpr))
      c.height = Math.max(1, Math.round(r.height * dpr))
      redraw()
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(c)
    return () => ro.disconnect()
  }, [redraw])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone()
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        strokes.current.pop()
        setCount(strokes.current.length)
        redraw()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone, redraw])

  const pos = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const btn = 'min-h-[48px] min-w-[48px] rounded-xl px-3 font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
  return (
    <div className="absolute inset-0 z-20">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-crosshair touch-none"
        aria-label="Drawing layer. Draw with a finger, pen or mouse."
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          current.current = { color, width: e.pointerType === 'pen' ? 5 : 7, pts: [pos(e)] }
          redraw()
        }}
        onPointerMove={(e) => {
          if (!current.current) return
          current.current.pts.push(pos(e))
          redraw()
        }}
        onPointerUp={() => {
          if (current.current) strokes.current.push(current.current)
          current.current = null
          setCount(strokes.current.length)
          redraw()
        }}
        onPointerCancel={() => {
          current.current = null
          redraw()
        }}
      />
      <div className="absolute left-1/2 top-3 flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-2xl border border-white/15 bg-[#111C32]/95 p-2 shadow-[0_8px_24px_rgba(0,0,0,.45)]" role="toolbar" aria-label="Drawing tools">
        {COLOURS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setColor(c.value)}
            aria-pressed={color === c.value}
            aria-label={`${c.name} pen`}
            className={`${btn} grid place-items-center ${color === c.value ? 'ring-4 ring-white/70' : ''}`}
          >
            <span className="block h-7 w-7 rounded-full border-2 border-white/40" style={{ backgroundColor: c.value }} />
          </button>
        ))}
        <button type="button" disabled={!count} onClick={() => { strokes.current.pop(); setCount(strokes.current.length); redraw() }} className={`${btn} bg-white/[0.06] text-white hover:bg-white/10 disabled:opacity-40`}>Undo</button>
        <button type="button" disabled={!count} onClick={() => { strokes.current = []; setCount(0); redraw() }} className={`${btn} bg-white/[0.06] text-white hover:bg-white/10 disabled:opacity-40`}>Clear</button>
        <button type="button" onClick={onDone} className={`${btn} bg-amber-500 text-[#1A1103] hover:bg-amber-400`}>Done</button>
      </div>
    </div>
  )
}
