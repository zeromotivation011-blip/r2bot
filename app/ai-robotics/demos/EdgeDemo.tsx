'use client'
import { useState } from 'react'
import { btn, note, panel, title, ORANGE } from './ui'

export default function EdgeDemo() {
  const [speed, setSpeed] = useState(8)        // m/s drone
  const [mode, setMode] = useState<'edge' | 'cloud'>('edge')
  const [net, setNet] = useState(250)          // cloud round-trip ms
  const delay = mode === 'edge' ? 30 : net     // on-board inference vs cloud round trip
  const travelled = (speed * delay) / 1000
  const SEE = 3                                // obstacle detected 3 m ahead
  const hit = travelled > SEE - 1.2            // needs ~1.2 m to swerve
  return (
    <div style={panel}>
      <div style={title}>Try it live: edge AI or cloud AI?</div>
      <p style={note}>A drone spots a tree 3 m ahead. It needs about 1.2 m to swerve. The AI answer takes time to arrive. How far does the drone fly before it can react?</p>
      <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
        <button style={btn(mode === 'edge')} onClick={() => setMode('edge')}>AI on the drone (edge)</button>
        <button style={btn(mode === 'cloud')} onClick={() => setMode('cloud')}>AI in the cloud</button>
      </div>
      <label style={{ color: '#cbd5e1', fontSize: 14, display: 'block', margin: '8px 0' }}>Drone speed: <b>{speed} m/s</b>
        <input type="range" min={1} max={15} value={speed} onChange={(e) => setSpeed(+e.target.value)} style={{ width: '100%', maxWidth: 380, display: 'block' }} aria-label="Drone speed" /></label>
      {mode === 'cloud' && <label style={{ color: '#cbd5e1', fontSize: 14, display: 'block', margin: '8px 0' }}>Network round trip: <b>{net} ms</b>
        <input type="range" min={50} max={1000} step={10} value={net} onChange={(e) => setNet(+e.target.value)} style={{ width: '100%', maxWidth: 380, display: 'block' }} aria-label="Network delay" /></label>}
      <svg viewBox="0 0 300 50" style={{ width: '100%', maxWidth: 520, background: '#0b1220', borderRadius: 10 }} role="img" aria-label="Drone and tree">
        <text x={10} y={34} fontSize={22}>🚁</text>
        <rect x={10} y={22} width={Math.min(260, (travelled / 3) * 240)} height={6} fill={hit ? '#f87171' : ORANGE} opacity={0.8} />
        <text x={262} y={34} fontSize={22}>🌳</text>
      </svg>
      <p style={{ ...note, color: '#e2e8f0' }}>Delay: <b>{delay} ms</b> → flies <b>{travelled.toFixed(2)} m</b> before reacting · {hit ? <b style={{ color: '#f87171' }}>Too late. Crash.</b> : <b style={{ color: '#4ade80' }}>Time to swerve.</b>}</p>
      <p style={note}>Try the cloud at 8 m/s with a 250 ms network. Then switch to on-board. Same AI, very different result. The trade-off: a small chip can run only a small model.</p>
    </div>
  )
}
