'use client'

// components/kids/galaxy/ConceptConstellationClient.tsx
// The child's skill constellations (roadmap #27): one small constellation per
// concept strand, its four stars lit by the concept's battery cells. Secure
// concepts glow; fading ones dim and ask for a Recharge; concepts being learnt
// light up a star per first-try win. Reads the ONE progress store only.
//
// Used by the Garage (/kids/hangar, compact) and /kids/galaxy/concepts (full,
// with `summaries` so each card can link straight to a Recharge mission).
// No ranking, no comparison: this is one child's own sky.

import Link from 'next/link'
import { useMemo } from 'react'
import { CONCEPT_INFO, SECURE_TEMPLATES, SECURE_WINS, STATUS_LABEL, statusCounts, type ConceptState } from '@/lib/kids/universe/mastery'
import { BAND_ORDER, type BandId } from '@/lib/kids/bands'
import { missingPrereqs, type ActivitiesDone, type ActivitySummary } from '@/lib/kids/activities/progress'
import { useGalaxyState } from './useGalaxyState'
import { useMastery } from './useMastery'

const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

interface Props {
  /** Garage: shorter header, smaller cards. */
  compact?: boolean
  /** Light activity summaries (with concepts): cards then link to a mission for that concept. */
  summaries?: ActivitySummary[]
  /** Heading level text (default "Skill constellations"). */
  title?: string
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

/** Four star positions per concept, stable forever (a constellation shape of its own). */
function starPoints(id: string, w: number, h: number): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i < 4; i++) {
    const r = hash(`${id}:${i}`)
    const x = 12 + ((i + (r % 100) / 160) * (w - 24)) / 3.6
    const y = 10 + ((r >>> 8) % 1000) / 1000 * (h - 20)
    pts.push([Math.round(x), Math.round(y)])
  }
  return pts
}

function Sky({ s, size }: { s: ConceptState; size: 'sm' | 'md' }) {
  const w = size === 'sm' ? 112 : 136
  const h = size === 'sm' ? 52 : 64
  const pts = starPoints(s.id, w, h)
  const lit = s.cells
  const colour = s.status === 'secure' ? '#67E8F9' : '#FFA878'
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0">
      {pts.slice(1).map((p, i) => {
        const on = i + 1 < lit
        return <line key={i} x1={pts[i][0]} y1={pts[i][1]} x2={p[0]} y2={p[1]} stroke={on ? colour : 'rgba(255,255,255,.12)'} strokeWidth={on ? 1.6 : 1} strokeDasharray={on ? undefined : '3 4'} />
      })}
      {pts.map(([x, y], i) => {
        const on = i < lit
        return (
          <g key={i}>
            {on && <circle cx={x} cy={y} r={size === 'sm' ? 8 : 10} fill={colour} opacity={0.18} className="motion-safe:animate-pulse" />}
            <circle cx={x} cy={y} r={on ? 3.8 : 2.6} fill={on ? colour : 'rgba(255,255,255,.22)'} />
          </g>
        )
      })}
    </svg>
  )
}

