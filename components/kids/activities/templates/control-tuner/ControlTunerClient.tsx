'use client'

// components/kids/activities/templates/control-tuner/ControlTunerClient.tsx
// Slide the gains, press Run: the robot (a docking rover, a cruising delivery
// bot or a hovering drone) acts out the simulated response while the graph
// draws it against the spec — overshoot ceiling, settle band, deadline. The
// last run stays as a ghost so the child sees what each change did.

import { useMemo, useRef, useState } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound } from '@/lib/kids-audio'
import { PLANT_INFO, kindsOf, resolve, simulate, usesGain, type Answer, type ControllerKind, type Params, type SimResult } from './logic'
import { FeedbackPanel, Readout, TemplateCard, btnPrimary, chip, useAnimationFrame, useAttempts, useReducedMotion } from '../gear-train/TemplateFrameClient'

const VW = 400
const PH = 190
const L = 40
const R = 10
const TOP = 10
const BOT = 160
const KIND_LABEL: Record<ControllerKind, string> = { 'bang-bang': 'Bang-bang', p: 'P', pi: 'PI', pd: 'PD', pid: 'PID' }
const GAIN_LABEL = { kp: 'Kp · push', ki: 'Ki · catch-up', kd: 'Kd · brake' } as const
const slider = 'h-11 w-full cursor-pointer rounded-xl accent-amber-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

const r1 = (n: number) => Math.round(n * 10) / 10
const r2 = (n: number) => Math.round(n * 100) / 100

