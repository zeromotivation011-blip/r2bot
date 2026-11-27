// components/kids/portfolio/RobotSketch.tsx
// A small flat drawing of a RobotDesign for portfolio snapshots and print
// (SVG, no canvas, no 3D). Body, drive, head and tool each have a shape;
// colours are the robot's own. Server- or client-safe.

import type { RobotDesign } from '@/lib/kids/robot-design'

export default function RobotSketch({ design, size = 120, title }: { design: RobotDesign; size?: number; title?: string }) {
  const p = design.primary
  const a = design.accent
  const ink = '#0A1120'
  const body = (() => {
    switch (design.body) {
      case 'dome':
        return <path d="M28 70 V52 a22 22 0 0 1 44 0 V70 Z" fill={p} stroke={ink} strokeWidth="2" />
      case 'tall':
        return <rect x="34" y="34" width="32" height="40" rx="6" fill={p} stroke={ink} strokeWidth="2" />
      case 'bug':
        return <ellipse cx="50" cy="58" rx="27" ry="15" fill={p} stroke={ink} strokeWidth="2" />
      default:
        return <rect x="26" y="44" width="48" height="28" rx="6" fill={p} stroke={ink} strokeWidth="2" />
    }
  })()
  const drive = (() => {
    switch (design.drive) {
      case 'wheels4':
        return [22, 40, 60, 78].map((x) => <circle key={x} cx={x} cy="80" r="6" fill={ink} stroke={a} strokeWidth="2" />)
      case 'tracks':
        return <rect x="20" y="74" width="60" height="12" rx="6" fill={ink} stroke={a} strokeWidth="2" />
      case 'legs':
        return [30, 44, 56, 70].map((x, i) => <path key={x} d={`M${x} 72 L${x + (i < 2 ? -6 : 6)} 88`} stroke={ink} strokeWidth="4" strokeLinecap="round" />)
      default:
        return [30, 70].map((x) => <circle key={x} cx={x} cy="80" r="9" fill={ink} stroke={a} strokeWidth="2.5" />)
    }
  })()
  const headTop = design.body === 'tall' ? 34 : design.body === 'dome' ? 30 : design.body === 'bug' ? 43 : 44
  const head = (() => {
    switch (design.head) {
      case 'distance':
        return (
          <g>
            <rect x="36" y={headTop - 14} width="28" height="12" rx="3" fill={a} stroke={ink} strokeWidth="2" />
            <circle cx="44" cy={headTop - 8} r="3.5" fill="#00E5FF" />
            <circle cx="56" cy={headTop - 8} r="3.5" fill="#00E5FF" />
          </g>
        )
      case 'antenna':
        return (
          <g>
            <path d={`M50 ${headTop} V${headTop - 16}`} stroke={ink} strokeWidth="2.5" />
            <circle cx="50" cy={headTop - 18} r="4" fill={a} stroke={ink} strokeWidth="2" />
          </g>
        )
      case 'screen':
        return <rect x="38" y={headTop - 16} width="24" height="15" rx="3" fill="#00B8D4" stroke={ink} strokeWidth="2" />
      default:
        return (
          <g>
            <rect x="40" y={headTop - 15} width="20" height="14" rx="4" fill={a} stroke={ink} strokeWidth="2" />
            <circle cx="50" cy={headTop - 8} r="4.5" fill={ink} />
            <circle cx="50" cy={headTop - 8} r="2" fill="#00E5FF" />
          </g>
        )
    }
  })()
  const tool = (() => {
    switch (design.tool) {
      case 'gripper':
        return <path d="M76 58 H88 M88 58 l6 -6 M88 58 l6 6" stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none" />
      case 'scoop':
        return <path d="M76 62 H86 q8 0 8 -8" stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none" />
      case 'pen':
        return <path d="M76 62 L92 70" stroke={a} strokeWidth="4" strokeLinecap="round" />
      case 'light':
        return <circle cx="84" cy="56" r="5" fill="#FDE047" stroke={ink} strokeWidth="2" />
      default:
        return null
    }
  })()
  return (
    <svg viewBox="0 0 100 96" width={size} height={size * 0.96} role="img" aria-label={title ?? `${design.name || 'Robot'} drawing`}>
      {drive}
      {body}
      {head}
      {tool}
    </svg>
  )
}
