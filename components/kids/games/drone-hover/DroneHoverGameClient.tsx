'use client'

// components/kids/games/drone-hover/DroneHoverGameClient.tsx
// Sky Port: Drone Pilot — the playable game (loaded with next/dynamic, ssr:false).
// The child designs the drone's brain; the physics in ./sim decides what happens.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { getProgress } from '@/lib/kids-progress'
import {
  buildMission,
  createSim,
  defaultGains,
  simulate,
  stepSim,
  scoreFlight,
  DT,
  DRONE,
  G,
  type FlightReport,
  type Gains,
  type Sample,
  type SimState,
  type TierIndex,
} from './sim'
import { Fx, makeView, drawWorld, dronePixel, type View } from './render'
import { drawPlot, PLOT_COLORS } from './plot'

interface Props {
  tier: number
  onFinish: (r: RoundResult) => void
}

type Phase = 'ready' | 'flying' | 'done'

interface Hud {
  t: number
  z: number
  vz: number
  x: number
  tx: number
  tz: number
  thrust: number
  weight: number
  payload: number
  hold: number
  phase: number
  wp: number
  volts: number
  p: number
  i: number
  d: number
  tilt: number
  windX: number
  windZ: number
  inBand: boolean
}

interface SliderDef {
  key: keyof Gains
  label: string
  sym: string
  min: number
  max: number
  step: number
  unit: string
  plain: string
}

const ALT_SLIDERS: SliderDef[] = [
  { key: 'kp', label: 'P — push', sym: 'Kp', min: 0, max: 60, step: 1, unit: 'N per m', plain: 'How hard it pushes for each metre it is away from the target.' },
  { key: 'ki', label: 'I — remember', sym: 'Ki', min: 0, max: 25, step: 0.5, unit: 'N per m·s', plain: 'Adds up error over time, so a steady sag (like a heavy parcel) gets fixed.' },
  { key: 'kd', label: 'D — brake', sym: 'Kd', min: 0, max: 20, step: 0.5, unit: 'N per m/s', plain: 'Pushes against fast movement, so it stops wobbling and overshooting.' },
]

const LEGEND_SLIDERS: { title: string; note: string; items: SliderDef[] }[] = [
  {
    title: 'Height loop',
    note: 'Collective thrust: all four rotors together.',
    items: [
      { ...ALT_SLIDERS[0], max: 40, step: 0.5 },
      { ...ALT_SLIDERS[1], max: 15 },
      { ...ALT_SLIDERS[2], max: 15 },
    ],
  },
  {
    title: 'Outer loop — position → tilt',
    note: 'To move sideways a drone leans. This loop chooses the lean (max 30°).',
    items: [
      { key: 'kpx', label: 'P — lean toward', sym: 'Kpₓ', min: 0, max: 30, step: 0.5, unit: '° per m', plain: 'Degrees of lean for each metre the waypoint is away sideways.' },
      { key: 'kdx', label: 'D — lean against speed', sym: 'Kdₓ', min: 0, max: 30, step: 0.5, unit: '° per m/s', plain: 'Leans back against sideways speed so it arrives without sailing past.' },
    ],
  },
  {
    title: 'Inner loop — tilt → motors',
    note: 'Speeds one side up and the other down to reach the lean. Must be the fastest loop.',
    items: [
      { key: 'kpa', label: 'P — tilt', sym: 'Kp_tilt', min: 0, max: 3, step: 0.05, unit: 'N·m per rad', plain: 'How hard the motors twist the drone toward the wanted lean.' },
      { key: 'kda', label: 'D — tilt damping', sym: 'Kd_tilt', min: 0, max: 0.5, step: 0.01, unit: 'N·m per rad/s', plain: 'Brakes the spin so the lean does not flip-flop.' },
    ],
  },
]

