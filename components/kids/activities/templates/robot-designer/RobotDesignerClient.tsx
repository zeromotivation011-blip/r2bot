'use client'

// components/kids/activities/templates/robot-designer/RobotDesignerClient.tsx
// Pick parts slot by slot (cards are toggle buttons). The robot assembles
// itself in the preview as parts are chosen, and gauges show budget, mass vs
// drive payload, battery runtime and the abilities checklist live (hidden for
// "reason it out" activities). "Test the robot" drives it across the job's
// terrain: it rolls to the far side, or stalls where the design breaks.

import { useMemo, useRef, useState } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound } from '@/lib/kids-audio'
import { partsOf, problems, totals, type Answer, type Params, type Part } from './logic'
import { FeedbackPanel, TemplateCard, btnPrimary, useAnimationFrame, useAttempts, useReducedMotion } from '../gear-train/TemplateFrameClient'

const TERRAIN_STYLE: Record<string, { ground: string; sky: string; deco: string }> = {
  sand: { ground: '#D9B26F', sky: '#7CC4E8', deco: '🐚' },
  mud: { ground: '#6B4426', sky: '#7C93A8', deco: '💧' },
  road: { ground: '#3B4252', sky: '#1B2440', deco: '🚧' },
  floor: { ground: '#8A6E52', sky: '#E7DCCB', deco: '🪴' },
  grass: { ground: '#3E8E41', sky: '#8ED1F0', deco: '🌼' },
  stairs: { ground: '#9AA4B2', sky: '#D8DEE8', deco: '🪜' },
  water: { ground: '#1E6FA8', sky: '#9AD7F5', deco: '🐟' },
  snow: { ground: '#E8F1FA', sky: '#A9C7E4', deco: '❄️' },
}

const r1 = (x: number) => Math.round(x * 10) / 10

