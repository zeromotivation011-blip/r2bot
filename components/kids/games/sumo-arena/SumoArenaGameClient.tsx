'use client'

// components/kids/games/sumo-arena/SumoArenaGameClient.tsx
// Robo Sumo Arena — the playable game (loaded with next/dynamic, ssr:false).
// The child programs a strategy (a state machine), presses Fight, and watches
// their own robot battle a rival on a real-physics dohyo. Every bout is
// seeded, so the same program always fights the same bout; the debrief says
// why it was won or lost.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { loadDesign, type RobotDesign } from '@/lib/kids/robot-design'
import { loadRapier, type Rapier } from '@/lib/kids/sim/rapier'
import {
  ACTION_TEXT,
  CADET_PRESETS,
  COND_TEXT,
  DEFAULT_ACE,
  DEFAULT_CADET,
  DEFAULT_PILOT,
  PILOT_SEE_CM,
  SENSEI_TACTICS,
  cadetToFsm,
  fsmController,
  roundMemory,
  ruleController,
  senseiTactic,
  type CadetProgram,
  type FsmProgram,
  type PilotProgram,
  type RoundMemory,
  type RuleAction,
  type SenseiTactic,
} from './brain'
import { RIVALS, RIVAL_FSM, boutSeed, buildSetups, rivalMotorMul } from './bouts'
import { debrief, pushAt, type Debrief } from './debrief'
import { DT, EYE_RANGE_CM, MATCH_S, WEIGHT_LIMIT_KG, botStats, createMatch, type BotStats, type Controller, type Match, type MatchResult } from './sim'
import type { SumoScene } from './render'
import { recordGameFrame } from '@/lib/kids/sim/game-recorder'

interface Props {
  tier: number
  onFinish: (r: RoundResult) => void
}

// ── Programs survive "Play again" (the shell remounts the game) ─────────────
interface Loadout {
  drive: RobotDesign['drive']
  wedge: boolean
  ballastKg: number
}
const saved: { cadet: CadetProgram; pilot: PilotProgram; ace: FsmProgram; legend: FsmProgram; loadout: Loadout | null; attempts: number[] } = {
  cadet: DEFAULT_CADET,
  pilot: DEFAULT_PILOT,
  ace: DEFAULT_ACE,
  legend: DEFAULT_ACE,
  loadout: null,
  attempts: [0, 0, 0, 0],
}

type Phase = 'ready' | 'fight' | 'over'

interface SeriesRound {
  tactic: SenseiTactic
  winner: MatchResult['winner']
  t: number
  memory: RoundMemory
  /** The program that fought this round (to check afterwards whether the design change mattered). */
  program: FsmProgram
  round: number
}

const FAST_WIN_S = [10, 12, 15, 15]
const DRIVES: { id: RobotDesign['drive']; name: string }[] = [
  { id: 'wheels2', name: 'Two wheels' },
  { id: 'wheels4', name: 'Four wheels' },
  { id: 'tracks', name: 'Tracks' },
  { id: 'legs', name: 'Legs' },
]

const btn = 'min-h-[44px] rounded-xl border px-3 font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
const chip = (on: boolean) => `${btn} ${on ? 'border-amber-400 bg-amber-400 text-[#1A1103]' : 'border-white/15 bg-white/5 text-white hover:bg-white/10'}`

