'use client'

// components/kids/maths/MathsWidgetClient.tsx — the small "play with the maths"
// panel on each /kids/maths/<concept> page (roadmap #86). One widget per concept
// (MathsConcept.widget). Plain SVG + range inputs: no 3D, no animation loop, so
// it costs almost nothing and needs no reduced-motion branch (nothing moves on
// its own). Keyboard: every control is a native button or range input.

import { useId, useMemo, useState } from 'react'
import type { MathsWidget } from '@/lib/kids/maths/concepts'
import { playSound } from '@/lib/kids-audio'

const box = 'rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-5'
const btn =
  'min-h-[48px] min-w-[48px] rounded-2xl border border-solid border-white/15 bg-[#19263F] px-4 font-display text-[16px] font-bold text-[#EEF2F8] transition hover:border-amber-400/60 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
const readout = 'font-mono text-[15px] text-cyan-300'

function Slider({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  const id = useId()
  return (
    <div className="mt-3">
      <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-[15px] font-semibold text-[#EEF2F8]">
        <span>{label}</span>
        <span className={readout}>
          {value}
          {unit}
        </span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-11 w-full cursor-pointer accent-amber-500"
      />
    </div>
  )
}

const r1 = (x: number) => Math.round(x * 10) / 10
const r2 = (x: number) => Math.round(x * 100) / 100

function Heading() {
  const [h, setH] = useState(0)
  const names: Record<number, string> = { 0: 'north', 45: 'north-east', 90: 'east', 135: 'south-east', 180: 'south', 225: 'south-west', 270: 'west', 315: 'north-west' }
  const turn = (d: number) => {
    playSound('click')
    setH((x) => (((x + d) % 360) + 360) % 360)
  }
  const rad = ((h - 90) * Math.PI) / 180
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[200px_1fr]">
      <svg viewBox="0 0 200 200" className="mx-auto w-[180px]" role="img" aria-label={`Compass: the robot faces ${h} degrees, ${names[h] ?? ''}`}>
        <circle cx="100" cy="100" r="88" fill="#0A1120" stroke="rgba(255,255,255,.16)" strokeWidth="2" />
        {[0, 90, 180, 270].map((a) => {
          const t = ((a - 90) * Math.PI) / 180
          return (
            <text key={a} x={100 + 72 * Math.cos(t)} y={105 + 72 * Math.sin(t)} textAnchor="middle" fill="#A7B0C0" fontSize="15" fontWeight="700">
              {a === 0 ? 'N' : a === 90 ? 'E' : a === 180 ? 'S' : 'W'}
            </text>
          )
        })}
        <line x1="100" y1="100" x2={100 + 55 * Math.cos(rad)} y2={100 + 55 * Math.sin(rad)} stroke="#FC6818" strokeWidth="7" strokeLinecap="round" />
        <circle cx="100" cy="100" r="10" fill="#FF8A4C" />
      </svg>
      <div>
        <p className="text-[17px] text-[#EEF2F8]">
          Heading: <span className={readout}>{h}°</span> <span className="text-[#A7B0C0]">({names[h] ?? ''})</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={() => turn(-90)}>↺ Left 90°</button>
          <button type="button" className={btn} onClick={() => turn(-45)}>↺ 45°</button>
          <button type="button" className={btn} onClick={() => turn(45)}>45° ↻</button>
          <button type="button" className={btn} onClick={() => turn(90)}>Right 90° ↻</button>
        </div>
        <p className="mt-3 text-[15px] text-[#A7B0C0]">Right turns add degrees, left turns take them away. 360° is a full turn, back to 0°.</p>
      </div>
    </div>
  )
}

function Coords() {
  const [x, setX] = useState(2)
  const [y, setY] = useState(1)
  const N = 8
  const cell = 24
  const move = (dx: number, dy: number) => {
    playSound('click')
    setX((v) => Math.max(0, Math.min(N - 1, v + dx)))
    setY((v) => Math.max(0, Math.min(N - 1, v + dy)))
  }
  const d = Math.hypot(x, y)
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[220px_1fr]">
      <svg viewBox={`0 0 ${N * cell + 24} ${N * cell + 24}`} className="mx-auto w-[210px]" role="img" aria-label={`Grid map: the robot is at x ${x}, y ${y}`}>
        {Array.from({ length: N }, (_, i) => (
          <g key={i}>
            <text x={24 + i * cell + cell / 2} y={N * cell + 18} textAnchor="middle" fill="#6E7888" fontSize="11">{i}</text>
            <text x={10} y={N * cell - i * cell - cell / 2 + 4} textAnchor="middle" fill="#6E7888" fontSize="11">{i}</text>
          </g>
        ))}
        {Array.from({ length: N * N }, (_, k) => {
          const cx = k % N
          const cy = Math.floor(k / N)
          return <rect key={k} x={24 + cx * cell} y={(N - 1 - cy) * cell} width={cell - 2} height={cell - 2} rx="4" fill="#19263F" />
        })}
        <line x1={24 + cell / 2} y1={(N - 1) * cell + cell / 2} x2={24 + x * cell + cell / 2} y2={(N - 1 - y) * cell + cell / 2} stroke="#00B8D4" strokeWidth="2" strokeDasharray="4 4" />
        <circle cx={24 + x * cell + cell / 2 - 1} cy={(N - 1 - y) * cell + cell / 2 - 1} r="9" fill="#FC6818" />
      </svg>
      <div>
        <p className="text-[17px] text-[#EEF2F8]">
          Position: <span className={readout}>({x}, {y})</span>
        </p>
        <p className="text-[15px] text-[#A7B0C0]">
          Straight-line distance from (0, 0): <span className={readout}>√({x}² + {y}²) ≈ {r2(d)}</span>
        </p>
        <div className="mt-3 grid w-max grid-cols-3 gap-2">
          <span />
          <button type="button" className={btn} onClick={() => move(0, 1)} aria-label="Up: y plus 1">↑</button>
          <span />
          <button type="button" className={btn} onClick={() => move(-1, 0)} aria-label="Left: x minus 1">←</button>
          <span />
          <button type="button" className={btn} onClick={() => move(1, 0)} aria-label="Right: x plus 1">→</button>
          <span />
          <button type="button" className={btn} onClick={() => move(0, -1)} aria-label="Down: y minus 1">↓</button>
          <span />
        </div>
      </div>
    </div>
  )
}

