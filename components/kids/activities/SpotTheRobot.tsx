'use client'

// Tap to find the robots hiding in a scene. Found ones glow.
// Hint appears (subtle sparkle near a missing robot) when showHint is true.

import { useEffect, useMemo, useState } from 'react'
import type { SpotTheRobotContent } from '@/lib/kids-world-data'
import { playSound, primeAudio, sparkSays } from '@/lib/kids-audio'

export function SpotTheRobot({
  content,
  onWin,
  onFail,
  showHint = false,
}: {
  content: SpotTheRobotContent
  onWin: () => void
  onFail: () => void
  showHint?: boolean
}) {
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const target = useMemo(() => new Set(content.robots), [content.robots])

  const handle = (i: number) => {
    if (picked.has(i)) return
    primeAudio()
    const next = new Set(picked)
    next.add(i)
    setPicked(next)
    if (!target.has(i)) {
      playSound('wrong')
      onFail()
      return
    }
    playSound('correct')
    const got = [...next].filter(x => target.has(x)).length
    if (got === content.robots.length) {
      sparkSays('You found them all!')
      setTimeout(onWin, 400)
    } else {
      sparkSays(`Great! ${content.robots.length - got} more to find.`)
    }
  }

  // pick a hint index — first unfound robot
  const [hintIdx, setHintIdx] = useState<number | null>(null)
  useEffect(() => {
    if (!showHint) {
      setHintIdx(null)
      return
    }
    const remaining = content.robots.find(i => !picked.has(i))
    setHintIdx(remaining ?? null)
  }, [showHint, picked, content.robots])

  return (
    <div className="str">
      {content.scene && <p className="str-scene">{content.scene}</p>}
      <div className="str-grid">
        {content.items.map((item, i) => {
          const isPicked = picked.has(i)
          const isRight = isPicked && target.has(i)
          const isWrong = isPicked && !target.has(i)
          const isHint  = hintIdx === i
          return (
            <button
              key={i}
              type="button"
              onClick={() => handle(i)}
              className={`str-tile ${isRight ? 'is-right' : ''} ${isWrong ? 'is-wrong' : ''} ${isHint ? 'is-hint' : ''}`}
              aria-pressed={isPicked}
            >
              <span className="str-tile-label">{item}</span>
              {isRight && <span className="str-tile-check" aria-hidden>✓</span>}
              {isHint && <span className="str-tile-sparkle" aria-hidden>✨</span>}
            </button>
          )
        })}
      </div>
      <style jsx>{`
        .str { display: flex; flex-direction: column; gap: 12px; }
        .str-scene {
          background: rgba(124,58,237,0.18);
          border: 2px solid #7c3aed;
          color: #fde68a;
          padding: 10px 14px;
          border-radius: 12px;
          font-weight: 800;
          text-align: center;
        }
        .str-grid {
          display: grid; gap: 10px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        @media (min-width: 480px) {
          .str-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        .str-tile {
          position: relative;
          min-height: 86px;
          padding: 12px 10px;
          background: #1a1040;
          border: 3px solid #4c1d95;
          border-radius: 18px;
          color: #fde68a;
          font-weight: 800;
          font-size: 16px;
          cursor: pointer;
          transition: transform .15s, border-color .15s;
        }
        .str-tile:hover { transform: scale(1.04); border-color: #fbbf24; }
        .str-tile.is-right {
          border-color: #10b981;
          background: rgba(16,185,129,0.22);
          box-shadow: 0 0 22px rgba(16,185,129,0.45);
        }
        .str-tile.is-wrong {
          border-color: #f97316;
          background: rgba(249,115,22,0.18);
          animation: str-shake .45s ease-in-out;
        }
        .str-tile.is-hint {
          animation: str-hint 1.4s ease-in-out infinite;
        }
        @keyframes str-shake {
          0%,100% { transform: translateX(0); }
          25%     { transform: translateX(-6px); }
          75%     { transform: translateX(6px); }
        }
        @keyframes str-hint {
          0%, 100% { box-shadow: 0 0 0 0 rgba(253,224,71,0.55); }
          50%      { box-shadow: 0 0 0 12px rgba(253,224,71,0); }
        }
        .str-tile-label { display: block; }
        .str-tile-check {
          position: absolute; top: 6px; right: 8px;
          font-weight: 900; color: #10b981;
        }
        .str-tile-sparkle {
          position: absolute; top: 4px; right: 4px;
          font-size: 18px;
          animation: str-tw 1.2s ease-in-out infinite;
        }
        @keyframes str-tw {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50%      { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}
