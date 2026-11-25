'use client'

// The animated top-down map for grid-robot templates (sequence-path, debug-program).

import { useMemo } from 'react'
import { type Cell, type Dir, type Frame, type Theme, type World, THEMES, sameCell } from './engine'

const ANGLE: Record<Dir, number> = { N: 0, E: 90, S: 180, W: 270 }

/** Cumulative heading angles per frame, so a 270°→0° turn animates the short way. */
export function frameAngles(frames: Frame[]): number[] {
  const out: number[] = []
  let a = frames.length ? ANGLE[frames[0].dir] : 0
  frames.forEach((f, i) => {
    if (i > 0) {
      let d = ANGLE[f.dir] - ANGLE[frames[i - 1].dir]
      if (d > 180) d -= 360
      if (d < -180) d += 360
      a += d
    }
    out.push(a)
  })
  return out
}

const PALETTE: Record<Theme, { floor: string; floor2: string; wall: string; wallTop: string }> = {
  warehouse: { floor: '#16233B', floor2: '#1A2944', wall: '#5B4A35', wallTop: '#8A6E4B' },
  mars: { floor: '#3A1F17', floor2: '#43241A', wall: '#6B3A2A', wallTop: '#A0563C' },
  ocean: { floor: '#0B2A3A', floor2: '#0E3245', wall: '#1E6B63', wallTop: '#2FA394' },
  farm: { floor: '#1E3318', floor2: '#233B1C', wall: '#A68A3A', wallTop: '#D9B850' },
  hospital: { floor: '#1B2638', floor2: '#202D42', wall: '#4B5A73', wallTop: '#7D8DA8' },
}

