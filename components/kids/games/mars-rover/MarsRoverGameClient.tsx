'use client'

// components/kids/games/mars-rover/MarsRoverGameClient.tsx
// Mars Rover Command — the playable game (loaded with next/dynamic, ssr:false).
// The child is the rover team on Earth: plan a command sequence, send it, and
// watch news arrive minutes late. The simulation in ./sim decides what really
// happens on Mars; Earth only learns about it after the light delay.

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { buildMap, legendStarLines, MAPS_PER_TIER, TIERS, type RuleId, type TierConfig, type TierIndex } from './terrain'
import {
  addCmd,
  CAPACITY_WH,
  CELL_M,
  DT,
  clockAt,
  clockRunning,
  createSim,
  evaluate,
  fmtClock,
  heaterW,
  isOver,
  previewPlan,
  sendUplink,
  solarW,
  tick,
  type Arrival,
  type Cmd,
  type Outcome,
  type Sim,
} from './sim'
import { BAND_PX, Fx, bakeTerrain, cellToPixel, drawFrame, makeView, type View } from './render'
import { recordGameFrame } from '@/lib/kids/sim/game-recorder'

interface Props {
  tier: number
  onFinish: (r: RoundResult) => void
}

/** Chosen map per tier; module scope so "Try again" keeps the same terrain. */
const mapChoice = [0, 0, 0, 0]

type Phase = 'plan' | 'live' | 'over'

interface LogLine {
  id: number
  at: string
  text: string
  tone: 'good' | 'bad' | 'info' | 'pic'
}

interface Hud {
  t: number
  running: boolean
  idle: boolean
  inFlight: number
  points: number
  whPct: number
  solar: number
  uplinks: number
  nextPass: string | null
  nextPassMb: number
  onRover: number
  heater: number
}

/** A tiny external store, so the HUD can update ~8×/s without re-rendering the whole game. */
interface HudStore {
  get: () => Hud | null
  set: (h: Hud) => void
  sub: (fn: () => void) => () => void
}

function makeHudStore(): HudStore {
  let cur: Hud | null = null
  const subs = new Set<() => void>()
  return {
    get: () => cur,
    set: (h) => {
      if (cur && (Object.keys(h) as (keyof Hud)[]).every((k) => h[k] === cur?.[k])) return
      cur = h
      subs.forEach((fn) => fn())
    },
    sub: (fn) => {
      subs.add(fn)
      return () => {
        subs.delete(fn)
      }
    },
  }
}

function useHud(store: HudStore): Hud | null {
  return useSyncExternalStore(store.sub, store.get, () => null)
}

/** Elements that use Enter/Space themselves; the game must not steal those keys. */
function isInteractive(el: HTMLElement | null): boolean {
  if (!el) return false
  if (el.isContentEditable) return true
  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A', 'SUMMARY'].includes(el.tagName)) return true
  const role = el.getAttribute('role')
  return role === 'switch' || role === 'radio' || role === 'button' || role === 'link' || role === 'checkbox' || role === 'tab'
}

const RULE_INFO: Record<RuleId, { name: string; text: string; icon: string }> = {
  haz: { name: 'Hazard avoidance', icon: '🪨', text: 'IF a rock or steep slope is ahead THEN steer around it and carry on.' },
  vo: { name: 'Visual odometry', icon: '👁️', text: 'Compare camera pictures to measure real movement, so slip is caught. Each drive takes 40% longer.' },
  power: { name: 'Power guard', icon: '🔋', text: 'IF battery is below 20% THEN stop and charge in the Sun (or park if it is too dark).' },
  aegis: { name: 'AEGIS science', icon: '✨', text: 'IF an interesting rock is next to the rover THEN zap it with the laser — no need to ask Earth.' },
  scifirst: { name: 'Science first', icon: '📦', text: 'At each relay pass, send science data before pictures.' },
}

const BRIEF = [
  'Drive to target ① and run Science 🔬 on it. Signals take 4 minutes each way. Build the turns and drives, check the orange line, then Send. ★★★ = done in 2 plans or fewer.',
  'The delay is 12 minutes now. Plan the WHOLE route in one go. Avoid rocks, steep slopes (striped) and dark dunes — deep sand traps a rover for good. ★★★ = one plan.',
  '20-minute delay. Pale rippled sand makes wheels slip, and small rocks are too small to see from orbit. Switch on onboard rules so the rover handles surprises without waiting for you. ★★★ = one plan.',
  'One Mars day (sol). Four targets, a battery charged by the Sun (the heaters drain it in the cold morning), and relay passes that carry only 40, 60 and 40 MB. Use AutoNav 🧭, rules and smart timing to get the most science to Earth before 17:15.',
]

