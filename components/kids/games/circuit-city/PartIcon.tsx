// components/kids/games/circuit-city/PartIcon.tsx
// Small original SVG icons for the parts palette. Server-safe (no hooks).

import type { PartKind } from './circuit'

export type ToolKind = PartKind | 'select' | 'probe'

export default function PartIcon({ kind, className = 'h-7 w-7' }: { kind: ToolKind; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      {icon(kind)}
    </svg>
  )
}

function icon(kind: ToolKind) {
  switch (kind) {
    case 'select':
      return <path d="M8 4 L8 26 L14 20 L18 28 L22 26 L18 18 L26 18 Z" fill="#EEF2F8" />
    case 'probe':
      return (
        <g>
          <rect x="6" y="3" width="20" height="18" rx="3" fill="#facc15" />
          <rect x="9" y="6" width="14" height="7" rx="1.5" fill="#1a2e05" />
          <path d="M12 21 L8 30 M20 21 L24 30" stroke="#ef4444" strokeWidth="2.5" />
        </g>
      )
    case 'wire':
      return <path d="M4 24 C 12 24, 12 8, 20 8 S 28 8, 28 8" stroke="#38bdf8" strokeWidth="4" fill="none" strokeLinecap="round" />
    case 'battery':
      return (
        <g>
          <rect x="4" y="10" width="22" height="12" rx="3" fill="#1c2840" stroke="#94a3b8" />
          <rect x="4" y="10" width="7" height="12" rx="2" fill="#FC6818" />
          <rect x="26" y="13" width="3" height="6" fill="#94a3b8" />
        </g>
      )
    case 'switch':
      return (
        <g>
          <circle cx="7" cy="20" r="3" fill="#cbd5e1" />
          <circle cx="25" cy="20" r="3" fill="#cbd5e1" />
          <path d="M7 20 L24 11" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      )
    case 'button':
      return (
        <g>
          <rect x="5" y="18" width="22" height="8" rx="2" fill="#334155" />
          <circle cx="16" cy="15" r="7" fill="#ef4444" />
        </g>
      )
    case 'led':
      return (
        <g>
          <path d="M12 22 L12 30 M20 22 L20 28" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M9 22 L9 13 A7 7 0 0 1 23 13 L23 22 Z" fill="#ff4b3e" />
          <text x="5" y="10" fontSize="9" fontWeight="900" fill="#ffa878">
            +
          </text>
        </g>
      )
    case 'lamp':
      return (
        <g>
          <rect x="14" y="10" width="4" height="20" fill="#64748b" />
          <rect x="6" y="6" width="16" height="5" rx="2" fill="#94a3b8" />
          <circle cx="10" cy="13" r="4" fill="#ffd36b" />
        </g>
      )
    case 'resistor':
      return (
        <g>
          <path d="M2 16 H30" stroke="#cbd5e1" strokeWidth="2" />
          <rect x="7" y="11" width="18" height="10" rx="5" fill="#e3c48d" />
          <rect x="11" y="11" width="2" height="10" fill="#e11d1d" />
          <rect x="15" y="11" width="2" height="10" fill="#e11d1d" />
          <rect x="19" y="11" width="2" height="10" fill="#7a3f12" />
        </g>
      )
    case 'motor':
      return (
        <g>
          <circle cx="16" cy="16" r="11" fill="#64748b" />
          <path d="M16 16 L16 7 M16 16 L24 21 M16 16 L8 21" stroke="#FC6818" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      )
    case 'buzzer':
      return (
        <g>
          <circle cx="13" cy="16" r="9" fill="#111827" stroke="#475569" strokeWidth="2" />
          <path d="M24 10 Q28 16 24 22" stroke="#22d3ee" strokeWidth="2" fill="none" />
        </g>
      )
    case 'ldr':
      return (
        <g>
          <circle cx="16" cy="16" r="10" fill="#f8fafc" />
          <path d="M11 10 L21 12 L11 15 L21 18 L11 21" stroke="#c2410c" strokeWidth="2" fill="none" />
          <path d="M26 3 L22 8 M30 7 L25 11" stroke="#facc15" strokeWidth="2" />
        </g>
      )
    case 'comparator':
      return (
        <g>
          <rect x="4" y="8" width="24" height="16" rx="3" fill="#0b1220" stroke="#22d3ee" strokeWidth="1.5" />
          <path d="M11 11 L19 16 L11 21 Z" fill="#67e8f9" />
          <circle cx="23" cy="16" r="2" fill="#22c55e" />
        </g>
      )
  }
}
