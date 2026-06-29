'use client'

// components/academy/SpacedRepetitionBanner.tsx
// Appears on the Academy home page when the learner has lessons due for review.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getItemsDueForReview, type ReviewItem } from '@/lib/academy/spaced-repetition'

export function SpacedRepetitionBanner() {
  const [items, setItems] = useState<ReviewItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setItems(getItemsDueForReview())
    setHydrated(true)
  }, [])

  if (!hydrated || items.length === 0) return null

  // Link to first due lesson — caller can build a dedicated /academy/review page later.
  const first = items[0]
  const href = `/academy/c/${first.courseSlug}/learn/${first.lessonId}`

  return (
    <div className="srb">
      <div className="srb-icon" aria-hidden>📖</div>
      <div className="srb-body">
        <p className="srb-headline">
          {items.length} lesson{items.length === 1 ? '' : 's'} ready for review
        </p>
        <p className="srb-sub">
          A 2-minute review keeps what you learned. Streak-friendly.
        </p>
      </div>
      <Link href={href} className="srb-cta">
        Start review →
      </Link>
      <style jsx>{`
        .srb {
          display: grid; grid-template-columns: auto 1fr auto;
          align-items: center; gap: 16px;
          padding: 16px 20px;
          background: linear-gradient(135deg, rgba(251,191,36,0.18), rgba(0,229,255,0.1));
          border: 1px solid rgba(251,191,36,0.4);
          border-radius: 16px;
          color: #f4f4f5;
        }
        .srb-icon { font-size: 30px; }
        .srb-body { display: flex; flex-direction: column; gap: 2px; }
        .srb-headline { font-weight: 900; color: #fde047; margin: 0; }
        .srb-sub { color: #c4b5fd; font-size: 13px; margin: 0; }
        .srb-cta {
          min-height: 44px; padding: 0 18px;
          background: linear-gradient(135deg, #fbbf24, #f97316);
          color: #0f0a1e;
          text-decoration: none; font-weight: 900;
          border-radius: 10px;
          display: inline-flex; align-items: center;
        }
        @media (max-width: 540px) {
          .srb { grid-template-columns: 1fr; text-align: center; }
        }
      `}</style>
    </div>
  )
}
