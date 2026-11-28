'use client'

// components/kids/sim/PowerLabClient.tsx
// The Power Lab (roadmap #39), the interactive half of /kids/lab/power:
//   1. build a pack from cells in series and parallel;
//   2. load it and watch the voltage sag;
//   3. size a solar panel and battery for a robot that lives outdoors;
//   4. drive the real simulator on a battery: get home to the charger before
//      it runs flat, or plan a charging stop.
// Sections 1–3 are light React + SVG; the simulator (Rapier, three.js,
// Blockly) loads only when its section is reached, through next/dynamic.

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_DESIGN, loadDesign, type RobotDesign } from '@/lib/kids/robot-design'
import {
  CELLS,
  CHEMISTRIES,
  MAX_PARALLEL,
  MAX_SERIES,
  packInfo,
  packOcv,
  runtimeMinutes,
  sagCurve,
  solarPlan,
  SUN_HOURS,
  terminalVoltage,
  type Chemistry,
  type PackConfig,
  type SunKey,
} from '@/lib/kids/sim/battery'
import { POWER_DEMOS, POWER_STARTERS } from '@/lib/kids/sim/power-demos'
import type { Demo } from '@/lib/kids/sim/demos'
import { playSound } from '@/lib/kids-audio'
import { labSolved } from '@/lib/kids/sim/lab-links'

/** KIDS_PROGRESS_EVENT in lib/kids-progress.ts, by name so that module stays out of the first load. */
const PROGRESS_EVENT = 'r2bot:kids-progress'

/** The simulator robots' motors are rated for four NiMH cells. */
const MOTOR_RATED_V = 4.8

function WorkbenchSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]" aria-busy="true">
      <div className="flex h-[42vh] min-h-[280px] items-center justify-center rounded-3xl border border-white/10 bg-[#111C32] sm:h-[52vh] sm:min-h-[320px] lg:h-[540px]">
        <div className="h-16 w-16 animate-pulse rounded-2xl bg-white/10" aria-hidden />
        <span className="sr-only">Loading the robot simulator…</span>
      </div>
      <div className="h-[460px] animate-pulse rounded-3xl border border-white/10 bg-[#111C32] lg:h-[540px]" />
    </div>
  )
}

const SimWorkbench = dynamic(() => import('./SimWorkbenchClient'), { ssr: false, loading: WorkbenchSkeleton })

const card = 'rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-5'
const chip = (on: boolean) =>
  `min-h-[48px] rounded-2xl px-3 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
    on ? 'bg-amber-400 text-[#1A1103]' : 'border border-white/15 bg-white/[0.03] text-slate-100 hover:bg-white/10'
  }`

function Stepper({ label, value, min, max, onChange, hint }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; hint: string }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <span className="w-24 text-sm font-black text-white">{label}</span>
      <button type="button" aria-label={`Fewer: ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="h-12 w-12 rounded-2xl bg-white/10 text-xl font-black text-white hover:bg-white/20 disabled:opacity-40">
        −
      </button>
      <output className="w-8 text-center font-display text-2xl font-black text-amber-300" aria-live="polite">
        {value}
      </output>
      <button type="button" aria-label={`More: ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="h-12 w-12 rounded-2xl bg-white/10 text-xl font-black text-white hover:bg-white/20 disabled:opacity-40">
        +
      </button>
      <span className="hidden text-xs text-slate-300 sm:inline">{hint}</span>
    </div>
  )
}

