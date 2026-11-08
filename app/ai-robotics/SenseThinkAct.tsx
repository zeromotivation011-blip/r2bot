'use client'
import { useState } from 'react'

const TASKS = [
  { id: 'vac', label: 'Robot vacuum cleans a flat', sense: 'Bump sensors, a lidar or camera and wheel counters.', think: 'SLAM builds a map. A planner picks the cleaning route.', act: 'Wheels drive the route. The brush and fan run.', without: 'Without the map it zig-zags at random and misses corners.' },
  { id: 'arm', label: 'Robot arm picks a ripe tomato', sense: 'A camera sees the tomato. Depth data gives its 3D position.', think: 'A vision model finds ripe ones. A planner works out the arm path.', act: 'Joint motors move the arm. A soft gripper closes with limited force.', without: 'Without vision it only picks from fixed positions, and a shifted tray means misses.' },
  { id: 'drone', label: 'Drone follows a hiker', sense: 'A camera and an inertial sensor for balance.', think: 'A detector keeps the hiker in view. A controller keeps it level and at distance.', act: 'Four propellers change speed many times a second.', without: 'Without fast on-board AI it reacts too late and loses or hits something.' },
  { id: 'assist', label: 'Home robot "brings me a mug"', sense: 'Microphone hears the request. Camera finds the mug.', think: 'A language model splits the request into steps. Vision and planning do each step.', act: 'It drives, grasps and returns, while safety limits cap speed and force.', without: 'Without language AI every new request needs a programmer.' },
] as const

export default function SenseThinkAct() {
  const [i, setI] = useState(0)
  const t = TASKS[i]
  const box = { padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' } as const
  const lab = { color: '#FC6818', fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' } as const
  return (
    <div>
      <div role="tablist" aria-label="Pick a robot task" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {TASKS.map((x, n) => (
          <button key={x.id} role="tab" aria-selected={n === i} onClick={() => setI(n)}
            style={{ padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              background: n === i ? '#FC6818' : 'transparent', color: n === i ? '#fff' : 'var(--text-2)' }}>{x.label}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
        <div style={box}><div style={lab}>1 · Sense</div><p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.55 }}>{t.sense}</p></div>
        <div style={box}><div style={lab}>2 · Think (AI)</div><p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.55 }}>{t.think}</p></div>
        <div style={box}><div style={lab}>3 · Act</div><p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.55 }}>{t.act}</p></div>
      </div>
      <p style={{ color: 'var(--text-2)', margin: '12px 0 0', fontSize: 14 }}><b style={{ color: '#e2e8f0' }}>What goes wrong without the AI step:</b> {t.without}</p>
    </div>
  )
}
