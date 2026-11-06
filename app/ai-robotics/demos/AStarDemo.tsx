'use client'
import { useMemo, useState } from 'react'
import { btn, note, panel, title, ORANGE, BLUE, rng } from './ui'

const W = 14, H = 9
const START = 0 + 4 * W, GOAL = W - 1 + 4 * W

function solve(walls: Set<number>) {
  const h = (i: number) => Math.abs((i % W) - (GOAL % W)) + Math.abs(Math.floor(i / W) - Math.floor(GOAL / W))
  const open = new Map<number, number>([[START, h(START)]]), g = new Map<number, number>([[START, 0]]), from = new Map<number, number>()
  const closed = new Set<number>()
  while (open.size) {
    let cur = -1, bf = Infinity
    for (const [k, f] of open) if (f < bf) { bf = f; cur = k }
    if (cur === GOAL) {
      const path: number[] = [cur]; while (from.has(path[0])) path.unshift(from.get(path[0])!)
      return { path, explored: closed.size }
    }
    open.delete(cur); closed.add(cur)
    const x = cur % W, y = Math.floor(cur / W)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
      const n = ny * W + nx
      if (walls.has(n) || closed.has(n)) continue
      const ng = (g.get(cur) ?? 0) + 1
      if (ng < (g.get(n) ?? Infinity)) { g.set(n, ng); from.set(n, cur); open.set(n, ng + h(n)) }
    }
  }
  return { path: [] as number[], explored: closed.size }
}

export default function AStarDemo() {
  const [walls, setWalls] = useState<Set<number>>(() => new Set([2 + 2 * W, 2 + 3 * W, 2 + 4 * W, 2 + 5 * W, 2 + 6 * W, 6 + 1 * W, 6 + 2 * W, 6 + 3 * W, 6 + 4 * W, 6 + 6 * W, 6 + 7 * W, 10 + 2 * W, 10 + 3 * W, 10 + 5 * W, 10 + 6 * W, 10 + 7 * W]))
  const res = useMemo(() => solve(walls), [walls])
  const onPath = new Set(res.path)
  const toggle = (i: number) => { if (i === START || i === GOAL) return; setWalls((w) => { const n = new Set(w); n.has(i) ? n.delete(i) : n.add(i); return n }) }
  return (
    <div style={panel}>
      <div style={title}>Try it live: plan a route around obstacles</div>
      <p style={note}>The robot (🤖) must reach the flag (🏁). Click squares to add or remove walls. The planner (A*) re-plans instantly. Orange is the route it chose.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
        <button style={btn()} onClick={() => setWalls(new Set())}>Clear walls</button>
        <button style={btn()} onClick={() => { const r = rng(Date.now()); const n = new Set<number>(); for (let i = 0; i < W * H; i++) if (i !== START && i !== GOAL && r() < 0.27) n.add(i); setWalls(n) }}>Random walls</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${W},1fr)`, gap: 2, maxWidth: 520 }}>
        {Array.from({ length: W * H }, (_, i) => (
          <button key={i} onClick={() => toggle(i)} aria-label={`square ${i}`} style={{ aspectRatio: '1', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 16, padding: 0,
            background: walls.has(i) ? '#475569' : onPath.has(i) ? ORANGE : 'rgba(255,255,255,0.07)', color: '#fff' }}>
            {i === START ? '🤖' : i === GOAL ? '🏁' : ''}
          </button>
        ))}
      </div>
      <p style={{ ...note, color: '#e2e8f0' }}>{res.path.length ? <>Route found: <b style={{ color: ORANGE }}>{res.path.length - 1} steps</b> · squares checked: <b style={{ color: BLUE }}>{res.explored}</b></> : <b style={{ color: '#f87171' }}>No route exists. The robot must stop and ask for help.</b>}</p>
      <p style={note}>Wall off the flag completely. A robot with no planner would keep driving into the wall. One with a planner knows there is no route and can stop safely.</p>
    </div>
  )
}
