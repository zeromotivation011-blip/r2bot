'use client'

// Zone 1 boss: "Fix Spark's Garden Robot"
// Block-code style. 5 colour-coded blocks (Forward, Left, Right, Sense, Wait).
// Drag blocks into a program, hit Run, robot walks the garden grid to a plant.
// Goal: reach the plant tile.

import { useEffect, useRef, useState } from 'react'
import { playSound, primeAudio, sparkSays } from '@/lib/kids-audio'

type Block = 'forward' | 'left' | 'right' | 'sense' | 'wait'

interface Cell {
  x: number
  y: number
}

const GRID = 5
const START: Cell = { x: 0, y: 4 }
const PLANT: Cell = { x: 4, y: 0 }
const ROCKS: Cell[] = [
  { x: 2, y: 2 },
  { x: 3, y: 3 },
]
const MAX_BLOCKS = 10

const BLOCK_INFO: Record<Block, { label: string; color: string; icon: string }> = {
  forward: { label: 'Forward', color: '#10b981', icon: '↑' },
  left:    { label: 'Left',    color: '#3b82f6', icon: '↶' },
  right:   { label: 'Right',   color: '#a855f7', icon: '↷' },
  sense:   { label: 'Sense',   color: '#fbbf24', icon: '👀' },
  wait:    { label: 'Wait',    color: '#94a3b8', icon: '⏸' },
}