function cmdLabel(c: Cmd, tier: TierIndex): string {
  switch (c.k) {
    case 'fwd':
      return `▲ ${c.n}`
    case 'turn':
      return `${c.d < 0 ? '↺' : '↻'} ${Math.abs(c.d) * 45}°`
    case 'sci':
      return '🔬 Science'
    case 'photo':
      return '📷 Photo'
    case 'goto':
      return `🧭 → ${c.target + 1}`
    case 'wait':
      return `⏳ ${c.min} min`
    default:
      return tier >= 0 ? '?' : ''
  }
}

function cmdSpeak(c: Cmd): string {
  switch (c.k) {
    case 'fwd':
      return `Drive forward ${c.n} square${c.n > 1 ? 's' : ''}`
    case 'turn':
      return `Turn ${c.d < 0 ? 'left' : 'right'} ${Math.abs(c.d) * 45} degrees`
    case 'sci':
      return 'Run science'
    case 'photo':
      return 'Take a photo'
    case 'goto':
      return `AutoNav to target ${c.target + 1}`
    case 'wait':
      return `Wait ${c.min} minutes`
    default:
      return ''
  }
}

function ClockBar({ store, sim, cfg, speed, onSpeed }: { store: HudStore; sim: Sim; cfg: TierConfig; speed: number; onSpeed: () => void }) {
  const h = useHud(store)
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-white/10 bg-[#111C32] px-3 py-1.5 text-sm">
      <span className="font-display text-lg font-black tabular-nums text-white" aria-label="Mars local time">
        🕒 {fmtClock(clockAt(sim, h?.t ?? 0))}
      </span>
      <span className="text-[#A7B0C0]">mission +{Math.round(h?.t ?? 0)} min</span>
      {cfg.legend && h && (
        <span className="flex items-center gap-1.5 text-[#A7B0C0]" aria-label={`Battery ${h.whPct} percent, solar ${h.solar} watts${h.heater ? `, heaters ${h.heater} watts` : ''}`}>
          <span aria-hidden>🔋</span>
          <span className="relative inline-block h-3 w-14 overflow-hidden rounded-full bg-white/10">
            <span className={`absolute inset-y-0 left-0 ${h.whPct < 20 ? 'bg-red-500' : h.whPct < 35 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.max(0, Math.min(100, h.whPct))}%` }} />
          </span>
          <b className="tabular-nums text-white">{h.whPct}%</b>
          <span aria-hidden>☀️</span>
          <b className="tabular-nums text-white">{h.solar} W</b>
          {h.heater > 0 && (
            <>
              <span aria-hidden>🌡️</span>
              <b className="tabular-nums text-sky-200">−{h.heater} W</b>
            </>
          )}
        </span>
      )}
      <span className="ml-auto flex gap-2">
        <button
          type="button"
          onClick={onSpeed}
          aria-pressed={speed === 4}
          className={`min-h-[44px] rounded-xl border px-3 font-black ${speed === 4 ? 'border-amber-400 bg-amber-400 text-[#1A1103]' : 'border-white/15 bg-white/5 text-white'}`}
        >
          ⏩ ×4
        </button>
      </span>
    </div>
  )
}

function StatusLine({ store, phase, started, endingSol, stuck, delay }: { store: HudStore; phase: Phase; started: boolean; endingSol: boolean; stuck: boolean; delay: number }) {
  const h = useHud(store)
  const text = (() => {
    if (phase === 'over') return 'Mission over — see why it happened below.'
    if (!started) return 'Planning. The mission clock starts when you press Send.'
    if (stuck) return 'The rover is stuck, but its radio works: fast-forwarding so the relay passes can send its data home…'
    if (endingSol) return 'Fast-forwarding to the end of the sol…'
    if (h?.idle) return 'Your turn: plan the next drive. (Clock paused while you plan.)'
    if (h && h.inFlight > 0) return `Commands flying to Mars… arrive in ${h.inFlight} min.`
    return `Rover working. Everything you see is ${delay} min old.`
  })()
  return (
    <p className="mt-2 rounded-xl bg-[#0a1120] px-3 py-2 text-sm font-bold text-amber-300" aria-live="polite">
      {text}
    </p>
  )
}

function MissionStats({ store, legend }: { store: HudStore; legend: boolean }) {
  const h = useHud(store)
  return (
    <>
      <span>
        Plans sent: <b className="text-white">{h?.uplinks ?? 0}</b>
      </span>
      {legend && (
        <>
          <span>
            Science: <b className="text-white">{h?.points ?? 0} pts</b>
          </span>
          {h?.nextPass && (
            <span>
              Next relay pass: <b className="text-white">{h.nextPass}</b> ({h.nextPassMb} MB)
            </span>
          )}
          <span>
            Waiting on rover: <b className="text-white">{h?.onRover ?? 0} MB</b>
          </span>
        </>
      )}
    </>
  )
}

