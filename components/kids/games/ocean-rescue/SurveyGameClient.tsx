'use client'

// components/kids/games/ocean-rescue/SurveyGameClient.tsx
// Ace and Legend: plan an AUV mission on the chart, launch, and watch the robot
// carry it out alone. The simulation in ./survey decides what happens.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { playSound, primeAudio } from '@/lib/kids-audio'
import {
  DEFAULT_ACE,
  DEFAULT_LEGEND,
  DETAIL_M,
  DVL_MAX_ALT,
  SURVEY_DT,
  SURVEY_LEVELS,
  batteryPct,
  coverage,
  createSurvey,
  footprint,
  legendLines,
  navError,
  planEstimate,
  scoreSurvey,
  seabedDepth,
  stepSurvey,
  swathWidth,
  type AcePlan,
  type LegendPlan,
  type SurveyReport,
  type SurveyState,
} from './survey'
import { bathymetry, drawMap, drawProfile, makeMapView, toWorld, type MapView } from './surveyRender'
import { Debrief, PlanSlider } from './ControlsClient'
import { pressureAtm } from './physics'

interface Props {
  tier: 2 | 3
  onFinish: (r: RoundResult) => void
}

type Phase = 'plan' | 'running' | 'done'

interface Hud {
  t: number
  batt: number
  z: number
  alt: number
  lock: boolean
  usbl: boolean
  err: number
  phase: string
  cover: number
}

const MAX_WP = 8

// The child's last plan survives "Play again" / "Try again" (the shell remounts the game).
const saved: { ace: AcePlan | null; legend: LegendPlan | null } = { ace: null, legend: null }

const BRIEF: Record<2 | 3, { title: string; steps: string[] }> = {
  2: {
    title: 'Ace — AUV search, out of contact',
    steps: [
      'A science lander with an acoustic transponder sank somewhere in the dashed circle. Your AUV has no tether and no radio once it dives — so you write its program first.',
      'Tap the chart to place up to 8 waypoints. The pale band shows where it can hear the transponder (70 m). It will home in, mark the spot and come home by itself.',
      'Win: mark the lander within 15 m of where it really is, get back to the ship. Choose height, speed and sonar rules wisely.',
    ],
  },
  3: {
    title: 'Legend — map the reef',
    steps: [
      'Map the whole reef box with a multibeam sonar: a fan of 120° that sees a strip about 3.5 × your height wide.',
      'You set the lawn-mower lines: direction, spacing, height above the seabed and speed. Budget: 60 Wh of battery and 60 minutes.',
      'Win: 90 % of the box mapped SHARP (detail ≤ 1 m and position error ≤ 8 m), then back to the ship.',
    ],
  },
}

