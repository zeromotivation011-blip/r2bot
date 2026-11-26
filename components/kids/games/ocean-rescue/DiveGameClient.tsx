'use client'

// components/kids/games/ocean-rescue/DiveGameClient.tsx
// Cadet and Pilot: pilot a tethered ROV down to the lost buoy, latch it and
// bring it back to the ship. The force model in ./dive decides what happens.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { DIVE_DT, DIVE_LEVELS, createDive, netBuoyancy, neutralBallast, ping, scoreDive, stepDive, tetherLength, type DiveReport, type DiveState } from './dive'
import { DiveFx, drawDive, followCamera, makeDiveView, type DiveView } from './diveRender'
import { WATER_COASTAL, lightAt, pressureAtm, SOUND_SPEED } from './physics'
import { Debrief, PadButton, PlanSlider } from './ControlsClient'

interface Props {
  tier: 0 | 1
  onFinish: (r: RoundResult) => void
}

type Phase = 'ready' | 'diving' | 'done'

interface Hud {
  t: number
  z: number
  speed: number
  net: number
  ballast: number
  target: number
  tether: number
  tetherDrag: number
  taut: boolean
  attached: boolean
  hold: number
  redPct: number
}

const EMPTY: Hud = { t: 0, z: 0, speed: 0, net: 0, ballast: 0, target: 0, tether: 0, tetherDrag: 0, taut: false, attached: false, hold: 0, redPct: 100 }

function hudOf(s: DiveState): Hud {
  return {
    t: s.t,
    z: s.z,
    speed: Math.hypot(s.vx, s.vz),
    net: netBuoyancy(s.level, s.ballastL, s.attached),
    ballast: s.ballastL,
    target: s.ballastTargetL,
    tether: tetherLength(s),
    tetherDrag: s.tetherDrag,
    taut: s.taut,
    attached: s.attached,
    hold: s.holdS,
    redPct: Math.round(lightAt(s.z, WATER_COASTAL).r * 100),
  }
}

const BRIEF: Record<0 | 1, { title: string; steps: string[] }> = {
  0: {
    title: 'Cadet — harbour rescue',
    steps: [
      'Steer down with the arrows. Your robot is balanced: it does not sink or float by itself.',
      'Press PING. The sound bounces back from the buoy — the arrow shows the way and the number how far.',
      'Stop right next to the buoy and hold still until the green ring fills. Then fly it up to the ship.',
    ],
  },
  1: {
    title: 'Pilot — balance, current and circles',
    steps: [
      'Before diving, set the ballast so the robot is neutral (net force near 0). Too heavy and the weak up-thrusters cannot hold it.',
      'A current flows between 5 and 22 m deep and drags on your tether. Find a faster way to cross it.',
      'The sonar only tells you HOW FAR the buoy is. Ping from different places: it sits where the circles cross. Latch it, pump ballast out for its weight, and bring it home.',
    ],
  },
}

