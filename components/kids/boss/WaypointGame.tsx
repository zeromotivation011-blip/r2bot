'use client'

// Zone 3 boss: "Underwater Navigator" / waypoint sequencing.
// 6x6 grid. Submarine starts top-left. 3 waypoints to visit IN ORDER.
// Child writes a sequence of moves (up to MAX_MOVES). Hit Go.

import { useEffect, useRef, useState } from 'react'
import { playSound, primeAudio, sparkSays } from '@/lib/kids-audio'

const GRID = 6
const START = { x: 0, y: 0 }
const WAYPOINTS = [
  { x: 4, y: 1 },
  { x: 2, y: 4 },
  { x: 5, y: 5 },
] as const
const MAX_MOVES = 16

type Move = 'up' | 'down' | 'left' | 'right'

export function WaypointGame({ onWin, onFail }: {
  onWin: (attempts: number) => void
  onFail: () => void
}) {
  const [moves, setMoves] = useState<Move[]>([])
  const [pos, setPos] = useState(START)
  const [visited, setVisited] = useState<number[]>([]) // waypoint indices in order
  const [running, setRunning] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const cancelRef = useRef(false)

  useEffect(() => {
    sparkSays('Three waypoints. Visit them in order. You have ' + MAX_MOVES + ' moves.')
  }, [])

  const addMove = (m: Move) => {
    if (running) return
    if (moves.length >= MAX_MOVES) return
    primeAudio()
    playSound('click')
    setMoves(prev => [...prev, m])
  }

  const reset = () => {
    cancelRef.current = true
    setPos(START)
    setVisited([])
  }
  const clearMoves = () => {
    setMoves([])
    reset()
  }
  const undo = () => setMoves(m => m.slice(0, -1))

  const run = async () => {
    if (running || moves.length === 0) return
    setRunning(true)
    cancelRef.current = false
    let cur = { ...START }
    setPos(cur)
    setVisited([])
    let nextWaypoint = 0
    await sleep(280)

    for (const m of moves) {
      if (cancelRef.current) break
      let nx = cur.x, ny = cur.y
      if (m === 'up') ny--
      if (m === 'down') ny++
      if (m === 'left') nx--
      if (m === 'right') nx++
      if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) {
        playSound('wrong')
        sparkSays('Oops — out of the ocean!')
        setRunning(false)
        setAttempts(a => a + 1)
        onFail()
        return
      }
      cur = { x: nx, y: ny }
      setPos(cur)
      // Did we land on the next waypoint?
      const w = WAYPOINTS[nextWaypoint]
      if (w && cur.x === w.x && cur.y === w.y) {
        setVisited(v => [...v, nextWaypoint])
        playSound('star')
        nextWaypoint++
      }
      await sleep(280)
    }
    setRunning(false)
    if (nextWaypoint === WAYPOINTS.length) {
      playSound('zonecomplete')
      sparkSays('All waypoints visited!')
      onWin(attempts + 1)
    } else {
      playSound('wrong')
      sparkSays(`Visited ${nextWaypoint} waypoint${nextWaypoint === 1 ? '' : 's'}. Try again!`)
      setAttempts(a => a + 1)
      onFail()
    }
  }

  return (
    <div className="wg">
      <div className="wg-grid-wrap">
        <div className="wg-grid" style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}>
          {Array.from({ length: GRID * GRID }).map((_, idx) => {
            const x = idx % GRID
            const y = Math.floor(idx / GRID)
            const waypointIdx = WAYPOINTS.findIndex(w => w.x === x && w.y === y)
            const hasVisited = waypointIdx >= 0 && visited.includes(waypointIdx)
            const isPos = pos.x === x && pos.y === y
            return (
              <div
                key={idx}
                className={`wg-cell ${waypointIdx >= 0 ? 'is-wp' : ''} ${hasVisited ? 'is-visited' : ''}`}
              >
                {isPos && <span className="wg-sub">🚤</span>}
                {!isPos && waypointIdx >= 0 && (
                  <span className="wg-wp">
                    {hasVisited ? '✓' : waypointIdx + 1}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="wg-arrows">
        <div className="wg-arrow-row">
          <ArrowBtn label="↑" onClick={() => addMove('up')} disabled={running} />
        </div>
        <div className="wg-arrow-row">
          <ArrowBtn label="←" onClick={() => addMove('left')} disabled={running} />
          <ArrowBtn label="↓" onClick={() => addMove('down')} disabled={running} />
          <ArrowBtn label="→" onClick={() => addMove('right')} disabled={running} />
        </div>
      </div>

      <div className="wg-strip">
        {moves.length === 0 ? (
          <span className="wg-empty">No moves yet</span>
        ) : (
          moves.map((m, i) => (
            <span key={i} className="wg-chip">
              {m === 'up' ? '↑' : m === 'down' ? '↓' : m === 'left' ? '←' : '→'}
            </span>
          ))
        )}
        <span className="wg-count">{moves.length} / {MAX_MOVES}</span>
      </div>

      <div className="wg-actions">
        <button type="button" onClick={run} disabled={running || moves.length === 0} className="wg-go">
          {running ? 'Running…' : '▶ Go'}
        </button>
        <button type="button" onClick={undo} disabled={running || moves.length === 0} className="wg-secondary">⌫ Undo</button>
        <button type="button" onClick={clearMoves} disabled={running} className="wg-secondary">Clear</button>
      </div>

      <p className="wg-attempts">Attempts: {attempts}</p>

      <style jsx>{`
        .wg { display: flex; flex-direction: column; gap: 10px; }
        .wg-grid-wrap { display: flex; justify-content: center; }
        .wg-grid {
          display: grid; gap: 4px;
          padding: 10px;
          background: linear-gradient(180deg, #0c4a6e, #082f49);
          border-radius: 14px;
          border: 2px solid #0e7490;
          width: 100%;
          max-width: 360px;
          aspect-ratio: 1;
        }
        .wg-cell {
          aspect-ratio: 1;
          background: linear-gradient(180deg, #075985, #0c4a6e);
          border-radius: 6px;
          position: relative;
          display: grid; place-items: center;
          font-size: 20px;
        }
        .wg-cell.is-wp { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .wg-cell.is-visited { background: linear-gradient(135deg, #10b981, #047857); }
        .wg-sub { font-size: 28px; }
        .wg-wp { font-weight: 900; color: #fff; font-size: 18px; }
        .wg-arrows {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
        }
        .wg-arrow-row { display: flex; gap: 6px; }
        .wg-strip {
          padding: 8px 12px;
          background: rgba(15,10,30,0.6);
          border: 1px dashed #4c1d95;
          border-radius: 12px;
          display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
          min-height: 40px;
        }
        .wg-chip {
          background: rgba(0,229,255,0.2);
          border: 1px solid #00E5FF;
          color: #fff;
          padding: 4px 8px; border-radius: 6px;
          font-weight: 900;
        }
        .wg-empty { color: #94a3b8; font-weight: 700; }
        .wg-count {
          margin-left: auto; font-weight: 900; color: #fde047;
        }
        .wg-actions { display: flex; gap: 8px; }
        .wg-go {
          flex: 1; min-height: 52px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none; border-radius: 14px;
          font-size: 17px; font-weight: 900;
          cursor: pointer;
        }
        .wg-go:disabled { opacity: 0.4; cursor: not-allowed; }
        .wg-secondary {
          min-height: 52px; padding: 0 16px;
          background: #1a1040; color: #fde68a;
          border: 2px solid #4c1d95;
          border-radius: 14px; font-weight: 800; cursor: pointer;
        }
        .wg-attempts { text-align: center; color: #c4b5fd; font-weight: 700; font-size: 13px; }
      `}</style>
    </div>
  )
}

function ArrowBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="wg-arrow-btn"
    >
      {label}
      <style jsx>{`
        .wg-arrow-btn {
          width: 60px; height: 60px;
          background: linear-gradient(135deg, #2a1860, #1a1040);
          color: #fde047;
          font-size: 26px; font-weight: 900;
          border: 2px solid #6d28d9;
          border-radius: 14px;
          cursor: pointer;
        }
        .wg-arrow-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>
    </button>
  )
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}