export default function ControlTunerClient({ params: p, band, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const info = PLANT_INFO[p.plant]
  const showCode = p.showCode ?? band === 'engineers'
  const kinds = kindsOf(p)
  const [kind, setKind] = useState<ControllerKind>(kinds[0])
  const [g, setG] = useState(() => ({
    kp: p.gains.kp?.min ?? 0,
    ki: p.gains.ki?.min ?? 0,
    kd: p.gains.kd?.min ?? 0,
  }))
  const [shown, setShown] = useState<SimResult | null>(null)
  const [ghost, setGhost] = useState<SimResult | null>(null)
  const [play, setPlay] = useState<number | null>(null)
  const playRef = useRef(0)
  const reduced = useReducedMotion()
  const att = useAttempts(onSubmit, onDone)
  const solved = !!att.result?.correct

  const answer: Answer = useMemo(
    () => ({
      ...(kinds.length > 1 ? { controller: kind } : {}),
      ...(p.gains.kp && usesGain(kind, 'kp') ? { kp: g.kp } : {}),
      ...(p.gains.ki && usesGain(kind, 'ki') ? { ki: g.ki } : {}),
      ...(p.gains.kd && usesGain(kind, 'kd') ? { kd: g.kd } : {}),
    }),
    [kind, g, p.gains, kinds.length],
  )
  const eff = resolve(p, answer)

  // Plot scale
  const yMax = Math.max(Math.abs(p.target) * 1.6, ...(shown ? shown.y.map(Math.abs) : [0]), ...(ghost ? ghost.y.map(Math.abs) : [0]))
  const yMin = Math.min(0, ...(shown ? shown.y : [0]))
  const X = (t: number) => L + ((VW - L - R) * t) / p.durationS
  const Y = (v: number) => BOT - ((BOT - TOP) * (v - yMin)) / Math.max(1e-6, yMax - yMin)
  const step = Math.abs(p.target)
  const bandW = ((p.spec.bandPct ?? 5) / 100) * step

  const playS = Math.min(6, Math.max(2.5, p.durationS * 0.5))
  useAnimationFrame(play !== null, (dt) => {
    const nu = Math.min(1, playRef.current + dt / playS)
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

  const run = () => {
    playSound('click')
    const r = simulate(p, answer)
    if (shown) setGhost(shown)
    setShown(r)
    if (reduced) {
      att.submit(answer)
      return
    }
    playRef.current = 0
    setPlay(0)
  }

  const path = (r: SimResult, upto: number) =>
    r.t
      .slice(0, upto)
      .map((t, i) => `${i ? 'L' : 'M'}${X(t).toFixed(1)} ${Y(r.y[i]).toFixed(1)}`)
      .join(' ')
  const n = shown?.t.length ?? 0
  const upto = play === null ? n : Math.max(1, Math.floor(play * (n - 1)) + 1)
  const idx = Math.max(0, upto - 1)
  const yNow = shown ? shown.y[idx] : 0
  const tNow = shown ? shown.t[idx] : 0
  const uNow = shown ? shown.u[idx] : 0

  // distance travelled for the speed scene
  const travelled = useMemo(() => {
    if (!shown || p.plant !== 'speed') return [] as number[]
    const out: number[] = [0]
    for (let i = 1; i < shown.t.length; i++) out.push(out[i - 1] + shown.y[i] * (shown.t[i] - shown.t[i - 1]))
    return out
  }, [shown, p.plant])

  const tuneKeys = (['kp', 'ki', 'kd'] as const).filter((k) => p.gains[k] && usesGain(kind, k))
  const specBits: string[] = []
  if (p.spec.maxOvershootPct !== undefined) specBits.push(`overshoot ≤ ${p.spec.maxOvershootPct} %`)
  if (p.spec.settleS !== undefined) specBits.push(`settle within ${p.spec.settleS} s`)
  if (p.spec.maxSteadyErr !== undefined) specBits.push(`final error ≤ ${p.spec.maxSteadyErr} ${info.unit}`)

  return (
    <TemplateCard label="Control tuner">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-500 px-3 py-1 font-display text-sm font-bold text-[#1A1103]">{p.label ?? 'Reach the target'}</span>
        <span className="text-[15px] text-[#EEF2F8]">
          Target {p.target} {info.unit} · {specBits.join(' · ')}
        </span>
      </div>

      {/* scene */}
      <div className="mt-3 overflow-hidden rounded-[20px] border border-white/10 bg-[#0A1120]">
        <svg viewBox={`0 0 ${VW} 104`} className="block h-auto w-full" role="img" aria-label={`${info.quantity} now ${r2(yNow)} ${info.unit}, target ${p.target} ${info.unit}`}>
          {p.plant === 'position' && <PositionScene y={yNow} target={p.target} />}
          {p.plant === 'speed' && <SpeedScene v={yNow} dist={travelled[idx] ?? 0} target={p.target} />}
          {p.plant === 'altitude' && <AltitudeScene h={yNow} target={p.target} thrust={uNow} t={tNow} gust={!!p.disturbance && tNow >= p.disturbance.t && tNow < p.disturbance.t + p.disturbance.durationS} />}
        </svg>
      </div>

      {/* response plot */}
      <div className="mt-2 overflow-hidden rounded-[20px] border border-white/10 bg-[#0A1120]">
        <svg viewBox={`0 0 ${VW} ${PH}`} className="block h-auto w-full" role="img" aria-label={shown ? `Response: overshoot ${r1(shown.overshootPct)} percent` : 'Response graph, press Run'}>
          <rect x={L} y={Y(p.target + bandW)} width={VW - L - R} height={Math.max(1, Y(p.target - bandW) - Y(p.target + bandW))} fill="#22C55E" opacity={0.12} />
          <line x1={L} x2={VW - R} y1={Y(p.target)} y2={Y(p.target)} stroke="#22C55E" strokeWidth={1.5} strokeDasharray="6 4" />
          {p.spec.maxOvershootPct !== undefined && (
            <line
              x1={L}
              x2={VW - R}
              y1={Y(p.target + (Math.sign(p.target) * p.spec.maxOvershootPct * step) / 100)}
              y2={Y(p.target + (Math.sign(p.target) * p.spec.maxOvershootPct * step) / 100)}
              stroke="#FC6818"
              strokeDasharray="3 4"
            />
          )}
          {p.spec.settleS !== undefined && <line x1={X(p.spec.settleS)} x2={X(p.spec.settleS)} y1={TOP} y2={BOT} stroke="#A7B0C0" strokeDasharray="3 4" />}
          {p.disturbance && <rect x={X(p.disturbance.t)} y={TOP} width={X(p.disturbance.t + p.disturbance.durationS) - X(p.disturbance.t)} height={BOT - TOP} fill="#00B8D4" opacity={0.12} />}
          <line x1={L} x2={L} y1={TOP} y2={BOT} stroke="#6E7888" />
          <line x1={L} x2={VW - R} y1={BOT} y2={BOT} stroke="#6E7888" />
          {[0, 0.5, 1].map((f) => (
            <text key={f} x={X(p.durationS * f)} y={BOT + 14} textAnchor="middle" fontSize={10} fill="#A7B0C0">
              {r1(p.durationS * f)} s
            </text>
          ))}
          <text x={L - 4} y={Y(p.target) + 3.5} textAnchor="end" fontSize={10} fill="#22C55E">
            {p.target}
          </text>
          <text x={L - 4} y={Y(0) + 3.5} textAnchor="end" fontSize={10} fill="#A7B0C0">
            0
          </text>
          <text x={VW - R} y={BOT + 26} textAnchor="end" fontSize={10} fontWeight={700} fill="#A7B0C0">
            {info.quantity} ({info.unit}) over time
          </text>
          {ghost && <path d={path(ghost, ghost.t.length)} fill="none" stroke="#6E7888" strokeWidth={1.5} strokeDasharray="4 3" />}
          {shown && <path d={path(shown, upto)} fill="none" stroke="#00E5FF" strokeWidth={2.5} strokeLinejoin="round" />}
          {shown && <circle cx={X(tNow)} cy={Y(yNow)} r={4} fill="#00E5FF" />}
          {p.spec.settleS !== undefined && (
            <text x={X(p.spec.settleS) + 3} y={TOP + 10} fontSize={9} fill="#A7B0C0">
              deadline
            </text>
          )}
        </svg>
      </div>
      <p className="mt-1 text-xs text-[#A7B0C0]">
        Green band = close enough. Orange dashes = overshoot limit.{ghost ? ' Grey dashes = your last run.' : ''}
        {p.disturbance ? ' Blue = gust.' : ''}
      </p>

      {/* controller choice */}
      {kinds.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Controller">
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              disabled={solved || play !== null}
              onClick={() => edit(() => {
                playSound('click')
                setKind(k)
              })}
              className={`${chip} ${kind === k ? 'border-amber-400 bg-amber-500 text-[#1A1103]' : 'border-white/15 bg-[#19263F] text-[#EEF2F8]'}`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      )}

      {/* gains */}
      {tuneKeys.length > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {tuneKeys.map((k) => {
            const rng = p.gains[k]!
            return (
              <label key={k} className="block">
                <span className="text-sm font-semibold text-[#A7B0C0]">
                  {GAIN_LABEL[k]}: <span className="font-display text-amber-300">{g[k]}</span>
                </span>
                <input
                  type="range"
                  min={rng.min}
                  max={rng.max}
                  step={rng.step}
                  value={g[k]}
                  disabled={solved || play !== null}
                  className={slider}
                  onChange={(e) => edit(() => setG((o) => ({ ...o, [k]: Number(e.target.value) })))}
                />
              </label>
            )
          })}
        </div>
      )}
      {kind === 'bang-bang' && <p className="mt-3 text-[15px] text-[#A7B0C0]">Bang-bang: full power towards the target, full power back if it passes. Nothing to tune.</p>}

      {showCode && (
        <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-[#111C32] p-3 font-mono text-[13px] leading-relaxed text-[#EEF2F8]">
          {`# runs 50 times a second
error = ${p.target} - reading
${eff.ki ? `integral += error * 0.02\n` : ''}${eff.kd ? `rate = (reading - last_reading) / 0.02\n` : ''}power = ${eff.kp} * error${eff.ki ? ` + ${eff.ki} * integral` : ''}${eff.kd ? ` - ${eff.kd} * rate` : ''}${
            p.plant === 'altitude' && p.feedForward ? ' + hover_thrust' : ''
          }
motor(clamp(power, ${p.plant === 'altitude' ? 0 : -(p.physics?.uMax ?? info.uMax)}, ${p.physics?.uMax ?? info.uMax}))`}
        </pre>
      )}

      {shown && play === null && (
        <div className="mt-3 grid grid-cols-3 gap-2" aria-live="polite">
          <Readout label="Overshoot" value={`${r1(shown.overshootPct)}`} unit="%" tone={p.spec.maxOvershootPct === undefined || shown.overshootPct <= p.spec.maxOvershootPct ? 'good' : 'bad'} />
          <Readout
            label="Settled at"
            value={Number.isFinite(shown.settleS) ? `${r1(shown.settleS)}` : 'never'}
            unit={Number.isFinite(shown.settleS) ? 's' : undefined}
            tone={p.spec.settleS === undefined || shown.settleS <= p.spec.settleS ? 'good' : 'bad'}
          />
          <Readout label="Final error" value={`${r2(shown.steadyErr)}`} unit={info.unit} tone={p.spec.maxSteadyErr === undefined || shown.steadyErr <= p.spec.maxSteadyErr ? 'good' : 'bad'} />
        </div>
      )}

      {!att.result && (
        <div className="mt-4">
          <button type="button" className={btnPrimary} onClick={run} disabled={play !== null}>
            {play !== null ? 'Running…' : shown ? 'Run again' : 'Run'}
          </button>
        </div>
      )}
      <FeedbackPanel att={att} />
    </TemplateCard>
  )
}

function Bot({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-16} y={-18} width={32} height={20} rx={6} fill="#FC6818" />
      <rect x={-10} y={-13} width={20} height={8} rx={3} fill="#0A1120" />
      <circle cx={-5} cy={-9} r={2} fill="#00E5FF" />
      <circle cx={5} cy={-9} r={2} fill="#00E5FF" />
      <circle cx={-9} cy={4} r={5} fill="#EEF2F8" />
      <circle cx={9} cy={4} r={5} fill="#EEF2F8" />
    </g>
  )
}

function PositionScene({ y, target }: { y: number; target: number }) {
  const span = Math.abs(target) * 1.5
  const X = (v: number) => 40 + ((VW - 80) * (v + 0)) / span
  return (
    <g>
      <rect x={0} y={84} width={VW} height={20} fill="#111C32" />
      <rect x={X(target) - 3} y={36} width={6} height={48} fill="#22C55E" />
      <text x={X(target)} y={30} textAnchor="middle" fontSize={11} fontWeight={700} fill="#22C55E">
        dock
      </text>
      <line x1={X(0)} y1={70} x2={X(0)} y2={86} stroke="#A7B0C0" strokeWidth={2} />
      <Bot x={X(Math.max(-0.1 * span, Math.min(1.1 * span, y))) - 18} y={78} />
    </g>
  )
}

function SpeedScene({ v, dist, target }: { v: number; dist: number; target: number }) {
  const px = 60 // px per metre
  const off = (dist * px) % 40
  return (
    <g>
      <rect x={0} y={84} width={VW} height={20} fill="#111C32" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={i * 40 - off} y={92} width={20} height={4} fill="#6E7888" />
      ))}
      <Bot x={200} y={78} />
      <text x={20} y={26} fontSize={13} fontWeight={800} fill="#00E5FF" className="font-display">
        {r2(v)} m/s
      </text>
      <text x={VW - 20} y={26} textAnchor="end" fontSize={11} fontWeight={700} fill="#22C55E">
        target {target} m/s
      </text>
    </g>
  )
}

