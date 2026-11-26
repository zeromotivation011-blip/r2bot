'use client'

// components/kids/activities/templates/sensor-choice/SensorChoiceClient.tsx
// Fit sensors from the shelf onto the robot, then run the mission. The robot
// drives checkpoint to checkpoint; at each one the sensor that handles it
// lights up — or the robot stops and Spark explains what went wrong.

import { useMemo, useRef, useState } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound } from '@/lib/kids-audio'
import {
  CAPABILITY_LABEL,
  CONDITION_LABEL,
  SENSORS,
  conditionsAt,
  costOf,
  runMission,
  type Answer,
  type Params,
  type SensorId,
} from './logic'
import { FeedbackPanel, TemplateCard, btnGhost, btnPrimary, useAnimationFrame, useAttempts, useReducedMotion } from '../gear-train/TemplateFrameClient'

const VW = 400
const VH = 150
const PATH_Y = 96
const STEP_S = 0.85

type Phase = 'build' | 'running' | 'shown'

export default function SensorChoiceClient({ params: p, band, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const young = band === 'explorers' || band === 'builders'
  const showCaps = p.showCapabilities ?? young
  const [fitted, setFitted] = useState<SensorId[]>([])
  const [phase, setPhase] = useState<Phase>('build')
  const [t, setT] = useState(0) // progress in checkpoints (0..needs.length)
  const tRef = useRef(0)
  const [openHow, setOpenHow] = useState<SensorId | null>(null)
  const reduced = useReducedMotion()
  const att = useAttempts(onSubmit, onDone)

  const run = useMemo(() => runMission(p, fitted), [p, fitted])
  const firstFail = run.findIndex((o) => !o.ok)
  const stopAt = firstFail === -1 ? run.length : firstFail + 1 // robot reaches this checkpoint number
  const cost = costOf(fitted)
  const full = fitted.length >= p.maxSensors
  const n = p.needs.length
  const X = (i: number) => 40 + (i * (VW - 80)) / Math.max(1, n) // i = 0 start … n = last checkpoint

  useAnimationFrame(phase === 'running', (dt) => {
    const nt = Math.min(stopAt, tRef.current + dt / STEP_S)
    if (Math.floor(nt) > Math.floor(tRef.current)) {
      const o = run[Math.floor(nt) - 1]
      playSound(o?.ok ? 'click' : 'wrong')
    }
    tRef.current = nt
    setT(nt)
    if (nt >= stopAt) {
      setPhase('shown')
      att.submit({ sensors: fitted })
    }
  })

  const toggle = (s: SensorId) => {
    if (phase === 'running') return
    if (att.result) att.clear()
    setPhase('build')
    tRef.current = 0
    setT(0)
    setFitted((f) => {
      if (f.includes(s)) {
        playSound('click')
        return f.filter((x) => x !== s)
      }
      if (f.length >= p.maxSensors) {
        playSound('wrong')
        return f
      }
      playSound('click')
      return [...f, s]
    })
  }

  const go = () => {
    playSound('click')
    tRef.current = 0
    setT(0)
    if (reduced) {
      tRef.current = stopAt
      setT(stopAt)
      setPhase('shown')
      att.submit({ sensors: fitted })
    } else setPhase('running')
  }

  const reached = Math.floor(t + 1e-9)
  const robotX = X(Math.min(t, n))
  const crashed = phase === 'shown' && firstFail !== -1
  const overBudget = p.budget !== undefined && cost > p.budget

  return (
    <TemplateCard label="Sensor choice mission">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-500 px-3 py-1 font-display text-sm font-bold text-[#1A1103]">Mission</span>
        <p className="font-display text-lg font-bold">{p.mission}</p>
        {p.conditions.map((c) => (
          <span key={c} className="rounded-full border border-[#00B8D4]/40 bg-[#00B8D4]/10 px-2.5 py-1 text-sm font-semibold text-[#00E5FF]">
            {CONDITION_LABEL[c].icon} {CONDITION_LABEL[c].label}
          </span>
        ))}
      </div>

      {/* The mission route */}
      <div className="relative mt-3 overflow-hidden rounded-[20px] border border-white/10 bg-[#0A1120]">
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          className="block h-auto w-full"
          role="img"
          aria-label={`Mission route with ${n} checkpoints.${phase === 'shown' ? ` ${run.filter((o) => o.ok).length} passed.` : ''}`}
        >
          {p.conditions.includes('dark') && <rect x={0} y={0} width={VW} height={VH} fill="#000" opacity={0.35} />}
          {p.conditions.includes('smoke') && (
            <g opacity={0.35}>
              {[60, 150, 240, 330].map((x, i) => (
                <ellipse key={x} cx={x} cy={40 + (i % 2) * 18} rx={70} ry={22} fill="#A7B0C0" />
              ))}
            </g>
          )}
          <line x1={X(0)} y1={PATH_Y} x2={X(n)} y2={PATH_Y} stroke="#19263F" strokeWidth={14} strokeLinecap="round" />
          <line
            x1={X(0)}
            y1={PATH_Y}
            x2={robotX}
            y2={PATH_Y}
            stroke={crashed ? '#FC6818' : '#22C55E'}
            strokeWidth={4}
            strokeLinecap="round"
            opacity={phase === 'build' ? 0 : 0.8}
          />
          <text x={X(0)} y={PATH_Y + 30} textAnchor="middle" fontSize={11} fontWeight={700} fill="#A7B0C0">
            start
          </text>
          {p.needs.map((need, i) => {
            const k = i + 1
            const o = run[i]
            const done = phase !== 'build' && reached >= k
            const col = !done ? '#6E7888' : o.ok ? '#22C55E' : '#FC6818'
            const extra = (need.conditions ?? []).map((c) => CONDITION_LABEL[c].icon).join('')
            return (
              <g key={i}>
                <circle cx={X(k)} cy={PATH_Y} r={15} fill="#111C32" stroke={col} strokeWidth={3} />
                <text x={X(k)} y={PATH_Y + 5} textAnchor="middle" fontSize={14} fontWeight={800} fill={col} className="font-display">
                  {done ? (o.ok ? '✓' : '✗') : k}
                </text>
                {extra && (
                  <text x={X(k)} y={PATH_Y - 24} textAnchor="middle" fontSize={14}>
                    {extra}
                  </text>
                )}
                {done && o.ok && o.by && (
                  <text x={X(k)} y={PATH_Y + 34} textAnchor="middle" fontSize={15}>
                    {SENSORS[o.by].icon}
                  </text>
                )}
              </g>
            )
          })}
          {/* the robot */}
          <g
            transform={`translate(${robotX} ${PATH_Y - 30})`}
            className={crashed ? 'motion-safe:animate-[pulse_0.6s_ease-in-out_2]' : undefined}
          >
            <rect x={-14} y={-14} width={28} height={22} rx={6} fill="#FC6818" />
            <rect x={-9} y={-9} width={18} height={9} rx={3} fill="#0A1120" />
            <circle cx={-4} cy={-4.5} r={2} fill={crashed ? '#FFA878' : '#00E5FF'} />
            <circle cx={4} cy={-4.5} r={2} fill={crashed ? '#FFA878' : '#00E5FF'} />
            <circle cx={-8} cy={10} r={4} fill="#EEF2F8" />
            <circle cx={8} cy={10} r={4} fill="#EEF2F8" />
            {fitted.slice(0, 6).map((s, i) => (
              <text key={s} x={-15 + i * 6} y={-17} fontSize={8}>
                {SENSORS[s].icon}
              </text>
            ))}
          </g>
        </svg>
      </div>

      {/* Checkpoint list (the words behind the picture) */}
      <ol className="mt-3 grid gap-2 sm:grid-cols-2">
        {p.needs.map((need, i) => {
          const o = run[i]
          const done = phase !== 'build' && reached >= i + 1
          const conds = conditionsAt(p, need).filter((c) => !p.conditions.includes(c))
          return (
            <li
              key={i}
              className={`rounded-2xl border px-3 py-2 text-[15px] ${
                !done ? 'border-white/10 bg-[#111C32]' : o.ok ? 'border-[#22C55E]/40 bg-[#22C55E]/10' : 'border-amber-400/50 bg-amber-500/10'
              }`}
            >
              <p className="font-semibold text-[#EEF2F8]">
                <span className="mr-1 font-display text-amber-300">{i + 1}.</span>
                {need.label}
                {conds.map((c) => (
                  <span key={c} className="ml-1 text-sm text-[#00E5FF]">
                    {CONDITION_LABEL[c].icon} {CONDITION_LABEL[c].label}
                  </span>
                ))}
              </p>
              <p className="text-sm text-[#A7B0C0]">Needs to {CAPABILITY_LABEL[need.capability]}.</p>
              {done && <p className={`mt-1 text-sm ${o.ok ? 'text-[#22C55E]' : 'text-amber-300'}`}>{o.ok ? `${SENSORS[o.by as SensorId].name} did it.` : o.why}</p>}
            </li>
          )
        })}
      </ol>

      {/* Robot status */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[15px]" aria-live="polite">
        <span className="rounded-2xl border border-white/10 bg-[#111C32] px-3 py-2 font-display font-bold tabular-nums">
          Fitted {fitted.length}/{p.maxSensors}
        </span>
        {p.budget !== undefined && (
          <span
            className={`rounded-2xl border px-3 py-2 font-display font-bold tabular-nums ${overBudget ? 'border-amber-400/60 text-amber-300' : 'border-white/10 bg-[#111C32]'}`}
          >
            {cost}/{p.budget} credits
          </span>
        )}
        {full && <span className="text-sm text-[#A7B0C0]">The robot is full — take one off to swap.</span>}
      </div>

      {/* The shelf */}
      <h3 className="mt-3 font-display text-sm font-bold uppercase tracking-wide text-[#A7B0C0]">Sensor shelf — tap to fit or remove</h3>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {p.available.map((s) => {
          const info = SENSORS[s]
          const on = fitted.includes(s)
          return (
            <div
              key={s}
              className={`flex flex-col rounded-2xl border transition-colors duration-150 ${on ? 'border-amber-400 bg-amber-500/15' : 'border-white/10 bg-[#111C32]'}`}
            >
              <button
                type="button"
                aria-pressed={on}
                disabled={phase === 'running' || (!on && full)}
                onClick={() => toggle(s)}
                className="flex min-h-[64px] w-full items-start gap-2 rounded-2xl p-2.5 text-left transition-transform duration-150 active:scale-[.97] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
              >
                <span className="text-2xl leading-none" aria-hidden>
                  {info.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-bold leading-tight text-[#EEF2F8]">{info.name}</span>
                  {p.budget !== undefined && <span className="block text-xs font-semibold text-amber-300">{info.cost} credits</span>}
                  {showCaps && (
                    <span className="mt-1 block text-xs leading-snug text-[#A7B0C0]">{info.provides.map((c) => CAPABILITY_LABEL[c]).join(' · ')}</span>
                  )}
                </span>
                <span
                  aria-hidden
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-sm font-bold ${on ? 'border-amber-400 bg-amber-500 text-[#1A1103]' : 'border-white/20 text-transparent'}`}
                >
                  ✓
                </span>
              </button>
              <button
                type="button"
                aria-expanded={openHow === s}
                onClick={() => setOpenHow((h) => (h === s ? null : s))}
                className="min-h-[44px] rounded-b-2xl border-t border-white/5 px-2.5 text-left text-xs font-semibold text-[#00E5FF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
              >
                {openHow === s ? info.how : 'How does it work?'}
              </button>
            </div>
          )
        })}
      </div>

      {!att.result && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} onClick={go} disabled={phase === 'running' || fitted.length === 0}>
            {phase === 'running' ? 'Running…' : 'Run the mission'}
          </button>
          {fitted.length > 0 && phase !== 'running' && (
            <button
              type="button"
              className={btnGhost}
              onClick={() => {
                playSound('click')
                setFitted([])
              }}
            >
              Remove all
            </button>
          )}
        </div>
      )}
      <FeedbackPanel
        att={att}
        onRetry={() => {
          setPhase('build')
          tRef.current = 0
          setT(0)
        }}
      />
    </TemplateCard>
  )
}
