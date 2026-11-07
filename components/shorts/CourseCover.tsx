import type { CSSProperties } from 'react'

/**
 * Cover art for a Quick Lessons mini-course.
 *
 * Drawn as inline SVG rather than shipped as images: five covers cost zero
 * network requests, scale to any size without a blurry upscale, and can never
 * fall out of sync with the course list. A YouTube thumbnail cropped into a
 * card was doing this job before, which made five different courses look like
 * five random videos.
 *
 * One system, five accents — consistent enough to read as a set, distinct
 * enough to tell apart at a glance.
 */

export const COURSE_ACCENT: Record<string, { from: string; to: string; ink: string }> = {
  senses: { from: '#8FD8FF', to: '#2563EB', ink: '#06121F' },
  motion: { from: '#FC6818', to: '#B2410B', ink: '#1A0A02' },
  control: { from: '#F0C028', to: '#C2820A', ink: '#1A1402' },
  hands: { from: '#4ADE80', to: '#15803D', ink: '#03130A' },
  work: { from: '#C084FC', to: '#7C3AED', ink: '#120320' },
}

const FALLBACK = { from: '#FC6818', to: '#B2410B', ink: '#1A0A02' }

export function CourseCover({
  slug,
  icon,
  index,
  title,
  className,
  style,
}: {
  slug: string
  icon: string
  index: number
  title: string
  className?: string
  style?: CSSProperties
}) {
  const a = COURSE_ACCENT[slug] ?? FALLBACK
  const gid = `cc-${slug}`

  return (
    <svg
      viewBox="0 0 320 180"
      role="img"
      aria-label={`${title} — course ${index}`}
      className={className}
      style={style}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`${gid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={a.from} />
          <stop offset="100%" stopColor={a.to} />
        </linearGradient>
        <radialGradient id={`${gid}-glow`} cx="78%" cy="18%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <pattern id={`${gid}-grid`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke={a.ink} strokeOpacity="0.14" strokeWidth="1" />
        </pattern>
      </defs>

      <rect width="320" height="180" fill={`url(#${gid}-bg)`} />
      <rect width="320" height="180" fill={`url(#${gid}-grid)`} />
      <rect width="320" height="180" fill={`url(#${gid}-glow)`} />

      {/* Diagonal band: the one shape every cover shares. */}
      <path d="M-20 150 L120 10 L170 10 L30 150 Z" fill={a.ink} fillOpacity="0.16" />
      <path d="M40 180 L180 40 L210 40 L70 180 Z" fill="#ffffff" fillOpacity="0.1" />

      <text
        x="24"
        y="52"
        fontSize="15"
        fontWeight="800"
        letterSpacing="3"
        fill={a.ink}
        fillOpacity="0.75"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        COURSE {index}
      </text>
      <text x="232" y="128" fontSize="76" textAnchor="middle" dominantBaseline="middle">
        {icon}
      </text>
      <text
        x="24"
        y="150"
        fontSize="13"
        fontWeight="700"
        fill={a.ink}
        fillOpacity="0.85"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        ONE MINUTE EACH
      </text>
    </svg>
  )
}
