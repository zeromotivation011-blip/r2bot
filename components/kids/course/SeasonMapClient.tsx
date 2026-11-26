'use client'

// components/kids/course/SeasonMapClient.tsx
// A level's season as a winding path of 24 session stops, four acts of six,
// with the "Make it yours" projects (6, 12, 18, 24) as big star stops. The
// server renders the whole path (every stop is a real link with its title), and
// on the device it lights up: finished stops turn green with their stars, a
// half-done stop says where to resume, and the next stop glows.
//
// Levels whose sessions are not written yet render the same path, honestly
// marked "arriving soon", with no links.

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { getProgress, KIDS_PROGRESS_EVENT } from '@/lib/kids-progress'
import { BEATS, COURSE_EVENT, readAllSessionStates, type SessionState } from './course-state'

export interface MapNode {
  number: number
  title: string
  objective: string
  kind: 'lesson' | 'project'
  /** The session's badge icon, when the session is written. */
  icon?: string
}

export interface MapAct {
  title: string
  summary: string
  sessions: [number, number]
}

interface Props {
  level: number
  playable: boolean
  nodes: MapNode[]
  acts: MapAct[]
}

const ROW = 108
const ACT_H = 150
const TOP = 16

function sid(level: number, n: number): string {
  return `L${level}-S${String(n).padStart(2, '0')}`
}

/** Left/right zigzag with a little variation, so the road winds rather than ticks. */
function xOf(i: number): number {
  const side = i % 2 === 0 ? 27 : 73
  const wobble = [0, 4, -3, 2, -4, 3][i % 6]
  return side + (i % 2 === 0 ? wobble : -wobble)
}

function yOf(i: number): number {
  const act = Math.floor(i / 6)
  return TOP + (act + 1) * ACT_H + i * ROW + ROW / 2
}

