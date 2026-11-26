'use client'

// components/kids/activities/templates/path-planner/PathPlannerClient.tsx
// Draw a route by dragging (or tapping) from the robot, cell to neighbouring
// cell; tap a cell already on the route to cut back to it. Keyboard: arrow
// keys extend the route (with diagonals on Q/E/Z/C when allowed), Backspace
// undoes. "Drive!" animates the robot along the route and checks it. Then
// "Watch the algorithm" replays BFS / Dijkstra / A* expanding the map cell by
// cell and draws its optimal route over yours.

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { TemplateProps } from '@/lib/kids/activities/types'
import { playSound } from '@/lib/kids-audio'
import { cellCost, parseMap, pathCost, plan, revealAlgo, stepCost, type Answer, type Cell, type Params } from './logic'
import { FeedbackPanel, Readout, TemplateCard, btnGhost, btnPrimary, useAnimationFrame, useAttempts, useReducedMotion } from '../gear-train/TemplateFrameClient'

const C = 40 // svg units per cell
const ALGO_NAME = { bfs: 'Breadth-first search (BFS)', dijkstra: 'Dijkstra’s algorithm', astar: 'A* search' } as const
const ALGO_BLURB = {
  bfs: 'BFS spreads out one step at a time in every direction, like ripples in a pond. It finds the route with the fewest steps.',
  dijkstra: 'Dijkstra always grows the cheapest route found so far, adding up the cost of every square. It finds the lowest-cost route.',
  astar: 'A* is Dijkstra plus a guess of the distance still to go, so it searches toward the goal first — same best route, fewer cells explored.',
} as const

const fmt = (x: number) => (Math.abs(x - Math.round(x)) < 1e-6 ? String(Math.round(x)) : x.toFixed(1))

