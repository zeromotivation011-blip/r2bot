'use client'

// components/kids/activities/templates/signal-graph/SignalGraphClient.tsx
// A live-looking sensor trace the child reads like an engineer: tap events,
// drag a level line through the noise, or bracket an event with two cursors.
// Touch: tap/drag on the graph. Keyboard: arrows move the cursor, Enter marks,
// Space swaps which cursor moves. A replay sweeps the trace like an oscilloscope.

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound } from '@/lib/kids-audio'
import { levelStep, niceStep, traceOf, trueLevel, type Answer, type Params } from './logic'
import { r1 } from './trace'
import { FeedbackPanel, TemplateCard, btnGhost, btnPrimary, useAnimationFrame, useAttempts, useReducedMotion, useSvgScale } from '../gear-train/TemplateFrameClient'

const VW = 400
const VH = 236
const L = 44
const R = 10
const TOP = 34
const BOT = 204
const SWEEP_S = 3.2

export default function SignalGraphClient({ params: p, band, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const tk = p.task
  const D = p.trace.durationS
  const { min, max, unit } = p.sensor
  const showReadout = p.showReadout ?? band !== 'engineers'
  const showGrid = p.showGrid ?? true
  const samples = useMemo(() => traceOf(p), [p])
  const dtS = 1 / p.trace.sampleHz

  const X = (t: number) => L + ((VW - L - R) * t) / D
  const Y = (v: number) => BOT - ((BOT - TOP) * (v - min)) / (max - min)
  const tOf = (x: number) => Math.max(0, Math.min(D, ((x - L) * D) / (VW - L - R)))
  const vOf = (y: number) => Math.max(min, Math.min(max, min + ((BOT - y) * (max - min)) / (BOT - TOP)))
  const snapT = (t: number) => Math.round(t / dtS) * dtS
  const vStep = levelStep(p)
  const snapV = (v: number) => Math.round(v / vStep) * vStep

  const [marks, setMarks] = useState<number[]>([])
  const [level, setLevel] = useState<number>(() => snapV(min + (max - min) * 0.85))
  const [span, setSpan] = useState<[number, number]>(() => [snapT(D * 0.2), snapT(D * 0.8)])
  const [activeEnd, setActiveEnd] = useState<0 | 1>(0)
  const [cursor, setCursor] = useState<number>(() => snapT(D / 2))
  const [hover, setHover] = useState(false)
  const [sweep, setSweep] = useState(1)
  const sweepRef = useRef(1)
  const [playing, setPlaying] = useState(false)
  const dragging = useRef(false)
  const { ref: svgRef, font } = useSvgScale<SVGSVGElement>(VW)
  const fs = font(10, 12) // axis text: never under 12 real px
  const fsB = font(11, 13) // key readouts
  const reduced = useReducedMotion()
  const att = useAttempts(onSubmit, onDone)
  const solved = !!att.result?.correct

  useAnimationFrame(playing, (dt) => {
    const before = sweepRef.current
    const nu = Math.min(1, before + dt / SWEEP_S)
    for (const s of p.scene ?? []) if (s.t / D > before && s.t / D <= nu) playSound('click')
    sweepRef.current = nu
    setSweep(nu)
    if (nu >= 1) setPlaying(false)
  })

  const replay = () => {
    playSound('click')
    if (reduced) return
    sweepRef.current = 0
    setSweep(0)
    setPlaying(true)
  }

  const touched = () => {
    if (att.result && !att.result.correct) att.clear()
  }

  const pointFrom = (e: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const b = svg.getBoundingClientRect()
    return { x: ((e.clientX - b.left) * VW) / b.width, y: ((e.clientY - b.top) * VH) / b.height }
  }

  const toggleMarkAt = (t: number) => {
    const near = marks.findIndex((m) => Math.abs(X(m) - X(t)) < 12)
    if (near >= 0) {
      playSound('click')
      setMarks((ms) => ms.filter((_, i) => i !== near))
    } else if (marks.length < 12) {
      playSound('star')
      setMarks((ms) => [...ms, snapT(t)].sort((a, b) => a - b))
    }
  }

  const applyAt = (x: number, y: number, first: boolean) => {
    if (solved) return
    touched()
    const t = snapT(tOf(x))
    setCursor(t)
    if (tk.kind === 'mark') {
      if (first) toggleMarkAt(t)
    } else if (tk.kind === 'level') {
      setLevel(snapV(vOf(y)))
    } else {
      let end = activeEnd
      if (first) {
        end = Math.abs(t - span[0]) <= Math.abs(t - span[1]) ? 0 : 1
        setActiveEnd(end)
      }
      setSpan((s) => (end === 0 ? [t, s[1]] : [s[0], t]))
    }
  }

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    const { x, y } = pointFrom(e)
    dragging.current = tk.kind !== 'mark'
    if (dragging.current) e.currentTarget.setPointerCapture(e.pointerId)
    if (tk.kind !== 'mark') playSound('click')
    applyAt(x, y, true)
  }
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const { x, y } = pointFrom(e)
    setHover(true)
    if (dragging.current) applyAt(x, y, false)
    else setCursor(snapT(tOf(x)))
  }
  const onUp = () => {
    dragging.current = false
  }

  const nudge = (dir: -1 | 1, big = false) => {
    if (solved) return
    touched()
    if (tk.kind === 'level') {
      setLevel((v) => Math.max(min, Math.min(max, snapV(v + dir * vStep * (big ? 10 : 1)))))
      return
    }
    const d = dir * dtS * (big ? 10 : 1)
    if (tk.kind === 'duration') {
      setSpan((s) => {
        const n: [number, number] = [...s]
        n[activeEnd] = Math.max(0, Math.min(D, snapT(n[activeEnd] + d)))
        setCursor(n[activeEnd])
        return n
      })
    } else setCursor((c) => Math.max(0, Math.min(D, snapT(c + d))))
  }

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const big = e.shiftKey
    if (e.key === 'ArrowLeft' || (tk.kind === 'level' && e.key === 'ArrowDown')) {
      e.preventDefault()
      nudge(-1, big)
    } else if (e.key === 'ArrowRight' || (tk.kind === 'level' && e.key === 'ArrowUp')) {
      e.preventDefault()
      nudge(1, big)
    } else if ((e.key === 'Enter' || e.key === ' ') && tk.kind === 'mark') {
      e.preventDefault()
      if (!solved) {
        touched()
        toggleMarkAt(cursor)
      }
    } else if (e.key === ' ' && tk.kind === 'duration') {
      e.preventDefault()
      setActiveEnd((a) => (a === 0 ? 1 : 0))
    }
  }

  const submit = () => {
    if (tk.kind === 'mark') att.submit({ marks })
    else if (tk.kind === 'level') att.submit({ level })
    else att.submit({ span })
  }

  const visibleUntil = D * sweep
  const shown = samples.filter((s) => s.t <= visibleUntil + 1e-9)
  const path = shown.map((s, i) => `${i ? 'L' : 'M'}${X(s.t).toFixed(1)} ${Y(s.v).toFixed(1)}`).join(' ')
  const nearest = samples[Math.max(0, Math.min(samples.length - 1, Math.round(cursor / dtS)))]
  const levelW = Math.max(56, (`${r1(level)} ${unit}`.length * 0.6 + 1) * fsB)
  const tStep = niceStep(D, 6)
  const vGrid = niceStep(max - min, 4)
  const tTicks = Array.from({ length: Math.floor(D / tStep) + 1 }, (_, i) => i * tStep)
  const vTicks = Array.from({ length: Math.floor((max - min) / vGrid) + 1 }, (_, i) => min + i * vGrid)

  const keyHelp =
    tk.kind === 'mark'
      ? 'Arrow keys move the cursor, Enter places or removes a marker.'
      : tk.kind === 'level'
        ? 'Arrow keys move the line up and down (Shift for bigger steps).'
        : 'Arrow keys move the selected cursor, Space switches cursor.'

  return (
    <TemplateCard label="Signal graph">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#00B8D4] px-3 py-1 font-display text-sm font-bold text-[#0A1120]">{p.sensor.name}</span>
        <p className="text-[17px] font-semibold">{tk.prompt}</p>
      </div>

      <div className="relative mt-3 overflow-hidden rounded-[20px] border border-white/10 bg-[#0A1120]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          className="block h-auto w-full touch-none select-none outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          tabIndex={0}
          role="application"
          aria-label={`${p.sensor.name} graph, ${D} seconds, ${min} to ${max} ${unit}. ${keyHelp}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={() => setHover(false)}
          onKeyDown={onKey}
        >
          {/* scene strip */}
          <rect x={L} y={4} width={VW - L - R} height={24} rx={6} fill="#111C32" />
          {(p.scene ?? []).map((s, i) =>
            s.t <= visibleUntil + 1e-9 ? (
              <g key={i}>
                <text x={X(s.t)} y={22} textAnchor="middle" fontSize={14}>
                  {s.icon}
                </text>
              </g>
            ) : null,
          )}
          {/* playhead robot */}
          {sweep < 1 && (
            <g transform={`translate(${X(visibleUntil)} 16)`}>
              <rect x={-8} y={-8} width={16} height={13} rx={4} fill="#FC6818" />
              <circle cx={-3} cy={-2} r={1.6} fill="#00E5FF" />
              <circle cx={3} cy={-2} r={1.6} fill="#00E5FF" />
            </g>
          )}

          {/* grid + axes */}
          {showGrid &&
            vTicks.map((v) => <line key={`v${v}`} x1={L} x2={VW - R} y1={Y(v)} y2={Y(v)} stroke="#19263F" strokeWidth={1} />)}
          {showGrid && tTicks.map((t) => <line key={`t${t}`} x1={X(t)} x2={X(t)} y1={TOP} y2={BOT} stroke="#19263F" strokeWidth={1} />)}
          {vTicks.map((v) => (
            <text key={`vl${v}`} x={L - 4} y={Y(v) + fs * 0.35} textAnchor="end" fontSize={fs} fill="#A7B0C0">
              {r1(v)}
            </text>
          ))}
          {tTicks.map((t) => (
            <text key={`tl${t}`} x={X(t)} y={BOT + 4 + fs} textAnchor="middle" fontSize={fs} fill="#A7B0C0">
              {r1(t)}
            </text>
          ))}
          <text x={VW - R} y={Math.min(VH - 2, BOT + 8 + 2 * fs)} textAnchor="end" fontSize={fs} fontWeight={700} fill="#A7B0C0">
            time (s)
          </text>
          <text x={4} y={TOP - 4} fontSize={fs} fontWeight={700} fill="#A7B0C0">
            {unit}
          </text>
          <line x1={L} x2={L} y1={TOP} y2={BOT} stroke="#6E7888" />
          <line x1={L} x2={VW - R} y1={BOT} y2={BOT} stroke="#6E7888" />

          {/* duration band */}
          {tk.kind === 'duration' && (
            <g>
              <rect x={X(Math.min(...span))} y={TOP} width={Math.abs(X(span[1]) - X(span[0]))} height={BOT - TOP} fill="#00B8D4" opacity={0.12} />
              {span.map((s, i) => (
                <g key={i}>
                  <line x1={X(s)} x2={X(s)} y1={TOP} y2={BOT} stroke="#00E5FF" strokeWidth={activeEnd === i ? 3 : 2} />
                  <rect x={X(s) - fsB / 2 - 5} y={BOT - fsB - 10} width={fsB + 10} height={fsB + 10} rx={5} fill={activeEnd === i ? '#00E5FF' : '#19263F'} stroke="#00E5FF" />
                  <text x={X(s)} y={BOT - 5 - fsB * 0.15} textAnchor="middle" fontSize={fsB} fontWeight={800} fill={activeEnd === i ? '#0A1120' : '#00E5FF'}>
                    {i === 0 ? 'A' : 'B'}
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* the trace */}
          <path d={path} fill="none" stroke="#00E5FF" strokeWidth={1.6} strokeLinejoin="round" />
          {shown.length <= 260 && shown.map((s, i) => <circle key={i} cx={X(s.t)} cy={Y(s.v)} r={1.6} fill="#00E5FF" />)}

          {/* revealed truth after a correct answer */}
          {solved && tk.kind === 'mark' && tk.events.map((e, i) => <line key={i} x1={X(e.t)} x2={X(e.t)} y1={TOP} y2={BOT} stroke="#22C55E" strokeWidth={2} strokeDasharray="5 4" />)}
          {solved && tk.kind === 'level' && (
            <line x1={X(tk.from)} x2={X(tk.to)} y1={Y(trueLevel(p, tk.from, tk.to))} y2={Y(trueLevel(p, tk.from, tk.to))} stroke="#22C55E" strokeWidth={3} />
          )}

          {/* markers */}
          {tk.kind === 'mark' &&
            marks.map((m, i) => (
              <g key={i}>
                <line x1={X(m)} x2={X(m)} y1={TOP} y2={BOT} stroke="#FC6818" strokeWidth={2.5} />
                <circle cx={X(m)} cy={TOP + fs * 0.6} r={fs * 0.65 + 1} fill="#FC6818" />
                <text x={X(m)} y={TOP + fs * 0.95} textAnchor="middle" fontSize={fs} fontWeight={800} fill="#1A1103">
                  {i + 1}
                </text>
              </g>
            ))}

          {/* level line */}
          {tk.kind === 'level' && (
            <g>
              <rect x={X(tk.from)} y={TOP} width={X(tk.to) - X(tk.from)} height={BOT - TOP} fill="#FC6818" opacity={0.06} />
              <line x1={L} x2={VW - R} y1={Y(level)} y2={Y(level)} stroke="#FC6818" strokeWidth={2.5} strokeDasharray="7 4" />
              <rect x={VW - R - 2 - levelW} y={Y(level) - fsB / 2 - 5} width={levelW} height={fsB + 10} rx={7} fill="#FC6818" />
              <text x={VW - R - 2 - levelW / 2} y={Y(level) + fsB * 0.35} textAnchor="middle" fontSize={fsB} fontWeight={800} fill="#1A1103">
                {r1(level)} {unit}
              </text>
            </g>
          )}

          {/* cursor */}
          {tk.kind === 'mark' && !solved && (
            <line x1={X(cursor)} x2={X(cursor)} y1={TOP} y2={BOT} stroke="#EEF2F8" strokeOpacity={hover ? 0.4 : 0.25} strokeWidth={1} strokeDasharray="2 3" />
          )}
        </svg>
      </div>

      {/* readout + touch nudges */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {showReadout && (
          <span className="rounded-2xl border border-white/10 bg-[#111C32] px-3 py-2 font-display text-sm font-bold tabular-nums text-[#00E5FF]" aria-live="off">
            {tk.kind === 'duration'
              ? `A ${r1(Math.min(...span))} s → B ${r1(Math.max(...span))} s = ${r1(Math.abs(span[1] - span[0]))} s`
              : tk.kind === 'level'
                ? `Your line: ${r1(level)} ${unit}`
                : `${r1(cursor)} s · ${r1(nearest?.v ?? 0)} ${unit}`}
          </span>
        )}
        {!showReadout && tk.kind === 'duration' && (
          <span className="rounded-2xl border border-white/10 bg-[#111C32] px-3 py-2 font-display text-sm font-bold tabular-nums text-[#00E5FF]">
            Measured: {r1(Math.abs(span[1] - span[0]))} s
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <button type="button" aria-label={tk.kind === 'level' ? 'Line down' : 'Move left'} className={`${btnGhost} w-12 px-0`} onClick={() => nudge(-1)} disabled={solved}>
            {tk.kind === 'level' ? '▼' : '◀'}
          </button>
          <button type="button" aria-label={tk.kind === 'level' ? 'Line up' : 'Move right'} className={`${btnGhost} w-12 px-0`} onClick={() => nudge(1)} disabled={solved}>
            {tk.kind === 'level' ? '▲' : '▶'}
          </button>
          {tk.kind === 'mark' && (
            <button
              type="button"
              className={btnGhost}
              disabled={solved}
              onClick={() => {
                touched()
                toggleMarkAt(cursor)
              }}
            >
              Mark here
            </button>
          )}
          {tk.kind === 'duration' && (
            <button type="button" className={btnGhost} onClick={() => setActiveEnd((a) => (a === 0 ? 1 : 0))} disabled={solved}>
              Moving {activeEnd === 0 ? 'A' : 'B'}
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-sm text-[#A7B0C0]">
        {tk.kind === 'mark'
          ? `Tap the graph to place a marker; tap a marker to remove it. ${marks.length} placed.`
          : tk.kind === 'level'
            ? 'Drag on the graph to move the line.'
            : 'Drag a cursor to where the event starts (A) and ends (B).'}
      </p>

      {!att.result && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} onClick={submit} disabled={tk.kind === 'mark' && marks.length === 0}>
            Check my reading
          </button>
          <button type="button" className={btnGhost} onClick={replay} disabled={playing}>
            ▶ Replay the run
          </button>
          {tk.kind === 'mark' && marks.length > 0 && (
            <button
              type="button"
              className={btnGhost}
              onClick={() => {
                playSound('click')
                setMarks([])
              }}
            >
              Clear markers
            </button>
          )}
        </div>
      )}
      <FeedbackPanel att={att} />
    </TemplateCard>
  )
}
