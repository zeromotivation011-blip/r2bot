'use client'

// components/kids/activities/templates/wheel-terrain/WheelTerrainClient.tsx
// Choose wheels, tracks or legs, size them, and send the robot across the
// course. The run is the real model from logic.ts: it stops exactly where the
// design fails (sinks, slips, stalls, or meets a step it cannot climb), and a
// footprint panel shows how the contact area sets the ground pressure.

import { useMemo, useRef, useState } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound } from '@/lib/kids-audio'
import { TERRAIN, climbCm, contactArea, run, topSpeed, type Answer, type LocoKind, type Params, type RunResult, type SizeRange } from './logic'
import {
  FeedbackPanel,
  Readout,
  TemplateCard,
  btnGhost,
  btnPrimary,
  useAnimationFrame,
  useAttempts,
  useReducedMotion,
} from '../gear-train/TemplateFrameClient'

const KIND: Record<LocoKind, { name: string; icon: string; size: string; width: string }> = {
  wheels: { name: 'Wheels', icon: '🛞', size: 'Wheel diameter', width: 'Wheel width' },
  tracks: { name: 'Tracks', icon: '⛓️', size: 'Sprocket diameter', width: 'Track width' },
  legs: { name: 'Legs', icon: '🦿', size: 'Leg length', width: 'Foot size' },
}

const VW = 400 // course drawing width
const PAD = 22

type Phase = 'idle' | 'running' | 'shown'

interface SegGeom {
  x0: number
  x1: number
  y0: number
  y1: number
  angle: number // radians, + = uphill (screen y goes up)
  rise: number // px step at the start
}

function geometry(p: Params): { segs: SegGeom[]; minY: number; maxY: number } {
  const total = p.course.reduce((s, c) => s + c.length, 0)
  const weights = p.course.map((c) => Math.max(c.length, total * 0.16))
  const sumW = weights.reduce((a, b) => a + b, 0)
  const span = VW - 2 * PAD
  let x = PAD
  let y = 0
  let minY = 0
  let maxY = 0
  const segs: SegGeom[] = []
  p.course.forEach((c, i) => {
    const w = (weights[i] / sumW) * span
    const rise = Math.min(22, (c.stepCm ?? 0) * 0.8)
    y -= rise
    const angle = ((c.slopeDeg ?? (c.terrain === 'stairs' ? 25 : 0)) * Math.PI) / 180
    const dy = -Math.tan(angle) * w * 0.6 // flatten a little so steep courses still fit
    segs.push({ x0: x, x1: x + w, y0: y, y1: y + dy, angle: Math.atan2(-dy, w), rise })
    minY = Math.min(minY, y, y + dy)
    maxY = Math.max(maxY, y, y + dy)
    x += w
    y += dy
  })
  return { segs, minY, maxY }
}

/** Point on the ground at display x. */
function groundAt(segs: SegGeom[], x: number): { y: number; angle: number } {
  const s = segs.find((g) => x <= g.x1 + 1e-6) ?? segs[segs.length - 1]
  const t = Math.max(0, Math.min(1, (x - s.x0) / (s.x1 - s.x0)))
  return { y: s.y0 + (s.y1 - s.y0) * t, angle: s.angle }
}

/** Where (display x) and when (sim seconds) the run ends, plus a mapper from x → sim time. */
function runPath(p: Params, segs: SegGeom[], r: RunResult): { endX: number; timeAt: (x: number) => number } {
  const xs: number[] = [segs[0].x0]
  const ts: number[] = [0]
  r.segments.forEach((s, i) => {
    const g = segs[i]
    const len = p.course[i].length
    const frac = len > 0 ? s.covered / len : 1
    xs.push(g.x0 + (g.x1 - g.x0) * frac - (s.ok ? 0 : s.reason === 'step' ? 8 : 0))
    ts.push(ts[ts.length - 1] + s.time)
  })
  const endX = xs[xs.length - 1]
  const timeAt = (x: number) => {
    for (let i = 1; i < xs.length; i++) {
      if (x <= xs[i] + 1e-6) {
        const span = xs[i] - xs[i - 1]
        return ts[i - 1] + (span > 0 ? ((x - xs[i - 1]) / span) * (ts[i] - ts[i - 1]) : 0)
      }
    }
    return ts[ts.length - 1]
  }
  return { endX, timeAt }
}

