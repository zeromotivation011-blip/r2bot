'use client'

// The interactive part of /tools/motor-torque-calculator. The physics lives in
// lib/calculators/motor-torque.ts; this file is inputs, results and a share link.
// State is mirrored into the query string (replaceState, no navigation) so a
// result can be shared or bookmarked exactly as it was.

import { useEffect, useMemo, useState } from 'react'
import {
  SURFACES,
  armTorques,
  convertTorque,
  driveTorque,
  torqueUnits,
  type TorqueUnit,
} from '@/lib/calculators/motor-torque'
import { trackEvent } from '@/lib/analytics'

type Mode = 'drive' | 'arm'

const DRIVE_DEFAULTS = {
  mass: 5, // kg
  wheel: 100, // mm
  motors: 2,
  slope: 10, // deg
  speed: 1, // m/s
  accel: 0.5, // m/s²
  crr: 0.015,
  eff: 100, // % (wheel on the gearmotor's output shaft)
}

const ARM_DEFAULTS = {
  links: 2,
  l1: 20, m1: 150, e1: 60, // cm, g, g (motor at the elbow)
  l2: 15, m2: 100, e2: 40,
  l3: 8, m3: 40,
  payload: 100, // g
  alpha: 90, // deg/s²
}

type DriveState = typeof DRIVE_DEFAULTS
type ArmState = typeof ARM_DEFAULTS

const fmt = (n: number, digits = 2) =>
  Number.isFinite(n) ? n.toLocaleString('en', { maximumFractionDigits: digits, minimumFractionDigits: n !== 0 && Math.abs(n) < 10 ? Math.min(2, digits) : 0 }) : '—'

const num = (v: string | null, fallback: number) => {
  if (v === null || v.trim() === '') return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function Field({
  id,
  label,
  unit,
  value,
  onChange,
  min = 0,
  max,
  step = 'any',
  hint,
}: {
  id: string
  label: string
  unit?: string
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  step?: number | 'any'
  hint?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-200">
        {label}
      </label>
      <div className="flex items-stretch overflow-hidden rounded-lg border border-white/15 bg-black/40 focus-within:border-amber-400">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(num(e.target.value, 0))}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="min-h-[44px] w-full bg-transparent px-3 text-base text-white outline-none"
        />
        {unit && (
          <span className="flex items-center border-l border-white/10 px-3 text-sm text-gray-400">{unit}</span>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-gray-400">
          {hint}
        </p>
      )}
    </div>
  )
}

function Torque({ nm, unit, big = false }: { nm: number; unit: TorqueUnit; big?: boolean }) {
  return (
    <span className={big ? 'text-3xl font-bold text-white' : 'font-semibold text-white'}>
      {fmt(convertTorque(nm, unit), unit === 'nm' ? 3 : 2)}{' '}
      <span className={big ? 'text-lg font-medium text-amber-300' : 'text-amber-300'}>{torqueUnits[unit].label}</span>
    </span>
  )
}

