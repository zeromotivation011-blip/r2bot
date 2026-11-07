import type { CSSProperties } from 'react'

/**
 * Cover art for a video course.
 *
 * The course path read as a list of text blocks — no course had a face, so
 * nothing on /courses looked like a course. These are drawn as inline SVG for
 * the same reasons as the Quick Lesson covers: no network requests, sharp at
 * any size, and impossible to leave stale when a course changes.
 *
 * One system, five identities: a shared diagonal structure and grid, with a
 * per-course palette and motif so the five read as a series you move through
 * rather than five unrelated things.
 */

type Art = { from: string; to: string; ink: string; motif: 'loop' | 'wheels' | 'arm' | 'lens' | 'map' }

const ART: Record<string, Art> = {
  'robotics-foundations': { from: '#FC6818', to: '#9A3412', ink: '#1A0A02', motif: 'loop' },
  'build-your-first-robot-pip': { from: '#F0C028', to: '#A16207', ink: '#1A1402', motif: 'wheels' },
  'robot-arms-build-ari': { from: '#4ADE80', to: '#15803D', ink: '#03130A', motif: 'arm' },
  'robot-vision': { from: '#8FD8FF', to: '#1D4ED8', ink: '#06121F', motif: 'lens' },
  'robot-intelligence': { from: '#C084FC', to: '#6D28D9', ink: '#120320', motif: 'map' },
}

const FALLBACK: Art = { from: '#FC6818', to: '#9A3412', ink: '#1A0A02', motif: 'loop' }

function Motif({ kind, ink }: { kind: Art['motif']; ink: string }) {
  const stroke = { stroke: ink, strokeOpacity: 0.5, strokeWidth: 5, fill: 'none' } as const
  switch (kind) {
    case 'wheels':
      return (
        <g {...stroke}>
          <circle cx="300" cy="150" r="34" />
          <circle cx="392" cy="150" r="34" />
          <path d="M300 116h92" />
        </g>
      )
    case 'arm':
      return (
        <g {...stroke}>
          <path d="M292 190 L292 140 L348 104 L404 128" />
          <circle cx="292" cy="190" r="9" fill={ink} fillOpacity="0.5" />
          <circle cx="292" cy="140" r="9" fill={ink} fillOpacity="0.5" />
          <circle cx="348" cy="104" r="9" fill={ink} fillOpacity="0.5" />
          <path d="M404 112v32" />
        </g>
      )
    case 'lens':
      return (
        <g {...stroke}>
          <rect x="280" y="112" width="120" height="80" rx="12" />
          <circle cx="340" cy="152" r="26" />
          <circle cx="340" cy="152" r="9" fill={ink} fillOpacity="0.5" />
        </g>
      )
    case 'map':
      return (
        <g {...stroke}>
          <path d="M276 196 L320 120 L356 164 L404 104" />
          <circle cx="276" cy="196" r="8" fill={ink} fillOpacity="0.5" />
          <circle cx="404" cy="104" r="8" fill={ink} fillOpacity="0.5" />
          <path d="M276 196h128" strokeOpacity="0.2" strokeDasharray="8 8" />
        </g>
      )
    default:
      return (
        <g {...stroke}>
          <path d="M288 152a52 52 0 1 1 52 52" />
          <path d="M326 192l14 12-14 12" />
          <circle cx="340" cy="152" r="12" fill={ink} fillOpacity="0.5" />
        </g>
      )
  }
}

export function CourseArt({
  slug,
  order,
  title,
  className,
  style,
}: {
  slug: string
  order: number
  title: string
  className?: string
  style?: CSSProperties
}) {
  const a = ART[slug] ?? FALLBACK
  const id = `ca-${slug}`

  return (
    <svg
      viewBox="0 0 480 270"
      role="img"
      aria-label={`${title} — course ${order}`}
      className={className}
      style={style}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={a.from} />
          <stop offset="100%" stopColor={a.to} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="20%" cy="12%" r="80%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <pattern id={`${id}-grid`} width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke={a.ink} strokeOpacity="0.13" strokeWidth="1" />
        </pattern>
      </defs>

      <rect width="480" height="270" fill={`url(#${id}-bg)`} />
      <rect width="480" height="270" fill={`url(#${id}-grid)`} />
      <rect width="480" height="270" fill={`url(#${id}-glow)`} />
      <path d="M-30 270 L150 30 L210 30 L30 270 Z" fill={a.ink} fillOpacity="0.15" />

      <text
        x="36"
        y="76"
        fontSize="17"
        fontWeight="800"
        letterSpacing="5"
        fill={a.ink}
        fillOpacity="0.7"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        COURSE {order}
      </text>
      <text
        x="36"
        y="128"
        fontSize="40"
        fontWeight="900"
        fill={a.ink}
        fillOpacity="0.92"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        R2BOT
      </text>
      <text
        x="36"
        y="222"
        fontSize="15"
        fontWeight="700"
        letterSpacing="1"
        fill={a.ink}
        fillOpacity="0.75"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        FREE · QUIZZES · CERTIFICATE
      </text>

      <Motif kind={a.motif} ink={a.ink} />
    </svg>
  )
}
