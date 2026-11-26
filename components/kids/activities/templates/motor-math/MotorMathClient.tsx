'use client'

// components/kids/activities/templates/motor-math/MotorMathClient.tsx
// Slide the motor speed, wheel size, run time or encoder ticks, then press Go.
// The robot drives along a ruler at true scale; every wheel turn leaves a mark
// one circumference apart, so the child SEES that one turn = π × d.

import { useMemo, useRef, useState } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound } from '@/lib/kids-audio'
import { drive, explain, pythonView, valueOf, type Answer, type Knob, type Params, type Range, type SizeRange } from './logic'
import {
  FeedbackPanel,
  Readout,
  TemplateCard,
  btnGhost,
  btnPrimary,
  useAnimationFrame,
  useAttempts,
  useReducedMotion,
  useSvgScale,
} from '../gear-train/TemplateFrameClient'

const VW = 400
const X0 = 24
const TRACK = VW - 2 * X0
const GROUND = 120
const MAX_VISUAL_S = 6

type Phase = 'idle' | 'running' | 'shown'

const ORDER: Knob[] = ['rpm', 'diameterCm', 'timeS', 'ticks']

function knobInfo(k: Knob, p: Params): { label: string; unit: string } {
  if (k === 'rpm') return { label: 'Motor speed', unit: 'rpm' }
  if (k === 'diameterCm') return { label: 'Wheel diameter', unit: 'cm' }
  if (k === 'timeS') return { label: 'Run time', unit: 's' }
  return (p.ticksPerRev ?? 1) === 1 ? { label: 'Wheel turns', unit: 'turns' } : { label: 'Encoder ticks', unit: 'ticks' }
}

/** "1 turn", "3 turns", "1 tick" — other units (cm, s, rpm) do not change. */
function unitFor(v: number, unit: string): string {
  return v === 1 && (unit === 'turns' || unit === 'ticks') ? unit.slice(0, -1) : unit
}

const snap = (r: SizeRange, v: number) => Math.round(Math.max(r.min, Math.min(r.max, r.min + Math.round((v - r.min) / r.step) * r.step)) * 1e6) / 1e6

function rangeLabel(r: Range, unit: string): string {
  if (r.min !== undefined && r.max !== undefined) return r.min === r.max ? `exactly ${r.min} ${unit}` : `${r.min}–${r.max} ${unit}`
  if (r.min !== undefined) return `at least ${r.min} ${unit}`
  return `at most ${r.max} ${unit}`
}

function niceCeil(n: number): number {
  const steps = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000]
  for (const s of steps) if (n <= s * 10) return Math.ceil(n / s) * s
  return Math.ceil(n / 10000) * 10000
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '—'
  if (Math.abs(n) >= 100) return Math.round(n).toString()
  if (Math.abs(n) >= 10) return n.toFixed(1)
  return n.toFixed(2)
}