function Battery({ cells, status }: { cells: number; status: ConceptState['status'] }) {
  const fill = status === 'secure' ? 'bg-[#22C55E]' : status === 'fading' ? 'bg-amber-400' : 'bg-amber-300/80'
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={`Battery: ${cells} of 4 cells`}>
      <span className="inline-flex gap-[3px] rounded-md border border-white/25 p-[3px]">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-3 w-2.5 rounded-[2px] ${i < cells ? fill : 'bg-white/10'}`} />
        ))}
      </span>
      <span className="h-2 w-1 rounded-r-sm bg-white/25" />
    </span>
  )
}

const STATUS_CHIP: Record<ConceptState['status'], string> = {
  secure: 'border-[#22C55E]/40 bg-[#22C55E]/10 text-[#86EFAC]',
  fading: 'border-amber-400/50 bg-amber-500/10 text-amber-300',
  learning: 'border-[#00B8D4]/40 bg-[#00B8D4]/10 text-[#67E8F9]',
  new: 'border-white/[0.12] bg-white/[0.03] text-[#A7B0C0]',
}

/** Fading first, then learning, then secure, then new: the ones that need the child come first. */
const STATUS_ORDER: Record<ConceptState['status'], number> = { fading: 0, learning: 1, secure: 2, new: 3 }

/** A mission for this concept: near the child's band, unlocked, not done first, a different template from the last win. */
function missionFor(s: ConceptState, list: ActivitySummary[], done: ActivitiesDone, band: BandId): ActivitySummary | undefined {
  const bi = BAND_ORDER.indexOf(band)
  const pool = list.filter((a) => a.concepts?.includes(s.id) && Math.abs(BAND_ORDER.indexOf(a.band) - bi) <= 1 && missingPrereqs(a, done).length === 0)
  pool.sort(
    (a, b) =>
      Number(a.template === s.lastWinTemplate) - Number(b.template === s.lastWinTemplate) ||
      Number(!!done[a.id]) - Number(!!done[b.id]) ||
      Math.abs(BAND_ORDER.indexOf(a.band) - bi) - Math.abs(BAND_ORDER.indexOf(b.band) - bi) ||
      a.difficulty - b.difficulty ||
      a.id.localeCompare(b.id),
  )
  return pool[0]
}

function hint(s: ConceptState): string {
  switch (s.status) {
    case 'secure':
      return s.daysSinceWin === null || s.daysSinceWin <= 0 ? 'Fully charged today.' : `Last win ${s.daysSinceWin} day${s.daysSinceWin === 1 ? '' : 's'} ago.`
    case 'fading':
      return 'Its battery is running low. One first-try win recharges it.'
    case 'learning': {
      const wins = Math.min(s.recentWins, SECURE_WINS)
      const more = SECURE_WINS - wins
      if (more > 0) return `${wins} of ${SECURE_WINS} first-try wins.`
      return `Win one with a different kind of mission (${SECURE_TEMPLATES} kinds needed).`
    }
    default:
      return 'Not lit yet.'
  }
}

export default function ConceptConstellationClient({ compact = false, summaries, title = 'Skill constellations' }: Props) {
  const { ready, states } = useMastery()
  const { done, band } = useGalaxyState()
  const counts = useMemo(() => statusCounts(states), [states])
  const anyEvidence = ready && states.some((s) => s.status !== 'new')
  const childBand: BandId = band ?? 'builders'
  const missions = useMemo(() => {
    const m = new Map<string, ActivitySummary>()
    if (!summaries || !ready) return m
    for (const s of states) {
      if (s.status === 'secure' && s.cells > 2) continue
      const a = missionFor(s, summaries, done, childBand)
      if (a) m.set(s.id, a)
    }
    return m
  }, [summaries, ready, states, done, childBand])

  const sorted = useMemo(() => [...states].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.cells - a.cells), [states])

  return (
    <section aria-labelledby="concept-sky-title" className={`rounded-[28px] border border-white/[0.08] bg-[#111C32] shadow-[0_8px_24px_rgba(0,0,0,.45)] ${compact ? 'p-4' : 'p-4 sm:p-6'}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id="concept-sky-title" className="font-display text-xl font-bold text-[#EEF2F8] sm:text-2xl">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-[15px] leading-snug text-[#A7B0C0]">
            Every big idea is a constellation. Solve missions on the first try to light its stars and charge its battery.
          </p>
        </div>
        {ready && anyEvidence && (
          <ul className="flex flex-wrap gap-2 text-[13px] font-bold" aria-label="Your constellations">
            <li className={`rounded-full border px-3 py-1.5 ${STATUS_CHIP.secure}`}>{counts.secure} secure</li>
            {counts.fading > 0 && <li className={`rounded-full border px-3 py-1.5 ${STATUS_CHIP.fading}`}>{counts.fading} to recharge</li>}
            <li className={`rounded-full border px-3 py-1.5 ${STATUS_CHIP.learning}`}>{counts.learning} learning</li>
          </ul>
        )}
      </div>

      {!ready ? (
        <ul className={`mt-4 grid gap-3 ${compact ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3'}`} aria-hidden>
          {Array.from({ length: compact ? 8 : 16 }, (_, i) => (
            <li key={i} className={`${compact ? 'h-[132px]' : 'h-[178px]'} rounded-[20px] border border-white/[0.08] bg-white/[0.03] motion-safe:animate-pulse`} />
          ))}
        </ul>
      ) : (
        <>
          {!anyEvidence && (
            <div className="mt-4 flex flex-col gap-3 rounded-[20px] border border-dashed border-white/[0.16] bg-white/[0.02] p-4 sm:flex-row sm:items-center">
              <span className="text-4xl" aria-hidden>
                🤖
              </span>
              <p className="flex-1 text-[15px] leading-snug text-[#EEF2F8]">
                <strong className="font-display">Spark says:</strong> your sky is dark for now. Play a Launch Check or any Galaxy mission and the first stars will light up.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/kids/galaxy/launch-check" className={`inline-flex min-h-[48px] items-center rounded-2xl bg-amber-500 px-4 font-display font-bold text-[#1A1103] ${focusRing}`}>
                  Launch Check
                </Link>
                <Link href="/kids/galaxy" className={`inline-flex min-h-[48px] items-center rounded-2xl border border-white/[0.16] px-4 font-display font-bold text-[#EEF2F8] ${focusRing}`}>
                  Skill Galaxy
                </Link>
              </div>
            </div>
          )}
          <ul className={`mt-4 grid gap-3 ${compact ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
            {(compact ? sorted : states).map((s) => {
              const info = CONCEPT_INFO[s.id]
              const m = missions.get(s.id)
              const cta = s.status === 'fading' ? 'Recharge' : s.status === 'learning' ? 'Practise' : s.status === 'new' ? 'Try one' : 'Top up'
              return (
                <li
                  key={s.id}
                  id={compact ? undefined : `c-${s.id}`}
                  className={`flex scroll-mt-24 flex-col rounded-[20px] border bg-gradient-to-b from-white/[0.06] to-white/[0.02] ${compact ? 'p-3' : 'p-4'} ${
                    s.status === 'fading' ? 'border-amber-400/40' : s.status === 'secure' ? 'border-[#22C55E]/30' : 'border-white/[0.08]'
                  } ${s.status === 'new' ? 'opacity-80' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Sky s={s} size={compact ? 'sm' : 'md'} />
                    <span className="text-2xl" aria-hidden>
                      {info.icon}
                    </span>
                  </div>
                  <h3 className={`mt-1 font-display font-bold leading-tight text-[#EEF2F8] ${compact ? 'text-[15px]' : 'text-lg'}`}>{info.name}</h3>
                  {!compact && <p className="mt-0.5 text-[14px] leading-snug text-[#A7B0C0]">{info.kid}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Battery cells={s.cells} status={s.status} />
                    <span className={`rounded-full border px-2 py-0.5 text-[12px] font-bold ${STATUS_CHIP[s.status]}`}>{STATUS_LABEL[s.status]}</span>
                  </div>
                  {!compact && <p className="mt-2 text-[13px] leading-snug text-[#A7B0C0]">{hint(s)}</p>}
                  {(s.status !== 'secure' || s.cells <= 2) && (
                    <Link
                      href={m ? `/kids/galaxy/${m.track}/${m.id}` : `/kids/galaxy/concepts#c-${s.id}`}
                      className={`mt-auto inline-flex min-h-[44px] items-center gap-1 self-start pt-2 font-display text-[15px] font-bold ${s.status === 'fading' ? 'text-amber-300 hover:text-amber-200' : 'text-[#67E8F9] hover:text-[#A5F3FC]'} ${focusRing} rounded-lg`}
                      aria-label={`${cta}: ${info.name}${m ? ` — ${m.title}` : ''}`}
                    >
                      {s.status === 'fading' && <span aria-hidden>⚡</span>}
                      {cta} <span aria-hidden>→</span>
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
          {compact && (
            <Link href="/kids/galaxy/concepts" className={`mt-3 flex min-h-[44px] items-center justify-center rounded-xl text-[15px] font-semibold text-amber-300 hover:text-amber-200 ${focusRing}`}>
              What each constellation means →
            </Link>
          )}
        </>
      )}
    </section>
  )
}