function Gears() {
  const [a, setA] = useState(40)
  const [b, setB] = useState(10)
  const [rpm, setRpm] = useState(30)
  const ratio = a / b
  const out = rpm * ratio
  const R = (t: number) => 6 + t * 0.9
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[240px_1fr]">
      <svg viewBox="0 0 240 150" className="mx-auto w-[230px]" role="img" aria-label={`A ${a}-tooth gear driving a ${b}-tooth gear`}>
        {[{ t: a, cx: 20 + R(a), fill: '#FC6818' }, { t: b, cx: 20 + 2 * R(a) + R(b) + 2, fill: '#00B8D4' }].map((g, i) => (
          <g key={i}>
            <circle cx={g.cx} cy="75" r={R(g.t)} fill={g.fill} opacity=".85" />
            {Array.from({ length: g.t }, (_, k) => {
              const th = (k / g.t) * Math.PI * 2
              return <circle key={k} cx={g.cx + R(g.t) * Math.cos(th)} cy={75 + R(g.t) * Math.sin(th)} r="2.2" fill={g.fill} />
            })}
            <circle cx={g.cx} cy="75" r="4" fill="#0A1120" />
          </g>
        ))}
      </svg>
      <div>
        <Slider label="Driving gear (on the motor)" value={a} min={10} max={60} step={10} unit=" teeth" onChange={setA} />
        <Slider label="Driven gear (on the wheel)" value={b} min={10} max={60} step={10} unit=" teeth" onChange={setB} />
        <Slider label="Motor speed" value={rpm} min={10} max={120} step={10} unit=" rpm" onChange={setRpm} />
        <p className="mt-3 text-[16px] text-[#EEF2F8]">
          Ratio <span className={readout}>{a} ÷ {b} = {r2(ratio)}</span> → wheel <span className={readout}>{r1(out)} rpm</span>
        </p>
        <p className="text-[15px] text-[#A7B0C0]">{ratio > 1 ? 'Faster but weaker.' : ratio < 1 ? 'Slower but stronger.' : 'Same speed, opposite direction.'}</p>
      </div>
    </div>
  )
}

