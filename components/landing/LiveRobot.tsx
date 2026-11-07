'use client'

import { useEffect, useRef, useState } from 'react'

const FACTS = [
  'Hi! I am R2. Click me.',
  'Robots sense, think, then act. Over and over.',
  'A servo keeps checking its angle. That is feedback.',
  'Gears trade speed for strength.',
  'A gyroscope tells a robot how it is tilted.',
  'Try the echo demo below. Move the wall!',
]

export default function LiveRobot() {
  const ref = useRef<SVGSVGElement>(null)
  const [eye, setEye] = useState({ x: 0, y: 0 })
  const [blink, setBlink] = useState(false)
  const [wave, setWave] = useState(false)
  const [i, setI] = useState(0)
  const [spin, setSpin] = useState(0)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const onMove = (e: MouseEvent) => {
      const r = ref.current?.getBoundingClientRect()
      if (!r) return
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height * 0.3)
      const d = Math.max(1, Math.hypot(dx, dy))
      setEye({ x: (dx / d) * 3, y: (dy / d) * 2.5 })
    }
    window.addEventListener('mousemove', onMove)
    const b = setInterval(() => { setBlink(true); setTimeout(() => setBlink(false), 140) }, 3200)
    const f = setInterval(() => setI((n) => (n + 1) % FACTS.length), 4200)
    let raf = 0
    if (!reduce) { const loop = () => { setSpin((s) => (s + 4) % 360); raf = requestAnimationFrame(loop) }; raf = requestAnimationFrame(loop) }
    return () => { window.removeEventListener('mousemove', onMove); clearInterval(b); clearInterval(f); cancelAnimationFrame(raf) }
  }, [])

  const poke = () => { setWave(true); setI((n) => (n + 1) % FACTS.length); setTimeout(() => setWave(false), 1200) }
  const orbit = ['Sense', 'Think', 'Act', 'Learn']

  return (
    <div style={{ position: 'relative', width: 320, height: 380 }}>
      {orbit.map((o, k) => {
        const a = ((spin * 0.6 + k * 90) * Math.PI) / 180
        return <span key={o} style={{ position: 'absolute', left: 160 + Math.cos(a) * 150 - 28, top: 170 + Math.sin(a) * 120 - 12, width: 56, textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#FC6818', background: 'rgba(15,10,30,0.85)', border: '1px solid rgba(252,104,24,0.45)', borderRadius: 999, padding: '4px 0', opacity: 0.55 + 0.45 * Math.sin(a + 1) }}>{o}</span>
      })}
      <div style={{ position: 'absolute', top: 0, left: 20, right: 20, textAlign: 'center', fontSize: 13, color: 'var(--void)', fontWeight: 800, background: '#fde047', borderRadius: 12, padding: '8px 10px', transition: 'opacity .3s' }} aria-live="polite">{FACTS[i]}</div>
      <svg ref={ref} viewBox="0 0 220 260" width="280" height="340" role="img" aria-label="R2, the R2BOT robot mascot. Click to hear a robotics fact." onClick={poke} style={{ position: 'absolute', left: 20, top: 40, cursor: 'pointer', animation: 'r2float 4s ease-in-out infinite' }}>
        <defs>
          <linearGradient id="lr1" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#FC6818" /><stop offset="100%" stopColor="#0080A0" /></linearGradient>
          <linearGradient id="lr2" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#FC6818" /><stop offset="100%" stopColor="#7c3aed" /></linearGradient>
        </defs>
        <line x1="110" y1="14" x2="110" y2="36" stroke="#FF8A4C" strokeWidth="3" />
        <circle cx="110" cy="10" r="6" fill="#fde047" style={{ animation: 'r2pulse 1.4s ease-in-out infinite' }} />
        <rect x="50" y="36" width="120" height="80" rx="16" fill="url(#lr1)" stroke="#FC6818" strokeWidth="1.5" />
        <rect x="62" y="48" width="96" height="50" rx="8" fill="var(--void)" />
        {[88, 132].map((cx) => (
          <g key={cx}>
            <ellipse cx={cx} cy="70" rx="7" ry={blink ? 0.8 : 7} fill="#FC6818" />
            {!blink && <circle cx={cx + eye.x} cy={70 + eye.y} r="2.8" fill="var(--void)" />}
          </g>
        ))}
        <path d={wave ? 'M82 86 Q110 108 138 86' : 'M82 88 Q110 102 138 88'} stroke="#fde047" strokeWidth="3" fill="none" strokeLinecap="round" />
        <rect x="62" y="122" width="96" height="76" rx="10" fill="url(#lr2)" />
        <rect x="84" y="138" width="52" height="32" rx="4" fill="var(--void)" />
        {[94, 106, 118].map((cx, k) => <circle key={cx} cx={cx} cy="154" r="3" fill={Math.floor(spin / 60) % 3 === k ? '#fde047' : '#FC6818'} />)}
        <rect x="22" y="130" width="34" height="14" rx="6" fill="#FC6818" />
        <g style={{ transformOrigin: '164px 137px', transform: wave ? 'rotate(-55deg)' : 'rotate(0deg)', transition: 'transform .35s' }}>
          <rect x="164" y="130" width="34" height="14" rx="6" fill="#FC6818" />
        </g>
        {[82, 138].map((cx) => (
          <g key={cx} transform={`rotate(${spin * 2} ${cx} 216)`}>
            <circle cx={cx} cy="216" r="20" fill="var(--border-2)" stroke="#FC6818" strokeWidth="2" />
            <line x1={cx} y1="216" x2={cx + 14} y2="216" stroke="#FC6818" strokeWidth="2.5" />
            <circle cx={cx} cy="216" r="5" fill="var(--void)" />
          </g>
        ))}
      </svg>
      <style>{`
        @keyframes r2float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-12px) } }
        @keyframes r2pulse { 0%,100% { opacity: 1 } 50% { opacity: .3 } }
        @media (prefers-reduced-motion: reduce) { svg[aria-label^="R2"] { animation: none !important } }
      `}</style>
    </div>
  )
}
