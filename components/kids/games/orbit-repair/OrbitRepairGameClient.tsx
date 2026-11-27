'use client'

// components/kids/games/orbit-repair/OrbitRepairGameClient.tsx
// Orbit Repair Crew — the playable game (loaded with next/dynamic, ssr:false).
// The physics in ./sim decides what happens; this file turns taps and keys
// into thruster puffs and hand-controller moves, draws the scene, and explains
// every result afterwards ("why it happened").

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { kidsTimeLimit } from '@/lib/kids/settings'
import {
  ACE,
  CADET,
  DT,
  LEGEND,
  PILOT,
  aceTask,
  createState,
  legendRel,
  len,
  pilotRel,
  pinPos,
  pinVel,
  report,
  seen,
  step,
  sub,
  v2,
  type Dir,
  type GameState,
  type Input,
  type Note,
  type Report,
  type TierIndex,
} from './sim'
import { Fx, actorPixel, drawGame, viewFor } from './render'

interface Props {
  tier: number
  onFinish: (r: RoundResult) => void
}

type Phase = 'brief' | 'running' | 'debrief'

const BRIEF: Record<TierIndex, { title: string; steps: string[]; controls: string }> = {
  0: {
    title: 'Cadet — fly the helper robot',
    steps: [
      'A little helper robot floats inside the space station. Collect the floating wrench 🔧 and the lost camera 📷.',
      'Then park on the charger ⚡ — slowly! It only latches if you are almost stopped.',
      'Each tap is one tiny thruster puff. The robot floats and touches nothing, so almost nothing slows it down: a puff that starts it moving keeps it moving.',
    ],
    controls: 'Tap the arrows (or press the arrow keys) to puff. Puff the opposite way to stop.',
  },
  1: {
    title: 'Pilot — catch the cargo ship',
    steps: [
      'A cargo ship has switched off its thrusters and is drifting past the station. It will not stop for you.',
      'Fly the arm’s hand to the yellow grapple pin and move WITH the ship until the speed difference is under 5 cm/s.',
      'Then press Grab. Grabbing while the speeds differ bumps the ship away — or worse.',
    ],
    controls: 'Hold the arrows (or arrow keys) to move the hand. Fine mode (F) caps the hand just under the ship’s speed: hold an arrow the way the ship drifts and you stay matched while the pin creeps up to you. Grab = Space.',
  },
  2: {
    title: 'Ace — swap the broken module',
    steps: [
      'Your servicer spacecraft holds a satellite with a broken module ⚠️. Swap in the new one ✨.',
      'Order matters: take out the broken module, park it in the empty bay, fetch the new one, slide it into the slot.',
      'Nothing anchors you in space: swinging a heavy module twists the whole spacecraft the other way. Twist more than 8° and the antenna loses Earth.',
    ],
    controls: 'Hold arrows to move the hand; stop it, then Grab/Release (Space). Fine mode (F) for heavy loads.',
  },
  3: {
    title: 'Legend — full servicing mission',
    steps: [
      'Fly the servicer from 30 m out to a tumbling satellite and capture it. You fly from the ground: commands take 1 s to arrive and the video is 1 s old.',
      'Within 12 m and slow, press Sync to match the tumble — the satellite then looks still, but holding sync burns fuel every second, more the farther out you are. Get to about 5 m first so the fuel lasts.',
      'Reach the green capture ring at under 4 cm/s and Grab. Keep 15 fuel to stop the tumble afterwards.',
    ],
    controls: 'Tap arrows to puff (each puff 0.04 m/s, 1.2 fuel). Sync = X, Grab = Space. Predictor (P) draws a dashed ghost where you will be once your commands arrive.',
  },
}

const KEY_DIR: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  W: 'up',
  S: 'down',
  A: 'left',
  D: 'right',
}

interface Hud {
  t: number
  note: Note | null
  // cadet
  speed: number
  puffsLeft: number
  got: string[]
  // arm
  dist: number
  rel: number
  handSpeed: number
  shipSpeed: number
  task: string
  theta: number
  wheel: number
  held: string | null
  steps: number
  // legend
  fuel: number
  range: number
  inFlight: number
  synced: boolean
  phaseLabel: string
}