export default function PathPlannerClient({ params: p, onSubmit, onDone }: TemplateProps<Params, Answer>) {
  const g = useMemo(() => parseMap(p)!, [p])
  const att = useAttempts(onSubmit, onDone)
  const reduced = useReducedMotion()
  const [path, setPath] = useState<Cell[]>([g.start])
  const [drive, setDrive] = useState<number | null>(null)
  const driveRef = useRef(0)
  const [reveal, setReveal] = useState<number | null>(null)
  const revealRef = useRef(0)
  const [prediction, setPrediction] = useState<number | null>(null)
  const drawing = useRef(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const solved = !!att.result?.correct
  const algo = revealAlgo(p)
  const best = useMemo(() => plan(p, algo)!, [p, algo])
  const compare = useMemo(
    () => (algo === 'astar' ? plan(p, 'dijkstra') : algo === 'dijkstra' && p.map.some((r) => /[~:]/.test(r)) ? plan(p, 'bfs') : null),
    [p, algo],
  )
  const cost = useMemo(() => pathCost(p, g, path) ?? 0, [p, g, path])
  const W = g.cols * C
  const H = g.rows * C
  const terrainName = (ch: string) => (ch === '~' ? p.terrainNames?.mud ?? 'Mud' : ch === ':' ? p.terrainNames?.sand ?? 'Sand' : 'Floor')

  const same = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1]
  const extendTo = (cell: Cell) => {
    if (solved || drive !== null) return
    if (att.result) att.clear()
    setReveal(null)
    setPath((pa) => {
      const idx = pa.findIndex((c) => same(c, cell))
      if (idx >= 0) {
        if (idx !== pa.length - 1) playSound('click')
        return pa.slice(0, idx + 1)
      }
      const last = pa[pa.length - 1]
      if (stepCost(p, g, last[0], last[1], cell[0], cell[1]) === null) return pa
      playSound('click')
      return [...pa, cell]
    })
  }

  const cellAt = (e: PointerEvent<SVGSVGElement>): Cell | null => {
    const b = svgRef.current?.getBoundingClientRect()
    if (!b) return null
    const c = Math.floor(((e.clientX - b.left) / b.width) * g.cols)
    const r = Math.floor(((e.clientY - b.top) / b.height) * g.rows)
    if (r < 0 || c < 0 || r >= g.rows || c >= g.cols) return null
    return [r, c]
  }

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const dirs: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    if (p.diagonal) Object.assign(dirs, { q: [-1, -1], e: [-1, 1], z: [1, -1], c: [1, 1] })
    const d = dirs[e.key] ?? dirs[e.key.toLowerCase()]
    if (d) {
      e.preventDefault()
      const last = path[path.length - 1]
      // Stepping back onto a cell already on the route cuts back to it (undo).
      extendTo([last[0] + d[0], last[1] + d[1]])
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      if (path.length > 1) extendTo(path[path.length - 2])
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go()
    }
  }

  const go = () => {
    if (att.result || drive !== null) return
    playSound('click')
    if (reduced || path.length < 2) {
      att.submit({ path })
      return
    }
    driveRef.current = 0
    setDrive(0)
  }

  useAnimationFrame(drive !== null, (dt) => {
    const n = path.length - 1
    const v = Math.min(n, driveRef.current + dt * 4)
    if (Math.floor(v) !== Math.floor(driveRef.current)) playSound('click')
    driveRef.current = v
    setDrive(v)
    if (v >= n) {
      setDrive(null)
      att.submit({ path })
    }
  })

  const startReveal = () => {
    playSound('click')
    if (reduced) {
      setReveal(best.explored.length)
      return
    }
    revealRef.current = 0
    setReveal(0)
  }
  useAnimationFrame(reveal !== null && reveal < best.explored.length, (dt) => {
    const v = Math.min(best.explored.length, revealRef.current + dt * Math.max(14, best.explored.length / 3))
    revealRef.current = v
    setReveal(v)
    if (v >= best.explored.length) playSound('star')
  })

  // Robot position (interpolated while driving).
  const robotPos = (() => {
    const t = drive ?? path.length - 1
    const i = Math.min(path.length - 1, Math.floor(t))
    const f = t - i
    const a = path[i]
    const b = path[Math.min(path.length - 1, i + 1)]
    return { x: (a[1] + (b[1] - a[1]) * f + 0.5) * C, y: (a[0] + (b[0] - a[0]) * f + 0.5) * C }
  })()
  const exploredSet = useMemo(() => {
    const n = Math.floor(reveal ?? 0)
    const m = new Map<string, number>()
    best.explored.slice(0, n).forEach(([r, c], i) => m.set(`${r},${c}`, i))
    return m
  }, [reveal, best])
  const revealDone = reveal !== null && reveal >= best.explored.length
  const showCosts = p.showCosts ?? true
  const hasTerrain = p.map.some((r) => /[~:]/.test(r))
  const pts = (cells: Cell[]) => cells.map(([r, c]) => `${(c + 0.5) * C},${(r + 0.5) * C}`).join(' ')
  const answered = !!att.result

  return (
    <TemplateCard label="Path planner">
      <p className="font-display text-lg font-bold text-[#EEF2F8]">{p.task}</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#A7B0C0]">
        <span>🤖 {p.robotLabel ?? 'Robot'}</span>
        <span>🏁 {p.goalLabel ?? 'Goal'}</span>
        {g.checkpoints.length > 0 && <span>① ② checkpoints (any order)</span>}
        {hasTerrain && (
          <>
            <span>
              <span className="mr-1 inline-block h-3 w-3 rounded-sm bg-[#1C2B47] align-middle" /> Floor = 1
            </span>
            {p.map.some((r) => r.includes(':')) && (
              <span>
                <span className="mr-1 inline-block h-3 w-3 rounded-sm bg-[#C9A227] align-middle" /> {terrainName(':')} = {cellCost(p, ':')}
              </span>
            )}
            {p.map.some((r) => r.includes('~')) && (
              <span>
                <span className="mr-1 inline-block h-3 w-3 rounded-sm bg-[#7A4B26] align-middle" /> {terrainName('~')} = {cellCost(p, '~')}
              </span>
            )}
          </>
        )}
        {p.diagonal && <span>Diagonal steps cost ×1.4 (√2)</span>}
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full max-w-[600px] touch-none select-none rounded-2xl bg-[#0A1120] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          tabIndex={0}
          role="application"
          aria-label={`Map ${g.rows} by ${g.cols}. Arrow keys draw the route${p.diagonal ? ', Q E Z C go diagonally' : ''}, Backspace undoes, Enter drives.`}
          onPointerDown={(e) => {
            const cell = cellAt(e)
            if (!cell) return
            drawing.current = true
            ;(e.target as Element).setPointerCapture?.(e.pointerId)
            extendTo(cell)
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return
            const cell = cellAt(e)
            const last = path[path.length - 1]
            if (cell && !same(cell, last)) extendTo(cell)
          }}
          onPointerUp={() => (drawing.current = false)}
          onPointerCancel={() => (drawing.current = false)}
          onKeyDown={onKey}
        >
          {p.map.map((row, r) =>
            [...row].map((ch, c) => {
              const ex = exploredSet.get(`${r},${c}`)
              const fill = ch === '#' ? '#2A3A5C' : ch === '~' ? '#7A4B26' : ch === ':' ? '#C9A227' : '#1C2B47'
              return (
                <g key={`${r}-${c}`}>
                  <rect x={c * C + 1} y={r * C + 1} width={C - 2} height={C - 2} rx={6} fill={fill} opacity={ch === ':' ? 0.55 : 1} />
                  {ch === '#' && <path d={`M${c * C + 8} ${r * C + 14} h24 M${c * C + 8} ${r * C + 26} h24`} stroke="#3A4C70" strokeWidth={3} />}
                  {ex !== undefined && (
                    <rect x={c * C + 1} y={r * C + 1} width={C - 2} height={C - 2} rx={6} fill="#00B8D4" opacity={0.18 + 0.25 * (1 - ex / Math.max(1, best.explored.length))} />
                  )}
                  {showCosts && (ch === '~' || ch === ':') && (
                    <text x={c * C + C - 6} y={r * C + 13} fontSize={10} fontWeight={700} fill="#EEF2F8" textAnchor="end" opacity={0.85}>
                      {cellCost(p, ch)}
                    </text>
                  )}
                  {ch >= '1' && ch <= '3' && (
                    <g>
                      <circle cx={(c + 0.5) * C} cy={(r + 0.5) * C} r={13} fill="#FFD166" />
                      <text x={(c + 0.5) * C} y={(r + 0.5) * C + 5} fontSize={15} fontWeight={800} fill="#1A1103" textAnchor="middle">
                        {ch}
                      </text>
                    </g>
                  )}
                  {ch === 'G' && (
                    <text x={(c + 0.5) * C} y={(r + 0.5) * C + 9} fontSize={24} textAnchor="middle">
                      🏁
                    </text>
                  )}
                </g>
              )
            }),
          )}
          {revealDone && (
            <polyline points={pts(best.path)} fill="none" stroke="#00E5FF" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={0.75} strokeDasharray="2 10" />
          )}
          <polyline points={pts(path)} fill="none" stroke="#FC6818" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
          {path.length > 1 && (
            <circle cx={(path[path.length - 1][1] + 0.5) * C} cy={(path[path.length - 1][0] + 0.5) * C} r={7} fill="#FFA878" className="motion-safe:animate-pulse" />
          )}
          <g transform={`translate(${robotPos.x} ${robotPos.y})`}>
            <circle r={15} fill="#FC6818" stroke="#1A1103" strokeWidth={2} />
            <text y={6} fontSize={17} textAnchor="middle">
              🤖
            </text>
          </g>
        </svg>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2" aria-live="polite">
            <Readout label="Steps" value={`${path.length - 1}`} />
            <Readout label="Route cost" value={fmt(cost)} tone="cyan" />
          </div>
          <p className="text-[14px] text-[#A7B0C0]">Drag from the robot through neighbouring squares. Tap a square on your route to go back to it.</p>
          {!answered && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnPrimary} onClick={go} disabled={drive !== null || path.length < 2}>
                {drive !== null ? 'Driving…' : 'Drive!'}
              </button>
              <button
                type="button"
                className={btnGhost}
                onClick={() => {
                  playSound('click')
                  setPath([g.start])
                }}
                disabled={drive !== null || path.length < 2}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      <FeedbackPanel att={att} />

      {answered && (
        <div className="mt-3 rounded-[20px] border border-[#00B8D4]/30 bg-[#00B8D4]/[0.06] p-4">
          <p className="font-display text-lg font-bold text-[#00E5FF]">How a robot plans it: {ALGO_NAME[algo]}</p>
          <p className="mt-1 text-[16px] text-[#EEF2F8]">{ALGO_BLURB[algo]}</p>
          {p.predictExplored && reveal === null && (
            <label className="mt-3 block">
              <span className="text-sm font-semibold text-[#A7B0C0]">
                First, predict: how many squares will it explore? <b className="font-display text-amber-300">{prediction ?? '—'}</b>
              </span>
              <input
                type="range"
                min={1}
                max={g.rows * g.cols * Math.max(1, g.checkpoints.length + 1)}
                value={prediction ?? Math.round((g.rows * g.cols) / 2)}
                onChange={(e) => setPrediction(Number(e.target.value))}
                className="h-11 w-full cursor-pointer rounded-xl accent-amber-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
              />
            </label>
          )}
          {reveal === null ? (
            <button type="button" className={`${btnGhost} mt-3`} onClick={startReveal} disabled={!!p.predictExplored && prediction === null}>
              Watch the algorithm
            </button>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Readout label="Squares explored" value={`${Math.floor(reveal)}`} tone="cyan" />
              <Readout label="Its route cost" value={revealDone ? fmt(best.cost) : '…'} tone="good" />
              <Readout label="Your route cost" value={fmt(cost)} tone={cost <= best.cost + 1e-6 ? 'good' : 'bad'} />
              {compare && revealDone && (
                <Readout
                  label={algo === 'astar' ? 'Dijkstra explores' : 'BFS route cost'}
                  value={algo === 'astar' ? `${compare.explored.length}` : fmt(compare.cost)}
                  unit={algo === 'astar' ? 'squares' : undefined}
                />
              )}
            </div>
          )}
          {revealDone && p.predictExplored && prediction !== null && (
            <p className="mt-2 text-[15px] text-[#EEF2F8]">
              You predicted {prediction}; it explored {best.explored.length}. {Math.abs(prediction - best.explored.length) <= best.explored.length * 0.2 ? 'Great intuition!' : 'Search effort is hard to guess — that is why engineers measure it.'}
            </p>
          )}
          {revealDone && algo === 'dijkstra' && compare && (
            <p className="mt-2 text-[15px] text-[#EEF2F8]">BFS ignores cost: its fewest-steps route would cost {fmt(compare.cost)} here.</p>
          )}
        </div>
      )}
    </TemplateCard>
  )
}