export default function DiveGameClient({ tier, onFinish }: Props) {
  const level = DIVE_LEVELS[tier]
  const [phase, setPhase] = useState<Phase>('ready')
  const [hud, setHud] = useState<Hud>(() => hudOf(createDive(level)))
  const [ballastPlan, setBallastPlan] = useState(level.rov.ballastStartL)
  const [fast, setFast] = useState(false)
  const [paused, setPaused] = useState(false)
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const [pingLog, setPingLog] = useState<{ t: number; range: number | null; echo: number | null }[]>([])
  const [report, setReport] = useState<DiveReport | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const simRef = useRef<DiveState>(createDive(level))
  const phaseRef = useRef<Phase>('ready')
  const keys = useRef({ left: false, right: false, up: false, down: false })
  const pad = useRef({ left: false, right: false, up: false, down: false })
  const fastRef = useRef(false)
  const pausedRef = useRef(false)
  const fxRef = useRef<DiveFx | null>(null)
  const viewRef = useRef<DiveView | null>(null)
  const toastId = useRef(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const attempts = useRef(0)
  const reportedRef = useRef(false)

  const showToast = useCallback((text: string) => {
    const id = ++toastId.current
    setToast({ id, text })
    timers.current.push(setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 2600))
  }, [])

  const start = useCallback(() => {
    if (phaseRef.current !== 'ready') return
    primeAudio()
    playSound('click')
    attempts.current += 1
    const s = createDive(level)
    s.ballastL = tier === 1 ? ballastPlan : s.ballastL
    s.ballastTargetL = s.ballastL
    simRef.current = s
    phaseRef.current = 'diving'
    setPhase('diving')
    const el = canvasRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      if (r.top < 64 || r.bottom > window.innerHeight - 40) {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
      }
    }
  }, [level, tier, ballastPlan])

  const doPing = useCallback(() => {
    if (phaseRef.current === 'ready' && tier === 0) start()
    if (phaseRef.current !== 'diving') return
    const s = simRef.current
    const p = ping(s)
    if (!p) return
    const fx = fxRef.current
    if (fx) fx.pingAnim = { t0: performance.now() / 1000, x: p.x, z: p.z, range: p.range, bx: level.buoy.x, bz: level.buoy.z }
    playSound(p.range !== null ? 'correct' : 'click')
    setPingLog((l) => [{ t: p.t, range: p.range, echo: p.echoS }, ...l].slice(0, 5))
  }, [level, tier, start])

  const setPump = useCallback(
    (litres: number) => {
      const v = Math.max(0, Math.min(level.rov.ballastMaxL, Math.round(litres * 20) / 20))
      if (phaseRef.current === 'ready') setBallastPlan(v)
      else if (phaseRef.current === 'diving') {
        simRef.current.ballastTargetL = v
        setHud(hudOf(simRef.current))
      }
    },
    [level],
  )

  const endDive = useCallback(
    (s: DiveState) => {
      if (phaseRef.current === 'done') return
      phaseRef.current = 'done'
      setPhase('done')
      const r = scoreDive(s)
      setReport(r)
      playSound(r.won ? 'star' : 'wrong')
    },
    [],
  )

  const finishRound = useCallback(() => {
    if (!report || reportedRef.current) return
    reportedRef.current = true
    const badges = report.won ? ['planet-hopper'] : undefined
    onFinish({
      stars: report.stars,
      score: report.score,
      scoreLabel: report.scoreLabel,
      message: report.message,
      badges,
      attempts: Math.max(1, attempts.current),
    })
  }, [report, onFinish])

  // ── main loop ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fx = new DiveFx(reduced)
    fxRef.current = fx
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      const v = makeDiveView(w, h, dpr, reduced)
      followCamera(v, simRef.current, true)
      viewRef.current = v
      fx.seed(v)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let raf = 0
    let last = performance.now()
    let acc = 0
    let hudAt = 0
    const frame = (nowMs: number) => {
      const dtReal = Math.min(0.1, Math.max(0, (nowMs - last) / 1000))
      last = nowMs
      const s = simRef.current
      const v = viewRef.current
      const k = keys.current
      const p = pad.current
      const h = (k.right || p.right ? 1 : 0) - (k.left || p.left ? 1 : 0)
      const vv = (k.up || p.up ? 1 : 0) - (k.down || p.down ? 1 : 0)
      if (phaseRef.current === 'diving' && !pausedRef.current) {
        acc += dtReal * (fastRef.current ? 2 : 1)
        let n = 0
        while (acc >= DIVE_DT && n < 300) {
          stepDive(s, { h, v: vv })
          acc -= DIVE_DT
          n++
          if (s.outcome !== 'diving') break
        }
        for (const ev of s.events) {
          switch (ev.kind) {
            case 'bump':
              playSound('wrong')
              fx.flash = 1
              fx.shake = 8
              showToast('Bump! Slow down near rocks and the seabed.')
              break
            case 'latched':
              playSound('levelup')
              showToast(tier === 1 ? 'Latched! The buoy is heavy — pump ballast OUT.' : 'Got it! Now fly up to the ship.')
              break
            case 'taut':
              playSound('click')
              showToast(`Tether at its limit (${level.tetherLen} m)!`)
              break
            case 'seen':
              playSound('star')
              showToast('Buoy in your lights! See its true orange colour?')
              break
            case 'delivered':
              playSound('levelup')
              break
            default:
              break
          }
        }
        s.events.length = 0
        if (s.outcome !== 'diving') endDive(s)
      } else acc = 0
      if (v) {
        followCamera(v, s, false)
        if (!pausedRef.current) fx.update(dtReal, s, v, phaseRef.current === 'diving' && (h !== 0 || vv !== 0))
        drawDive(ctx, v, s, fx, nowMs / 1000)
      }
      if (nowMs - hudAt > 120) {
        hudAt = nowMs
        setHud(hudOf(s))
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
      fxRef.current = null
    }
  }, [level, tier, endDive, showToast])

  // ── keyboard ──
  useEffect(() => {
    const map: Record<string, keyof typeof keys.current> = {
      ArrowLeft: 'left',
      a: 'left',
      A: 'left',
      ArrowRight: 'right',
      d: 'right',
      D: 'right',
      ArrowUp: 'up',
      w: 'up',
      W: 'up',
      ArrowDown: 'down',
      s: 'down',
      S: 'down',
    }
    const onDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const dir = map[e.key]
      if (dir) {
        e.preventDefault()
        keys.current[dir] = true
        if (phaseRef.current === 'ready' && tier === 0) start()
        return
      }
      if ((e.key === ' ' || e.key === 'p' || e.key === 'P') && tag !== 'BUTTON' && tag !== 'A') {
        e.preventDefault()
        doPing()
      }
      if (tier === 1 && phaseRef.current === 'diving') {
        if (e.key === '[') setPump(simRef.current.ballastTargetL + 0.1)
        if (e.key === ']') setPump(simRef.current.ballastTargetL - 0.1)
      }
    }
    const onUp = (e: KeyboardEvent) => {
      const dir = map[e.key]
      if (dir) keys.current[dir] = false
    }
    const clear = () => {
      keys.current = { left: false, right: false, up: false, down: false }
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', clear)
    }
  }, [tier, start, doPing, setPump])

  const padSet = useCallback(
    (dir: 'left' | 'right' | 'up' | 'down') => (down: boolean) => {
      pad.current[dir] = down
      if (down) {
        primeAudio()
        if (phaseRef.current === 'ready' && tier === 0) start()
      }
    },
    [tier, start],
  )
  const padHandlers = useMemo(() => ({ left: padSet('left'), right: padSet('right'), up: padSet('up'), down: padSet('down') }), [padSet])

  const brief = BRIEF[tier]
  const net = phase === 'ready' && tier === 1 ? netBuoyancy(level, ballastPlan, false) : hud.net
  const neutral = neutralBallast(level, hud.attached)
  const timeLeft = Math.max(0, level.timeLimit - hud.t)
  const lastPing = pingLog[0]

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="relative h-[360px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0A1120] sm:h-[440px] lg:h-[500px]">
          <canvas
            ref={canvasRef}
            className="block h-full w-full"
            role="img"
            aria-label={`Underwater view. Depth ${hud.z.toFixed(0)} metres, pressure ${pressureAtm(hud.z).toFixed(1)} atmospheres.${hud.attached ? ' Buoy on board.' : ''}`}
          />
          <div className="pointer-events-none absolute left-2 top-2 flex max-w-[60%] flex-wrap gap-1.5 text-xs font-bold sm:text-sm">
            <span className="rounded-lg bg-[#0A1120]/80 px-2 py-1 text-white">↓ {hud.z.toFixed(1)} m</span>
            <span className="rounded-lg bg-[#0A1120]/80 px-2 py-1 text-cyan-200">{pressureAtm(hud.z).toFixed(1)} atm</span>
            <span className={`rounded-lg px-2 py-1 ${timeLeft < 40 ? 'bg-red-500/40 text-white' : 'bg-[#0A1120]/80 text-white'}`}>⏱ {Math.ceil(timeLeft)} s</span>
            <span className="rounded-lg bg-[#0A1120]/80 px-2 py-1 text-white">🔴 red light {hud.redPct}%</span>
            {hud.attached && <span className="rounded-lg bg-emerald-500/40 px-2 py-1 text-white">Buoy on board</span>}
          </div>
          {toast && (
            <div key={toast.id} className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3" aria-live="polite">
              <span className="rounded-2xl bg-[#0A1120]/90 px-4 py-2 text-center text-sm font-bold text-white shadow-[0_8px_24px_rgba(0,0,0,.45)]">{toast.text}</span>
            </div>
          )}
          {phase === 'ready' && (
            <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-[#0A1120]/80 to-transparent p-4">
              <button
                type="button"
                onClick={start}
                className="min-h-[52px] rounded-2xl bg-amber-500 px-8 font-display text-lg font-bold text-[#1A1103] shadow-[0_8px_24px_rgba(0,0,0,.45)] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
              >
                {tier === 1 ? 'Dive with this ballast' : 'Dive!'}
              </button>
            </div>
          )}
          {paused && phase === 'diving' && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0A1120]/60 font-display text-xl font-bold text-white">Paused</div>
          )}
          {report && phase === 'done' && <Debrief won={report.won} title={report.message} why={report.why} onContinue={finishRound} />}
        </div>

        {/* Pilot controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-white/10 bg-[#111C32] p-3">
          <div className="grid grid-cols-3 gap-1.5" aria-label="Thrusters">
            <span />
            <PadButton label="Thrust up" onChange={padHandlers.up}>
              ↑
            </PadButton>
            <span />
            <PadButton label="Thrust left" onChange={padHandlers.left}>
              ←
            </PadButton>
            <PadButton label="Thrust down" onChange={padHandlers.down}>
              ↓
            </PadButton>
            <PadButton label="Thrust right" onChange={padHandlers.right}>
              →
            </PadButton>
          </div>
          <div className="flex flex-1 flex-col items-stretch gap-2 sm:max-w-[220px]">
            <button
              type="button"
              onClick={doPing}
              disabled={phase === 'done' || hud.attached}
              className="min-h-[56px] rounded-2xl bg-cyan-500 font-display text-lg font-bold text-[#06202a] hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/60 disabled:opacity-40"
            >
              📡 PING
            </button>
            <button
              type="button"
              aria-pressed={fast}
              onClick={() => {
                fastRef.current = !fastRef.current
                setFast(fastRef.current)
              }}
              className={`min-h-[44px] rounded-xl border text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${fast ? 'border-amber-400 bg-amber-400/20 text-amber-200' : 'border-white/15 bg-white/5 text-white/80'}`}
            >
              Time ×2 {fast ? 'on' : 'off'}
            </button>
          </div>
        </div>
        <p className="px-1 text-sm text-[#6E7888]">Keys: arrows or WASD to steer · Space or P to ping{tier === 1 ? ' · [ and ] to pump ballast in / out' : ''}</p>
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

        {tier === 1 && (
          <section className="flex flex-col gap-2">
            <PlanSlider
              id="ocean-ballast"
              label={phase === 'ready' ? 'Ballast water' : 'Ballast pump target'}
              value={phase === 'ready' ? ballastPlan : hud.target}
              min={0}
              max={level.rov.ballastMaxL}
              step={0.05}
              decimals={2}
              unit="L"
              disabled={phase === 'done'}
              onChange={setPump}
              help={
                phase === 'ready'
                  ? 'More water in the tank = heavier. The robot is neutral when buoyancy equals weight.'
                  : `Pump moves ${level.rov.pumpRate} L/s. Tank now ${hud.ballast.toFixed(2)} L. Neutral ${hud.attached ? 'with the buoy' : ''}: ${Math.max(0, neutral).toFixed(2)} L.`
              }
            />
            <NetForce net={net} vThrust={level.rov.vThrust} />
          </section>
        )}

        <section className="rounded-[20px] border border-white/10 bg-[#111C32] p-4" aria-live="polite">
          <h2 className="font-display text-base font-bold text-cyan-300">Sonar log</h2>
          {lastPing ? (
            <ul className="mt-1 space-y-1 text-sm text-[#A7B0C0]">
              {pingLog.map((p, i) => (
                <li key={`${p.t}-${i}`} className={i === 0 ? 'text-[#EEF2F8]' : ''}>
                  {p.range !== null && p.echo !== null ? (
                    <>
                      Echo after <b className="text-cyan-200">{p.echo.toFixed(3)} s</b> → {p.echo.toFixed(3)} × {SOUND_SPEED} ÷ 2 = <b className="text-amber-300">{p.range.toFixed(1)} m</b>
                    </>
                  ) : (
                    <>No echo — nothing within {level.sonarRange} m</>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-[#A7B0C0]">Press PING. Sound travels about {SOUND_SPEED.toLocaleString('en')} m every second in seawater — the echo time tells you the distance.</p>
          )}
        </section>

        <section className="grid grid-cols-2 gap-2 text-sm">
          <Stat label="Tether out" value={`${hud.tether.toFixed(0)} / ${level.tetherLen} m`} warn={hud.taut} />
          <Stat label="Tether drag" value={`${hud.tetherDrag.toFixed(1)} N`} warn={hud.tetherDrag > 8} />
          <Stat label="Speed" value={`${hud.speed.toFixed(2)} m/s`} />
          <Stat label="Pressure" value={`${pressureAtm(hud.z).toFixed(2)} atm`} />
        </section>
      </aside>
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-2xl border p-2.5 ${warn ? 'border-red-400/50 bg-red-500/10' : 'border-white/10 bg-white/5'}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-[#6E7888]">{label}</p>
      <p className="font-display text-base font-bold text-[#EEF2F8]">{value}</p>
    </div>
  )
}

function NetForce({ net, vThrust }: { net: number; vThrust: number }) {
  const pct = Math.max(-1, Math.min(1, net / 20))
  const state = Math.abs(net) < 1 ? 'Neutral — hovers by itself' : net > 0 ? 'Floats up' : 'Sinks'
  const tooHeavy = net < -vThrust
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111C32] p-3">
      <div className="flex items-baseline justify-between">
        <span className="font-display font-bold text-white">Net force</span>
        <span className={`font-display font-bold ${Math.abs(net) < 1 ? 'text-emerald-300' : tooHeavy ? 'text-red-300' : 'text-amber-300'}`}>
          {net >= 0 ? '+' : ''}
          {net.toFixed(1)} N
        </span>
      </div>
      <div className="relative mt-2 h-3 rounded-full bg-white/10" aria-hidden>
        <div className="absolute top-0 h-3 w-0.5 bg-white/60" style={{ left: '50%' }} />
        <div
          className={`absolute top-0 h-3 rounded-full ${Math.abs(net) < 1 ? 'bg-emerald-400' : net > 0 ? 'bg-cyan-400' : 'bg-amber-500'}`}
          style={{ left: pct >= 0 ? '50%' : `${50 + pct * 50}%`, width: `${Math.abs(pct) * 50}%` }}
        />
      </div>
      <p className="mt-1 text-sm text-[#A7B0C0]">
        {state}. Buoyancy (weight of water pushed aside) minus weight. Up-thrusters: {vThrust} N.
        {tooHeavy && <b className="text-red-300"> Heavier than the thrusters can lift!</b>}
      </p>
    </div>
  )
}