function AltitudeScene({ h, target, thrust, t, gust }: { h: number; target: number; thrust: number; t: number; gust: boolean }) {
  const top = Math.abs(target) * 1.6
  const Y = (v: number) => 92 - (80 * Math.min(top, Math.max(0, v))) / top
  const spin = (t * 40) % 2 < 1
  return (
    <g>
      <rect x={0} y={92} width={VW} height={12} fill="#111C32" />
      <line x1={0} x2={VW} y1={Y(target)} y2={Y(target)} stroke="#22C55E" strokeDasharray="6 4" />
      <text x={VW - 12} y={Y(target) - 4} textAnchor="end" fontSize={11} fontWeight={700} fill="#22C55E">
        {target} m
      </text>
      {gust && (
        <text x={150} y={20} fontSize={16}>
          💨⬇
        </text>
      )}
      <g transform={`translate(200 ${Y(h)})`}>
        <rect x={-18} y={-6} width={36} height={8} rx={4} fill="#FC6818" />
        <line x1={-24} x2={-12} y1={-9} y2={-9} stroke="#EEF2F8" strokeWidth={spin ? 3 : 1.5} />
        <line x1={12} x2={24} y1={-9} y2={-9} stroke="#EEF2F8" strokeWidth={spin ? 1.5 : 3} />
        {thrust > 0 && <rect x={-3} y={3} width={6} height={Math.min(14, thrust * 0.6)} rx={2} fill="#00E5FF" opacity={0.6} />}
      </g>
      <text x={20} y={26} fontSize={13} fontWeight={800} fill="#00E5FF" className="font-display">
        {r2(h)} m
      </text>
    </g>
  )
}