const BRIEF: Record<TierIndex, { title: string; steps: string[] }> = {
  0: {
    title: 'Cadet — be the drone’s brain yourself',
    steps: [
      'Raise the throttle to lift off and climb to the green band (3 m).',
      'Hover in the band until the meter fills (4 s).',
      'A parcel clips on — the drone gets heavier. Find the new hover throttle and fill the meter again (6 s).',
    ],
  },
  1: {
    title: 'Pilot — tune the P brain',
    steps: [
      'The drone flies itself to 3 m with your Kp.',
      'At 8 s a 0.35 kg parcel clips on. At 16 s the target jumps to 5 m.',
      'Win: finish within 0.30 m of the target and never overshoot by more than 0.75 m. Stars: small error, small overshoot, quick settle.',
    ],
  },
  2: {
    title: 'Ace — full PID through the storm',
    steps: [
      'Gusts all flight long, a 0.4 kg parcel at 10 s, target 5 m at 18 s.',
      'A big downdraft hits at 24 s, then the target drops to 2.5 m at 30 s.',
      'Win: finish within 0.06 m with a flight score of 550+. Only an I term can beat the parcel’s sag that precisely.',
    ],
  },
  3: {
    title: 'Legend — cascaded control, waypoint course',
    steps: [
      'Six waypoints. Hold each one for 1.2 s inside its ring. Win: finish with a flight score of 450+.',
      'Carry a 0.4 kg parcel and drop it at waypoint 4. Gusts up to 7 m/s sideways.',
      'The battery sags as it empties — less thrust for the same command (sped up: a real pack takes 10–15 minutes). No flight predictor: you are the engineer.',
    ],
  },
}

const EMPTY_HUD: Hud = { t: 0, z: 0, vz: 0, x: 0, tx: 0, tz: 3, thrust: 0, weight: DRONE.mass * G, payload: 0, hold: 0, phase: 0, wp: 0, volts: DRONE.vFull, p: 0, i: 0, d: 0, tilt: 0, windX: 0, windZ: 0, inBand: false }

function hudFrom(s: SimState): Hud {
  return {
    t: s.t,
    z: s.z,
    vz: s.vz,
    x: s.x,
    tx: s.target.x,
    tz: s.target.z,
    thrust: s.tL + s.tR,
    weight: (DRONE.mass + s.payload) * G,
    payload: s.payload,
    hold: s.hold,
    phase: s.phase,
    wp: s.wpIndex,
    volts: s.volts,
    p: s.p,
    i: s.i,
    d: s.d,
    tilt: (s.th * 180) / Math.PI,
    windX: s.windX,
    windZ: s.windZ,
    inBand: s.inBand,
  }
}

function fmt(n: number, d = 1): string {
  return (Math.abs(n) < 0.05 && d === 1 ? 0 : n).toFixed(d)
}

// ── small UI pieces ──────────────────────────────────────────────────────────

function HoldButton({ onStep, label, children, disabled }: { onStep: () => void; label: string; children: ReactNode; disabled?: boolean }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])
  useEffect(() => stop, [stop])
  const start = () => {
    onStep()
    const repeat = (delay: number) => {
      timer.current = setTimeout(() => {
        onStep()
        repeat(70)
      }, delay)
    }
    repeat(320)
  }
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault()
        start()
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onClick={(e) => {
        // keyboard activation (Enter/Space) has detail 0; pointer presses are handled above
        if (e.detail === 0) onStep()
      }}
      className="flex h-12 min-w-[48px] select-none items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3 text-2xl font-black text-white hover:bg-white/20 active:scale-95 disabled:opacity-40"
      style={{ touchAction: 'none' }}
    >
      {children}
    </button>
  )
}

function GainSlider({ def, value, onChange, disabled, live }: { def: SliderDef; value: number; onChange: (v: number) => void; disabled: boolean; live?: string }) {
  const id = `gain-${def.key}`
  const clampV = (v: number) => Math.round(Math.max(def.min, Math.min(def.max, v)) / def.step) * def.step
  const decimals = def.step < 0.05 ? 2 : def.step < 1 ? (def.step < 0.1 ? 2 : 1) : 0
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="font-black text-white">
          {def.label} <span className="font-mono text-sm text-amber-300">{def.sym}</span>
        </label>
        <span className="font-mono text-lg font-black text-amber-200">{value.toFixed(decimals)}</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <HoldButton label={`Lower ${def.sym}`} onStep={() => onChange(clampV(value - def.step))} disabled={disabled}>
          −
        </HoldButton>
        <input
          id={id}
          type="range"
          min={def.min}
          max={def.max}
          step={def.step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-11 w-full cursor-pointer accent-amber-400 disabled:cursor-not-allowed"
          aria-describedby={`${id}-help`}
        />
        <HoldButton label={`Raise ${def.sym}`} onStep={() => onChange(clampV(value + def.step))} disabled={disabled}>
          +
        </HoldButton>
      </div>
      <p id={`${id}-help`} className="mt-1 text-xs text-white/60">
        {def.plain} <span className="text-white/40">({def.unit})</span>
        {live && <span className="ml-1 font-mono text-cyan-200">{live}</span>}
      </p>
    </div>
  )
}

// ── the game ─────────────────────────────────────────────────────────────────

