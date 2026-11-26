// components/kids/games/robot-brain/DrawingThumb.tsx
// A drawing as a crisp little SVG (gallery tiles, neighbours, mistakes).
// No hooks, no browser APIs: safe anywhere.

import type { ReactElement } from 'react'
import type { Drawing } from './symbols'

interface Props {
  drawing: Drawing
  size?: number
  color?: string
  className?: string
  label?: string
}

export function DrawingThumb({ drawing, size = 44, color = '#0f172a', className = '', label }: Props) {
  return (
    <svg
      viewBox="0 0 1 1"
      width={size}
      height={size}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {drawing.map((s, i) =>
        s.length === 1 ? (
          <circle key={i} cx={s[0][0]} cy={s[0][1]} r={0.03} fill={color} />
        ) : (
          <polyline
            key={i}
            points={s.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={0.06}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ),
      )}
    </svg>
  )
}

/** The robot's view: a grid of ink squares. */
export function GridView({ grid, n, size = 96, color = '#22d3ee' }: { grid: Float32Array; n: number; size?: number; color?: string }) {
  const cells: ReactElement[] = []
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const v = grid[y * n + x]
      if (v < 0.04) continue
      cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={0.92} height={0.92} fill={color} opacity={Math.min(1, 0.15 + v * 0.85)} />)
    }
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width={size} height={size} className="rounded-lg bg-slate-950" aria-hidden>
      {Array.from({ length: n * n }, (_, i) => (
        <rect key={`b${i}`} x={i % n} y={Math.floor(i / n)} width={0.92} height={0.92} fill="#ffffff" opacity={0.04} />
      ))}
      {cells}
    </svg>
  )
}
