'use client'

// Order the steps. Tap pool items to slot them in. Tap a slot to remove.
// Check button validates order — show a "playback" animation either way.

import { useMemo, useState } from 'react'
import type { SequenceBuilderContent } from '@/lib/kids-world-data'
import { playSound, primeAudio } from '@/lib/kids-audio'

export function SequenceBuilder({
  content,
  onWin,
  onFail,
}: {
  content: SequenceBuilderContent
  onWin: () => void
  onFail: () => void
}) {
  const shuffled = useMemo(
    () => content.correctOrder.slice().sort(() => Math.random() - 0.5),
    [content.correctOrder],
  )
  const [placed, setPlaced] = useState<(string | null)[]>(() => content.correctOrder.map(() => null))
  const [pool, setPool] = useState<string[]>(shuffled)
  const [running, setRunning] = useState(false)
  const [runIdx, setRunIdx] = useState(-1)

  const place = (item: string) => {
    if (running) return
    const idx = placed.findIndex(p => p === null)
    if (idx === -1) return
    primeAudio()
    playSound('click')
    const next = [...placed]
    next[idx] = item
    setPlaced(next)
    setPool(p => p.filter(x => x !== item))
  }

  const remove = (i: number) => {
    if (running) return
    const item = placed[i]
    if (!item) return
    const next = [...placed]
    next[i] = null
    setPlaced(next)
    setPool(p => [...p, item])
  }

  const check = async () => {
    if (running) return
    setRunning(true)
    // Playback animation
    for (let i = 0; i < placed.length; i++) {
      setRunIdx(i)
      await new Promise(r => setTimeout(r, 360))
    }
    setRunIdx(-1)
    setRunning(false)
    const ok = placed.every((p, i) => p === content.correctOrder[i])
    if (ok) onWin()
    else onFail()
  }

  const allFilled = placed.every(p => p !== null)

  return (
    <div className="seq">
      <p className="seq-situation">📍 {content.situation}</p>

      <ol className="seq-slots">
        {placed.map((p, i) => {
          const isRun = runIdx === i
          return (
            <li
              key={i}
              className={`seq-slot ${p ? 'is-filled' : ''} ${isRun ? 'is-running' : ''}`}
              onClick={() => remove(i)}
            >
              <span className="seq-num">{i + 1}</span>
              <span className="seq-content">{p ?? <em>empty</em>}</span>
            </li>
          )
        })}
      </ol>

      <div className="seq-pool">
        {pool.map(item => (
          <button
            key={item}
            type="button"
            onClick={() => place(item)}
            className="seq-item"
            disabled={running}
          >
            {item}
          </button>
        ))}
        {pool.length === 0 && <p className="seq-empty">Order looks ready!</p>}
      </div>

      <button
        type="button"
        onClick={check}
        disabled={!allFilled || running}
        className="seq-check"
      >
        {running ? 'Running…' : '✓ Check my order'}
      </button>

      <style jsx>{`
        .seq { display: flex; flex-direction: column; gap: 14px; }
        .seq-situation {
          background: rgba(124,58,237,0.18);
          border: 2px solid #7c3aed;
          color: #fde68a;
          padding: 12px;
          border-radius: 12px;
          text-align: center;
          font-weight: 800;
        }
        .seq-slots { display: flex; flex-direction: column; gap: 8px; list-style: none; padding: 0; margin: 0; }
        .seq-slot {
          display: flex; align-items: center; gap: 12px;
          padding: 12px;
          background: #1a1040;
          border: 2px dashed #4c1d95;
          border-radius: 12px;
          cursor: pointer;
          color: #fde68a; font-weight: 700;
          transition: background .2s, border-color .2s;
        }
        .seq-slot.is-filled {
          border-style: solid;
          border-color: #fbbf24;
          background: rgba(251,191,36,0.12);
        }
        .seq-slot.is-running {
          background: rgba(16,185,129,0.18);
          border-color: #10b981;
          box-shadow: 0 0 18px rgba(16,185,129,0.5);
        }
        .seq-num {
          width: 30px; height: 30px;
          display: grid; place-items: center;
          background: #fbbf24; color: #1a1040;
          border-radius: 50%; font-weight: 900;
          flex-shrink: 0;
        }
        .seq-slot em { color: #6b21a8; font-style: italic; }
        .seq-content { flex: 1; font-size: 14px; }
        .seq-pool { display: flex; flex-direction: column; gap: 6px; }
        .seq-item {
          min-height: 52px;
          padding: 10px 14px;
          background: linear-gradient(135deg, #fde047, #fbbf24);
          color: #1a1040;
          border: none; border-radius: 12px;
          font-weight: 800;
          cursor: pointer;
          text-align: left;
        }
        .seq-item:disabled { opacity: 0.5; cursor: not-allowed; }
        .seq-empty { color: #c4b5fd; font-weight: 700; text-align: center; }
        .seq-check {
          min-height: 56px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none; border-radius: 14px;
          font-size: 18px; font-weight: 900;
          cursor: pointer;
        }
        .seq-check:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
