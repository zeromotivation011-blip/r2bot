'use client'

// components/kids/hangar/HangarRecordsClient.tsx
// The Hangar's record room: the badge wall (by track), personal bests per game
// and tier, course progress per planet, and certificates. Every number comes
// from lib/kids-progress.ts; nothing is invented. Before the child's progress
// is read (server render, first paint) the lists render with neutral states so
// the HTML is meaningful and the layout does not move.

import { useId, useState } from 'react'
import { TIER_NAMES } from '@/components/kids/ui/GameShellClient'
import { UNIVERSE_BADGES, type BadgeTrack, type UniverseBadge } from '@/lib/kids/universe/rewards'
import { GAMES, PLANETS } from '@/lib/kids/universe/worlds'
import { useHangarState } from './useHangarState'

/** Every planet's season has 24 sessions (docs/kids-universe.md → The map). */
export const SESSIONS_PER_PLANET = 24

const TRACKS: { id: BadgeTrack; label: string; line: string }[] = [
  { id: 'motion', label: 'Motion', line: 'Making robots move exactly where you mean.' },
  { id: 'sensing', label: 'Sensing', line: 'Robots that feel, see and measure.' },
  { id: 'logic', label: 'Logic', line: 'Loops, choices and memory.' },
  { id: 'control', label: 'Control', line: 'Smooth, steady, tuned.' },
  { id: 'mechanics', label: 'Mechanics', line: 'Arms, joints and gears.' },
  { id: 'electronics', label: 'Electronics', line: 'Circuits that work and stay safe.' },
  { id: 'ai', label: 'AI', line: 'Robots that learn, map and plan.' },
  { id: 'design', label: 'Design', line: 'Choosing the right robot for the job.' },
  { id: 'explorer', label: 'Explorer', line: 'Stories and worlds of the Universe.' },
  { id: 'grit', label: 'Grit', line: 'Not giving up, and fixing bugs.' },
]

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

function formatDay(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d)
}

/** "l1-hello" → "Level 1 · Hello". Curriculum badges are named by their session; we only have the id here. */
function courseBadgeName(id: string): string {
  const m = /^l(\d)-(.+)$/i.exec(id)
  const words = (m ? m[2] : id).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return m ? `Level ${m[1]} · ${words}` : words
}

function formatScore(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString('en-GB') : n.toLocaleString('en-GB', { maximumFractionDigits: 2 })
}

const card = 'rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-5'

