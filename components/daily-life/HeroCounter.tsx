'use client'

// components/daily-life/HeroCounter.tsx
// Hero section: animated 0 → 47 counter on mount, "Show me how" CTA.

import { useEffect, useState } from 'react'

export function HeroCounter({ total = 47, onShowMe }: { total?: number; onShowMe?: () => void }) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let raf = 0
    const dur = 2400
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(total * eased))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [total])

  return (
    <section className="hc">
      <div className="hc-icons" aria-hidden>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className="hc-icon"
            style={{
              animationDelay: `${(i / total) * 2.4}s`,
              left: `${(i * 137) % 100}%`,
              top: `${(i * 53) % 100}%`,
            }}
          >🤖</span>
        ))}
      </div>
      <p className="hc-eyebrow">Today, in your day</p>
      <div className="hc-counter">
        <span className="hc-counter-num" key={value}>{value}</span>
      </div>
      <p className="hc-headline">
        <strong>ROBOTS</strong> help you every single day
      </p>
      <p className="hc-sub">You just don&apos;t notice them.</p>
      <button
        type="button"
        onClick={onShowMe}
        className="hc-cta"
      >
        ▶ Show me how
      </button>
      <style jsx>{`
        .hc {
          position: relative;
          text-align: center;
          padding: 60px 20px 50px;
          overflow: hidden;
          color: #fff;
          background: radial-gradient(circle at 50% 0%, rgba(245,158,11,0.18), transparent 60%);
        }
        .hc-icons {
          position: absolute; inset: 0;
          pointer-events: none;
          opacity: 0.15;
        }
        .hc-icon {
          position: absolute;
          font-size: 24px;
          animation: hc-pop 2.4s ease-out both;
        }
        @keyframes hc-pop {
          0%   { opacity: 0; transform: scale(0); }
          100% { opacity: 0.55; transform: scale(1); }
        }
        .hc-eyebrow {
          font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
          color: #fbbf24; font-weight: 900; margin: 0 0 10px;
        }
        .hc-counter {
          font-size: clamp(72px, 14vw, 144px);
          font-weight: 900;
          line-height: 1;
          background: linear-gradient(135deg, #fbbf24, #f97316);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-variant-numeric: tabular-nums;
        }
        .hc-counter-num {
          display: inline-block;
          animation: hc-flicker 0.2s ease-out;
        }
        @keyframes hc-flicker {
          from { transform: translateY(-4px); opacity: 0.5; }
          to   { transform: translateY(0); opacity: 1; }
        }
        .hc-headline {
          font-size: clamp(20px, 3vw, 28px);
          font-weight: 800;
          color: #fff;
          margin: 6px 0 4px;
        }
        .hc-headline strong { color: #fde047; }
        .hc-sub {
          color: #c4b5fd;
          font-size: 17px;
          margin: 0 0 22px;
        }
        .hc-cta {
          display: inline-flex; align-items: center; gap: 8px;
          min-height: 54px; padding: 0 26px;
          background: linear-gradient(135deg, #fbbf24, #f97316);
          color: #0a0a16;
          border: none; border-radius: 14px;
          font-weight: 900; font-size: 16px;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(251,191,36,0.4);
        }
        .hc-cta:hover { transform: translateY(-2px); }
      `}</style>
    </section>
  )
}