const EMPTY_HUD: Hud = {
  t: 0,
  note: null,
  speed: 0,
  puffsLeft: CADET.puffs,
  got: [],
  dist: 0,
  rel: 0,
  handSpeed: 0,
  shipSpeed: 0,
  task: '',
  theta: 0,
  wheel: 0,
  held: null,
  steps: 0,
  fuel: LEGEND.fuel,
  range: 0,
  inFlight: 0,
  synced: false,
  phaseLabel: '',
}

function readHud(s: GameState): Hud {
  const h: Hud = { ...EMPTY_HUD, t: s.t, note: s.note }
  if (s.kind === 'cadet') {
    h.speed = len(s.v)
    h.puffsLeft = CADET.puffs - s.puffsUsed
    h.got = s.pickups.filter((k) => k.got).map((k) => k.id)
  } else if (s.kind === 'pilot') {
    const r = pilotRel(s)
    h.dist = r.d
    h.rel = r.rel
    h.handSpeed = len(s.arm.hv)
    h.shipSpeed = len(pinVel(s.ship))
    const pin = pinPos(s.ship)
    h.range = Math.hypot(pin.x, pin.y)
  } else if (s.kind === 'ace') {
    h.theta = (s.theta * 180) / Math.PI
    h.wheel = s.wheel
    h.held = s.held
    h.handSpeed = len(s.arm.hv)
    h.task = aceTask(s)
    h.steps = s.steps
  } else {
    const sn = seen(s)
    h.fuel = sn.fuel
    h.range = len(sn.p)
    h.rel = legendRel(sn)
    h.synced = sn.synced
    h.inFlight = s.queue.length
    h.dist = sn.synced ? len(sub(sn.pr, LEGEND.capture)) : len(sn.p) - LEGEND.keepOut
    h.phaseLabel = sn.phase
  }
  return h
}

function Stat({ label, value, tone = 'plain', sub: subText }: { label: string; value: ReactNode; tone?: 'plain' | 'good' | 'warn' | 'bad'; sub?: string }) {
  const col = tone === 'good' ? 'text-emerald-300' : tone === 'warn' ? 'text-amber-300' : tone === 'bad' ? 'text-red-300' : 'text-[#EEF2F8]'
  return (
    <div className="rounded-2xl bg-white/5 px-3 py-2">
      <p className="text-[12px] font-bold uppercase tracking-wide text-[#A7B0C0]">{label}</p>
      <p className={`font-display text-xl font-bold tabular-nums ${col}`}>{value}</p>
      {subText && <p className="text-[12px] leading-snug text-[#6E7888]">{subText}</p>}
    </div>
  )
}

