'use client'

// components/kids/games/swarm-reef/SwarmReefGameClient.tsx
// Swarm Reef — the playable game (loaded with next/dynamic, ssr:false).
// The child sets the local rules; ./sim decides what the swarm does.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { playSound, primeAudio } from '@/lib/kids-audio'
import {
  DT,
  aceScores,
  buildMission,
  coveragePct,
  createSim,
  scoreRun,
  stepSim,
  WORLD_H,
  WORLD_W,
  type Outcome,
  type SimState,
  type TierIndex,
  type Weights,
  type WeightKey,
} from './sim'
import { Fx, buildScenery, drawWorld, makeView, pickRobot, type View } from './render'
import { BRIEFS, RULES } from './rules'

interface Props {
  tier: number
  onFinish: (r: RoundResult) => void
}

type Phase = 'ready' | 'running' | 'paused' | 'done'

interface Hud {
  t: number
  arrived: number
  crashes: number
  bumps: number
  quality: number
  phaseLabel: string
  phaseLeft: number
  alive: number
  coverage: number
  found: number
  battery: number
}

// Remembered across "Try again" (the shell remounts the game each round), so a
// child keeps their settings and can read why the last run went the way it did.
const memory = new Map<number, { weights: Weights; last: Outcome | null; attempts: number }>()

const SPEEDS = [1, 2, 4] as const

