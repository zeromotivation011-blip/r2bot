'use client'

// components/kids/activities/templates/threshold-tuner/ThresholdTunerClient.tsx
// Drag the threshold through a cloud of noisy readings. Two strips under the
// graph compare what was REALLY happening with what the ROBOT THINKS; every
// flicker shows up as a stripe. Older bands add a hysteresis band and a
// moving-average filter. "Test drive" replays the run, then checks.

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound } from '@/lib/kids-audio'
import { simulate, type Answer, type Params, type WorldState } from './logic'
import { r1 } from '../signal-graph/trace'
import { FeedbackPanel, Readout, TemplateCard, btnPrimary, useAnimationFrame, useAttempts, useReducedMotion } from '../gear-train/TemplateFrameClient'

const VW = 400
const VH = 250
const L = 40
const R = 10
const TOP = 10
const BOT = 170
const STRIP_H = 22
const S1 = 186
const S2 = 218
const PLAY_S = 4

const slider =
  'h-11 w-full cursor-pointer accent-amber-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 rounded-xl'

export default function ThresholdTunerClient({ params: p, band, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const { min, max, unit } = p.sensor
  const live = p.liveStats ?? band !== 'engineers'
  const span = max - min
  const step = span >= 200 ? 1 : span >= 20 ? 0.5 : 0.1
  const snap = (v: number) => Math.max(min, Math.min(max, Math.round(v / step) * step))

  const [threshold, setThreshold] = useState(() => snap(min + span * 0.88))
  const [hyst, setHyst] = useState(0)
  const [win, setWin] = useState(1)
  const [play, setPlay] = useState<number | null>(null)
  const playRef = useRef(0)
  const dragging = useRef(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const reduced = useReducedMotion()
  const att = useAttempts(onSubmit, onDone)
  const solved = !!att.result?.correct

  const answer: Answer = useMemo(
    () => ({ threshold, ...(p.knobs?.hysteresis ? { hysteresis: hyst } : {}), ...(p.knobs?.filter ? { window: win } : {}) }),
    [threshold, hyst, win, p.knobs],
  )
  const run = useMemo(() => simulate(p, answer), [p, answer])
  const D = p.trace.durationS
  const X = (t: number) => L + ((VW - L - R) * t) / D
  const Y = (v: number) => BOT - ((BOT - TOP) * (v - min)) / span
  const vOf = (y: number) => min + ((BOT - y) * span) / (BOT - TOP)
  const colourOf = (s: WorldState) => (s === 'low' ? '#00B8D4' : '#FC6818')

  useAnimationFrame(play !== null, (dt) => {
    const nu = Math.min(1, playRef.current + dt / PLAY_S)
    const i0 = Math.floor(playRef.current * (run.decision.length - 1))
    const i1 = Math.floor(nu * (run.decision.length - 1))
    for (let i = i0 + 1; i <= i1; i++) if (run.decision[i] !== run.decision[i - 1]) playSound('click')
    playRef.current = nu
    setPlay(nu)
    if (nu >= 1) {
      setPlay(null)
      att.submit(answer)
    }
  })

  const edit = (fn: () => void) => {
    if (solved || play !== null) return
    if (att.result) att.clear()
    fn()
  }

  const setFromPointer = (e: PointerEvent<SVGSVGElement>) => {
    const b = svgRef.current?.getBoundingClientRect()
    if (!b) return
    const y = ((e.clientY - b.top) * VH) / b.height
    if (y > BOT + 4) return
    edit(() => setThreshold(snap(vOf(y))))
  }

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const big = e.shiftKey ? 10 : 1
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault()
      edit(() => setThreshold((v) => snap(v + step * big)))
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault()
      edit(() => setThreshold((v) => snap(v - step * big)))
    }
  }

  const test = () => {
    playSound('click')
    if (reduced) {
      att.submit(answer)
      return
    }
    playRef.current = 0
    setPlay(0)
  }

  const n = run.samples.length
  const cut = play === null ? n : Math.max(1, Math.floor(play * (n - 1)) + 1)
  const sw = (VW - L - R) / Math.max(1, n - 1)
  const showFiltered = (p.knobs?.filter && win > 1) || false
  const filtPath = run.filtered
    .slice(0, cut)
    .map((v, i) => `${i ? 'L' : 'M'}${X(run.samples[i].t).toFixed(1)} ${Y(v).toFixed(1)}`)
    .join(' ')
  const cur = play === null ? null : Math.min(n - 1, cut - 1)
  const curState = cur !== null ? run.decision[cur] : null
  const truthState = cur !== null ? run.truth[cur] : null
  const showStats = live || att.result !== null

  return (
    <TemplateCard label="Threshold tuner">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#00B8D4] px-3 py-1 font-display text-sm font-bold text-[#0A1120]">{p.sensor.name}</span>
        <p className="text-[15px] text-[#EEF2F8]">
          Above the line the robot thinks <b className="text-amber-300">{p.states.high.icon} {p.states.high.label}</b> and will{' '}
          {p.states.high.action.toLowerCase()}; below it, <b className="text-[#00E5FF]">{p.states.low.icon} {p.states.low.label}</b> and will{' '}
          {p.states.low.action.toLowerCase()}.
        </p>
      </div>

      <div className="relative mt-3 overflow-hidden rounded-[20px] border border-white/10 bg-[#0A1120]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          className="block h-auto w-full touch-none select-none outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          tabIndex={0}
          role="slider"
          aria-label="Threshold"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={threshold}
          aria-valuetext={`${r1(threshold)} ${unit}`}
          onPointerDown={(e) => {
            dragging.current = true
            e.currentTarget.setPointerCapture(e.pointerId)
            playSound('click')
            setFromPointer(e)
          }}
          onPointerMove={(e) => dragging.current && setFromPointer(e)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
          onKeyDown={onKey}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={L} x2={VW - R} y1={Y(min + f * span)} y2={Y(min + f * span)} stroke="#19263F" />
              <text x={L - 5} y={Y(min + f * span) + 3.5} textAnchor="end" fontSize={10} fill="#A7B0C0">
                {r1(min + f * span)}
              </text>
            </g>
          ))}
          <text x={4} y={TOP + 8} fontSize={9} fontWeight={700} fill="#A7B0C0">
            {unit}
          </text>

          {/* hysteresis band */}
          {hyst > 0 && <rect x={L} y={Y(threshold + hyst / 2)} width={VW - L - R} height={Y(threshold - hyst / 2) - Y(threshold + hyst / 2)} fill="#FC6818" opacity={0.13} />}

          {/* readings */}
          {run.samples.slice(0, cut).map((s, i) => (
            <circle
              key={i}
              cx={X(s.t)}
              cy={Y(s.v)}
              r={n > 160 ? 1.6 : 2.2}
              fill={live ? colourOf(run.truth[i]) : '#EEF2F8'}
              opacity={showFiltered ? 0.45 : 0.9}
            />
          ))}
          {showFiltered && <path d={filtPath} fill="none" stroke="#FFA878" strokeWidth={2} />}

          {/* threshold */}
          <line x1={L} x2={VW - R} y1={Y(threshold)} y2={Y(threshold)} stroke="#FC6818" strokeWidth={2.5} />
          {hyst > 0 && (
            <>
              <line x1={L} x2={VW - R} y1={Y(threshold + hyst / 2)} y2={Y(threshold + hyst / 2)} stroke="#FC6818" strokeDasharray="4 4" />
              <line x1={L} x2={VW - R} y1={Y(threshold - hyst / 2)} y2={Y(threshold - hyst / 2)} stroke="#FC6818" strokeDasharray="4 4" />
            </>
          )}
          <rect x={VW - R - 62} y={Y(threshold) - 11} width={60} height={22} rx={7} fill="#FC6818" />
          <text x={VW - R - 32} y={Y(threshold) + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill="#1A1103">
            {r1(threshold)} {unit}
          </text>

          {/* strips: truth vs decision */}
          <text x={L - 4} y={S1 + 15} textAnchor="end" fontSize={9} fontWeight={700} fill="#A7B0C0">
            Really
          </text>
          <text x={L - 4} y={S2 + 15} textAnchor="end" fontSize={9} fontWeight={700} fill="#A7B0C0">
            Robot
          </text>
          {run.truth.map((s, i) => (
            <rect key={`t${i}`} x={X(run.samples[i].t) - sw / 2} y={S1} width={sw + 0.4} height={STRIP_H} fill={colourOf(s)} opacity={0.85} />
          ))}
          {run.decision.slice(0, cut).map((s, i) => (
            <rect key={`d${i}`} x={X(run.samples[i].t) - sw / 2} y={S2} width={sw + 0.4} height={STRIP_H} fill={colourOf(s)} opacity={0.85} />
          ))}
          {run.decision.slice(0, cut).map((s, i) =>
            s !== run.truth[i] ? <rect key={`x${i}`} x={X(run.samples[i].t) - sw / 2} y={S2 + STRIP_H} width={sw + 0.4} height={4} fill="#EEF2F8" /> : null,
          )}
          {cur !== null && <line x1={X(run.samples[cur].t)} x2={X(run.samples[cur].t)} y1={TOP} y2={S2 + STRIP_H + 4} stroke="#EEF2F8" strokeWidth={1.5} />}
        </svg>
        {cur !== null && curState && truthState && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-2xl border border-white/15 bg-[#111C32]/90 px-3 py-1.5 text-sm font-bold" aria-hidden>
            Robot: {p.states[curState].icon} {p.states[curState].action}
            {curState !== truthState && <span className="ml-1 text-amber-300">(oops)</span>}
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#A7B0C0]">
        <span>
          <span className="mr-1 inline-block h-3 w-3 rounded-sm bg-amber-500 align-middle" /> {p.states.high.label}
        </span>
        <span>
          <span className="mr-1 inline-block h-3 w-3 rounded-sm bg-[#00B8D4] align-middle" /> {p.states.low.label}
        </span>
        <span>White tick = robot got it wrong. Drag the graph or use arrow keys to move the line.</span>
      </div>

      {/* controls */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-[#A7B0C0]">
            Threshold: <span className="font-display text-amber-300">{r1(threshold)} {unit}</span>
          </span>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={threshold}
            className={slider}
            disabled={solved || play !== null}
            onChange={(e) => edit(() => setThreshold(snap(Number(e.target.value))))}
          />
        </label>
        {p.knobs?.hysteresis && (
          <label className="block">
            <span className="text-sm font-semibold text-[#A7B0C0]">
              Hysteresis band: <span className="font-display text-amber-300">{r1(hyst)} {unit}</span>
            </span>
            <input
              type="range"
              min={0}
              max={p.knobs.hysteresis.max}
              step={step}
              value={hyst}
              className={slider}
              disabled={solved || play !== null}
              onChange={(e) => edit(() => setHyst(Number(e.target.value)))}
            />
          </label>
        )}
        {p.knobs?.filter && (
          <label className="block">
            <span className="text-sm font-semibold text-[#A7B0C0]">
              Average of last <span className="font-display text-amber-300">{win}</span> reading{win === 1 ? '' : 's'}
            </span>
            <input
              type="range"
              min={1}
              max={p.knobs.filter.maxWindow}
              step={1}
              value={win}
              className={slider}
              disabled={solved || play !== null}
              onChange={(e) => edit(() => setWin(Number(e.target.value)))}
            />
          </label>
        )}
      </div>

      {showStats && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-live="polite">
          <Readout label="Wrong decisions" value={`${r1(run.errorPct)}`} unit={`% (max ${p.allowedErrorPct})`} tone={run.errorPct <= p.allowedErrorPct ? 'good' : 'bad'} />
          <Readout
            label="Mind changes"
            value={`${run.switches}`}
            unit={`(world: ${run.realChanges})`}
            tone={run.extraSwitches <= (p.maxExtraSwitches ?? 0) ? 'good' : 'bad'}
          />
        </div>
      )}

      {!att.result && (
        <div className="mt-4">
          <button type="button" className={btnPrimary} onClick={test} disabled={play !== null}>
            {play !== null ? 'Test driving…' : 'Test drive'}
          </button>
        </div>
      )}
      <FeedbackPanel att={att} />
    </TemplateCard>
  )
}