function Meter({ value, max, mark, good, label }: { value: number; max: number; mark?: number; good: boolean; label: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div>
      <div className="relative h-4 overflow-hidden rounded-full bg-white/10" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Number(value.toFixed(2))}>
        <div className={`h-full rounded-full ${good ? 'bg-emerald-400' : 'bg-amber-400'} transition-[width] duration-100 motion-reduce:transition-none`} style={{ width: `${pct}%` }} />
        {mark !== undefined && <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${(mark / max) * 100}%` }} />}
      </div>
    </div>
  )
}

const BTN =
  'flex min-h-[52px] min-w-[52px] select-none items-center justify-center rounded-2xl border border-white/15 bg-[#19263F] font-display text-xl font-bold text-[#EEF2F8] shadow-[0_4px_0_rgba(0,0,0,.35)] transition active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 motion-reduce:transition-none touch-none'

const ARROW: Record<Dir, string> = { up: '▲', down: '▼', left: '◀', right: '▶' }
const DIR_NAME: Record<Dir, string> = { up: 'up', down: 'down', left: 'left', right: 'right' }

export default function OrbitRepairGameClient({ tier: tierProp, onFinish }: Props) {
  const tier = Math.max(0, Math.min(3, tierProp)) as TierIndex
  const brief = BRIEF[tier]
  const usesPuffs = tier === 0 || tier === 3
  const usesArm = tier === 1 || tier === 2

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<GameState>(createState(tier, kidsTimeLimit))
  const fxRef = useRef<Fx | null>(null)
  const phaseRef = useRef<Phase>('brief')
  const puffQ = useRef<Dir[]>([])
  const held = useRef<Set<Dir>>(new Set())
  const grabQ = useRef(false)
  const syncQ = useRef(false)
  const fineRef = useRef(false)
  const predictorRef = useRef(true)
  const plumesDue = useRef<{ at: number; dir: Dir }[]>([])
  const attempts = useRef(0)
  const lastNote = useRef<Note | null>(null)

  const [phase, setPhase] = useState<Phase>('brief')
  const [hud, setHud] = useState<Hud>(() => readHud(stateRef.current))
  const [rep, setRep] = useState<Report | null>(null)
  const [fine, setFine] = useState(false)
  const [predictor, setPredictor] = useState(true)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    try {
      const k = `r2bot_orbit_attempts_t${tier}`
      attempts.current = Number(sessionStorage.getItem(k) || '0') + 1
      sessionStorage.setItem(k, String(attempts.current))
    } catch {
      attempts.current = 1
    }
  }, [tier])

  const start = useCallback(() => {
    primeAudio()
    playSound('click')
    phaseRef.current = 'running'
    setPhase('running')
    wrapRef.current?.focus({ preventScroll: true })
  }, [])

  const puff = useCallback(
    (d: Dir) => {
      if (phaseRef.current !== 'running') return
      const s = stateRef.current
      if (s.kind === 'cadet' && s.puffsUsed >= CADET.puffs) return
      puffQ.current.push(d)
      playSound('click')
      if (s.kind === 'legend') plumesDue.current.push({ at: s.t + LEGEND.up + LEGEND.down, dir: d })
    },
    [],
  )

  const grab = useCallback(() => {
    if (phaseRef.current !== 'running') return
    grabQ.current = true
    playSound('click')
  }, [])
  const sync = useCallback(() => {
    if (phaseRef.current !== 'running') return
    syncQ.current = true
    playSound('click')
  }, [])
  const toggleFine = useCallback(() => {
    fineRef.current = !fineRef.current
    setFine(fineRef.current)
  }, [])
  const togglePredictor = useCallback(() => {
    predictorRef.current = !predictorRef.current
    setPredictor(predictorRef.current)
  }, [])

  const finishRound = useCallback(() => {
    const r = rep
    if (!r) return
    onFinish({
      stars: r.stars,
      score: r.score,
      scoreLabel: r.scoreLabel,
      lowerIsBetter: r.lowerIsBetter,
      message: r.message,
      badges: r.badges.length ? r.badges : undefined,
      attempts: Math.max(1, attempts.current),
    })
  }, [onFinish, rep])

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return
      if (phaseRef.current === 'brief' && (e.key === 'Enter' || e.key === ' ') && document.activeElement === wrapRef.current) {
        e.preventDefault()
        start()
        return
      }
      if (phaseRef.current !== 'running') return
      const d = KEY_DIR[e.key]
      if (d) {
        e.preventDefault()
        if (usesPuffs) {
          if (!e.repeat) puff(d)
        } else held.current.add(d)
        return
      }
      if (e.key === ' ') {
        e.preventDefault()
        if (!e.repeat) grab()
      } else if ((e.key === 'f' || e.key === 'F') && usesArm && !e.repeat) toggleFine()
      else if ((e.key === 'x' || e.key === 'X') && tier === 3 && !e.repeat) sync()
      else if ((e.key === 'p' || e.key === 'P') && tier === 3 && !e.repeat) togglePredictor()
    }
    const up = (e: KeyboardEvent) => {
      const d = KEY_DIR[e.key]
      if (d) held.current.delete(d)
    }
    const blur = () => held.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [grab, puff, start, sync, tier, toggleFine, togglePredictor, usesArm, usesPuffs])

  // The loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fx = new Fx(reduced)
    fxRef.current = fx
    let raf = 0
    let last = performance.now()
    let acc = 0
    let hudAcc = 0
    let cssW = 0
    let cssH = 0
    let dpr = 1

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      dpr = Math.min(2, window.devicePixelRatio || 1)
      cssW = r.width
      cssH = r.height
      canvas.width = Math.round(r.width * dpr)
      canvas.height = Math.round(r.height * dpr)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const onVis = () => {
      setPaused(document.hidden)
      last = performance.now()
      held.current.clear()
    }
    document.addEventListener('visibilitychange', onVis)

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dtReal = Math.min(0.1, (now - last) / 1000)
      last = now
      if (document.hidden) return
      const s = stateRef.current
      const view = viewFor(s, cssW, cssH, fx)

      if (phaseRef.current === 'running') {
        acc += dtReal
        let n = 0
        while (acc >= DT && n < 6) {
          const h = held.current
          const stick = v2((h.has('right') ? 1 : 0) - (h.has('left') ? 1 : 0), (h.has('up') ? 1 : 0) - (h.has('down') ? 1 : 0))
          const inp: Input = { puffs: puffQ.current.splice(0), stick, fine: fineRef.current, grab: grabQ.current, sync: syncQ.current }
          grabQ.current = false
          syncQ.current = false
          if (s.kind === 'cadet') for (const d of inp.puffs) fx.plume(actorPixel(s, view), d, CADET.size * view.scale)
          step(s, inp)
          acc -= DT
          n++
          if (s.outcome !== 'running') break
        }
        if (n >= 6) acc = 0
        // Legend: the plume appears when the operator SEES it (2 s after pressing).
        if (s.kind === 'legend') {
          const due = plumesDue.current
          while (due.length && due[0].at <= s.t) fx.plume(actorPixel(s, view), due.shift()!.dir, view.scale * 1.2)
        }
        if (s.note && s.note !== lastNote.current) {
          lastNote.current = s.note
          playSound(s.note.tone === 'good' ? 'correct' : s.note.tone === 'bad' ? 'wrong' : 'click')
        }
        if (s.outcome !== 'running') {
          phaseRef.current = 'debrief'
          const r = report(s)
          setRep(r)
          setPhase('debrief')
          held.current.clear()
          const p = actorPixel(s, view)
          if (r.stars > 0) {
            fx.burst(p, '#FFA878', 40)
            playSound('star')
          } else {
            fx.burst(p, '#f87171', 30)
            fx.flash = 1
            playSound('wrong')
          }
        }
      }
      fx.update(dtReal)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawGame(ctx, view, s, fx, { predictor: predictorRef.current })

      hudAcc += dtReal
      if (hudAcc > 0.1) {
        hudAcc = 0
        setHud(readHud(s))
      }
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      fxRef.current = null
    }
  }, [])

  // Hold-to-move pads for the arm tiers
  const holdProps = (d: Dir) =>
    usesArm
      ? {
          onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
            e.preventDefault()
            primeAudio()
            ;(e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId)
            held.current.add(d)
          },
          onPointerUp: () => held.current.delete(d),
          onPointerCancel: () => held.current.delete(d),
          onLostPointerCapture: () => held.current.delete(d),
          onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
        }
      : {
          onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
            e.preventDefault()
            primeAudio()
            puff(d)
          },
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              e.stopPropagation()
              puff(d)
            }
          },
          onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
        }

  const pad = (
    <div className="grid grid-cols-3 gap-2" aria-label={usesPuffs ? 'Thrusters: each tap is one puff' : 'Arm hand controller: hold to move'} role="group">
      <span />
      <button type="button" className={BTN} aria-label={usesPuffs ? `Puff ${DIR_NAME.up}` : `Move hand ${DIR_NAME.up}`} {...holdProps('up')}>
        {ARROW.up}
      </button>
      <span />
      <button type="button" className={BTN} aria-label={usesPuffs ? `Puff ${DIR_NAME.left}` : `Move hand ${DIR_NAME.left}`} {...holdProps('left')}>
        {ARROW.left}
      </button>
      <button type="button" className={`${BTN} text-base`} aria-label="Grab or release" onClick={grab} disabled={tier === 0}>
        {tier === 0 ? '🤖' : '✊'}
      </button>
      <button type="button" className={BTN} aria-label={usesPuffs ? `Puff ${DIR_NAME.right}` : `Move hand ${DIR_NAME.right}`} {...holdProps('right')}>
        {ARROW.right}
      </button>
      <span />
      <button type="button" className={BTN} aria-label={usesPuffs ? `Puff ${DIR_NAME.down}` : `Move hand ${DIR_NAME.down}`} {...holdProps('down')}>
        {ARROW.down}
      </button>
      <span />
    </div>
  )

  const noteTone = hud.note ? (hud.note.tone === 'good' ? 'border-emerald-400/50 text-emerald-200' : hud.note.tone === 'bad' ? 'border-red-400/50 text-red-200' : hud.note.tone === 'warn' ? 'border-amber-400/50 text-amber-200' : 'border-cyan-400/40 text-cyan-100') : ''
  const showNote = hud.note && hud.t - hud.note.t < 4

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-2">
        <div
          ref={wrapRef}
          tabIndex={-1}
          className="relative h-[330px] overflow-hidden rounded-3xl border border-white/10 bg-[#03060d] outline-none sm:h-[420px] lg:h-[470px]"
        >
          <canvas ref={canvasRef} className="h-full w-full" role="img" aria-label={`${brief.title}. ${hud.note?.text ?? ''}`} />

          {phase === 'running' && showNote && hud.note && (
            <p role="status" className={`pointer-events-none absolute left-1/2 top-3 max-w-[92%] -translate-x-1/2 rounded-2xl border bg-[#0A1120]/90 px-3 py-1.5 text-center text-[15px] font-semibold ${noteTone}`}>
              {hud.note.text}
            </p>
          )}
          {phase === 'running' && paused && (
            <p className="absolute inset-0 flex items-center justify-center bg-[#0A1120]/70 font-display text-2xl font-bold text-white">Paused</p>
          )}
          {tier === 3 && phase === 'running' && (
            <div className="pointer-events-none absolute bottom-2 left-2 rounded-xl bg-[#0A1120]/80 px-2 py-1 text-[12px] font-bold text-cyan-200">
              📡 video {LEGEND.down.toFixed(1)} s old · {hud.inFlight} command{hud.inFlight === 1 ? '' : 's'} on the way up
            </div>
          )}

          {phase === 'brief' && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0A1120]/80 p-3 backdrop-blur-[2px]">
              <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-[20px] border border-white/15 bg-[#111C32] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-5">
                <h2 className="font-display text-xl font-bold text-[#EEF2F8] sm:text-2xl">{brief.title}</h2>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-[15px] leading-snug text-[#A7B0C0] sm:text-[16px]">
                  {brief.steps.map((st) => (
                    <li key={st}>{st}</li>
                  ))}
                </ol>
                <p className="mt-2 text-[14px] text-cyan-200">{brief.controls}</p>
                <button
                  type="button"
                  autoFocus
                  onClick={start}
                  className="mt-3 min-h-[52px] w-full rounded-2xl bg-amber-500 font-display text-lg font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
                >
                  {tier === 3 ? 'Begin mission' : 'Start'} 🚀
                </button>
              </div>
            </div>
          )}

          {phase === 'debrief' && rep && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0A1120]/75 p-3 backdrop-blur-[2px]">
              <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-[20px] border border-white/15 bg-[#111C32] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">{rep.stars > 0 ? 'Mission complete' : 'Mission ended'}</p>
                <h2 className="font-display text-xl font-bold text-[#EEF2F8]">Why it happened</h2>
                <ul className="mt-2 space-y-1.5 text-[15px] leading-snug text-[#A7B0C0]">
                  {rep.why.map((w) => (
                    <li key={w} className="flex gap-2">
                      <span aria-hidden className="text-cyan-300">●</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  autoFocus
                  onClick={finishRound}
                  className="mt-3 min-h-[52px] w-full rounded-2xl bg-amber-500 font-display text-lg font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
                >
                  See my result →
                </button>
              </div>
            </div>
          )}
        </div>
        <p className="hidden px-1 text-[13px] text-[#6E7888] lg:block">{brief.controls}</p>
      </div>

      <div className="flex flex-col gap-3">
        <section className="order-2 rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-3 lg:order-1" aria-label="Mission data">
          {tier === 0 && (
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Speed" value={`${hud.speed.toFixed(2)} m/s`} tone={hud.speed <= CADET.dockSpeed ? 'good' : 'warn'} sub={hud.speed <= CADET.dockSpeed ? 'Slow enough to latch' : 'Too fast to latch'} />
              <Stat label="Puffs left" value={hud.puffsLeft} tone={hud.puffsLeft < 8 ? 'bad' : 'plain'} sub={`Each puff: ±${CADET.dv} m/s`} />
              <div className="col-span-2">
                <Meter value={hud.speed} max={0.5} mark={CADET.dockSpeed} good={hud.speed <= CADET.dockSpeed} label="Robot speed" />
                <ul className="mt-2 flex gap-2 text-[14px] font-bold">
                  <li className={`rounded-xl px-2 py-1 ${hud.got.includes('wrench') ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/5 text-[#A7B0C0]'}`}>🔧 {hud.got.includes('wrench') ? '✓' : ''}</li>
                  <li className={`rounded-xl px-2 py-1 ${hud.got.includes('camera') ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/5 text-[#A7B0C0]'}`}>📷 {hud.got.includes('camera') ? '✓' : ''}</li>
                  <li className="rounded-xl bg-white/5 px-2 py-1 text-[#A7B0C0]">⚡ dock</li>
                </ul>
              </div>
            </div>
          )}
          {tier === 1 && (
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Hand to pin" value={`${hud.dist.toFixed(2)} m`} tone={hud.dist <= PILOT.captureR ? 'good' : 'plain'} sub={`Grab within ${PILOT.captureR} m`} />
              <Stat
                label="Speed difference"
                value={`${(hud.rel * 100).toFixed(1)} cm/s`}
                tone={hud.rel <= PILOT.captureRel ? 'good' : hud.rel <= PILOT.bumpRel ? 'warn' : 'bad'}
                sub={hud.rel <= PILOT.captureRel ? 'Matched — safe to grab' : `Need ≤ ${PILOT.captureRel * 100} cm/s`}
              />
              <Stat label="Ship drift" value={`${(hud.shipSpeed * 100).toFixed(1)} cm/s`} sub="It never slows down" />
              <Stat label="Hand speed" value={`${(hud.handSpeed * 100).toFixed(1)} cm/s`} sub={fine ? 'Fine mode' : 'Normal mode'} />
            </div>
          )}
          {tier === 2 && (
            <div className="flex flex-col gap-2">
              <div>
                <div className="flex items-baseline justify-between">
                  <p className="text-[12px] font-bold uppercase tracking-wide text-[#A7B0C0]">Spacecraft twist</p>
                  <p className={`font-display text-xl font-bold tabular-nums ${Math.abs(hud.theta) > ACE.warnDeg ? 'text-red-300' : Math.abs(hud.theta) > 2 ? 'text-amber-300' : 'text-emerald-300'}`}>{hud.theta.toFixed(1)}°</p>
                </div>
                <div className="relative mt-1 h-5 rounded-full bg-gradient-to-r from-red-500/50 via-emerald-500/40 to-red-500/50" role="meter" aria-label="Spacecraft twist in degrees" aria-valuemin={0 - ACE.limitDeg} aria-valuemax={ACE.limitDeg} aria-valuenow={Number(hud.theta.toFixed(1))}>
                  <div className="absolute inset-y-[-3px] w-1.5 rounded bg-white shadow" style={{ left: `calc(${((Math.max(-ACE.limitDeg, Math.min(ACE.limitDeg, hud.theta)) + ACE.limitDeg) / (2 * ACE.limitDeg)) * 100}% - 3px)` }} />
                </div>
                <p className="mt-1 text-[12px] text-[#6E7888]">Antenna loses Earth beyond ±{ACE.limitDeg}°. Reaction wheels: {Math.round(Math.abs(hud.wheel) * 100)}% effort.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Holding" value={hud.held === 'old' ? '⚠️ broken' : hud.held === 'new' ? '✨ new' : '—'} sub={hud.held ? `${ACE.moduleMass} kg: go slow` : 'Empty hand'} />
                <Stat label="Hand speed" value={`${(hud.handSpeed * 100).toFixed(0)} cm/s`} tone={hud.handSpeed <= ACE.grabSpeed ? 'good' : 'plain'} sub={fine ? 'Fine mode' : 'Normal mode'} />
              </div>
              <p className="rounded-2xl bg-amber-500/10 px-3 py-2 text-[15px] font-semibold text-amber-200">
                Next: {hud.task} <span className="text-[#A7B0C0]">({hud.steps}/4 steps)</span>
              </p>
            </div>
          )}
          {tier === 3 && (
            <div className="flex flex-col gap-2">
              <div>
                <div className="flex items-baseline justify-between">
                  <p className="text-[12px] font-bold uppercase tracking-wide text-[#A7B0C0]">Fuel</p>
                  <p className={`font-display text-xl font-bold tabular-nums ${hud.fuel < LEGEND.detumbleFuel + 10 ? 'text-red-300' : 'text-[#EEF2F8]'}`}>{hud.fuel.toFixed(0)}</p>
                </div>
                <Meter value={hud.fuel} max={LEGEND.fuel} mark={LEGEND.detumbleFuel} good={hud.fuel > LEGEND.detumbleFuel + 10} label="Fuel left" />
                <p className="mt-1 text-[12px] text-[#6E7888]">White line: fuel you must keep to stop the tumble.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Range" value={`${hud.range.toFixed(1)} m`} tone={hud.range <= LEGEND.cheapSyncRange ? 'good' : hud.range <= LEGEND.syncRange ? 'warn' : 'plain'} sub={hud.synced ? 'Synced to tumble' : hud.range <= LEGEND.cheapSyncRange ? 'Close: sync is cheap here' : hud.range <= LEGEND.syncRange ? 'Closer = cheaper sync' : `Sync within ${LEGEND.syncRange} m`} />
                <Stat
                  label={hud.synced ? 'Closing speed' : 'Speed'}
                  value={`${(hud.rel * 100).toFixed(1)} cm/s`}
                  tone={hud.synced ? (hud.rel <= LEGEND.captureRel ? 'good' : 'warn') : hud.rel <= LEGEND.syncRel ? 'good' : 'warn'}
                  sub={hud.synced ? `Grab at ≤ ${LEGEND.captureRel * 100}` : `Sync at ≤ ${LEGEND.syncRel * 100}`}
                />
                {hud.synced && <Stat label="To capture ring" value={`${hud.dist.toFixed(2)} m`} tone={hud.dist <= LEGEND.captureR ? 'good' : 'plain'} sub={`Within ${LEGEND.captureR} m`} />}
                <Stat label="Phase" value={hud.phaseLabel === 'approach' ? 'Approach' : hud.phaseLabel === 'synced' ? 'Synced' : hud.phaseLabel === 'captured' ? 'Captured' : hud.phaseLabel === 'detumble' ? 'Detumble' : 'Refuel'} />
              </div>
            </div>
          )}
        </section>

        {/* On phones the controls sit directly under the scene, so the arrows and the robot are on screen together. */}
        <section className="order-1 rounded-[20px] border border-white/10 bg-[#111C32] p-3 lg:order-2" aria-label="Controls">
          <div className="flex items-start gap-3">
            {pad}
            <div className="flex flex-1 flex-col gap-2">
              {usesArm && (
                <>
                  <button type="button" onClick={grab} className="min-h-[52px] rounded-2xl bg-amber-500 px-3 font-display text-lg font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70">
                    {tier === 2 && hud.held ? 'Release' : 'Grab'} <span className="text-sm opacity-70">(Space)</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={fine}
                    onClick={toggleFine}
                    className={`min-h-[48px] rounded-2xl border-2 px-3 font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${fine ? 'border-cyan-300 bg-cyan-400/20 text-cyan-100' : 'border-white/15 text-[#A7B0C0]'}`}
                  >
                    Fine mode {fine ? 'ON' : 'off'} <span className="text-sm opacity-70">(F)</span>
                  </button>
                </>
              )}
              {tier === 3 && (
                <>
                  <button type="button" onClick={sync} className="min-h-[48px] rounded-2xl border-2 border-cyan-300/60 bg-cyan-400/10 px-3 font-bold text-cyan-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
                    {hud.synced ? 'Stop sync' : 'Sync to tumble'} <span className="text-sm opacity-70">(X)</span>
                  </button>
                  <button type="button" onClick={grab} className="min-h-[48px] rounded-2xl bg-amber-500 px-3 font-display font-bold text-[#1A1103] hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70">
                    Grab <span className="text-sm opacity-70">(Space)</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={predictor}
                    onClick={togglePredictor}
                    className={`min-h-[44px] rounded-2xl border px-3 text-[14px] font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${predictor ? 'border-cyan-300/60 text-cyan-100' : 'border-white/15 text-[#A7B0C0]'}`}
                  >
                    Predictor {predictor ? 'on' : 'off'} (P)
                  </button>
                </>
              )}
              {tier === 0 && (
                <p className="text-[14px] leading-snug text-[#A7B0C0]">
                  One tap = one puff. The gas shoots out one way and pushes the robot the <b className="text-[#EEF2F8]">other</b> way.
                </p>
              )}
            </div>
          </div>
          {tier === 3 && <p className="mt-2 hidden text-[12px] lg:block leading-snug text-[#6E7888]">The dashed ghost shows where the servicer will be once every command you sent has arrived — a predictor display, as real teleoperators use.</p>}
        </section>
      </div>
    </div>
  )
}
