// components/kids/activities/templates/spot-in-scene/glyphs.tsx
// Small vector glyphs for robots and sensors that have no emoji (robot vacuum,
// lidar, radar…). Content authors write `icon: 'svg:lidar'`; anything else is
// drawn as text (emoji). Used by spot-in-scene, robot-match, estimate and
// classify-sort. Pure SVG — no hooks, safe in any client component.

import type { ReactElement } from 'react'

const INK = '#0A1120'

/** Shapes drawn in a 100 × 100 box. */
const SHAPES: Record<string, ReactElement> = {
  vacuum: (
    <g>
      <ellipse cx="50" cy="62" rx="44" ry="20" fill="#2A3A5C" />
      <ellipse cx="50" cy="54" rx="44" ry="20" fill="#C9D4E5" />
      <ellipse cx="50" cy="52" rx="16" ry="7" fill="#19263F" />
      <circle cx="50" cy="52" r="3" fill="#22C55E" />
      <rect x="18" y="58" width="12" height="5" rx="2" fill="#FC6818" />
    </g>
  ),
  mower: (
    <g>
      <path d="M10 64 Q14 30 50 28 Q86 30 90 64 Z" fill="#22C55E" />
      <rect x="10" y="60" width="80" height="10" rx="4" fill="#15803D" />
      <circle cx="24" cy="74" r="10" fill={INK} />
      <circle cx="76" cy="74" r="10" fill={INK} />
      <rect x="40" y="34" width="20" height="8" rx="3" fill="#C9D4E5" />
    </g>
  ),
  lidar: (
    <g>
      <rect x="22" y="58" width="56" height="16" rx="4" fill="#2A3A5C" />
      <rect x="30" y="22" width="40" height="38" rx="10" fill="#C9D4E5" />
      <rect x="30" y="36" width="40" height="10" fill="#00B8D4" />
      <path d="M72 41 L96 30 M72 41 L98 41 M72 41 L96 52" stroke="#00E5FF" strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  camera: (
    <g>
      <rect x="14" y="30" width="72" height="44" rx="10" fill="#2A3A5C" />
      <circle cx="50" cy="52" r="17" fill="#C9D4E5" />
      <circle cx="50" cy="52" r="10" fill={INK} />
      <circle cx="54" cy="48" r="3" fill="#EEF2F8" />
      <rect x="22" y="22" width="18" height="10" rx="3" fill="#2A3A5C" />
    </g>
  ),
  radar: (
    <g>
      <rect x="20" y="26" width="60" height="48" rx="8" fill="#2A3A5C" />
      <path d="M36 60 A16 16 0 0 1 64 60" stroke="#FF8A4C" strokeWidth="5" fill="none" />
      <path d="M28 52 A26 26 0 0 1 72 52" stroke="#FF8A4C" strokeWidth="5" fill="none" />
      <circle cx="50" cy="64" r="5" fill="#FF8A4C" />
    </g>
  ),
  ultrasonic: (
    <g>
      <rect x="10" y="34" width="80" height="32" rx="16" fill="#2A3A5C" />
      <circle cx="32" cy="50" r="11" fill="#C9D4E5" />
      <circle cx="68" cy="50" r="11" fill="#C9D4E5" />
      <circle cx="32" cy="50" r="5" fill={INK} />
      <circle cx="68" cy="50" r="5" fill={INK} />
    </g>
  ),
  car: (
    <g>
      <path d="M6 66 L10 50 Q14 44 24 42 L34 26 Q38 20 46 20 L66 20 Q74 20 78 28 L86 42 Q94 44 95 52 L96 66 Z" fill="#3B82F6" />
      <path d="M38 28 L46 24 L62 24 L70 30 L74 42 L32 42 Z" fill="#9CC3F5" opacity="0.85" />
      <rect x="6" y="60" width="90" height="8" rx="3" fill="#1E40AF" />
      <circle cx="26" cy="68" r="10" fill={INK} />
      <circle cx="78" cy="68" r="10" fill={INK} />
      <circle cx="26" cy="68" r="4" fill="#6E7888" />
      <circle cx="78" cy="68" r="4" fill="#6E7888" />
    </g>
  ),
  amr: (
    <g>
      <rect x="12" y="40" width="76" height="26" rx="6" fill="#FC6818" />
      <rect x="20" y="30" width="60" height="12" rx="3" fill="#C9D4E5" />
      <rect x="40" y="46" width="20" height="8" rx="2" fill={INK} />
      <circle cx="26" cy="70" r="7" fill={INK} />
      <circle cx="74" cy="70" r="7" fill={INK} />
    </g>
  ),
  dock: (
    <g>
      <rect x="22" y="20" width="56" height="58" rx="10" fill="#2A3A5C" />
      <path d="M54 30 L40 54 H52 L46 70 L62 44 H50 Z" fill="#FFD166" />
      <rect x="14" y="76" width="72" height="8" rx="3" fill="#6E7888" />
    </g>
  ),
  arm: (
    <g>
      <rect x="20" y="78" width="40" height="10" rx="3" fill="#2A3A5C" />
      <path d="M40 78 L40 52 L70 30" stroke="#FC6818" strokeWidth="10" strokeLinecap="round" fill="none" />
      <circle cx="40" cy="52" r="7" fill="#C9D4E5" />
      <path d="M70 30 L84 22 M70 30 L82 40" stroke="#C9D4E5" strokeWidth="5" strokeLinecap="round" />
    </g>
  ),
  drone: (
    <g>
      <path d="M22 30 L78 70 M78 30 L22 70" stroke="#2A3A5C" strokeWidth="7" />
      <rect x="38" y="40" width="24" height="20" rx="5" fill="#FC6818" />
      {[
        [22, 30],
        [78, 30],
        [22, 70],
        [78, 70],
      ].map(([x, y]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="16" ry="5" fill="#C9D4E5" opacity="0.8" />
      ))}
    </g>
  ),
}

export function isVectorGlyph(icon: string): boolean {
  return icon.startsWith('svg:') && icon.slice(4) in SHAPES
}

/** Draw an icon centred at (x, y) with the given size, inside an existing <svg>. */
export function Glyph({ icon, x, y, size }: { icon: string; x: number; y: number; size: number }) {
  if (isVectorGlyph(icon)) {
    const s = size / 100
    return <g transform={`translate(${x - size / 2} ${y - size / 2}) scale(${s})`}>{SHAPES[icon.slice(4)]}</g>
  }
  return (
    <text x={x} y={y} fontSize={size * 0.82} textAnchor="middle" dominantBaseline="central" style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>
      {icon}
    </text>
  )
}

/** The same icon for HTML layouts (cards, chips). `px` is the box size. */
export function IconBox({ icon, px, label }: { icon: string; px: number; label?: string }) {
  if (isVectorGlyph(icon))
    return (
      <svg width={px} height={px} viewBox="0 0 100 100" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} className="inline-block shrink-0">
        {SHAPES[icon.slice(4)]}
      </svg>
    )
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center leading-none" style={{ width: px, height: px, fontSize: px * 0.8 }}>
      {icon}
    </span>
  )
}
