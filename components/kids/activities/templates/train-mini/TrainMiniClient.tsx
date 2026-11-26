'use client'

// components/kids/activities/templates/train-mini/TrainMiniClient.tsx
// A 0–10 × 0–10 feature plane. Pick a class, tap the plane to add a labelled
// training point (tap your own point again to remove it). The k-NN decision
// regions repaint live. Older bands choose k. "Test the AI" reveals the
// held-out test points one by one — ring = test point, ✓/✗ = the AI's guess —
// then checks. Keyboard: arrows move a crosshair, Enter adds, Delete removes.

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound } from '@/lib/kids-audio'
import { classify, kChoicesOf, minTestDist, testsVisible, type Answer, type Params, type Pt } from './logic'
import { FeedbackPanel, Readout, TemplateCard, btnGhost, btnPrimary, chip, useAttempts, useReducedMotion } from '../gear-train/TemplateFrameClient'

const S = 300 // plane size in svg units
const PAD = 30
const VB = S + PAD + 10
const GRID = 30 // decision-region resolution
const sx = (x: number) => PAD + (x / 10) * S
const sy = (y: number) => 10 + S - (y / 10) * S

export default function TrainMiniClient({ params: p, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const att = useAttempts(onSubmit, onDone)
  const reduced = useReducedMotion()
  const ks = kChoicesOf(p)
  const [added, setAdded] = useState<Pt[]>([])
  const [k, setK] = useState(ks[0])
  const [cls, setCls] = useState(() => {
    // Start on the class the dataset has least of — the obvious gap.
    const count = (id: string) => p.initialPoints.filter((x) => x.cls === id).length
    return [...p.classes].sort((a, b) => count(a.id) - count(b.id))[0].id
  })
  const [cursor, setCursor] = useState({ x: 5, y: 5 })
  const [shown, setShown] = useState(0)
  const [testing, setTesting] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const solved = !!att.result?.correct
  const showTests = testsVisible(p)
  const showRegions = p.showRegions ?? true
  const train = useMemo(() => [...p.initialPoints, ...added], [p.initialPoints, added])
  const colour = (id: string | null) => p.classes.find((c) => c.id === id)?.colour ?? '#6E7888'

  const regions = useMemo(() => {
    if (!showRegions || !train.length) return []
    const out: { x: number; y: number; c: string | null }[] = []
    for (let i = 0; i < GRID; i++)
      for (let j = 0; j < GRID; j++) {
        const x = ((i + 0.5) / GRID) * 10
        const y = ((j + 0.5) / GRID) * 10
        out.push({ x: i, y: j, c: classify(train, { x, y }, k) })
      }
    return out
  }, [train, k, showRegions])

  const results = useMemo(() => p.testPoints.map((t) => ({ t, got: classify(train, t, k) })), [p.testPoints, train, k])

  const edit = (fn: () => void) => {
    if (solved || testing) return
    if (att.result) att.clear()
    setShown(0)
    setNote(null)
    fn()
  }

  const md = minTestDist(p)
  const addAt = (x: number, y: number) =>
    edit(() => {
      const pt = { x: Math.round(x * 2) / 2, y: Math.round(y * 2) / 2, cls }
      const mine = added.findIndex((a) => Math.hypot(a.x - pt.x, a.y - pt.y) < 0.6)
      if (mine >= 0) {
        setAdded((a) => a.filter((_, i) => i !== mine))
        playSound('click')
        return
      }
      if (added.length >= p.maxNewPoints) {
        setNote(`You can add ${p.maxNewPoints} point${p.maxNewPoints === 1 ? '' : 's'}. Tap one of yours to remove it first.`)
        playSound('wrong')
        return
      }
      if (md > 0 && p.testPoints.some((t) => Math.hypot(t.x - pt.x, t.y - pt.y) < md - 1e-9)) {
        setNote('That spot is kept for testing — training data must not copy the test. Try a little further away.')
        playSound('wrong')
        return
      }
      setAdded((a) => [...a, pt])
      playSound('click')
    })

  const toPlane = (e: PointerEvent<SVGSVGElement>) => {
    const b = svgRef.current?.getBoundingClientRect()
    if (!b) return null
    const vx = ((e.clientX - b.left) * VB) / b.width
    const vy = ((e.clientY - b.top) * VB) / b.height
    const x = ((vx - PAD) / S) * 10
    const y = ((10 + S - vy) / S) * 10
    if (x < -0.3 || x > 10.3 || y < -0.3 || y > 10.3) return null
    return { x: Math.max(0, Math.min(10, x)), y: Math.max(0, Math.min(10, y)) }
  }

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const d: Record<string, [number, number]> = { ArrowLeft: [-0.5, 0], ArrowRight: [0.5, 0], ArrowUp: [0, 0.5], ArrowDown: [0, -0.5] }
    if (d[e.key]) {
      e.preventDefault()
      setCursor((c) => ({ x: Math.max(0, Math.min(10, c.x + d[e.key][0])), y: Math.max(0, Math.min(10, c.y + d[e.key][1])) }))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      addAt(cursor.x, cursor.y)
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      edit(() => setAdded((a) => a.slice(0, -1)))
    }
  }

  const test = () => {
    playSound('click')
    const n = p.testPoints.length
    if (reduced) {
      setShown(n)
      att.submit({ added, k })
      return
    }
    setTesting(true)
    let i = 0
    const tick = () => {
      i++
      setShown(i)
      playSound(results[i - 1]?.got === p.testPoints[i - 1].cls ? 'click' : 'wrong')
      if (i < n) timer.current = window.setTimeout(tick, 380)
      else
        timer.current = window.setTimeout(() => {
          setTesting(false)
          att.submit({ added, k })
        }, 400)
    }
    timer.current = window.setTimeout(tick, 250)
  }

  const correctSoFar = results.slice(0, shown).filter((r) => r.got === r.t.cls).length
  const cell = S / GRID

  return (
    <TemplateCard label="Train a mini-AI">
      <p className="font-display text-lg font-bold text-[#EEF2F8]">{p.task}</p>
      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VB} ${VB}`}
            className="w-full max-w-[560px] touch-none select-none rounded-2xl bg-[#0A1120] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            tabIndex={0}
            role="application"
            aria-label={`Feature plane: ${p.axes.x} across, ${p.axes.y} up. Arrow keys move the crosshair, Enter adds a ${p.classes.find((c) => c.id === cls)?.label} point, Delete removes your last point.`}
            onPointerDown={(e) => {
              const q = toPlane(e)
              if (q) {
                setCursor({ x: Math.round(q.x * 2) / 2, y: Math.round(q.y * 2) / 2 })
                addAt(q.x, q.y)
              }
            }}
            onKeyDown={onKey}
          >
            {regions.map((r) => (
              <rect key={`${r.x}-${r.y}`} x={PAD + r.x * cell} y={10 + S - (r.y + 1) * cell} width={cell + 0.5} height={cell + 0.5} fill={colour(r.c)} opacity={0.16} />
            ))}
            {Array.from({ length: 11 }, (_, i) => (
              <g key={i}>
                <line x1={sx(i)} x2={sx(i)} y1={sy(0)} y2={sy(10)} stroke="#ffffff" opacity={i % 5 === 0 ? 0.12 : 0.05} />
                <line x1={sx(0)} x2={sx(10)} y1={sy(i)} y2={sy(i)} stroke="#ffffff" opacity={i % 5 === 0 ? 0.12 : 0.05} />
              </g>
            ))}
            <rect x={PAD} y={10} width={S} height={S} fill="none" stroke="#ffffff" opacity={0.2} />
            <text x={PAD + S / 2} y={VB - 2} fill="#A7B0C0" fontSize={12} textAnchor="middle">
              {p.axes.x} →
            </text>
            <text x={12} y={10 + S / 2} fill="#A7B0C0" fontSize={12} textAnchor="middle" transform={`rotate(-90 12 ${10 + S / 2})`}>
              {p.axes.y} →
            </text>

            {/* test points */}
            {p.testPoints.map((t, i) => {
              const revealed = i < shown
              if (!revealed && !showTests) return null
              const got = results[i].got
              const ok = got === t.cls
              return (
                <g key={`t${i}`} className={revealed ? 'motion-safe:animate-[fadeIn_.25s_ease-out]' : ''}>
                  <circle cx={sx(t.x)} cy={sy(t.y)} r={9} fill="none" stroke={colour(t.cls)} strokeWidth={3} strokeDasharray={revealed ? undefined : '3 3'} />
                  {revealed && (
                    <text x={sx(t.x) + 11} y={sy(t.y) - 8} fontSize={14} fontWeight={800} fill={ok ? '#22C55E' : '#FFA878'}>
                      {ok ? '✓' : '✗'}
                    </text>
                  )}
                </g>
              )
            })}
            {/* training points */}
            {p.initialPoints.map((pt, i) => (
              <circle key={`i${i}`} cx={sx(pt.x)} cy={sy(pt.y)} r={6.5} fill={colour(pt.cls)} stroke="#0A1120" strokeWidth={2} />
            ))}
            {added.map((pt, i) => (
              <g key={`a${i}`} className="motion-safe:animate-[fadeIn_.2s_ease-out]">
                <circle cx={sx(pt.x)} cy={sy(pt.y)} r={8.5} fill={colour(pt.cls)} stroke="#EEF2F8" strokeWidth={2.5} />
              </g>
            ))}
            {/* keyboard crosshair */}
            <g opacity={0.8} pointerEvents="none">
              <line x1={sx(cursor.x) - 8} x2={sx(cursor.x) + 8} y1={sy(cursor.y)} y2={sy(cursor.y)} stroke="#FFA878" strokeWidth={1.5} />
              <line x1={sx(cursor.x)} x2={sx(cursor.x)} y1={sy(cursor.y) - 8} y2={sy(cursor.y) + 8} stroke="#FFA878" strokeWidth={1.5} />
            </g>
          </svg>
          <p className="mt-1 text-[13px] text-[#A7B0C0]">
            Dots = training examples (white ring = yours). {showTests ? 'Dashed rings = test points (colour = true answer).' : 'The test points are hidden until you test — like real AI testing.'} Shading = what the AI
            would answer there.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#A7B0C0]">Add examples of…</p>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Class to add">
              {p.classes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={cls === c.id}
                  disabled={p.maxNewPoints === 0}
                  onClick={() => {
                    playSound('click')
                    setCls(c.id)
                  }}
                  className={`${chip} gap-2 ${cls === c.id ? 'border-white/60 bg-white/15 text-[#EEF2F8]' : 'border-white/15 bg-white/[0.04] text-[#A7B0C0]'}`}
                >
                  <span className="h-4 w-4 rounded-full" style={{ background: c.colour }} aria-hidden />
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[13px] text-[#A7B0C0]">
              {p.maxNewPoints === 0 ? 'No new data this time — tune k instead.' : `${p.maxNewPoints - added.length} of ${p.maxNewPoints} new points left. Tap the plane to add; tap your point to remove.`}
            </p>
          </div>

          {ks.length > 1 && (
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#A7B0C0]">k — how many neighbours vote</p>
              <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="k">
                {ks.map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={k === v}
                    onClick={() => edit(() => setK(v))}
                    className={`${chip} ${k === v ? 'border-amber-400 bg-amber-500 text-[#1A1103]' : 'border-white/15 bg-white/[0.06] text-[#EEF2F8]'}`}
                  >
                    k = {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {note && (
            <p role="status" className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-2 text-[15px] text-[#EEF2F8]">
              {note}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2" aria-live="polite">
            <Readout label="Training points" value={`${train.length}`} />
            <Readout label="Test result" value={shown ? `${correctSoFar}/${shown}` : '—'} tone={shown ? (correctSoFar === shown ? 'good' : 'bad') : 'plain'} unit={`need ${Math.ceil(p.minAccuracy * p.testPoints.length)}/${p.testPoints.length}`} />
          </div>

          {!att.result && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnPrimary} onClick={test} disabled={testing}>
                {testing ? 'Testing…' : 'Test the AI'}
              </button>
              {added.length > 0 && (
                <button type="button" className={btnGhost} onClick={() => edit(() => setAdded([]))} disabled={testing}>
                  Clear mine
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <FeedbackPanel att={att} onRetry={() => setShown(0)} />
    </TemplateCard>
  )
}
