'use client'
import { useState } from 'react'
import { btn, note, panel, title, ORANGE } from './ui'

const DECEL = 2 // m/s^2, a typical small mobile robot brake
export default function SafetyDemo() {
  const [dist, setDist] = useState(2.0)   // metres to person
  const [want, setWant] = useState(2.0)   // speed AI asks for, m/s
  const [safe, setSafe] = useState(true)
  const maxSafe = Math.sqrt(2 * DECEL * Math.max(0, dist - 0.3)) // keep 30 cm margin
  const v = safe ? Math.min(want, maxSafe) : want
  const stop = (v * v) / (2 * DECEL)
  const hit = stop > dist
  const px = 20 + (dist / 5) * 240
  return (
    <div style={panel}>
      <div style={title}>Try it live: the safety layer around the AI</div>
      <p style={note}>The AI asks for a speed. The safety layer has one simple rule: never go faster than you could stop in time. Move the person closer and push the speed up.</p>
      <label style={{ color: '#cbd5e1', fontSize: 14, display: 'block', margin: '8px 0' }}>Person is <b>{dist.toFixed(1)} m</b> away
        <input type="range" min={0.5} max={5} step={0.1} value={dist} onChange={(e) => setDist(+e.target.value)} style={{ width: '100%', maxWidth: 380, display: 'block' }} aria-label="Distance to person" /></label>
      <label style={{ color: '#cbd5e1', fontSize: 14, display: 'block', margin: '8px 0' }}>AI asks for <b>{want.toFixed(1)} m/s</b>
        <input type="range" min={0.2} max={4} step={0.1} value={want} onChange={(e) => setWant(+e.target.value)} style={{ width: '100%', maxWidth: 380, display: 'block' }} aria-label="Requested speed" /></label>
      <button style={btn(safe)} onClick={() => setSafe(!safe)}>Safety layer: {safe ? 'ON' : 'OFF'}</button>
      <svg viewBox="0 0 280 70" style={{ width: '100%', maxWidth: 520, marginTop: 10, background: '#0b1220', borderRadius: 10 }} role="img" aria-label="Robot, stopping distance and person">
        <text x={10} y={40} fontSize={22}>🤖</text>
        <rect x={34} y={30} width={Math.min(240, (stop / 5) * 240)} height={8} fill={hit ? '#f87171' : ORANGE} opacity={0.8} />
        <text x={px} y={40} fontSize={22}>🧍</text>
      </svg>
      <p style={{ ...note, color: '#e2e8f0' }}>Robot speed: <b>{v.toFixed(1)} m/s</b> · it needs <b>{stop.toFixed(2)} m</b> to stop · {hit ? <b style={{ color: '#f87171' }}>It cannot stop in time. Contact!</b> : <b style={{ color: '#4ade80' }}>It can stop in time.</b>}</p>
      <p style={note}>Turn the safety layer OFF and ask for 3 m/s with the person 1 m away. Then turn it ON: the speed is capped automatically. No judgment needed, just one formula.</p>
    </div>
  )
}