export function HangarRecordsClient() {
  const { ready, progress } = useHangarState()
  const earned = progress.badges
  const earnedCount = UNIVERSE_BADGES.filter((b) => earned[b.id]).length
  const known = new Set(UNIVERSE_BADGES.map((b) => b.id))
  const other = Object.entries(earned)
    .filter(([id]) => !known.has(id))
    .sort((a, b) => a[1].localeCompare(b[1]))

  const planetStats = PLANETS.map((p) => {
    const prefix = `L${p.level}-`
    const done = Object.entries(progress.sessionsDone).filter(([id]) => id.toUpperCase().startsWith(prefix))
    const stars = done.reduce((s, [, v]) => s + v, 0)
    return { planet: p, done: done.length, stars }
  })
  const closest = [...planetStats].filter((s) => s.done > 0).sort((a, b) => b.done - a.done)[0]

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 pt-4">
      {/* ── Badge wall ── */}
      <section aria-labelledby="badges-h" className={card}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="badges-h" className="font-display text-2xl font-bold text-white">
            Badge wall
          </h2>
          <p className="font-display text-sm font-bold text-amber-300">
            {ready ? `${earnedCount} of ${UNIVERSE_BADGES.length} Universe badges` : `${UNIVERSE_BADGES.length} Universe badges`}
          </p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {TRACKS.map((t) => {
            const list = UNIVERSE_BADGES.filter((b) => b.track === t.id)
            if (!list.length) return null
            const got = list.filter((b) => earned[b.id]).length
            return (
              <TrackCard key={t.id} label={t.label} line={t.line} list={list} earned={earned} got={got} ready={ready} />
            )
          })}
        </div>
        {ready && other.length > 0 && (
          <div className="mt-4 rounded-[20px] border border-white/[0.08] bg-[#0A1120]/50 p-3">
            <h3 className="font-display text-lg font-bold text-white">Course badges</h3>
            <p className="text-sm text-[#6E7888]">Earned by finishing sessions on a planet.</p>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {other.map(([id, day]) => (
                <li key={id} className="flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/[0.07] p-2.5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-2xl" aria-hidden>
                    🏅
                  </span>
                  <span>
                    <span className="block font-display font-bold text-white">{courseBadgeName(id)}</span>
                    <span className="block text-xs text-[#A7B0C0]">Earned {formatDay(day)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ── Personal bests ── */}
      <section aria-labelledby="bests-h" className={card}>
        <h2 id="bests-h" className="font-display text-2xl font-bold text-white">
          Personal bests
        </h2>
        <p className="mt-1 text-sm text-[#A7B0C0]">Your own best score in each game and tier. Only you are on this list — beat yourself.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {GAMES.map((g) => {
            const bests = TIER_NAMES.slice(0, g.tiers).map((tier, i) => ({ tier, v: progress.personalBests[`${g.id}:t${i}`] }))
            const any = bests.some((b) => b.v !== undefined)
            return (
              <li key={g.id} className="overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#0A1120]/50">
                <div className={`flex items-center gap-3 bg-gradient-to-r ${g.gradient} px-3 py-2`}>
                  <span className="text-2xl" aria-hidden>
                    {g.emoji}
                  </span>
                  <h3 className="font-display text-base font-bold text-white [text-shadow:0_1px_2px_rgba(0,0,0,.5)]">{g.name}</h3>
                </div>
                <dl className="grid grid-cols-4 gap-1 p-2">
                  {bests.map((b) => (
                    <div key={b.tier} className="rounded-xl bg-white/[0.04] px-1 py-2 text-center">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#A7B0C0]">{b.tier}</dt>
                      <dd className={`font-display text-base font-bold ${b.v !== undefined ? 'text-white' : 'text-[#6E7888]'}`}>
                        {ready && b.v !== undefined ? formatScore(b.v) : '—'}
                      </dd>
                    </div>
                  ))}
                </dl>
                {ready && !any && <p className="px-3 pb-3 text-xs text-[#6E7888]">Not played yet.</p>}
              </li>
            )
          })}
        </ul>
      </section>

      {/* ── Course progress ── */}
      <section aria-labelledby="course-h" className={card}>
        <h2 id="course-h" className="font-display text-2xl font-bold text-white">
          Course progress
        </h2>
        <p className="mt-1 text-sm text-[#A7B0C0]">Four planets, {SESSIONS_PER_PLANET} sessions each. Every finished session counts here.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {planetStats.map(({ planet, done, stars }) => {
            const pct = Math.round((done / SESSIONS_PER_PLANET) * 100)
            return (
              <li key={planet.id} className="rounded-[20px] border border-white/[0.08] bg-[#0A1120]/50 p-3">
                <div className="flex items-center gap-3">
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br ${planet.gradient} text-2xl shadow-[inset_-4px_-6px_10px_rgba(0,0,0,.35)]`} aria-hidden>
                    {planet.emoji}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-bold leading-tight text-white">{planet.name}</h3>
                    <p className="text-xs text-[#A7B0C0]">Level {planet.level}</p>
                  </div>
                </div>
                <p className="mt-3 font-display text-sm font-bold text-white">
                  {ready ? `${done} / ${SESSIONS_PER_PLANET} sessions` : `${SESSIONS_PER_PLANET} sessions`}
                  {ready && stars > 0 && <span className="ml-2 text-amber-300">★ {stars}</span>}
                </p>
                <div
                  className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10"
                  role="progressbar"
                  aria-label={`${planet.name} sessions finished`}
                  aria-valuemin={0}
                  aria-valuemax={SESSIONS_PER_PLANET}
                  aria-valuenow={ready ? done : 0}
                >
                  <div className={`h-full rounded-full bg-gradient-to-r ${planet.gradient}`} style={{ width: `${ready ? pct : 0}%` }} />
                </div>
                <p className="mt-2 text-xs text-[#6E7888]">{planet.tagline}</p>
              </li>
            )
          })}
        </ul>
      </section>

      {/* ── Certificates ── */}
      <section aria-labelledby="certs-h" className={card}>
        <h2 id="certs-h" className="font-display text-2xl font-bold text-white">
          Certificates
        </h2>
        <div className="mt-3 flex flex-col gap-4 rounded-[20px] border-2 border-dashed border-white/15 p-4 sm:flex-row sm:items-center">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-amber-500/15 text-4xl" aria-hidden>
            📜
          </span>
          <div>
            <p className="font-display text-lg font-bold text-white">Certificates arrive at the end of each level</p>
            <p className="text-sm text-[#A7B0C0]">
              Finish all {SESSIONS_PER_PLANET} sessions on a planet and your certificate for that level appears here, ready to print or show your
              teacher.
              {ready && closest && (
                <>
                  {' '}
                  Closest now: <strong className="text-white">{closest.planet.name}</strong>, {SESSIONS_PER_PLANET - closest.done}{' '}
                  {SESSIONS_PER_PLANET - closest.done === 1 ? 'session' : 'sessions'} to go.
                </>
              )}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function TrackCard({
  label,
  line,
  list,
  earned,
  got,
  ready,
}: {
  label: string
  line: string
  list: UniverseBadge[]
  earned: Record<string, string>
  got: number
  ready: boolean
}) {
  const [open, setOpen] = useState<string | null>(null)
  const panelId = useId()
  const sel = list.find((b) => b.id === open) ?? null
  const selDate = sel ? earned[sel.id] : undefined
  return (
    <div className="rounded-[20px] border border-white/[0.08] bg-[#0A1120]/50 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-bold text-white">{label}</h3>
        <span className="text-xs font-semibold text-[#A7B0C0]">{ready ? `${got}/${list.length}` : `${list.length} badges`}</span>
      </div>
      <p className="text-sm text-[#6E7888]">{line}</p>
      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {list.map((b) => {
          const have = ready && Boolean(earned[b.id])
          const on = open === b.id
          return (
            <li key={b.id}>
              <button
                type="button"
                aria-expanded={on}
                aria-controls={panelId}
                onClick={() => setOpen(on ? null : b.id)}
                className={`flex min-h-[112px] w-full flex-col items-center gap-1.5 rounded-2xl border-2 px-1.5 py-2.5 text-center transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-[.97] ${
                  on ? 'border-amber-400' : have ? 'border-amber-400/30' : 'border-white/[0.06]'
                } ${have ? 'bg-amber-500/[0.08]' : 'bg-white/[0.02]'}`}
              >
                <span
                  className={`grid h-12 w-12 place-items-center rounded-full text-2xl ${
                    have ? 'bg-gradient-to-b from-amber-400/40 to-amber-600/20 shadow-[0_0_18px_rgba(252,104,24,.3)] ring-2 ring-amber-400/60' : 'bg-white/[0.05] opacity-40 grayscale'
                  }`}
                  aria-hidden
                >
                  {b.icon}
                </span>
                <span className="font-display text-[13px] font-bold leading-tight text-white">{b.name}</span>
                <span className={`text-[11px] font-semibold leading-tight ${have ? 'text-amber-300' : 'text-[#6E7888]'}`}>
                  {!ready ? '\u00A0' : have ? formatDay(earned[b.id]) : 'Not yet'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <div id={panelId} aria-live="polite" className={sel ? 'mt-2 rounded-2xl bg-white/[0.04] p-3 text-sm text-[#A7B0C0]' : 'sr-only'}>
        {sel && (
          <p>
            <span className="font-display font-bold text-white">{sel.name}: </span>
            {ready && selDate ? `you earned this on ${formatDay(selDate)} because ${sel.earnedFor}` : `earned when ${sel.earnedFor}`}
          </p>
        )}
      </div>
    </div>
  )
}