function Robot({ kind, d, spin, step }: { kind: LocoKind; d: number; spin: number; step: number }) {
  const r = Math.max(4, Math.min(15, 3 + d * 0.3))
  if (kind === 'legs') {
    const L = Math.max(9, Math.min(26, 6 + d * 0.45))
    const swing = Math.sin(step) * 0.45
    const legs = [-9, -3, 3, 9]
    return (
      <g>
        {legs.map((lx, i) => {
          const a = (i % 2 === 0 ? swing : -swing) * 1
          return (
            <g key={lx}>
              <line x1={lx} y1={-L} x2={lx + Math.sin(a) * L * 0.7} y2={-Math.max(0, Math.cos(a) * L * 0.08)} stroke="#A7B0C0" strokeWidth={2.5} strokeLinecap="round" />
              <circle cx={lx + Math.sin(a) * L * 0.7} cy={-1} r={2} fill="#EEF2F8" />
            </g>
          )
        })}
        <rect x={-15} y={-L - 12} width={30} height={13} rx={4} fill="#FC6818" />
        <circle cx={8} cy={-L - 6} r={2.5} fill="#0A1120" />
      </g>
    )
  }
  if (kind === 'tracks') {
    return (
      <g>
        <rect x={-17} y={-2 * r} width={34} height={2 * r} rx={r} fill="#19263F" stroke="#A7B0C0" strokeWidth={2} strokeDasharray="3 2" strokeDashoffset={-spin * r} />
        {[-17 + r, 17 - r].map((cx) => (
          <g key={cx} transform={`translate(${cx} ${-r}) rotate(${(spin * 180) / Math.PI})`}>
            <circle r={r - 2} fill="#6E7888" />
            <line x1={-(r - 3)} y1={0} x2={r - 3} y2={0} stroke="#0A1120" strokeWidth={1.5} />
          </g>
        ))}
        <rect x={-14} y={-2 * r - 13} width={28} height={12} rx={4} fill="#FC6818" />
        <circle cx={7} cy={-2 * r - 7} r={2.5} fill="#0A1120" />
      </g>
    )
  }
  return (
    <g>
      <rect x={-17} y={-r - 14} width={34} height={13} rx={4} fill="#FC6818" />
      <circle cx={9} cy={-r - 8} r={2.5} fill="#0A1120" />
      {[-11, 11].map((cx) => (
        <g key={cx} transform={`translate(${cx} ${-r}) rotate(${(spin * 180) / Math.PI})`}>
          <circle r={r} fill="#19263F" stroke="#EEF2F8" strokeWidth={2} />
          <line x1={-r + 2} y1={0} x2={r - 2} y2={0} stroke="#EEF2F8" strokeWidth={1.5} />
          <line x1={0} y1={-r + 2} x2={0} y2={r - 2} stroke="#EEF2F8" strokeWidth={1.5} />
        </g>
      ))}
    </g>
  )
}

function rangeSteps(r: SizeRange): number {
  return Math.floor((r.max - r.min) / r.step + 1e-6)
}
const snap = (r: SizeRange, v: number) => Math.round(Math.max(r.min, Math.min(r.max, r.min + Math.round((v - r.min) / r.step) * r.step)) * 1e6) / 1e6

function SizeSlider({ id, label, unit, range, value, onChange }: { id: string; label: string; unit: string; range: SizeRange; value: number; onChange: (v: number) => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111C32] p-3">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="font-semibold text-[#A7B0C0]">
          {label}
        </label>
        <span className="font-display text-xl font-bold tabular-nums text-amber-300">
          {value} {unit}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <button type="button" className={`${btnGhost} min-w-[48px] px-0`} aria-label={`Smaller ${label.toLowerCase()}`} disabled={value <= range.min + 1e-9} onClick={() => onChange(snap(range, value - range.step))}>
          −
        </button>
        <input
          id={id}
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          value={value}
          onChange={(e) => onChange(snap(range, Number(e.target.value)))}
          className="h-12 w-full cursor-pointer accent-amber-500"
          aria-valuetext={`${value} ${unit}`}
        />
        <button type="button" className={`${btnGhost} min-w-[48px] px-0`} aria-label={`Bigger ${label.toLowerCase()}`} disabled={value >= range.max - 1e-9} onClick={() => onChange(snap(range, value + range.step))}>
          +
        </button>
      </div>
    </div>
  )
}