export default function SwarmReefGameClient({ tier: tierProp, onFinish }: Props) {
  const tier = Math.max(0, Math.min(3, tierProp)) as TierIndex
  const mission = useMemo(() => buildMission(tier), [tier])
  const brief = BRIEFS[tier]
  const remembered = memory.get(tier)

  const [weights, setWeights] = useState<Weights>(() => remembered?.weights ?? { ...mission.defaults })
  const [phase, setPhase] = useState<Phase>('ready')
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)
  const [selected, setSelected] = useState(-1)
  const [hintsShown, setHintsShown] = useState(0)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [hud, setHud] = useState<Hud | null>(null)
  const lastOutcome = remembered?.last ?? null

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const simRef = useRef<SimState>(createSim(mission, { ...weights }))
  const phaseRef = useRef<Phase>('ready')
  const speedRef = useRef<number>(1)
  const selectedRef = useRef(-1)
  const weightsRef = useRef<Weights>(weights)
  const finishedRef = useRef(false)
  const finishTimer = useRef<number | null>(null)

  phaseRef.current = phase
  speedRef.current = speed
  selectedRef.current = selected

  // Live weights: the swarm obeys a slider the moment it moves.
  useEffect(() => {
    weightsRef.current = weights
    simRef.current.w = { ...weights }
    const mem = memory.get(tier)
    memory.set(tier, { weights, last: mem?.last ?? null, attempts: mem?.attempts ?? 0 })
  }, [weights, tier])

  const complete = useCallback(
    (s: SimState) => {
      if (finishedRef.current) return
      finishedRef.current = true
      const o = scoreRun(s)
      setOutcome(o)
      setPhase('done')
      const mem = memory.get(tier)
      const attempts = (mem?.attempts ?? 0) + 1
      memory.set(tier, { weights: weightsRef.current, last: o, attempts })
      playSound(o.stars > 0 ? 'zonecomplete' : 'wrong')
      // Let the child see the final state for a moment before the results card.
      finishTimer.current = window.setTimeout(() => {
        onFinish({
          stars: o.stars,
          score: o.score,
          scoreLabel: o.scoreLabel,
          message: [o.headline, ...o.why.slice(0, 2)].join(' '),
          badges: o.stars > 0 && tier >= 1 ? ['swarm-captain'] : undefined,
          attempts,
        })
        // The results card is centred over the whole game; on a phone that is
        // below the reef, so bring the middle of the game into view.
        const root = rootRef.current
        if (root) {
          const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          window.requestAnimationFrame(() => root.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' }))
        }
      }, 1800)
    },
    [onFinish, tier],
  )

  // ── Canvas loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const g = canvas.getContext('2d')
    if (!g) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fx = new Fx(reduced)
    const scenery = buildScenery(mission)
    let view: View = makeView(wrap.clientWidth, Math.min(2, window.devicePixelRatio || 1))

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      view = makeView(wrap.clientWidth, dpr)
      canvas.width = Math.round(view.w * dpr)
      canvas.height = Math.round(view.h * dpr)
      canvas.style.height = `${view.h}px`
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    let raf = 0
    let last = performance.now()
    let acc = 0
    let hudT = 0
    let clock = 0
    const soundGate = { arrive: 0, crash: 0, bump: 0 }

    const onVis = () => {
      if (document.hidden && phaseRef.current === 'running') setPhase('paused')
    }
    document.addEventListener('visibilitychange', onVis)

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      clock += dt
      const s = simRef.current
      if (phaseRef.current === 'running' && !s.done) {
        acc += dt * speedRef.current
        let steps = 0
        while (acc >= DT && steps < 16 && !s.done) {
          stepSim(s)
          acc -= DT
          steps++
        }
        if (s.events.length) {
          const got = fx.absorb(s.events)
          s.events.length = 0
          if (got.beacon) playSound('star')
          if (got.lost) playSound('wrong')
          if (got.arrive && now - soundGate.arrive > 110) {
            soundGate.arrive = now
            playSound('click')
          }
          if (got.crash && now - soundGate.crash > 600) {
            soundGate.crash = now
            playSound('wrong')
          }
        }
        if (s.done) complete(s)
      }
      fx.update(dt)
      drawWorld(g, view, s, scenery, fx, { time: clock, selected: selectedRef.current, reduced, showAllBeacons: s.done }, dt)

      hudT += dt
      if (hudT > 0.12) {
        hudT = 0
        const ph = s.m.phases?.[s.phaseIdx]
        const live = s.robots.filter((r) => r.alive)
        setHud({
          t: s.t,
          arrived: s.arrived,
          crashes: s.crashes,
          bumps: s.bumps,
          quality: Math.round(s.quality * 100),
          phaseLabel: ph?.label ?? '',
          phaseLeft: ph ? Math.max(0, ph.end - s.t) : 0,
          alive: live.length,
          coverage: Math.round(coveragePct(s)),
          found: s.found.filter(Boolean).length,
          battery: live.length ? Math.round(live.reduce((a, r) => a + r.battery, 0) / live.length) : 0,
        })
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [mission, complete])

  useEffect(
    () => () => {
      if (finishTimer.current) window.clearTimeout(finishTimer.current)
    },
    [],
  )

  // ── Controls ─────────────────────────────────────────────────────────────
  const launch = useCallback(() => {
    primeAudio()
    if (phaseRef.current === 'ready') {
      simRef.current = createSim(mission, { ...weightsRef.current })
      finishedRef.current = false
      playSound('click')
      setPhase('running')
    } else if (phaseRef.current === 'running') {
      setPhase('paused')
    } else if (phaseRef.current === 'paused') {
      setPhase('running')
    }
  }, [mission])

  const reset = useCallback(() => {
    if (phaseRef.current === 'done') return
    simRef.current = createSim(mission, { ...weightsRef.current })
    finishedRef.current = false
    setOutcome(null)
    setPhase('ready')
  }, [mission])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      launch()
    } else if (e.key === 'r' || e.key === 'R') {
      reset()
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const n = simRef.current.robots.length
      setSelected((i) => (i < 0 ? 0 : (i + (e.key === 'ArrowRight' ? 1 : n - 1)) % n))
    } else if (e.key === 'Escape') {
      setSelected(-1)
    }
  }

  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * WORLD_W
    const y = ((e.clientY - rect.top) / rect.height) * WORLD_H
    const i = pickRobot(simRef.current, x, y, 45)
    setSelected((cur) => (i === cur ? -1 : i))
    if (i >= 0) playSound('click')
  }

  const setW = (k: WeightKey, v: number) => setWeights((w) => ({ ...w, [k]: v }))

  // ── HUD text ─────────────────────────────────────────────────────────────
  const h = hud
  const n = mission.robots
  let main = ''
  let sub = ''
  let bar = 0
  if (h) {
    if (tier <= 1) {
      main = `${h.arrived}/${n} at the food`
      sub = tier === 1 ? `${h.crashes} wall crashes · ${h.bumps} bumps` : `${h.bumps} bumps`
      bar = h.arrived / n
    } else if (tier === 2) {
      main = `${h.phaseLabel}: ${h.quality}%`
      sub = `${h.alive} robots · ${h.phaseLeft.toFixed(0)} s left in this shape`
      bar = h.quality / 100
    } else {
      main = `${h.found}/6 beacons · ${h.coverage}% searched`
      sub = `${h.alive} robots running · battery ${h.battery}%`
      bar = h.coverage / 100
    }
  }

  const running = phase === 'running'
  const shownOutcome = outcome ?? (phase === 'ready' ? lastOutcome : null)

  return (
    <div ref={rootRef} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-3">
        {/* Mission brief */}
        <div className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-3 sm:p-4">
          <p className="text-xs font-black uppercase tracking-widest text-cyan-300">
            {['Cadet', 'Pilot', 'Ace', 'Legend'][tier]} mission
          </p>
          <h2 className="font-display text-xl font-black text-white sm:text-2xl">{brief.title}</h2>
          <p className="mt-1 font-bold text-amber-300">{brief.goal}</p>
          <ul className="mt-2 hidden list-disc space-y-0.5 pl-5 text-sm text-slate-300 sm:block">
            {brief.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>

        {/* The reef */}
        <div
          ref={wrapRef}
          className="relative w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#071226] shadow-[0_8px_24px_rgba(0,0,0,.45)] outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          tabIndex={0}
          onKeyDown={onKey}
          role="application"
          aria-label="Swarm Reef simulation. Space to launch or pause, R to reset, arrow keys to pick a robot for robot's-eye view."
        >
          <canvas ref={canvasRef} className="block w-full touch-manipulation" onPointerDown={onPointer} data-testid="swarm-canvas" />
          {h && (
            <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2 text-white">
              <div className="rounded-xl bg-slate-950/80 px-2 py-1 sm:px-2.5 sm:py-1.5">
                <p className="font-display text-sm font-black sm:text-base" data-testid="swarm-hud">
                  {main}
                </p>
                <p className="hidden text-xs text-slate-300 sm:block">{sub}</p>
                <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-white/10 sm:w-44">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-[width] duration-150" style={{ width: `${Math.round(Math.min(1, bar) * 100)}%` }} />
                </div>
              </div>
              <div className="rounded-xl bg-slate-950/80 px-2 py-1 text-right sm:px-2.5 sm:py-1.5">
                <p className="font-display text-sm font-black tabular-nums sm:text-base">
                  {h.t.toFixed(1)}
                  <span className="text-slate-400"> / {mission.timeLimit} s</span>
                </p>
                {speed > 1 && <p className="text-[11px] font-bold text-amber-300">{speed}× speed</p>}
              </div>
            </div>
          )}
          {phase === 'ready' && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
              <p className="rounded-full bg-slate-950/75 px-3 py-1 text-xs font-bold text-cyan-100 sm:text-sm">Tap a robot to see what it can sense</p>
            </div>
          )}
          {phase === 'paused' && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/30">
              <p className="rounded-2xl bg-slate-950/80 px-4 py-2 font-display text-lg font-black text-white">Paused</p>
            </div>
          )}
          {phase === 'done' && outcome && (
            <div className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center motion-safe:animate-pulse">
              <p className={`rounded-2xl px-5 py-2 font-display text-2xl font-black ${outcome.stars > 0 ? 'bg-emerald-400 text-slate-900' : 'bg-slate-900/90 text-white'}`}>{outcome.headline}</p>
            </div>
          )}
        </div>

        {/* Run controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={launch}
            disabled={phase === 'done'}
            data-testid="swarm-launch"
            className="min-h-[52px] flex-1 whitespace-nowrap rounded-2xl bg-amber-400 px-6 font-display text-lg font-black text-[#1A1103] shadow-[0_8px_24px_rgba(0,0,0,.45)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-[.97] disabled:opacity-50 sm:flex-none"
          >
            {phase === 'ready' ? 'Launch' : running ? 'Pause' : phase === 'paused' ? 'Resume' : 'Finished'}
          </button>
          <div className="flex rounded-2xl border border-white/15 bg-white/5 p-1" role="radiogroup" aria-label="Simulation speed">
            {SPEEDS.map((sp) => (
              <button
                key={sp}
                type="button"
                role="radio"
                aria-checked={speed === sp}
                data-testid={`swarm-speed-${sp}`}
                onClick={() => setSpeed(sp)}
                className={`min-h-[44px] min-w-[44px] rounded-xl px-2 font-black ${speed === sp ? 'bg-cyan-400 text-slate-900' : 'text-white/75 hover:text-white'}`}
              >
                {sp}×
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={reset}
            disabled={phase === 'ready' || phase === 'done'}
            className="min-h-[44px] rounded-2xl border border-white/15 bg-white/5 px-4 font-bold text-white hover:bg-white/10 disabled:opacity-40"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => setSelected((i) => (i >= 0 ? -1 : 0))}
            aria-pressed={selected >= 0}
            className={`min-h-[44px] rounded-2xl border px-4 font-bold ${selected >= 0 ? 'border-cyan-300 bg-cyan-400/15 text-cyan-100' : 'border-white/15 bg-white/5 text-white hover:bg-white/10'}`}
          >
            Robot’s-eye view
          </button>
        </div>

        {selected >= 0 && (
          <p className="rounded-2xl border border-cyan-300/30 bg-cyan-400/10 p-3 text-sm text-cyan-50">
            <b>Robot’s-eye view:</b> the dashed circle is everything this robot can sense (radius {weights.radius}). The lines are the neighbours it
            can see right now — it knows nothing about any other robot. Every robot runs the same rules on just this small view; there is no leader.
            {weights.radius > 55 && <> The red circle is its personal space: separation only pushes neighbours that close.</>}
          </p>
        )}

        {/* Why it happened */}
        {shownOutcome && (
          <section className="rounded-[20px] border border-amber-300/30 bg-amber-400/[0.06] p-4" aria-live="polite" data-testid="swarm-debrief">
            <h3 className="font-display text-lg font-black text-amber-300">
              {outcome ? 'Why it happened' : 'Last run — why it happened'}
              <span className="ml-2 text-base" aria-label={`${shownOutcome.stars} stars`}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={i < shownOutcome.stars ? '' : 'opacity-25 grayscale'}>
                    ⭐
                  </span>
                ))}
              </span>
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {shownOutcome.stats.map((st) => (
                <span key={st.label} className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
                  {st.label}: <span className="text-cyan-200">{st.value}</span>
                </span>
              ))}
            </div>
            <ul className="mt-3 space-y-2 text-[15px] text-slate-100">
              {shownOutcome.why.map((w) => (
                <li key={w} className="flex gap-2">
                  <span aria-hidden className="text-amber-300">
                    ▸
                  </span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Rule panel */}
      <aside className="flex flex-col gap-3" aria-label="Swarm rules">
        <div className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-black text-white">Your swarm’s rules</h3>
            <button
              type="button"
              onClick={() => {
                setWeights({ ...mission.defaults })
                playSound('click')
              }}
              className="min-h-[44px] rounded-xl px-3 text-sm font-bold text-slate-300 hover:text-white"
            >
              Defaults
            </button>
          </div>
          <p className="text-sm text-slate-400">Every robot follows these same rules, using only what it senses. You can change them while the swarm swims.</p>
          <div className="mt-3 flex flex-col gap-2">
            {mission.enabled.map((k) => {
              const r = RULES[k]
              const v = weights[k]
              const id = `swarm-${k}`
              return (
                <div key={k} className="rounded-2xl border border-white/10 bg-[#111C32] p-3">
                  <div className="flex items-center gap-2">
                    <span className={k === 'radius' ? 'text-cyan-300' : 'text-amber-300'}>{r.icon}</span>
                    <label htmlFor={id} className="flex-1 font-display font-black text-white">
                      {r.name}
                    </label>
                    <span className="min-w-[3ch] rounded-lg bg-white/10 px-2 py-0.5 text-right font-display font-black tabular-nums text-white">
                      {k === 'radius' ? v : v.toFixed(1)}
                    </span>
                  </div>
                  <input
                    id={id}
                    data-testid={id}
                    type="range"
                    min={r.min}
                    max={r.max}
                    step={r.step}
                    value={v}
                    onChange={(e) => setW(k, Number(e.target.value))}
                    className="mt-2 h-11 w-full cursor-pointer accent-amber-400"
                    aria-describedby={`${id}-d`}
                  />
                  <p id={`${id}-d`} className="text-sm text-slate-300">
                    {r.kid} {tier >= 2 && <span className="text-slate-400">{r.pro}</span>}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display font-black text-white">Spark’s hints</h3>
            <button
              type="button"
              onClick={() => {
                setHintsShown((x) => Math.min(brief.hints.length, x + 1))
                playSound('click')
              }}
              disabled={hintsShown >= brief.hints.length}
              className="min-h-[44px] rounded-xl border border-amber-300/50 px-3 text-sm font-black text-amber-200 disabled:opacity-40"
            >
              {hintsShown === 0 ? 'Give me a hint' : hintsShown < brief.hints.length ? 'Another hint' : 'No more hints'}
            </button>
          </div>
          {hintsShown > 0 && (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-200">
              {brief.hints.slice(0, hintsShown).map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
          )}
        </div>

        {tier === 2 && phase !== 'ready' && (
          <p className="rounded-2xl bg-white/5 p-3 text-xs text-slate-400">
            Shape scores so far: {aceScores(simRef.current).map((v, i) => `${['ring', 'healed', 'line'][i]} ${Math.round(v)}`).join(' · ')}
          </p>
        )}
      </aside>
    </div>
  )
}