export function GardenBotGame({ onWin, onFail, onSpark }: {
  onWin: (attemptsUsed: number) => void
  onFail: () => void
  onSpark?: (line: string) => void
}) {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [pos, setPos] = useState({ x: START.x, y: START.y, heading: 270 }) // 270 = up
  const [running, setRunning] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const cancelRef = useRef(false)

  useEffect(() => {
    sparkSays('My garden robot is broken! Build a plan to drive it to the plant!')
    onSpark?.('My garden robot is broken!')
  }, [onSpark])

  const reset = () => {
    cancelRef.current = true
    setPos({ x: START.x, y: START.y, heading: 270 })
  }

  const addBlock = (b: Block) => {
    if (running) return
    if (blocks.length >= MAX_BLOCKS) return
    primeAudio()
    playSound('click')
    setBlocks(prev => [...prev, b])
  }

  const removeAt = (i: number) => {
    if (running) return
    setBlocks(prev => prev.filter((_, idx) => idx !== i))
  }

  const clear = () => {
    setBlocks([])
    reset()
  }

  const dir = (heading: number): [number, number] => {
    const h = ((heading % 360) + 360) % 360
    if (h === 0)   return [1, 0]
    if (h === 90)  return [0, 1]
    if (h === 180) return [-1, 0]
    return [0, -1]
  }

  const run = async () => {
    if (running || blocks.length === 0) return
    setRunning(true)
    cancelRef.current = false
    let cur = { x: START.x, y: START.y, heading: 270 }
    setPos(cur)
    await sleep(280)

    for (const b of blocks) {
      if (cancelRef.current) break
      if (b === 'forward') {
        const [dx, dy] = dir(cur.heading)
        const nx = cur.x + dx, ny = cur.y + dy
        if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) {
          sparkSays('Oops — fell off the edge of the garden!')
          playSound('wrong')
          setRunning(false)
          setAttempts(a => a + 1)
          onFail()
          return
        }
        if (ROCKS.some(r => r.x === nx && r.y === ny)) {
          sparkSays('Bumped a rock!')
          playSound('wrong')
          setRunning(false)
          setAttempts(a => a + 1)
          onFail()
          return
        }
        cur = { ...cur, x: nx, y: ny }
      } else if (b === 'left')  cur = { ...cur, heading: cur.heading - 90 }
      else if (b === 'right') cur = { ...cur, heading: cur.heading + 90 }
      else if (b === 'sense') {
        // peek ahead
        const [dx, dy] = dir(cur.heading)
        const ahead = { x: cur.x + dx, y: cur.y + dy }
        const blocked =
          ahead.x < 0 || ahead.x >= GRID || ahead.y < 0 || ahead.y >= GRID ||
          ROCKS.some(r => r.x === ahead.x && r.y === ahead.y)
        sparkSays(blocked ? 'Sensing… something is there!' : 'Sensing… path is clear!')
      } else if (b === 'wait') {
        await sleep(360)
      }
      setPos(cur)
      await sleep(340)
    }
    setRunning(false)
    if (cur.x === PLANT.x && cur.y === PLANT.y) {
      sparkSays('Yes! The plant is watered!')
      playSound('zonecomplete')
      onWin(attempts + 1)
    } else {
      sparkSays('Almost! Try a different plan.')
      playSound('wrong')
      setAttempts(a => a + 1)
      onFail()
    }
  }

  return (
    <div className="gb">
      <div className="gb-grid-wrap">
        <div className="gb-grid">
          {Array.from({ length: GRID * GRID }).map((_, idx) => {
            const x = idx % GRID
            const y = Math.floor(idx / GRID)
            const isStart = x === START.x && y === START.y
            const isPlant = x === PLANT.x && y === PLANT.y
            const isRock = ROCKS.some(r => r.x === x && r.y === y)
            const isBot = x === pos.x && y === pos.y
            return (
              <div key={idx} className={`gb-cell ${isStart ? 'is-start' : ''} ${isPlant ? 'is-plant' : ''} ${isRock ? 'is-rock' : ''}`}>
                {isBot && (
                  <span className="gb-bot" style={{ transform: `rotate(${pos.heading + 90}deg)` }}>
                    🤖
                  </span>
                )}
                {!isBot && isPlant && <span className="gb-plant">🪴</span>}
                {isRock && !isBot && <span className="gb-rock">🪨</span>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="gb-palette">
        {(Object.keys(BLOCK_INFO) as Block[]).map(b => (
          <button
            key={b}
            type="button"
            disabled={running}
            onClick={() => addBlock(b)}
            className="gb-pal-btn"
            style={{ background: BLOCK_INFO[b].color }}
          >
            <span className="gb-pal-icon">{BLOCK_INFO[b].icon}</span>
            <span className="gb-pal-label">{BLOCK_INFO[b].label}</span>
          </button>
        ))}
      </div>

      <ol className="gb-program">
        {blocks.length === 0 ? (
          <li className="gb-empty">Pick blocks to build a plan →</li>
        ) : (
          blocks.map((b, i) => (
            <li key={i} onClick={() => removeAt(i)} style={{ background: BLOCK_INFO[b].color + '33', borderColor: BLOCK_INFO[b].color }}>
              {i + 1}. {BLOCK_INFO[b].icon} {BLOCK_INFO[b].label}
            </li>
          ))
        )}
      </ol>

      <div className="gb-actions">
        <button type="button" onClick={run} disabled={running || blocks.length === 0} className="gb-run">
          {running ? 'Running…' : '▶ Run'}
        </button>
        <button type="button" onClick={clear} disabled={running} className="gb-clear">Clear</button>
      </div>

      <p className="gb-attempts">Attempts: {attempts} / 3</p>

      <style jsx>{`
        .gb { display: flex; flex-direction: column; gap: 10px; }
        .gb-grid-wrap { display: flex; justify-content: center; }
        .gb-grid {
          display: grid; gap: 4px;
          grid-template-columns: repeat(${GRID}, 1fr);
          padding: 10px;
          background: linear-gradient(135deg, #14532d, #052e16);
          border-radius: 14px;
          border: 2px solid #14532d;
          width: 100%;
          max-width: 360px;
          aspect-ratio: 1;
        }
        .gb-cell {
          aspect-ratio: 1;
          background: linear-gradient(135deg, #166534, #14532d);
          border-radius: 8px;
          position: relative;
          display: grid; place-items: center;
          font-size: 24px;
        }
        .gb-cell.is-start { background: linear-gradient(135deg, #1d4ed8, #1e3a8a); }
        .gb-cell.is-plant { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .gb-cell.is-rock { background: linear-gradient(135deg, #57534e, #292524); }
        .gb-bot { transition: transform .25s; display: inline-block; }
        .gb-plant { animation: gb-bob 1.6s ease-in-out infinite; display: inline-block; }
        @keyframes gb-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }
        .gb-palette {
          display: grid; gap: 6px;
          grid-template-columns: repeat(5, 1fr);
        }
        .gb-pal-btn {
          min-height: 60px;
          color: #0f0a1e;
          border: none; border-radius: 12px;
          font-weight: 900; font-size: 12px;
          cursor: pointer;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 2px;
          padding: 8px;
        }
        .gb-pal-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .gb-pal-icon { font-size: 22px; }
        .gb-program {
          list-style: none; padding: 10px; margin: 0;
          background: #1a1040;
          border: 2px dashed #4c1d95;
          border-radius: 12px;
          min-height: 60px;
          display: flex; flex-wrap: wrap; gap: 6px;
        }
        .gb-program li {
          padding: 6px 10px;
          border: 2px solid;
          border-radius: 8px;
          color: #fde68a;
          font-weight: 800;
          font-size: 12px;
          cursor: pointer;
        }
        .gb-empty { color: #6b21a8; font-style: italic; }
        .gb-actions { display: flex; gap: 8px; }
        .gb-run {
          flex: 1; min-height: 52px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none; border-radius: 14px;
          font-size: 17px; font-weight: 900;
          cursor: pointer;
        }
        .gb-run:disabled { opacity: 0.4; cursor: not-allowed; }
        .gb-clear {
          min-height: 52px; padding: 0 18px;
          background: #1a1040; color: #fde68a;
          border: 2px solid #4c1d95;
          border-radius: 14px; font-weight: 800; cursor: pointer;
        }
        .gb-attempts { text-align: center; color: #c4b5fd; font-weight: 700; font-size: 13px; }
      `}</style>
    </div>
  )
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}