export default function MotorMathClient({ params, band, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const p = params
  const young = band === 'explorers' || band === 'builders'
  const showMath = p.showMath ?? !young
  const live = p.liveReadout ?? young
  const knobs = ORDER.filter((k) => p.knobs[k])

  const [vals, setVals] = useState<Answer>(() => {
    const a: Answer = {}
    for (const k of knobs) {
      const r = p.knobs[k] as SizeRange
      a[k] = r.min
    }
    return a
  })
  const [phase, setPhase] = useState<Phase>('idle')
  const [u, setU] = useState(0)
  const uRef = useRef(0)
  const reduced = useReducedMotion()
  const att = useAttempts(onSubmit, onDone)
  const sv = useSvgScale(VW)

  const r = useMemo(() => drive(p, vals), [p, vals])

  // Track length: covers the target zone generously, or the furthest possible drive.
  const trackCm = useMemo(() => {
    const t = p.target.distanceCm
    if (t) return niceCeil(Math.max(t.max ?? 0, t.min ?? 0) * 1.35)
    const most: Answer = {}
    for (const k of knobs) most[k] = (p.knobs[k] as SizeRange).max
    return niceCeil(drive(p, most).distanceCm * 1.05)
  }, [p, knobs])
  const pxPerCm = TRACK / trackCm
  const X = (cm: number) => X0 + Math.min(cm, trackCm * 1.04) * pxPerCm

  const visualS = Math.min(MAX_VISUAL_S, Math.max(0.8, r.timeS))
  useAnimationFrame(phase === 'running', (dt) => {
    const nu = Math.min(1, uRef.current + dt / visualS)
    const before = Math.floor(r.turns * uRef.current)
    const after = Math.floor(r.turns * nu)
    if (after > before && r.turns <= 30) playSound('click')
    uRef.current = nu
    setU(nu)
    if (nu >= 1) {
      setPhase('shown')
      att.submit(vals)
    }
  })

  const edit = (k: Knob, v: number) => {
    if (att.result) att.clear()
    playSound('click')
    setPhase('idle')
    uRef.current = 0
    setU(0)
    setVals((a) => ({ ...a, [k]: v }))
  }

  const go = () => {
    playSound('click')
    uRef.current = 0
    setU(0)
    if (reduced) {
      uRef.current = 1
      setU(1)
      setPhase('shown')
      att.submit(vals)
    } else setPhase('running')
  }

  const showNums = live || phase !== 'idle'
  const dist = r.distanceCm * u
  const wheelR = Math.max(6, Math.min(34, (r.diameterCm / 2) * pxPerCm))
  const wheelAngle = r.turns * u * 360
  const robotX = X(dist)
  const turnsDone = Math.floor(r.turns * u + 1e-9)
  const markEvery = Math.max(1, Math.ceil(r.turns / 24))
  const perTurnCm = r.circumferenceCm * (1 - (p.slip ?? 0))
  const offTrack = r.distanceCm > trackCm * 1.04 && u >= 1

  const tgt = p.target
  const zone = tgt.distanceCm
  const zoneA = zone ? X(zone.min ?? 0) : 0
  const zoneB = zone ? X(zone.max ?? trackCm) : 0
  const targetBits: string[] = []
  if (tgt.distanceCm) targetBits.push(`stop ${rangeLabel(tgt.distanceCm, 'cm')} from the start`)
  if (tgt.speedCmS) targetBits.push(`drive at ${rangeLabel(tgt.speedCmS, 'cm/s')}`)
  if (tgt.timeS) targetBits.push(`take ${rangeLabel(tgt.timeS, 's')}`)

  const ticksMajor = trackCm / 5
  const simClock = r.timeS * u

  return (
    <TemplateCard label="Motor maths drive test">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-500 px-3 py-1 font-display text-sm font-bold text-[#1A1103]">Job</span>
        <p className="text-[17px] font-semibold">
          {p.goal ? `Drive to the ${p.goal}: ` : 'Make the robot '}
          {targetBits.join(', and ')}.
        </p>
      </div>

      <div className="relative mt-3 overflow-hidden rounded-[20px] border border-white/10 bg-[#0A1120]">
        <svg ref={sv.ref} viewBox={`0 0 ${VW} 170`} className="block h-auto w-full" role="img" aria-label={`Drive track ${trackCm} cm long. ${phase === 'shown' ? `The robot drove ${fmt(r.distanceCm)} cm.` : ''}`}>
          {/* target zone */}
          {zone && (
            <g>
              <rect x={zoneA} y={GROUND - 74} width={Math.max(3, zoneB - zoneA)} height={74} fill="#22C55E" fillOpacity={0.14} />
              <line x1={zoneA} y1={GROUND - 74} x2={zoneA} y2={GROUND} stroke="#22C55E" strokeWidth={1.5} strokeDasharray="4 3" />
              <line x1={zoneB} y1={GROUND - 74} x2={zoneB} y2={GROUND} stroke="#22C55E" strokeWidth={1.5} strokeDasharray="4 3" />
              {p.goal && (
                <text x={(zoneA + zoneB) / 2} y={GROUND - 80} textAnchor="middle" fontSize={sv.font(11)} fontWeight={800} fill="#22C55E">
                  {p.goal}
                </text>
              )}
            </g>
          )}
          {/* ground + ruler */}
          <rect x={0} y={GROUND} width={VW} height={50} fill="#111C32" />
          <line x1={X0} y1={GROUND} x2={VW} y2={GROUND} stroke="#6E7888" strokeWidth={2} />
          {Array.from({ length: 6 }, (_, i) => (
            <g key={i}>
              <line x1={X(i * ticksMajor)} y1={GROUND} x2={X(i * ticksMajor)} y2={GROUND + 10} stroke="#A7B0C0" strokeWidth={1.5} />
              <text x={X(i * ticksMajor)} y={GROUND + 10 + sv.font(10)} textAnchor={i === 5 ? 'end' : 'middle'} fontSize={sv.font(10)} fill="#A7B0C0">
                {Math.round(i * ticksMajor)}
                {i === 5 ? ' cm' : ''}
              </text>
            </g>
          ))}
          <line x1={X0} y1={GROUND - 60} x2={X0} y2={GROUND} stroke="#EEF2F8" strokeWidth={2} />
          <text x={X0 + 3} y={GROUND - 64} fontSize={sv.font(10)} fontWeight={700} fill="#A7B0C0">
            start
          </text>
          {/* one mark per wheel turn: each is one circumference apart */}
          {Array.from({ length: turnsDone }, (_, i) => i + 1)
            .filter((k) => k % markEvery === 0)
            .map((k) => (
              <g key={k}>
                <line x1={X(k * perTurnCm)} y1={GROUND - 4} x2={X(k * perTurnCm)} y2={GROUND + 4} stroke="#FC6818" strokeWidth={2.5} />
                {r.turns <= 12 && (
                  <text x={X(k * perTurnCm)} y={GROUND + 14 + 2 * sv.font(10)} textAnchor="middle" fontSize={sv.font(9)} fontWeight={700} fill="#FFA878">
                    {k}
                  </text>
                )}
              </g>
            ))}
          {/* robot */}
          <g transform={`translate(${robotX} ${GROUND})`}>
            <rect x={-wheelR - 22} y={-wheelR - 20} width={2 * wheelR + 26} height={16} rx={5} fill="#FC6818" />
            <circle cx={wheelR - 2} cy={-wheelR - 12} r={2.5} fill="#1A1103" />
            <g transform={`translate(0 ${-wheelR}) rotate(${wheelAngle})`}>
              <circle r={wheelR} fill="#19263F" stroke="#EEF2F8" strokeWidth={2} />
              <line x1={0} y1={0} x2={0} y2={wheelR - 1} stroke="#EEF2F8" strokeWidth={1.5} />
              <circle cx={0} cy={wheelR - 2} r={2.5} fill="#FC6818" />
            </g>
          </g>
          {offTrack && (
            <text x={VW - 6} y={GROUND - 30} textAnchor="end" fontSize={sv.font(12)} fontWeight={800} fill="#FFA878">
              → {fmt(r.distanceCm)} cm
            </text>
          )}
          <text x={VW - 8} y={16} textAnchor="end" fontSize={sv.font(12)} fontWeight={800} fill="#EEF2F8">
            ⏱ {simClock.toFixed(1)} s{r.timeS > MAX_VISUAL_S && phase === 'running' ? ' (sped up)' : ''}
          </text>
          {r.turns <= 12 && (
            <text x={8} y={16} fontSize={sv.font(11)} fontWeight={700} fill="#FFA878">
              wheel turns: {phase === 'idle' ? 0 : turnsDone}
            </text>
          )}
        </svg>
      </div>

      {/* sliders */}
      <div className={`mt-3 grid gap-2 ${knobs.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        {knobs.map((k) => {
          const range = p.knobs[k] as SizeRange
          const v = vals[k] ?? range.min
          const info = knobInfo(k, p)
          const id = `mm-${k}`
          return (
            <div key={k} className="rounded-2xl border border-white/10 bg-[#111C32] p-3">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={id} className="font-semibold text-[#A7B0C0]">
                  {info.label}
                </label>
                <span className="font-display text-xl font-bold tabular-nums text-amber-300">
                  {v} {unitFor(v, info.unit)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <button type="button" className={`${btnGhost} min-w-[48px] px-0`} aria-label={`Less ${info.label.toLowerCase()}`} disabled={v <= range.min + 1e-9 || phase === 'running'} onClick={() => edit(k, snap(range, v - range.step))}>
                  −
                </button>
                <input
                  id={id}
                  type="range"
                  min={range.min}
                  max={range.max}
                  step={range.step}
                  value={v}
                  disabled={phase === 'running'}
                  onChange={(e) => edit(k, snap(range, Number(e.target.value)))}
                  className="h-12 w-full cursor-pointer accent-amber-500"
                  aria-valuetext={`${v} ${unitFor(v, info.unit)}`}
                />
                <button type="button" className={`${btnGhost} min-w-[48px] px-0`} aria-label={`More ${info.label.toLowerCase()}`} disabled={v >= range.max - 1e-9 || phase === 'running'} onClick={() => edit(k, snap(range, v + range.step))}>
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* givens */}
      <p className="mt-2 text-[15px] text-[#A7B0C0]">
        Given:{' '}
        {ORDER.filter((k) => p.fixed[k] !== undefined && !p.knobs[k])
          .map((k) => `${knobInfo(k, p).label.toLowerCase()} ${valueOf(p, vals, k)} ${knobInfo(k, p).unit}`)
          .join(' · ')}
        {p.command === 'ticks' && (p.ticksPerRev ?? 1) > 1 ? ` · encoder ${p.ticksPerRev} ticks per turn` : ''}
        {(p.slip ?? 0) > 0 ? ` · wheel slip ${Math.round((p.slip ?? 0) * 100)}%` : ''}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Readout label="One turn moves" value={showNums || young ? fmt(r.circumferenceCm) : '?'} unit="cm" tone="cyan" />
        <Readout label="Wheel turns" value={showNums ? fmt(r.turns) : '?'} />
        <Readout label="Speed" value={showNums ? fmt(r.speedCmS) : '?'} unit="cm/s" />
        <Readout
          label={tgt.timeS ? 'Time' : 'Distance'}
          value={showNums ? fmt(tgt.timeS ? r.timeS : r.distanceCm) : '?'}
          unit={tgt.timeS ? 's' : 'cm'}
          tone={showNums && phase !== 'idle' ? (att.result?.correct ? 'good' : 'bad') : 'plain'}
        />
      </div>
      {tgt.timeS && tgt.distanceCm && <p className="mt-2 text-sm text-[#A7B0C0]">Distance: {showNums ? `${fmt(r.distanceCm)} cm` : '?'}</p>}

      {showMath && showNums && <p className="mt-2 rounded-2xl bg-[#111C32] px-3 py-2 text-[15px] leading-relaxed text-[#A7B0C0]">{explain(p, r)}</p>}
      {p.showCode && (
        <details className="mt-2 rounded-2xl border border-white/10 bg-[#111C32] px-3 py-2" open={!young}>
          <summary className="flex min-h-[44px] cursor-pointer items-center font-semibold text-[#00E5FF]">Python view</summary>
          <pre className="overflow-x-auto pb-1 font-mono text-[13px] leading-relaxed text-[#EEF2F8]">{showNums ? pythonView(p, vals) : pythonView(p, vals).replace(/#.*$/gm, '# = ?')}</pre>
        </details>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} onClick={go} disabled={phase === 'running' || !!att.result || att.done}>
          Go! ▶
        </button>
      </div>
      <FeedbackPanel
        att={att}
        onRetry={() => {
          setPhase('idle')
          uRef.current = 0
          setU(0)
        }}
      />
    </TemplateCard>
  )
}