/** Top-down footprint at true scale: how much ground carries the weight. */
function Footprint({ a, pressure, worst }: { a: Answer; pressure: number; worst: number }) {
  const S = 1.1 // px per cm
  const patches: { x: number; y: number; w: number; h: number; round?: boolean }[] = []
  if (a.kind === 'wheels') {
    const len = 0.2 * a.diameterCm
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) patches.push({ x: sx * 26 - len * S * 0.5, y: sy * 20 - a.widthCm * S * 0.5, w: len * S, h: a.widthCm * S })
  } else if (a.kind === 'tracks') {
    const len = 2.5 * a.diameterCm + 10
    for (const sy of [-1, 1]) patches.push({ x: (-len * S) / 2, y: sy * 20 - a.widthCm * S * 0.5, w: len * S, h: a.widthCm * S })
  } else {
    for (const [fx, fy] of [
      [-22, -18],
      [22, -18],
      [0, 20],
    ])
      patches.push({ x: fx - (a.widthCm * S) / 2, y: fy - (a.widthCm * S) / 2, w: a.widthCm * S, h: a.widthCm * S, round: true })
  }
  const heat = Math.min(1, pressure / Math.max(worst, 1))
  const fill = heat > 0.999 ? '#FC6818' : '#00B8D4'
  return (
    <svg viewBox="-70 -45 140 90" className="h-[90px] w-[140px] shrink-0" role="img" aria-label={`Footprint: ${Math.round(contactArea(a) * 10000)} square centimetres on the ground`}>
      <rect x={-40} y={-30} width={80} height={60} rx={8} fill="none" stroke="rgba(255,255,255,.16)" strokeDasharray="3 3" />
      {patches.map((q, i) =>
        q.round ? (
          <circle key={i} cx={q.x + q.w / 2} cy={q.y + q.h / 2} r={q.w / 2} fill={fill} fillOpacity={0.75} />
        ) : (
          <rect key={i} x={q.x} y={q.y} width={Math.max(1.5, q.w)} height={Math.max(1.5, q.h)} rx={2} fill={fill} fillOpacity={0.75} />
        ),
      )}
    </svg>
  )
}