export default function RobotDesignerClient({ params: p, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const att = useAttempts(onSubmit, onDone)
  const reduced = useReducedMotion()
  const [picked, setPicked] = useState<string[]>([])
  const [run, setRun] = useState<number | null>(null)
  const runRef = useRef(0)
  const solved = !!att.result?.correct
  const live = p.liveGauges ?? true
  const t = useMemo(() => totals(p, picked), [p, picked])
  const probs = useMemo(() => problems(p, picked), [p, picked])
  const parts = partsOf(p, picked)
  const slotsDone = p.slots.every((s) => {
    const n = picked.filter((id) => s.parts.some((x) => x.id === id)).length
    return n >= (s.min ?? 1) && n <= (s.max ?? 1)
  })
  const showGauges = live || !!att.result
  const ok = probs.length === 0
  const stallAt = 0.55

  const toggle = (slotId: string, part: Part) => {
    if (solved || run !== null) return
    if (att.result) att.clear()
    playSound('click')
    const slot = p.slots.find((s) => s.id === slotId)!
    const max = slot.max ?? 1
    setPicked((cur) => {
      if (cur.includes(part.id)) return cur.filter((x) => x !== part.id)
      const inSlot = cur.filter((id) => slot.parts.some((x) => x.id === id))
      // Single-choice slots swap; multi-choice slots drop the oldest when full.
      const drop = inSlot.length >= max ? inSlot.slice(0, inSlot.length - max + 1) : []
      return [...cur.filter((x) => !drop.includes(x)), part.id]
    })
  }

  const test = () => {
    playSound('click')
    if (reduced) {
      att.submit({ parts: picked })
      return
    }
    runRef.current = 0
    setRun(0)
  }
  useAnimationFrame(run !== null, (dt) => {
    const end = ok ? 1 : stallAt
    const v = Math.min(end, runRef.current + dt * 0.45)
    runRef.current = v
    setRun(v)
    if (v >= end) {
      setRun(null)
      runRef.current = end
      att.submit({ parts: picked })
    }
  })

  const terrain = TERRAIN_STYLE[p.terrain] ?? TERRAIN_STYLE.floor
  const drive = parts.find((x) => x.terrains)
  const progress = run ?? (att.result ? (att.result.correct ? 1 : stallAt) : 0)
  const stalled = !!att.result && !att.result.correct
  const others = parts.filter((x) => x !== drive)

  return (
    <TemplateCard label="Robot designer">
      <div className="rounded-[20px] border border-amber-400/30 bg-amber-500/[0.07] p-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-300">The job</p>
        <p className="mt-1 font-display text-lg font-bold text-[#EEF2F8]">{p.brief}</p>
        <ul className="mt-2 flex flex-wrap gap-2 text-[13px] font-semibold text-[#EEF2F8]">
          <li className="rounded-full bg-white/10 px-3 py-1">🗺️ {p.terrainLabel}</li>
          <li className="rounded-full bg-white/10 px-3 py-1">🪙 ≤ {p.budget} coins</li>
          {p.maxMassKg !== undefined && <li className="rounded-full bg-white/10 px-3 py-1">⚖️ ≤ {p.maxMassKg} kg</li>}
          {p.minRuntimeMin !== undefined && <li className="rounded-full bg-white/10 px-3 py-1">🔋 ≥ {p.minRuntimeMin} min</li>}
          {p.requires.map((r) => (
            <li key={r} className="rounded-full bg-white/10 px-3 py-1">
              ✔ {p.abilityLabels[r] ?? r}
            </li>
          ))}
        </ul>
      </div>

      {/* Test track + assembled robot */}
      <div className="relative mt-3 h-[150px] overflow-hidden rounded-[20px] border border-white/10" style={{ background: `linear-gradient(${terrain.sky}, ${terrain.sky}88)` }} aria-hidden>
        <div className="absolute inset-x-0 bottom-0 h-[44px]" style={{ background: terrain.ground }} />
        {[18, 52, 84].map((x) => (
          <span key={x} className="absolute bottom-[30px] text-lg opacity-70" style={{ left: `${x}%` }}>
            {terrain.deco}
          </span>
        ))}
        <span className="absolute bottom-[40px] right-2 text-2xl">🏁</span>
        <div
          className={`absolute bottom-[30px] flex flex-col items-center ${stalled ? 'motion-safe:animate-[pulse_1s_ease-in-out_2]' : ''}`}
          style={{ left: `calc(${4 + progress * 78}% )`, transform: stalled && t.terrainOk === false ? 'translateY(10px)' : undefined }}
        >
          <div className="flex max-w-[120px] flex-wrap justify-center gap-0.5 text-xl leading-none">
            {others.map((x) => (
              <span key={x.id}>{x.icon}</span>
            ))}
          </div>
          <div className="mt-0.5 flex h-9 min-w-[64px] items-center justify-center rounded-xl border-2 border-[#1A1103] bg-amber-500 px-2 text-xl">🤖</div>
          <div className="text-2xl leading-none">{drive ? drive.icon : '❔'}</div>
        </div>
      </div>

      {/* Slots */}
      <div className="mt-3 flex flex-col gap-3">
        {p.slots.map((s) => {
          const min = s.min ?? 1
          const max = s.max ?? 1
          return (
            <fieldset key={s.id}>
              <legend className="text-sm font-semibold uppercase tracking-wide text-[#A7B0C0]">
                {s.label}{' '}
                <span className="normal-case tracking-normal text-[#6E7888]">
                  {min === 0 ? `(optional${max > 1 ? `, up to ${max}` : ''})` : max > 1 ? `(choose ${min === max ? max : `${min}–${max}`})` : '(choose 1)'}
                </span>
              </legend>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {s.parts.map((x) => {
                  const on = picked.includes(x.id)
                  return (
                    <button
                      key={x.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(s.id, x)}
                      className={`flex min-h-[48px] flex-col items-start rounded-2xl border p-2.5 text-left transition-transform duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-[.97] ${
                        on ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_0_1px_rgba(252,104,24,.6)]' : 'border-white/10 bg-[#19263F] hover:border-white/30'
                      }`}
                    >
                      <span className="flex w-full items-center gap-2">
                        <span className="text-2xl" aria-hidden>
                          {x.icon}
                        </span>
                        <span className="font-display text-[15px] font-bold leading-tight text-[#EEF2F8]">{x.name}</span>
                      </span>
                      <span className="mt-1 text-[12px] leading-snug text-[#A7B0C0]">
                        🪙 {x.cost} · {r1(x.massKg)} kg{x.powerW ? ` · ${x.powerW} W` : ''}
                        {x.energyWh ? ` · ${x.energyWh} Wh` : ''}
                        {x.payloadKg !== undefined ? ` · carries ${x.payloadKg} kg` : ''}
                      </span>
                      {x.terrains && <span className="text-[12px] text-[#00E5FF]">Goes on: {x.terrains.join(', ')}</span>}
                      {x.gives?.length ? <span className="text-[12px] text-[#22C55E]">+ {x.gives.map((g) => p.abilityLabels[g] ?? g).join(', ')}</span> : null}
                      {x.note && <span className="mt-0.5 text-[12px] italic leading-snug text-[#A7B0C0]">{x.note}</span>}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          )
        })}
      </div>

      {/* Gauges */}
      {showGauges ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2" aria-live="polite">
          <Gauge label="Cost" value={t.cost} max={p.budget} unit="coins" text={`${t.cost} / ${p.budget}`} />
          {p.maxMassKg !== undefined && <Gauge label="Mass" value={t.massKg} max={p.maxMassKg} unit="kg" text={`${r1(t.massKg)} / ${p.maxMassKg} kg`} />}
          {t.payloadKg !== null && <Gauge label="Drive can carry" value={t.massKg} max={t.payloadKg} unit="kg" text={`${r1(t.massKg)} of ${t.payloadKg} kg`} />}
          {p.minRuntimeMin !== undefined && (
            <Gauge
              label="Battery life"
              value={Math.min(t.runtimeMin, p.minRuntimeMin * 2)}
              max={p.minRuntimeMin}
              invert
              unit="min"
              text={`${Number.isFinite(t.runtimeMin) ? Math.floor(t.runtimeMin) : '∞'} min (need ${p.minRuntimeMin}) · ${t.energyWh} Wh ÷ ${t.powerW} W`}
            />
          )}
          <div className="rounded-2xl border border-white/10 bg-[#111C32] px-3 py-2 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#A7B0C0]">Abilities</p>
            <ul className="mt-1 flex flex-wrap gap-2 text-[14px]">
              <li className={t.terrainOk ? 'text-[#22C55E]' : 'text-amber-300'}>
                {t.terrainOk ? '✔' : '✖'} Crosses {p.terrainLabel.toLowerCase()}
              </li>
              {p.requires.map((r) => (
                <li key={r} className={t.abilities.has(r) ? 'text-[#22C55E]' : 'text-amber-300'}>
                  {t.abilities.has(r) ? '✔' : '✖'} {p.abilityLabels[r] ?? r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-white/10 bg-[#111C32] p-3 text-[15px] text-[#A7B0C0]">
          Gauges are off: add up cost and mass yourself, and work out battery life as <b className="text-[#EEF2F8]">energy (Wh) ÷ power (W) × 60</b> minutes.
        </p>
      )}

      {!att.result && (
        <div className="mt-4">
          <button type="button" className={btnPrimary} onClick={test} disabled={!slotsDone || run !== null}>
            {run !== null ? 'Testing…' : slotsDone ? 'Test the robot' : 'Choose a part for every slot'}
          </button>
        </div>
      )}
      <FeedbackPanel att={att} onRetry={() => setRun(null)} />
    </TemplateCard>
  )
}

function Gauge({ label, value, max, unit, text, invert }: { label: string; value: number; max: number; unit: string; text: string; invert?: boolean }) {
  // Normal gauges must stay at or under max; inverted ones (runtime) must reach it.
  const good = invert ? value >= max - 1e-9 : value <= max + 1e-9
  const frac = Math.max(0, Math.min(1, invert ? value / (max * 2) : value / max))
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111C32] px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#A7B0C0]">{label}</p>
        <p className={`font-display text-[15px] font-bold tabular-nums ${good ? 'text-[#22C55E]' : 'text-amber-300'}`}>{text}</p>
      </div>
      <div className="relative mt-1.5 h-3 overflow-hidden rounded-full bg-white/10" role="meter" aria-label={label} aria-valuenow={Math.round(value * 10) / 10} aria-valuemin={0} aria-valuemax={max} aria-valuetext={`${text} ${unit}`}>
        <div className={`h-full rounded-full transition-[width] duration-300 ${good ? 'bg-[#22C55E]' : 'bg-amber-500'}`} style={{ width: `${frac * 100}%` }} />
        {invert && <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/60" />}
      </div>
    </div>
  )
}
