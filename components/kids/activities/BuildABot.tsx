'use client'

// Drag-to-place robot parts. No right/wrong; every placement is celebrated.

import { useState } from 'react'
import { playSound, primeAudio, sparkSays } from '@/lib/kids-audio'

interface Part {
  id: string
  label: string
  emoji: string
  job: string
  slot: 'head' | 'eyes' | 'mouth' | 'arms' | 'chest' | 'feet'
}

const PARTS: Part[] = [
  { id: 'eyes',    label: 'Camera eyes',     emoji: '👀', job: 'so the robot can SEE!', slot: 'eyes'  },
  { id: 'mouth',   label: 'Speaker mouth',   emoji: '🔊', job: 'so the robot can TALK!', slot: 'mouth' },
  { id: 'antenna', label: 'Antenna',         emoji: '📡', job: 'so the robot can HEAR signals!', slot: 'head' },
  { id: 'arms',    label: 'Bouncy arms',     emoji: '💪', job: 'so the robot can WAVE!', slot: 'arms'  },
  { id: 'chest',   label: 'Battery chest',   emoji: '🔋', job: 'so the robot has POWER!', slot: 'chest' },
  { id: 'feet',    label: 'Wheel feet',      emoji: '⚙️', job: 'so the robot can ROLL!', slot: 'feet'  },
]

