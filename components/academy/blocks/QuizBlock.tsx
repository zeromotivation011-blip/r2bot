'use client'

// QuizBlock — single-question MCQ (or multi-select). Shows explanation per
// option after answering. Score: 100 if correct, 0 otherwise. Lesson-level
// mastery gating is handled by the player based on aggregate scores.

import { useMemo, useState } from 'react'
import type { BlockRenderProps } from './BlockRegistry'
import type { ContentBlock } from '@/lib/academy'

type Props = BlockRenderProps & { block: Extract<ContentBlock, { type: 'quiz-mcq' }> }

export function QuizBlock({ block, isCompleted, onComplete }: Props) {
  const data = block.data
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [submitted, setSubmitted] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [attempts, setAttempts] = useState(0)

  // Shuffle options once per mount so questions don't always lead with the right answer.
  const options = useMemo(
    () => data.options.slice().sort(() => Math.random() - 0.5),
    [data.options],
  )

  const correctIds = useMemo(
    () => new Set(data.options.filter(o => o.correct).map(o => o.id)),
    [data.options],
  )

  const isCorrect = useMemo(() => {
    if (picked.size !== correctIds.size) return false
    for (const id of picked) if (!correctIds.has(id)) return false
    return true
  }, [picked, correctIds])

  const toggle = (id: string) => {
    if (submitted) return
    setPicked(prev => {
      const next = new Set(prev)
      if (data.allow_multiple) {
        if (next.has(id)) next.delete(id)
        else next.add(id)
      } else {
        next.clear()
        next.add(id)
      }
      return next
    })
  }

  const submit = () => {
    if (picked.size === 0) return
    setAttempts(a => a + 1)
    setSubmitted(true)
    onComplete({
      score: isCorrect ? 100 : 0,
      responseData: { answers: Array.from(picked), correct: isCorrect, attempts: attempts + 1 },
    })
  }

  const retry = () => {
    setPicked(new Set())
    setSubmitted(false)
  }

  return (
    <div className="qb">
      <p className="qb-question">{data.question}</p>
      {data.image && <img src={data.image} alt="" className="qb-image" />}

      <ul className="qb-options">
        {options.map(opt => {
          const isPicked = picked.has(opt.id)
          const showState = submitted && (isPicked || opt.correct)
          const stateClass =
            showState
              ? opt.correct ? 'is-correct' : isPicked ? 'is-wrong' : ''
              : isPicked ? 'is-picked' : ''
          return (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => toggle(opt.id)}
                disabled={submitted}
                className={`qb-opt ${stateClass}`}
              >
                <span className="qb-opt-marker" aria-hidden>
                  {data.allow_multiple ? (isPicked ? '☑' : '☐') : (isPicked ? '◉' : '○')}
                </span>
                <span className="qb-opt-text">{opt.text}</span>
                {showState && opt.correct && <span className="qb-opt-tag">✓ correct</span>}
                {showState && !opt.correct && isPicked && <span className="qb-opt-tag bad">✗</span>}
              </button>
              {submitted && (isPicked || opt.correct) && (
                <p className={`qb-explain ${opt.correct ? 'is-good' : 'is-warn'}`}>
                  {opt.explanation}
                </p>
              )}
            </li>
          )
        })}
      </ul>

      {data.hint && !submitted && (
        <div className="qb-hint-row">
          <button type="button" onClick={() => setShowHint(s => !s)} className="qb-hint-btn">
            💡 {showHint ? 'Hide hint' : 'Need a hint?'}
          </button>
          {showHint && <p className="qb-hint">{data.hint}</p>}
        </div>
      )}

      {!submitted ? (
        <button
          type="button"
          onClick={submit}
          disabled={picked.size === 0}
          className="qb-submit"
        >
          Check answer
        </button>
      ) : (
        <div className="qb-result">
          <p className={`qb-result-text ${isCorrect ? 'is-good' : 'is-warn'}`}>
            {isCorrect ? '🎉 Correct!' : 'Not quite. Read the explanations above.'}
          </p>
          {!isCorrect && (
            <button type="button" onClick={retry} className="qb-retry">
              Try again
            </button>
          )}
        </div>
      )}

      <style jsx>{`
        .qb { display: flex; flex-direction: column; gap: 14px; }
        .qb-question {
          font-size: 18px; font-weight: 800; color: #fff;
          margin: 0; line-height: 1.4;
        }
        .qb-image {
          max-width: 100%; border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .qb-options { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
        .qb-opt {
          width: 100%; text-align: left;
          display: flex; gap: 12px; align-items: center;
          padding: 14px 16px;
          background: rgba(255,255,255,0.04);
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          color: #f4f4f5;
          font-size: 15px; font-weight: 600;
          cursor: pointer;
          transition: border-color .15s, background .15s;
        }
        .qb-opt:hover:not(:disabled) { border-color: #fbbf24; }
        .qb-opt.is-picked { border-color: #00E5FF; background: rgba(0,229,255,0.08); }
        .qb-opt.is-correct {
          border-color: #10b981;
          background: rgba(16,185,129,0.14);
        }
        .qb-opt.is-wrong {
          border-color: #f97316;
          background: rgba(249,115,22,0.12);
        }
        .qb-opt:disabled { cursor: default; }
        .qb-opt-marker { font-size: 18px; color: #00E5FF; }
        .qb-opt-text { flex: 1; }
        .qb-opt-tag {
          margin-left: auto;
          padding: 2px 8px; border-radius: 999px;
          background: rgba(16,185,129,0.18);
          color: #10b981;
          font-size: 11px; font-weight: 900;
        }
        .qb-opt-tag.bad { background: rgba(249,115,22,0.18); color: #f97316; }
        .qb-explain {
          margin: 6px 0 0 36px;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 13px; line-height: 1.5;
        }
        .qb-explain.is-good { background: rgba(16,185,129,0.1); color: #6ee7b7; }
        .qb-explain.is-warn { background: rgba(251,191,36,0.1); color: #fde68a; }
        .qb-hint-row { display: flex; flex-direction: column; gap: 6px; }
        .qb-hint-btn {
          align-self: flex-start;
          padding: 6px 12px; border-radius: 999px;
          background: rgba(251,191,36,0.1);
          color: #fbbf24;
          border: 1px solid rgba(251,191,36,0.3);
          font-weight: 800; font-size: 12px;
          cursor: pointer;
        }
        .qb-hint {
          padding: 10px 12px;
          background: rgba(251,191,36,0.06);
          border: 1px dashed rgba(251,191,36,0.3);
          border-radius: 8px;
          color: #fde68a; font-size: 13px;
        }
        .qb-submit {
          min-height: 48px; padding: 0 22px;
          background: linear-gradient(135deg, #00E5FF, #A56BFF);
          color: #0f0a1e;
          border: none; border-radius: 12px;
          font-weight: 900; font-size: 15px;
          cursor: pointer;
          align-self: flex-start;
        }
        .qb-submit:disabled { opacity: 0.4; cursor: not-allowed; }
        .qb-result {
          display: flex; gap: 12px; align-items: center;
          padding: 12px 14px; border-radius: 12px;
          background: rgba(255,255,255,0.04);
        }
        .qb-result-text { margin: 0; flex: 1; font-weight: 800; }
        .qb-result-text.is-good { color: #10b981; }
        .qb-result-text.is-warn { color: #fbbf24; }
        .qb-retry {
          padding: 8px 14px; border-radius: 8px;
          background: rgba(251,191,36,0.18);
          color: #fde047;
          border: 1px solid rgba(251,191,36,0.4);
          font-weight: 800; cursor: pointer;
        }
      `}</style>
    </div>
  )
}