export default function WheelTerrainClient({ params, band, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const p = params
  const young = band === 'explorers' || band === 'builders'
  const showPhysics = p.showPhysics ?? !young
  const presets = p.presets && p.presets.length ? p.presets : null

  const [presetIdx, setPresetIdx] = useState(0)
  const [kind, setKind] = useState<LocoKind>(p.allowed[0])
  const [dia, setDia] = useState(() => snap(p.diameterCm, p.diameterCm.min + rangeSteps(p.diameterCm) * 0.3 * p.diameterCm.step))
  const [width, setWidth] = useState(() => (p.widthCm ? p.widthCm.min : (p.fixedWidthCm ?? 4)))
  const [phase, setPhase] = useState<Phase>('idle')
  const [x, setX] = useState(PAD)
  const [spin, setSpin] = useState(0)
  const xRef = useRef(PAD)
  const spinRef = useRef(0)
  const reduced = useReducedMotion()
  const att = useAttempts(onSubmit, onDone)

  const answer: Answer = useMemo(() => {
    if (presets) {
      const q = presets[presetIdx]
      return { kind: q.kind, diameterCm: q.diameterCm, widthCm: q.widthCm }
    }
    return { kind, diameterCm: dia, widthCm: width }
  }, [presets, presetIdx, kind, dia, width])

  const result = useMemo(() => run(p, answer), [p, answer])
  const geo = useMemo(() => geometry(p), [p])
  const path = useMemo(() => runPath(p, geo.segs, result), [p, geo.segs, result])
  const worstBearing = Math.min(...p.course.map((c) => TERRAIN[c.terrain].bearing).filter((b) => Number.isFinite(b)), Infinity)

  const edit = (fn: () => void) => {
    if (att.result) att.clear()
    playSound('click')
    setPhase('idle')
    xRef.current = PAD
    setX(PAD)
    fn()
  }

  const finishRun = () => {
    setPhase('shown')
    att.submit(answer)
  }

  const go = () => {
    playSound('click')
    xRef.current = PAD
    setX(PAD)
    if (reduced) {
      xRef.current = path.endX
      setX(path.endX)
      finishRun()
    } else setPhase('running')
  }

  useAnimationFrame(phase === 'running', (dt) => {
    const pxPerS = (VW - 2 * PAD) / 3.2
    const nx = Math.min(path.endX, xRef.current + dt * pxPerS)
    spinRef.current += dt * 9
    setSpin(spinRef.current)
    xRef.current = nx
    setX(nx)
    if (nx >= path.endX - 1e-6) finishRun()
  })

  // Wheels keep spinning in place when stalled or slipping (that IS the failure).
  const lastSeg = result.segments[result.segments.length - 1]
  const failed = phase === 'shown' && !result.finished
  const reason = failed ? lastSeg.reason : undefined
  useAnimationFrame(failed && !reduced && (reason === 'stalls' || reason === 'slips' || reason === 'sinks'), (dt) => {
    spinRef.current += dt * 14
    setSpin(spinRef.current)
  })

  const g = groundAt(geo.segs, x)
  const sink = reason === 'sinks' ? 7 : 0
  const slipBack = reason === 'slips' ? -6 : 0
  const robotTransform = `translate(${x + slipBack} ${g.y + sink}) rotate(${(-g.angle * 180) / Math.PI})`
  const simTime = path.timeAt(x)

  const top = geo.minY - 70
  const bottom = geo.maxY + 34
  const vb = `0 ${top} ${VW} ${bottom - top}`

  const courseText = p.course
    .map((c) => `${c.length} m of ${TERRAIN[c.terrain].name.toLowerCase()}${c.slopeDeg ? ` (${c.slopeDeg > 0 ? 'up' : 'down'} ${Math.abs(c.slopeDeg)}°)` : ''}${c.stepCm ? ` after a ${c.stepCm} cm step` : ''}`)
    .join(', then ')

  return (
    <TemplateCard label="Wheels and terrain test track">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-500 px-3 py-1 font-display text-sm font-bold text-[#1A1103]">Job</span>
        <p className="text-[17px] font-semibold">
          Get the {p.robotMassKg} kg robot across {courseText}
          {p.timeLimitS !== undefined ? ` in under ${p.timeLimitS} s` : ''}.
        </p>
      </div>

      <div className="relative mt-3 overflow-hidden rounded-[20px] border border-white/10 bg-[#0A1120]">
        <svg viewBox={vb} className="block h-[210px] w-full sm:h-[260px]" role="img" aria-label={`Test course. ${result.finished ? 'This design can finish.' : ''}`}>
          {/* terrain */}
          {geo.segs.map((s, i) => {
            const c = p.course[i]
            const T = TERRAIN[c.terrain]
            const ground = `M${s.x0},${s.y0 + s.rise} L${s.x0},${s.y0} L${s.x1},${s.y1} L${s.x1},${bottom} L${s.x0},${bottom} Z`
            const n = Math.max(2, Math.round((s.x1 - s.x0) / 14))
            return (
              <g key={i}>
                <path d={ground} fill={T.colour} fillOpacity={0.28} />
                {c.terrain === 'stairs' ? (
                  <path
                    d={Array.from({ length: n }, (_, k) => {
                      const xa = s.x0 + ((s.x1 - s.x0) * k) / n
                      const xb = s.x0 + ((s.x1 - s.x0) * (k + 1)) / n
                      const ya = s.y0 + ((s.y1 - s.y0) * k) / n
                      const yb = s.y0 + ((s.y1 - s.y0) * (k + 1)) / n
                      return `${k === 0 ? 'M' : 'L'}${xa},${ya} L${xa},${yb} L${xb},${yb}`
                    }).join(' ')}
                    fill="none"
                    stroke={T.colour}
                    strokeWidth={3}
                  />
                ) : (
                  <line x1={s.x0} y1={s.y0} x2={s.x1} y2={s.y1} stroke={T.colour} strokeWidth={4} strokeLinecap="round" />
                )}
                {s.rise > 0 && <line x1={s.x0} y1={s.y0 + s.rise} x2={s.x0} y2={s.y0} stroke={T.colour} strokeWidth={4} />}
                {c.terrain === 'rocks' &&
                  Array.from({ length: n }, (_, k) => {
                    const xx = s.x0 + ((s.x1 - s.x0) * (k + 0.5)) / n
                    const yy = s.y0 + ((s.y1 - s.y0) * (k + 0.5)) / n
                    return <ellipse key={k} cx={xx} cy={yy - 2} rx={4} ry={3} fill="#78716C" />
                  })}
                {c.terrain === 'gravel' &&
                  Array.from({ length: n * 2 }, (_, k) => {
                    const xx = s.x0 + ((s.x1 - s.x0) * (k + 0.5)) / (n * 2)
                    const yy = s.y0 + ((s.y1 - s.y0) * (k + 0.5)) / (n * 2)
                    return <circle key={k} cx={xx} cy={yy - 1} r={1.5} fill="#A8A29E" />
                  })}
                <text x={(s.x0 + s.x1) / 2} y={Math.max(s.y0, s.y1) + 22} textAnchor="middle" fontSize={10} fontWeight={700} fill="#A7B0C0">
                  {T.name}
                  {c.slopeDeg ? ` ${c.slopeDeg > 0 ? '↗' : '↘'}${Math.abs(c.slopeDeg)}°` : ''}
                </text>
              </g>
            )
          })}
          {/* finish flag */}
          {(() => {
            const s = geo.segs[geo.segs.length - 1]
            return (
              <g transform={`translate(${s.x1 - 4} ${s.y1})`}>
                <line x1={0} y1={0} x2={0} y2={-34} stroke="#EEF2F8" strokeWidth={2} />
                <path d="M0,-34 L14,-29 L0,-24 Z" fill="#22C55E" />
              </g>
            )
          })()}
          {/* robot */}
          <g transform={robotTransform}>
            <Robot kind={answer.kind} d={answer.diameterCm} spin={spin} step={spin} />
          </g>
          {failed && (
            <g transform={`translate(${x} ${g.y - 58})`}>
              <rect x={-36} y={-14} width={72} height={20} rx={10} fill="#FC6818" />
              <text x={0} y={0} textAnchor="middle" fontSize={11} fontWeight={800} fill="#1A1103">
                {reason === 'sinks' ? 'Sinking!' : reason === 'slips' ? 'Slipping!' : reason === 'stalls' ? 'Stalled!' : 'Too tall!'}
              </text>
            </g>
          )}
          {phase === 'shown' && result.finished && (
            <text x={VW / 2} y={top + 22} textAnchor="middle" fontSize={14} fontWeight={800} fill="#22C55E">
              Finished!
            </text>
          )}
        </svg>
        <div className="pointer-events-none absolute right-3 top-2 rounded-full bg-[#111C32]/90 px-3 py-1 font-display text-sm font-bold tabular-nums text-[#EEF2F8]">
          ⏱ {phase === 'idle' ? '0.0' : simTime.toFixed(1)} s{p.timeLimitS !== undefined ? <span className="text-[#A7B0C0]"> / {p.timeLimitS} s</span> : null}
        </div>
      </div>

      {/* choose the drive */}
      {presets ? (
        <div className="mt-3">
          <p className="text-sm font-semibold text-[#A7B0C0]">Pick a robot from the garage</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Robot">
            {presets.map((q, i) => (
              <button
                key={q.name}
                type="button"
                role="radio"
                aria-checked={presetIdx === i}
                onClick={() => edit(() => setPresetIdx(i))}
                className={`flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-2xl border p-2 transition-transform duration-150 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
                  presetIdx === i ? 'border-amber-400 bg-amber-500/15' : 'border-white/15 bg-[#19263F] hover:border-white/30'
                }`}
              >
                <svg viewBox="-24 -42 48 46" className="h-12 w-14" aria-hidden="true">
                  <Robot kind={q.kind} d={q.diameterCm} spin={0} step={0.6} />
                </svg>
                <span className="font-display text-base font-bold">
                  {q.emoji ? `${q.emoji} ` : ''}
                  {q.name}
                </span>
                <span className="text-xs text-[#A7B0C0]">
                  {KIND[q.kind].name} · {q.diameterCm} cm
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {p.allowed.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Drive type">
              {p.allowed.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  onClick={() => edit(() => setKind(k))}
                  className={`inline-flex min-h-[52px] items-center gap-2 rounded-2xl border px-4 font-display text-base font-bold transition-transform duration-150 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
                    kind === k ? 'border-amber-400 bg-amber-500/15 text-amber-300' : 'border-white/15 bg-[#19263F] text-[#EEF2F8] hover:border-white/30'
                  }`}
                >
                  <span aria-hidden="true" className="text-xl">
                    {KIND[k].icon}
                  </span>
                  {KIND[k].name}
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <SizeSlider id="wt-dia" label={KIND[kind].size} unit="cm" range={p.diameterCm} value={dia} onChange={(v) => edit(() => setDia(v))} />
            {p.widthCm ? <SizeSlider id="wt-width" label={KIND[kind].width} unit="cm" range={p.widthCm} value={width} onChange={(v) => edit(() => setWidth(v))} /> : null}
          </div>
        </>
      )}

      {/* footprint + numbers */}
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#111C32] p-3">
        <Footprint a={answer} pressure={result.pressureKPa} worst={worstBearing} />
        <p className="min-w-[180px] flex-1 text-[15px] leading-snug text-[#A7B0C0]">
          {young
            ? 'Blue patches touch the ground. More ground touched = the weight is spread out = less sinking.'
            : `Ground contact ${Math.round(contactArea(answer) * 10000)} cm². Pressure = weight ÷ area; soft ground holds only so much.`}
        </p>
      </div>
      {showPhysics && (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Readout label="Ground pressure" value={result.pressureKPa >= 100 ? Math.round(result.pressureKPa).toString() : result.pressureKPa.toFixed(1)} unit="kPa" tone="cyan" />
          <Readout label="Can climb" value={climbCm(answer).toFixed(1)} unit="cm" />
          <Readout label="Top speed" value={topSpeed(p, answer).toFixed(2)} unit="m/s" />
          {result.pushN !== null ? <Readout label="Push" value={Math.round(result.pushN).toString()} unit="N" /> : <Readout label="Mass" value={String(p.robotMassKg)} unit="kg" />}
        </div>
      )}
      {showPhysics && (
        <div className="mt-2 overflow-x-auto rounded-2xl bg-[#111C32] px-3 py-2">
          <table className="w-full text-left text-sm text-[#A7B0C0]">
            <caption className="sr-only">Ground on this course</caption>
            <thead>
              <tr className="text-[#EEF2F8]">
                <th className="py-1 pr-3 font-semibold">Ground</th>
                <th className="py-1 pr-3 font-semibold">Holds</th>
                <th className="py-1 pr-3 font-semibold">Grip μ</th>
                <th className="py-1 font-semibold">Bumps</th>
              </tr>
            </thead>
            <tbody>
              {[...new Set(p.course.map((c) => c.terrain))].map((t) => (
                <tr key={t}>
                  <td className="py-0.5 pr-3">{TERRAIN[t].name}</td>
                  <td className="py-0.5 pr-3 tabular-nums">{Number.isFinite(TERRAIN[t].bearing) ? `${TERRAIN[t].bearing} kPa` : 'hard'}</td>
                  <td className="py-0.5 pr-3 tabular-nums">{TERRAIN[t].mu}</td>
                  <td className="py-0.5 tabular-nums">{TERRAIN[t].implicitStepCm ? `${TERRAIN[t].implicitStepCm} cm` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} onClick={go} disabled={phase === 'running' || !!att.result || att.done}>
          Test run ▶
        </button>
      </div>
      <FeedbackPanel
        att={att}
        onRetry={() => {
          setPhase('idle')
          xRef.current = PAD
          setX(PAD)
        }}
      />
    </TemplateCard>
  )
}
