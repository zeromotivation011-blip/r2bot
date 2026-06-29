'use client'

// Illustrated flip cards. Tap each one to reveal a hidden fact.
// All cards must be flipped to win — no wrong state.

import { useState } from 'react'
import type { TapToRevealContent } from '@/lib/kids-world-data'
import { playSound, primeAudio, sparkSays } from '@/lib/kids-audio'

export function TapToReveal({
  content,
  onWin,
}: {
  content: TapToRevealContent
  onWin: () => void
}) {
  const [flipped, setFlipped] = useState<boolean[]>(() => content.reveals.map(() => false))

  const flip = (i: number) => {
    if (flipped[i]) return
    primeAudio()
    playSound('click')
    const next = [...flipped]
    next[i] = true
    setFlipped(next)
    const r = content.reveals[i]
    if (r.fact) sparkSays(r.fact)
    if (next.every(Boolean)) {
      setTimeout(onWin, 700)
    }
  }

  return (
    <div className="ttr">
      {content.reveals.map((r, i) => (
        <button
          key={i}
          type="button"
          onClick={() => flip(i)}
          className={`ttr-card ${flipped[i] ? 'is-flipped' : ''}`}
          aria-pressed={flipped[i]}
          aria-label={flipped[i] ? r.back : r.front}
        >
          <span className="ttr-face ttr-front">
            <span className="ttr-front-text">{r.front}</span>
          </span>
          <span className="ttr-face ttr-back">
            <span className="ttr-back-emoji">{r.back}</span>
            {r.fact && <span className="ttr-back-fact">{r.fact}</span>}
          </span>
        </button>
      ))}
      <style jsx>{`
        .ttr {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }
        @media (min-width: 540px) {
          .ttr { grid-template-columns: repeat(3, 1fr); }
        }
        .ttr-card {
          aspect-ratio: 4 / 3;
          position: relative;
          background: transparent;
          border: none;
          padding: 0;
          perspective: 800px;
          cursor: pointer;
        }
        .ttr-face {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          backface-visibility: hidden;
          transition: transform .55s cubic-bezier(.22,.61,.36,1);
          border-radius: 18px;
          padding: 14px;
          font-weight: 900;
        }
        .ttr-front {
          background: linear-gradient(135deg, #fde047, #fbbf24);
          color: #1a1040;
          border: 3px solid #f59e0b;
        }
        .ttr-front-text {
          font-size: clamp(20px, 4vw, 28px);
          text-align: center;
        }
        .ttr-back {
          background: #1a1040;
          color: #fde68a;
          border: 3px solid #fbbf24;
          transform: rotateY(180deg);
          text-align: center;
        }
        .ttr-back-emoji {
          font-size: clamp(24px, 4vw, 32px);
          color: #fde047;
        }
        .ttr-back-fact {
          font-size: 12px; color: #c4b5fd; font-weight: 700;
          margin-top: 8px; line-height: 1.35;
        }
        .ttr-card.is-flipped .ttr-front { transform: rotateY(180deg); }
        .ttr-card.is-flipped .ttr-back  { transform: rotateY(0deg); animation: ttr-wow .35s ease-out; }
        @keyframes ttr-wow {
          0%   { transform: rotateY(0deg) scale(0.96); }
          60%  { transform: rotateY(0deg) scale(1.04); }
          100% { transform: rotateY(0deg) scale(1); }
        }
      `}</style>
    </div>
  )
}
