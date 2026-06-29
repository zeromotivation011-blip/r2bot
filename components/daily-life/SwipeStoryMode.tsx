'use client'

// components/daily-life/SwipeStoryMode.tsx
// Swipe-card story walker. One robot per card, swipe/keyboard/buttons.
// Interleaves DidYouKnow interstitials every Nth card.

import { useEffect, useRef, useState } from 'react'
import type { UseCase } from '@/lib/daily-life-data'
import { DidYouKnow, DID_YOU_KNOWS } from './DidYouKnow'

interface SwipeStoryModeProps {
  cards: UseCase[]
  interstitialEvery?: number
  onComplete?: () => void
}

export function SwipeStoryMode({ cards, interstitialEvery = 3, onComplete }: SwipeStoryModeProps) {
  const [idx, setIdx] = useState(0)
  const [interstitialOpen, setInterstitialOpen] = useState(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const stepRef = useRef(0)

  const total = cards.length
  const card = cards[idx]

  const advance = () => {
    if (idx < total - 1) {
      stepRef.current += 1
      // Show interstitial every N steps
      if (stepRef.current % interstitialEvery === 0) {
        setInterstitialOpen(true)
        return
      }
      setIdx(idx + 1)
    } else {
      onComplete?.()
    }
  }
  const back = () => {
    if (idx > 0) setIdx(idx - 1)
  }

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (interstitialOpen) return
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); advance() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); back() }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, interstitialOpen])

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) advance()
      else back()
    }
    touchStart.current = null
  }

  if (!card) return null
  const interstitialFact = DID_YOU_KNOWS[Math.floor(idx / interstitialEvery) % DID_YOU_KNOWS.length]

  return (
    <section className="ssm">
      <p className="ssm-count">{idx + 1} of {total}</p>
      <div className="ssm-track">
        <div className="ssm-track-fill" style={{ width: `${((idx + 1) / total) * 100}%` }} />
      </div>
      <div
        className="ssm-card slide-reveal"
        key={card.id}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <header className="ssm-card-head">
          <span className="ssm-domain">
            {(card.domains[0] ?? 'general').toString().replace(/-/g, ' ')}
          </span>
          {card.timeOfDay && (
            <span className="ssm-time">{timeOfDayLabel(card.timeOfDay)}</span>
          )}
        </header>

        <div className="ssm-emoji" aria-hidden>{card.imageEmoji}</div>
        <h2 className="ssm-title">{card.title}</h2>
        <p className="ssm-hook">{card.hookLine}</p>

        <section className="ssm-section">
          <p className="ssm-section-label">How it works</p>
          <p>{card.howItWorks}</p>
        </section>

        <section className="ssm-section ssm-section-analogy">
          <p className="ssm-section-label">💡 Think of it like…</p>
          <p>{card.analogyExplanation}</p>
        </section>

        <section className="ssm-section ssm-section-wow">
          <p className="ssm-section-label">🤯 Wow</p>
          <p>{card.mindBlowingFact}</p>
        </section>

        {(card.indianContext || card.funFact) && (
          <section className="ssm-section ssm-section-india">
            <p className="ssm-section-label">🇮🇳 In India</p>
            <p>{card.indianContext ?? card.funFact}</p>
          </section>
        )}
      </div>

      <div className="ssm-nav">
        <button type="button" onClick={back} disabled={idx === 0} className="ssm-nav-btn">← Previous</button>
        <span className="ssm-hint swipe-hint" aria-hidden>swipe →</span>
        <button type="button" onClick={advance} className="ssm-nav-btn ssm-nav-primary">
          {idx === total - 1 ? 'Finish' : 'Next →'}
        </button>
      </div>

      <DidYouKnow
        fact={interstitialFact}
        open={interstitialOpen}
        onContinue={() => {
          setInterstitialOpen(false)
          setIdx(i => Math.min(total - 1, i + 1))
        }}
      />

      <style jsx>{`
        .ssm { max-width: 720px; margin: 0 auto; padding: 18px; color: #f4f4f5; }
        .ssm-count {
          font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
          color: #94a3b8; font-weight: 800; margin: 0 0 6px;
          text-align: center;
        }
        .ssm-track {
          height: 5px; background: rgba(255,255,255,0.08);
          border-radius: 999px; overflow: hidden; margin-bottom: 14px;
        }
        .ssm-track-fill {
          height: 100%;
          background: linear-gradient(90deg, #fbbf24, #f97316);
          transition: width 0.4s cubic-bezier(.22,.61,.36,1);
        }
        .ssm-card {
          background: rgba(15, 18, 32, 0.7);
          border: 1px solid rgba(124,58,237,0.4);
          border-radius: 20px;
          padding: 22px;
          touch-action: pan-y;
          user-select: none;
        }
        .ssm-card-head {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
          color: #94a3b8; font-weight: 800;
          margin-bottom: 10px;
        }
        .ssm-domain { color: #fde047; }
        .ssm-time { color: #c4b5fd; }
        .ssm-emoji {
          font-size: 64px; text-align: center; line-height: 1; margin: 12px 0;
        }
        .ssm-title {
          font-size: clamp(22px, 4vw, 32px);
          font-weight: 900;
          color: #fff;
          margin: 0 0 8px;
          text-align: center;
        }
        .ssm-hook {
          color: #fde047; font-size: 16px; font-weight: 700;
          text-align: center;
          margin: 0 0 20px;
        }
        .ssm-section {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 10px;
        }
        .ssm-section p { margin: 0; line-height: 1.5; color: #d6d6e0; font-size: 14px; }
        .ssm-section-label {
          font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase;
          color: #94a3b8; font-weight: 800; margin: 0 0 4px !important;
        }
        .ssm-section-analogy { background: rgba(251,191,36,0.08); border-color: rgba(251,191,36,0.3); }
        .ssm-section-analogy .ssm-section-label { color: #fbbf24; }
        .ssm-section-wow { background: rgba(124,58,237,0.1); border-color: rgba(124,58,237,0.35); }
        .ssm-section-wow .ssm-section-label { color: #c4b5fd; }
        .ssm-section-india { background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.3); }
        .ssm-section-india .ssm-section-label { color: #10b981; }

        .ssm-nav {
          display: flex; gap: 10px; align-items: center;
          margin-top: 14px;
        }
        .ssm-nav-btn {
          flex: 1; min-height: 50px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.15);
          color: #c4b5fd;
          border-radius: 12px;
          font-weight: 800; font-size: 14px;
          cursor: pointer;
        }
        .ssm-nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .ssm-nav-primary {
          background: linear-gradient(135deg, #fbbf24, #f97316);
          color: #0a0a16; border: none;
        }
        .ssm-hint {
          font-size: 11px; color: #fbbf24;
          font-weight: 800;
        }
      `}</style>
    </section>
  )
}

function timeOfDayLabel(t: string): string {
  switch (t) {
    case 'morning':   return '🌅 Morning'
    case 'afternoon': return '☀️ Afternoon'
    case 'evening':   return '🌆 Evening'
    case 'night':     return '🌙 Night'
    default:          return 'Anytime'
  }
}
