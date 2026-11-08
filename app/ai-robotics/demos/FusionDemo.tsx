'use client'
import { useMemo, useState } from 'react'
import { btn, note, panel, title, ORANGE, BLUE, rng } from './ui'

const T = 120
export default function FusionDemo() {
  const [drift, setDrift] = useState(2)     // wheel error per step, percent
  const [noise, setNoise] = useState(6)     // GPS jitter, metres
  const [w, setW] = useState(0.15)          // trust in GPS
  const [seed, setSeed] = useState(3)
  const d = useMemo(() => {
    const r = rng(seed), truth: number[] = [], wheel: number[] = [], gps: number[] = [], fused: number[] = []
    let wv = 0, fv = 0
    for (let t = 0; t < T; t++) {
      const x = t * 1.0
      const dw = 1.0 * (1 + drift / 100) + (r() - 0.5) * 0.3
      wv += dw; fv = (1 - w) * (fv + dw) + w * (x + (r() - 0.5) * 2 * noise)
      truth.push(x); wheel.push(wv)
      const gv = x + (r() - 0.5) * 2 * noise
      gps.push(gv); fused.push(fv)
    }
    return { truth, wheel, gps, fused }
  }, [drift, noise, w, seed])
  const err = (a: number[]) => (a.reduce((s, v, i) => s + Math.abs(v - d.truth[i]), 0) / T)
  const lo = -20, hi = 150
  const path = (a: number[]) => a.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (T - 1)) * 300},${200 - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * 190}`).join(' ')
  const row = (label: string, c: string, e: number) => <span style={{ color: c, marginRight: 14, fontSize: 14 }}><b>{label}</b>: off by {e.toFixed(1)} m on average</span>
  const sl = (label: string, v: number, set: (n: number) => void, min: number, max: number, stepv: number, show: string) => (
    <label style={{ color: 'var(--text-2)', fontSize: 14, display: 'block', margin: '8px 0' }}>{label}: <b>{show}</b>
      <input type="range" min={min} max={max} step={stepv} value={v} onChange={(e) => set(+e.target.value)} style={{ width: '100%', maxWidth: 380, display: 'block' }} aria-label={label} /></label>)
  return (
    <div style={panel}>
      <div style={title}>Try it live: blend two imperfect sensors</div>
      <p style={note}>A robot drives in a straight line. Wheel counting is smooth but drifts. GPS is jumpy but never drifts. White is the truth. Can fusion beat both?</p>
      <svg viewBox="0 0 300 200" style={{ width: '100%', maxWidth: 520, background: '#0b1220', borderRadius: 10, marginTop: 10 }} role="img" aria-label="Position estimates over time">
        <path d={path(d.gps)} fill="none" stroke={BLUE} strokeWidth={1} opacity={0.7} />
        <path d={path(d.wheel)} fill="none" stroke="#a78bfa" strokeWidth={1.5} />
        <path d={path(d.fused)} fill="none" stroke={ORANGE} strokeWidth={2} />
        <path d={path(d.truth)} fill="none" stroke="#fff" strokeWidth={1} strokeDasharray="4 3" />
      </svg>
      <div style={{ marginTop: 8 }}>{row('Wheels', '#a78bfa', err(d.wheel))}{row('GPS', BLUE, err(d.gps))}{row('Fused', ORANGE, err(d.fused))}</div>
      {sl('Wheel drift', drift, setDrift, 0, 8, 0.5, `${drift}%`)}
      {sl('GPS jitter', noise, setNoise, 1, 15, 1, `${noise} m`)}
      {sl('Trust in GPS', w, setW, 0, 1, 0.05, `${Math.round(w * 100)}%`)}
      <button style={btn()} onClick={() => setSeed((s) => s + 1)}>New random run</button>
      <p style={note}>Set trust in GPS to 0%: you get the drifting wheels. Set it to 100%: you get raw jumpy GPS. Somewhere around 10 to 20% beats both. That sweet spot is what sensor fusion finds.</p>
    </div>
  )
}