export function GridWorld({
  world,
  theme = 'warehouse',
  frame,
  angle,
  trail,
  hintPath,
  reduced,
  stepMs,
  label,
}: {
  world: World
  theme?: Theme
  /** Current frame (null = robot at start). */
  frame: Frame | null
  angle: number
  /** Cells visited so far (for the trail). */
  trail: Cell[]
  hintPath?: Cell[]
  reduced: boolean
  stepMs: number
  label?: string
}) {
  const S = 10
  const pal = PALETTE[theme]
  const t = THEMES[theme]
  const at = frame?.at ?? world.start.at
  const collected = new Set(frame?.collected ?? [])
  const bump = frame?.event === 'bump' ? frame.blocked : undefined
  const cells = useMemo(() => {
    const out: Cell[] = []
    for (let r = 0; r < world.rows; r++) for (let c = 0; c < world.cols; c++) out.push([c, r])
    return out
  }, [world.cols, world.rows])
  const isWall = (c: Cell) => (world.walls ?? []).some((w) => sameCell(w, c))
  const trailPts = trail.map((c) => `${c[0] * S + S / 2},${c[1] * S + S / 2}`).join(' ')
  const tr = reduced ? 'none' : `transform ${Math.max(80, stepMs - 40)}ms cubic-bezier(.22,.61,.36,1)`
  const gemsLeft = (world.gems ?? []).length - collected.size

  return (
    <figure className="m-0">
      <svg
        viewBox={`-1 -1 ${world.cols * S + 2} ${world.rows * S + 2}`}
        className="block h-auto w-full max-h-[52vh] touch-manipulation"
        role="img"
        aria-label={`${label ? label + ': ' : ''}${world.cols} by ${world.rows} map. The ${t.robot} is at column ${at[0] + 1}, row ${at[1] + 1}. The ${t.goal} is at column ${world.goal[0] + 1}, row ${world.goal[1] + 1}.${gemsLeft > 0 ? ` ${gemsLeft} ${gemsLeft === 1 ? t.gem : t.gems} to collect.` : ''}`}
      >
        <rect x={-1} y={-1} width={world.cols * S + 2} height={world.rows * S + 2} rx={3} fill="#0A1120" />
        {cells.map(([c, r]) => (
          <rect key={`f${c}-${r}`} x={c * S + 0.35} y={r * S + 0.35} width={S - 0.7} height={S - 0.7} rx={1.6} fill={(c + r) % 2 ? pal.floor : pal.floor2} />
        ))}
        {hintPath && hintPath.length > 1 && (
          <polyline points={hintPath.map((c) => `${c[0] * S + S / 2},${c[1] * S + S / 2}`).join(' ')} fill="none" stroke="#FFA878" strokeOpacity={0.35} strokeWidth={1.2} strokeDasharray="1.5 1.8" strokeLinecap="round" />
        )}
        {trail.length > 1 && <polyline points={trailPts} fill="none" stroke="#00E5FF" strokeOpacity={0.55} strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round" />}
        {cells.filter(isWall).map(([c, r]) => (
          <g key={`w${c}-${r}`}>
            <rect x={c * S + 0.8} y={r * S + 1.4} width={S - 1.6} height={S - 1.8} rx={1.4} fill={pal.wall} />
            <rect x={c * S + 0.8} y={r * S + 0.8} width={S - 1.6} height={S - 3} rx={1.4} fill={pal.wallTop} />
            <path d={`M${c * S + 2.4} ${r * S + 2.6} h${S - 4.8} M${c * S + 2.4} ${r * S + 4.6} h${S - 4.8}`} stroke="#0A1120" strokeOpacity={0.25} strokeWidth={0.5} />
          </g>
        ))}
        {/* Goal */}
        <g transform={`translate(${world.goal[0] * S + S / 2} ${world.goal[1] * S + S / 2})`}>
          <circle r={4.2} fill="none" stroke="#FC6818" strokeWidth={0.7} className="motion-safe:animate-pulse" />
          <circle r={2.8} fill="#FC6818" fillOpacity={0.25} stroke="#FF8A4C" strokeWidth={0.5} />
          <path d="M-0.6 2 V-3 L2.4 -2 L-0.6 -1" fill="#FFA878" stroke="#FFA878" strokeWidth={0.4} strokeLinejoin="round" />
        </g>
        {(world.gems ?? []).map(([c, r]) => {
          const got = collected.has(`${c},${r}`)
          return (
            <g key={`g${c}-${r}`} transform={`translate(${c * S + S / 2} ${r * S + S / 2})`} opacity={got ? 0.18 : 1}>
              <path d="M0 -3 L2.6 0 L0 3 L-2.6 0 Z" fill="#00E5FF" stroke="#E0FCFF" strokeWidth={0.35} />
              <path d="M0 -3 L0.9 0 L0 3" fill="#00B8D4" />
            </g>
          )
        })}
        {bump && (
          <g transform={`translate(${bump[0] * S + S / 2} ${bump[1] * S + S / 2})`}>
            <circle r={3.6} fill="#EF4444" fillOpacity={0.3} className="motion-safe:animate-ping" />
            <path d="M-2 -2 L2 2 M2 -2 L-2 2" stroke="#F87171" strokeWidth={0.9} strokeLinecap="round" />
          </g>
        )}
        {/* Robot */}
        <g style={{ transform: `translate(${at[0] * S + S / 2}px, ${at[1] * S + S / 2}px)`, transition: tr }}>
          <g style={{ transform: `rotate(${angle}deg)`, transition: tr }}>
            <g className={bump ? 'motion-safe:animate-[tplShake_.3s_ease-in-out_2]' : ''}>
              <rect x={-3.9} y={-2.4} width={1.4} height={4.8} rx={0.6} fill="#0A1120" />
              <rect x={2.5} y={-2.4} width={1.4} height={4.8} rx={0.6} fill="#0A1120" />
              <rect x={-3} y={-3.4} width={6} height={6.8} rx={1.8} fill="#FC6818" stroke="#FFA878" strokeWidth={0.35} />
              <rect x={-2} y={-2.6} width={4} height={2} rx={0.8} fill="#0A1120" />
              <circle cx={-0.9} cy={-1.6} r={0.5} fill="#00E5FF" />
              <circle cx={0.9} cy={-1.6} r={0.5} fill="#00E5FF" />
              <path d="M0 -5.2 L1.3 -3.7 H-1.3 Z" fill="#00E5FF" />
            </g>
          </g>
        </g>
        <style>{'@keyframes tplShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-.7px)}75%{transform:translateX(.7px)}}'}</style>
      </svg>
      {label && <figcaption className="mt-1 text-center text-[13px] font-semibold text-[#A7B0C0]">{label}</figcaption>}
    </figure>
  )
}