export default function SurveyGameClient({ tier, onFinish }: Props) {
  const L = SURVEY_LEVELS[tier]
  const [phase, setPhase] = useState<Phase>('plan')
  const [ace, setAce] = useState<AcePlan>(() => {
    const base = saved.ace ?? DEFAULT_ACE
    return { ...base, waypoints: base.waypoints.map((w) => [w[0], w[1]] as [number, number]) }
  })
  const [leg, setLeg] = useState<LegendPlan>(() => ({ ...(saved.legend ?? DEFAULT_LEGEND) }))
  const [warp, setWarp] = useState(tier === 2 ? 20 : 50)
  const [hud, setHud] = useState<Hud | null>(null)
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const [report, setReport] = useState<SurveyReport | null>(null)
  const [paused, setPaused] = useState(false)
  const [cursor, setCursor] = useState<[number, number] | null>(null)

  const mapRef = useRef<HTMLCanvasElement>(null)
  const profRef = useRef<HTMLCanvasElement>(null)
  const simRef = useRef<SurveyState | null>(null)
  const phaseRef = useRef<Phase>('plan')
  const warpRef = useRef(warp)
  const pausedRef = useRef(false)
  const viewRef = useRef<MapView | null>(null)
  const bathyRef = useRef<HTMLCanvasElement | null>(null)
  const planRef = useRef<{ route: [number, number][]; altitude: number; hearing?: number; swath?: boolean; cursor?: [number, number] | null }>({ route: [], altitude: 20 })
  const attempts = useRef(0)
  const reportedRef = useRef(false)
  const toastId = useRef(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const route = useMemo<[number, number][]>(() => (tier === 2 ? ace.waypoints : legendLines(L, leg)), [tier, ace.waypoints, L, leg])
  const altitude = tier === 2 ? ace.altitude : leg.altitude
  const speed = tier === 2 ? ace.speed : leg.speed
  const est = useMemo(() => planEstimate(L, route, speed, tier === 2 ? ace.pingEvery : undefined), [L, route, speed, tier, ace.pingEvery])

  useEffect(() => {
    planRef.current = { route, altitude, hearing: tier === 2 ? L.transponderRange : undefined, swath: tier === 3, cursor }
  }, [route, altitude, tier, L, cursor])
  useEffect(() => {
    warpRef.current = warp
  }, [warp])
  useEffect(() => {
    saved.ace = ace
  }, [ace])
  useEffect(() => {
    saved.legend = leg
  }, [leg])

  const showToast = useCallback((text: string) => {
    const id = ++toastId.current
    setToast({ id, text })
    timers.current.push(setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 2600))
  }, [])

  const showMap = useCallback(() => {
    const el = mapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.top < 64 || r.bottom > window.innerHeight - 60) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
    }
  }, [])

  const launch = useCallback(() => {
    if (phaseRef.current !== 'plan') return
    if (tier === 2 && ace.waypoints.length === 0) {
      showToast('Place at least one waypoint on the chart first.')
      return
    }
    primeAudio()
    playSound('click')
    attempts.current += 1
    simRef.current = createSurvey(L, tier === 2 ? { ace: { ...ace, waypoints: ace.waypoints.map((w) => [w[0], w[1]] as [number, number]) } } : { legend: { ...leg } })
    phaseRef.current = 'running'
    setPhase('running')
    setCursor(null)
    showToast('Diving… radio contact lost. The robot is on its own now.')
    showMap()
  }, [tier, ace, leg, L, showToast, showMap])

  const end = useCallback((s: SurveyState) => {
    if (phaseRef.current === 'done') return
    phaseRef.current = 'done'
    setPhase('done')
    const r = scoreSurvey(s)
    setReport(r)
    playSound(r.won ? 'star' : 'wrong')
    showMap()
  }, [showMap])

  const replan = useCallback(() => {
    simRef.current = null
    phaseRef.current = 'plan'
    setPhase('plan')
    setReport(null)
    setHud(null)
  }, [])

  const finishRound = useCallback(() => {
    if (!report || reportedRef.current) return
    reportedRef.current = true
    const badges = report.won ? (tier === 3 ? ['planet-hopper', 'map-maker'] : ['planet-hopper', 'decision-maker']) : undefined
    onFinish({ stars: report.stars, score: report.score, scoreLabel: report.scoreLabel, message: report.message, badges, attempts: Math.max(1, attempts.current) })
  }, [report, onFinish, tier])

  // ── loop ──
  useEffect(() => {
    const map = mapRef.current
    const prof = profRef.current
    if (!map || !prof) return
    const ctx = map.getContext('2d')
    const pctx = prof.getContext('2d')
    if (!ctx || !pctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    bathyRef.current = bathymetry(L)
    let pw = 300
    let ph = 100
    let dpr = 1
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = map.clientWidth
      const h = map.clientHeight
      map.width = Math.round(w * dpr)
      map.height = Math.round(h * dpr)
      viewRef.current = makeMapView(L, w, h, dpr)
      pw = prof.clientWidth
      ph = prof.clientHeight
      prof.width = Math.round(pw * dpr)
      prof.height = Math.round(ph * dpr)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(map)
    ro.observe(prof)
    let raf = 0
    let last = performance.now()
    let acc = 0
    let hudAt = 0
    let n = 0
    const frame = (now: number) => {
      const dtReal = Math.min(0.1, Math.max(0, (now - last) / 1000))
      last = now
      const s = simRef.current
      if (s && phaseRef.current === 'running' && !pausedRef.current) {
        acc += dtReal * warpRef.current
        let steps = 0
        while (acc >= SURVEY_DT && steps < 2000) {
          stepSurvey(s)
          acc -= SURVEY_DT
          steps++
          for (const ev of s.events) {
            switch (ev.kind) {
              case 'lock':
                showToast(ev.on ? 'DVL bottom lock ✓ — it can feel its speed over the seabed.' : 'DVL lost bottom lock — too high above the seabed.')
                break
              case 'heard':
                playSound('correct')
                showToast(`Transponder heard at ${ev.range.toFixed(0)} m! Homing in…`)
                break
              case 'marked':
                playSound('levelup')
                showToast('Lander marked. Heading home.')
                break
              case 'low-battery':
                showToast('Battery reserve reached — rule says: go home.')
                break
              case 'crash':
                playSound('wrong')
                break
              case 'surfaced':
                playSound('star')
                break
              default:
                break
            }
          }
          s.events.length = 0
          if (s.outcome !== 'running') break
        }
        if (s.outcome !== 'running') end(s)
      } else acc = 0
      const v = viewRef.current
      if (v) drawMap(ctx, v, L, bathyRef.current, s, planRef.current, { showTruth: phaseRef.current === 'done', now: now / 1000, reduced })
      if (n++ % 4 === 0) drawProfile(pctx, pw, ph, dpr, L, s, planRef.current.route, planRef.current.altitude)
      if (s && now - hudAt > 150) {
        hudAt = now
        const bed = seabedDepth(L, s.x, s.y)
        setHud({ t: s.t, batt: batteryPct(s), z: s.z, alt: bed - s.z, lock: s.lock, usbl: s.usbl, err: navError(s), phase: s.phase, cover: s.legend ? coverage(s).good : 0 })
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    const onVis = () => {
      pausedRef.current = document.hidden
      setPaused(document.hidden)
      last = performance.now()
    }
    document.addEventListener('visibilitychange', onVis)
    const tm = timers.current
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      tm.forEach(clearTimeout)
    }
  }, [L, end, showToast])

  // ── waypoint editing (Ace) ──
  const addWaypoint = useCallback(
    (x: number, y: number) => {
      if (phaseRef.current !== 'plan' || tier !== 2) return
      const wx = Math.round(Math.max(5, Math.min(L.width - 5, x)) / 5) * 5
      const wy = Math.round(Math.max(5, Math.min(L.height - 5, y)) / 5) * 5
      setAce((a) => {
        // Tap on an existing waypoint removes it.
        const hit = a.waypoints.findIndex(([px, py]) => Math.hypot(px - wx, py - wy) < 18)
        if (hit >= 0) return { ...a, waypoints: a.waypoints.filter((_, i) => i !== hit) }
        if (a.waypoints.length >= MAX_WP) return a
        return { ...a, waypoints: [...a.waypoints, [wx, wy]] }
      })
      playSound('click')
    },
    [tier, L],
  )

  const onMapPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const v = viewRef.current
    if (!v || tier !== 2 || phaseRef.current !== 'plan') return
    const r = e.currentTarget.getBoundingClientRect()
    const [x, y] = toWorld(v, L, e.clientX - r.left, e.clientY - r.top)
    if (x < 0 || y < 0 || x > L.width || y > L.height) return
    addWaypoint(x, y)
  }

  const onMapKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (tier !== 2 || phase !== 'plan') return
    const c = cursor ?? [L.width / 2, L.height / 2]
    const step = e.shiftKey ? 50 : 10
    let next: [number, number] | null = null
    if (e.key === 'ArrowLeft') next = [c[0] - step, c[1]]
    else if (e.key === 'ArrowRight') next = [c[0] + step, c[1]]
    else if (e.key === 'ArrowUp') next = [c[0], c[1] + step]
    else if (e.key === 'ArrowDown') next = [c[0], c[1] - step]
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      addWaypoint(c[0], c[1])
      return
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      setAce((a) => ({ ...a, waypoints: a.waypoints.slice(0, -1) }))
      return
    }
    if (next) {
      e.preventDefault()
      setCursor([Math.max(0, Math.min(L.width, next[0])), Math.max(0, Math.min(L.height, next[1]))])
    }
  }

  const brief = BRIEF[tier]
  const locked = phase !== 'plan'
  const swath = swathWidth(altitude)
  const fp = footprint(altitude)
  const energyOk = est.energyWh <= L.batteryWh * 0.9
  const timeOk = est.timeS <= L.timeLimit * 0.9
  const mins = (t: number) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-20 lg:self-start">
        <div className="relative h-[360px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0A1120] sm:h-[440px] lg:h-[440px]">
          <canvas
            ref={mapRef}
            tabIndex={tier === 2 && phase === 'plan' ? 0 : -1}
            onPointerDown={onMapPointer}
            onKeyDown={onMapKey}
            onFocus={() => tier === 2 && phase === 'plan' && !cursor && setCursor([L.width / 2, L.height / 2])}
            className={`block h-full w-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-amber-400/60 ${tier === 2 && phase === 'plan' ? 'cursor-crosshair' : ''}`}
            role="img"
            aria-label={
              tier === 2
                ? `Sea chart. ${ace.waypoints.length} waypoints placed. Tap to add or remove a waypoint; with the keyboard use the arrow keys to move the cross and Enter to place it, Backspace to remove the last.`
                : 'Sea chart of the reef box with the planned survey lines.'
            }
          />
          {hud && (
            <div className="pointer-events-none absolute left-2 top-2 flex max-w-[75%] flex-wrap gap-1.5 text-xs font-bold sm:text-sm">
              <span className="rounded-lg bg-[#0A1120]/85 px-2 py-1 text-white">⏱ {mins(hud.t)}</span>
              <span className={`rounded-lg px-2 py-1 ${hud.batt < 20 ? 'bg-red-500/40 text-white' : 'bg-[#0A1120]/85 text-white'}`}>🔋 {hud.batt.toFixed(0)}%</span>
              <span className="rounded-lg bg-[#0A1120]/85 px-2 py-1 text-white">
                ↓ {hud.z.toFixed(0)} m · {pressureAtm(hud.z).toFixed(0)} atm
              </span>
              <span className="rounded-lg bg-[#0A1120]/85 px-2 py-1 text-white">↕ {hud.alt.toFixed(0)} m above seabed</span>
              <span className={`rounded-lg px-2 py-1 ${hud.lock ? 'bg-teal-500/40 text-white' : 'bg-amber-500/30 text-white'}`}>DVL {hud.lock ? 'lock ✓' : 'no lock'}</span>
              {hud.usbl && <span className="rounded-lg bg-[#0A1120]/85 px-2 py-1 text-amber-200">Ship tracking</span>}
              {tier === 3 && <span className="rounded-lg bg-[#0A1120]/85 px-2 py-1 text-teal-200">Mapped {(hud.cover * 100).toFixed(0)}%</span>}
            </div>
          )}
          {toast && (
            <div key={toast.id} className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3" aria-live="polite">
              <span className="rounded-2xl bg-[#0A1120]/90 px-4 py-2 text-center text-sm font-bold text-white shadow-[0_8px_24px_rgba(0,0,0,.45)]">{toast.text}</span>
            </div>
          )}
          {paused && phase === 'running' && <div className="absolute inset-0 flex items-center justify-center bg-[#0A1120]/60 font-display text-xl font-bold text-white">Paused</div>}
          {report && phase === 'done' && <Debrief won={report.won} title={report.headline} why={report.why} onContinue={finishRound} />}
        </div>
        <canvas ref={profRef} className="block h-[96px] w-full rounded-2xl border border-white/10 sm:h-[110px]" role="img" aria-label="Side view of the dive: seabed and robot depth." />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 text-[#A7B0C0]">
            <span className="inline-block h-1 w-6 rounded bg-[#FC6818]" /> where it really went
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#A7B0C0]">
            <span className="inline-block h-0 w-6 border-t-2 border-dashed border-[#00e5ff]" /> where it thinks it went
          </span>
          {tier === 3 && (
            <span className="inline-flex items-center gap-1.5 text-[#A7B0C0]">
              <span className="inline-block h-3 w-3 rounded-sm bg-teal-400/70" /> sharp
              <span className="ml-1 inline-block h-3 w-3 rounded-sm bg-orange-400/70" /> smeared
              <span className="ml-1 inline-block h-3 w-3 rounded-sm bg-slate-400/70" /> blurry
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          {phase === 'plan' && (
            <button
              type="button"
              onClick={launch}
              className="min-h-[52px] rounded-2xl bg-amber-500 px-6 font-display text-lg font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            >
              🚀 Launch the AUV
            </button>
          )}
          {phase !== 'plan' && !report?.won && (
            <button
              type="button"
              onClick={replan}
              className="min-h-[48px] rounded-2xl border-2 border-amber-300/60 px-5 font-display font-bold text-amber-200 hover:bg-amber-400/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            >
              ↺ Change the plan
            </button>
          )}
          <div className="flex flex-1 items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1" role="radiogroup" aria-label="Simulation speed">
            <span className="px-2 text-xs font-bold uppercase text-[#6E7888]">Speed</span>
            {[10, tier === 2 ? 20 : 50, 100].map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={warp === k}
                onClick={() => setWarp(k)}
                className={`min-h-[44px] flex-1 rounded-xl text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${warp === k ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'}`}
              >
                ×{k}
              </button>
            ))}
          </div>
        </div>
        {hud && phase !== 'plan' && (
          <p className="text-sm text-[#A7B0C0]">
            Position error (only you can see this): <b className={hud.err > 8 ? 'text-red-300' : 'text-white'}>{hud.err.toFixed(1)} m</b>
          </p>
        )}
      </div>

      <aside className="flex flex-col gap-3">
        <section className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4">
          <h2 className="font-display text-lg font-bold text-white">{brief.title}</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[15px] text-[#A7B0C0]">
            {brief.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </section>

        {tier === 2 ? (
          <>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={locked || ace.waypoints.length === 0}
                onClick={() => setAce((a) => ({ ...a, waypoints: a.waypoints.slice(0, -1) }))}
                className="min-h-[44px] flex-1 rounded-xl border border-white/15 bg-white/5 font-bold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:opacity-40"
              >
                Undo waypoint
              </button>
              <button
                type="button"
                disabled={locked || ace.waypoints.length === 0}
                onClick={() => setAce((a) => ({ ...a, waypoints: [] }))}
                className="min-h-[44px] flex-1 rounded-xl border border-white/15 bg-white/5 font-bold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:opacity-40"
              >
                Clear all
              </button>
            </div>
            <p className="text-sm text-[#A7B0C0]">
              Waypoints: <b className="text-white">{ace.waypoints.length}</b> / {MAX_WP}. Tap a waypoint again to remove it.
            </p>
            <PlanSlider
              id="ace-alt"
              label="Height above seabed"
              value={ace.altitude}
              min={5}
              max={60}
              step={1}
              unit="m"
              disabled={locked}
              onChange={(v) => setAce((a) => ({ ...a, altitude: v }))}
              help={ace.altitude <= DVL_MAX_ALT ? `DVL can lock (≤ ${DVL_MAX_ALT} m). Low flying means steep rocks come up fast.` : `Too high for the DVL (needs ≤ ${DVL_MAX_ALT} m): the robot cannot feel the current.`}
            />
            <PlanSlider id="ace-speed" label="Speed through water" value={ace.speed} min={0.6} max={2.5} step={0.1} decimals={1} unit="m/s" disabled={locked} onChange={(v) => setAce((a) => ({ ...a, speed: v }))} help="Faster saves time but drag power grows with speed³." />
            <PlanSlider
              id="ace-ping"
              label="Rule: ping every"
              value={ace.pingEvery}
              min={5}
              max={60}
              step={5}
              unit="s"
              disabled={locked}
              onChange={(v) => setAce((a) => ({ ...a, pingEvery: v }))}
              help={`Moves ${(ace.speed * ace.pingEvery).toFixed(0)} m between pings. Each ping uses a little energy.`}
            />
            <PlanSlider id="ace-return" label="Rule: go home when battery below" value={ace.returnAt} min={5} max={50} step={5} unit="%" disabled={locked} onChange={(v) => setAce((a) => ({ ...a, returnAt: v }))} />
          </>
        ) : (
          <>
            <div className="flex rounded-2xl border border-white/15 bg-white/5 p-1" role="radiogroup" aria-label="Line direction">
              {(['ew', 'ns'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={leg.direction === d}
                  disabled={locked}
                  onClick={() => setLeg((l) => ({ ...l, direction: d }))}
                  className={`min-h-[44px] flex-1 rounded-xl font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${leg.direction === d ? 'bg-amber-500 text-[#1A1103]' : 'text-white/75 hover:text-white'}`}
                >
                  {d === 'ew' ? 'Lines East–West' : 'Lines North–South'}
                </button>
              ))}
            </div>
            <PlanSlider
              id="leg-alt"
              label="Height above seabed"
              value={leg.altitude}
              min={5}
              max={60}
              step={1}
              unit="m"
              disabled={locked}
              onChange={(v) => setLeg((l) => ({ ...l, altitude: v }))}
              help={
                <>
                  Swath <b className="text-white">{swath.toFixed(0)} m</b> · beam spot <b className={fp > DETAIL_M ? 'text-red-300' : 'text-white'}>{fp.toFixed(2)} m</b> (needs ≤ {DETAIL_M} m) · DVL {altitude <= DVL_MAX_ALT ? 'can lock' : <b className="text-red-300">cannot lock</b>}
                </>
              }
            />
            <PlanSlider
              id="leg-spacing"
              label="Line spacing"
              value={leg.spacing}
              min={20}
              max={200}
              step={5}
              unit="m"
              disabled={locked}
              onChange={(v) => setLeg((l) => ({ ...l, spacing: v }))}
              help={`${route.length / 2} lines. Overlap ${Math.round((1 - leg.spacing / Math.max(1, swath)) * 100)}% (surveyors plan 10–20 % for safety).`}
            />
            <PlanSlider id="leg-speed" label="Speed through water" value={leg.speed} min={0.5} max={2.5} step={0.05} decimals={2} unit="m/s" disabled={locked} onChange={(v) => setLeg((l) => ({ ...l, speed: v }))} help="Slow wastes the 35 W the sonar and computer always use; fast pays drag power ∝ speed³." />
          </>
        )}

        <section className="rounded-[20px] border border-white/10 bg-[#111C32] p-4 text-sm">
          <h3 className="font-display font-bold text-cyan-300">Calm-water estimate</h3>
          <p className="mt-1 text-[#A7B0C0]">
            Route <b className="text-white">{(est.lengthM / 1000).toFixed(2)} km</b> · time <b className={timeOk ? 'text-white' : 'text-red-300'}>{mins(est.timeS)}</b> of {mins(L.timeLimit)} · energy{' '}
            <b className={energyOk ? 'text-white' : 'text-red-300'}>{est.energyWh.toFixed(0)} Wh</b> of {L.batteryWh} Wh
          </p>
          <p className="mt-1 text-[#6E7888]">The real sea has a current, so leave a margin.</p>
        </section>

        {phase === 'plan' && (
          <button
            type="button"
            onClick={launch}
            className="min-h-[52px] rounded-2xl bg-amber-500 font-display text-lg font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 lg:hidden"
          >
            🚀 Launch the AUV
          </button>
        )}
      </aside>
    </div>
  )
}
