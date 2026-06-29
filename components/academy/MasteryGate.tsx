'use client'

// components/academy/MasteryGate.tsx
// Two modes:
//   - 'upsell': learner is not enrolled and has hit the preview limit
//   - 'retry':  learner scored below the passing threshold; offer retry

import Link from 'next/link'

export type MasteryGateMode = 'upsell' | 'retry'

interface MasteryGateProps {
  mode: MasteryGateMode
  // upsell
  courseTitle?: string
  enrollHref?: string
  priceInr?: number
  // retry
  passingScore?: number
  bestScore?: number
  onRetry?: () => void
  attempts?: number
}

export function MasteryGate(props: MasteryGateProps) {
  if (props.mode === 'upsell') return <Upsell {...props} />
  return <Retry {...props} />
}

function Upsell({ courseTitle, enrollHref, priceInr }: MasteryGateProps) {
  return (
    <div className="mg-wrap mg-upsell">
      <span className="mg-icon" aria-hidden>🔒</span>
      <h3 className="mg-title">Preview ends here</h3>
      <p className="mg-text">
        {courseTitle ? <>Keep going with <strong>{courseTitle}</strong> on R2BOT Pro. </> : 'Keep going on R2BOT Pro. '}
        Track progress, earn your certificate, and unlock every lesson.
      </p>
      <ul className="mg-perks">
        <li>✓ Full course access</li>
        <li>✓ Graded assessments + mastery gates</li>
        <li>✓ Spaced repetition reviews</li>
        <li>✓ Verifiable certificate</li>
      </ul>
      <Link
        href={enrollHref ?? '/pricing'}
        className="mg-cta"
      >
        {typeof priceInr === 'number' && priceInr > 0
          ? `Enrol for ₹${priceInr.toLocaleString('en-IN')}`
          : 'Enrol free'} →
      </Link>
      <p className="mg-fine">EMI available · cancel anytime</p>

      <Styles />
    </div>
  )
}

function Retry({ passingScore = 75, bestScore = 0, attempts = 1, onRetry }: MasteryGateProps) {
  const delta = Math.max(0, passingScore - bestScore)
  return (
    <div className="mg-wrap mg-retry">
      <span className="mg-icon" aria-hidden>🎯</span>
      <h3 className="mg-title">Almost there</h3>
      <p className="mg-text">
        Score <strong>{passingScore}%</strong> to unlock the next lesson.
        Your best so far: <strong>{bestScore}%</strong>{delta > 0 ? ` — ${delta} points to go` : ''}.
      </p>
      <p className="mg-attempts">Attempt #{attempts}. Unlimited retries — new questions each time.</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mg-cta">
          Try again →
        </button>
      )}
      <Styles />
    </div>
  )
}

function Styles() {
  return (
    <style jsx>{`
      .mg-wrap {
        background: linear-gradient(135deg, rgba(124,58,237,0.12), rgba(0,229,255,0.08));
        border: 1px solid rgba(124,58,237,0.4);
        border-radius: 16px;
        padding: clamp(20px, 4vw, 32px);
        text-align: center;
        color: #f4f4f5;
        max-width: 520px;
        margin: 18px auto;
      }
      .mg-icon { font-size: 42px; display: block; }
      .mg-title {
        font-size: 22px; font-weight: 900;
        color: #fde047;
        margin: 10px 0 8px;
      }
      .mg-text {
        margin: 0 0 14px;
        color: #c4b5fd;
        line-height: 1.5;
      }
      .mg-perks {
        list-style: none; padding: 0; margin: 0 0 18px;
        display: flex; flex-direction: column; gap: 4px;
        text-align: left; color: #d6f1ff; font-size: 14px;
      }
      .mg-cta {
        display: inline-flex; align-items: center; justify-content: center;
        min-height: 50px; padding: 0 24px;
        background: linear-gradient(135deg, #00E5FF, #A56BFF);
        color: #0f0a1e;
        font-weight: 900; font-size: 15px;
        border: none; border-radius: 12px;
        text-decoration: none;
        cursor: pointer;
      }
      .mg-cta:hover { transform: translateY(-1px); }
      .mg-fine { margin-top: 10px; color: #64748b; font-size: 11px; }
      .mg-attempts { font-size: 12px; color: #94a3b8; margin: 0 0 14px; }
    `}</style>
  )
}
