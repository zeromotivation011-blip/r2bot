'use client'
import { useMemo, useState } from 'react'
import { btn, note, panel, title, ORANGE, rng } from './ui'

const PTS = 40
const truth = (t: number) => ({ x: 20 + t * 260, y: 100 - Math.sin(t * Math.PI * 1.5) * 55 })
export default function ImitationDemo() {
  const [n, setN] = useState(3)
  const [seed, setSeed] = useState(5)
  const { demos, avg, err } = useMemo(() => {
    const r = rng(seed)
    const demos = Array.from({ length: 30 }, () => { const ox = (r() - 0.5) * 30, oy = (r() - 0.5) * 30, wob = r() * 6
      return Array.from({ length: PTS }, (_, i) => { const p = truth(i / (PTS - 1)); return { x: p.x + ox * 0.5 + (r() - 0.5) * wob, y: p.y + oy + (r() - 0.5) * wob } }) })
    const use = demos.slice(0, n)
    const avg = Array.from({ length: PTS }, (_, i) => ({ x: use.reduce((s, d) => s + d[i].x, 0) / n, y: use.reduce((s, d) => s + d[i].y, 0) / n }))
    const err = avg.reduce((s, p, i) => { const t = truth(i / (PTS - 1)); return s + Math.hypot(p.x - t.x, p.y - t.y) }, 0) / PTS
    return { demos, avg, err }
  }, [n, seed])
  const line = (a: { x: number; y: number }[]) => a.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ')
  return (
    <div style={panel}>
      <div style={title}>Try it live: learning from demonstrations</div>
      <p style={note}>A person guides a robot arm along a path. No two demonstrations are the same. The robot averages them into one smooth move (orange). Add more demonstrations and watch it settle.</p>
      <label style={{ color: 'var(--text-2)', fontSize: 14, display: 'block', margin: '8px 0' }}>Demonstrations shown: <b>{n}</b>
        <input type="range" min={1} max={30} value={n} onChange={(e) => setN(+e.target.value)} style={{ width: '100%', maxWidth: 380, display: 'block' }} aria-label="Number of demonstrations" /></label>
      <svg viewBox="0 0 300 200" style={{ width: '100%', maxWidth: 520, background: '#0b1220', borderRadius: 10 }} role="img" aria-label="Demonstrations and learned path">
        {demos.slice(0, n).map((d, i) => <path key={i} d={line(d)} fill="none" stroke="var(--text-2)" strokeWidth={1} opacity={0.5} />)}
        <path d={line(avg)} fill="none" stroke={ORANGE} strokeWidth={3} />
      </svg>
      <p style={{ ...note, color: '#e2e8f0' }}>Learned path is off the ideal by about <b style={{ color: ORANGE }}>{err.toFixed(1)}</b> units.</p>
      <button style={btn()} onClick={() => setSeed((s) => s + 1)}>New set of demonstrations</button>
      <p style={note}>With 1 demonstration the robot copies one person's slip exactly. With 20 the slips cancel out. That is why varied demonstrations beat one perfect one.</p>
    </div>
  )
}