export default function DroneHoverGameClient({ tier: tierProp, onFinish }: Props) {
  const tier = Math.max(0, Math.min(3, tierProp)) as TierIndex
  const mission = useMemo(() => buildMission(tier), [tier])
  const [gains, setGains] = useState<Gains>(() => defaultGains(tier))
  const [phase, setPhase] = useState<Phase>('ready')
  const [hud, setHud] = useState<Hud>(EMPTY_HUD)
  const [throttle, setThrottle] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const [report, setReport] = useState<FlightReport | null>(null)
  const [paused, setPaused] = useState(false)
  const [plainFirst, setPlainFirst] = useState(false)
  // Small screens: the action bar floats above the kids tab bar while the game is on screen.
  const [barFixed, setBarFixed] = useState(false)
  // Large screens: the controls column scrolls inside the viewport (runtime-measured height).
  const [asideMax, setAsideMax] = useState<number | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const asideRef = useRef<HTMLElement>(null)

  const worldRef = useRef<HTMLCanvasElement>(null)
  const plotRef = useRef<HTMLCanvasElement>(null)
  const simRef = useRef<SimState>(createSim(mission, gains))
  const phaseRef = useRef<Phase>('ready')
  const throttleRef = useRef(0)
  const speedRef = useRef(1)
  const pausedRef = useRef(false)
  const attemptsRef = useRef(0)
  const finishedRef = useRef(false)
  const fxRef = useRef<Fx | null>(null)
  const viewRef = useRef<View | null>(null)
  const predictedRef = useRef<Sample[] | undefined>(undefined)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const toastId = useRef(0)

  useEffect(() => {
    const band = getProgress().band
    setPlainFirst(band === 'explorers' || band === 'builders')
  }, [])

  useEffect(() => {
    const grid = gridRef.current
    if (!grid || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setBarFixed(e.isIntersecting), { threshold: 0 })
    io.observe(grid)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const aside = asideRef.current
    if (!aside) return
    const mq = window.matchMedia('(min-width: 1024px)')
    let raf = 0
    const measure = () => {
      raf = 0
      if (!mq.matches) {
        setAsideMax(null)
        return
      }
      const top = Math.max(12, aside.getBoundingClientRect().top)
      setAsideMax(Math.max(320, Math.round(window.innerHeight - top - 12)))
    }
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    mq.addEventListener('change', queue)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
      mq.removeEventListener('change', queue)
    }
  }, [])

  // Flight predictor: Pilot sees the whole flight; Ace sees a calm-air step; Legend flies blind.
  const predicted = useMemo<Sample[] | undefined>(() => {
    if (tier === 1) return simulate(mission, gains).log
    if (tier === 2) return simulate({ ...mission, gusts: [], events: [], sensorNoise: false }, gains, 10).log
    return undefined
  }, [tier, mission, gains])
  useEffect(() => {
    predictedRef.current = phase === 'ready' ? predicted : undefined
  }, [predicted, phase])

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms))
  }, [])

  const showToast = useCallback(
    (text: string) => {
      const id = ++toastId.current
      setToast({ id, text })
      later(() => setToast((t) => (t && t.id === id ? null : t)), 2200)
    },
    [later],
  )

  const launch = useCallback(() => {
    if (phaseRef.current !== 'ready') return
    primeAudio()
    playSound('click')
    attemptsRef.current += 1
    simRef.current = createSim(mission, gains)
    if (fxRef.current) fxRef.current.box = null
    phaseRef.current = 'flying'
    setPhase('flying')
    const el = worldRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      // Leave room for the sticky kids header above and the tab bar + action bar below.
      if (r.top < 64 || r.bottom > window.innerHeight - 150) {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        el.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' })
      }
    }
  }, [mission, gains])

  const abort = useCallback(() => {
    if (phaseRef.current !== 'flying') return
    phaseRef.current = 'ready'
    setPhase('ready')
    throttleRef.current = 0
    setThrottle(0)
    simRef.current = createSim(mission, gains)
    if (fxRef.current) fxRef.current.box = null
    setHud(EMPTY_HUD)
  }, [mission, gains])

  const setThr = useCallback(
    (v: number) => {
      const t = Math.max(0, Math.min(1, Math.round(v * 100) / 100))
      throttleRef.current = t
      setThrottle(t)
      if (tier === 0 && phaseRef.current === 'ready' && t > 0) launch()
    },
    [tier, launch],
  )

  const endFlight = useCallback(
    (s: SimState) => {
      if (finishedRef.current) return
      finishedRef.current = true
      phaseRef.current = 'done'
      setPhase('done')
      const r = scoreFlight(s)
      setReport(r)
      const fx = fxRef.current
      const v = viewRef.current
      if (s.outcome === 'crash' && fx && v) {
        const p = dronePixel(v, s)
        fx.burst(p.x, p.y, 40, '#fb923c')
        fx.shake = 14
        fx.flash = 1
      } else if (r.stars > 0 && fx && v) {
        const p = dronePixel(v, s)
        fx.burst(p.x, p.y, 36, '#fde047')
        playSound('star')
      }
      const badges = r.stars > 0 ? ['hover-hero', ...(tier >= 2 ? ['pid-tuner'] : [])] : undefined
      later(
        () =>
          onFinish({
            stars: r.stars,
            score: r.score,
            scoreLabel: r.scoreLabel,
            lowerIsBetter: r.lowerIsBetter,
            message: r.message,
            badges,
            attempts: Math.max(1, attemptsRef.current),
          }),
        1500,
      )
    },
    [onFinish, tier, later],
  )

  // ── the loop ──
  useEffect(() => {
    const canvas = worldRef.current
    const plotCanvas = plotRef.current
    if (!canvas || !plotCanvas) return
    const ctx = canvas.getContext('2d')
    const pctx = plotCanvas.getContext('2d')
    if (!ctx || !pctx) return
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fx = new Fx(reduced)
    fxRef.current = fx
    let plotSize = { w: 300, h: 140, dpr: 1 }

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      const v = makeView(w, h, dpr, mission)
      viewRef.current = v
      fx.layout(v)
      const pw = plotCanvas.clientWidth
      const ph = plotCanvas.clientHeight
      plotCanvas.width = Math.round(pw * dpr)
      plotCanvas.height = Math.round(ph * dpr)
      plotSize = { w: pw, h: ph, dpr }
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    ro.observe(plotCanvas)

    let raf = 0
    let last = performance.now()
    let acc = 0
    let hudAt = 0
    let frameN = 0
    const start = performance.now()

    const handleEvents = (s: SimState) => {
      if (!s.events.length) return
      const v = viewRef.current
      for (const ev of s.events) {
        switch (ev.kind) {
          case 'payload-on':
            playSound('click')
            showToast(`📦 Parcel clipped on: +${ev.mass} kg — heavier now!`)
            break
          case 'payload-off':
            playSound('correct')
            showToast(`📦 Parcel delivered! ${ev.mass} kg lighter.`)
            if (v) {
              const p = dronePixel(v, s)
              fx.box = { x: p.x, y: p.y + 24, vy: 0, rot: 0, landed: false }
            }
            break
          case 'target':
            playSound('click')
            showToast(`🎯 New target: ${ev.z} m`)
            break
          case 'gust':
            showToast(Math.abs(ev.vx) > Math.abs(ev.vz) ? `💨 Side gust ${ev.vx > 0 ? '→' : '←'} ${Math.abs(ev.vx).toFixed(0)} m/s` : ev.vz < 0 ? '💨 Downdraft! Air pushing down' : '💨 Updraft! Air pushing up')
            break
          case 'waypoint':
            playSound('star')
            showToast(`✅ Waypoint ${ev.index + 1} reached`)
            if (v) {
              const p = dronePixel(v, s)
              fx.burst(p.x, p.y, 18, '#6ee7b7')
            }
            break
          case 'hold-done':
            playSound('correct')
            if (ev.phase === 0) showToast('Great hover! Now the parcel…')
            break
          case 'touchdown':
            if (v) {
              const p = dronePixel(v, s)
              fx.burst(p.x, p.y + 6, 8, '#fde68a')
            }
            break
          default:
            break
        }
      }
      s.events.length = 0
    }

    const frame = (now: number) => {
      const dtReal = Math.min(0.1, Math.max(0, (now - last) / 1000))
      last = now
      const s = simRef.current
      const v = viewRef.current
      if (phaseRef.current === 'flying' && !pausedRef.current) {
        acc += dtReal * speedRef.current
        let n = 0
        while (acc >= DT && n < 400) {
          stepSim(s, throttleRef.current)
          acc -= DT
          n++
          if (s.outcome !== 'flying') break
        }
        handleEvents(s)
        if (s.outcome !== 'flying') endFlight(s)
      } else {
        acc = 0
      }
      if (v) {
        if (!pausedRef.current) fx.update(dtReal, s, v)
        drawWorld(ctx, v, s, fx, (now - start) / 1000)
      }
      if (frameN++ % 3 === 0) {
        drawPlot(pctx, plotSize.w, plotSize.h, plotSize.dpr, s.log, {
          tier,
          duration: mission.duration,
          worldH: mission.worldH,
          worldW: mission.worldW,
          window: tier === 0 ? 30 : undefined,
          predicted: predictedRef.current,
        })
      }
      if (now - hudAt > 100) {
        hudAt = now
        setHud(hudFrom(s))
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

    const timersNow = timers.current
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      timersNow.forEach(clearTimeout)
      fxRef.current = null
    }
  }, [mission, tier, endFlight, showToast])

  // Keep the idle drone on the pad in step with the gains (ready phase).
  useEffect(() => {
    if (phaseRef.current === 'ready') simRef.current = createSim(mission, gains)
  }, [mission, gains])

  // ── keyboard ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const tag = el?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (tier === 0 && phaseRef.current !== 'done') {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          e.preventDefault()
          setThr(throttleRef.current + 0.02)
          return
        }
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          e.preventDefault()
          setThr(throttleRef.current - 0.02)
          return
        }
      }
      if ((e.key === 'Enter' || e.key === ' ') && tag !== 'BUTTON' && tag !== 'A' && phaseRef.current === 'ready' && tier > 0) {
        e.preventDefault()
        launch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tier, setThr, launch])

  const setGain = (k: keyof Gains, v: number) => setGains((g) => ({ ...g, [k]: v }))
  const locked = phase !== 'ready'
  const thrustPct = Math.min(1, hud.thrust / (2 * DRONE.tMaxSide))
  const weightPct = Math.min(1, hud.weight / (2 * DRONE.tMaxSide))
  const holdNeed = hud.phase === 0 ? 4 : 6
  const brief = BRIEF[tier]

  return (
    <div ref={gridRef} className="grid gap-3 pb-24 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-0">
      <div className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-3 lg:self-start">
        <div className="relative h-[330px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950 sm:h-[420px] lg:h-[470px]">
          <canvas ref={worldRef} className="block h-full w-full scroll-mt-[84px]" role="img" aria-label={`Drone flight view. Height ${hud.z.toFixed(1)} metres, target ${hud.tz.toFixed(1)} metres.`} />

          {/* HUD */}
          <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1.5 text-xs font-bold sm:text-sm" aria-live="off">
            <span className={`rounded-lg px-2 py-1 ${hud.inBand ? 'bg-emerald-500/30 text-emerald-100' : 'bg-slate-900/70 text-white'}`}>
              ↕ {fmt(hud.z, 2)} m <span className="text-white/50">/ {hud.tz.toFixed(1)}</span>
            </span>
            <span className="rounded-lg bg-slate-900/70 px-2 py-1 text-white">
              {hud.vz >= 0 ? '↑' : '↓'} {Math.abs(hud.vz).toFixed(1)} m/s
            </span>
            <span className="rounded-lg bg-slate-900/70 px-2 py-1 text-white">⏱ {hud.t.toFixed(1)} s</span>
            {hud.payload > 0 && <span className="rounded-lg bg-amber-500/30 px-2 py-1 text-amber-100">📦 {hud.payload} kg</span>}
            {tier === 3 && (
              <>
                <span className="rounded-lg bg-slate-900/70 px-2 py-1 text-white">
                  🎯 {Math.min(hud.wp + 1, mission.waypoints.length)}/{mission.waypoints.length}
                </span>
                <span className={`rounded-lg px-2 py-1 ${hud.volts < 15 ? 'bg-rose-500/30 text-rose-100' : 'bg-slate-900/70 text-white'}`}>🔋 {hud.volts.toFixed(1)} V</span>
                <span className="rounded-lg bg-slate-900/70 px-2 py-1 text-white">∠ {hud.tilt.toFixed(0)}°</span>
              </>
            )}
            {(Math.abs(hud.windZ) > 0.4 || Math.abs(hud.windX) > 0.4) && (
              <span className="rounded-lg bg-sky-500/25 px-2 py-1 text-sky-100">
                💨 {tier === 3 ? `${hud.windX > 0 ? '→' : '←'} ${Math.abs(hud.windX).toFixed(1)}` : `${hud.windZ > 0 ? '↑' : '↓'} ${Math.abs(hud.windZ).toFixed(1)}`} m/s
              </span>
            )}
          </div>

          {/* Cadet: thrust vs weight gauge + hold meter */}
          {tier === 0 && (
            <>
              <div className="pointer-events-none absolute bottom-16 right-3 top-[132px] flex w-14 sm:top-14 flex-col items-center" aria-hidden>
                <div className="relative w-6 flex-1 overflow-hidden rounded-full border border-white/25 bg-slate-900/70">
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-sky-600 to-cyan-300" style={{ height: `${thrustPct * 100}%` }} />
                  <div className="absolute left-[-4px] right-[-4px] h-1 bg-rose-400 shadow-[0_0_8px_#fb7185]" style={{ bottom: `${weightPct * 100}%` }} />
                </div>
                <span className="mt-1 text-[10px] font-black uppercase text-cyan-200">thrust</span>
                <span className="text-[10px] font-black uppercase text-rose-300">— weight</span>
              </div>
              <div className="pointer-events-none absolute bottom-3 left-3 w-[36%] max-w-[230px] rounded-xl bg-slate-900/75 p-2">
                <p className="text-xs font-bold text-white">{hud.phase === 0 ? 'Hover in the green band' : 'Parcel on — hover again!'}</p>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 transition-[width] duration-100" style={{ width: `${Math.min(100, (hud.hold / holdNeed) * 100)}%` }} />
                </div>
                <p className="mt-0.5 text-[11px] text-white/60">
                  {hud.hold.toFixed(1)} / {holdNeed} s · step {hud.phase + 1} of 2
                </p>
              </div>
            </>
          )}

          {toast && (
            <div key={toast.id} className="pointer-events-none absolute left-1/2 top-[84px] -translate-x-1/2 sm:top-12 animate-[pulse_1s_ease-in-out_1] whitespace-nowrap rounded-2xl border border-amber-300/50 bg-slate-950/85 px-4 py-2 text-sm font-black text-amber-100 shadow-xl" role="status">
              {toast.text}
            </div>
          )}

          {phase === 'ready' && tier === 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-1/3 text-center">
              <p className="mx-auto inline-block rounded-2xl bg-slate-950/80 px-4 py-2 text-sm font-black text-white">Press ＋ or ↑ to spin up the rotors</p>
            </div>
          )}
          {paused && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-xl font-black text-white">Paused</div>
          )}
        </div>

        <div
          className={`z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/90 p-2 backdrop-blur ${
            barFixed ? 'max-lg:fixed max-lg:inset-x-2 max-lg:bottom-[calc(75px+env(safe-area-inset-bottom))] min-[901px]:max-lg:bottom-3 max-lg:shadow-2xl max-lg:shadow-black/60' : ''
          }`}
          role="toolbar"
          aria-label="Flight controls"
        >
          {tier > 0 && phase === 'ready' && (
            <button type="button" onClick={launch} className="min-h-[52px] flex-1 rounded-2xl bg-amber-400 px-5 text-lg font-black text-slate-900 shadow-lg shadow-amber-500/30 hover:bg-amber-300 active:scale-[0.98]">
              🚀 Launch
            </button>
          )}
          {tier === 0 && phase === 'ready' && (
            <button type="button" onClick={() => setThr(0.3)} className="min-h-[52px] flex-1 rounded-2xl bg-amber-400 px-5 text-lg font-black text-slate-900 hover:bg-amber-300">
              🚀 Start rotors
            </button>
          )}
          {tier === 0 && (
            <div className="flex items-center gap-1.5 lg:hidden">
              <HoldButton label="Less throttle" onStep={() => setThr(throttleRef.current - 0.01)} disabled={phase === 'done'}>
                −
              </HoldButton>
              <span className="w-12 text-center font-mono text-lg font-black text-amber-200" aria-hidden>
                {Math.round(throttle * 100)}%
              </span>
              <HoldButton label="More throttle" onStep={() => setThr(throttleRef.current + 0.01)} disabled={phase === 'done'}>
                +
              </HoldButton>
            </div>
          )}
          {phase === 'flying' && (
            <button type="button" onClick={abort} className="min-h-[52px] flex-1 rounded-2xl border-2 border-rose-300/60 px-5 font-black text-rose-100 hover:bg-rose-500/20">
              {tier === 0 ? '↺ Restart' : '✋ Abort'}
            </button>
          )}
          {tier > 0 && (
            <div className="flex rounded-2xl border border-white/15 p-1" role="radiogroup" aria-label="Simulation speed">
              {[1, 2, 4].map((sp) => (
                <button
                  key={sp}
                  type="button"
                  role="radio"
                  aria-checked={speed === sp}
                  onClick={() => {
                    speedRef.current = sp
                    setSpeed(sp)
                  }}
                  className={`min-h-[44px] min-w-[44px] rounded-xl px-2 text-sm font-black ${speed === sp ? 'bg-white/20 text-white' : 'text-white/60'}`}
                >
                  {sp}×
                </button>
              ))}
            </div>
          )}
          {tier > 0 && phase === 'ready' && (
            <button type="button" onClick={() => setGains(defaultGains(tier))} className="min-h-[44px] rounded-2xl border border-white/15 px-3 text-sm font-bold text-white/70 hover:bg-white/10">
              Reset gains
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-2">
          <canvas ref={plotRef} className="block h-[140px] w-full sm:h-[160px]" role="img" aria-label="Live graph of height against target and the controller's pushes" />
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[11px] font-bold text-white/70">
            {tier === 3 ? (
              <>
                <Key c={PLOT_COLORS.x}>sideways x</Key>
                <Key c={PLOT_COLORS.height}>height</Key>
                <Key c={PLOT_COLORS.target}>targets</Key>
                <Key c={PLOT_COLORS.tilt}>tilt</Key>
              </>
            ) : (
              <>
                <Key c={PLOT_COLORS.height}>height</Key>
                <Key c={PLOT_COLORS.target}>target</Key>
                {predicted && phase === 'ready' && <Key c={PLOT_COLORS.predicted}>predicted</Key>}
                {tier === 0 ? (
                  <>
                    <Key c={PLOT_COLORS.thrust}>thrust</Key>
                    <Key c={PLOT_COLORS.weight}>weight</Key>
                  </>
                ) : (
                  <>
                    <Key c={PLOT_COLORS.p}>P push</Key>
                    {tier === 2 && <Key c={PLOT_COLORS.i}>I push</Key>}
                    <Key c={PLOT_COLORS.d}>{tier === 1 ? 'damper' : 'D push'}</Key>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {report && (
          <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-3" aria-live="polite">
            <p className="text-sm font-black uppercase tracking-wide text-amber-300">Flight debrief — why it happened</p>
            <p className="mt-1 text-white/90">{report.message}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {report.stats.map((st) => (
                <span key={st.label} className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
                  {st.label}: <span className="font-mono text-amber-200">{st.value}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <aside
        ref={asideRef}
        className="flex flex-col gap-3 lg:overflow-y-auto lg:overscroll-contain lg:pr-1"
        style={asideMax ? { maxHeight: asideMax } : undefined}
        aria-label="Flight brain controls"
      >
        <section className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <h2 className="font-black text-white">{brief.title}</h2>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-white/75">
            {brief.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </section>

        {tier === 0 ? (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-baseline justify-between">
              <label htmlFor="throttle" className="font-black text-white">
                Throttle
              </label>
              <span className="font-mono text-2xl font-black text-amber-200">{Math.round(throttle * 100)}%</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <HoldButton label="Less throttle" onStep={() => setThr(throttleRef.current - 0.01)} disabled={phase === 'done'}>
                −
              </HoldButton>
              <input
                id="throttle"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={throttle}
                disabled={phase === 'done'}
                onChange={(e) => setThr(Number(e.target.value))}
                className="h-11 w-full cursor-pointer accent-amber-400"
              />
              <HoldButton label="More throttle" onStep={() => setThr(throttleRef.current + 0.01)} disabled={phase === 'done'}>
                +
              </HoldButton>
            </div>
            <p className="mt-2 text-sm text-white/70">
              <span className="font-black text-cyan-200">Thrust</span> pushes up. <span className="font-black text-rose-300">Weight</span> pulls down. When the blue bar sits exactly on the red line, the
              drone hangs still: <span className="font-black text-white">hover = thrust equals weight</span>.
            </p>
            <p className="mt-2 text-xs text-white/50">
              Keys: ↑/↓ or W/S. Assist is on: a helper gently slows fast climbs and drops, like a real drone’s stabiliser — but finding the hover throttle is your job.
            </p>
          </section>
        ) : (
          <>
            <FormulaCard tier={tier} gains={gains} hud={hud} flying={phase === 'flying'} plainFirst={plainFirst} />
            {tier === 1 && (
              <>
                <GainSlider def={ALT_SLIDERS[0]} value={gains.kp} onChange={(v) => setGain('kp', v)} disabled={locked} live={phase === 'flying' ? `P now: ${hud.p.toFixed(1)} N` : undefined} />
                <p className="rounded-2xl bg-white/5 px-3 py-2 text-xs text-white/60">
                  Damper (D) is fixed at <span className="font-mono text-violet-300">4</span> by the Sky Port engineers for this tier — your job is P alone.
                </p>
              </>
            )}
            {tier === 2 &&
              ALT_SLIDERS.map((d) => (
                <GainSlider key={d.key} def={d} value={gains[d.key]} onChange={(v) => setGain(d.key, v)} disabled={locked} live={phase === 'flying' ? `${d.key.slice(1).toUpperCase()} now: ${(d.key === 'kp' ? hud.p : d.key === 'ki' ? hud.i : hud.d).toFixed(1)} N` : undefined} />
              ))}
            {tier === 3 &&
              LEGEND_SLIDERS.map((grp) => (
                <div key={grp.title} role="group" aria-label={grp.title} className="flex flex-col gap-2">
                  <div>
                    <h3 className="font-black text-amber-200">{grp.title}</h3>
                    <p className="text-xs text-white/55">{grp.note}</p>
                  </div>
                  {grp.items.map((d) => (
                    <GainSlider key={d.key} def={d} value={gains[d.key]} onChange={(v) => setGain(d.key, v)} disabled={locked} />
                  ))}
                </div>
              ))}
            {tier === 1 && <p className="text-xs text-white/55">The dotted line on the graph predicts this flight before you launch — move Kp and watch it change.</p>}
            {tier === 2 && <p className="text-xs text-white/55">The dotted line predicts the first 10 s in calm air only. Gusts, the parcel and the downdraft are up to your tuning.</p>}
          </>
        )}

      </aside>
    </div>
  )
}

function Key({ c, children }: { c: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block h-1.5 w-4 rounded-full" style={{ background: c }} />
      {children}
    </span>
  )
}

function FormulaCard({ tier, gains, hud, flying, plainFirst }: { tier: TierIndex; gains: Gains; hud: Hud; flying: boolean; plainFirst: boolean }) {
  const e = hud.tz - hud.z
  let formula: ReactNode
  let plain: ReactNode
  let liveLine: string | null = null
  if (tier === 1) {
    formula = (
      <>
        thrust = hover guess + <b className="text-rose-300">Kp·e</b> − <span className="text-violet-300">4·v</span>
      </>
    )
    plain = 'e (error) = target − height. Too low means a positive error, so P adds thrust. A heavier parcel needs extra thrust — and with P alone, that only comes from a leftover error.'
    if (flying) liveLine = `= ${(DRONE.mass * G).toFixed(1)} + ${gains.kp.toFixed(0)}×${e.toFixed(2)} − 4×${hud.vz.toFixed(2)} N`
  } else if (tier === 2) {
    formula = (
      <>
        u = <b className="text-rose-300">Kp·e</b> + <b className="text-lime-300">Ki·∫e dt</b> + <b className="text-violet-300">Kd·de/dt</b>
        <br />
        thrust = hover guess + u
      </>
    )
    plain = 'P pushes toward the target now. I remembers error that will not go away (like the parcel) and pushes until it is gone. D watches how fast the height changes and brakes. Our D uses the measured speed, so a new target gives no sudden kick.'
    if (flying) liveLine = `P ${hud.p.toFixed(1)} + I ${hud.i.toFixed(1)} + D ${hud.d.toFixed(1)} = ${(hud.p + hud.i + hud.d).toFixed(1)} N`
  } else {
    formula = (
      <>
        tilt* = <b className="text-pink-300">Kpₓ·eₓ + Kdₓ·deₓ/dt</b>
        <br />
        τ = <b className="text-amber-300">Kp_tilt·(tilt* − tilt) − Kd_tilt·ω</b>
        <br />
        thrust = (hover guess + Kp·e + Ki·∫e + Kd·de/dt) / cos(tilt)
      </>
    )
    plain = 'A cascade: the outer loop decides how far to lean, the inner loop makes the motors produce that lean, and the height loop keeps you up while leaning (dividing by cos(tilt)). Rule of thumb: the inner loop must be several times faster than the outer one.'
    if (flying) liveLine = `tilt ${hud.tilt.toFixed(1)}° · height push ${(hud.p + hud.i + hud.d).toFixed(1)} N`
  }
  const formulaEl = <p className="font-mono text-sm leading-relaxed text-white">{formula}</p>
  const plainEl = <p className="text-sm text-white/70">{plain}</p>
  return (
    <section className="rounded-2xl border border-cyan-300/20 bg-cyan-400/5 p-3">
      <h3 className="text-xs font-black uppercase tracking-wide text-cyan-300">The drone’s brain</h3>
      <div className="mt-1 space-y-2">
        {plainFirst ? (
          <>
            {plainEl}
            {formulaEl}
          </>
        ) : (
          <>
            {formulaEl}
            {plainEl}
          </>
        )}
        {liveLine && <p className="rounded-lg bg-slate-950/60 px-2 py-1 font-mono text-xs text-cyan-100">{liveLine}</p>}
      </div>
    </section>
  )
}