/** Cells drawn as P rows of S cells: + to − along a row (series), rows joined at both ends (parallel). */
function PackDiagram({ pack }: { pack: PackConfig }) {
  const cw = 46
  const ch = 22
  const gap = 10
  const w = pack.series * (cw + gap) + 50
  const h = pack.parallel * (ch + 16) + 16
  const color = pack.cell === 'alkaline' ? '#FACC15' : pack.cell === 'nimh' ? '#22C55E' : pack.cell === 'liion' ? '#00B8D4' : '#FF8A4C'
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto max-h-48 w-full" role="img" aria-label={`${pack.series} cells in series, ${pack.parallel} row${pack.parallel > 1 ? 's' : ''} in parallel`}>
      {/* Bus bars on both ends join the rows in parallel. */}
      <line x1={14} x2={14} y1={16} y2={h - 16} stroke="#F87171" strokeWidth={3} />
      <line x1={w - 14} x2={w - 14} y1={16} y2={h - 16} stroke="#A7B0C0" strokeWidth={3} />
      <text x={6} y={12} fill="#F87171" fontSize={12} fontWeight={900}>
        +
      </text>
      <text x={w - 18} y={12} fill="#A7B0C0" fontSize={12} fontWeight={900}>
        −
      </text>
      {Array.from({ length: pack.parallel }).map((_, r) => {
        const y = 16 + r * (ch + 16)
        return (
          <g key={r}>
            <line x1={14} x2={w - 14} y1={y + ch / 2} y2={y + ch / 2} stroke="rgba(255,255,255,0.35)" strokeWidth={2} />
            {Array.from({ length: pack.series }).map((__, c) => {
              const x = 25 + c * (cw + gap)
              return (
                <g key={c}>
                  <rect x={x} y={y} width={cw} height={ch} rx={5} fill="#19263F" stroke={color} strokeWidth={2} />
                  <rect x={x + cw} y={y + 6} width={4} height={ch - 12} rx={1} fill={color} />
                  <rect x={x + 3} y={y + 3} width={cw - 10} height={ch - 6} rx={3} fill={color} opacity={0.35} />
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

function SagGraph({ pack, soc, amps, maxAmps }: { pack: PackConfig; soc: number; amps: number; maxAmps: number }) {
  const info = packInfo(pack)
  const pts = sagCurve(pack, soc, maxAmps, 30)
  const vMax = Math.max(info.fullV * 1.05, 1)
  const W = 320
  const H = 160
  const x = (a: number) => (a / maxAmps) * W
  const y = (v: number) => H - (Math.max(0, v) / vMax) * H
  const v = terminalVoltage(pack, soc, amps)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full rounded-xl bg-[#0A1120]" role="img" aria-label={`Voltage falls from ${packOcv(pack, soc).toFixed(2)} volts with no load to ${terminalVoltage(pack, soc, maxAmps).toFixed(2)} volts at ${maxAmps.toFixed(1)} amps.`}>
      <rect x={0} y={y(info.cutoffV)} width={W} height={H - y(info.cutoffV)} fill="rgba(248,113,113,0.15)" />
      <line x1={0} x2={W} y1={y(info.cutoffV)} y2={y(info.cutoffV)} stroke="#F87171" strokeDasharray="5 4" strokeWidth={1.5} />
      <line x1={0} x2={W} y1={y(MOTOR_RATED_V)} y2={y(MOTOR_RATED_V)} stroke="rgba(255,255,255,0.25)" strokeDasharray="2 4" strokeWidth={1} />
      <path d={pts.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join('')} fill="none" stroke="#FF8A4C" strokeWidth={3} />
      <circle cx={x(amps)} cy={y(v)} r={6} fill="#00E5FF" />
    </svg>
  )
}

export default function PowerLabClient() {
  const [pack, setPack] = useState<PackConfig>({ cell: 'nimh', series: 4, parallel: 1 })
  const info = useMemo(() => packInfo(pack), [pack])
  const [soc, setSoc] = useState(0.8)
  const [load, setLoad] = useState(1)
  const [watts, setWatts] = useState(3)
  const [hours, setHours] = useState(2)
  const [sky, setSky] = useState<SunKey>('mixed')
  const [reserve, setReserve] = useState(1)
  const [demo, setDemo] = useState<Demo>(POWER_DEMOS[0])
  const [useMyPack, setUseMyPack] = useState(false)
  const [mine, setMine] = useState<RobotDesign | null>(null)

  // ?demo=<id> opens that challenge (a course session links straight to it).
  useEffect(() => {
    const want = new URLSearchParams(window.location.search).get('demo')
    const d = want ? POWER_DEMOS.find((x) => x.id === want) : undefined
    if (d) setDemo(d)
    setMine(loadDesign())
  }, [])

  /** Challenges this child has solved (the lab's result store, lib/kids/sim/lab-results.ts). */
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    // The progress store (backup codes, merge, profiles migration) loads lazily so it stays out of
    // this page's first load; the event is listened to by its name (KIDS_PROGRESS_EVENT).
    let alive = true
    const read = async () => {
      const { getProgress } = await import('@/lib/kids-progress')
      if (!alive) return
      const pb = getProgress().personalBests
      setSolvedIds(new Set(POWER_DEMOS.filter((x) => labSolved(pb, x.id)).map((x) => x.id)))
    }
    const onProgress = () => void read()
    void read()
    window.addEventListener(PROGRESS_EVENT, onProgress)
    return () => {
      alive = false
      window.removeEventListener(PROGRESS_EVENT, onProgress)
    }
  }, [])

  const maxAmps = Math.min(12, Math.max(6, info.maxAmps * 1.5))
  const amps = Math.min(load, maxAmps)
  const vLoad = terminalVoltage(pack, soc, amps)
  const sag = packOcv(pack, soc) - vLoad
  const brownout = vLoad < info.cutoffV
  const overMax = amps > info.maxAmps
  const motorFit = info.nominalV / MOTOR_RATED_V
  const plan = solarPlan(watts, hours, SUN_HOURS[sky], reserve)
  const packCovers = info.energyWh * 0.8 >= plan.batteryWh

  // The simulator challenge, with the child's pack fitted if they ask (same starting charge).
  const runDemo: Demo = useMemo(() => {
    if (!useMyPack || !demo.arena.battery) return demo
    return { ...demo, arena: { ...demo.arena, battery: { ...demo.arena.battery, pack } } }
  }, [demo, useMyPack, pack])

  const set = (p: Partial<PackConfig>) => {
    playSound('click')
    setPack((old) => ({ ...old, ...p }))
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-16">
      {/* 1. Build a pack */}
      <section className={card} aria-labelledby="pl-pack">
        <h2 id="pl-pack" className="font-display text-xl font-black text-white">
          1 · Build a battery pack
        </h2>
        <p className="mt-1 text-slate-200">
          Pick a cell. Add cells <strong className="text-amber-300">in series</strong> (in a row) to add their voltage, and rows{' '}
          <strong className="text-cyan-300">in parallel</strong> (side by side) to add capacity.
        </p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Cell type">
          {CHEMISTRIES.map((c: Chemistry) => (
            <button key={c} type="button" aria-pressed={pack.cell === c} onClick={() => set({ cell: c })} className={chip(pack.cell === c)} data-testid={`cell-${c}`}>
              {CELLS[c].name}
              <span className="block text-xs font-bold opacity-80">
                {CELLS[c].nominalV} V · {CELLS[c].capacityMah} mAh
              </span>
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Stepper label="In series" value={pack.series} min={1} max={MAX_SERIES} onChange={(v) => set({ series: v })} hint="voltages add" />
            <Stepper label="In parallel" value={pack.parallel} min={1} max={MAX_PARALLEL} onChange={(v) => set({ parallel: v })} hint="capacity adds" />
            <PackDiagram pack={pack} />
          </div>
          <dl className="grid grid-cols-2 gap-2 self-start text-sm" data-testid="pack-info">
            {[
              ['Voltage', `${info.nominalV} V`, `${info.fullV} V full, ${info.cutoffV} V empty`],
              ['Capacity', `${info.capacityMah} mAh`, `${info.energyWh} Wh of energy`],
              ['Inside resistance', `${info.internalOhm} Ω`, 'lower = less sag'],
              ['Safe current', `${info.maxAmps} A`, `${info.cells} cell${info.cells > 1 ? 's' : ''}, ${info.massG} g`],
              ['Runs a 1 A robot', `${runtimeMinutes(pack, 1)} min`, 'ignoring sag'],
              ['Rechargeable', CELLS[pack.cell].rechargeable ? 'Yes' : 'No', CELLS[pack.cell].format],
            ].map(([k, v, sub]) => (
              <div key={k} className="rounded-xl bg-white/5 p-3">
                <dt className="text-xs font-bold text-slate-300">{k}</dt>
                <dd className="font-display text-lg font-black text-white">{v}</dd>
                <dd className="text-xs text-slate-300">{sub}</dd>
              </div>
            ))}
            <div className="col-span-2 rounded-xl border border-white/10 p-3" role="status" data-cue={motorFit < 0.8 || motorFit > 1.15 ? 'warn' : 'ok'}>
              <p className="text-sm font-black text-white">For the simulator robot ({MOTOR_RATED_V} V motors):</p>
              <p className="text-sm text-slate-200">
                {motorFit < 0.8
                  ? `Only ${Math.round(motorFit * 100)} % of the motors’ voltage: the robot will crawl. Add cells in series.`
                  : motorFit > 1.15
                    ? `${Math.round(motorFit * 100)} % of the motors’ voltage: fast, but the motors would run hot. Real robots use a speed controller or fewer cells.`
                    : `${Math.round(motorFit * 100)} % of the motors’ voltage — a good match.`}
              </p>
            </div>
          </dl>
        </div>
      </section>

      {/* 2. Sag */}
      <section className={card} aria-labelledby="pl-sag">
        <h2 id="pl-sag" className="font-display text-xl font-black text-white">
          2 · Load it: voltage sag
        </h2>
        <p className="mt-1 text-slate-200">Every battery has a little resistance inside. The more current you pull, the more voltage is lost inside the battery before it reaches the robot.</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-black text-white">Current the robot pulls: {amps.toFixed(1)} A</span>
              <input type="range" min={0} max={maxAmps} step={0.1} value={amps} onChange={(e) => setLoad(Number(e.target.value))} className="mt-1 h-11 w-full accent-amber-400" data-testid="sag-amps" />
              <span className="text-xs text-slate-300">Driving on a smooth floor ≈ 0.5 A · pushing or climbing ≈ 1.5–3 A · stalled motors ≈ 3 A+</span>
            </label>
            <label className="block">
              <span className="text-sm font-black text-white">Charge left: {Math.round(soc * 100)} %</span>
              <input type="range" min={0} max={1} step={0.01} value={soc} onChange={(e) => setSoc(Number(e.target.value))} className="mt-1 h-11 w-full accent-amber-400" />
            </label>
            <div className={`rounded-xl p-3 ${brownout ? 'border-2 border-rose-300/70 bg-rose-400/10' : 'bg-white/5'}`} role="status" data-cue={brownout ? 'no' : overMax ? 'warn' : 'ok'} data-testid="sag-status">
              <p className="font-display text-2xl font-black text-white">
                {vLoad.toFixed(2)} V <span className="text-base text-slate-300">at the robot</span>
              </p>
              <p className="text-sm text-slate-200">
                Lost inside: {sag.toFixed(2)} V ({amps.toFixed(1)} A × {info.internalOhm} Ω).{' '}
                {brownout
                  ? `Below ${info.cutoffV} V: the robot’s computer would switch off (a brownout).`
                  : overMax
                    ? `More than this pack’s safe ${info.maxAmps} A: it would get hot. Add cells in parallel.`
                    : 'The robot keeps running.'}
              </p>
            </div>
          </div>
          <div>
            <SagGraph pack={pack} soc={soc} amps={amps} maxAmps={maxAmps} />
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-slate-200">
              <li>
                <span className="mr-1 inline-block h-1 w-5 rounded bg-amber-400 align-middle" aria-hidden />
                Voltage at the robot
              </li>
              <li>
                <span className="mr-1 inline-block h-3 w-5 rounded bg-rose-400/30 align-middle" aria-hidden />
                Too low: brownout
              </li>
              <li>
                <span className="mr-1 inline-block h-3 w-3 rounded-full bg-cyan-300 align-middle" aria-hidden />
                You are here
              </li>
            </ul>
            <p className="mt-2 text-sm text-slate-300">Try Alkaline AA at 3 A, then NiMH: same voltage on the label, very different sag. Then add a second row in parallel and watch the line flatten.</p>
          </div>
        </div>
      </section>

      {/* 3. Solar */}
      <section className={card} aria-labelledby="pl-solar">
        <h2 id="pl-solar" className="font-display text-xl font-black text-white">
          3 · Size a solar robot
        </h2>
        <p className="mt-1 text-slate-200">A garden robot that charges from the sun needs a panel big enough to refill each day, and a battery big enough for the night and a cloudy day.</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-black text-white">Robot power while working: {watts} W</span>
              <input type="range" min={0.5} max={20} step={0.5} value={watts} onChange={(e) => setWatts(Number(e.target.value))} className="mt-1 h-11 w-full accent-amber-400" data-testid="solar-watts" />
            </label>
            <label className="block">
              <span className="text-sm font-black text-white">Working hours a day: {hours} h</span>
              <input type="range" min={0.5} max={12} step={0.5} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="mt-1 h-11 w-full accent-amber-400" />
            </label>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Sky">
              {(
                [
                  ['cloudy-winter', '🌧️ Cloudy winter'],
                  ['mixed', '⛅ Mixed'],
                  ['sunny', '☀️ Sunny'],
                  ['desert', '🏜️ Desert'],
                ] as [SunKey, string][]
              ).map(([k, label]) => (
                <button key={k} type="button" aria-pressed={sky === k} onClick={() => setSky(k)} className={chip(sky === k)}>
                  {label}
                  <span className="block text-xs font-bold opacity-80">{SUN_HOURS[k]} sun hours</span>
                </button>
              ))}
            </div>
            <Stepper label="Days of reserve" value={reserve} min={1} max={3} onChange={setReserve} hint="sunless days the battery covers" />
          </div>
          <dl className="grid grid-cols-2 gap-2 self-start" data-testid="solar-plan">
            <div className="rounded-xl bg-white/5 p-3">
              <dt className="text-xs font-bold text-slate-300">Energy a day</dt>
              <dd className="font-display text-2xl font-black text-white">{plan.dailyWh} Wh</dd>
              <dd className="text-xs text-slate-300">
                {watts} W × {hours} h
              </dd>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <dt className="text-xs font-bold text-slate-300">Solar panel</dt>
              <dd className="font-display text-2xl font-black text-amber-300">{plan.panelW} W</dd>
              <dd className="text-xs text-slate-300">
                {plan.dailyWh} Wh ÷ ({SUN_HOURS[sky]} h × 75 % real-world)
              </dd>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <dt className="text-xs font-bold text-slate-300">Battery</dt>
              <dd className="font-display text-2xl font-black text-cyan-300">{plan.batteryWh} Wh</dd>
              <dd className="text-xs text-slate-300">only 80 % used, so it lasts for years</dd>
            </div>
            <div className="rounded-xl bg-white/5 p-3" role="status" data-cue={packCovers ? 'ok' : 'warn'}>
              <dt className="text-xs font-bold text-slate-300">Your pack from step 1</dt>
              <dd className="font-display text-2xl font-black text-white">{info.energyWh} Wh</dd>
              <dd className="text-xs text-slate-300">{packCovers ? 'Big enough.' : `Too small: try ${Math.ceil(plan.batteryWh / (info.energyWh * 0.8 / pack.parallel))} rows in parallel or bigger cells.`}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* 4. Drive on a battery */}
      <section className={card} aria-labelledby="pl-drive">
        <h2 id="pl-drive" className="font-display text-xl font-black text-white">
          4 · Drive on a battery: get home before it runs flat
        </h2>
        <p className="mt-1 text-slate-200">
          The real-physics simulator, with a battery that drains as the motors work. One second here drains a minute of real driving, so you see a whole charge in one run. Your
          robot can read <strong className="text-amber-300">🔋 battery %</strong> in its program.
        </p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Challenges">
          {POWER_DEMOS.map((d) => (
            <button key={d.id} type="button" aria-pressed={demo.id === d.id} onClick={() => setDemo(d)} className={chip(demo.id === d.id)} data-testid={`power-demo-${d.id}`}>
              {d.title}
              {solvedIds.has(d.id) && (
                <span className="ml-1 text-emerald-300" aria-label="solved">
                  ✓
                </span>
              )}
              <span className="block text-xs font-bold opacity-80">{d.ageHint}</span>
            </button>
          ))}
          <button type="button" aria-pressed={useMyPack} onClick={() => setUseMyPack((v) => !v)} className={chip(useMyPack)} data-testid="use-my-pack">
            🔋 {useMyPack ? 'Using your pack' : 'Use your pack from step 1'}
            <span className="block text-xs font-bold opacity-80">
              {CELLS[pack.cell].name}, {pack.series}S{pack.parallel}P
            </span>
          </button>
        </div>
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-lg font-black text-white">🎯 {demo.task}</p>
          <p className="mt-1 text-sm text-slate-200">
            <strong className="text-amber-200">The engineering:</strong> {demo.lesson}
          </p>
        </div>
        <div className="mt-3">
          {mine ? <SimWorkbench demo={runDemo} design={mine ?? DEFAULT_DESIGN} starter={POWER_STARTERS[demo.id] ?? { body: [] }} /> : <WorkbenchSkeleton />}
        </div>
      </section>
    </div>
  )
}
