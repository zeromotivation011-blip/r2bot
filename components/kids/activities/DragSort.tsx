'use client'

// Tap-to-select then tap-to-place sorting (mobile-friendly).
// Drag on desktop is also supported. Wrong drops shake the card and bounce back.

import { useState } from 'react'
import type { DragSortContent } from '@/lib/kids-world-data'
import { playSound, primeAudio } from '@/lib/kids-audio'

export function DragSort({
  content,
  onWin,
  onFail,
  showHint = false,
}: {
  content: DragSortContent
  onWin: () => void
  onFail: () => void
  showHint?: boolean
}) {
  const [placed, setPlaced] = useState<Record<string, string>>({}) // item -> category
  const [picked, setPicked] = useState<string | null>(null)
  const [wrongFlash, setWrongFlash] = useState<string | null>(null)

  const handleDrop = (cat: string, item: string) => {
    primeAudio()
    if (content.answers[item] !== cat) {
      onFail()
      setWrongFlash(item)
      setTimeout(() => setWrongFlash(null), 500)
      setPicked(null)
      return
    }
    playSound('correct')
    const next = { ...placed, [item]: cat }
    setPlaced(next)
    setPicked(null)
    if (Object.keys(next).length === content.items.length) {
      setTimeout(onWin, 350)
    }
  }

  const remaining = content.items.filter(i => !(i in placed))
  const hintTarget =
    showHint && picked
      ? content.answers[picked]
      : null

  return (
    <div className="ds">
      <div className="ds-pool" aria-label="Items to sort">
        {remaining.length === 0 ? (
          <p className="ds-empty">All sorted! ✨</p>
        ) : (
          remaining.map(item => {
            const isPicked = picked === item
            const isShake = wrongFlash === item
            return (
              <button
                key={item}
                className={`ds-chip ${isPicked ? 'is-picked' : ''} ${isShake ? 'is-shake' : ''}`}
                draggable
                onDragStart={() => setPicked(item)}
                onDragEnd={() => { /* leave picked for tap fallback */ }}
                onClick={() => setPicked(p => (p === item ? null : item))}
                aria-pressed={isPicked}
              >
                {item}
              </button>
            )
          })
        )}
      </div>

      <div className="ds-cats">
        {content.categories.map(cat => {
          const placedHere = Object.entries(placed)
            .filter(([, c]) => c === cat)
            .map(([item]) => item)
          const isHintTarget = hintTarget === cat
          return (
            <div
              key={cat}
              className={`ds-cat ${isHintTarget ? 'is-hint' : ''}`}
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (picked) handleDrop(cat, picked) }}
              onClick={() => { if (picked) handleDrop(cat, picked) }}
            >
              <p className="ds-cat-label">📦 {cat}</p>
              <div className="ds-cat-items">
                {placedHere.map(i => (
                  <span key={i} className="ds-placed">{i}</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <p className="ds-hint">
        {picked
          ? `Tap a category to drop "${picked}"`
          : 'Tap an item, then tap a category.'}
      </p>

      <style jsx>{`
        .ds { display: flex; flex-direction: column; gap: 14px; }
        .ds-pool {
          display: flex; flex-wrap: wrap; gap: 8px;
          min-height: 72px;
          padding: 12px;
          background: rgba(15,10,30,0.5);
          border: 2px dashed #4c1d95;
          border-radius: 14px;
        }
        .ds-empty { color: #6ee7b7; font-weight: 800; }
        .ds-chip {
          min-height: 48px; padding: 8px 14px;
          background: linear-gradient(135deg, #fde047, #fbbf24);
          color: #1a1040;
          border: 2px solid #f59e0b;
          border-radius: 12px;
          font-weight: 800;
          cursor: grab;
          transition: transform .15s, box-shadow .15s;
        }
        .ds-chip:active { cursor: grabbing; }
        .ds-chip.is-picked {
          transform: scale(1.08);
          box-shadow: 0 0 22px rgba(251,191,36,0.55);
        }
        .ds-chip.is-shake {
          animation: ds-shake .45s ease-in-out;
        }
        @keyframes ds-shake {
          0%, 100% { transform: translateX(0); }
          25%      { transform: translateX(-10px); }
          75%      { transform: translateX(10px); }
        }
        .ds-cats {
          display: grid; gap: 10px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        @media (min-width: 640px) {
          .ds-cats { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }
        .ds-cat {
          min-height: 120px;
          background: rgba(124,58,237,0.15);
          border: 2px dashed #4c1d95;
          border-radius: 14px;
          padding: 10px;
          cursor: pointer;
          transition: border-color .2s, background .2s, transform .15s;
        }
        .ds-cat:hover { border-color: #fbbf24; transform: translateY(-2px); }
        .ds-cat.is-hint {
          animation: ds-hint-pulse 1.4s ease-in-out infinite;
          border-color: #fde047;
        }
        @keyframes ds-hint-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(253,224,71,0.5); }
          50%      { box-shadow: 0 0 0 14px rgba(253,224,71,0); }
        }
        .ds-cat-label {
          text-align: center; font-weight: 900;
          color: #fde047; font-size: 13px; margin: 0 0 6px;
        }
        .ds-cat-items { display: flex; flex-direction: column; gap: 4px; }
        .ds-placed {
          background: rgba(16,185,129,0.22);
          border: 1px solid #10b981;
          color: #6ee7b7;
          font-weight: 800; font-size: 12px;
          padding: 4px 8px;
          border-radius: 8px;
          text-align: center;
        }
        .ds-hint { text-align: center; font-size: 12px; color: #a5b4fc; font-weight: 700; }
      `}</style>
    </div>
  )
}
