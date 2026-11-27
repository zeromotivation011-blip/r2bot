'use client'

// components/kids/portfolio/PortfolioClient.tsx — My Robotics Portfolio (roadmap #45).
// Everything is READ from the stores already on this device: home builds
// (lib/kids/builds/store.ts), course sessions, badges, Rank and personal bests
// (lib/kids-progress.ts), Skill Galaxy activities, the Robodex, Flight Recorder
// ghosts. The portfolio's own store keeps robot snapshots and teens' one-line
// reflections (portfolio-store.ts). Nothing leaves the device; "Save as PDF"
// is the browser's print dialog with print CSS (PrintStyles). Never ranks or
// compares children.

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useId, useState } from 'react'
import { collectedStars, getProgress, KIDS_PROGRESS_EVENT, type KidsProgress } from '@/lib/kids-progress'
import { getActivitiesDone } from '@/lib/kids/activities/progress'
import { BUILDS_EVENT, readBuilds, type BuildsState } from '@/lib/kids/builds/store'
import { checkReflection, REFLECTION_MAX_CHARS } from '@/lib/kids/builds/reflection'
import { KIDS_PROFILE_EVENT, profileKey } from '@/lib/kids/profiles'
import { decodeDesign, encodeDesign, loadDesign, ROBOT_CHANGED_EVENT } from '@/lib/kids/robot-design'
import { levelInfo, UNIVERSE_BADGES, type BadgeTrack } from '@/lib/kids/universe/rewards'
import { GrownUpLink } from '@/components/kids/app/GrownUpLinkClient'
import { addSnapshot, PORTFOLIO_EVENT, readPortfolio, removeSnapshot, setReflection, type PortfolioState } from './portfolio-store'
import RobotSketch from './RobotSketch'
import CertificatesClient from './CertificatesClient'
import type { CertEvidence, WorldInfo } from './certificates'

const HelplineCardClient = dynamic(() => import('@/components/kids/ai/spark/HelplineCardClient'), { ssr: false })

export interface PortfolioBuildInfo {
  id: string
  title: string
  emoji: string
  track: string
  change: string
  outcomes: [string, string, string]
}

export interface PortfolioProps {
  builds: PortfolioBuildInfo[]
  worlds: WorldInfo[]
  games: { id: string; name: string; emoji: string }[]
  courseBadges: Record<string, { name: string; icon: string }>
  totalRobodex: number
}

const TIERS = ['Cadet', 'Pilot', 'Ace', 'Legend']
const TRACK_LABEL: Record<BadgeTrack, string> = {
  motion: 'Motion', sensing: 'Sensing', logic: 'Logic and code', control: 'Control', mechanics: 'Mechanics', electronics: 'Electronics',
  ai: 'AI and maps', design: 'Design', explorer: 'Exploring', grit: 'Grit', careers: 'Robotics careers',
}
/** Same key as lib/kids/robodex/store.ts ROBODEX_KEY (not imported: that module carries every card). */
const ROBODEX_KEY = 'r2bot_kids_robodex_v1'
/** Same key as lib/kids/sim/ghost-store.ts GHOSTS_BASE. */
const GHOSTS_BASE = 'r2bot_kids_sim_ghosts_v1'

interface Snapshot {
  p: KidsProgress
  builds: BuildsState
  portfolio: PortfolioState
  galaxyDone: Record<string, { stars: number }>
  robodex: number
  ghosts: { arena: string; time: number }[]
  teen: boolean
}

function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(profileKey(key))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function read(): Snapshot {
  const p = getProgress()
  const rdx = readJson(ROBODEX_KEY) as { found?: Record<string, unknown> } | null
  const g = readJson(GHOSTS_BASE) as { g?: Record<string, { time?: unknown }> } | null
  const ghosts = Object.entries(g?.g ?? {})
    .filter(([, v]) => typeof v?.time === 'number' && Number.isFinite(v.time))
    .map(([arena, v]) => ({ arena, time: v.time as number }))
  return {
    p,
    builds: readBuilds(),
    portfolio: readPortfolio(),
    galaxyDone: getActivitiesDone() as Record<string, { stars: number }>,
    robodex: rdx?.found && typeof rdx.found === 'object' ? Object.keys(rdx.found).length : 0,
    ghosts,
    teen: p.band === 'inventors' || p.band === 'engineers' || (p.age !== null && p.age >= 11),
  }
}

