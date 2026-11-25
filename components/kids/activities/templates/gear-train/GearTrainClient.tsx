'use client'

// components/kids/activities/templates/gear-train/GearTrainClient.tsx
// Interactive gear train: build a chain or compound train from a tray of gear
// sizes, spin the motor and watch every gear turn at its true relative speed
// and direction (teeth mesh exactly), then test it against the job.

import { useMemo, useRef, useState } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound } from '@/lib/kids-audio'
import { simulate, type Answer, type Params, type Range } from './logic'
import {
  FeedbackPanel,
  Readout,
  TemplateCard,
  btnGhost,
  btnPrimary,
  chip,
  useAnimationFrame,
  useAttempts,
  useReducedMotion,
} from './TemplateFrameClient'

const MODULE = 2 // SVG units per tooth of diameter (all gears share one tooth size, so they mesh)

function gearPath(z: number): string {
  const r = (MODULE * z) / 2
  const ra = r + MODULE
  const rf = r - 1.25 * MODULE
  const hp = Math.PI / z
  const pts: string[] = []
  for (let k = 0; k < z; k++) {
    const a = (2 * Math.PI * k) / z
    const p = (rr: number, ang: number) => `${(rr * Math.cos(ang)).toFixed(2)},${(rr * Math.sin(ang)).toFixed(2)}`
    pts.push(p(rf, a - hp * 0.68), p(ra, a - hp * 0.32), p(ra, a + hp * 0.32), p(rf, a + hp * 0.68))
  }
  return `M${pts.join('L')}Z`
}

interface Placed {
  z: number
  x: number
  /** index of the gear whose angle this one copies (shared axle), or meshes with */
  meshWith: number | null
  sharedAxleWith: number | null
}

function layout(mode: Params['mode'], gears: number[]): Placed[] {
  const out: Placed[] = []
  let x = 0
  gears.forEach((z, i) => {
    if (i === 0) {
      out.push({ z, x: 0, meshWith: null, sharedAxleWith: null })
      return
    }
    const prev = out[i - 1]
    if (mode === 'compound' && i % 2 === 0) {
      // driver of the next stage: same axle as the previous driven gear
      out.push({ z, x: prev.x, meshWith: null, sharedAxleWith: i - 1 })
      return
    }
    x = prev.x + (MODULE * prev.z) / 2 + (MODULE * z) / 2
    out.push({ z, x, meshWith: i - 1, sharedAxleWith: null })
  })
  return out
}

/** Angles (radians) of every gear when the motor gear is at theta0 — meshing exactly. */
function angles(placed: Placed[], theta0: number): number[] {
  const th: number[] = []
  placed.forEach((g, i) => {
    if (i === 0) th.push(theta0)
    else if (g.sharedAxleWith !== null) th.push(th[g.sharedAxleWith])
    else if (g.meshWith !== null) {
      const d = placed[g.meshWith]
      // contact point is at angle 0 on the driver and π on the driven gear
      th.push(Math.PI - (d.z * th[g.meshWith] + Math.PI) / g.z)
    } else th.push(0)
  })
  return th
}

function fmt(n: number): string {
  if (n >= 100) return Math.round(n).toString()
  if (n >= 10) return n.toFixed(1)
  return n.toFixed(2)
}

function rangeLabel(r: Range, unit: string): string {
  if (r.min !== undefined && r.max !== undefined) return `${r.min}–${r.max} ${unit}`
  if (r.min !== undefined) return `≥ ${r.min} ${unit}`
  return `≤ ${r.max} ${unit}`
}

/** Tray icon: drawn at a size proportional to the real gear so big and small look different. */
function TrayGear({ z, maxZ }: { z: number; maxZ: number }) {
  const lim = (MODULE * z) / 2 + MODULE + 1
  const px = Math.round(14 + 18 * Math.sqrt(z / maxZ))
  return (
    <svg viewBox={`${-lim} ${-lim} ${2 * lim} ${2 * lim}`} width={px} height={px} className="mr-1.5 shrink-0" aria-hidden="true">
      <path d={gearPath(z)} fill="currentColor" />
    </svg>
  )
}

const OUTPUT_ICON: Record<NonNullable<Params['output']>, string> = {
  wheel: '🛞',
  winch: '🪝',
  fan: '🌀',
  arm: '🦾',
  'clock-hand': '🕰️',
}