export default function MarsRoverGameClient({ tier: tierProp, onFinish }: Props) {
  const tier = Math.max(0, Math.min(3, tierProp)) as TierIndex
  const cfg = TIERS[tier]
  const [mapNo, setMapNo] = useState(mapChoice[tier])
  const map = useMemo(() => buildMap(tier, mapNo), [tier, mapNo])
  const [firstSim] = useState(() => createSim(tier, map))
  const simRef = useRef<Sim>(firstSim)
  const [hudStore] = useState(makeHudStore)
  const [plan, setPlan] = useState<Cmd[]>([])
  const [rules, setRules] = useState<RuleId[]>([])
  const [driveN, setDriveN] = useState(3)
  const [phase, setPhase] = useState<Phase>('plan')
  const [speed, setSpeed] = useState(1)
  const [log, setLog] = useState<LogLine[]>([])
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [canvasH, setCanvasH] = useState(320)
  const [canvasW, setCanvasW] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)
  const [endingSol, setEndingSol] = useState(false)
  const [stuck, setStuck] = useState(false)
  const [, setVersion] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const colRef = useRef<HTMLDivElement>(null)
  const [pinH, setPinH] = useState(0)
  // Where the pinned map sits: just under the sticky kids header (0 if there is none).
  const [pinTop, setPinTop] = useState(0)
  const onScreenRef = useRef(true)
  const debriefRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<View | null>(null)
  const fxRef = useRef<Fx | null>(null)
  const terrainRef = useRef<HTMLCanvasElement | null>(null)
  const speedRef = useRef(1)
  const endSolRef = useRef(false)
  const phaseRef = useRef<Phase>('plan')
  const logId = useRef(0)
  const planRef = useRef<Cmd[]>([])
  const finishedRef = useRef(false)

  speedRef.current = speed
  phaseRef.current = phase
  planRef.current = plan

  // New map → fresh simulation.
  useEffect(() => {
    simRef.current = createSim(tier, map)
    terrainRef.current = bakeTerrain(map)
    setPlan([])
    setLog([])
    setStuck(false)
    setEndingSol(false)
    setVersion((n) => n + 1)
  }, [tier, map])

  const addLog = useCallback((text: string, tone: LogLine['tone']) => {
    const sim = simRef.current
    logId.current++
    const line: LogLine = { id: logId.current, at: fmtClock(clockAt(sim, sim.t)), text, tone }
    setLog((l) => [line, ...l].slice(0, 40))
  }, [])

  const preview = useMemo(() => {
    void phase
    return previewPlan(simRef.current, plan)
  }, [plan, phase])

  // ── arrivals at Earth: words, sounds, sparks ──
  const onArrival = useCallback(
    (a: Arrival) => {
      const sim = simRef.current
      const fx = fxRef.current
      const v = viewRef.current
      const when = fmtClock(clockAt(sim, a.happened))
      const ev = a.ev
      switch (ev.k) {
        case 'science': {
          const t = sim.map.targets[ev.target]
          playSound('correct')
          addLog(`🔬 Science data from “${t?.name ?? 'target'}” reached Earth!${cfg.legend ? ` +${t?.value ?? 0} pts` : ''}`, 'good')
          if (fx && v && t) {
            const p = cellToPixel(v, t.x, t.y)
            fx.burst(p.x, p.y, '250,204,21', 30)
          }
          break
        }
        case 'sampled': {
          const t = sim.map.targets[ev.target]
          playSound('click')
          addLog(`Rover (at ${when}): sample of “${t?.name ?? 'target'}” taken. 30 MB waiting for a relay pass.`, 'info')
          break
        }
        case 'sci-miss':
          playSound('wrong')
          addLog(`Rover (at ${when}): Science ran, but there is no target on this square — just ordinary dust.`, 'bad')
          break
        case 'fault': {
          playSound('wrong')
          fx?.alarm()
          const why =
            ev.kind === 'rock'
              ? 'rock right in front of the wheels'
              : ev.kind === 'tilt'
                ? 'slope too steep — tilt limit'
                : ev.kind === 'edge'
                  ? 'that would leave the mapped area'
                  : 'no safe way through'
          addLog(`⚠️ Rover (at ${when}): STOPPED — ${why}. It skipped the rest of the plan and is waiting for you.`, 'bad')
          break
        }
        case 'stuck':
          playSound('wrong')
          fx?.alarm()
          addLog(`🛑 Rover (at ${when}): wheels spinning, rover sinking into deep sand. It is stuck.`, 'bad')
          if (cfg.legend) {
            // Its radio still works: run the sol on so queued data can go home.
            endSolRef.current = true
            setEndingSol(true)
            setStuck(true)
            addLog('📡 The radio still works. Any data on board will go up with the next relay passes.', 'info')
          }
          break
        case 'dead':
          playSound('wrong')
          fx?.alarm()
          addLog(`🛑 Signal lost at ${when}: battery flat, rover in low-power safe mode.`, 'bad')
          break
        case 'avoid':
          playSound('click')
          addLog(`Rover (at ${when}): hazard ahead — steering around it on its own.`, 'good')
          break
        case 'zapped':
          playSound('star')
          addLog(`✨ Rover (at ${when}): AEGIS spotted an interesting rock and zapped it with the laser.`, 'good')
          break
        case 'aegis':
          playSound('correct')
          addLog('✨ AEGIS bonus data reached Earth! +15 pts', 'good')
          break
        case 'charge':
          playSound('click')
          addLog(`🔋 Rover (at ${when}): battery low — power guard took over.`, 'info')
          break
        case 'image': {
          const ph = sim.photos[ev.id]
          playSound('star')
          if (ph && (ph.x !== ph.ex || ph.y !== ph.ey)) {
            const off = Math.round(Math.hypot(ph.x - ph.ex, ph.y - ph.ey) * CELL_M)
            addLog(`📷 Picture from ${when} arrived. Surprise: the rover is about ${off} m from where it THINKS it is! Your next plan will carry the correction.`, 'pic')
          } else addLog(`📷 Picture from ${when} arrived${ph && ph.rocks.length ? ` — it shows ${ph.rocks.length} small rock${ph.rocks.length > 1 ? 's' : ''} the orbiter could not see` : ''}.`, 'pic')
          break
        }
        case 'done':
          playSound('click')
          addLog(`📡 Rover (at ${when}): plan finished. Your turn!`, 'info')
          break
        default:
          break
      }
    },
    [addLog, cfg.legend],
  )

  const endRound = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    const sim = simRef.current
    sim.ended = true
    endSolRef.current = false
    setEndingSol(false)
    const o = evaluate(sim)
    setOutcome(o)
    setPhase('over')
    playSound(o.won ? 'zonecomplete' : 'wrong')
    window.setTimeout(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      debriefRef.current?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
    }, 200)
  }, [])

  const claim = useCallback(() => {
    if (!outcome) return
    const sim = simRef.current
    const badges = outcome.won && ((tier >= 1 && outcome.stars >= 2) || outcome.stars === 3) ? ['mars-planner'] : []
    onFinish({
      stars: outcome.stars,
      score: outcome.score,
      scoreLabel: outcome.scoreLabel,
      lowerIsBetter: outcome.lowerIsBetter,
      message: `${outcome.message}${outcome.why[0] ? ` ${outcome.why[0]}` : ''}`,
      badges,
      attempts: Math.max(1, sim.uplinks.length),
    })
    // The shell centres its results card over the whole game, which is far
    // taller than a phone screen. Bring the card itself into view.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => {
        const card = rootRef.current?.parentElement?.querySelector<HTMLElement>('[role="dialog"][aria-label="Round results"] > div')
        if (card) card.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
        else rootRef.current?.scrollIntoView({ block: 'start' })
      }),
    )
  }, [outcome, onFinish, tier])

  // ── the loop ──
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fx = new Fx(reduced)
    fxRef.current = fx
    if (!terrainRef.current) terrainRef.current = bakeTerrain(map)

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      let w = wrap.clientWidth
      let h = Math.round(w * (map.H / map.W) + BAND_PX)
      // A phone held sideways: fit the whole map on the screen (narrower, centred) instead of scrolling.
      if (window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches) {
        const maxH = Math.max(200, window.innerHeight - 92)
        if (h > maxH) {
          h = maxH
          w = Math.round(((h - BAND_PX) * map.W) / map.H)
        }
      }
      setCanvasH(h)
      setCanvasW(w < wrap.clientWidth ? w : null)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      viewRef.current = makeView(w, h, dpr, map)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    let raf = 0
    let last = performance.now()
    let acc = 0
    let hudAt = 0
    let hidden = document.hidden
    const start = performance.now()

    const frame = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000))
      last = now
      const sim = simRef.current
      const v = viewRef.current
      const running = (clockRunning(sim) || endSolRef.current) && phaseRef.current !== 'over'
      if (running && !hidden) {
        const sp = endSolRef.current ? 14 : speedRef.current
        acc += (dt * cfg.minPerSec * sp) / DT
        let n = 0
        while (acc >= 1 && n < 600) {
          acc -= 1
          n++
          const arr = tick(sim)
          // sim.t is mission MINUTES (DT = 0.25 min; battery Wh += W × DT / 60); the recorder's clock is seconds. Positions are cells of CELL_M metres.
          recordGameFrame(sim.t * 60, { 'Battery (Wh)': sim.rover.wh, 'Believed vs true (m)': Math.hypot(sim.rover.ex - sim.rover.x, sim.rover.ey - sim.rover.y) * CELL_M })
          arr.forEach(onArrival)
          if (isOver(sim)) {
            endRound()
            break
          }
          if (!clockRunning(sim) && !endSolRef.current) {
            acc = 0
            setPhase((p) => (p === 'over' ? p : 'plan'))
            break
          }
        }
      } else acc = 0
      if (v && terrainRef.current) {
        if (!hidden) fx.update(dt)
        drawFrame(ctx, v, sim, terrainRef.current, fx, {
          preview: phaseRef.current === 'plan' && planRef.current.length ? previewPlan(sim, planRef.current) : null,
          reveal: phaseRef.current === 'over',
          time: (now - start) / 1000,
          frac: running ? Math.min(1, acc) : 0,
          reduced,
          selectedTarget: null,
        })
      }
      if (now - hudAt > 120) {
        hudAt = now
        const last = sim.uplinks[sim.uplinks.length - 1]
        const pass = sim.passes.find((p) => !p.done)
        const knownT = sim.t - cfg.delay
        hudStore.set({
          t: sim.t,
          running,
          idle: sim.earthKnowsIdle,
          inFlight: last && sim.t < last.arriveAt ? Math.ceil(last.arriveAt - sim.t) : 0,
          points: sim.points,
          whPct: Math.round(((sim.snaps[Math.max(0, Math.min(sim.snaps.length - 1, Math.floor(Math.max(0, knownT) / DT)))]?.wh ?? 0) / CAPACITY_WH) * 100),
          solar: Math.round(solarW(clockAt(sim, sim.t))),
          uplinks: sim.uplinks.length,
          nextPass: pass ? fmtClock(clockAt(sim, pass.t)) : null,
          nextPassMb: pass ? pass.mb : 0,
          onRover: sim.downlinkQueue.filter((d) => d.made <= knownT).reduce((s, d) => s + d.mb, 0),
          heater: cfg.legend ? Math.round(heaterW(clockAt(sim, sim.t))) : 0,
        })
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    const onVis = () => {
      hidden = document.hidden
      setPaused(hidden)
      last = performance.now()
    }
    document.addEventListener('visibilitychange', onVis)
    // Keys only drive the game while the map is actually on screen.
    const io = new IntersectionObserver(
      ([e]) => {
        onScreenRef.current = e.isIntersecting && e.intersectionRatio >= 0.3
      },
      { threshold: [0, 0.3, 0.6, 1] },
    )
    io.observe(wrap)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      fxRef.current = null
    }
  }, [map, cfg, onArrival, endRound, hudStore])

  // ── plan editing ──
  const canEdit = phase === 'plan'
  const add = useCallback(
    (c: Cmd) => {
      if (phaseRef.current !== 'plan') return
      primeAudio()
      const prev = planRef.current
      const next = addCmd(prev, c, cfg.maxCmds)
      playSound(next === prev ? 'wrong' : 'click')
      planRef.current = next
      setPlan(next)
    },
    [cfg.maxCmds],
  )
  const removeAt = (i: number) => {
    playSound('click')
    setPlan((p) => p.filter((_, k) => k !== i))
  }
  const turnStep = cfg.turn90Only ? 2 : 1

  const send = useCallback(() => {
    const sim = simRef.current
    if (phaseRef.current !== 'plan' || !sim.earthKnowsIdle || planRef.current.length === 0) return
    primeAudio()
    playSound('unlock')
    sendUplink(sim, planRef.current, rules)
    addLog(`📡 Plan ${sim.uplinks.length} sent: ${planRef.current.length} command${planRef.current.length > 1 ? 's' : ''}. It reaches Mars in ${cfg.delay} min.`, 'info')
    mapChoice[tier] = mapNo
    setPlan([])
    setPhase('live')
  }, [rules, addLog, cfg.delay, tier, mapNo])

  const endSol = () => {
    primeAudio()
    endSolRef.current = true
    setEndingSol(true)
    setPhase('live')
    addLog('🌇 Ending the sol: waiting for the last relay pass and its data…', 'info')
  }

  // Phones: pin the map while planning or watching; release it for the
  // debrief, and once the game has scrolled away (the article below).
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px) and (min-height: 600px)')
    let raf = 0
    const check = () => {
      raf = 0
      const slot = slotRef.current
      const col = colRef.current
      const root = rootRef.current
      if (!slot || !col || !root) return
      const colH = col.offsetHeight
      const top = slot.getBoundingClientRect().top
      const bottom = root.getBoundingClientRect().bottom
      // The kids header is sticky: pin the map under it, not over it.
      const nav = document.querySelector('.kids-nav')
      const headerBottom = Math.max(0, Math.round(nav ? nav.getBoundingClientRect().bottom : 0))
      const want = mq.matches && phase !== 'over' && top < headerBottom && bottom > headerBottom + colH + 120
      setPinTop(headerBottom)
      setPinH(want ? Math.max(slot.offsetHeight, colH) : 0)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check)
    }
    check()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [phase])

  // Keyboard: arrows build the plan, Enter sends.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const el = e.target instanceof HTMLElement ? e.target : null
      if (document.querySelector('[role="dialog"]')) return
      if (phaseRef.current !== 'plan') return
      if (el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable)) return
      // Only while the child is in the game: focus inside it, or the map on
      // screen. Reading the article below must scroll, not add drives.
      const inGame = !!el && !!rootRef.current?.contains(el)
      if (!inGame && !onScreenRef.current) return
      // Buttons, links and switches use Enter and Space themselves.
      if ((e.key === 'Enter' || e.key === ' ') && isInteractive(el)) return
      if (e.key === 'ArrowUp') add({ k: 'fwd', n: 1 })
      else if (e.key === 'ArrowLeft') add({ k: 'turn', d: -turnStep })
      else if (e.key === 'ArrowRight') add({ k: 'turn', d: turnStep })
      else if (e.key === 's' || e.key === 'S') add({ k: 'sci' })
      else if ((e.key === 'p' || e.key === 'P') && cfg.legend) add({ k: 'photo' })
      else if (e.key === 'Backspace') {
        setPlan((p) => p.slice(0, -1))
        playSound('click')
      } else if (e.key === 'Enter') send()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [add, send, turnStep, cfg.legend])

  const sim = simRef.current
  const started = sim.uplinks.length > 0
  const lines = legendStarLines(mapNo)
  const brief = cfg.legend ? `${BRIEF[tier]} On this map ★ = ${lines.s1}, ★★ = ${lines.s2}, ★★★ = ${lines.s3} points.` : BRIEF[tier]
  const timeNote = `Time is sped up: 1 second here = ${cfg.minPerSec} Mars minutes. A real one-way signal takes about 3 to 22 minutes, depending on where Earth and Mars are in their orbits. 1 square = ${CELL_M} m.`

  const btn =
    'inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.09] to-white/[0.03] px-3 font-black text-white transition hover:border-white/25 active:scale-[.97] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

  return (
    <div ref={rootRef} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* ── map ── On phones the map is pinned to the top of the screen while
          the child builds the plan below it, so the orange preview line stays
          in sight. It pins with position: fixed under the sticky kids header and
          leaves a slot the same height, so nothing below jumps. */}
      <div ref={slotRef} className="min-w-0 lg:self-start" style={pinH ? { height: pinH } : undefined}>
        <div
          ref={colRef}
          className={`flex min-w-0 flex-col gap-1.5 ${pinH ? 'fixed inset-x-0 z-20 border-b border-white/10 bg-[#0B1020]/95 px-3 pb-1.5 pt-1.5 shadow-[0_8px_24px_rgba(0,0,0,.5)]' : ''}`}
          style={pinH ? { top: pinTop } : undefined}
        >
          <div ref={wrapRef} data-game-stage="" className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a1120] shadow-[0_8px_24px_rgba(0,0,0,.45)]">
            <canvas
              ref={canvasRef}
              className={canvasW ? 'mx-auto block' : 'block w-full'}
              style={canvasW ? { height: canvasH, width: canvasW } : { height: canvasH }}
              role="img"
              aria-label={`Map of Mars, ${map.W * CELL_M} by ${map.H * CELL_M} metres. Rover at the landing site, ${map.targets.length} science target${map.targets.length > 1 ? 's' : ''}.`}
            />
            {paused && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-lg font-black text-white">Paused — come back to the tab</div>
            )}
          </div>
          <ClockBar store={hudStore} sim={sim} cfg={cfg} speed={speed} onSpeed={() => setSpeed((s) => (s === 1 ? 4 : 1))} />
          <p className="hidden px-1 text-xs text-[#6E7888] lg:block">{timeNote}</p>
        </div>
      </div>

      {/* ── mission control ── */}
      <div className="flex min-w-0 flex-col gap-3">
        <section className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4">
          <h2 className="font-display text-lg font-black text-white">
            {cfg.name} mission <span className="text-sm font-bold text-[#A7B0C0]">· map {mapNo + 1}/{MAPS_PER_TIER}</span>
          </h2>
          <p className="mt-1 text-[15px] leading-snug text-[#EEF2F8]">{brief}</p>
          <StatusLine store={hudStore} phase={phase} started={started} endingSol={endingSol} stuck={stuck} delay={cfg.delay} />
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#A7B0C0]">
            <MissionStats store={hudStore} legend={cfg.legend} />
            {!started && phase === 'plan' && (
              <button
                type="button"
                className="ml-auto min-h-[44px] rounded-xl border border-white/15 bg-white/5 px-3 font-bold text-white hover:bg-white/10"
                onClick={() => {
                  const n = (mapNo + 1) % MAPS_PER_TIER
                  mapChoice[tier] = n
                  setMapNo(n)
                  playSound('click')
                }}
              >
                🗺️ New terrain
              </button>
            )}
          </div>
        </section>

        {phase !== 'over' && (
          <section className="rounded-[20px] border border-white/10 bg-[#111C32] p-4" aria-label="Command builder">
            <h3 className="font-display font-black text-white">Build the plan</h3>
            <div className="mt-2 grid grid-cols-[auto_1fr] items-center gap-2">
              <div className="flex items-center rounded-2xl border border-white/10 bg-[#0a1120]">
                <button type="button" aria-label="Fewer squares" className="h-12 w-11 text-xl font-black text-white disabled:opacity-30" disabled={driveN <= 1} onClick={() => setDriveN((n) => Math.max(1, n - 1))}>
                  −
                </button>
                <span className="w-7 text-center font-display text-xl font-black tabular-nums text-white" aria-live="polite">
                  {driveN}
                </span>
                <button type="button" aria-label="More squares" className="h-12 w-11 text-xl font-black text-white disabled:opacity-30" disabled={driveN >= 9} onClick={() => setDriveN((n) => Math.min(9, n + 1))}>
                  +
                </button>
              </div>
              <button type="button" className={`${btn} bg-amber-500/20`} disabled={!canEdit} onClick={() => add({ k: 'fwd', n: driveN })}>
                ▲ Drive {driveN} square{driveN > 1 ? 's' : ''} <span className="text-xs font-bold text-[#A7B0C0]">({driveN * CELL_M} m)</span>
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" className={btn} disabled={!canEdit} onClick={() => add({ k: 'turn', d: -turnStep })}>
                ↺ Left {turnStep * 45}°
              </button>
              <button type="button" className={btn} disabled={!canEdit} onClick={() => add({ k: 'turn', d: turnStep })}>
                ↻ Right {turnStep * 45}°
              </button>
              <button type="button" className={btn} disabled={!canEdit} onClick={() => add({ k: 'sci' })}>
                🔬 Science
              </button>
              {cfg.legend ? (
                <button type="button" className={btn} disabled={!canEdit} onClick={() => add({ k: 'photo' })}>
                  📷 Photo <span className="text-xs text-[#A7B0C0]">20 MB</span>
                </button>
              ) : (
                <button
                  type="button"
                  className={btn}
                  disabled={!canEdit || plan.length === 0}
                  onClick={() => {
                    setPlan((p) => p.slice(0, -1))
                    playSound('click')
                  }}
                >
                  ⌫ Undo
                </button>
              )}
            </div>
            {cfg.legend && (
              <div className="mt-2">
                <p className="text-xs font-bold uppercase tracking-wide text-[#A7B0C0]">AutoNav: the rover plans its own route to…</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {map.targets.map((t) => (
                    <button key={t.id} type="button" className={`${btn} min-w-[56px]`} disabled={!canEdit} onClick={() => add({ k: 'goto', target: t.id })} aria-label={`AutoNav to target ${t.id + 1}, ${t.name}, ${t.value} points`}>
                      🧭 <span style={{ color: t.color }}>●</span>
                      {t.id + 1}
                      <span className="text-xs text-[#A7B0C0]">{t.value}</span>
                    </button>
                  ))}
                  <button type="button" className={btn} disabled={!canEdit} onClick={() => add({ k: 'wait', min: 30 })}>
                    ⏳ Wait 30
                  </button>
                  <button
                    type="button"
                    className={btn}
                    disabled={!canEdit || plan.length === 0}
                    onClick={() => {
                      setPlan((p) => p.slice(0, -1))
                      playSound('click')
                    }}
                  >
                    ⌫
                  </button>
                </div>
              </div>
            )}

            <div className="mt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-[#A7B0C0]">
                Plan ({plan.length}/{cfg.maxCmds}) — keys: ↑ drive, ← → turn, S science{cfg.legend ? ', P photo' : ''}, ⌫ undo, Enter send
              </p>
              {plan.length === 0 ? (
                <p className="mt-1 rounded-xl border border-dashed border-white/15 p-3 text-sm text-[#A7B0C0]">
                  The rover faces the way its nose points (➜ east to start). Add drives and turns — the orange line shows where Earth expects it to go.
                </p>
              ) : (
                <ol className="mt-1 flex flex-wrap gap-1.5" aria-label="Command sequence">
                  {plan.map((c, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => removeAt(i)}
                        className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-amber-400/15 px-2.5 font-bold text-amber-200 ring-1 ring-amber-400/30 hover:bg-amber-400/25"
                        aria-label={`Step ${i + 1}: ${cmdSpeak(c)}. Tap to remove.`}
                      >
                        <span className="text-xs text-amber-300/60">{i + 1}</span> {cmdLabel(c, tier)} <span aria-hidden className="text-amber-300/60">×</span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              {preview.issue && plan.length > 0 && <p className="mt-2 rounded-xl bg-red-500/15 px-3 py-2 text-sm font-bold text-red-200">⚠️ {preview.issue}</p>}
              {plan.some((c) => c.k === 'sci') && preview.sciOnTarget.length > 0 && !preview.sciOnTarget.some(Boolean) && !plan.some((c) => c.k === 'goto') && (
                <p className="mt-2 rounded-xl bg-amber-400/10 px-3 py-2 text-sm font-bold text-amber-200">Science is planned, but not on a target square.</p>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={send}
                disabled={!canEdit || plan.length === 0 || !sim.earthKnowsIdle}
                className="min-h-[52px] flex-1 rounded-2xl bg-amber-500 px-4 font-display text-lg font-black text-[#1A1103] shadow-[0_6px_0_#9a3412] transition active:translate-y-1 active:shadow-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
              >
                📡 Send to Mars
              </button>
              {cfg.legend && started && (
                <button type="button" onClick={endSol} disabled={!canEdit} className={`${btn} px-4`}>
                  🌇 End sol
                </button>
              )}
            </div>
          </section>
        )}

        {cfg.rules.length > 0 && phase !== 'over' && (
          <section className="rounded-[20px] border border-white/10 bg-[#111C32] p-4" aria-label="Onboard rules">
            <h3 className="font-display font-black text-white">Onboard rules <span className="text-sm font-bold text-[#A7B0C0]">— run on Mars, no waiting</span></h3>
            <p className="text-xs text-[#A7B0C0]">Rules travel with your next plan.</p>
            <div className="mt-2 flex flex-col gap-2">
              {cfg.rules.map((r) => {
                const on = rules.includes(r)
                const info = RULE_INFO[r]
                return (
                  <button
                    key={r}
                    type="button"
                    role="switch"
                    aria-checked={on}
                    disabled={!canEdit}
                    onClick={() => {
                      playSound('click')
                      setRules((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]))
                    }}
                    className={`flex min-h-[52px] items-start gap-2 rounded-2xl border p-2.5 text-left transition ${on ? 'border-cyan-400/60 bg-cyan-400/10' : 'border-white/10 bg-white/[0.03]'} disabled:opacity-60`}
                  >
                    <span className={`mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition ${on ? 'bg-cyan-400' : 'bg-white/15'}`} aria-hidden>
                      <span className={`h-5 w-5 rounded-full bg-white transition ${on ? 'translate-x-4' : ''}`} />
                    </span>
                    <span>
                      <span className="block font-black text-white">
                        {info.icon} {info.name}
                      </span>
                      <span className="block text-sm leading-snug text-[#A7B0C0]">{info.text}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {phase === 'over' && outcome && (
          <section ref={debriefRef} className="rounded-[20px] border-2 border-amber-400/40 bg-[#111C32] p-4" aria-label="Why it happened">
            <h3 className="font-display text-xl font-black text-white">{outcome.won ? '✅ Mission success' : '❌ Mission not complete'}</h3>
            <p className="mt-1 text-[15px] text-[#EEF2F8]">{outcome.message}</p>
            <h4 className="mt-3 font-black text-amber-300">Why it happened</h4>
            <ul className="mt-1 list-disc space-y-1.5 pl-5 text-[15px] leading-snug text-[#EEF2F8]">
              {outcome.why.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
              <li>
                The <span className="font-bold text-emerald-300">green line</span> on the map is where the rover REALLY drove. The white dotted line is what its wheel-count told Earth.
              </li>
            </ul>
            <p className="mt-3 rounded-xl bg-[#0a1120] p-3 text-sm text-[#A7B0C0]">
              <b className="text-white">Why Perseverance has AutoNav:</b> with up to 44 minutes for a question and answer, a rover that waits for Earth at every rock barely moves. Perseverance looks at the ground,
              builds its own hazard map and picks a safe path while driving, so it can cover hundreds of metres in one day.
            </p>
            <button type="button" onClick={claim} className="mt-3 min-h-[52px] w-full rounded-2xl bg-amber-500 font-display text-lg font-black text-[#1A1103]">
              {outcome.won ? 'Collect my stars →' : 'See results →'}
            </button>
          </section>
        )}

        <section className="rounded-[20px] border border-white/10 bg-[#111C32] p-4" aria-label="Mission log">
          <h3 className="font-display font-black text-white">Messages from Mars</h3>
          {log.length === 0 ? (
            <p className="mt-1 text-sm text-[#A7B0C0]">Nothing yet. News from the rover appears here when it reaches Earth.</p>
          ) : (
            <ul className="mt-1 max-h-56 space-y-1.5 overflow-y-auto pr-1 text-sm" aria-live="polite">
              {log.map((l) => (
                <li
                  key={l.id}
                  className={`rounded-xl px-2.5 py-1.5 ${l.tone === 'good' ? 'bg-emerald-500/10 text-emerald-100' : l.tone === 'bad' ? 'bg-red-500/10 text-red-100' : l.tone === 'pic' ? 'bg-cyan-400/10 text-cyan-100' : 'bg-white/5 text-[#EEF2F8]'}`}
                >
                  <span className="mr-1.5 font-mono text-xs text-[#A7B0C0]">{l.at}</span>
                  {l.text}
                </li>
              ))}
            </ul>
          )}
        </section>
        <p className="px-1 text-xs text-[#6E7888] lg:hidden">{timeNote}</p>
      </div>
    </div>
  )
}
