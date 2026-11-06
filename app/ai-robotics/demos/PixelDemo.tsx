'use client'
import { useState } from 'react'
import { btn, note, panel, title, ORANGE } from './ui'

const N = 12
function shapeAt(shape: string, x: number, y: number) {
  const cx = 5.5, cy = 5.5
  if (shape === 'square') return x >= 3 && x <= 8 && y >= 3 && y <= 8
  if (shape === 'circle') return (x - cx) ** 2 + (y - cy) ** 2 <= 9.5
  return y >= 2 && y <= 9 && Math.abs(x - cx) <= (y - 2) * 0.7   // triangle
}

export default function PixelDemo() {
  const [shape, setShape] = useState('circle')
  const [light, setLight] = useState(100)
  const [nums, setNums] = useState(false)
  const grid = Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) => {
    const base = shapeAt(shape, x, y) ? 40 : 200      // dark object on a light table
    return Math.round((base * light) / 100)
  }))
  const THRESH = 100
  const found = grid.flat().filter((v) => v < THRESH).length
  const real = grid.flat().filter((_, i) => shapeAt(shape, i % N, Math.floor(i / N))).length
  const verdict = found === 0 ? 'Nothing found' : found > real * 1.5 ? 'Everything looks like an object. Wrong!' : 'Object found'
  return (
    <div style={panel}>
      <div style={title}>Try it live: what a robot actually sees</div>
      <p style={note}>A camera does not see a shape. It records numbers. Each square below is one number (0 is black, 255 is white). The robot has one simple rule: anything darker than 100 is an object.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
        {['circle', 'square', 'triangle'].map((s) => <button key={s} style={btn(shape === s)} onClick={() => setShape(s)}>{s}</button>)}
        <button style={btn(nums)} onClick={() => setNums(!nums)}>{nums ? 'Show picture' : 'Show numbers'}</button>
      </div>
      <label style={{ color: '#cbd5e1', fontSize: 14 }}>Room brightness: <b>{light}%</b>
        <input type="range" min={20} max={130} value={light} onChange={(e) => setLight(+e.target.value)} style={{ width: '100%', maxWidth: 360, display: 'block', marginTop: 4 }} aria-label="Room brightness" />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${N},1fr)`, maxWidth: 360, marginTop: 12, border: '1px solid rgba(255,255,255,0.2)' }}>
        {grid.flat().map((v, i) => {
          const g = Math.min(255, v), hit = v < THRESH
          return <div key={i} style={{ aspectRatio: '1', background: `rgb(${g},${g},${g})`, outline: hit ? `1px solid ${ORANGE}` : 'none', fontSize: 9, color: g > 128 ? '#000' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{nums ? v : ''}</div>
        })}
      </div>
      <p style={{ ...note, color: '#e2e8f0' }}>Robot says: <b style={{ color: ORANGE }}>{verdict}</b> ({found} squares darker than 100)</p>
      <p style={note}>Now drag brightness down to 40%. The table gets darker than the rule, so the whole picture looks like an object. Same scene, different light, wrong answer. That is why real robots learn what objects look like in many lights, instead of using one fixed rule.</p>
    </div>
  )
}
