'use client'

// components/academy/LessonComplete.tsx
// Full-screen celebration overlay after a lesson, module, or course completes.
// Animates XP roll-up, sprays confetti, surfaces next-lesson action.

import Link from 'next/link'
import { useEffect, useState } from 'react'

export type CompleteVariant = 'lesson' | 'module' | 'course'

interface LessonCompleteProps {
  variant?: CompleteVariant
  xpAdded: number
  totalXpAfter?: number
  lessonTitle?: string
  objectives?: string[]
  certCode?: string                     // course variant: cert id e.g. R2B-2026-SP-001234
  rewardPart?: { name: string; emoji?: string }   // module variant: robot part awarded
  nextLessonHref?: string | null
  backToCourseHref: string
  onClose?: () => void
}

export function LessonComplete({
  variant = 'lesson',
  xpAdded,
  totalXpAfter,
  lessonTitle,
  objectives = [],
  certCode,
  rewardPart,
  nextLessonHref,
  backToCourseHref,
  onClose,
}: LessonCompleteProps) {
  const [xpDisplayed, setXpDisplayed] = useState(0)

  // XP roll-up animation
  useEffect(() => {
    if (xpAdded <= 0) {
      setXpDisplayed(0)
      return
    }
    const start = performance.now()
    const dur = Math.min(1800, 700 + xpAdded * 2)
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - t, 3)
      setXpDisplayed(Math.round(xpAdded * eased))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [xpAdded])

  // ESC closes
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const headline =
    variant === 'course'
      ? '🎉 Course Complete!'
      : variant === 'module'
        ? '⚡ Module Complete!'
        : 'Lesson Complete!'

  return (
    <div className="lc-overlay" role="dialog" aria-modal="true">
      <ConfettiBurst />
      <button type="button" onClick={onClose} className="lc-close" aria-label="Close">×</button>

      <div className="lc-card">
        <h1 className="lc-h1">{headline}</h1>

        {lessonTitle && <p className="lc-subtitle">{lessonTitle}</p>}

        <div className="lc-xp">
          <span className="lc-xp-plus">+</span>
          <span className="lc-xp-num">{xpDisplayed}</span>
          <span className="lc-xp-label">XP</span>
        </div>
        {typeof totalXpAfter === 'number' && (
          <p className="lc-xp-total">Total: {totalXpAfter} XP</p>
        )}

        {objectives.length > 0 && (
          <section className="lc-skills">
            <p className="lc-skills-label">You can now:</p>
            <ul>
              {objectives.map((o, i) => (
                <li key={i}><span aria-hidden>✓</span>{o}</li>
              ))}
            </ul>
          </section>
        )}

        {rewardPart && variant === 'module' && (
          <section className="lc-reward">
            <p className="lc-reward-label">🔧 Robot part unlocked</p>
            <div className="lc-reward-card">
              <span className="lc-reward-emoji">{rewardPart.emoji ?? '🤖'}</span>
              <span className="lc-reward-name">{rewardPart.name}</span>
            </div>
          </section>
        )}

        {certCode && variant === 'course' && (
          <section className="lc-cert">
            <p className="lc-cert-label">🏆 Certificate issued</p>
            <p className="lc-cert-code">{certCode}</p>
            <Link href={`/certificates/${certCode}`} className="lc-cert-link">
              View certificate →
            </Link>
          </section>
        )}

        <div className="lc-actions">
          <Link href={backToCourseHref} className="lc-secondary">
            ← Course outline
          </Link>
          {nextLessonHref && (
            <Link href={nextLessonHref} className="lc-primary">
              Next lesson →
            </Link>
          )}
        </div>
      </div>

      <style jsx>{`
        .lc-overlay {
          position: fixed; inset: 0; z-index: 200;
          display: grid; place-items: center;
          background: radial-gradient(circle at 50% 30%, rgba(16,185,129,0.15), rgba(15,10,30,0.95));
          backdrop-filter: blur(8px);
          padding: 18px;
          animation: lc-fade 0.3s ease-out;
        }
        @keyframes lc-fade { from { opacity: 0 } to { opacity: 1 } }
        .lc-close {
          position: absolute; top: 18px; right: 22px;
          width: 40px; height: 40px;
          background: rgba(255,255,255,0.08);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 50%;
          font-size: 22px; font-weight: 900;
          cursor: pointer;
        }
        .lc-card {
          background: linear-gradient(135deg, rgba(26,16,64,0.95), rgba(15,10,30,0.95));
          border: 1px solid rgba(124,58,237,0.4);
          border-radius: 24px;
          padding: clamp(26px, 4vw, 48px);
          max-width: 520px;
          width: 100%;
          text-align: center;
          color: #f4f4f5;
          animation: lc-pop 0.45s cubic-bezier(.22,.61,.36,1);
        }
        @keyframes lc-pop {
          from { transform: scale(0.85); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        .lc-h1 {
          font-size: clamp(28px, 5vw, 42px);
          font-weight: 900;
          color: #fde047;
          text-shadow: 0 0 30px rgba(253,224,71,0.5);
          margin: 0 0 6px;
        }
        .lc-subtitle { color: #c4b5fd; margin: 0 0 20px; font-size: 15px; }
        .lc-xp {
          display: flex; align-items: baseline; justify-content: center;
          gap: 6px; margin-bottom: 4px;
        }
        .lc-xp-plus, .lc-xp-num {
          font-size: clamp(48px, 9vw, 72px); font-weight: 900;
          background: linear-gradient(135deg, #fbbf24, #f97316);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .lc-xp-label {
          font-size: 18px; font-weight: 800; color: #fbbf24;
        }
        .lc-xp-total { color: #94a3b8; font-size: 13px; margin: 0 0 18px; }
        .lc-skills {
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.25);
          border-radius: 14px;
          padding: 14px 18px;
          margin-bottom: 18px;
          text-align: left;
        }
        .lc-skills-label {
          font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
          color: #10b981; font-weight: 900; margin: 0 0 8px;
        }
        .lc-skills ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 5px; }
        .lc-skills li {
          display: flex; gap: 10px; align-items: flex-start;
          color: #d1fae5; font-size: 14px;
        }
        .lc-skills li span { color: #10b981; font-weight: 900; }
        .lc-reward, .lc-cert {
          background: rgba(251,191,36,0.1);
          border: 1px solid rgba(251,191,36,0.3);
          border-radius: 14px;
          padding: 14px 18px;
          margin-bottom: 18px;
        }
        .lc-reward-label, .lc-cert-label {
          font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
          color: #fbbf24; font-weight: 900; margin: 0 0 10px;
        }
        .lc-reward-card {
          display: flex; gap: 14px; align-items: center; justify-content: center;
        }
        .lc-reward-emoji { font-size: 40px; }
        .lc-reward-name { font-size: 18px; font-weight: 900; color: #fde047; }
        .lc-cert-code {
          font-family: monospace; font-weight: 900; font-size: 16px;
          color: #fde047; margin: 0 0 8px;
        }
        .lc-cert-link {
          display: inline-block;
          padding: 8px 16px;
          background: linear-gradient(135deg, #fbbf24, #f97316);
          color: #0f0a1e;
          border-radius: 999px;
          font-weight: 900; font-size: 14px;
          text-decoration: none;
        }
        .lc-actions {
          display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;
        }
        .lc-primary, .lc-secondary {
          min-height: 50px; padding: 0 22px;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: 12px;
          font-weight: 900; font-size: 15px;
          text-decoration: none;
        }
        .lc-primary {
          background: linear-gradient(135deg, #00E5FF, #A56BFF);
          color: #0f0a1e;
        }
        .lc-secondary {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.15);
          color: #c4b5fd;
        }
      `}</style>
    </div>
  )
}

function ConfettiBurst() {
  const colours = ['#FBBF24', '#10B981', '#00E5FF', '#A56BFF', '#F97316', '#EF4444']
  return (
    <div className="cf" aria-hidden>
      {Array.from({ length: 50 }).map((_, i) => (
        <span
          key={i}
          style={{
            left: `${Math.random() * 100}%`,
            background: colours[i % colours.length],
            width: 8 + Math.random() * 6,
            height: 8 + Math.random() * 14,
            animationDelay: `${Math.random() * 0.4}s`,
            animationDuration: `${1.8 + Math.random() * 1.4}s`,
            ['--cf-dx' as keyof React.CSSProperties as string]: `${(Math.random() - 0.5) * 180}px`,
          }}
        />
      ))}
      <style jsx>{`
        .cf { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
        .cf span {
          position: absolute; top: -10px;
          border-radius: 2px;
          opacity: 0.95;
          animation: cf-fall var(--dur) ease-out forwards;
        }
        @keyframes cf-fall {
          0%   { transform: translate3d(0, -20px, 0) rotate(0); opacity: 1; }
          100% { transform: translate3d(var(--cf-dx, 0), 100vh, 0) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
