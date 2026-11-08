'use client'
import { useMemo, useState } from 'react'
import { btn, note, panel, title, ORANGE, BLUE, rng } from './ui'

const SIDE = 100, O = 60
const truth = (() => { const p: [number, number][] = []
  for (let i = 0; i <= 40; i++) p.push([O + (i / 40) * SIDE, O]); for (let i = 1; i <= 40; i++) p.push([O + SIDE, O + (i / 40) * SIDE])
  for (let i = 1; i <= 40; i++) p.push([O + SIDE - (i / 40) * SIDE, O + SIDE]); for (let i = 1; i <= 40; i++) p.push([O, O + SIDE - (i / 40) * SIDE]); return p })()

export default function SlamDemo() {
  const [drift, setDrift] = useState(3)
  const [closed, setClosed] = useState(false)
  const [seed, setSeed] = useState(2)
  const est = useMemo(() => {
    const r = rng(seed); let ex = truth[0][0], ey = truth[0][1]
    const raw = truth.map((p, i) => { if (i) { ex += (p[0] - truth[i - 1][0]) * (1 + (r() - 0.35) * drift / 20) + (r() - 0.3) * drift * 0.12; ey += (p[1] - truth[i - 1][1]) * (1 + (r() - 0.35) * drift / 20) + (r() - 0.3) * drift * 0.12 } return [ex, ey] as [number, number] })
    const gap = [raw[raw.length - 1][0] - truth[0][0], raw[raw.length - 1][1] - truth[0][1]]
    const fixed = raw.map((p, i) => [p[0] - (gap[0] * i) / (raw.length - 1), p[1] - (gap[1] * i) / (raw.length - 1)] as [number, number])
    return { raw, fixed, gap: Math.hypot(gap[0], gap[1]) }
  }, [drift, seed])
  const line = (a: [number, number][]) => a.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')
  const shown = closed ? est.fixed : est.raw
  return (
    <div style={panel}>
      <div style={title}>Try it live: why robots need a map to correct themselves</div>
      <p style={{ ...note }}>A robot drives once around a square (white). It estimates its position only by counting wheel turns (orange). Small errors pile up, so the end does not meet the start.</p>
      <label style={{ color: 'var(--text-2)', fontSize: 14, display: 'block', margin: '8px 0' }}>Wheel slip and drift: <b>{drift}</b>
        <input type="range" min={0} max={10} value={drift} onChange={(e) => setDrift(+e.target.value)} style={{ width: '100%', maxWidth: 380, display: 'block' }} aria-label="Drift" /></label>
      <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
        <button style={btn(!closed)} onClick={() => setClosed(false)}>Wheels only</button>
        <button style={btn(closed)} onClick={() => setClosed(true)}>Recognise the start (loop closure)</button>
        <button style={btn()} onClick={() => setSeed((s) => s + 1)}>New run</button>
      </div>
      <svg viewBox="0 0 220 220" style={{ width: '100%', maxWidth: 400, background: '#0b1220', borderRadius: 10 }} role="img" aria-label="True path and estimated path">
        <path d={line(truth)} fill="none" stroke="#fff" strokeWidth={1} strokeDasharray="4 3" />
        <path d={line(shown)} fill="none" stroke={ORANGE} strokeWidth={2} />
        <circle cx={O} cy={O} r={5} fill={BLUE} />
      </svg>
      <p style={{ ...note, color: '#e2e8f0' }}>{closed ? <>The robot recognises the start (blue dot) and spreads the error back along the whole path. Gap closed.</> : <>The robot believes it finished <b style={{ color: ORANGE }}>{est.gap.toFixed(1)}</b> units away from where it started. It is lost by that much.</>}</p>
      <p style={note}>This is the heart of SLAM: when the robot sees a place it has seen before, it corrects its whole map, not just its last position.</p>
    </div>
  )
}
