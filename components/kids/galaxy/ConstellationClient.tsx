'use client'

// components/kids/galaxy/ConstellationClient.tsx
// One track drawn as a constellation: its activities are stars on a winding
// path (band, then difficulty, prerequisites first). Each star is a real link
// (≥ 52px) to the activity; done stars glow in the track's colours, the next
// one pulses orange, stars whose `after` is not done yet are locked and say why.

import Link from 'next/link'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { getBand } from '@/lib/kids/bands'
import type { Track } from '@/lib/kids/activities/types'
import { nodeStates, type ActivitiesDone, type ActivitySummary, type NodeState, type StartPoint } from '@/lib/kids/activities/progress'

interface Props {
  track: Track
  /** Already filtered and ordered (orderActivities). */
  activities: ActivitySummary[]
  /** Every activity of the track, to name a locked star's prerequisite. */
  allOfTrack: ActivitySummary[]
  done: ActivitiesDone
  /** False before localStorage is read: every star is drawn neutral. */
  ready: boolean
  /** Most stars per row (fewer on narrow screens: at least ~92px each). */
  cols?: number
  /** The child's start point in this track (Launch Check): the "next" star is the first open one from here. */
  start?: StartPoint
}

const ROW_H = 112

function StarGlyph({ state, gradientId }: { state: NodeState; gradientId: string }) {
  const fill = state === 'done' ? `url(#${gradientId})` : state === 'next' ? '#FC6818' : state === 'locked' ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.22)'
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
      <path
        d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z"
        fill={fill}
        stroke={state === 'open' ? 'rgba(255,255,255,.7)' : 'none'}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Constellation({ track, activities, allOfTrack, done, ready, cols: maxCols = 4, start }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const cols = width ? Math.max(3, Math.min(maxCols, Math.floor(width / 92))) : maxCols
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const gradientId = `g-${track.id}-${uid}`
  const [lockedMsg, setLockedMsg] = useState<string | null>(null)
  const states = useMemo(() => (ready ? nodeStates(activities, done, { start }) : {}), [activities, done, ready, start])
  const titleOf = useMemo(() => new Map(allOfTrack.map((a) => [a.id, a.title])), [allOfTrack])

  const rows = Math.max(1, Math.ceil(activities.length / cols))
  const height = rows * ROW_H
  const pos = activities.map((_, i) => {
    const r = Math.floor(i / cols)
    const c = i % cols
    const cc = r % 2 === 0 ? c : cols - 1 - c
    // Slight vertical wobble so it reads as a constellation, not a table.
    const wobble = ((i * 37) % 3) - 1
    return { x: ((cc + 0.5) / cols) * 100, y: r * ROW_H + 34 + wobble * 6 }
  })

  // Colours of the track gradient, for SVG (Tailwind classes can't fill SVG).
  const [from, to] = GRADIENT_HEX[track.id] ?? ['#FFA878', '#FC6818']

  return (
    <div>
      <div ref={box} className="relative w-full" style={{ height }}>
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={from} />
              <stop offset="1" stopColor={to} />
            </linearGradient>
          </defs>
          {pos.slice(1).map((p, i) => {
            const a = pos[i]
            const s = states[activities[i + 1].id]
            const lit = ready && states[activities[i].id] === 'done' && (s === 'done' || s === 'next')
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={p.x}
                y2={p.y}
                stroke={lit ? from : 'rgba(255,255,255,.16)'}
                strokeWidth={lit ? 3 : 2}
                strokeDasharray={lit ? undefined : '4 6'}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
              />
            )
          })}
        </svg>
        <ol className="contents">
          {activities.map((a, i) => {
            const st: NodeState = states[a.id] ?? 'open'
            const p = pos[i]
            const band = getBand(a.band)
            const stars = done[a.id]?.stars ?? 0
            const label = `${a.title}. ${band?.name ?? ''}. ${st === 'done' ? `Done, ${stars} stars` : st === 'next' ? 'Next mission' : st === 'locked' ? 'Locked' : 'Open'}`
            const circle = `relative flex h-[52px] w-[52px] items-center justify-center rounded-full border transition-transform duration-200 [transition-timing-function:cubic-bezier(.22,.61,.36,1)] ${
              st === 'done'
                ? 'border-white/30 bg-[#19263F] shadow-[0_0_18px_rgba(255,168,120,.35)]'
                : st === 'next'
                  ? 'border-amber-400 bg-[#19263F] shadow-[0_0_24px_rgba(252,104,24,.55)]'
                  : st === 'locked'
                    ? 'border-white/[0.08] bg-[#111C32]'
                    : 'border-white/[0.16] bg-[#111C32]'
            }`
            const inner = (
              <>
                <span className={circle}>
                  {st === 'next' && <span className="absolute inset-0 rounded-full border-2 border-amber-400/70 motion-safe:animate-ping" aria-hidden />}
                  {st === 'locked' ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6E7888" strokeWidth="2" aria-hidden>
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                  ) : (
                    <StarGlyph state={st} gradientId={gradientId} />
                  )}
                  <span className="absolute -right-1 -top-1 rounded-full bg-[#0A1120] px-1 text-[13px] leading-5" aria-hidden title={band?.name}>
                    {band?.emoji}
                  </span>
                  {st === 'done' && (
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-[#0A1120] px-1 text-[10px] leading-4 tracking-tighter text-amber-300" aria-hidden>
                      {'★'.repeat(stars)}
                    </span>
                  )}
                </span>
                <span className={`mt-1.5 line-clamp-2 w-full text-center text-[13px] font-semibold leading-tight ${st === 'locked' ? 'text-[#6E7888]' : st === 'next' ? 'text-amber-300' : 'text-[#A7B0C0]'}`}>
                  {a.title}
                </span>
              </>
            )
            const cell = 'group absolute flex -translate-x-1/2 flex-col items-center rounded-2xl p-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
            const style = { left: `${p.x}%`, top: p.y - 30, width: `${Math.min(100 / cols, 30)}%` }
            return (
              <li key={a.id} className="contents">
                {st === 'locked' ? (
                  <button
                    type="button"
                    className={cell}
                    style={style}
                    aria-label={label}
                    onClick={() => {
                      const need = (a.after ?? []).filter((id) => !done[id]).map((id) => `“${titleOf.get(id) ?? id}”`)
                      setLockedMsg(`Finish ${need.join(' and ')} first to unlock “${a.title}”.`)
                    }}
                  >
                    {inner}
                  </button>
                ) : (
                  <Link href={`/kids/galaxy/${a.track}/${a.id}`} className={`${cell} hover:[&>span:first-child]:-translate-y-0.5 active:[&>span:first-child]:scale-[.95]`} style={style} aria-label={label}>
                    {inner}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </div>
      <p className="min-h-[1.5rem] text-center text-sm text-amber-200" aria-live="polite">
        {lockedMsg}
      </p>
    </div>
  )
}

/** Hex pairs matching TRACKS[].gradient, for SVG fills. */
export const GRADIENT_HEX: Record<string, [string, string]> = {
  motion: ['#fb923c', '#dc2626'],
  sensors: ['#22d3ee', '#0284c7'],
  code: ['#FFA878', '#FC6818'],
  electronics: ['#a3e635', '#059669'],
  mechanics: ['#d6d3d1', '#71717a'],
  control: ['#5eead4', '#0891b2'],
  ai: ['#e879f9', '#db2777'],
  design: ['#fde047', '#d97706'],
  space: ['#818cf8', '#1d4ed8'],
  world: ['#86efac', '#0d9488'],
}
