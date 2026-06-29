'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SPARK_TIPS } from '@/lib/kids-world-data'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { getProgress } from '@/lib/kids-progress'

export type SparkState = 'idle' | 'happy' | 'thinking' | 'excited' | 'sleeping'

declare global {
  interface Window {
    sparkGuide?: {
      setState: (s: SparkState) => void
      showTip: (text: string) => void
      celebrate: () => void
    }
  }
}

export function SparkGuide() {
  const [state, setState] = useState<SparkState>('idle')
  const [bubble, setBubble] = useState<string | null>(null)
  const [stars, setStars] = useState(0)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track inactivity → sleeping state
  const bumpActivity = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    setState(s => (s === 'sleeping' ? 'idle' : s))
    idleTimer.current = setTimeout(() => setState('sleeping'), 60_000)
  }, [])

  // Public API
  useEffect(() => {
    window.sparkGuide = {
      setState: (s) => { setState(s); bumpActivity() },
      showTip: (text) => {
        setBubble(text)
        if (bubbleTimer.current) clearTimeout(bubbleTimer.current)
        bubbleTimer.current = setTimeout(() => setBubble(null), 6000)
      },
      celebrate: () => {
        setState('excited')
        playSound('star')
        bumpActivity()
        setTimeout(() => setState('happy'), 1500)
      },
    }
    return () => {
      if (window.sparkGuide) delete window.sparkGuide
      if (idleTimer.current) clearTimeout(idleTimer.current)
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current)
    }
  }, [bumpActivity])

  // Read star count + refresh on storage changes
  useEffect(() => {
    const sync = () => setStars(getProgress().totalStars)
    sync()
    const t = setInterval(sync, 1500)
    const onStorage = () => sync()
    window.addEventListener('storage', onStorage)
    return () => { clearInterval(t); window.removeEventListener('storage', onStorage) }
  }, [])

  // Listen to any tap to mark activity
  useEffect(() => {
    bumpActivity()
    const handler = () => bumpActivity()
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [bumpActivity])

  const tapSpark = () => {
    primeAudio()
    playSound('click')
    const tip = SPARK_TIPS[Math.floor(Math.random() * SPARK_TIPS.length)]
    setBubble(tip)
    setState('happy')
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current)
    bubbleTimer.current = setTimeout(() => { setBubble(null); setState('idle') }, 5500)
    bumpActivity()
  }

  return (
    <div
      className="kids-spark-guide"
      aria-label="Spark — your robot guide"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 88,
        zIndex: 60,
      }}
    >
      {bubble && (
        <div className="spark-bubble" role="status">
          <p>{bubble}</p>
          <button className="spark-bubble-close" onClick={() => setBubble(null)} aria-label="Close tip">×</button>
        </div>
      )}

      <button
        type="button"
        onClick={tapSpark}
        className={`spark-btn spark-${state}`}
        aria-label="Spark guide — tap for a tip"
      >
        <SparkSvg state={state} />
        <span className="spark-stars">⭐ {stars}</span>
      </button>

      <style jsx>{`
        :global(:root) {
          --spark-yellow: #FFD700;
          --spark-orange: #FF6B35;
          --spark-purple: #7C3AED;
          --spark-green: #10B981;
          --spark-blue: #3B82F6;
          --spark-red: #EF4444;
          --spark-bg: #0F0A1E;
          --spark-card: #1A1040;
        }
        .spark-btn {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 3px solid var(--spark-yellow);
          background: radial-gradient(circle at 40% 30%, #fff8dc, #fcd34d 60%, #f59e0b);
          box-shadow: 0 6px 25px rgba(245, 158, 11, 0.4), 0 0 30px rgba(252, 211, 77, 0.3);
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }
        .spark-btn:hover { transform: scale(1.06); }
        .spark-btn:active { transform: scale(0.94); }
        .spark-stars {
          position: absolute;
          top: -10px;
          left: -10px;
          background: #1a1040;
          border: 2px solid #f59e0b;
          color: #fde047;
          font-size: 10px;
          font-weight: 900;
          padding: 2px 6px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .spark-idle      { animation: spark-float 2.4s ease-in-out infinite; }
        .spark-happy     { animation: spark-bounce 0.5s ease-in-out infinite; }
        .spark-thinking  { animation: spark-sway 1.8s ease-in-out infinite; }
        .spark-excited   { animation: spark-fastbounce 0.3s ease-in-out infinite; }
        .spark-sleeping  { animation: spark-sleep 4s ease-in-out infinite; }
        @keyframes spark-float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes spark-bounce   { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-10px) scale(1.05)} }
        @keyframes spark-sway     { 0%,100%{transform:rotate(-4deg)} 50%{transform:rotate(4deg)} }
        @keyframes spark-fastbounce { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-14px) scale(1.1)} }
        @keyframes spark-sleep    { 0%,100%{transform:translateY(0); filter:brightness(0.8)} 50%{transform:translateY(2px); filter:brightness(0.85)} }
        .spark-bubble {
          position: absolute;
          right: 92px;
          bottom: 8px;
          width: 240px;
          padding: 10px 30px 10px 12px;
          background: #1a1040;
          border: 2px solid #f59e0b;
          color: #fde68a;
          border-radius: 14px;
          font-size: 13px;
          line-height: 1.4;
          box-shadow: 0 10px 30px rgba(0,0,0,.5);
          animation: bubble-in 0.25s ease-out;
        }
        .spark-bubble::after {
          content: '';
          position: absolute;
          right: -8px;
          bottom: 18px;
          width: 0; height: 0;
          border-top: 8px solid transparent;
          border-bottom: 8px solid transparent;
          border-left: 8px solid #f59e0b;
        }
        .spark-bubble-close {
          position: absolute;
          top: 4px; right: 4px;
          background: transparent;
          color: #fbbf24;
          border: none;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          line-height: 1;
        }
        @keyframes bubble-in { from { opacity:0; transform: translateY(4px) } to { opacity:1; transform: translateY(0) } }
        @media (max-width: 640px) {
          .spark-btn { width: 64px; height: 64px; }
          .spark-bubble { width: 200px; right: 76px; font-size: 12px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .spark-idle, .spark-happy, .spark-thinking, .spark-excited, .spark-sleeping { animation: none; }
        }
      `}</style>
    </div>
  )
}