export default function GearTrainClient({ params, band, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const p = params
  const sizes = useMemo(() => [...new Set(p.inventory)].sort((a, b) => a - b), [p.inventory])
  const startGears = useMemo(() => {
    const first = p.motorGear ?? sizes[0]
    return p.mode === 'compound' ? [first, sizes[sizes.length - 1]] : [first, sizes[Math.min(1, sizes.length - 1)]]
  }, [p.mode, p.motorGear, sizes])
  const [gears, setGears] = useState<number[]>(startGears)
  const [sel, setSel] = useState(1)
  const [spinning, setSpinning] = useState(false)
  const [theta, setTheta] = useState(0)
  const reduced = useReducedMotion()
  const att = useAttempts(onSubmit, onDone)
  const young = band === 'explorers' || band === 'builders'
  const showMath = p.showMath ?? !young
  const live = p.liveReadout ?? true

  const placed = useMemo(() => layout(p.mode, gears), [p.mode, gears])
  const sim = useMemo(() => simulate(p, gears), [p, gears])
  const th = useMemo(() => angles(placed, theta), [placed, theta])
  const thetaRef = useRef(0)

  // Visual speed: motor gear at ~0.35 rev/s, others follow the true ratio (capped so it stays readable).
  const maxRatio = Math.max(...sim.gearRpm.map((r) => Math.abs(r / p.motorRpm)), 1)
  const visualMotorRevPerS = Math.min(0.35, 2.5 / maxRatio)
  useAnimationFrame(spinning && !reduced, (dt) => {
    thetaRef.current += dt * visualMotorRevPerS * 2 * Math.PI
    setTheta(thetaRef.current)
  })

  const locked0 = p.motorGear !== undefined
  const step = p.mode === 'compound' ? 2 : 1
  const canAdd = gears.length + step <= p.maxGears
  const canRemove = gears.length - step >= 2

  const edit = (fn: () => void) => {
    if (att.result) att.clear()
    playSound('click')
    fn()
  }

  const setSize = (z: number) =>
    edit(() => {
      if (sel === 0 && locked0) return
      setGears((g) => g.map((v, i) => (i === sel ? z : v)))
    })
  const add = () =>
    edit(() => {
      const extra = p.mode === 'compound' ? [sizes[0], sizes[sizes.length - 1]] : [sizes[Math.floor(sizes.length / 2)]]
      setGears((g) => [...g, ...extra])
      setSel(gears.length + extra.length - 1)
    })
  const remove = () =>
    edit(() => {
      setGears((g) => g.slice(0, g.length - step))
      setSel((s) => Math.min(s, gears.length - step - 1))
    })

  const test = () => {
    setSpinning(true)
    att.submit({ gears })
  }

  // viewBox
  const pad = MODULE * 6
  const minX = -(MODULE * gears[0]) / 2 - pad - 40 // motor box
  const maxX = Math.max(...placed.map((g) => g.x + (MODULE * g.z) / 2)) + pad + 46 // output icon
  const maxR = Math.max(...placed.map((g) => (MODULE * g.z) / 2)) + MODULE
  const vb = `${minX} ${-maxR - pad} ${maxX - minX} ${2 * maxR + 2 * pad + (showMath ? 26 : 0)}`
  const last = placed[placed.length - 1]
  const outIcon = OUTPUT_ICON[p.output ?? 'wheel']
  const showNumbers = live || !!att.result

  const targetBits: string[] = []
  if (p.target.rpm) targetBits.push(`speed ${rangeLabel(p.target.rpm, 'rpm')}`)
  if (p.target.torque) targetBits.push(`force ${rangeLabel(p.target.torque, 'N·cm')}`)
  if (p.target.direction) targetBits.push(`turning the ${p.target.direction} way as the motor`)

  const rpmOk =
    !p.target.rpm || ((p.target.rpm.min === undefined || sim.outputRpm >= p.target.rpm.min - 1e-9) && (p.target.rpm.max === undefined || sim.outputRpm <= p.target.rpm.max + 1e-9))

  return (
    <TemplateCard label="Gear train builder">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-500 px-3 py-1 font-display text-sm font-bold text-[#1A1103]">Job</span>
        <p className="text-[17px] font-semibold">
          Make the {p.output ?? 'output'} {outIcon} turn at {targetBits.join(', ')}.
        </p>
      </div>

      <div className="relative mt-3 overflow-hidden rounded-[20px] border border-white/10 bg-[#0A1120]">
        <svg viewBox={vb} className="block h-[230px] w-full sm:h-[300px]" role="img" aria-label={`Gear train with ${gears.length} gears: ${gears.join(', ')} teeth. Output ${fmt(sim.outputRpm)} rpm, turning the ${sim.direction} way as the motor.`}>
          {/* motor */}
          <g>
            <rect x={minX + 6} y={-26} width={44} height={52} rx={8} fill="#19263F" stroke="rgba(255,255,255,.16)" />
            <text x={minX + 28} y={5} textAnchor="middle" fontSize={14} fontWeight={700} fill="#FFA878">
              M
            </text>
            <rect x={minX + 50} y={-4} width={-minX - 50} height={8} fill="#6E7888" />
          </g>
          {placed.map((g, i) => {
            const isDriverOnShared = g.sharedAxleWith !== null
            const colour = i === 0 ? '#FC6818' : i === placed.length - 1 ? '#00B8D4' : isDriverOnShared ? '#A7B0C0' : '#6E7888'
            const selected = i === sel
            return (
              <g
                key={i}
                transform={`translate(${g.x} 0)`}
                onClick={() => edit(() => setSel(i))}
                className="cursor-pointer"
                aria-hidden="true"
              >
                <g transform={`rotate(${((th[i] ?? 0) * 180) / Math.PI})`}>
                  <path d={gearPath(g.z)} fill={colour} fillOpacity={isDriverOnShared ? 0.95 : 0.85} stroke={selected ? '#FFFFFF' : 'rgba(10,17,32,.8)'} strokeWidth={selected ? 2 : 1} />
                  <circle r={(MODULE * g.z) / 2 - 1.25 * MODULE - 3} fill="#0A1120" fillOpacity={0.35} />
                  <line x1={0} y1={0} x2={(MODULE * g.z) / 2 - 4} y2={0} stroke="#0A1120" strokeWidth={2.5} strokeLinecap="round" />
                </g>
                <circle r={4} fill="#EEF2F8" />
                {showMath && (
                  <text x={0} y={maxR + (isDriverOnShared ? 22 : 12)} textAnchor="middle" fontSize={11} fontWeight={700} fill={isDriverOnShared ? '#A7B0C0' : '#EEF2F8'}>
                    {g.z}T
                  </text>
                )}
              </g>
            )
          })}
          {/* output shaft + icon */}
          <g transform={`translate(${last.x} 0)`}>
            <rect x={0} y={-3} width={(MODULE * last.z) / 2 + pad + 10} height={6} fill="#6E7888" />
            <g transform={`translate(${(MODULE * last.z) / 2 + pad + 26} 0) rotate(${(((th[th.length - 1] ?? 0) * 180) / Math.PI).toFixed(1)})`}>
              <circle r={18} fill="#111C32" stroke="#00E5FF" strokeWidth={2} />
              {[0, 60, 120].map((a) => (
                <line key={a} x1={0} y1={0} x2={16 * Math.cos((a * Math.PI) / 90)} y2={16 * Math.sin((a * Math.PI) / 90)} stroke="#00E5FF" strokeWidth={2} />
              ))}
            </g>
          </g>
        </svg>
        <div className="pointer-events-none absolute left-3 top-2 flex gap-2 text-xs font-bold text-[#A7B0C0]">
          <span>Motor {p.motorRpm} rpm {sim.gearRpm[0] >= 0 ? '↻' : '↺'}</span>
        </div>
        {reduced && spinning && (
          <p className="absolute bottom-2 left-3 text-xs font-semibold text-[#A7B0C0]">Motion is off (reduced motion): the arrows show each gear's direction.</p>
        )}
      </div>

      {/* Gear slots */}
      <div className="mt-3">
        <p className="text-sm font-semibold text-[#A7B0C0]">
          {p.mode === 'compound' ? 'Stages (driver → driven). Tap a gear, then pick its size.' : 'Your gears, motor first. Tap one, then pick its size.'}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2" role="listbox" aria-label="Gears in the train">
          {gears.map((z, i) => {
            const rpm = sim.gearRpm[i]
            const label = i === 0 ? 'Motor' : i === gears.length - 1 ? 'Output' : p.mode === 'compound' ? (i % 2 === 0 ? 'Driver' : 'Driven') : 'Idler'
            return (
              <span key={i} className="flex items-center gap-1">
                {p.mode === 'compound' && i > 0 && i % 2 === 0 && <span className="px-1 text-[#6E7888]" aria-hidden="true">║</span>}
                {i > 0 && !(p.mode === 'compound' && i % 2 === 0) && <span className="text-[#6E7888]" aria-hidden="true">→</span>}
                <button
                  type="button"
                  role="option"
                  aria-selected={sel === i}
                  onClick={() => edit(() => setSel(i))}
                  className={`${chip} flex-col py-1 ${sel === i ? 'border-amber-400 bg-amber-500/15 text-amber-300' : 'border-white/15 bg-[#111C32] text-[#EEF2F8]'}`}
                  aria-label={`${label} gear, ${z} teeth${showNumbers ? `, ${fmt(Math.abs(rpm))} rpm` : ''}${i === 0 && locked0 ? ', fixed' : ''}`}
                >
                  <span className="text-base leading-tight">{z}T</span>
                  <span className="text-[11px] font-semibold text-[#A7B0C0]">
                    {label}
                    {showNumbers ? ` · ${rpm >= 0 ? '↻' : '↺'}` : ''}
                  </span>
                </button>
              </span>
            )
          })}
          <button type="button" className={`${btnGhost} min-h-[44px] px-3`} onClick={add} disabled={!canAdd}>
            + {p.mode === 'compound' ? 'Stage' : 'Gear'}
          </button>
          <button type="button" className={`${btnGhost} min-h-[44px] px-3`} onClick={remove} disabled={!canRemove}>
            − {p.mode === 'compound' ? 'Stage' : 'Gear'}
          </button>
        </div>
      </div>

      {/* Tray */}
      <div className="mt-3">
        <p className="text-sm font-semibold text-[#A7B0C0]">Gear tray{sel === 0 && locked0 ? ' — the motor gear is fixed' : ''}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {sizes.map((z) => (
            <button
              key={z}
              type="button"
              disabled={sel === 0 && locked0}
              onClick={() => setSize(z)}
              aria-pressed={gears[sel] === z}
              className={`${chip} ${gears[sel] === z ? 'border-[#00E5FF] bg-[#00B8D4]/15 text-[#00E5FF]' : 'border-white/15 bg-[#19263F] text-[#EEF2F8]'} disabled:opacity-40`}
            >
              <TrayGear z={z} maxZ={sizes[sizes.length - 1]} />
              {z} teeth
            </button>
          ))}
        </div>
      </div>

      {/* Readouts */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Readout label="Output speed" value={showNumbers ? fmt(sim.outputRpm) : '?'} unit="rpm" tone={showNumbers && p.target.rpm ? (rpmOk ? 'good' : 'bad') : 'plain'} />
        <Readout label="Direction" value={showNumbers ? (sim.direction === 'same' ? 'Same ↻' : 'Opposite ↺') : '?'} tone="cyan" />
        {sim.outputTorque !== null && <Readout label="Output force" value={showNumbers ? fmt(sim.outputTorque) : '?'} unit="N·cm" />}
        {showMath && <Readout label="Speed ratio" value={showNumbers ? `${fmt(sim.speedRatio)} : 1` : '?'} />}
      </div>

      {showMath && showNumbers && (
        <p className="mt-2 rounded-2xl bg-[#111C32] px-3 py-2 font-mono text-sm text-[#A7B0C0]">
          output rpm = {p.motorRpm} ×{' '}
          {p.mode === 'chain'
            ? `${gears[0]}/${gears[gears.length - 1]}`
            : gears
                .filter((_, i) => i % 2 === 0)
                .map((g, k) => `${g}/${gears[2 * k + 1]}`)
                .join(' × ')}{' '}
          = {fmt(sim.outputRpm)}
          {(p.efficiencyPerMesh ?? 1) < 1 && sim.outputTorque !== null ? `   ·   torque × ${p.efficiencyPerMesh}^${sim.meshes} for friction` : ''}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={btnGhost}
          onClick={() => {
            playSound('click')
            setSpinning((s) => !s)
          }}
          aria-pressed={spinning}
        >
          {spinning ? 'Stop motor' : 'Spin motor'}
        </button>
        <button type="button" className={btnPrimary} onClick={test} disabled={!!att.result || att.done}>
          Test the train
        </button>
      </div>
      <FeedbackPanel att={att} />
    </TemplateCard>
  )
}