function Slider(props: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void; disabled?: boolean; hint?: string }) {
  const id = `sl-${props.label.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <div className="mt-2">
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-sm text-[#A7B0C0]">
        <span>{props.label}</span>
        <b className="font-display text-base tabular-nums text-white">
          {props.value}
          {props.unit}
        </b>
      </label>
      <input
        id={id}
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="h-11 w-full cursor-pointer accent-amber-500 disabled:opacity-40"
      />
      {props.hint && <p className="-mt-1 text-xs text-[#6E7888]">{props.hint}</p>}
    </div>
  )
}

function StatRow({ label, you, rival, unit, better }: { label: string; you: number; rival: number; unit: string; better: 'high' | 'low' | 'none' }) {
  const youBetter = better === 'high' ? you > rival + 0.05 : better === 'low' ? you < rival - 0.05 : false
  const rivalBetter = better === 'high' ? rival > you + 0.05 : better === 'low' ? rival < you - 0.05 : false
  return (
    <tr className="border-t border-white/5">
      <th scope="row" className="py-1 pr-2 text-left font-normal text-[#A7B0C0]">
        {label}
      </th>
      <td className={`py-1 text-right tabular-nums ${youBetter ? 'font-black text-emerald-300' : 'text-white'}`}>
        {you.toFixed(you < 10 ? 2 : 1)} {unit}
      </td>
      <td className={`py-1 text-right tabular-nums ${rivalBetter ? 'font-black text-rose-300' : 'text-white'}`}>
        {rival.toFixed(rival < 10 ? 2 : 1)} {unit}
      </td>
    </tr>
  )
}

export default function SumoArenaGameClient({ tier, onFinish }: Props) {
  const rival = RIVALS[tier]
  const [base] = useState<RobotDesign>(() => loadDesign())
  const [cadet, setCadet] = useState<CadetProgram>(saved.cadet)
  const [pilot, setPilot] = useState<PilotProgram>(saved.pilot)
  const [ace, setAce] = useState<FsmProgram>(tier === 3 ? saved.legend : saved.ace)
  const [loadout, setLoadout] = useState<Loadout>(() => saved.loadout ?? { drive: base.drive, wedge: base.tool === 'scoop', ballastKg: 0 })
  const [R, setR] = useState<Rapier | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [phase, setPhase] = useState<Phase>('ready')
  const [speed, setSpeed] = useState<1 | 2>(1)
  const [report, setReport] = useState<Debrief | null>(null)
  const [series, setSeries] = useState<SeriesRound[]>([])
  const [hidden, setHidden] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)

  const wrapRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<SumoScene | null>(null)
  const matchRef = useRef<Match | null>(null)
  const accRef = useRef(0)
  const afterRef = useRef(0)
  const speedRef = useRef<1 | 2>(1)
  const phaseRef = useRef<Phase>('ready')
  const endRef = useRef<(r: MatchResult) => void>(() => undefined)
  /** Pending result-card timers: cleared on unmount so a card never opens over another tier. */
  const timersRef = useRef<number[]>([])
  const later = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms))
  }, [])
  useEffect(
    () => () => {
      for (const id of timersRef.current) window.clearTimeout(id)
      timersRef.current = []
    },
    [],
  )
  const chipYou = useRef<HTMLDivElement>(null)
  const chipRival = useRef<HTMLDivElement>(null)
  const clockRef = useRef<HTMLSpanElement>(null)
  const distRef = useRef<HTMLSpanElement>(null)
  const edgeLRef = useRef<HTMLSpanElement>(null)
  const edgeRRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    speedRef.current = speed
  }, [speed])
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])
  // Keep edits when the shell remounts for "Play again".
  useEffect(() => {
    saved.cadet = cadet
    saved.pilot = pilot
    if (tier === 3) saved.legend = ace
    else saved.ace = ace
    saved.loadout = loadout
  }, [cadet, pilot, ace, loadout, tier])

  // The robot that actually fights: the child's own design (Legend: with their design changes).
  const youDesign = useMemo<RobotDesign>(() => {
    if (tier !== 3) return base
    return { ...base, drive: loadout.drive, tool: loadout.wedge ? 'scoop' : base.tool === 'scoop' ? 'none' : base.tool }
  }, [base, loadout, tier])
  const ballast = tier === 3 ? loadout.ballastKg : 0
  const youStats = useMemo(() => botStats(youDesign, ballast), [youDesign, ballast])
  // Ace's Dodger is weight-class matched: its motors are scaled to your robot (see rivalMotorMul).
  const rivalStats = useMemo(() => botStats(rival.design, rival.ballastKg, rivalMotorMul(tier, youDesign, ballast)), [rival, tier, youDesign, ballast])
  const overWeight = youStats.massKg > WEIGHT_LIMIT_KG + 1e-6

  const youWins = series.filter((s) => s.winner === 'you').length
  const rivalWins = series.filter((s) => s.winner === 'rival').length
  const seriesOver = tier === 3 && (youWins >= 2 || rivalWins >= 2 || series.length >= 5)
  const nextTactic = tier === 3 ? senseiTactic(series.map((s) => ({ tactic: s.tactic, memory: s.memory }))) : undefined
  const roundIdx = series.length

  const buildController = useCallback((): { ctrl: Controller; threshold: number; power: number } => {
    if (tier === 0) return { ctrl: fsmController(cadetToFsm(cadet)), threshold: 50, power: cadet.speed }
    if (tier === 1) return { ctrl: ruleController(pilot), threshold: 50, power: pilot.rules.some((r) => r.action === 'charge') ? 100 : pilot.speed }
    return { ctrl: fsmController(ace), threshold: ace.edgeThreshold, power: ace.charge.speed }
  }, [tier, cadet, pilot, ace])

  const makeMatch = useCallback(
    (rapier: Rapier): Match => {
      const { ctrl, threshold } = buildController()
      return createMatch(
        rapier,
        buildSetups({ tier, seed: boutSeed(tier, tier === 3 ? roundIdx : 0), youDesign, youBallast: ballast, youController: ctrl, youThreshold: threshold, tactic: nextTactic }),
      )
    },
    [buildController, tier, roundIdx, youDesign, ballast, nextTactic],
  )

  // ── Load the physics engine and the 3D scene ───────────────────────────
  useEffect(() => {
    let alive = true
    loadRapier()
      .then((r) => alive && setR(r))
      .catch(() => alive && setLoadError(true))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    let disposed = false
    let scene: SumoScene | null = null
    void import('./render').then(({ createSumoScene }) => {
      if (disposed) return
      scene = createSumoScene(el)
      sceneRef.current = scene
      setSceneReady(true)
      scene.onFrame((dt) => {
        const m = matchRef.current
        if (m && phaseRef.current === 'fight') {
          accRef.current += dt * speedRef.current
          let n = 0
          while (accRef.current >= DT && n < 12) {
            m.step()
            accRef.current -= DT
            n++
            if (m.decided) {
              afterRef.current += DT
              if (afterRef.current > 1.1) {
                accRef.current = 0
                endRef.current(m.result as MatchResult)
                break
              }
            }
          }
          {
            const y = m.view().find((b) => b.id === 'you')
            if (y) recordGameFrame(m.t, { 'Rival distance (cm)': y.distCm, 'Edge left': y.edgeL, 'Edge right': y.edgeR, 'Wheel speed (m/s)': (y.wheel[0] + y.wheel[1]) / 2 })
          }
          scene?.update(m.view())
        }
        // HUD: chips over the robots and the child's sensor readout (written straight to the DOM).
        if (m) {
          const views = m.view()
          for (const [ref, id] of [
            [chipYou, 'you'],
            [chipRival, 'rival'],
          ] as const) {
            const elc = ref.current
            const pos = scene?.screenPos(id)
            const v = views.find((b) => b.id === id)
            if (elc) {
              if (pos && v) {
                elc.style.transform = `translate(${Math.round(pos.x)}px, ${Math.round(pos.y)}px) translate(-50%, -100%)`
                elc.style.opacity = '1'
                const label = elc.querySelector('[data-state]')
                if (label) label.textContent = phaseRef.current === 'ready' ? 'READY' : v.state
              } else elc.style.opacity = '0'
            }
          }
          const y = views.find((b) => b.id === 'you')
          if (clockRef.current) clockRef.current.textContent = `${m.t.toFixed(1)} s`
          if (distRef.current) distRef.current.textContent = y && y.distCm !== null ? `${Math.round(y.distCm)} cm` : '— cm'
          if (edgeLRef.current) edgeLRef.current.dataset.on = y?.edgeL ? '1' : '0'
          if (edgeRRef.current) edgeRRef.current.dataset.on = y?.edgeR ? '1' : '0'
        }
      })
    })
    const onVis = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVis)
      scene?.dispose()
      sceneRef.current = null
      matchRef.current?.dispose()
      matchRef.current = null
    }
  }, [])

  // A preview of the start poses (and the right robots) whenever the bout changes while not fighting.
  useEffect(() => {
    if (!R || !sceneReady || phase !== 'ready') return
    matchRef.current?.dispose()
    const m = makeMatch(R)
    matchRef.current = m
    sceneRef.current?.setRobots(youDesign, rival.design)
    sceneRef.current?.update(m.view())
  }, [R, sceneReady, phase, makeMatch, youDesign, rival.design])

  // ── Results ────────────────────────────────────────────────────────────
  /** The shell's results card is centred over the whole game; on a phone that can be off-screen. */
  const finishAndShow = useCallback(
    (r: RoundResult) => {
      onFinish(r)
      later(() => document.querySelector('[role="dialog"][aria-label="Round results"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60)
    },
    [onFinish, later],
  )

  const finishRound = useCallback(
    (result: MatchResult) => {
      if (phaseRef.current !== 'fight') return
      phaseRef.current = 'over'
      setPhase('over')
      const power = buildController().power
      const tactic = nextTactic
      const rivalFsm = tier === 3 && tactic ? SENSEI_TACTICS[tactic].fsm : RIVAL_FSM[tier]
      const rep = debrief({
        result,
        you: youStats,
        rival: rivalStats,
        rivalName: rival.name,
        youPowerPct: power,
        rivalPowerPct: rivalFsm.charge.speed,
        edgeThreshold: tier >= 2 ? ace.edgeThreshold : undefined,
        backMs: tier >= 2 ? ace.recover.backMs : tier === 1 ? 450 : undefined,
        pushThroughEdge: tier >= 2 ? ace.pushThroughEdge : tier === 0 ? true : false,
        lineAction: tier === 1 ? pilot.rules.find((r) => r.cond === 'line')?.action : undefined,
        tier,
      })
      if (tier === 3 && tactic) {
        rep.reasons.unshift(`${rival.name} used its ${SENSEI_TACTICS[tactic].name.toLowerCase()}: it ${SENSEI_TACTICS[tactic].what}.`)
        if (result.winner !== 'you') rep.tip += ' The Design bay can help too: compare your real push with its push, and remember two wedges cancel out.'
      }
      setReport(rep)
      const won = result.winner === 'you'
      playSound(won ? 'correct' : 'wrong')

      if (tier !== 3) {
        saved.attempts[tier] += 1
        if (!won) return
        const yl = result.logs.you
        const fast = result.t <= FAST_WIN_S[tier]
        const clean = yl.pushedBackM < 0.05 && yl.liftedS < 0.3
        // Pilot: a win with an unsafe line card is a lucky win. It counts, but earns one star and no badge.
        const unsafeLine = tier === 1 && !pilot.rules.some((r) => r.cond === 'line' && r.action === 'backturn')
        const stars = unsafeLine ? 1 : 1 + (fast ? 1 : 0) + (clean ? 1 : 0)
        const badges: string[] = []
        if (tier === 1 && !unsafeLine) badges.push('decision-maker')
        if (tier === 2) badges.push('decision-maker')
        const attempts = saved.attempts[tier]
        saved.attempts[tier] = 0
        const message = unsafeLine
          ? 'A lucky win: your line card still does not back away from the edge. Change it to “back up and turn” for the full three stars.'
          : `${rep.reasons[0] ?? ''}${fast ? '' : ` Win in under ${FAST_WIN_S[tier]} s for another star.`}${clean ? '' : ' Win without being shoved back for another star.'}`
        later(
          () =>
            finishAndShow({
              stars,
              score: Math.round(result.t * 10) / 10,
              scoreLabel: 's to win',
              lowerIsBetter: true,
              message,
              badges,
              attempts,
            }),
          1400,
        )
        return
      }
      // Legend: best of three against the adaptive bot.
      const round: SeriesRound = { tactic: tactic ?? 'wedge-rush', winner: result.winner, t: result.t, memory: roundMemory(result), program: ace, round: roundIdx }
      const next = [...series, round]
      setSeries(next)
      const yw = next.filter((s) => s.winner === 'you').length
      const rw = next.filter((s) => s.winner === 'rival').length
      if (yw >= 2) {
        // "The right tool" only when the design change actually won it: re-fight each round you won,
        // same program and same bout, with your original robot. If it loses any of them, the change mattered.
        const changed = loadout.drive !== base.drive || loadout.wedge !== (base.tool === 'scoop') || loadout.ballastKg > 0
        const designMattered =
          changed &&
          !!R &&
          next.some((s) => {
            if (s.winner !== 'you') return false
            const m = createMatch(
              R,
              buildSetups({ tier: 3, seed: boutSeed(3, s.round), youDesign: base, youBallast: 0, youController: fsmController(s.program), youThreshold: s.program.edgeThreshold, tactic: s.tactic }),
            )
            const w = m.runToEnd().winner
            m.dispose()
            return w !== 'you'
          })
        const badges = ['decision-maker', ...(designMattered ? ['right-tool'] : [])]
        // Series points: 100 per round won, −30 per round lost, minus the seconds your wins took.
        const winSeconds = next.reduce((a, s) => a + (s.winner === 'you' ? s.t : 0), 0)
        saved.attempts[3] += 1
        const attempts = saved.attempts[3]
        saved.attempts[3] = 0
        later(
          () =>
            finishAndShow({
              stars: rw === 0 ? 3 : 2,
              score: yw * 100 - rw * 30 - Math.round(winSeconds),
              scoreLabel: 'series points',
              message: `You beat ${rival.name} ${yw}–${rw}. ${designMattered ? 'Your design changes paid off: your original robot would have lost with the same program. ' : changed ? 'Your program won it; your original robot would have won too. ' : ''}${rw === 0 ? '' : 'Win 2–0 for the third star.'}`,
              badges,
              attempts,
            }),
          1600,
        )
      } else if (rw >= 2 || next.length >= 5) saved.attempts[3] += 1
    },
    [R, ace, base, buildController, finishAndShow, later, loadout, nextTactic, pilot, rival.name, rivalStats, roundIdx, series, tier, youStats],
  )
  useEffect(() => {
    endRef.current = finishRound
  }, [finishRound])

  const fight = () => {
    if (!R || overWeight || seriesOver) return
    primeAudio()
    playSound('click')
    matchRef.current?.dispose()
    const m = makeMatch(R)
    matchRef.current = m
    sceneRef.current?.setRobots(youDesign, rival.design)
    accRef.current = 0
    afterRef.current = 0
    setReport(null)
    phaseRef.current = 'fight'
    setPhase('fight')
    wrapRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  const skip = () => {
    const m = matchRef.current
    if (!m || phaseRef.current !== 'fight') return
    const r = m.runToEnd()
    for (let i = 0; i < 60; i++) m.step()
    sceneRef.current?.update(m.view())
    finishRound(r)
  }

  const editAgain = () => {
    phaseRef.current = 'ready'
    setPhase('ready')
  }

  const newSeries = () => {
    setSeries([])
    setReport(null)
    phaseRef.current = 'ready'
    setPhase('ready')
  }

  const editing = phase !== 'fight'
  const fightLabel = tier === 3 ? (seriesOver ? 'Series over' : `Fight round ${roundIdx + 1}`) : phase === 'over' ? 'Fight again' : 'Fight!'

  // ── Editors ────────────────────────────────────────────────────────────
  const cadetEditor = (
    <section className="rounded-[20px] border border-white/10 bg-[#111C32] p-4" aria-label="Pick a behaviour">
      <h3 className="font-display font-black text-white">1. Pick a behaviour</h3>
      <div className="mt-2 grid gap-2" role="radiogroup" aria-label="Behaviour">
        {CADET_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={cadet.preset === p.id}
            disabled={!editing}
            onClick={() => setCadet((c) => ({ ...c, preset: p.id }))}
            className={`flex min-h-[56px] items-start gap-3 rounded-2xl border p-3 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${cadet.preset === p.id ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'}`}
          >
            <span className="text-2xl" aria-hidden>
              {p.icon}
            </span>
            <span className="flex-1">
              <b className="flex items-center gap-2 text-white">
                {p.name}
                {cadet.preset === p.id && <span className="rounded-full bg-amber-400 px-2 text-xs font-black text-[#1A1103]">Chosen</span>}
              </b>
              <span className="text-sm text-[#A7B0C0]">{p.what}</span>
            </span>
          </button>
        ))}
      </div>
      <h3 className="mt-4 font-display font-black text-white">2. Tune the power</h3>
      <Slider label="Motor power" value={cadet.speed} min={30} max={100} step={10} unit="%" disabled={!editing} onChange={(v) => setCadet((c) => ({ ...c, speed: v }))} hint="More power = a harder push and a faster robot." />
    </section>
  )

  const moveRule = (i: number, d: -1 | 1) =>
    setPilot((p) => {
      const rules = [...p.rules]
      const j = i + d
      if (j < 0 || j >= rules.length - 1) return p
      ;[rules[i], rules[j]] = [rules[j], rules[i]]
      return { ...p, rules }
    })
  const pilotEditor = (
    <section className="rounded-[20px] border border-white/10 bg-[#111C32] p-4" aria-label="Rule cards">
      <h3 className="font-display font-black text-white">Rule cards</h3>
      <p className="text-sm text-[#A7B0C0]">Your robot checks the cards from the top, many times a second. The first card whose IF is true wins.</p>
      <ol className="mt-2 space-y-2">
        {pilot.rules.map((r, i) => (
          <li key={r.cond} className="rounded-2xl border border-white/10 bg-[#0A1120] p-3">
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-black text-amber-300">{r.cond === 'always' ? 'OTHERWISE' : `IF #${i + 1}`}</span>
              <span className="text-sm text-[#EEF2F8]">{COND_TEXT[r.cond]}</span>
              {r.cond !== 'always' && (
                <span className="ml-auto flex gap-1">
                  <button type="button" aria-label="Move card up" disabled={!editing || i === 0} onClick={() => moveRule(i, -1)} className={`${btn} min-w-[44px] border-white/15 bg-white/5 text-white disabled:opacity-30`}>
                    ↑
                  </button>
                  <button type="button" aria-label="Move card down" disabled={!editing || i >= pilot.rules.length - 2} onClick={() => moveRule(i, 1)} className={`${btn} min-w-[44px] border-white/15 bg-white/5 text-white disabled:opacity-30`}>
                    ↓
                  </button>
                </span>
              )}
            </div>
            <label className="mt-2 flex items-center gap-2 text-sm text-[#A7B0C0]">
              <span className="font-display font-black text-cyan-300">THEN</span>
              <select
                value={r.action}
                disabled={!editing}
                onChange={(e) => {
                  const action = e.target.value as RuleAction
                  setPilot((p) => ({ ...p, rules: p.rules.map((x) => (x.cond === r.cond ? { ...x, action } : x)) }))
                }}
                className="min-h-[44px] flex-1 rounded-xl border border-white/15 bg-[#19263F] px-2 font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
              >
                {(Object.keys(ACTION_TEXT) as RuleAction[]).map((a) => (
                  <option key={a} value={a}>
                    {ACTION_TEXT[a]}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ol>
      <Slider label="Driving power (spin, creep, back up)" value={pilot.speed} min={30} max={100} step={10} unit="%" disabled={!editing} onChange={(v) => setPilot((p) => ({ ...p, speed: v }))} hint="“Charge” always uses full power." />
    </section>
  )

  const setA = (f: (p: FsmProgram) => FsmProgram) => setAce((p) => f(p))
  const aceEditor = (
    <section className="rounded-[20px] border border-white/10 bg-[#111C32] p-4" aria-label="State machine">
      <h3 className="font-display font-black text-white">State machine</h3>
      <div className="mt-2 rounded-2xl border border-cyan-400/30 bg-[#0A1120] p-3">
        <p className="font-display font-black text-cyan-300">SEARCH</p>
        <div className="mt-1 flex flex-wrap gap-2" role="radiogroup" aria-label="Search move">
          {(['spin', 'arc', 'straight', 'wait'] as const).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={ace.search.mode === m} disabled={!editing} onClick={() => setA((p) => ({ ...p, search: { ...p.search, mode: m } }))} className={chip(ace.search.mode === m)}>
              {m === 'spin' ? 'Spin' : m === 'arc' ? 'Arc' : m === 'straight' ? 'Straight' : 'Wait'}
            </button>
          ))}
          <button type="button" disabled={!editing} onClick={() => setA((p) => ({ ...p, search: { ...p.search, dir: p.search.dir === 1 ? -1 : 1 } }))} className={chip(false)} aria-label={`Turn direction: ${ace.search.dir === 1 ? 'right' : 'left'}`}>
            Turn {ace.search.dir === 1 ? 'right ↻' : 'left ↺'}
          </button>
        </div>
        <Slider label="Search power" value={ace.search.speed} min={20} max={100} step={5} unit="%" disabled={!editing} onChange={(v) => setA((p) => ({ ...p, search: { ...p.search, speed: v } }))} />
        <p className="mt-2 text-sm text-[#EEF2F8]">
          → <b className="text-amber-300">CHARGE</b> when the distance sensor reads less than:
        </p>
        <Slider label="Sight threshold" value={ace.seeCm} min={10} max={EYE_RANGE_CM} step={5} unit=" cm" disabled={!editing} onChange={(v) => setA((p) => ({ ...p, seeCm: v }))} hint={`The sensor reaches ${EYE_RANGE_CM} cm. The ring is 154 cm across.`} />
      </div>
      <div className="mt-2 rounded-2xl border border-amber-400/30 bg-[#0A1120] p-3">
        <p className="font-display font-black text-amber-300">CHARGE</p>
        <Slider label="Charge power" value={ace.charge.speed} min={30} max={100} step={5} unit="%" disabled={!editing} onChange={(v) => setA((p) => ({ ...p, charge: { speed: v } }))} />
        <Slider label="→ SEARCH after losing sight for" value={ace.lostMs} min={0} max={1500} step={50} unit=" ms" disabled={!editing} onChange={(v) => setA((p) => ({ ...p, lostMs: v }))} hint="A dodging rival slips out of the beam for a moment." />
        <label className="mt-2 flex min-h-[44px] items-center gap-3 text-sm text-[#EEF2F8]">
          <input type="checkbox" checked={ace.pushThroughEdge} disabled={!editing} onChange={(e) => setA((p) => ({ ...p, pushThroughEdge: e.target.checked }))} className="h-6 w-6 accent-amber-500" />
          Keep pushing at the edge when the rival is on my nose (closer than 12 cm)
        </label>
      </div>
      <div className="mt-2 rounded-2xl border border-rose-400/30 bg-[#0A1120] p-3">
        <p className="font-display font-black text-rose-300">RECOVER</p>
        <p className="text-sm text-[#EEF2F8]">Entered from any state when an edge sensor reads at least:</p>
        <Slider label="Edge threshold" value={ace.edgeThreshold} min={10} max={100} step={5} unit="" disabled={!editing} onChange={(v) => setA((p) => ({ ...p, edgeThreshold: v }))} hint="Black ring reflects about 8, the white line about 92." />
        <Slider label="Back up for" value={ace.recover.backMs} min={100} max={1200} step={50} unit=" ms" disabled={!editing} onChange={(v) => setA((p) => ({ ...p, recover: { ...p.recover, backMs: v } }))} />
        <Slider label="Then turn for" value={ace.recover.turnMs} min={100} max={1200} step={50} unit=" ms" disabled={!editing} onChange={(v) => setA((p) => ({ ...p, recover: { ...p.recover, turnMs: v } }))} />
        <Slider label="Recover power" value={ace.recover.speed} min={30} max={100} step={5} unit="%" disabled={!editing} onChange={(v) => setA((p) => ({ ...p, recover: { ...p.recover, speed: v } }))} />
        <p className="mt-1 text-sm text-[#A7B0C0]">→ back to SEARCH (or CHARGE if the rival is in sight).</p>
      </div>
    </section>
  )

  const designBay = (
    <section className="rounded-[20px] border border-white/10 bg-[#111C32] p-4" aria-label="Design bay">
      <h3 className="font-display font-black text-white">Design bay: trade-offs</h3>
      <p className="text-sm text-[#A7B0C0]">
        Changes here are for this tournament only. Weight limit {WEIGHT_LIMIT_KG} kg.
      </p>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Drive">
        {DRIVES.map((d) => (
          <button key={d.id} type="button" role="radio" aria-checked={loadout.drive === d.id} disabled={!editing} onClick={() => setLoadout((l) => ({ ...l, drive: d.id }))} className={chip(loadout.drive === d.id)}>
            {d.name}
          </button>
        ))}
      </div>
      <label className="mt-2 flex min-h-[44px] items-center gap-3 text-sm text-[#EEF2F8]">
        <input type="checkbox" checked={loadout.wedge} disabled={!editing} onChange={(e) => setLoadout((l) => ({ ...l, wedge: e.target.checked }))} className="h-6 w-6 accent-amber-500" />
        Fit the Scoop as a sumo wedge (+0.18 kg)
      </label>
      <Slider label="Ballast weight" value={loadout.ballastKg} min={0} max={0.8} step={0.1} unit=" kg" disabled={!editing} onChange={(v) => setLoadout((l) => ({ ...l, ballastKg: Math.round(v * 10) / 10 }))} hint="Heavier = more grip, but slower to speed up." />
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-[#6E7888]">
            <th scope="col" className="text-left font-normal">
              Physics
            </th>
            <th scope="col" className="text-right font-bold text-white">
              You
            </th>
            <th scope="col" className="text-right font-bold text-white">
              {rival.name}
            </th>
          </tr>
        </thead>
        <tbody>
          <StatRow label="Mass" you={youStats.massKg} rival={rivalStats.massKg} unit="kg" better="none" />
          <StatRow label="Motor push" you={youStats.motorN} rival={rivalStats.motorN} unit="N" better="high" />
          <StatRow label="Grip limit" you={youStats.gripN} rival={rivalStats.gripN} unit="N" better="high" />
          <StatRow label="Real push" you={youStats.pushN} rival={rivalStats.pushN} unit="N" better="high" />
          <StatRow label="Top speed" you={youStats.topSpeed} rival={rivalStats.topSpeed} unit="m/s" better="high" />
          <StatRow label="Pick-up" you={youStats.accel} rival={rivalStats.accel} unit="m/s²" better="high" />
        </tbody>
      </table>
      <p className="mt-2 text-xs text-[#A7B0C0]">
        Your push is limited by your <b className="text-white">{youStats.limitedBy === 'motor' ? 'motors' : 'grip'}</b>
        {youStats.limitedBy === 'motor' ? ': extra weight will not push harder, it only slows you down.' : ': your wheels would spin first, so a little more weight pushes harder.'}
        {youStats.wedge ? ' Your wedge lifts a rival it meets front-first.' : ''}
      </p>
      {overWeight && (
        <p className="mt-2 rounded-xl bg-rose-500/15 p-2 text-sm font-bold text-rose-200" role="alert">
          {youStats.massKg.toFixed(2)} kg is over the {WEIGHT_LIMIT_KG} kg limit. Take some ballast off.
        </p>
      )}
    </section>
  )

  const goal = [
    'Push Bumbles out of the ring. Pick a behaviour and enough power.',
    'You start at the white line, back to back with Twister. Fix the rule cards so your robot never drives off the edge, and backs away when it is pushed there.',
    'Dodger starts behind you and shoves you toward the edge at the bell. Set the edge threshold so your robot feels the line, and tune the RECOVER timings to escape and win.',
    `Best of three against Sensei. It learns from every round. Tune your machine and your robot’s design.`,
  ][tier]

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-2">
        <div data-game-stage="" className="kids-stage-fill relative h-[300px] overflow-hidden rounded-3xl border border-white/10 bg-[#0A1120] shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:h-[420px] lg:h-[470px]">
          <div ref={wrapRef} className="absolute inset-0" aria-label={`Sumo ring: your robot ${youDesign.name} against ${rival.name}`} role="img" />
          {/* State chips that follow the robots */}
          <div ref={chipYou} className="pointer-events-none absolute left-0 top-0 rounded-full border border-amber-300/60 bg-[#0A1120]/85 px-2 py-0.5 text-xs font-black text-amber-200 opacity-0" aria-hidden>
            {youDesign.name}: <span data-state>READY</span>
          </div>
          <div ref={chipRival} className="pointer-events-none absolute left-0 top-0 rounded-full border border-rose-300/60 bg-[#0A1120]/85 px-2 py-0.5 text-xs font-black text-rose-200 opacity-0" aria-hidden>
            {rival.name}: <span data-state>READY</span>
          </div>
          <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap items-center gap-2 rounded-xl bg-[#0A1120]/80 px-2 py-1 text-xs text-[#A7B0C0]">
            <span ref={clockRef} className="font-display text-sm font-black tabular-nums text-white">
              0.0 s
            </span>
            <span>/ {MATCH_S} s</span>
            <span className="text-cyan-300">
              eye <b ref={distRef} className="tabular-nums text-white">— cm</b>
            </span>
            <span className="flex items-center gap-1">
              edge
              <span ref={edgeLRef} data-on="0" className="inline-block h-3 w-3 rounded-full bg-white/15 data-[on='1']:bg-amber-500" aria-hidden />
              <span ref={edgeRRef} data-on="0" className="inline-block h-3 w-3 rounded-full bg-white/15 data-[on='1']:bg-amber-500" aria-hidden />
            </span>
          </div>
          {tier === 3 && (
            <div className="pointer-events-none absolute right-2 top-2 rounded-xl bg-[#0A1120]/80 px-2 py-1 font-display text-sm font-black text-white" aria-label={`Series: you ${youWins}, ${rival.name} ${rivalWins}`}>
              You {youWins} – {rivalWins} {rival.name}
            </div>
          )}
          {!R && !loadError && <p className="absolute inset-x-0 bottom-3 text-center text-sm font-bold text-[#A7B0C0]">Warming up the physics engine…</p>}
          {loadError && (
            <p className="absolute inset-x-3 bottom-3 rounded-xl bg-rose-500/20 p-2 text-center text-sm font-bold text-rose-100" role="alert">
              The physics engine could not load. Check your connection and reload the page.
            </p>
          )}
          {hidden && phase === 'fight' && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-lg font-black text-white">Paused — come back to the tab</div>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fight}
            disabled={!R || phase === 'fight' || overWeight || seriesOver}
            className="min-h-[52px] flex-1 whitespace-nowrap rounded-2xl bg-amber-500 px-5 font-display text-lg font-black text-[#1A1103] shadow-[0_8px_24px_rgba(0,0,0,.45)] transition-transform hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-[.97] disabled:opacity-40 sm:flex-none"
          >
            {fightLabel}
          </button>
          <div className="flex rounded-xl border border-white/15 bg-white/5 p-1" role="radiogroup" aria-label="Replay speed">
            {([1, 2] as const).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={speed === s} onClick={() => setSpeed(s)} className={`min-h-[44px] min-w-[44px] rounded-lg px-2 font-black ${speed === s ? 'bg-amber-400 text-[#1A1103]' : 'text-white/70 hover:text-white'}`}>
                {s}×
              </button>
            ))}
          </div>
          <button type="button" onClick={skip} disabled={phase !== 'fight'} aria-label="Skip to result" className={`${btn} border-white/15 bg-white/5 text-white disabled:opacity-30`}>
            Skip ⏭
          </button>
          {phase === 'over' && tier !== 3 && (
            <button type="button" onClick={editAgain} className={`${btn} border-white/15 bg-white/5 text-white`}>
              Reset ring
            </button>
          )}
        </div>

        {report && (
          <section
            className={`rounded-[20px] border p-4 ${report.tone === 'win' ? 'border-emerald-400/40 bg-emerald-500/10' : report.tone === 'draw' ? 'border-white/15 bg-white/5' : 'border-rose-400/40 bg-rose-500/10'}`}
            aria-live="polite"
          >
            <h3 className="font-display text-xl font-black text-white">{report.headline}</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-[#EEF2F8]">
              {report.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-[#A7B0C0]">
              <b className="text-amber-300">Try next: </b>
              {report.tip}
            </p>
            {tier === 3 && !seriesOver && phase === 'over' && (
              <button type="button" onClick={editAgain} className="mt-3 min-h-[48px] rounded-2xl bg-amber-500 px-5 font-black text-[#1A1103] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
                Next round — {rival.name} is adapting
              </button>
            )}
            {tier === 3 && seriesOver && youWins < 2 && (
              <div className="mt-3">
                <p className="font-bold text-white">{rivalWins >= 2 ? `${rival.name} wins the series ${rivalWins}–${youWins}.` : 'Five rounds and no winner — the series is a draw.'}</p>
                <button type="button" onClick={newSeries} className="mt-2 min-h-[48px] rounded-2xl bg-amber-500 px-5 font-black text-[#1A1103] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">
                  New series
                </button>
              </div>
            )}
          </section>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <section className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4">
          <h2 className="font-display text-lg font-black text-white">
            Bout #{boutSeed(tier, tier === 3 ? (seriesOver ? Math.max(0, roundIdx - 1) : roundIdx) : 0)} <span className="text-sm font-bold text-[#A7B0C0]">vs {rival.name}</span>
          </h2>
          <p className="mt-1 text-[15px] leading-snug text-[#EEF2F8]">{goal}</p>
          <p className="mt-2 text-sm text-[#A7B0C0]">{rival.blurb}</p>
          <p className="mt-2 text-sm text-[#A7B0C0]">
            Your robot: <b className="text-white">{youDesign.name}</b> · {youStats.massKg.toFixed(2)} kg · pushes up to {pushAt(youStats, 100).toFixed(1)} N. Sumo kit fitted: a front distance sensor ({EYE_RANGE_CM} cm) and two edge sensors.
          </p>
          {tier === 1 && <p className="mt-2 text-sm text-[#A7B0C0]">“The rival is ahead” means the distance sensor reads less than {PILOT_SEE_CM} cm.</p>}
          {tier === 3 && seriesOver && youWins >= 2 && <p className="mt-2 font-bold text-emerald-300">Series won!</p>}
        </section>
        {tier === 0 && cadetEditor}
        {tier === 1 && pilotEditor}
        {tier === 3 && designBay}
        {tier >= 2 && aceEditor}
      </div>
    </div>
  )
}