// Inline SVG robot face — no external image
function SparkSvg({ state }: { state: SparkState }) {
  // eye shape varies by mood
  let eyeY = 18
  let mouth = 'M14 28 Q22 33 30 28'
  if (state === 'thinking') { eyeY = 16; mouth = 'M14 30 L30 30' }
  if (state === 'excited')  { eyeY = 17; mouth = 'M13 27 Q22 36 31 27' }
  if (state === 'sleeping') { eyeY = 22; mouth = 'M16 30 L28 30' }
  const zzz = state === 'sleeping'

  return (
    <svg viewBox="0 0 44 44" width="56" height="56" aria-hidden="true">
      {/* head */}
      <rect x="6" y="8" width="32" height="28" rx="6" fill="#1a1040" stroke="#7c3aed" strokeWidth="1.5" />
      {/* antenna */}
      <line x1="22" y1="4" x2="22" y2="8" stroke="#7c3aed" strokeWidth="2" />
      <circle cx="22" cy="3" r="2" fill="#fde047" />
      {/* screen */}
      <rect x="10" y="13" width="24" height="16" rx="3" fill="#0f0a1e" />
      {/* eyes */}
      {state === 'sleeping' ? (
        <>
          <path d={`M13 ${eyeY} Q16 ${eyeY - 2} 19 ${eyeY}`} stroke="#fde047" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d={`M25 ${eyeY} Q28 ${eyeY - 2} 31 ${eyeY}`} stroke="#fde047" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="16" cy={eyeY} r="2.5" fill="#fde047" />
          <circle cx="28" cy={eyeY} r="2.5" fill="#fde047" />
        </>
      )}
      {/* mouth */}
      <path d={mouth} stroke="#fde047" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* zzz */}
      {zzz && (
        <text x="36" y="14" fontSize="6" fill="#fde047" fontWeight="bold">z</text>
      )}
    </svg>
  )
}
