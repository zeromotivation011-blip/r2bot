'use client'

// Tap a left item, then tap its match on the right.

import { useMemo, useState } from 'react'
import type { MatchPairsContent } from '@/lib/kids-world-data'
import { playSound, primeAudio } from '@/lib/kids-audio'

export function MatchPairs({
  content,
  onWin,
  onFail,
}: {
  content: MatchPairsContent
  onWin: () => void
  onFail: () => void
}) {
  const lefts = content.pairs.map(p => p.left)
  const rights = useMemo(
    () => content.pairs.map(p => p.right).slice().sort(() => Math.random() - 0.5),
    [content.pairs],
  )
  const [matches, setMatches] = useState<Record<string, string>>({})
  const [picked, setPicked] = useState<string | null>(null)

  const isPair = (l: string, r: string) =>
    content.pairs.some(p => p.left === l && p.right === r)

  const handleRight = (r: string) => {
    if (!picked) return
    if (isPair(picked, r)) {
      primeAudio()
      playSound('correct')
      const next = { ...matches, [picked]: r }
      setMatches(next)
      setPicked(null)
      if (Object.keys(next).length === content.pairs.length) {
        setTimeout(onWin, 300)
      }
    } else {
      playSound('wrong')
      onFail()
      setPicked(null)
    }
  }

  return (
    <div className="mp">
      <div className="mp-col">
        {lefts.map(l => {
          const matched = matches[l] !== undefined
          return (
            <button
              key={l}
              type="button"
              disabled={matched}
              onClick={() => { primeAudio(); playSound('click'); setPicked(l) }}
              className={`mp-btn ${picked === l ? 'is-picked' : ''} ${matched ? 'is-matched' : ''}`}
            >
              {l}
            </button>
          )
        })}
      </div>
      <div className="mp-col">
        {rights.map(r => {
          const matched = Object.values(matches).includes(r)
          return (
            <button
              key={r}
              type="button"
              disabled={matched || !picked}
              onClick={() => handleRight(r)}
              className={`mp-btn ${matched ? 'is-matched' : ''}`}
            >
              {r}
            </button>
          )
        })}
      </div>
      <p className="mp-hint">Tap a robot, then tap its job →</p>

      <style jsx>{`
        .mp {
          display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
          align-items: start;
        }
        .mp-col { display: flex; flex-direction: column; gap: 8px; }
        .mp-btn {
          min-height: 56px;
          background: #1a1040;
          border: 2px solid #4c1d95;
          color: #fde68a;
          border-radius: 12px;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          padding: 0 12px;
          transition: transform .15s, border-color .15s, background .15s;
          text-align: center;
        }
        .mp-btn:hover:not(:disabled) { transform: scale(1.04); border-color: #fbbf24; }
        .mp-btn.is-picked {
          border-color: #fbbf24;
          box-shadow: 0 0 18px rgba(251,191,36,0.4);
          background: rgba(251,191,36,0.12);
        }
        .mp-btn.is-matched {
          background: rgba(16,185,129,0.18);
          border-color: #10b981;
          color: #6ee7b7;
        }
        .mp-hint {
          grid-column: 1 / -1;
          text-align: center; color: #a5b4fc; font-size: 12px; font-weight: 700;
        }
      `}</style>
    </div>
  )
}