export default function SeasonMapClient({ level, playable, nodes, acts }: Props) {
  const [done, setDone] = useState<Record<string, number>>({})
  const [states, setStates] = useState<Record<string, SessionState>>({})
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const read = () => {
      setDone(getProgress().sessionsDone)
      setStates(readAllSessionStates())
      setHydrated(true)
    }
    read()
    window.addEventListener(KIDS_PROGRESS_EVENT, read)
    window.addEventListener(COURSE_EVENT, read)
    window.addEventListener('storage', read)
    return () => {
      window.removeEventListener(KIDS_PROGRESS_EVENT, read)
      window.removeEventListener(COURSE_EVENT, read)
      window.removeEventListener('storage', read)
    }
  }, [])

  const doneCount = nodes.filter((n) => done[sid(level, n.number)]).length
  const next = useMemo(() => nodes.find((n) => !done[sid(level, n.number)])?.number ?? null, [nodes, done, level])
  const nextNode = next ? nodes.find((n) => n.number === next) : null
  const nextState = next ? states[sid(level, next)] : undefined
  const height = yOf(nodes.length - 1) + ROW / 2 + 24

  const pts = nodes.map((_, i) => ({ x: xOf(i), y: yOf(i) }))
  const seg = (i: number) => {
    const a = pts[i]
    const b = pts[i + 1]
    const dy = b.y - a.y
    return `M ${a.x} ${a.y} C ${a.x} ${a.y + dy * 0.55}, ${b.x} ${b.y - dy * 0.55}, ${b.x} ${b.y}`
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Where am I? */}
      <div
        role="region"
        aria-label="Your progress this season"
        className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)]"
      >
        {playable ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">
                {hydrated ? `${doneCount} of ${nodes.length} sessions done` : `${nodes.length} sessions`}
              </p>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={nodes.length} aria-valuenow={doneCount} aria-label="Sessions finished">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-[width] duration-500" style={{ width: `${(doneCount / nodes.length) * 100}%` }} />
              </div>
              {nextNode && (
                <p className="mt-2 text-[15px] text-[#A7B0C0]">
                  {doneCount === 0 ? 'Start here: ' : 'Next: '}
                  <span className="font-semibold text-[#EEF2F8]">
                    Session {nextNode.number} · {nextNode.title}
                  </span>
                  {nextState && nextState.reached > 0 && !nextState.done && <> — carry on from {BEATS[nextState.step].label}</>}
                </p>
              )}
              {!nextNode && hydrated && <p className="mt-2 text-[15px] font-semibold text-emerald-300">Every session done — the whole season is yours! 🏆</p>}
            </div>
            {nextNode && (
              <Link
                href={`/kids/course/${level}/${nextNode.number}`}
                className="flex min-h-[52px] items-center justify-center rounded-2xl bg-amber-500 px-6 font-display text-lg font-bold text-[#1A1103] shadow-[0_8px_24px_rgba(252,104,24,.35)] transition-transform hover:bg-amber-400 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
              >
                {doneCount === 0 && !(nextState && nextState.reached > 0) ? 'Start session 1 →' : 'Continue →'}
              </Link>
            )}
          </div>
        ) : (
          <p className="text-[15px] text-[#A7B0C0]">
            <span className="mr-2 inline-block rounded-full bg-cyan-400/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-cyan-200">Arriving soon</span>
            The story and the 24 sessions are planned (below). The episodes, builds and challenges for this level are being made now; until then, Level 1 is ready to play.
          </p>
        )}
      </div>

      {/* The road */}
      <ol className="relative" style={{ height }} aria-label={`The ${nodes.length} sessions of this season`}>
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden>
          {pts.slice(0, -1).map((_, i) => (
            <path key={`r${i}`} d={seg(i)} fill="none" stroke="#19263F" strokeWidth={26} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          ))}
          {pts.slice(0, -1).map((_, i) => {
            const isDone = !!done[sid(level, nodes[i].number)]
            return (
              <path
                key={`d${i}`}
                d={seg(i)}
                fill="none"
                stroke={isDone ? '#FC6818' : 'rgba(255,255,255,.16)'}
                strokeWidth={isDone ? 6 : 3}
                strokeDasharray={isDone ? undefined : '2 12'}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </svg>

        {acts.map((a, ai) => {
          const firstIdx = nodes.findIndex((n) => n.number === a.sessions[0])
          if (firstIdx < 0) return null
          const top = yOf(firstIdx) - ROW / 2 - ACT_H + 14
          return (
            <li key={a.title} className="absolute inset-x-0 list-none" style={{ top }} aria-hidden={false}>
              <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-[#0A1120]/90 px-4 py-3 text-center shadow-[0_8px_24px_rgba(0,0,0,.45)] backdrop-blur">
                <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
                  Act {ai + 1} · sessions {a.sessions[0]}–{a.sessions[1]}
                </p>
                <h3 className="font-display text-lg font-bold leading-tight text-[#EEF2F8] sm:text-xl">{a.title}</h3>
                <p className="mt-1 line-clamp-2 text-[14px] leading-snug text-[#A7B0C0]">{a.summary}</p>
              </div>
            </li>
          )
        })}

        {nodes.map((n, i) => {
          const id = sid(level, n.number)
          const stars = done[id] ?? 0
          const st = states[id]
          const isNext = playable && n.number === next
          const inProgress = !stars && st && st.reached > 0
          const project = n.kind === 'project'
          const x = xOf(i)
          const left = x < 50
          const size = project ? 76 : 62
          const ring = stars
            ? 'border-emerald-300 bg-gradient-to-b from-emerald-400 to-emerald-600 text-[#06210F]'
            : isNext
              ? 'border-amber-200 bg-gradient-to-b from-amber-400 to-amber-600 text-[#1A1103] shadow-[0_0_0_8px_rgba(252,104,24,.22),0_0_36px_rgba(252,104,24,.55)]'
              : project
                ? 'border-amber-400/70 bg-gradient-to-b from-[#3A2614] to-[#19263F] text-amber-200'
                : 'border-white/20 bg-gradient-to-b from-[#22314F] to-[#19263F] text-[#EEF2F8]'
          const bubble = (
            <span
              className={`relative grid place-items-center border-[3px] font-display font-bold transition-transform group-hover:-translate-y-0.5 group-active:scale-[.97] ${ring} ${project ? 'rounded-[24px] text-3xl' : 'rounded-full text-xl'} ${!playable ? 'opacity-60' : ''}`}
              style={{ width: size, height: size }}
            >
              {isNext && <span className="absolute inset-[-10px] rounded-[inherit] border-2 border-amber-300/70 motion-safe:animate-ping" aria-hidden />}
              {stars ? (
                <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden>
                  <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : project ? (
                <span aria-hidden>{n.icon ?? '🌟'}</span>
              ) : (
                <span aria-hidden>{n.number}</span>
              )}
              {stars > 0 && (
                <span className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 gap-px rounded-full bg-[#0A1120] px-1.5 py-0.5 text-[11px] leading-none ring-1 ring-white/15" aria-hidden>
                  {[1, 2, 3].map((k) => (
                    <span key={k} className={k <= stars ? '' : 'opacity-25 grayscale'}>
                      ⭐
                    </span>
                  ))}
                </span>
              )}
            </span>
          )
          const label = (
            <span className={`absolute top-1/2 block -translate-y-1/2 ${left ? 'text-left' : 'text-right'}`} style={left ? { left: `calc(${x}% + ${size / 2 + 12}px)`, right: 4 } : { right: `calc(${100 - x}% + ${size / 2 + 12}px)`, left: 4 }}>
              <span className={`block text-[12px] font-black uppercase tracking-wide ${project ? 'text-amber-300' : isNext ? 'text-amber-300' : 'text-[#6E7888]'}`}>
                {project ? `Session ${n.number} · Make it yours` : `Session ${n.number}`}
                {isNext && ' · next'}
              </span>
              <span className={`block font-display text-[16px] font-bold leading-tight sm:text-[18px] ${playable ? 'text-[#EEF2F8]' : 'text-[#A7B0C0]'}`}>{n.title}</span>
              {inProgress && st && <span className="mt-0.5 block text-[12px] font-bold text-cyan-300">Paused at {BEATS[st.step].label}</span>}
              <span className="mt-0.5 hidden text-[13px] leading-snug text-[#A7B0C0] sm:line-clamp-2 sm:block">{n.objective}</span>
            </span>
          )
          return (
            <li key={n.number} className="absolute inset-x-0 list-none" style={{ top: yOf(i) - ROW / 2, height: ROW }} data-testid="season-node" data-session={n.number} data-state={stars ? 'done' : isNext ? 'next' : inProgress ? 'started' : 'open'}>
              {playable ? (
                <Link
                  href={`/kids/course/${level}/${n.number}`}
                  className="group absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                  aria-label={`Session ${n.number}: ${n.title}${stars ? `, done with ${stars} star${stars === 1 ? '' : 's'}` : isNext ? ', your next session' : ''}`}
                >
                  <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%` }}>
                    {bubble}
                  </span>
                  {label}
                </Link>
              ) : (
                <div className="absolute inset-0" aria-label={`Session ${n.number}: ${n.title} (arriving soon)`}>
                  <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%` }}>
                    {bubble}
                  </span>
                  {label}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
