'use client'

// MatchPairsBlock — tap left, then tap right. Right items are shuffled.
// Completes when all pairs are matched.

import { useMemo, useState } from 'react'
import type { BlockRenderProps } from './BlockRegistry'
import type { ContentBlock } from '@/lib/academy'

type Props = BlockRenderProps & { block: Extract<ContentBlock, { type: 'match-pairs' }> }

export function MatchPairsBlock({ block, isCompleted, onComplete }: Props) {
  const data = block.data
  const lefts = data.pairs.map(p => p.left)
  const rights = useMemo(
    () => data.pairs.map(p => p.right).slice().sort(() => Math.random() - 0.5),
    [data.pairs],
  )

  const [picked, setPicked] = useState<string | null>(null)
  const [matches, setMatches] = useState<Record<string, string>>({})
  const [wrong, setWrong] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)

  const isCorrect = (l: string, r: string) =>
    data.pairs.some(p => p.left === l && p.right === r)

  const handleRight = (r: string) => {
    if (!picked) return
    setAttempts(a => a + 1)
    if (isCorrect(picked, r)) {
      const next = { ...matches, [picked]: r }
      setMatches(next)
      setPicked(null)
      if (Object.keys(next).length === data.pairs.length) {
        const score = Math.max(0, Math.min(100, Math.round(100 * data.pairs.length / Math.max(data.pairs.length, attempts + 1))))
        onComplete({ score, responseData: { matches: next, attempts: attempts + 1 } })
      }
    } else {
      setWrong(r)
      setTimeout(() => setWrong(null), 600)
      setPicked(null)
    }
  }

  return (
    <div className="mp">
      <p className="mp-instruction">{data.instruction}</p>
      <div className="mp-grid">
        <div className="mp-col">
          {lefts.map(l => {
            const matched = matches[l] !== undefined
            return (
              <button
                key={l}
                type="button"
                disabled={matched || isCompleted}
                onClick={() => setPicked(l)}
                className={`mp-cell ${picked === l ? 'is-picked' : ''} ${matched ? 'is-matched' : ''}`}
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
                disabled={matched || !picked || isCompleted}
                onClick={() => handleRight(r)}
                className={`mp-cell ${matched ? 'is-matched' : ''} ${wrong === r ? 'is-wrong' : ''}`}
              >
                {r}
              </button>
            )
          })}
        </div>
      </div>
      <p className="mp-status">
        {isCompleted
          ? '✓ All matched'
          : picked
            ? `Now tap the match for "${picked}"`
            : 'Tap an item on the left, then its match on the right.'}
      </p>

      <style jsx>{`
        .mp { display: flex; flex-direction: column; gap: 12px; }
        .mp-instruction { font-size: 16px; font-weight: 700; color: #fde047; margin: 0; }
        .mp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .mp-col { display: flex; flex-direction: column; gap: 8px; }
        .mp-cell {
          min-height: 52px; padding: 10px 14px;
          background: rgba(255,255,255,0.04);
          border: 2px solid rgba(255,255,255,0.12);
          color: #f4f4f5;
          border-radius: 10px;
          font-size: 14px; font-weight: 700;
          cursor: pointer; text-align: center;
          transition: transform .15s, border-color .15s, background .15s;
        }
        .mp-cell:hover:not(:disabled) { border-color: #fbbf24; transform: translateY(-1px); }
        .mp-cell.is-picked { border-color: #00E5FF; box-shadow: 0 0 18px rgba(0,229,255,0.3); }
        .mp-cell.is-matched {
          background: rgba(16,185,129,0.18); border-color: #10b981; color: #6ee7b7;
          cursor: default;
        }
        .mp-cell.is-wrong {
          background: rgba(249,115,22,0.18); border-color: #f97316;
          animation: mp-shake .45s ease-in-out;
        }
        @keyframes mp-shake {
          0%,100% { transform: translateX(0); }
          25%     { transform: translateX(-6px); }
          75%     { transform: translateX(6px); }
        }
        .mp-status { color: #c4b5fd; font-size: 13px; font-weight: 600; text-align: center; }
      `}</style>
    </div>
  )
}