function prettyDay(d: string): string {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function humanise(id: string): string {
  return id.replace(/[-_]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

const h2 = 'font-display text-2xl font-bold text-[#EEF2F8]'
const card = 'rounded-[20px] border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)]'
const btn = 'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-4 font-display font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

/** One-line reflection editor (Inventors and Engineers only). */
function ReflectionLine({ itemKey, value, label }: { itemKey: string; value: string | undefined; label: string }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(value ?? '')
  const [error, setError] = useState<string | null>(null)
  const [crisis, setCrisis] = useState(false)
  const id = useId()
  useEffect(() => setText(value ?? ''), [value])

  if (!open) {
    return (
      <div className="mt-2">
        {value && <p className="text-[15px] italic text-[#EEF2F8]">“{value}”</p>}
        <button type="button" onClick={() => setOpen(true)} className="no-print mt-1 inline-flex min-h-[44px] items-center rounded-xl px-2 text-[14px] font-semibold text-amber-300 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
          {value ? 'Edit reflection' : '+ Add a one-line reflection'}
        </button>
      </div>
    )
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const c = checkReflection(text)
    if (!c.ok) {
      setError(c.error)
      setCrisis(c.crisis)
      return
    }
    setReflection(itemKey, c.text)
    setError(null)
    setCrisis(false)
    setOpen(false)
  }
  return (
    <form onSubmit={submit} className="no-print mt-2" noValidate>
      <label htmlFor={id} className="sr-only">
        Reflection on {label}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={REFLECTION_MAX_CHARS}
          autoComplete="off"
          placeholder="What worked, what you’d change next time"
          className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-white/15 bg-black/40 px-3 text-[16px] text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/40"
        />
        <button type="submit" className={`${btn} min-h-[44px] bg-amber-500 text-[#1A1103] hover:bg-amber-400`}>
          Save
        </button>
        <button type="button" onClick={() => setOpen(false)} className={`${btn} min-h-[44px] border border-white/15 text-[#EEF2F8]`}>
          Cancel
        </button>
      </div>
      {error && (
        <div role="alert" className="mt-2">
          <p className="text-[14px] font-semibold text-red-200">{error}</p>
          {crisis && <HelplineCardClient />}
        </div>
      )}
    </form>
  )
}

export default function PortfolioClient({ builds, worlds, games, courseBadges, totalRobodex }: PortfolioProps) {
  const [s, setS] = useState<Snapshot | null>(null)
  const [snapNote, setSnapNote] = useState<string | null>(null)

  const refresh = useCallback(() => setS(read()), [])
  useEffect(() => {
    refresh()
    const events = [KIDS_PROGRESS_EVENT, BUILDS_EVENT, PORTFOLIO_EVENT, KIDS_PROFILE_EVENT, ROBOT_CHANGED_EVENT, 'storage']
    for (const e of events) window.addEventListener(e, refresh)
    return () => {
      for (const e of events) window.removeEventListener(e, refresh)
    }
  }, [refresh])

  if (!s) return <div className="min-h-[900px] rounded-[28px] bg-white/[0.03]" aria-hidden />

  const { p, teen, portfolio } = s
  const rank = levelInfo(p.xp).level
  const builtList = builds.filter((b) => s.builds[b.id]).sort((a, b) => (s.builds[b.id].d < s.builds[a.id].d ? -1 : 1))
  const robot = (() => {
    try {
      return loadDesign()
    } catch {
      return null
    }
  })()

  const levelSessions = ([1, 2, 3, 4] as const).map((lv) => {
    let n = 0
    for (let i = 1; i <= 24; i++) if ((p.sessionsDone[`L${lv}-S${String(i).padStart(2, '0')}`] ?? 0) > 0) n += 1
    return n
  })

  const gameRuns = Object.entries(p.personalBests)
    .map(([k, v]) => {
      const m = /^([a-z0-9-]+):t(\d)$/.exec(k)
      if (!m) return null
      const g = games.find((x) => x.id === m[1])
      return g ? { key: k, name: g.name, emoji: g.emoji, tier: TIERS[Number(m[2])] ?? `Tier ${m[2]}`, score: v } : null
    })
    .filter((x): x is { key: string; name: string; emoji: string; tier: string; score: number } => x !== null)

  const badgeGroups = (Object.keys(TRACK_LABEL) as BadgeTrack[])
    .map((t) => ({ track: t, badges: UNIVERSE_BADGES.filter((b) => b.track === t && p.badges[b.id]) }))
    .filter((g) => g.badges.length > 0)
  const course = Object.keys(p.badges).filter((id) => courseBadges[id]).map((id) => ({ id, ...courseBadges[id] }))

  const evidence: CertEvidence = {
    sessions: { 1: levelSessions[0], 2: levelSessions[1], 3: levelSessions[2], 4: levelSessions[3] },
    worlds: Object.fromEntries(
      worlds.map((w) => [
        w.id,
        { done: w.activityIds.filter((id) => s.galaxyDone[id]).length, game: Object.keys(p.personalBests).some((k) => k.split(':')[0] === w.game) },
      ]),
    ),
    rank,
    builds: builtList.length,
    buildTracks: [...new Set(builtList.map((b) => b.track))],
    totalBuilds: builds.length,
    robodex: s.robodex,
    totalRobodex,
    conceptsSecured: Object.keys(p.conceptSecured ?? {}).length,
    badges: p.badges,
  }

  function snap() {
    if (!robot) return
    const ok = addSnapshot(encodeDesign(robot))
    setSnapNote(ok ? 'Snapped! Today’s robot is in your portfolio.' : 'This device would not save the snapshot.')
  }

  const name = p.explorerName || ''

  return (
    <div className="print-sheet">
      {/* ── Cover ── */}
      <section aria-labelledby="pf-cover" className={`${card} flex flex-wrap items-center gap-5`}>
        {robot && (
          <div className="grid h-[132px] w-[132px] shrink-0 place-items-center rounded-[20px] bg-[#0A1120]">
            <RobotSketch design={robot} size={112} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 id="pf-cover" className="font-display text-3xl font-bold text-[#EEF2F8]">
            {name ? `${name}’s robotics portfolio` : 'My robotics portfolio'}
          </h2>
          <p className="mt-1 text-[#A7B0C0]">
            {robot?.name ? `Robot: ${robot.name} · ` : ''}As of {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Rank', String(rank)],
              ['Stars', String(collectedStars(p))],
              ['Badges', String(Object.keys(p.badges).length)],
              ['Home builds', String(builtList.length)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white/[0.04] px-3 py-2">
                <dt className="text-[13px] font-semibold text-[#A7B0C0]">{k}</dt>
                <dd className="font-display text-2xl font-bold text-amber-300">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="no-print flex w-full flex-wrap gap-2 sm:w-auto sm:flex-col">
          <button type="button" onClick={() => window.print()} className={`${btn} bg-amber-500 text-[#1A1103] hover:bg-amber-400`}>
            Save as PDF / print
          </button>
          <a href="#certificates" className={`${btn} border border-white/15 text-[#EEF2F8] hover:border-amber-400/60`}>
            My certificates
          </a>
        </div>
      </section>

      {/* ── Projects ── */}
      <section aria-labelledby="pf-projects" className="mt-8">
        <h2 id="pf-projects" className={h2}>Projects I built</h2>
        {builtList.length === 0 ? (
          <div className={`${card} mt-3`}>
            <p className="text-[17px] text-[#EEF2F8]">No home builds yet.</p>
            <p className="mt-1 text-[#A7B0C0]">Pick one from Make It at Home — a cardboard robot hand, a bottle diver, a lemon battery — then answer Spark’s “I built it” question.</p>
            <Link href="/kids/printables" className={`${btn} no-print mt-3 bg-amber-500 text-[#1A1103] hover:bg-amber-400`}>
              Find a build →
            </Link>
          </div>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {builtList.map((b) => {
              const rec = s.builds[b.id]
              return (
                <li key={b.id} className={card}>
                  <p className="flex items-center gap-2 font-display text-lg font-bold text-[#EEF2F8]">
                    <span aria-hidden>{b.emoji}</span>
                    <Link href={`/kids/printables/${b.id}`} className="inline-flex min-h-[44px] items-center hover:text-amber-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
                      {b.title}
                    </Link>
                  </p>
                  <p className="text-[14px] text-[#A7B0C0]">
                    {b.track} · built {prettyDay(rec.d)}
                  </p>
                  {rec.t !== undefined && (
                    <p className="mt-2 text-[15px] text-[#EEF2F8]">
                      <span className="font-semibold text-cyan-200">My fair test</span> ({b.change.toLowerCase()}): {b.outcomes[rec.t]}.
                    </p>
                  )}
                  {rec.r && <p className="mt-2 text-[15px] italic text-[#EEF2F8]">“{rec.r}”</p>}
                  {teen && !rec.r && (
                    <Link href={`/kids/printables/${b.id}`} className="no-print mt-1 inline-flex min-h-[44px] items-center text-[14px] font-semibold text-amber-300 hover:underline">
                      + Add a reflection on the build page
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        <div className={`${card} mt-3`}>
          <p className="font-display text-lg font-bold text-[#EEF2F8]">Course</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-4">
            {levelSessions.map((n, i) => (
              <li key={i} className="text-[15px]">
                <span className="font-semibold text-[#EEF2F8]">Level {i + 1}:</span> <span className="text-[#A7B0C0]">{n} of 24 sessions</span>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.round((n / 24) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Robot snapshots ── */}
      <section aria-labelledby="pf-robots" className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="pf-robots" className={h2}>My robot over time</h2>
            <p className="text-[#A7B0C0]">Snap your robot to keep a picture of how it grew. One snapshot a day; the newest twelve are kept.</p>
          </div>
          {robot && (
            <button type="button" onClick={snap} className={`${btn} no-print border border-amber-400/60 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20`}>
              📸 Snap my robot today
            </button>
          )}
        </div>
        <p aria-live="polite" className="no-print mt-1 min-h-[24px] text-[15px] font-semibold text-emerald-200">
          {snapNote}
        </p>
        {portfolio.s.length === 0 ? (
          <p className={`${card} mt-2 text-[#A7B0C0]`}>No snapshots yet. Build or change your robot in the Workshop, then snap it here.</p>
        ) : (
          <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[...portfolio.s].reverse().map((x) => {
              const d = decodeDesign(x.c)
              if (!d) return null
              return (
                <li key={x.d} className={`${card} text-center`}>
                  <div className="mx-auto grid place-items-center rounded-2xl bg-[#0A1120] py-2">
                    <RobotSketch design={d} size={96} />
                  </div>
                  <p className="mt-2 font-display font-bold text-[#EEF2F8]">{d.name || 'My robot'}</p>
                  <p className="text-[13px] text-[#A7B0C0]">{prettyDay(x.d)}</p>
                  {teen && <ReflectionLine itemKey={`snap:${x.d}`} value={portfolio.r[`snap:${x.d}`]} label={`robot snapshot ${x.d}`} />}
                  {!teen && portfolio.r[`snap:${x.d}`] && <p className="mt-2 text-[14px] italic text-[#EEF2F8]">“{portfolio.r[`snap:${x.d}`]}”</p>}
                  <button
                    type="button"
                    onClick={() => removeSnapshot(x.d)}
                    className="no-print mt-1 inline-flex min-h-[44px] items-center rounded-xl px-2 text-[13px] font-semibold text-[#A7B0C0] hover:text-red-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                  >
                    Remove
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ── Best runs (replays) ── */}
      <section aria-labelledby="pf-runs" className="mt-8">
        <h2 id="pf-runs" className={h2}>My best runs</h2>
        <p className="text-[#A7B0C0]">Your own personal bests: games by tier, and the Flight Recorder ghosts you can race in the Lab. Beat yourself, never anyone else.</p>
        {gameRuns.length === 0 && s.ghosts.length === 0 ? (
          <p className={`${card} mt-2 text-[#A7B0C0]`}>
            No runs yet. Finish a round in{' '}
            <Link href="/kids/play" className="inline-flex min-h-[44px] items-center font-semibold text-amber-300 hover:underline">Games</Link> or the{' '}
            <Link href="/kids/lab/power" className="inline-flex min-h-[44px] items-center font-semibold text-amber-300 hover:underline">Power Lab</Link>.
          </p>
        ) : (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {gameRuns.map((r) => (
              <li key={r.key} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#111C32] px-3 py-2">
                <span aria-hidden className="text-2xl">{r.emoji}</span>
                <span className="min-w-0">
                  <span className="block font-semibold text-[#EEF2F8]">{r.name}</span>
                  <span className="text-[14px] text-[#A7B0C0]">
                    {r.tier} · best score {Math.round(r.score)}
                  </span>
                </span>
              </li>
            ))}
            {s.ghosts.map((g) => (
              <li key={g.arena} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#111C32] px-3 py-2">
                <span aria-hidden className="text-2xl">👻</span>
                <span className="min-w-0">
                  <span className="block font-semibold text-[#EEF2F8]">{humanise(g.arena)}</span>
                  <span className="text-[14px] text-[#A7B0C0]">Fastest run {g.time.toFixed(1)} s (your ghost)</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {teen && (gameRuns.length > 0 || s.ghosts.length > 0) && <ReflectionLine itemKey="runs" value={portfolio.r.runs} label="best runs" />}
      </section>

      {/* ── Badges by skill ── */}
      <section aria-labelledby="pf-badges" className="mt-8">
        <h2 id="pf-badges" className={h2}>Badges by skill</h2>
        {badgeGroups.length === 0 && course.length === 0 ? (
          <p className={`${card} mt-2 text-[#A7B0C0]`}>Badges arrive as you play, build and learn. Your first is closer than you think!</p>
        ) : (
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {badgeGroups.map((g) => (
              <div key={g.track} className={card}>
                <p className="font-display text-lg font-bold text-[#EEF2F8]">{TRACK_LABEL[g.track]}</p>
                <ul className="mt-2 space-y-1">
                  {g.badges.map((b) => (
                    <li key={b.id} className="text-[15px] text-[#A7B0C0]">
                      <span aria-hidden>{b.icon} </span>
                      <strong className="text-[#EEF2F8]">{b.name}</strong> — {b.earnedFor}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {course.length > 0 && (
              <div className={card}>
                <p className="font-display text-lg font-bold text-[#EEF2F8]">Course badges</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {course.map((b) => (
                    <li key={b.id} className="rounded-full border border-white/10 px-3 py-1 text-[14px] text-[#EEF2F8]">
                      <span aria-hidden>{b.icon} </span>
                      {b.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {teen && badgeGroups.length > 0 && <ReflectionLine itemKey="badges" value={portfolio.r.badges} label="badges" />}
      </section>

      {/* ── Certificates ── */}
      <section id="certificates" aria-labelledby="pf-certs" className="print-break mt-10 scroll-mt-24">
        <h2 id="pf-certs" className={h2}>Certificates</h2>
        <p className="text-[#A7B0C0]">One for every course level, every World and every milestone. Each lists the skills it shows. Every child who does the work earns the same certificate.</p>
        <CertificatesClient evidence={evidence} worlds={worlds} defaultName={name} robotName={robot?.name || 'my robot'} badges={Object.keys(p.badges).length} />
        <p className="no-print mt-4 text-[15px] text-[#A7B0C0]">
          Teacher?{' '}
          <GrownUpLink href="/kids/portfolio/class-certificates" message="This opens the class certificate printer for teachers." className="inline-flex min-h-[44px] items-center font-semibold text-amber-300 hover:underline">
            Print a class set with your school name
          </GrownUpLink>
          .
        </p>
      </section>
    </div>
  )
}
