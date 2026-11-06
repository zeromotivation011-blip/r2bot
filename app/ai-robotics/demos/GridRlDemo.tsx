'use client'
import { useRef, useState } from 'react'
import { btn, note, panel, title, ORANGE, rng } from './ui'

const W = 6, H = 6
const GOAL = W * H - 1
const PITS = new Set([8, 9, 16, 22, 27])      // fixed hazards
const ARROWS = ['↑', '→', '↓', '←']
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]

function step(s: number, a: number) {
  const x = s % W, y = Math.floor(s / W)
  const nx = Math.min(W - 1, Math.max(0, x + DX[a])), ny = Math.min(H - 1, Math.max(0, y + DY[a]))
  const n = ny * W + nx
  const r = n === GOAL ? 10 : PITS.has(n) ? -10 : -0.1
  return { n, r, done: n === GOAL || PITS.has(n) }
}

export default function GridRlDemo() {
  const q = useRef(new Float32Array(W * H * 4))
  const rand = useRef(rng(7))
  const [eps, setEps] = useState(0)
  const [lastLen, setLastLen] = useState<number | null>(null)
  const [, bump] = useState(0)

  function run(n: number) {
    let length = 0
    for (let e = 0; e < n; e++) {
      let s = 0; length = 0
      while (length < 200) {
        const Q = q.current
        let a = Math.floor(rand.current() * 4)
        if (rand.current() > 0.25) { let best = -1e9; for (let k = 0; k < 4; k++) if (Q[s * 4 + k] > best) { best = Q[s * 4 + k]; a = k } }
        const { n: s2, r, done } = step(s, a)
        let m = -1e9; for (let k = 0; k < 4; k++) m = Math.max(m, Q[s2 * 4 + k])
        Q[s * 4 + a] += 0.5 * (r + (done ? 0 : 0.9 * m) - Q[s * 4 + a])
        s = s2; length++
        if (done) break
      }
    }
    setEps((v) => v + n); setLastLen(length); bump((v) => v + 1)
  }
  function reset() { q.current = new Float32Array(W * H * 4); setEps(0); setLastLen(null) }

  const best = (s: number) => { let b = 0; for (let k = 1; k < 4; k++) if (q.current[s * 4 + k] > q.current[s * 4 + b]) b = k; return b }
  return (
    <div style={panel}>
      <div style={title}>Try it live: a robot learns by trial and error</div>
      <p style={note}>The robot starts top-left (🤖) and wants the flag (🏁). Red squares are holes. It is never told the route. It only gets a score: +10 for the flag, -10 for a hole, a tiny penalty per step. Press train and watch the arrows appear.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
        <button style={btn()} onClick={() => run(1)}>Train 1 try</button>
        <button style={btn()} onClick={() => run(10)}>Train 10</button>
        <button style={btn(true)} onClick={() => run(100)}>Train 100</button>
        <button style={btn()} onClick={reset}>Reset</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${W},1fr)`, gap: 3, maxWidth: 360 }}>
        {Array.from({ length: W * H }, (_, s) => {
          const pit = PITS.has(s), goal = s === GOAL
          const learned = eps > 0 && !pit && !goal
          return <div key={s} style={{ aspectRatio: '1', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            background: pit ? 'rgba(239,68,68,0.35)' : goal ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.06)', color: ORANGE }}>
            {s === 0 ? '🤖' : goal ? '🏁' : learned ? ARROWS[best(s)] : ''}
          </div>
        })}
      </div>
      <p style={{ ...note, color: '#e2e8f0' }}>Tries so far: <b>{eps}</b>{lastLen !== null && <> · last try took <b>{lastLen}</b> steps</>}</p>
      <p style={note}>After about 100 tries the arrows should lead around the holes to the flag. A good route here is 10 steps. Press Reset and train only 1 or 10 times to see how a robot with little practice wanders.</p>
    </div>
  )
}
