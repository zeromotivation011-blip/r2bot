'use client'
import { useState } from 'react'
import { PROBLEMS } from '@/lib/india'

export default function ProblemExplorer() {
  const [i, setI] = useState(0)
  const p = PROBLEMS[i]
  const box = { padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' } as const
  const lab = { color: '#FC6818', fontSize: 12, fontWeight: 800, letterSpacing: 1 } as const
  return (
    <div>
      <div role="tablist" aria-label="Pick a problem" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {PROBLEMS.map((x, n) => <button key={x.id} role="tab" aria-selected={n === i} onClick={() => setI(n)}
          style={{ padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: 600, border: '1px solid rgba(255,255,255,0.2)', background: n === i ? '#FC6818' : 'transparent', color: n === i ? '#fff' : '#cbd5e1' }}>{x.label}</button>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 12 }}>
        <div style={box}><div style={lab}>THE ROBOT</div><p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.55 }}>{p.robot}</p></div>
        <div style={box}><div style={lab}>SENSORS IT NEEDS</div><p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.55 }}>{p.sensors}</p></div>
        <div style={box}><div style={lab}>WHAT IS HARD</div><p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.55 }}>{p.hard}</p></div>
        <div style={box}><div style={lab}>WHY IT MATTERS IN INDIA</div><p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.55 }}>{p.india}</p></div>
      </div>
      <p style={{ color: '#94a3b8', fontSize: 13, margin: '12px 0 0' }}>These are design ideas to think with, not products. Pick one and sketch your own version.</p>
    </div>
  )
}
