'use client'

import { useEffect, useRef, useState } from 'react'
import type { DemoKind } from '@/lib/shorts'

const card = { padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', margin: '20px 0' } as const
const label = { color: '#FC6818', fontWeight: 800, fontSize: 12, letterSpacing: 1 } as const
const btn = (on = false) => ({ padding: '8px 14px', borderRadius: 999, border: '1px solid ' + (on ? '#FC6818' : 'rgba(255,255,255,0.25)'), background: on ? 'rgba(252,104,24,0.18)' : 'transparent', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }) as const

function useFrame(cb: (dt: number) => void) {
  const ref = useRef(cb)
  ref.current = cb
  useEffect(() => {
    let id = 0
    let last = performance.now()
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      ref.current(dt)
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [])
}

// ── Echo: ultrasonic distance ────────────────────────────────────────────
function Echo() {
  const [d, setD] = useState(1.5) // metres
  const [p, setP] = useState(0) // 0..1 progress of the round trip (slowed for viewing)
  useFrame((dt) => setP((x) => (x + dt * 0.35) % 1.25))
  const ms = ((2 * d) / 343) * 1000
  const wallX = 90 + (d / 3) * 260
  const out = p < 0.5 ? p * 2 : 1
  const back = p >= 0.5 && p < 1 ? (p - 0.5) * 2 : 0
  const pos = p < 0.5 ? 60 + (wallX - 60) * out : wallX - (wallX - 60) * back
  const show = p < 1
  return (
    <div style={card}>
      <div style={label}>TRY IT: MOVE THE WALL</div>
      <svg viewBox="0 0 400 120" width="100%" role="img" aria-label="Ultrasonic pulse travelling to a wall and back">
        <rect x="20" y="40" width="40" height="40" rx="8" fill="#FC6818" />
        <circle cx="52" cy="60" r="5" fill="var(--void)" />
        <rect x={wallX} y="20" width="10" height="80" rx="3" fill="#64748b" />
        {show && [0, 1, 2].map((i) => <circle key={i} cx={pos - i * 8} cy="60" r={6 + i * 3} fill="none" stroke="#4ade80" strokeWidth="2" opacity={1 - i * 0.3} />)}
      </svg>
      <input aria-label="Distance to wall" type="range" min={0.2} max={3} step={0.1} value={d} onChange={(e) => setD(Number(e.target.value))} style={{ width: '100%' }} />
      <p style={{ color: '#e2e8f0', margin: '8px 0 0' }}>Wall at <b>{d.toFixed(1)} m</b> → echo comes back after <b>{ms.toFixed(1)} ms</b>. The robot divides that time by two, then multiplies by the speed of sound (343 m/s).</p>
    </div>
  )
}

// ── Feedback: servo / cruise control ─────────────────────────────────────
function Feedback() {
  const [target, setTarget] = useState(60)
  const [fb, setFb] = useState(true)
  const angle = useRef(60)
  const vel = useRef(0)
  const [, tick] = useState(0)
  useFrame((dt) => {
    if (fb) {
      const err = target - angle.current
      const u = 40 * err - 9 * vel.current
      vel.current += u * dt
    } else {
      vel.current *= 0.9 // no controller: friction only
    }
    angle.current += vel.current * dt
    angle.current = Math.max(-10, Math.min(170, angle.current))
    tick((n) => (n + 1) % 1000)
  })
  const a = angle.current
  const rad = (-a * Math.PI) / 180
  const x2 = 90 + 80 * Math.cos(rad)
  const y2 = 100 + 80 * Math.sin(rad)
  const tr = (-target * Math.PI) / 180
  return (
    <div style={card}>
      <div style={label}>TRY IT: PUSH THE ARM</div>
      <svg viewBox="0 0 400 130" width="100%" role="img" aria-label="Arm that returns to a target angle when feedback is on">
        <line x1="90" y1="100" x2={90 + 80 * Math.cos(tr)} y2={100 + 80 * Math.sin(tr)} stroke="#4ade80" strokeDasharray="4 4" strokeWidth="2" />
        <line x1="90" y1="100" x2={x2} y2={y2} stroke="#FC6818" strokeWidth="10" strokeLinecap="round" />
        <circle cx="90" cy="100" r="12" fill="var(--border-2)" stroke="#FC6818" strokeWidth="3" />
        <text x="220" y="60" fill="#e2e8f0" fontSize="16" fontWeight="700">Angle {a.toFixed(0)}°</text>
        <text x="220" y="84" fill="#4ade80" fontSize="13">Target {target}°</text>
      </svg>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0' }}>
        <button style={btn(fb)} onClick={() => setFb(true)}>Feedback ON</button>
        <button style={btn(!fb)} onClick={() => setFb(false)}>Feedback OFF</button>
        <button style={btn()} onClick={() => { vel.current += 220 }}>Push the arm</button>
      </div>
      <input aria-label="Target angle" type="range" min={0} max={150} value={target} onChange={(e) => setTarget(Number(e.target.value))} style={{ width: '100%' }} />
      <p style={{ color: '#e2e8f0', margin: '8px 0 0' }}>{fb ? 'The controller keeps measuring the angle and pulls the arm back to the green target.' : 'With no feedback the arm stays wherever it was pushed. It never knows it is wrong.'}</p>
    </div>
  )
}

// ── Gears ────────────────────────────────────────────────────────────────
function Gears() {
  const [ratio, setRatio] = useState(4)
  const [rot, setRot] = useState(0)
  useFrame((dt) => setRot((r) => r + dt * 180))
  const motorRpm = 3000
  return (
    <div style={card}>
      <div style={label}>TRY IT: CHANGE THE GEAR RATIO</div>
      <svg viewBox="0 0 400 140" width="100%" role="img" aria-label="Small motor gear driving a larger output gear">
        <g transform={`translate(90 70) rotate(${rot})`}>
          <circle r="26" fill="var(--border-2)" stroke="#FC6818" strokeWidth="3" strokeDasharray="6 4" />
          <line x1="0" y1="0" x2="22" y2="0" stroke="#FC6818" strokeWidth="3" />
        </g>
        <g transform={`translate(${160 + Math.min(ratio, 8) * 6} 70) rotate(${-rot / ratio})`}>
          <circle r={26 + Math.min(ratio, 8) * 6} fill="var(--border-2)" stroke="#4ade80" strokeWidth="3" strokeDasharray="6 4" />
          <line x1="0" y1="0" x2={20 + Math.min(ratio, 8) * 6} y2="0" stroke="#4ade80" strokeWidth="3" />
        </g>
      </svg>
      <input aria-label="Gear ratio" type="range" min={1} max={10} value={ratio} onChange={(e) => setRatio(Number(e.target.value))} style={{ width: '100%' }} />
      <p style={{ color: '#e2e8f0', margin: '8px 0 0' }}>Ratio <b>{ratio}:1</b> → output about <b>{Math.round(motorRpm / ratio)} rpm</b> with roughly <b>{ratio}×</b> the turning force of the bare motor (real gearboxes lose a little to friction).</p>
    </div>
  )
}

// ── Tilt / balance (inverted pendulum) ───────────────────────────────────
function Tilt() {
  const [on, setOn] = useState(true)
  const th = useRef(0.02)
  const w = useRef(0)
  const [, tick] = useState(0)
  useFrame((dt) => {
    const u = on ? -60 * th.current - 12 * w.current : 0 // sensed tilt and rate drive the correction
    const acc = 9 * Math.sin(th.current) + u
    w.current += acc * dt
    th.current += w.current * dt
    if (Math.abs(th.current) > 1.4) { th.current = Math.sign(th.current) * 1.4; w.current = 0 }
    tick((n) => (n + 1) % 1000)
  })
  const deg = (th.current * 180) / Math.PI
  const fell = Math.abs(th.current) >= 1.39
  return (
    <div style={card}>
      <div style={label}>TRY IT: NUDGE THE ROBOT</div>
      <svg viewBox="0 0 400 150" width="100%" role="img" aria-label="Balancing robot that corrects tilt when its gyroscope is on">
        <line x1="20" y1="130" x2="380" y2="130" stroke="#475569" strokeWidth="3" />
        <g transform={`translate(200 130) rotate(${deg})`}>
          <rect x="-16" y="-100" width="32" height="100" rx="8" fill="#FC6818" />
          <circle cx="-5" cy="-80" r="4" fill="var(--void)" /><circle cx="5" cy="-80" r="4" fill="var(--void)" />
        </g>
        <circle cx="200" cy="130" r="9" fill="var(--border-2)" stroke="#FC6818" strokeWidth="2" />
        <text x="270" y="40" fill="#e2e8f0" fontSize="15" fontWeight="700">Tilt {deg.toFixed(0)}°</text>
        <text x="270" y="62" fill={fell ? '#f87171' : '#4ade80'} fontSize="13">{fell ? 'Fell over' : 'Upright'}</text>
      </svg>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <button style={btn(on)} onClick={() => { setOn(true); th.current = 0.05; w.current = 0 }}>Gyro balance ON</button>
        <button style={btn(!on)} onClick={() => { setOn(false); th.current = 0.05; w.current = 0 }}>Gyro balance OFF</button>
        <button style={btn()} onClick={() => { w.current += 1.2 }}>Nudge</button>
      </div>
      <p style={{ color: '#e2e8f0', margin: '8px 0 0' }}>{on ? 'The IMU reports tilt and spin rate, and the controller pushes back instantly.' : 'Without the sensor and correction, a tiny lean grows until it falls.'}</p>
    </div>
  )
}

// ── Generic sense → think → act loop ─────────────────────────────────────
function Loop({ steps }: { steps: [string, string, string] }) {
  const [i, setI] = useState(0)
  useEffect(() => { const id = setInterval(() => setI((x) => (x + 1) % 3), 1500); return () => clearInterval(id) }, [])
  const names = ['SENSE', 'THINK', 'ACT']
  return (
    <div style={card}>
      <div style={label}>THE LOOP, STEP BY STEP</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginTop: 10 }}>
        {steps.map((s, k) => (
          <button key={k} onClick={() => setI(k)} style={{ textAlign: 'left', padding: 12, borderRadius: 12, cursor: 'pointer', color: '#fff', background: i === k ? 'rgba(252,104,24,0.2)' : 'rgba(255,255,255,0.03)', border: '1px solid ' + (i === k ? '#FC6818' : 'rgba(255,255,255,0.12)'), transition: 'all .3s', transform: i === k ? 'translateY(-3px)' : 'none' }}>
            <div style={{ color: i === k ? '#FC6818' : '#94a3b8', fontWeight: 800, fontSize: 11 }}>{k + 1}. {names[k]}</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>{s}</div>
          </button>
        ))}
      </div>
      <p style={{ color: '#94a3b8', fontSize: 12, margin: '10px 0 0' }}>The robot repeats this loop many times a second. Tap a step to pause on it.</p>
    </div>
  )
}

export default function ShortDemo({ kind, loop }: { kind: DemoKind; loop?: [string, string, string] }) {
  if (kind === 'echo') return <Echo />
  if (kind === 'feedback') return <Feedback />
  if (kind === 'gears') return <Gears />
  if (kind === 'tilt') return <Tilt />
  return <Loop steps={loop ?? ['Sense the world', 'Think and decide', 'Act']} />
}
