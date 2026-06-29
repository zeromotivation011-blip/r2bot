'use client'

// FillBlankBlock — typed answers, fuzzy-matched (lowercase + trim).
// Template uses tokens like __0__, __1__ matching `blanks[i].id`.

import { useMemo, useState } from 'react'
import type { BlockRenderProps } from './BlockRegistry'
import type { ContentBlock } from '@/lib/academy'

type Props = BlockRenderProps & { block: Extract<ContentBlock, { type: 'fill-blank' }> }

function normalise(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '')
}

function fuzzyMatch(input: string, accepted: string[]): boolean {
  const n = normalise(input)
  if (!n) return false
  for (const a of accepted) {
    if (normalise(a) === n) return true
  }
  return false
}

export function FillBlankBlock({ block, isCompleted, onComplete }: Props) {
  const data = block.data
  const [values, setValues] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState<Record<string, boolean>>({})
  const [showHint, setShowHint] = useState<string | null>(null)

  // Split template on __id__ tokens and intersperse input fields.
  const parts = useMemo(() => {
    const tokens = data.template.split(/(__[a-zA-Z0-9_-]+__)/g)
    return tokens
  }, [data.template])

  const check = () => {
    const r: Record<string, boolean> = {}
    let correctCount = 0
    for (const b of data.blanks) {
      const ok = fuzzyMatch(values[b.id] || '', b.correct_answers)
      r[b.id] = ok
      if (ok) correctCount++
    }
    setResults(r)
    setSubmitted(true)
    const score = data.blanks.length > 0
      ? Math.round((correctCount / data.blanks.length) * 100)
      : 0
    onComplete({ score, responseData: { values, results: r } })
  }

  const allFilled = data.blanks.every(b => (values[b.id] || '').trim().length > 0)

  return (
    <div className="fb">
      <div className="fb-template">
        {parts.map((part, i) => {
          const match = part.match(/^__([a-zA-Z0-9_-]+)__$/)
          if (match) {
            const id = match[1]
            const blank = data.blanks.find(b => b.id === id)
            if (!blank) return <span key={i}>{part}</span>
            const value = values[id] || ''
            const result = results[id]
            const state = submitted ? (result ? 'is-ok' : 'is-bad') : ''
            return (
              <span key={i} className="fb-input-wrap">
                <input
                  className={`fb-input ${state}`}
                  type="text"
                  value={value}
                  onChange={e => setValues(v => ({ ...v, [id]: e.target.value }))}
                  disabled={submitted && result}
                  placeholder="..."
                  aria-label={`Blank ${id}`}
                  size={Math.max(8, value.length + 2)}
                />
                {blank.hint && !submitted && (
                  <button
                    type="button"
                    onClick={() => setShowHint(showHint === id ? null : id)}
                    className="fb-hint-toggle"
                    aria-label="Show hint"
                  >
                    ?
                  </button>
                )}
              </span>
            )
          }
          return <span key={i}>{part}</span>
        })}
      </div>

      {showHint && (
        <p className="fb-hint">
          💡 {data.blanks.find(b => b.id === showHint)?.hint}
        </p>
      )}

      {!submitted ? (
        <button
          type="button"
          onClick={check}
          disabled={!allFilled}
          className="fb-check"
        >
          Check
        </button>
      ) : (
        <div className="fb-result">
          {data.blanks.every(b => results[b.id]) ? (
            <p className="fb-result-ok">✓ All correct!</p>
          ) : (
            <>
              <p className="fb-result-warn">Some blanks need another look.</p>
              <button
                type="button"
                onClick={() => { setSubmitted(false); setResults({}) }}
                className="fb-retry"
              >
                Try again
              </button>
            </>
          )}
        </div>
      )}

      <style jsx>{`
        .fb { display: flex; flex-direction: column; gap: 14px; }
        .fb-template {
          font-size: 17px; line-height: 1.9;
          color: #f4f4f5; font-weight: 500;
        }
        .fb-input-wrap { display: inline-flex; align-items: center; gap: 4px; }
        .fb-input {
          padding: 4px 10px;
          background: rgba(0,229,255,0.06);
          border: 2px solid rgba(0,229,255,0.4);
          border-radius: 8px;
          color: #fff; font-weight: 700;
          font-size: 16px;
          font-family: monospace;
        }
        .fb-input:focus { outline: none; border-color: #fbbf24; }
        .fb-input.is-ok { background: rgba(16,185,129,0.18); border-color: #10b981; color: #6ee7b7; }
        .fb-input.is-bad { background: rgba(249,115,22,0.18); border-color: #f97316; color: #fb923c; }
        .fb-hint-toggle {
          width: 22px; height: 22px;
          background: rgba(251,191,36,0.2);
          color: #fbbf24;
          border: 1px solid rgba(251,191,36,0.4);
          border-radius: 50%;
          font-weight: 900;
          cursor: pointer;
        }
        .fb-hint {
          background: rgba(251,191,36,0.08);
          color: #fde68a;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px dashed rgba(251,191,36,0.3);
        }
        .fb-check {
          align-self: flex-start;
          min-height: 44px; padding: 0 22px;
          background: linear-gradient(135deg, #00E5FF, #A56BFF);
          color: #0f0a1e;
          border: none; border-radius: 10px;
          font-weight: 900; cursor: pointer;
        }
        .fb-check:disabled { opacity: 0.4; cursor: not-allowed; }
        .fb-result { display: flex; gap: 12px; align-items: center; }
        .fb-result-ok { color: #10b981; font-weight: 800; margin: 0; }
        .fb-result-warn { color: #fbbf24; font-weight: 800; margin: 0; }
        .fb-retry {
          padding: 8px 14px; border-radius: 8px;
          background: rgba(251,191,36,0.18);
          color: #fde047; font-weight: 800;
          border: 1px solid rgba(251,191,36,0.4);
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}
