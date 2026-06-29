'use client'

// FlashcardBlock — Anki-style flip cards with self-assessment.
// Each card is rated Easy/Hard; ratings feed the spaced repetition system.

import { useState } from 'react'
import type { BlockRenderProps } from './BlockRegistry'
import type { ContentBlock } from '@/lib/academy'

type Props = BlockRenderProps & { block: Extract<ContentBlock, { type: 'flashcard' }> }

interface CardRating {
  cardIndex: number
  flipped: boolean
  rating?: 'easy' | 'hard'
}

export function FlashcardBlock({ block, isCompleted, onComplete }: Props) {
  const data = block.data
  const [cardIdx, setCardIdx] = useState(0)
  const [ratings, setRatings] = useState<CardRating[]>(() =>
    data.cards.map((_, i) => ({ cardIndex: i, flipped: false })),
  )
  const card = data.cards[cardIdx]
  const cur = ratings[cardIdx]

  const flip = () => {
    setRatings(prev =>
      prev.map((r, i) => (i === cardIdx ? { ...r, flipped: !r.flipped } : r)),
    )
  }

  const rate = (rating: 'easy' | 'hard') => {
    setRatings(prev =>
      prev.map((r, i) => (i === cardIdx ? { ...r, rating } : r)),
    )
    // Advance to next
    if (cardIdx < data.cards.length - 1) {
      setTimeout(() => setCardIdx(cardIdx + 1), 350)
    } else {
      // All done — compute aggregate score
      const allRatings = ratings.map((r, i) => (i === cardIdx ? { ...r, rating } : r))
      const easyCount = allRatings.filter(r => r.rating === 'easy').length
      const score = Math.round((easyCount / data.cards.length) * 100)
      const points = data.cards.length * data.points_per_card
      onComplete({
        score,
        responseData: { ratings: allRatings, points },
      })
    }
  }

  return (
    <div className="fc">
      <div className="fc-meta">
        Card {cardIdx + 1} of {data.cards.length}
      </div>
      <button
        type="button"
        onClick={flip}
        className={`fc-card ${cur.flipped ? 'is-flipped' : ''}`}
        aria-pressed={cur.flipped}
      >
        <span className="fc-face fc-front">
          {card.front_image && <img src={card.front_image} alt="" />}
          <span className="fc-text">{card.front}</span>
          {!cur.flipped && <span className="fc-hint">Tap to flip</span>}
        </span>
        <span className="fc-face fc-back">
          {card.back_image && <img src={card.back_image} alt="" />}
          <span className="fc-text">{card.back}</span>
        </span>
      </button>

      {cur.flipped && !cur.rating && (
        <div className="fc-rating">
          <p className="fc-rating-label">How did you know it?</p>
          <div className="fc-rating-btns">
            <button type="button" onClick={() => rate('hard')} className="fc-rate-hard">
              😕 Hard
            </button>
            <button type="button" onClick={() => rate('easy')} className="fc-rate-easy">
              😊 Easy
            </button>
          </div>
        </div>
      )}

      {isCompleted && <p className="fc-done">✓ All cards reviewed</p>}

      <style jsx>{`
        .fc { display: flex; flex-direction: column; gap: 12px; align-items: center; }
        .fc-meta { font-size: 12px; color: #94a3b8; font-weight: 700; }
        .fc-card {
          position: relative;
          width: 100%; max-width: 480px;
          aspect-ratio: 16 / 10;
          background: transparent; border: none; padding: 0;
          perspective: 900px;
          cursor: pointer;
        }
        .fc-face {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 10px;
          backface-visibility: hidden;
          transition: transform 0.55s cubic-bezier(.22,.61,.36,1);
          border-radius: 18px;
          padding: 20px;
          font-weight: 800;
          text-align: center;
        }
        .fc-front {
          background: linear-gradient(135deg, #1e293b, #0f172a);
          color: #fde047;
          border: 2px solid rgba(251,191,36,0.4);
        }
        .fc-back {
          background: linear-gradient(135deg, #1a1040, #0f0a1e);
          color: #c4b5fd;
          border: 2px solid rgba(0,229,255,0.5);
          transform: rotateY(180deg);
        }
        .fc-card.is-flipped .fc-front { transform: rotateY(180deg); }
        .fc-card.is-flipped .fc-back  { transform: rotateY(0deg); }
        .fc-text { font-size: clamp(18px, 3vw, 24px); line-height: 1.35; }
        .fc-hint {
          position: absolute; bottom: 14px;
          font-size: 12px; color: #94a3b8; font-weight: 600;
        }
        .fc-face img { max-height: 60%; max-width: 80%; object-fit: contain; }
        .fc-rating {
          display: flex; flex-direction: column; gap: 10px; align-items: center;
        }
        .fc-rating-label { color: #c4b5fd; font-weight: 700; font-size: 14px; }
        .fc-rating-btns { display: flex; gap: 10px; }
        .fc-rate-hard, .fc-rate-easy {
          min-height: 48px; padding: 0 22px;
          border: none; border-radius: 999px;
          font-weight: 900; font-size: 14px;
          cursor: pointer;
        }
        .fc-rate-hard {
          background: rgba(249,115,22,0.18);
          color: #fb923c;
          border: 1px solid rgba(249,115,22,0.4);
        }
        .fc-rate-easy {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }
        .fc-done {
          color: #10b981; font-weight: 800; text-align: center;
        }
      `}</style>
    </div>
  )
}
