'use client'
import { useMemo, useState } from 'react'
import { BLUE, ORANGE, btn, note, panel, title } from './ui'

type P = { x: number; y: number; c: 0 | 1 }
const START: P[] = [
  ...[[60, 70], [90, 110], [50, 130], [100, 60], [120, 100], [75, 95]].map(([x, y]) => ({ x, y, c: 0 as const })),
  ...[[220, 200], [250, 170], [200, 240], [260, 230], [230, 140], [180, 210]].map(([x, y]) => ({ x, y, c: 1 as const })),
]
const K = 3
function predict(pts: P[], x: number, y: number): 0 | 1 {
  if (!pts.length) return 0
  const near = [...pts].sort((a, b) => (a.x - x) ** 2 + (a.y - y) ** 2 - ((b.x - x) ** 2 + (b.y - y) ** 2)).slice(0, K)
  return near.filter((p) => p.c === 1).length * 2 > near.length ? 1 : 0
}

export default function KnnDemo() {
  const [pts, setPts] = useState<P[]>(START)
  const [cls, setCls] = useState<0 | 1>(0)
  const [probe, setProbe] = useState<{ x: number; y: number } | null>(null)
  const cells = useMemo(() => {
    const out: { x: number; y: number; c: number }[] = []
    for (let x = 0; x < 300; x += 15) for (let y = 0; y < 300; y += 15) out.push({ x, y, c: predict(pts, x + 7, y + 7) })
    return out
  }, [pts])
  const onClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 300, y = ((e.clientY - r.top) / r.height) * 300
    if (e.shiftKey) setProbe({ x, y }); else setPts((p) => [...p, { x, y, c: cls }])
  }
  return (
    <div style={panel}>
      <div style={title}>Try it live: teach a robot to sort</div>
      <p style={note}>Imagine a robot sorting ripe fruit (orange) from unripe (blue). Each dot is one example it was shown. Click the picture to add examples. The coloured background shows what the robot would decide for any new fruit.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
        <button style={btn(cls === 0)} onClick={() => setCls(0)}>Add ripe example</button>
        <button style={btn(cls === 1)} onClick={() => setCls(1)}>Add unripe example</button>
        <button style={btn()} onClick={() => setPts(START)}>Reset</button>
        <button style={btn()} onClick={() => setPts([])}>Clear all</button>
        <button style={btn()} onClick={() => setPts((p) => [...p, { x: 70 + Math.random() * 40, y: 70 + Math.random() * 40, c: 1 }])}>Add a mislabelled example</button>
      </div>
      <svg viewBox="0 0 300 300" onClick={onClick} style={{ width: '100%', maxWidth: 420, borderRadius: 10, cursor: 'crosshair', background: '#0b1220', touchAction: 'manipulation' }} role="img" aria-label="Examples and the decision the robot would make">
        {cells.map((c, i) => <rect key={i} x={c.x} y={c.y} width={15} height={15} fill={c.c ? BLUE : ORANGE} opacity={0.18} />)}
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={6} fill={p.c ? BLUE : ORANGE} stroke="#fff" strokeWidth={1} />)}
        {probe && <g><circle cx={probe.x} cy={probe.y} r={9} fill="none" stroke="#fff" strokeWidth={2} strokeDasharray="3 2" /></g>}
      </svg>
      {probe && <p style={{ ...note, color: '#e2e8f0' }}>New fruit (shift-click) → robot says: <b style={{ color: predict(pts, probe.x, probe.y) ? BLUE : ORANGE }}>{predict(pts, probe.x, probe.y) ? 'unripe' : 'ripe'}</b></p>}
      <p style={note}>Try this: add 2 or 3 mislabelled examples inside the orange area and watch the blue patch appear. That is what bad training data does. Hold Shift and click to ask the robot about a new fruit. With no examples it can only guess.</p>
    </div>
  )
}
