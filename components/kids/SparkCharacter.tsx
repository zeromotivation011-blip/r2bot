'use client'

// components/kids/SparkCharacter.tsx
// The hero of Robot World. An inline SVG robot that adopts a mood,
// animates via shared keyframes in kids-animations.css, and shows a talking
// mouth when `speaking` is true. Tap to repeat the last line.

import { useCallback } from 'react'
import { repeatLastSparkLine } from '@/lib/kids-audio'

export type SparkMood =
  | 'idle'
  | 'talking'
  | 'happy'
  | 'thinking'
  | 'celebrating'
  | 'oops'
  | 'proud'
  | 'surprised'

interface SparkProps {
  mood?: SparkMood
  size?: number
  speaking?: boolean
  onClick?: () => void
  label?: string
  className?: string
  style?: React.CSSProperties
}

const MOOD_CLASS: Record<SparkMood, string> = {
  idle:        'spark-mood-idle',
  talking:     'spark-mood-idle', // gentle breathe while talking; mouth handles motion
  happy:       'spark-mood-happy',
  thinking:    'spark-mood-thinking',
  celebrating: 'spark-mood-celebrating',
  oops:        'spark-mood-oops',
  proud:       'spark-mood-proud',
  surprised:   'spark-mood-surprised',
}

export function SparkCharacter({
  mood = 'idle',
  size = 120,
  speaking = false,
  onClick,
  label = 'Spark — tap to hear that again',
  className,
  style,
}: SparkProps) {
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick()
    } else {
      repeatLastSparkLine()
    }
  }, [onClick])

  const eyesWide = mood === 'surprised' || mood === 'celebrating'
  const eyesClosed = mood === 'happy'
  const showQuestion = mood === 'thinking'

  return (
    <button
      type="button"
      aria-label={label}
      onClick={handleClick}
      className={className}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        ...style,
      }}
    >
      <span
        className={MOOD_CLASS[mood]}
        style={{
          display: 'inline-block',
          width: size,
          height: size * 1.1,
          position: 'relative',
        }}
      >
        {/* Floating question mark when thinking */}
        {showQuestion && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: -10,
              right: size * 0.12,
              fontSize: size * 0.28,
              fontWeight: 900,
              color: '#fbbf24',
              textShadow: '0 2px 6px rgba(0,0,0,0.4)',
              animation: 'spark-question-float 1.6s ease-in-out infinite',
            }}
          >
            ?
          </span>
        )}

        <svg
          viewBox="0 0 200 220"
          width={size}
          height={size * 1.1}
          aria-hidden="true"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="spark-body" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="spark-body-orange" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
            <radialGradient id="spark-eye" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fffbe6" />
              <stop offset="65%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#f59e0b" />
            </radialGradient>
            <filter id="spark-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Antenna */}
          <line x1="100" y1="8"  x2="100" y2="32" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
          <circle cx="100" cy="6" r="8" fill="#fde047" filter="url(#spark-glow)" />

          {/* Head */}
          <rect x="34" y="32" width="132" height="98" rx="22" fill="url(#spark-body)" stroke="#1e3a8a" strokeWidth="3" />
          {/* Face screen */}
          <rect x="46" y="46" width="108" height="64" rx="14" fill="#0f0a1e" />

          {/* Eyes — drawn as a group so we can swap shapes per mood */}
          {eyesClosed ? (
            <g stroke="#fde047" strokeWidth="4" strokeLinecap="round" fill="none">
              <path d="M64 74 Q74 84 84 74" />
              <path d="M116 74 Q126 84 136 74" />
            </g>
          ) : (
            <g>
              <circle cx="74"  cy="78" r={eyesWide ? 14 : 11} fill="url(#spark-eye)" />
              <circle cx="126" cy="78" r={eyesWide ? 14 : 11} fill="url(#spark-eye)" />
              <circle cx="78"  cy="74" r="3" fill="#0f0a1e" />
              <circle cx="130" cy="74" r="3" fill="#0f0a1e" />
              {/* Sparkle glints */}
              <circle cx="70" cy="74" r="1.6" fill="#ffffff" opacity="0.9" />
              <circle cx="122" cy="74" r="1.6" fill="#ffffff" opacity="0.9" />
            </g>
          )}

          {/* Cheeks for celebrating/proud */}
          {(mood === 'celebrating' || mood === 'proud' || mood === 'happy') && (
            <g opacity="0.7">
              <ellipse cx="60"  cy="100" rx="9" ry="5" fill="#fb7185" />
              <ellipse cx="140" cy="100" rx="9" ry="5" fill="#fb7185" />
            </g>
          )}

          {/* Mouth — talking class animates scaleY */}
          <g transform="translate(100 102)">
            <g className={speaking ? 'spark-mouth-talking' : ''}>
              {mood === 'oops' ? (
                <path d="M-16 6 Q0 -4 16 6" stroke="#fde047" strokeWidth="4" fill="none" strokeLinecap="round" />
              ) : mood === 'surprised' ? (
                <ellipse cx="0" cy="6" rx="9" ry="11" fill="#0f0a1e" stroke="#fde047" strokeWidth="3" />
              ) : speaking ? (
                <ellipse cx="0" cy="4" rx="14" ry="9" fill="#0f0a1e" stroke="#fde047" strokeWidth="3" />
              ) : (
                <path d="M-18 0 Q0 16 18 0" stroke="#fde047" strokeWidth="4" fill="none" strokeLinecap="round" />
              )}
            </g>
          </g>

          {/* Body */}
          <rect x="46" y="134" width="108" height="62" rx="14" fill="url(#spark-body-orange)" stroke="#9a3412" strokeWidth="3" />
          {/* Chest panel */}
          <rect x="70" y="148" width="60" height="32" rx="6" fill="#0f0a1e" />
          {/* Status LEDs */}
          <circle cx="84" cy="164" r="3.5" fill="#fde047">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="1.4s" repeatCount="indefinite" />
          </circle>
          <circle cx="100" cy="164" r="3.5" fill="#10b981">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="1.7s" repeatCount="indefinite" />
          </circle>
          <circle cx="116" cy="164" r="3.5" fill="#3b82f6">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2.1s" repeatCount="indefinite" />
          </circle>

          {/* Arms — go up for celebrating */}
          {mood === 'celebrating' ? (
            <g>
              <rect x="18"  y="116" width="22" height="42" rx="11" fill="#3b82f6" transform="rotate(-30 29 137)" />
              <rect x="160" y="116" width="22" height="42" rx="11" fill="#3b82f6" transform="rotate(30 171 137)" />
              <circle cx="22"  cy="116" r="9" fill="#fbbf24" />
              <circle cx="178" cy="116" r="9" fill="#fbbf24" />
            </g>
          ) : (
            <g>
              <rect x="18"  y="146" width="22" height="36" rx="10" fill="#3b82f6" />
              <rect x="160" y="146" width="22" height="36" rx="10" fill="#3b82f6" />
              <circle cx="29"  cy="186" r="8" fill="#fbbf24" />
              <circle cx="171" cy="186" r="8" fill="#fbbf24" />
            </g>
          )}
        </svg>
      </span>
    </button>
  )
}

export default SparkCharacter
