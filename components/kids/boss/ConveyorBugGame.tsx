'use client'

// Zone 2-ish boss: "Factory Line Bug"
// A conveyor belt animates items left to right. Some are "bugs" (wrong shape/colour).
// Tap them before they fall off the end. 30-second timer. 3 bugs needed.

import { useEffect, useRef, useState } from 'react'
import { playSound, primeAudio, sparkSays } from '@/lib/kids-audio'

interface Item {
  id: number
  spawnedAt: number
  shape: 'circle' | 'square' | 'triangle'
  color: string
  isBug: boolean
  tapped: boolean
}

const GOOD_SHAPE: Item['shape'] = 'circle'
const GOOD_COLOR = '#3b82f6'
const SPAWN_RATE_MS = 850
const TRAVEL_MS = 4800
const GAME_MS = 32000
const BUGS_NEEDED = 3

export function ConveyorBugGame({ onWin, onFail }: {
  onWin: (attempts: number) => void
  onFail: () => void
}) {
  const [items, setItems] = useState<Item[]>([])
  const [bugsCaught, setBugsCaught] = useState(0)
  const [missed, setMissed] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_MS / 1000)
  const [over, setOver] = useState(false)
  const itemId = useRef(0)
  const spawnTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAt = useRef(Date.now())

  useEffect(() => {
    sparkSays('Three faulty items are on the line. Tap each one before it falls off!')
  }, [])

  useEffect(() => {
    spawnTimer.current = setInterval(() => {
      const id = ++itemId.current
      const isBug = Math.random() < 0.35
      const shape: Item['shape'] = isBug
        ? (Math.random() < 0.5 ? 'square' : 'triangle')
        : GOOD_SHAPE
      const color = isBug
        ? (Math.random() < 0.5 ? '#ef4444' : '#fbbf24')
        : GOOD_COLOR
      setItems(prev => [
        ...prev,
        { id, spawnedAt: Date.now(), shape, color, isBug, tapped: false },
      ])
    }, SPAWN_RATE_MS)

    tickTimer.current = setInterval(() => {
      const elapsed = Date.now() - startedAt.current
      const left = Math.max(0, GAME_MS - elapsed) / 1000
      setTimeLeft(Math.ceil(left))
      // Remove items that fell off
      setItems(prev => {
        const surviving: Item[] = []
        let newMissed = 0
        prev.forEach(it => {
          if (Date.now() - it.spawnedAt > TRAVEL_MS) {
            if (it.isBug && !it.tapped) newMissed++
            return
          }
          surviving.push(it)
        })
        if (newMissed > 0) setMissed(m => m + newMissed)
        return surviving
      })
      if (elapsed >= GAME_MS) {
        setOver(true)
      }
    }, 200)

    return () => {
      if (spawnTimer.current) clearInterval(spawnTimer.current)
      if (tickTimer.current) clearInterval(tickTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!over) return
    if (spawnTimer.current) clearInterval(spawnTimer.current)
    if (tickTimer.current) clearInterval(tickTimer.current)
    if (bugsCaught >= BUGS_NEEDED) {
      playSound('zonecomplete')
      sparkSays('You caught them all!')
      onWin(1)
    } else {
      playSound('wrong')
      sparkSays(`You caught ${bugsCaught}. Let's try again!`)
      onFail()
    }
  }, [over, bugsCaught, onWin, onFail])

  const tap = (item: Item) => {
    if (item.tapped || over) return
    primeAudio()
    setItems(prev => prev.map(it => (it.id === item.id ? { ...it, tapped: true } : it)))
    if (item.isBug) {
      playSound('correct')
      setBugsCaught(b => b + 1)
    } else {
      playSound('wrong')
      sparkSays('That one\'s fine — only tap the bad shapes!')
      setMissed(m => m + 1)
    }
  }

  return (
    <div className="cb">
      <div className="cb-stats">
        <div className="cb-stat" aria-label={`Bugs caught: ${bugsCaught}`}>
          🐞 {bugsCaught} / {BUGS_NEEDED}
        </div>
        <div className="cb-stat" aria-label={`Time left: ${timeLeft} seconds`}>
          ⏱ {timeLeft}s
        </div>
        <div className="cb-stat" aria-label={`Missed: ${missed}`}>
          ❌ {missed}
        </div>
      </div>

      <div className="cb-belt">
        <div className="cb-belt-track" aria-hidden>
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} className="cb-belt-line" style={{ left: `${(i / 14) * 100}%` }} />
          ))}
        </div>
        {items.map(it => {
          const elapsed = Date.now() - it.spawnedAt
          const pct = Math.min(100, (elapsed / TRAVEL_MS) * 100)
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => tap(it)}
              disabled={it.tapped}
              className={`cb-item ${it.tapped ? 'is-tapped' : ''}`}
              style={{ left: `${pct}%`, background: it.color }}
              aria-label={`${it.isBug ? 'Faulty' : 'Good'} ${it.shape}`}
            >
              <ShapeMark shape={it.shape} />
            </button>
          )
        })}
      </div>

      <p className="cb-rule">
        ✅ Good = blue circle. ❌ Anything else is a bug. Tap fast!
      </p>

      <style jsx>{`
        .cb { display: flex; flex-direction: column; gap: 10px; }
        .cb-stats {
          display: flex; gap: 8px; justify-content: center;
        }
        .cb-stat {
          background: #1a1040;
          color: #fde68a;
          padding: 8px 14px;
          border-radius: 999px;
          font-weight: 900;
          border: 2px solid #4c1d95;
        }
        .cb-belt {
          position: relative;
          height: 140px;
          background: linear-gradient(180deg, #1f2937, #0f172a);
          border-radius: 14px;
          border: 2px solid #475569;
          overflow: hidden;
        }
        .cb-belt-track { position: absolute; inset: 0; }
        .cb-belt-line {
          position: absolute; top: 50%; transform: translateY(-50%);
          width: 4px; height: 70%;
          background: rgba(148,163,184,0.25);
          border-radius: 2px;
          animation: cb-slide 1.2s linear infinite;
        }
        @keyframes cb-slide {
          0%   { transform: translate(0, -50%); opacity: 0.5; }
          100% { transform: translate(-30px, -50%); opacity: 0.5; }
        }
        .cb-item {
          position: absolute; top: 50%;
          width: 56px; height: 56px;
          transform: translate(-50%, -50%);
          border-radius: 12px;
          border: 3px solid #ffffff44;
          cursor: pointer;
          padding: 0;
          transition: left .2s linear, opacity .3s, transform .15s;
          display: grid; place-items: center;
        }
        .cb-item:hover { transform: translate(-50%, -50%) scale(1.1); }
        .cb-item.is-tapped { opacity: 0.25; transform: translate(-50%, -50%) scale(0.7); }
        .cb-rule {
          text-align: center;
          color: #fde047; font-weight: 700; font-size: 13px;
        }
      `}</style>
    </div>
  )
}

function ShapeMark({ shape }: { shape: Item['shape'] }) {
  if (shape === 'circle') {
    return <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#fff' }} />
  }
  if (shape === 'square') {
    return <span style={{ width: 28, height: 28, background: '#fff' }} />
  }
  return (
    <span
      style={{
        width: 0,
        height: 0,
        borderLeft: '14px solid transparent',
        borderRight: '14px solid transparent',
        borderBottom: '24px solid #fff',
      }}
    />
  )
}