export default function MotorTorqueCalculatorClient() {
  const [mode, setMode] = useState<Mode>('drive')
  const [unit, setUnit] = useState<TorqueUnit>('kgcm')
  const [d, setD] = useState<DriveState>(DRIVE_DEFAULTS)
  const [a, setA] = useState<ArmState>(ARM_DEFAULTS)
  const [copied, setCopied] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Read a shared link once.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const m = q.get('mode')
    if (m === 'arm' || m === 'drive') setMode(m)
    const u = q.get('unit')
    if (u === 'nm' || u === 'kgcm' || u === 'ozin') setUnit(u)
    setD((s) => {
      const next = { ...s }
      for (const k of Object.keys(s) as (keyof DriveState)[]) next[k] = num(q.get(`d_${k}`), s[k])
      return next
    })
    setA((s) => {
      const next = { ...s }
      for (const k of Object.keys(s) as (keyof ArmState)[]) next[k] = num(q.get(`a_${k}`), s[k])
      next.links = Math.min(3, Math.max(1, Math.round(next.links)))
      return next
    })
    setHydrated(true)
  }, [])

  // Keep the URL in step so "copy link" always shares what is on screen.
  useEffect(() => {
    if (!hydrated) return
    const q = new URLSearchParams()
    q.set('mode', mode)
    q.set('unit', unit)
    if (mode === 'drive') for (const [k, v] of Object.entries(d)) q.set(`d_${k}`, String(v))
    else for (const [k, v] of Object.entries(a)) q.set(`a_${k}`, String(v))
    window.history.replaceState(null, '', `${window.location.pathname}?${q.toString()}`)
  }, [hydrated, mode, unit, d, a])

  const drive = useMemo(
    () =>
      driveTorque({
        massKg: d.mass,
        wheelDiameterM: d.wheel / 1000,
        motors: Math.max(1, Math.round(d.motors)),
        slopeDeg: d.slope,
        speedMs: d.speed,
        accelMs2: d.accel,
        crr: d.crr,
        efficiency: d.eff / 100,
      }),
    [d],
  )

  const arm = useMemo(() => {
    const all = [
      { lengthM: a.l1 / 100, massKg: a.m1 / 1000, endMassKg: a.e1 / 1000 },
      { lengthM: a.l2 / 100, massKg: a.m2 / 1000, endMassKg: a.e2 / 1000 },
      { lengthM: a.l3 / 100, massKg: a.m3 / 1000, endMassKg: 0 },
    ]
    return armTorques({
      links: all.slice(0, a.links),
      payloadKg: a.payload / 1000,
      alphaRad: (a.alpha * Math.PI) / 180,
    })
  }, [a])

  const setDrive = (k: keyof DriveState) => (n: number) => setD((s) => ({ ...s, [k]: n }))
  const setArm = (k: keyof ArmState) => (n: number) => setA((s) => ({ ...s, [k]: n }))

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      trackEvent('calculator_share', { tool: 'motor-torque', mode })
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const tabBase = 'min-h-[44px] flex-1 rounded-lg px-4 text-sm font-semibold transition-colors'
  const jointNames = ['Shoulder (pitch)', 'Elbow', 'Wrist']

  return (
    <div className="not-prose rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
      <div role="tablist" aria-label="What are you sizing?" className="flex gap-2 rounded-xl bg-black/40 p-1">
        <button
          role="tab"
          aria-selected={mode === 'drive'}
          onClick={() => setMode('drive')}
          className={`${tabBase} ${mode === 'drive' ? 'bg-amber-500 text-black' : 'text-gray-300 hover:text-white'}`}
        >
          Wheeled robot
        </button>
        <button
          role="tab"
          aria-selected={mode === 'arm'}
          onClick={() => setMode('arm')}
          className={`${tabBase} ${mode === 'arm' ? 'bg-amber-500 text-black' : 'text-gray-300 hover:text-white'}`}
        >
          Robot arm joint
        </button>
      </div>

      {mode === 'drive' ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field id="d-mass" label="Robot mass (all-up)" unit="kg" value={d.mass} onChange={setDrive('mass')} hint="Battery and payload included." />
          <Field id="d-wheel" label="Wheel diameter" unit="mm" value={d.wheel} onChange={setDrive('wheel')} />
          <Field id="d-motors" label="Driven wheels (one motor each)" value={d.motors} min={1} step={1} onChange={setDrive('motors')} hint="Casters and idler wheels do not count." />
          <Field id="d-slope" label="Steepest slope" unit="°" value={d.slope} max={60} onChange={setDrive('slope')} hint="0 for flat floors. A 1:12 wheelchair ramp is about 4.8°." />
          <Field id="d-speed" label="Top speed" unit="m/s" value={d.speed} onChange={setDrive('speed')} hint="1 m/s = 3.6 km/h." />
          <Field id="d-accel" label="Acceleration" unit="m/s²" value={d.accel} onChange={setDrive('accel')} hint="0.5 reaches 1 m/s in 2 seconds." />
          <div>
            <label htmlFor="d-surface" className="mb-1 block text-sm font-medium text-gray-200">
              Surface (rolling resistance)
            </label>
            <select
              id="d-surface"
              value={SURFACES.find((s) => s.crr === d.crr)?.id ?? 'custom'}
              onChange={(e) => {
                const s = SURFACES.find((x) => x.id === e.target.value)
                if (s) setD((p) => ({ ...p, crr: s.crr }))
              }}
              className="min-h-[44px] w-full rounded-lg border border-white/15 bg-black/40 px-3 text-base text-white focus:border-amber-400 focus:outline-none"
            >
              {SURFACES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} — {s.crr}
                </option>
              ))}
              <option value="custom">Custom (type it below)</option>
            </select>
          </div>
          <Field id="d-crr" label="Rolling resistance coefficient" value={d.crr} step={0.001} onChange={setDrive('crr')} hint="Measure your own: see “Measuring rolling resistance” below." />
          <Field id="d-eff" label="Drivetrain efficiency (motor shaft → wheel)" unit="%" value={d.eff} min={1} max={100} onChange={setDrive('eff')} hint="100 if the wheel sits on the gearmotor's output shaft." />
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div>
            <label htmlFor="a-links" className="mb-1 block text-sm font-medium text-gray-200">
              Number of links
            </label>
            <select
              id="a-links"
              value={a.links}
              onChange={(e) => setA((s) => ({ ...s, links: Number(e.target.value) }))}
              className="min-h-[44px] w-full rounded-lg border border-white/15 bg-black/40 px-3 text-base text-white focus:border-amber-400 focus:outline-none sm:w-1/2"
            >
              <option value={1}>1 link (one joint)</option>
              <option value={2}>2 links (shoulder + elbow)</option>
              <option value={3}>3 links (shoulder + elbow + wrist)</option>
            </select>
          </div>
          {[1, 2, 3].slice(0, a.links).map((i) => {
            const last = i === a.links
            const L = `l${i}` as keyof ArmState
            const M = `m${i}` as keyof ArmState
            const E = `e${i}` as keyof ArmState
            return (
              <fieldset key={i} className="rounded-xl border border-white/10 p-4">
                <legend className="px-1 text-xs font-bold uppercase tracking-widest text-amber-300">Link {i}</legend>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field id={`a-${L}`} label="Length" unit="cm" value={a[L]} onChange={setArm(L)} />
                  <Field id={`a-${M}`} label="Link mass" unit="g" value={a[M]} onChange={setArm(M)} />
                  {!last && i < 3 && (
                    <Field id={`a-${E}`} label={`Motor at the far end`} unit="g" value={a[E]} onChange={setArm(E)} hint={`The ${jointNames[i].toLowerCase()} actuator.`} />
                  )}
                </div>
              </fieldset>
            )
          })}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="a-payload" label="Payload at the tip" unit="g" value={a.payload} onChange={setArm('payload')} hint="Include the gripper." />
            <Field id="a-alpha" label="Angular acceleration" unit="°/s²" value={a.alpha} onChange={setArm('alpha')} hint="0 to size for holding only. 90 reaches 45°/s in half a second." />
          </div>
        </div>
      )}

      {/* Results */}
      <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-500/[0.07] p-4 sm:p-5" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-300">Result</p>
          <div role="group" aria-label="Torque unit" className="flex gap-1 rounded-lg bg-black/40 p-1">
            {(Object.keys(torqueUnits) as TorqueUnit[]).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                aria-pressed={unit === u}
                className={`min-h-[44px] min-w-[56px] rounded-md px-3 text-sm ${unit === u ? 'bg-white text-black' : 'text-gray-300 hover:text-white'}`}
              >
                {torqueUnits[u].label}
              </button>
            ))}
          </div>
        </div>

        {mode === 'drive' ? (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-300">Continuous torque per motor</p>
                <Torque nm={drive.steadyTorqueNm} unit={unit} big />
                <p className="mt-1 text-xs text-gray-400">Holding top speed on the steepest slope.</p>
              </div>
              <div>
                <p className="text-sm text-gray-300">Peak torque per motor</p>
                <Torque nm={drive.peakTorqueNm} unit={unit} big />
                <p className="mt-1 text-xs text-gray-400">Accelerating up that slope.</p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-gray-400">Wheel speed</dt>
                <dd className="font-semibold text-white">{fmt(drive.wheelRpm, 0)} RPM</dd>
              </div>
              <div>
                <dt className="text-gray-400">Power per motor</dt>
                <dd className="font-semibold text-white">{fmt(drive.steadyPowerW, 1)} W <span className="text-gray-400">(accelerating at top speed: {fmt(drive.peakPowerW, 1)} W)</span></dd>
              </div>
              <div>
                <dt className="text-gray-400">Total drive force</dt>
                <dd className="font-semibold text-white">{fmt(drive.peakForceN, 1)} N</dd>
              </div>
              <div>
                <dt className="text-gray-400">Look for stall torque ≥</dt>
                <dd><Torque nm={drive.minStallTorqueNm} unit={unit} /></dd>
              </div>
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-gray-400">
              Where the force goes: rolling {fmt(drive.forces.rolling, 1)} N · slope {fmt(drive.forces.grade, 1)} N · acceleration {fmt(drive.forces.accel, 1)} N.
              The stall figure is the larger of 4× continuous (the 25% rule for brushed DC motors, below) and 2× peak (our margin).
            </p>
          </>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="text-gray-400">
                  <th scope="col" className="py-2 pr-3 font-medium">Joint</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Holding</th>
                  <th scope="col" className="py-2 pr-3 font-medium">+ Acceleration</th>
                  <th scope="col" className="py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {arm.map((j) => (
                  <tr key={j.joint} className="border-t border-white/10">
                    <th scope="row" className="py-2 pr-3 font-medium text-gray-200">{jointNames[j.joint]}</th>
                    <td className="py-2 pr-3"><Torque nm={j.holdNm} unit={unit} /></td>
                    <td className="py-2 pr-3"><Torque nm={j.accelNm} unit={unit} /></td>
                    <td className="py-2"><Torque nm={j.totalNm} unit={unit} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs leading-relaxed text-gray-400">
              Arm stretched out horizontally (the worst case for gravity), only this joint moving. Joints must pivot about horizontal axes; a turntable (yaw) base carries no gravity torque. No gearbox losses are included: compare with the servo&apos;s output torque.
              Check whether a servo&apos;s headline torque is its stall torque or its rated torque; if it is stall, leave a wide margin above the total.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={copyLink}
          className="min-h-[44px] rounded-lg border border-white/20 px-4 text-sm font-semibold text-white hover:border-amber-400"
        >
          {copied ? 'Link copied' : 'Copy link to this result'}
        </button>
        <button
          onClick={() => {
            if (mode === 'drive') setD(DRIVE_DEFAULTS)
            else setA(ARM_DEFAULTS)
          }}
          className="min-h-[44px] rounded-lg px-4 text-sm text-gray-300 hover:text-white"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
