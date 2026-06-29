'use client'

// Pick the right answer to fill the blank.

import { useState } from 'react'
import type { FillBlankContent } from '@/lib/kids-world-data'
import { playSound, primeAudio } from '@/lib/kids-audio'

export function FillBlank({
  content,
  onWin,
  onFail,
}: {
  content: FillBlankContent
  onWin: () => void
  onFail: () => void
}) {
  const [picked, setPicked] = useState<number | null>(null)

  const choose = (i: number) => {
    primeAudio()
    setPicked(i)
    if (i === content.correct) {
      playSound('correct')
      setTimeout(onWin, 400)
    } else {
      playSound('wrong')
      onFail()
      setTimeout(() => setPicked(null), 600)
    }
  }

  return (
    <div className="fb">
      <p className="fb-prompt">{content.prompt}</p>
      <div className="fb-opts">
        {content.options.map((opt, i) => {
          const cls =
            picked === i
              ? i === content.correct ? 'is-ok' : 'is-bad'
              : ''
          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              className={`fb-opt ${cls}`}
              disabled={picked !== null && picked === content.correct}
            >
              {opt}
            </button>
          )
        })}
      </div>
      {content.hint && <p className="fb-hint">💡 {content.hint}</p>}

      <style jsx>{`
        .fb { display: flex; flex-direction: column; gap: 12px; }
        .fb-prompt {
          background: #1a1040;
          color: #fde68a;
          padding: 18px;
          border: 2px solid #4c1d95;
          border-radius: 14px;
          font-family: monospace;
          font-size: 16px;
          font-weight: 800;
          line-height: 1.45;
          white-space: pre-wrap;
        }
        .fb-opts {
          display: grid; gap: 8px;
          grid-template-columns: 1fr 1fr;
        }
        @media (min-width: 480px) {
          .fb-opts { grid-template-columns: repeat(4, 1fr); }
        }
        .fb-opt {
          min-height: 56px;
          background: linear-gradient(135deg, #fde047, #fbbf24);
          color: #1a1040;
          border: 2px solid #f59e0b;
          border-radius: 14px;
          font-weight: 900; font-size: 15px;
          cursor: pointer;
          transition: transform .15s;
        }
        .fb-opt:hover:not(:disabled) { transform: scale(1.05); }
        .fb-opt:disabled { opacity: 0.4; cursor: not-allowed; }
        .fb-opt.is-ok { background: linear-gradient(135deg, #10b981, #059669); color: #fff; }
        .fb-opt.is-bad {
          background: linear-gradient(135deg, #f97316, #ea580c);
          color: #fff;
          animation: fb-shake .45s ease-in-out;
        }
        @keyframes fb-shake {
          0%,100% { transform: translateX(0); }
          25%     { transform: translateX(-6px); }
          75%     { transform: translateX(6px); }
        }
        .fb-hint { color: #fcd34d; font-weight: 700; font-size: 13px; text-align: center; }
      `}</style>
    </div>
  )
}
