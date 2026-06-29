'use client'

// components/daily-life/DidYouKnow.tsx
// Full-screen "Did you know?" interstitial used between Story Mode cards.

import { useEffect, useRef } from 'react'

export interface DidYouKnowFact {
  emoji: string
  fact: string
}

export const DID_YOU_KNOWS: readonly DidYouKnowFact[] = [
  { emoji: '😱', fact: 'By the time you finish reading this sentence, ~3 packages have been sorted by robot arms in Amazon warehouses.' },
  { emoji: '🤯', fact: 'The Mars Perseverance Rover has 23 cameras — more eyes than any creature on Earth or Mars.' },
  { emoji: '🇮🇳', fact: 'India added 4,900 industrial robots in 2023 — the fastest growth in Asia outside China.' },
  { emoji: '⚡', fact: 'Most modern dishwashers contain more logic than the entire Apollo 11 guidance computer.' },
  { emoji: '🛰️', fact: 'There are ~7,500 robots in orbit right now (active satellites). They quietly run your GPS.' },
  { emoji: '🤖', fact: 'The first commercial robot — Unimate, 1961 — was sold to GM for $50,000. Today it would cost ~₹3 lakh.' },
  { emoji: '🧠', fact: 'A self-driving car generates ~4TB of sensor data every 8 hours. Your phone generates ~10MB.' },
] as const

export function DidYouKnow({
  fact,
  open,
  onContinue,
}: {
  fact: DidYouKnowFact
  open: boolean
  onContinue: () => void
}) {
  const btnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (open) btnRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onContinue()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onContinue])

  if (!open) return null
  return (
    <div className="dyk" role="dialog" aria-modal="true" aria-label="Did you know?">
      <span className="dyk-emoji" aria-hidden>{fact.emoji}</span>
      <p className="dyk-eyebrow">Did you know?</p>
      <p className="dyk-fact">{fact.fact}</p>
      <button ref={btnRef} type="button" onClick={onContinue} className="dyk-cta">
        Cool! Keep going →
      </button>
      <style jsx>{`
        .dyk {
          position: fixed; inset: 0; z-index: 100;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 14px;
          padding: 32px 20px;
          background: radial-gradient(circle at 50% 30%, rgba(245,158,11,0.25), rgba(11,18,32,0.97));
          backdrop-filter: blur(12px);
          text-align: center;
          color: #fff;
          animation: dyk-pop 0.4s cubic-bezier(.22,.61,.36,1);
        }
        @keyframes dyk-pop {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }
        .dyk-emoji { font-size: clamp(72px, 14vw, 120px); line-height: 1; }
        .dyk-eyebrow {
          font-size: 13px; letter-spacing: 3px; text-transform: uppercase;
          color: #fbbf24; font-weight: 900; margin: 0;
        }
        .dyk-fact {
          font-size: clamp(20px, 3.5vw, 32px);
          font-weight: 800;
          max-width: 720px;
          line-height: 1.4;
          color: #fde68a;
          margin: 4px 0 18px;
        }
        .dyk-cta {
          min-height: 54px; padding: 0 26px;
          background: linear-gradient(135deg, #fbbf24, #f97316);
          color: #0a0a16;
          border: none; border-radius: 14px;
          font-weight: 900; font-size: 16px;
          cursor: pointer;
          box-shadow: 0 12px 36px rgba(251,191,36,0.5);
        }
      `}</style>
    </div>
  )
}
