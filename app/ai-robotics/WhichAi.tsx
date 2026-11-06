'use client'
import { useState } from 'react'
import Link from 'next/link'

const Q = [
  { q: 'What does your robot need to do?', o: [
    ['see', 'Recognise things in pictures'], ['move', 'Get somewhere without bumping into things'],
    ['skill', 'Learn a physical skill (grip, walk, fold)'], ['talk', 'Understand spoken or typed requests'] ] },
] as const
const OUT: Record<string, { title: string; why: string; href: string; risk: string }> = {
  see: { title: 'Computer vision', why: 'A learned vision model finds and names objects from camera images.', href: '/ai-robotics/computer-vision-for-robots', risk: 'It can fail in poor light or on things unlike its training pictures.' },
  move: { title: 'SLAM and path planning', why: 'Build a map, find your place on it, then plan a safe route.', href: '/ai-robotics/slam-and-navigation', risk: 'Moving people and drifting sensors can confuse the map.' },
  skill: { title: 'Imitation or reinforcement learning', why: 'Copy demonstrations, or practise in a simulator with a reward score.', href: '/ai-robotics/imitation-learning', risk: 'A skill learned in simulation may not work unchanged on a real robot.' },
  talk: { title: 'Language models as planners', why: 'An LLM turns plain requests into steps that other software carries out.', href: '/ai-robotics/large-language-models-and-robots', risk: 'It can invent steps, so keep safety limits outside the language model.' },
}

export default function WhichAi() {
  const [a, setA] = useState<string | null>(null)
  const r = a ? OUT[a] : null
  return (
    <div>
      <p style={{ color: '#e2e8f0', fontWeight: 700, margin: '0 0 10px' }}>{Q[0].q}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {Q[0].o.map(([id, label]) => (
          <button key={id} onClick={() => setA(id)} style={{ padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600,
            border: '1px solid rgba(255,255,255,0.2)', background: a === id ? '#FC6818' : 'transparent', color: a === id ? '#fff' : '#cbd5e1' }}>{label}</button>
        ))}
      </div>
      {r && (
        <div style={{ marginTop: 14, padding: 16, borderRadius: 12, background: 'rgba(252,104,24,0.08)', border: '1px solid rgba(252,104,24,0.35)' }}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>Use: {r.title}</div>
          <p style={{ color: '#e2e8f0', margin: '6px 0' }}>{r.why}</p>
          <p style={{ color: '#94a3b8', margin: '0 0 8px', fontSize: 14 }}><b>Watch out:</b> {r.risk}</p>
          <Link href={r.href} style={{ color: '#FC6818', fontWeight: 700 }}>Learn how it works →</Link>
        </div>
      )}
    </div>
  )
}