export function BuildABot({ onComplete }: { onComplete?: () => void }) {
  const [placed, setPlaced] = useState<Record<string, boolean>>({})
  const allDone = PARTS.every(p => placed[p.id])

  const place = (p: Part) => {
    if (placed[p.id]) return
    primeAudio()
    playSound('correct')
    setPlaced({ ...placed, [p.id]: true })
    sparkSays(`I added the ${p.label} ${p.job}`)
    if (Object.keys({ ...placed, [p.id]: true }).length === PARTS.length) {
      setTimeout(() => onComplete?.(), 800)
    }
  }

  return (
    <div className="bb">
      <div className="bb-canvas">
        <svg viewBox="0 0 220 280" width="100%" height="280" aria-label="Build a robot">
          {/* Body outline (ghost) */}
          <rect x="58" y="60" width="104" height="86" rx="14" fill="none" stroke="#4c1d95" strokeWidth="3" strokeDasharray="5 5" />
          <rect x="68" y="156" width="84" height="60" rx="10" fill="none" stroke="#4c1d95" strokeWidth="3" strokeDasharray="5 5" />

          {/* Head */}
          {placed.head ? null : <text x="110" y="106" fontSize="12" textAnchor="middle" fill="#4c1d95">head</text>}
          {placed.antenna && (
            <g>
              <line x1="110" y1="36" x2="110" y2="58" stroke="#fbbf24" strokeWidth="3" />
              <circle cx="110" cy="34" r="6" fill="#fde047" />
            </g>
          )}
          <rect x="58" y="60" width="104" height="86" rx="14" fill={placed.head || placed.antenna || placed.eyes || placed.mouth ? '#3b82f6' : 'none'} />
          <rect x="68" y="76" width="84" height="50" rx="6" fill={placed.head || placed.antenna || placed.eyes || placed.mouth ? '#0f0a1e' : 'none'} />

          {placed.eyes && (
            <g>
              <circle cx="84" cy="100" r="9" fill="#fde047" />
              <circle cx="136" cy="100" r="9" fill="#fde047" />
              <circle cx="88" cy="96" r="3" fill="#0f0a1e" />
              <circle cx="140" cy="96" r="3" fill="#0f0a1e" />
            </g>
          )}
          {placed.mouth && (
            <path d="M84 124 Q110 138 136 124" stroke="#fde047" strokeWidth="3" fill="none" strokeLinecap="round" />
          )}

          {/* Body */}
          {placed.chest && (
            <g>
              <rect x="68" y="156" width="84" height="60" rx="10" fill="#f97316" />
              <rect x="86" y="170" width="48" height="28" rx="4" fill="#0f0a1e" />
              <circle cx="98" cy="184" r="3" fill="#fde047" />
              <circle cx="110" cy="184" r="3" fill="#10b981" />
              <circle cx="122" cy="184" r="3" fill="#3b82f6" />
            </g>
          )}
          {!placed.chest && <text x="110" y="190" fontSize="12" textAnchor="middle" fill="#4c1d95">chest</text>}

          {/* Arms */}
          {placed.arms ? (
            <g>
              <rect x="34" y="162" width="22" height="40" rx="10" fill="#3b82f6" />
              <rect x="164" y="162" width="22" height="40" rx="10" fill="#3b82f6" />
            </g>
          ) : (
            <>
              <text x="46" y="186" fontSize="11" textAnchor="middle" fill="#4c1d95">arms</text>
              <text x="174" y="186" fontSize="11" textAnchor="middle" fill="#4c1d95">arms</text>
            </>
          )}

          {/* Feet */}
          {placed.feet ? (
            <g>
              <circle cx="86" cy="240" r="18" fill="#1a1040" stroke="#3b82f6" strokeWidth="2" />
              <circle cx="134" cy="240" r="18" fill="#1a1040" stroke="#3b82f6" strokeWidth="2" />
              <circle cx="86" cy="240" r="6" fill="#0f0a1e" />
              <circle cx="134" cy="240" r="6" fill="#0f0a1e" />
            </g>
          ) : (
            <text x="110" y="244" fontSize="12" textAnchor="middle" fill="#4c1d95">feet</text>
          )}

          {/* Alive sparkle */}
          {allDone && (
            <g>
              {Array.from({ length: 8 }).map((_, i) => (
                <circle
                  key={i}
                  cx={50 + Math.cos((i / 8) * Math.PI * 2) * 80 + 60}
                  cy={150 + Math.sin((i / 8) * Math.PI * 2) * 80}
                  r="3"
                  fill="#fde047"
                >
                  <animate attributeName="opacity" values="0.2;1;0.2" dur="1.4s" repeatCount="indefinite" begin={`${i * 0.18}s`} />
                </circle>
              ))}
            </g>
          )}
        </svg>
      </div>

      <p className="bb-instructions">
        {allDone ? '🎉 Your robot is ALIVE!' : 'Pick a part to add it to your robot!'}
      </p>

      <div className="bb-parts">
        {PARTS.map(p => {
          const done = !!placed[p.id]
          return (
            <button
              key={p.id}
              type="button"
              disabled={done}
              onClick={() => place(p)}
              className={`bb-part ${done ? 'is-done' : ''}`}
              aria-pressed={done}
            >
              <span className="bb-emoji">{p.emoji}</span>
              <span className="bb-label">{p.label}</span>
            </button>
          )
        })}
      </div>

      <style jsx>{`
        .bb { display: flex; flex-direction: column; gap: 12px; }
        .bb-canvas {
          background: linear-gradient(180deg, rgba(26,16,64,0.6), rgba(15,10,30,0.6));
          border: 2px solid #4c1d95;
          border-radius: 18px;
          padding: 14px;
        }
        .bb-instructions {
          text-align: center; font-weight: 800; color: #fde047;
          font-size: 16px;
        }
        .bb-parts {
          display: grid; gap: 8px;
          grid-template-columns: repeat(2, 1fr);
        }
        @media (min-width: 540px) {
          .bb-parts { grid-template-columns: repeat(3, 1fr); }
        }
        .bb-part {
          min-height: 64px;
          background: linear-gradient(135deg, #fde047, #fbbf24);
          color: #1a1040;
          border: 2px solid #f59e0b;
          border-radius: 14px;
          padding: 8px;
          font-weight: 800;
          cursor: pointer;
          display: flex; align-items: center; gap: 10px;
          text-align: left;
        }
        .bb-part:hover:not(:disabled) { transform: translateY(-2px); }
        .bb-part.is-done {
          background: rgba(16,185,129,0.18);
          border-color: #10b981;
          color: #6ee7b7;
          cursor: default;
        }
        .bb-emoji { font-size: 26px; }
        .bb-label { font-size: 13px; }
      `}</style>
    </div>
  )
}
