'use client'

// components/kids/games/bio-bots/CourseArtClient.tsx
// The side-view course strip for Ace and Legend: one block per terrain
// segment (width grows with the square root of its length, so a 20 m wall and
// a 400 m field both stay readable), the robot drawn with the module it is
// using on that segment, and a red marker where the model says it stopped.

import { Bot } from './BotArtClient'
import { TERRAINS, type CourseResult, type CourseSegment, type Terrain } from './model'

const FILL: Record<Terrain, string> = {
  flat: '#4D7C0F',
  rubble: '#57534E',
  pipe: '#334155',
  glass: '#1E3A5F',
  water: '#0369A1',
  gap: '#0C4A6E',
  ice: '#7DD3FC',
}

const W = 400
const H = 130
const GROUND = 100

function layout(course: CourseSegment[]): { x: number; w: number }[] {
  const raw = course.map((s) => Math.sqrt(s.length))
  const total = raw.reduce((a, b) => a + b, 0)
  let x = 8
  return raw.map((r) => {
    const w = ((W - 16) * r) / total
    const out = { x, w }
    x += w
    return out
  })
}

function TerrainArt({ t, x, w }: { t: Terrain; x: number; w: number }) {
  switch (t) {
    case 'flat':
      return <rect x={x} y={GROUND} width={w} height={H - GROUND} fill={FILL.flat} />
    case 'rubble':
      return (
        <g>
          <rect x={x} y={GROUND} width={w} height={H - GROUND} fill="#44403C" />
          {Array.from({ length: Math.max(2, Math.floor(w / 14)) }, (_, i) => (
            <path key={i} d={`M${x + i * 14} ${GROUND} q 7 -${8 + (i % 3) * 3} 14 0 Z`} fill="#78716C" />
          ))}
        </g>
      )
    case 'pipe':
      return (
        <g>
          <rect x={x} y={GROUND} width={w} height={H - GROUND} fill="#3F6212" />
          <rect x={x} y={GROUND - 22} width={w} height={22} rx={4} fill="#475569" />
          <rect x={x} y={GROUND - 17} width={w} height={12} fill="#0F172A" />
        </g>
      )
    case 'glass':
      return (
        <g>
          <rect x={x} y={GROUND} width={w} height={H - GROUND} fill="#3F6212" />
          <rect x={x + w * 0.2} y={18} width={w * 0.6} height={GROUND - 18} fill="#93C5FD" opacity={0.3} stroke="#BFDBFE" />
        </g>
      )
    case 'water':
      return <rect x={x} y={GROUND + 4} width={w} height={H - GROUND - 4} fill={FILL.water} />
    case 'gap':
      return <rect x={x} y={H - 10} width={w} height={10} fill="#0EA5E9" />
    case 'ice':
      return (
        <g>
          <rect x={x} y={GROUND} width={w} height={H - GROUND} fill="#BAE6FD" />
          <path d={`M${x + 4} ${GROUND + 6} l 10 4 M${x + w / 2} ${GROUND + 10} l 12 -3`} stroke="#fff" strokeWidth={1.5} />
        </g>
      )
  }
}

export function CourseStrip({ course, result, p, t, running }: { course: CourseSegment[]; result: CourseResult | null; p: number; t: number; running: boolean }) {
  const lay = layout(course)
  let botX = 14
  let seg = 0
  let ended = false
  if (result && running) {
    const endX = result.ok ? lay[lay.length - 1].x + lay[lay.length - 1].w - 10 : lay[result.stopAt].x + Math.max(6, lay[result.stopAt].w * result.stopFrac)
    botX = 14 + (endX - 14) * p
    seg = lay.findIndex((l) => botX >= l.x && botX <= l.x + l.w)
    if (seg < 0) seg = lay.length - 1
    ended = p >= 1
  }
  const segRes = result && running ? result.segments[seg] : null
  const trick = segRes?.module ?? result?.segments.find((s) => s.module)?.module ?? 'legs'
  const terr = course[seg]?.terrain
  let y = GROUND
  let rot = 0
  if (segRes?.ok) {
    if (terr === 'water') y = GROUND + 14
    if (terr === 'pipe') y = GROUND - 6
    if (terr === 'gap') y = GROUND - 30 * Math.sin(Math.PI * ((botX - lay[seg].x) / lay[seg].w))
    if (terr === 'glass') {
      const u = (botX - lay[seg].x) / lay[seg].w
      y = GROUND - 60 * Math.sin(Math.PI * u)
      rot = u < 0.5 ? -60 : 60
    }
  }
  const failed = result && !result.ok && ended
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Course: ${course.map((s) => `${TERRAINS[s.terrain].name} ${s.length} metres`).join(', ')}`}>
      <rect width={W} height={H} fill="#10243F" />
      {course.map((s, i) => (
        <g key={i}>
          <TerrainArt t={s.terrain} x={lay[i].x} w={lay[i].w} />
          <text x={lay[i].x + lay[i].w / 2} y={14} textAnchor="middle" fontSize={11}>
            {TERRAINS[s.terrain].emoji}
          </text>
          <text x={lay[i].x + lay[i].w / 2} y={H - 3} textAnchor="middle" fontSize={8.5} fill="#EEF2F8" fontWeight={700}>
            {s.length} m
          </text>
          {i > 0 && <line x1={lay[i].x} y1={20} x2={lay[i].x} y2={H} stroke="#ffffff" strokeOpacity={0.12} strokeDasharray="2 3" />}
          {result && running && result.segments[i] && i <= (result.ok ? course.length : result.stopAt) && (
            <circle cx={lay[i].x + lay[i].w / 2} cy={26} r={4} fill={i === result.stopAt && failed ? '#EF4444' : i < (result.ok ? course.length : result.stopAt) || ended ? '#22C55E' : '#64748B'} />
          )}
        </g>
      ))}
      <text x={W - 6} y={GROUND - 4} textAnchor="end" fontSize={12}>
        🏁
      </text>
      <Bot trick={trick} t={t} x={botX} y={y} rot={failed ? 25 : rot} scale={0.55} moving={running && !ended} flapHz={4} />
      {failed && (
        <g>
          <circle cx={botX} cy={GROUND - 34} r={9} fill="#EF4444" />
          <path d={`M${botX - 4} ${GROUND - 38} l8 8 M${botX + 4} ${GROUND - 38} l-8 8`} stroke="#fff" strokeWidth={2.2} />
        </g>
      )}
    </svg>
  )
}
