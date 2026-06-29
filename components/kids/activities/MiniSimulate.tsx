'use client'

// Grid simulation. Pick action blocks → run → robot walks tile by tile.
// Visual: grass tiles, robot sprite, house goal. Bumps walls instead of teleporting.

import { useEffect, useRef, useState } from 'react'
import type { MiniSimulateContent } from '@/lib/kids-world-data'
import { playSound, primeAudio, sparkSays } from '@/lib/kids-audio'

type SimBlock = 'forward' | 'turn-left' | 'turn-right'
type Pos = { x: number; y: number; heading: number }

const HEADING_BY_NAME: Record<MiniSimulateContent['startHeading'], number> = {
  right: 0, down: 90, left: 180, up: 270,
}

export function MiniSimulate({
  content,
  onWin,
  onFail,
  showHint = false,
}: {
  content: MiniSimulateContent
  onWin: () => void
  onFail: () => void
  showHint?: boolean
}) {
  const { gridSize, start, goal, startHeading, hint, obstacles = [] } = content
  const obstacleSet = new Set(obstacles.map(([x, y]) => `${x},${y}`))

  const initialPos: Pos = {
    x: start[0], y: start[1], heading: HEADING_BY_NAME[startHeading],
  }
  const [blocks, setBlocks] = useState<SimBlock[]>([])
  const [pos, setPos] = useState<Pos>(initialPos)
  const [running, setRunning] = useState(false)
  const cancelRef = useRef(false)

  const reset = () => {
    cancelRef.current = true
    setPos(initialPos)
  }

  useEffect(() => {
    setPos(initialPos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start[0], start[1], startHeading])

  const dir = (heading: number): [number, number] => {
    const h = ((heading % 360) + 360) % 360
    if (h === 0)   return [1, 0]
    if (h === 90)  return [0, 1]
    if (h === 180) return [-1, 0]
    return [0, -1]
  }

  const run = async () => {
    if (running) return
    if (blocks.length === 0) return
    primeAudio()
    setRunning(true)
    cancelRef.current = false
    let cur: Pos = { ...initialPos }
    setPos(cur)
    await new Promise(r => setTimeout(r, 200))

    for (const b of blocks) {
      if (cancelRef.current) break
      if (b === 'forward') {
        const [dx, dy] = dir(cur.heading)
        const nx = cur.x + dx
        const ny = cur.y + dy
        const blocked =
          nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize ||
          obstacleSet.has(`${nx},${ny}`)
        if (blocked) {
          playSound('wrong')
          sparkSays('Oops — there\'s a wall there!')
          setRunning(false)
          onFail()
          return
        }
        cur = { ...cur, x: nx, y: ny }
      } else if (b === 'turn-left') {
        cur = { ...cur, heading: cur.heading - 90 }
      } else {
        cur = { ...cur, heading: cur.heading + 90 }
      }
      setPos(cur)
      await new Promise(r => setTimeout(r, 360))
    }

    setRunning(false)
    if (cur.x === goal[0] && cur.y === goal[1]) {
      playSound('zonecomplete')
      onWin()
    } else {
      playSound('wrong')
      onFail()
    }
  }

  return (
    <div className="ms">
      <div className="ms-grid-wrap">
        <div className="ms-grid" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
          {Array.from({ length: gridSize * gridSize }).map((_, idx) => {
            const x = idx % gridSize
            const y = Math.floor(idx / gridSize)
            const isStart = x === start[0] && y === start[1]
            const isGoal = x === goal[0] && y === goal[1]
            const isObstacle = obstacleSet.has(`${x},${y}`)
            const isBot = x === pos.x && y === pos.y
            return (
              <div key={idx} className={`ms-cell ${isStart ? 'is-start' : ''} ${isGoal ? 'is-goal' : ''} ${isObstacle ? 'is-obstacle' : ''}`}>
                {isBot && (
                  <span className="ms-bot" style={{ transform: `rotate(${pos.heading + 90}deg)` }}>
                    🤖
                  </span>
                )}
                {!isBot && isGoal && <span className="ms-goal">🏠</span>}
                {isObstacle && <span className="ms-obstacle">🪨</span>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="ms-palette">
        <PalBtn onClick={() => setBlocks(b => [...b, 'forward'])} disabled={running} label="↑ Forward" />
        <PalBtn onClick={() => setBlocks(b => [...b, 'turn-left'])} disabled={running} label="↶ Left" />
        <PalBtn onClick={() => setBlocks(b => [...b, 'turn-right'])} disabled={running} label="↷ Right" />
        <PalBtn onClick={() => setBlocks(b => b.slice(0, -1))} disabled={running} label="⌫ Undo" muted />
        <PalBtn onClick={() => { setBlocks([]); reset() }} disabled={running} label="Clear" muted />
      </div>

      <ol className="ms-program">
        {blocks.length === 0 ? (
          <li className="ms-empty">Pick blocks to build a plan →</li>
        ) : (
          blocks.map((b, i) => (
            <li key={i} className={`ms-block ms-${b}`}>
              {i + 1}. {b === 'forward' ? '↑ forward' : b === 'turn-left' ? '↶ left' : '↷ right'}
            </li>
          ))
        )}
      </ol>

      <button
        type="button"
        className="ms-run"
        onClick={run}
        disabled={running || blocks.length === 0}
      >
        {running ? '⏳ Running…' : '▶ Run my plan'}
      </button>

      {showHint && hint && <p className="ms-hint">💡 {hint}</p>}

      <style jsx>{`
        .ms { display: flex; flex-direction: column; gap: 12px; }
        .ms-grid-wrap { display: flex; justify-content: center; }
        .ms-grid {
          display: grid; gap: 6px;
          padding: 10px;
          background: linear-gradient(135deg, #14532d, #052e16);
          border-radius: 14px;
          border: 2px solid #14532d;
          width: 100%;
          max-width: 360px;
          aspect-ratio: 1;
        }
        .ms-cell {
          aspect-ratio: 1;
          background: linear-gradient(135deg, #166534, #14532d);
          border-radius: 8px;
          position: relative;
          display: grid; place-items: center;
          font-size: 22px;
        }
        .ms-cell.is-start { background: linear-gradient(135deg, #1d4ed8, #1e3a8a); }
        .ms-cell.is-goal { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .ms-cell.is-obstacle { background: linear-gradient(135deg, #57534e, #292524); }
        .ms-bot { transition: transform .25s; display: inline-block; }
        .ms-goal { animation: ms-bob 1.6s ease-in-out infinite; display: inline-block; }
        @keyframes ms-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }
        .ms-palette {
          display: grid; gap: 6px;
          grid-template-columns: repeat(2, 1fr);
        }
        @media (min-width: 480px) {
          .ms-palette { grid-template-columns: repeat(5, 1fr); }
        }
        .ms-program {
          list-style: none; padding: 10px; margin: 0;
          background: #1a1040;
          border: 2px dashed #4c1d95;
          border-radius: 12px;
          min-height: 72px;
          font-family: monospace; font-size: 13px;
          color: #fde68a;
          display: flex; flex-direction: column; gap: 3px;
        }
        .ms-empty { color: #6b21a8; font-style: italic; }
        .ms-forward { color: #fde047; }
        .ms-turn-left, .ms-turn-right { color: #c4b5fd; }
        .ms-run {
          min-height: 56px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none; border-radius: 14px;
          font-size: 18px; font-weight: 900;
          cursor: pointer;
        }
        .ms-run:disabled { opacity: 0.4; cursor: not-allowed; }
        .ms-hint { color: #fcd34d; font-size: 13px; text-align: center; font-weight: 700; }
      `}</style>
    </div>
  )
}

function PalBtn({ onClick, disabled, label, muted = false }: {
  onClick: () => void; disabled?: boolean; label: string; muted?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`ms-palbtn ${muted ? 'is-muted' : ''}`}
    >
      {label}
      <style jsx>{`
        .ms-palbtn {
          min-height: 48px;
          padding: 0 10px;
          font-size: 13px; font-weight: 800;
          background: linear-gradient(135deg, #fde047, #fbbf24);
          color: #1a1040;
          border: 2px solid #f59e0b;
          border-radius: 10px;
          cursor: pointer;
        }
        .ms-palbtn:active { transform: scale(.95); }
        .ms-palbtn:disabled { opacity: 0.4; cursor: not-allowed; }
        .ms-palbtn.is-muted {
          background: #1a1040;
          color: #fde68a;
          border-color: #4c1d95;
        }
      `}</style>
    </button>
  )
}