/** Fixed, seeded noise so the picture is the same for everyone (and on the server). */
function noisy(n: number): number[] {
  let s = 12345
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648)
  return Array.from({ length: n }, (_, i) => {
    const g = (rnd() + rnd() + rnd() - 1.5) * 18
    const spike = i === 17 || i === 41 ? 45 : 0
    return 120 + g + spike
  })
}

function Noise() {
  const [w, setW] = useState(1)
  const [median, setMedian] = useState(false)
  const raw = useMemo(() => noisy(60), [])
  const filt = useMemo(
    () =>
      raw.map((_, i) => {
        const win = raw.slice(Math.max(0, i - w + 1), i + 1)
        if (median) {
          const s = [...win].sort((p, q) => p - q)
          return s[Math.floor(s.length / 2)]
        }
        return win.reduce((p, q) => p + q, 0) / win.length
      }),
    [raw, w, median],
  )
  const y = (v: number) => 130 - ((v - 60) / 120) * 120
  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${10 + i * 5},${y(v)}`).join(' ')
  const err = filt.slice(10).reduce((p, v) => p + Math.abs(v - 120), 0) / (filt.length - 10)
  return (
    <div>
      <svg viewBox="0 0 320 140" className="w-full max-w-[520px]" role="img" aria-label={`Noisy distance readings around 120 centimetres, filtered with a ${median ? 'median' : 'mean'} of ${w}`}>
        <line x1="10" x2="310" y1={y(120)} y2={y(120)} stroke="#22C55E" strokeDasharray="5 5" />
        <path d={path(raw)} fill="none" stroke="#6E7888" strokeWidth="1.5" />
        <path d={path(filt)} fill="none" stroke="#FC6818" strokeWidth="3" />
      </svg>
      <p className="text-[14px] text-[#A7B0C0]">
        Grey: raw readings. Orange: filtered. Green dashes: the true distance, 120 cm.
      </p>
      <Slider label="Readings averaged together" value={w} min={1} max={15} step={1} unit="" onChange={setW} />
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Filter">
        {([false, true] as const).map((m) => (
          <button key={String(m)} type="button" role="radio" aria-checked={median === m} className={`${btn} ${median === m ? 'border-amber-400 bg-amber-500/15' : ''}`} onClick={() => setMedian(m)}>
            {m ? 'Median' : 'Mean'}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[16px] text-[#EEF2F8]">
        Average error: <span className={readout}>{r1(err)} cm</span>
        <span className="text-[#A7B0C0]"> · more readings = steadier, but slower to react</span>
      </p>
    </div>
  )
}

function Arm() {
  const L1 = 40
  const L2 = 30
  const [t1, setT1] = useState(30)
  const [t2, setT2] = useState(60)
  const a1 = (t1 * Math.PI) / 180
  const a12 = ((t1 + t2) * Math.PI) / 180
  const ex = L1 * Math.cos(a1)
  const ey = L1 * Math.sin(a1)
  const x = ex + L2 * Math.cos(a12)
  const yv = ey + L2 * Math.sin(a12)
  const S = 1.6
  const ox = 120
  const oy = 130
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[240px_1fr]">
      <svg viewBox="0 0 240 150" className="mx-auto w-[230px]" role="img" aria-label={`Two-joint arm: gripper at x ${r1(x)}, y ${r1(yv)} centimetres`}>
        <circle cx={ox} cy={oy} r={(L1 + L2) * S} fill="none" stroke="rgba(0,184,212,.25)" strokeDasharray="4 4" />
        <line x1="0" x2="240" y1={oy} y2={oy} stroke="rgba(255,255,255,.16)" />
        <line x1={ox} y1={oy} x2={ox + ex * S} y2={oy - ey * S} stroke="#FC6818" strokeWidth="8" strokeLinecap="round" />
        <line x1={ox + ex * S} y1={oy - ey * S} x2={ox + x * S} y2={oy - yv * S} stroke="#00B8D4" strokeWidth="6" strokeLinecap="round" />
        <circle cx={ox} cy={oy} r="6" fill="#EEF2F8" />
        <circle cx={ox + ex * S} cy={oy - ey * S} r="5" fill="#EEF2F8" />
        <circle cx={ox + x * S} cy={oy - yv * S} r="5" fill="#22C55E" />
      </svg>
      <div>
        <Slider label="Shoulder θ1" value={t1} min={0} max={180} step={5} unit="°" onChange={setT1} />
        <Slider label="Elbow θ2" value={t2} min={-150} max={150} step={5} unit="°" onChange={setT2} />
        <p className="mt-3 font-mono text-[14px] leading-relaxed text-[#A7B0C0]">
          x = 40·cos {t1}° + 30·cos {t1 + t2}° = <span className="text-cyan-300">{r1(x)} cm</span>
          <br />
          y = 40·sin {t1}° + 30·sin {t1 + t2}° = <span className="text-cyan-300">{r1(yv)} cm</span>
        </p>
      </div>
    </div>
  )
}

function Battery() {
  const [cap, setCap] = useState(2000)
  const [used, setUsed] = useState(500)
  const [draw, setDraw] = useState(250)
  const left = Math.max(0, cap - used)
  const pct = Math.round((left * 100) / cap)
  const hours = left / draw
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[160px_1fr]">
      <svg viewBox="0 0 120 200" className="mx-auto w-[110px]" role="img" aria-label={`Battery ${pct} percent full`}>
        <rect x="40" y="6" width="40" height="14" rx="4" fill="#6E7888" />
        <rect x="14" y="18" width="92" height="176" rx="14" fill="#0A1120" stroke="rgba(255,255,255,.3)" strokeWidth="3" />
        <rect x="22" y={26 + 160 * (1 - pct / 100)} width="76" height={160 * (pct / 100)} rx="8" fill={pct > 30 ? '#22C55E' : '#FC6818'} />
        <text x="60" y="114" textAnchor="middle" fill="#EEF2F8" fontSize="22" fontWeight="800">{pct}%</text>
      </svg>
      <div>
        <Slider label="Capacity" value={cap} min={500} max={5000} step={100} unit=" mAh" onChange={(v) => { setCap(v); setUsed((u) => Math.min(u, v)) }} />
        <Slider label="Used so far" value={used} min={0} max={cap} step={50} unit=" mAh" onChange={setUsed} />
        <Slider label="Robot draws" value={draw} min={50} max={2000} step={50} unit=" mA" onChange={setDraw} />
        <p className="mt-3 text-[16px] text-[#EEF2F8]">
          Left: <span className={readout}>{left} × 100 ÷ {cap} = {pct}%</span>
        </p>
        <p className="text-[16px] text-[#EEF2F8]">
          Time left: <span className={readout}>{left} ÷ {draw} ≈ {r1(hours)} h</span>
        </p>
      </div>
    </div>
  )
}

const TITLES: Record<MathsWidget, string> = {
  heading: 'Turn the robot',
  coords: 'Drive on the grid',
  gears: 'Pick two gears',
  noise: 'Clean up a noisy sensor',
  arm: 'Move a 2-joint arm',
  battery: 'How long will it run?',
}

export default function MathsWidgetClient({ widget }: { widget: MathsWidget }) {
  return (
    <section className={box} aria-labelledby={`maths-widget-${widget}`}>
      <h2 id={`maths-widget-${widget}`} className="font-display text-xl font-bold text-[#EEF2F8]">
        Try it: {TITLES[widget]}
      </h2>
      <div className="mt-3">
        {widget === 'heading' && <Heading />}
        {widget === 'coords' && <Coords />}
        {widget === 'gears' && <Gears />}
        {widget === 'noise' && <Noise />}
        {widget === 'arm' && <Arm />}
        {widget === 'battery' && <Battery />}
      </div>
    </section>
  )
}
