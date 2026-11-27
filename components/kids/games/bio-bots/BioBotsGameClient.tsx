'use client'

// components/kids/games/bio-bots/BioBotsGameClient.tsx
// Bio-Bot Lab, all four tiers. Every result comes from model.ts — the
// support polygon, the wall friction, lift vs weight, cost of transport — and
// every test ends with a debrief that says WHY it happened.
//   Cadet  — match the animal trick to the challenge and watch it work.
//   Pilot  — tune one parameter at three stations (duty factor, wave, flap rate).
//   Ace    — combine modules for three missions on one 7 Wh battery.
//   Legend — practise, pass a final test on never-seen courses, then explain.

import { useCallback, useMemo, useRef, useState } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { playSound } from '@/lib/kids-audio'
import { CadetScene } from './BotArtClient'
import { CourseStrip } from './CourseArtClient'
import { FlapView, QuadSideView, QuadTopView, SnakeView, quadFrame } from './PilotArtClient'
import {
  ACE_BATTERY_J,
  ACE_MISSIONS,
  AUTO_SENSOR_KG,
  BATTERIES,
  CADET_CHALLENGES,
  FLAP,
  LEGEND_BATTERIES,
  LEGEND_COURSES,
  LEGEND_MIX,
  LEGEND_QUESTIONS,
  LEGEND_TIME_S,
  MODULE_IDS,
  QUAD,
  SNAKE,
  TERRAINS,
  TRICKS,
  cadetTry,
  designMass,
  fmtKj,
  fmtTime,
  legendCourses,
  runCourse,
  runFlap,
  runLegend,
  runQuad,
  runSnake,
  shuffled,
  type CadetOutcome,
  type CourseResult,
  type Design,
  type Gait,
  type ModuleId,
  type TrickId,
} from './model'
import { useClock, useRun } from './useAnim'

type Finish = (r: RoundResult) => void

/**
 * On a phone the animated view sits above the controls, so a test started from
 * the controls would play off-screen. Bring the view into sight when it starts.
 */
function useShowView<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const show = useCallback(() => {
    const el = ref.current
    if (!el || typeof window === 'undefined') return
    if (window.matchMedia('(min-width: 1024px)').matches) return
    const r = el.getBoundingClientRect()
    if (r.top >= 0 && r.bottom <= window.innerHeight) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [])
  return [ref, show] as const
}

const BTN =
  'inline-flex min-h-[48px] items-center justify-center rounded-2xl px-5 font-display text-base font-black transition motion-safe:duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-40'
const PRIMARY = `${BTN} bg-amber-500 text-[#1A1103] hover:bg-amber-400`
const GHOST = `${BTN} border border-white/15 bg-white/5 text-[#EEF2F8] hover:border-white/30 hover:bg-white/10`
const CARD = 'rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)]'

function Debrief({ ok, title, children }: { ok: boolean; title: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className={`rounded-2xl border p-4 ${ok ? 'border-green-500/40 bg-green-500/10' : 'border-amber-400/40 bg-amber-500/10'}`}>
      <p className={`font-display text-lg font-black ${ok ? 'text-green-300' : 'text-amber-300'}`}>{title}</p>
      <div className="mt-1 text-[15px] leading-relaxed text-[#EEF2F8]">{children}</div>
    </div>
  )
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0A1120]/60 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#A7B0C0]">{label}</p>
      <p className={`font-display text-lg font-black ${good === undefined ? 'text-[#EEF2F8]' : good ? 'text-green-300' : 'text-amber-300'}`}>{value}</p>
    </div>
  )
}

function Steps({ n, at, labels }: { n: number; at: number; labels?: string[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label={`Step ${at + 1} of ${n}`}>
      {Array.from({ length: n }, (_, i) => (
        <li
          key={i}
          aria-current={i === at ? 'step' : undefined}
          className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-black ${i < at ? 'bg-green-500 text-[#0A1120]' : i === at ? 'bg-amber-500 text-[#1A1103]' : 'bg-white/10 text-[#A7B0C0]'}`}
        >
          {labels ? labels[i] : i + 1}
        </li>
      ))}
    </ol>
  )
}

// ═══ CADET ══════════════════════════════════════════════════════════════════

/** Every challenge, every time: each one teaches a different animal trick. */
const CADET_N = CADET_CHALLENGES.length

function Cadet({ onFinish }: { onFinish: Finish }) {
  const rounds = useMemo(() => shuffled(CADET_CHALLENGES, 7).map((c, i) => ({ ...c, options: shuffled(c.options, 100 + i) })), [])
  const [viewRef, showView] = useShowView<HTMLDivElement>()
  const [idx, setIdx] = useState(0)
  const [trick, setTrick] = useState<TrickId | null>(null)
  const [outcome, setOutcome] = useState<CadetOutcome | null>(null)
  const [runId, setRunId] = useState(0)
  const [done, setDone] = useState(false)
  const [wrong, setWrong] = useState(0)
  const [firstTry, setFirstTry] = useState(0)
  const [triedHere, setTriedHere] = useState<TrickId[]>([])
  const ch = rounds[idx]

  const onDone = useCallback(() => {
    setDone(true)
    playSound(outcome?.ok ? 'correct' : 'wrong')
  }, [outcome])
  const p = useRun(runId, 3200, onDone)
  const t = useClock(true)

  const pick = (id: TrickId) => {
    if (runId > 0 && !done) return
    const o = cadetTry(ch.task, id)
    playSound('click')
    setTrick(id)
    setOutcome(o)
    setDone(false)
    setRunId((r) => r + 1)
    if (!o.ok) setWrong((w) => w + 1)
    else if (triedHere.length === 0) setFirstTry((f) => f + 1)
    setTriedHere((l) => [...l, id])
    showView()
  }

  const next = () => {
    if (idx + 1 >= rounds.length) {
      const stars = wrong <= 1 ? 3 : wrong <= 3 ? 2 : 1
      onFinish({
        stars,
        score: firstTry,
        scoreLabel: `of ${CADET_N} matched first time`,
        message:
          stars === 3
            ? 'You picked the right animal trick almost every time. Engineers do exactly this: look at the problem, then borrow the animal that already solved it.'
            : 'Every robot reached its goal in the end. Each wrong try showed you WHY a trick fails — that is how engineers learn too.',
        badges: ['right-tool', ...(wrong >= 5 ? ['never-give-up'] : [])],
        attempts: CADET_N + wrong,
      })
      return
    }
    setIdx((i) => i + 1)
    setTrick(null)
    setOutcome(null)
    setRunId(0)
    setDone(false)
    setTriedHere([])
  }

  const running = runId > 0 && !done
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-3">
        <div ref={viewRef} className="scroll-mt-2 overflow-hidden rounded-[28px] border border-white/10 bg-[#0A1120]">
          <CadetScene task={ch.task} trick={runId > 0 ? trick : null} outcome={runId > 0 ? outcome : null} p={runId > 0 ? p : 0} t={t} />
        </div>
        <Steps n={rounds.length} at={idx} />
      </div>
      <div className="flex flex-col gap-3">
        <div className={CARD}>
          <p className="text-xs font-black uppercase tracking-wide text-lime-300">Challenge {idx + 1}</p>
          <h2 className="font-display text-2xl font-black text-[#EEF2F8]">{ch.title}</h2>
          <p className="mt-1 text-[17px] leading-relaxed text-[#A7B0C0]">{ch.story}</p>
        </div>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Choose an animal trick">
          {ch.options.map((id) => {
            const tr = TRICKS[id]
            const tried = triedHere.includes(id)
            const isPick = trick === id && runId > 0
            return (
              <button
                key={id}
                type="button"
                onClick={() => pick(id)}
                disabled={running || (done && outcome?.ok === true)}
                aria-pressed={isPick}
                className={`flex min-h-[112px] flex-col items-center justify-center gap-1 rounded-2xl border-2 p-2 text-center transition motion-safe:duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-[.97] disabled:cursor-not-allowed ${
                  isPick && done ? (outcome?.ok ? 'border-green-400 bg-green-500/15' : 'border-amber-400 bg-amber-500/10') : tried ? 'border-white/10 bg-white/[0.02] opacity-60' : 'border-white/15 bg-white/5 hover:-translate-y-0.5 hover:border-lime-300/60'
                }`}
              >
                <span className="text-4xl" aria-hidden>
                  {tr.emoji}
                </span>
                <span className="font-display text-[15px] font-black leading-tight text-[#EEF2F8]">{tr.name}</span>
                <span className="text-[11px] leading-tight text-[#A7B0C0]">{tr.animal.startsWith('no animal') ? 'a human invention' : `like a ${tr.animal}`}</span>
              </button>
            )
          })}
        </div>
        {done && outcome && trick && (
          <Debrief ok={outcome.ok} title={outcome.ok ? 'It works!' : 'Not this time — here is why'}>
            <p>{outcome.why}</p>
            {outcome.ok && <p className="mt-2 text-sm text-[#A7B0C0]">Real robot: {TRICKS[trick].real}</p>}
          </Debrief>
        )}
        {done && outcome?.ok && (
          <button type="button" className={PRIMARY} onClick={next}>
            {idx + 1 >= rounds.length ? 'Finish' : 'Next challenge →'}
          </button>
        )}
        {done && outcome && !outcome.ok && <p className="text-center text-sm font-bold text-[#A7B0C0]">Pick another trick to try again.</p>}
        {!runId && <p className="text-center text-sm text-[#A7B0C0]">Tap a trick (or Tab to it and press Enter) to test it.</p>}
      </div>
    </div>
  )
}

// ═══ PILOT ══════════════════════════════════════════════════════════════════

type Station = 'quad' | 'snake' | 'flap'
const STATIONS: { id: Station; name: string; emoji: string }[] = [
  { id: 'quad', name: 'Goat walk', emoji: '🐐' },
  { id: 'snake', name: 'Pipe snake', emoji: '🐍' },
  { id: 'flap', name: 'Flapper hop', emoji: '🐦' },
]

function Slider({ id, label, value, min, max, step, onChange, fmt, disabled }: { id: string; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt: (v: number) => string; disabled?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="font-display text-base font-black text-[#EEF2F8]">
          {label}
        </label>
        <output htmlFor={id} className="font-display text-2xl font-black text-amber-300">
          {fmt(value)}
        </output>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button type="button" className={`${GHOST} h-12 w-12 px-0`} aria-label={`Decrease ${label}`} disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, +(value - step).toFixed(4)))}>
          −
        </button>
        <input id={id} type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} className="h-12 w-full cursor-pointer accent-amber-500" />
        <button type="button" className={`${GHOST} h-12 w-12 px-0`} aria-label={`Increase ${label}`} disabled={disabled || value >= max} onClick={() => onChange(Math.min(max, +(value + step).toFixed(4)))}>
          +
        </button>
      </div>
    </div>
  )
}

function Pilot({ onFinish }: { onFinish: Finish }) {
  const [st, setSt] = useState(0)
  const [beta, setBeta] = useState(0.6)
  const [amp, setAmp] = useState(3)
  const [freq, setFreq] = useState(6)
  const [tests, setTests] = useState(0)
  const [runId, setRunId] = useState(0)
  const [done, setDone] = useState(false)
  const station = STATIONS[st].id
  const [viewRef, showView] = useShowView<HTMLDivElement>()

  const quad = useMemo(() => runQuad(beta), [beta])
  const snake = useMemo(() => runSnake(amp), [amp])
  const flap = useMemo(() => runFlap(freq), [freq])
  // Frozen at the moment of the test, so moving the slider mid-run cannot change it.
  const [tested, setTested] = useState<{ quad: typeof quad; snake: typeof snake; flap: typeof flap } | null>(null)
  const ok = tested ? (station === 'quad' ? tested.quad.ok : station === 'snake' ? tested.snake.ok : tested.flap.ok) : false

  const onDone = useCallback(() => {
    setDone(true)
    playSound(ok ? 'correct' : 'wrong')
  }, [ok])
  const p = useRun(runId, station === 'quad' ? 4200 : 3200, onDone)
  const t = useClock(true)
  const running = runId > 0 && !done

  const test = () => {
    playSound('click')
    setTested({ quad, snake, flap })
    setTests((n) => n + 1)
    setDone(false)
    setRunId((r) => r + 1)
    showView()
  }
  const change = (fn: (v: number) => void) => (v: number) => {
    fn(v)
    if (done) {
      setRunId(0)
      setDone(false)
      setTested(null)
    }
  }
  const next = () => {
    if (st + 1 >= STATIONS.length) {
      const stars = tests <= 4 ? 3 : tests <= 7 ? 2 : 1
      onFinish({
        stars,
        score: tests,
        scoreLabel: 'tests to pass all three stations',
        lowerIsBetter: true,
        message:
          'Three animals, three numbers: a duty factor of about 0.8 keeps three feet down so the centre of mass stays inside the support triangle; a wave just wider than the pipe makes wall friction beat gravity; flapping just fast enough for lift saves energy because power grows with the flap rate cubed.',
        badges: ['right-tool', ...(tests >= 8 ? ['never-give-up'] : [])],
        attempts: tests,
      })
      return
    }
    setSt((s) => s + 1)
    setRunId(0)
    setDone(false)
    setTested(null)
  }

  const frame = quadFrame(tested?.quad ?? quad, runId > 0 ? p : 0, t, runId > 0)
  const shownQuad = tested?.quad ?? quad

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div ref={viewRef} className="flex scroll-mt-2 flex-col gap-3">
        <Steps n={3} at={st} labels={STATIONS.map((s) => `${s.emoji} ${s.name}`)} />
        {station === 'quad' && (
          <>
            <div className="overflow-hidden rounded-[28px] border border-white/10">
              <QuadSideView beta={shownQuad.beta} frame={frame} />
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <QuadTopView beta={shownQuad.beta} phase={done && tested && !tested.quad.stable ? tested.quad.worstPhase : frame.phase} />
              </div>
              <div className="flex flex-col justify-center gap-1 text-sm text-[#A7B0C0]">
                <p>
                  <span className="font-black text-green-300">Green</span> feet are on the bridge. The shape they make is the <b className="text-[#EEF2F8]">support polygon</b>.
                </p>
                <p>The white dot is the centre of mass. Keep it inside the shape — by at least the 2 mm the bridge sways — and the robot cannot tip.</p>
              </div>
            </div>
          </>
        )}
        {station === 'snake' && (
          <div className="overflow-hidden rounded-[28px] border border-white/10">
            <SnakeView amplitudeCm={(tested?.snake ?? snake).amplitudeCm} result={tested?.snake ?? snake} p={runId > 0 ? p : 0} t={t} running={runId > 0} />
          </div>
        )}
        {station === 'flap' && (
          <div className="overflow-hidden rounded-[28px] border border-white/10">
            <FlapView result={tested?.flap ?? flap} p={runId > 0 ? p : 0} t={t} running={runId > 0} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {station === 'quad' && (
          <div className={CARD}>
            <h2 className="font-display text-xl font-black text-[#EEF2F8]">Carry the egg over the swaying bridge</h2>
            <p className="mt-1 text-[15px] text-[#A7B0C0]">
              A four-legged robot moves one leg at a time, like a goat on a cliff. The <b className="text-[#EEF2F8]">duty factor β</b> is how much of each step a foot spends on the ground. Cross {QUAD.bridgeM} m in under {QUAD.timeLimitS} s without tipping.
            </p>
            <div className="mt-3">
              <Slider id="beta" label="Duty factor β" value={beta} min={0.5} max={0.95} step={0.01} onChange={change(setBeta)} fmt={(v) => v.toFixed(2)} disabled={running} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat label="feet always down" value={`≥ ${quad.minFeetDown}`} good={quad.minFeetDown >= 3} />
              <Stat label="speed" value={`${(quad.speed * 100).toFixed(1)} cm/s`} />
              <Stat label="time" value={`${quad.timeS.toFixed(0)} s`} good={quad.inTime} />
            </div>
          </div>
        )}
        {station === 'snake' && (
          <div className={CARD}>
            <h2 className="font-display text-xl font-black text-[#EEF2F8]">Climb the sloping pipe</h2>
            <p className="mt-1 text-[15px] text-[#A7B0C0]">
              The pipe is {SNAKE.pipeCm} cm wide and slopes up {SNAKE.slopeDeg}°. A snake climbs a pipe by pressing its curves against the walls: <b className="text-[#EEF2F8]">friction = μ × push</b>. Choose how wide the wave is.
            </p>
            <div className="mt-3">
              <Slider id="amp" label="Wave half-width" value={amp} min={2} max={7} step={0.1} onChange={change(setAmp)} fmt={(v) => `${v.toFixed(1)} cm`} disabled={running} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat label="wall grip" value={`${snake.gripN.toFixed(1)} N`} good={snake.gripN >= snake.needN} />
              <Stat label="gravity pull" value={`${snake.needN.toFixed(1)} N`} />
              <Stat label="motor effort" value={`${snake.motorPct}%`} good={snake.motorPct <= 100} />
            </div>
          </div>
        )}
        {station === 'flap' && (
          <div className={CARD}>
            <h2 className="font-display text-xl font-black text-[#EEF2F8]">Hop the river on flapping wings</h2>
            <p className="mt-1 text-[15px] text-[#A7B0C0]">
              A {FLAP.massKg * 1000} g flapper must cross {FLAP.distanceM} m. <b className="text-[#EEF2F8]">Lift grows with flaps² but power grows with flaps³.</b> The battery holds {FLAP.batteryJ} J. Choose the flap rate.
            </p>
            <div className="mt-3">
              <Slider id="freq" label="Flaps per second" value={freq} min={4} max={26} step={1} onChange={change(setFreq)} fmt={(v) => `${v} Hz`} disabled={running} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat label="lift" value={`${flap.liftN.toFixed(2)} N`} good={flap.liftN >= flap.weightN * FLAP.climb} />
              <Stat label="power" value={`${flap.powerW.toFixed(1)} W`} />
              <Stat label="energy" value={`${flap.energyJ.toFixed(0)} J`} good={flap.energyJ <= FLAP.batteryJ} />
            </div>
          </div>
        )}
        <button type="button" className={PRIMARY} onClick={test} disabled={running || (done && ok)}>
          {running ? 'Testing…' : 'Test it ▶'}
        </button>
        {done && tested && (
          <Debrief ok={ok} title={ok ? 'Station cleared!' : 'Why it happened'}>
            <p>{station === 'quad' ? tested.quad.why : station === 'snake' ? tested.snake.why : tested.flap.why}</p>
          </Debrief>
        )}
        {done && ok && (
          <button type="button" className={PRIMARY} onClick={next}>
            {st + 1 >= STATIONS.length ? 'Finish' : 'Next station →'}
          </button>
        )}
        <p className="text-center text-sm text-[#A7B0C0]">Tests so far: {tests}</p>
      </div>
    </div>
  )
}

// ═══ ACE + LEGEND: the design bench ═════════════════════════════════════════

const MODULE_USE: Record<ModuleId, string> = {
  wheels: 'flat · ice (slowly) — not rocks',
  legs: 'flat · rocks · ice if crawling',
  gecko: 'glass walls (needs legs)',
  snake: 'pipes · rocks · water · flat',
  wings: 'gaps — if lift beats weight',
  fins: 'water',
}

const GAITS: { id: Gait; label: string; note: string }[] = [
  { id: 'trot', label: 'Trot', note: 'two feet down, fast — dynamic stability' },
  { id: 'crawl', label: 'Crawl', note: 'three feet down, slow — static stability' },
  { id: 'auto', label: 'Auto', note: `trot, but crawl on ice (+${AUTO_SENSOR_KG} kg slip sensor)` },
]

function Bench({ design, setDesign, disabled, batteries }: { design: Design; setDesign: (d: Design) => void; disabled: boolean; batteries: boolean }) {
  const toggle = (id: ModuleId) => {
    const has = design.modules.includes(id)
    playSound('click')
    setDesign({ ...design, modules: has ? design.modules.filter((m) => m !== id) : MODULE_IDS.filter((m) => m === id || design.modules.includes(m)) })
  }
  const hasLegs = design.modules.includes('legs')
  return (
    <div className="flex flex-col gap-3">
      <fieldset>
        <legend className="font-display text-base font-black text-[#EEF2F8]">Modules (tap to add or remove)</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {MODULE_IDS.map((id) => {
            const on = design.modules.includes(id)
            const tr = TRICKS[id]
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                disabled={disabled}
                onClick={() => toggle(id)}
                className={`flex min-h-[88px] flex-col items-start rounded-2xl border-2 p-2.5 text-left transition motion-safe:duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-[.97] disabled:opacity-50 ${on ? 'border-lime-300 bg-lime-400/15' : 'border-white/10 bg-white/[0.03] hover:border-white/30'}`}
              >
                <span className="flex w-full items-center justify-between">
                  <span className="text-2xl" aria-hidden>
                    {tr.emoji}
                  </span>
                  <span className="font-display text-sm font-black text-[#A7B0C0]">{tr.mass} kg</span>
                </span>
                <span className="font-display text-[15px] font-black text-[#EEF2F8]">{tr.name}</span>
                <span className="text-[11px] leading-tight text-[#A7B0C0]">{MODULE_USE[id]}</span>
              </button>
            )
          })}
        </div>
      </fieldset>
      <fieldset disabled={disabled || !hasLegs}>
        <legend className="font-display text-base font-black text-[#EEF2F8]">
          Leg gait {!hasLegs && <span className="text-sm font-bold text-[#6E7888]">(add legs to choose)</span>}
        </legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {GAITS.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={design.gait === g.id}
              onClick={() => setDesign({ ...design, gait: g.id })}
              className={`min-h-[64px] rounded-xl border-2 p-2 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:opacity-40 ${design.gait === g.id ? 'border-amber-400 bg-amber-500/15' : 'border-white/10 bg-white/[0.03] hover:border-white/30'}`}
            >
              <span className="block font-display text-sm font-black text-[#EEF2F8]">{g.label}</span>
              <span className="block text-[11px] leading-tight text-[#A7B0C0]">{g.note}</span>
            </button>
          ))}
        </div>
      </fieldset>
      {batteries && (
        <fieldset disabled={disabled}>
          <legend className="font-display text-base font-black text-[#EEF2F8]">Battery</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {LEGEND_BATTERIES.map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={design.battery === b}
                onClick={() => setDesign({ ...design, battery: b })}
                className={`min-h-[52px] rounded-xl border-2 p-2 text-center transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${design.battery === b ? 'border-cyan-300 bg-cyan-400/10' : 'border-white/10 bg-white/[0.03] hover:border-white/30'}`}
              >
                <span className="block font-display text-sm font-black text-[#EEF2F8]">{BATTERIES[b].label}</span>
                <span className="block text-[11px] text-[#A7B0C0]">{BATTERIES[b].kg} kg</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  )
}

function SegmentList({ r }: { r: CourseResult }) {
  return (
    <ol className="mt-2 space-y-1.5 text-sm">
      {r.segments.map((s, i) => {
        const reached = r.ok || i <= r.stopAt
        if (!reached) return null
        const failedHere = !r.ok && i === r.stopAt
        return (
          <li key={i} className="flex gap-2">
            <span aria-hidden>{failedHere ? '✖' : '✔'}</span>
            <span className={failedHere ? 'text-amber-200' : 'text-[#A7B0C0]'}>
              <b className="text-[#EEF2F8]">
                {TERRAINS[s.terrain].emoji} {TERRAINS[s.terrain].name} {s.length} m:
              </b>{' '}
              {failedHere ? r.why.replace(/^[^:]+: /, '') : s.why}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function EnergyBar({ used, cap }: { used: number; cap: number }) {
  const f = Math.min(1, used / cap)
  return (
    <div>
      <div className="flex justify-between text-xs font-bold text-[#A7B0C0]">
        <span>Battery used</span>
        <span>
          {fmtKj(used)} / {fmtKj(cap)}
        </span>
      </div>
      <div className="mt-1 h-3 overflow-hidden rounded-full bg-white/10" role="meter" aria-valuemin={0} aria-valuemax={cap} aria-valuenow={Math.round(used)} aria-label="Battery energy used">
        <div className={`h-full rounded-full ${f >= 1 ? 'bg-red-500' : f > 0.8 ? 'bg-amber-400' : 'bg-green-400'}`} style={{ width: `${f * 100}%` }} />
      </div>
    </div>
  )
}

function Ace({ onFinish }: { onFinish: Finish }) {
  const [mi, setMi] = useState(0)
  const [design, setDesign] = useState<Design>({ modules: ['wheels'], gait: 'trot', battery: 'ace' })
  const [result, setResult] = useState<CourseResult | null>(null)
  const [runId, setRunId] = useState(0)
  const [done, setDone] = useState(false)
  const [tests, setTests] = useState(0)
  const [used, setUsed] = useState(0)
  const mission = ACE_MISSIONS[mi]
  const [viewRef, showView] = useShowView<HTMLDivElement>()

  const onDone = useCallback(() => {
    setDone(true)
    playSound(result?.ok ? 'correct' : 'wrong')
  }, [result])
  const p = useRun(runId, 4200, onDone)
  const t = useClock(true)
  const running = runId > 0 && !done
  const mass = designMass(design)

  const test = () => {
    playSound('click')
    setResult(runCourse({ ...design, battery: mission.battery }, mission.course, ACE_BATTERY_J, null))
    setTests((n) => n + 1)
    setDone(false)
    setRunId((r) => r + 1)
    showView()
  }
  const edit = (d: Design) => {
    setDesign(d)
    if (done) {
      setRunId(0)
      setDone(false)
      setResult(null)
    }
  }
  const next = () => {
    const total = used + (result?.energyJ ?? 0)
    if (mi + 1 >= ACE_MISSIONS.length) {
      const stars = tests <= 4 ? 3 : tests <= 8 ? 2 : 1
      onFinish({
        stars,
        score: Math.round(total / 100) / 10,
        scoreLabel: 'kJ used on all three missions',
        lowerIsBetter: true,
        message:
          'Each mission needed a different mix of animal tricks. Every module you add costs weight, and weight costs energy on every metre — so the best robot carries exactly what the mission needs, and lets the cheapest module do each stretch.',
        badges: ['right-tool', ...(tests >= 8 ? ['never-give-up'] : [])],
        attempts: tests,
      })
      return
    }
    setUsed(total)
    setMi((m) => m + 1)
    setRunId(0)
    setDone(false)
    setResult(null)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex flex-col gap-3">
        <Steps n={ACE_MISSIONS.length} at={mi} labels={ACE_MISSIONS.map((m) => m.name)} />
        <div className={CARD}>
          <h2 className="font-display text-xl font-black text-[#EEF2F8]">{mission.name}</h2>
          <p className="mt-1 text-[15px] text-[#A7B0C0]">{mission.story}</p>
        </div>
        <div ref={viewRef} className="scroll-mt-2 overflow-hidden rounded-[28px] border border-white/10">
          <CourseStrip course={mission.course} result={result} p={runId > 0 ? p : 0} t={t} running={runId > 0} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="robot mass" value={`${mass} kg`} />
          <Stat label="weight" value={`${(mass * 9.81).toFixed(1)} N`} />
          <Stat label="battery" value={`${BATTERIES[mission.battery].label}, ${BATTERIES[mission.battery].kg * 1000} g`} />
        </div>
        {done && result && (
          <Debrief ok={result.ok} title={result.ok ? `Mission complete — ${fmtKj(result.energyJ)} used` : 'Why it stopped'}>
            {!result.ok && <p>{result.why}</p>}
            <SegmentList r={result} />
            <div className="mt-3">
              <EnergyBar used={result.energyJ} cap={ACE_BATTERY_J} />
            </div>
          </Debrief>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <div className={CARD}>
          <Bench design={design} setDesign={edit} disabled={running} batteries={false} />
          <p className="mt-3 text-xs text-[#A7B0C0]">
            Every robot has a 1 kg body. On each stretch the robot uses its cheapest working module. Energy = cost of transport × weight × distance.
          </p>
        </div>
        <button type="button" className={PRIMARY} onClick={test} disabled={running || design.modules.length === 0 || (done && result?.ok === true)}>
          {running ? 'Running mission…' : 'Run mission ▶'}
        </button>
        {done && result?.ok && (
          <button type="button" className={PRIMARY} onClick={next}>
            {mi + 1 >= ACE_MISSIONS.length ? 'Finish' : 'Next mission →'}
          </button>
        )}
        <p className="text-center text-sm text-[#A7B0C0]">Tests so far: {tests}</p>
      </div>
    </div>
  )
}

/** Practice courses: shown after every test, so the child can learn from them. */
const LEGEND_SEED = 7001
/**
 * Final-check courses: never shown until the design is submitted, and a new set
 * on every attempt, so a design cannot be fitted to a known test set. The one
 * design that survives the practice set survives each of these 8 of 8.
 */
const FINAL_SEEDS = [2, 3, 99, 1234, 23, 314, 2718]
const LEGEND_PASS = 7

function Legend({ onFinish }: { onFinish: Finish }) {
  const [design, setDesign] = useState<Design>({ modules: ['wheels', 'legs'], gait: 'trot', battery: 'medium' })
  const [results, setResults] = useState<CourseResult[] | null>(null)
  const [view, setView] = useState(0)
  const [runId, setRunId] = useState(0)
  const [done, setDone] = useState(false)
  const [tests, setTests] = useState(0)
  const [phase, setPhase] = useState<'design' | 'explain'>('design')
  const [qi, setQi] = useState(0)
  const [qWrong, setQWrong] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [best, setBest] = useState(0)
  const [final, setFinal] = useState(false)
  const [finalTry, setFinalTry] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [viewRef, showView] = useShowView<HTMLDivElement>()
  const seed = final ? FINAL_SEEDS[(finalTry - 1 + FINAL_SEEDS.length) % FINAL_SEEDS.length] : LEGEND_SEED
  const courses = useMemo(() => legendCourses(seed), [seed])
  const questions = useMemo(() => LEGEND_QUESTIONS.map((q, i) => ({ ...q, options: shuffled(q.options, 300 + i) })), [])

  const passed = results ? results.filter((r) => r.ok).length : 0
  const onDone = useCallback(() => {
    setDone(true)
    playSound(passed >= LEGEND_PASS ? 'correct' : 'wrong')
  }, [passed])
  const p = useRun(runId, 3600, onDone)
  const t = useClock(true)
  const running = runId > 0 && !done
  const mass = designMass(design)

  const start = (rs: CourseResult[]) => {
    playSound('click')
    setResults(rs)
    const firstFail = rs.findIndex((r) => !r.ok)
    setView(firstFail >= 0 ? firstFail : 0)
    setTests((n) => n + 1)
    setDone(false)
    setRunId((r) => r + 1)
    showView()
  }
  const test = () => {
    const rs = runLegend(design, LEGEND_SEED)
    setFinal(false)
    setBest((b) => Math.max(b, rs.filter((r) => r.ok).length))
    start(rs)
  }
  const finalTest = () => {
    const n = finalTry + 1
    const rs = runLegend(design, FINAL_SEEDS[(n - 1) % FINAL_SEEDS.length])
    setFinalTry(n)
    setFinal(true)
    setFinalScore(rs.filter((r) => r.ok).length)
    start(rs)
  }
  const backToBench = () => {
    playSound('click')
    setFinal(false)
    setRunId(0)
    setDone(false)
    setResults(null)
  }
  const edit = (d: Design) => {
    setDesign(d)
    if (done) {
      setFinal(false)
      setRunId(0)
      setDone(false)
      setResults(null)
    }
  }

  const answer = (i: number) => {
    if (picked !== null && questions[qi].options[picked].correct) return
    setPicked(i)
    if (questions[qi].options[i].correct) playSound('correct')
    else {
      playSound('wrong')
      setQWrong((w) => w + 1)
    }
  }
  const nextQ = () => {
    if (qi + 1 >= questions.length) {
      let stars = finalScore >= LEGEND_COURSES ? 3 : 2
      if (qWrong >= 2) stars -= 1
      if (tests > 10) stars -= 1
      stars = Math.max(1, stars)
      onFinish({
        stars,
        score: finalScore,
        scoreLabel: `of ${LEGEND_COURSES} never-seen courses survived`,
        message:
          'A generalist robot is a pile of compromises: wings force it to stay under about 4 kg, so it cannot also carry wheels; ice forces a careful gait just where it is needed; and the lightest battery that lasts wins because every kilogram costs energy on every metre.',
        badges: ['right-tool', ...(tests >= 5 ? ['never-give-up'] : [])],
        attempts: tests,
      })
      return
    }
    setQi((q) => q + 1)
    setPicked(null)
  }

  if (phase === 'explain') {
    const q = questions[qi]
    const right = picked !== null && q.options[picked].correct
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        <Steps n={questions.length} at={qi} />
        <div className={CARD}>
          <p className="text-xs font-black uppercase tracking-wide text-lime-300">Explain your design · question {qi + 1}</p>
          <h2 className="mt-1 font-display text-xl font-black text-[#EEF2F8]">{q.q}</h2>
          <div className="mt-3 flex flex-col gap-2" role="group" aria-label="Answers">
            {q.options.map((o, i) => (
              <button
                key={i}
                type="button"
                onClick={() => answer(i)}
                disabled={right}
                className={`min-h-[56px] rounded-2xl border-2 p-3 text-left text-[15px] leading-snug transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${picked === i ? (o.correct ? 'border-green-400 bg-green-500/15 text-[#EEF2F8]' : 'border-amber-400 bg-amber-500/10 text-[#EEF2F8]') : 'border-white/10 bg-white/[0.03] text-[#A7B0C0] hover:border-white/30'}`}
              >
                {o.text}
              </button>
            ))}
          </div>
        </div>
        {picked !== null && !right && (
          <Debrief ok={false} title="Not quite">
            <p>Look back at your approved robot: its mass, its weight in newtons and the numbers in each course debrief hold the answer. Try another.</p>
          </Debrief>
        )}
        {right && (
          <button type="button" className={PRIMARY} onClick={nextQ}>
            {qi + 1 >= questions.length ? 'Finish' : 'Next question →'}
          </button>
        )}
      </div>
    )
  }

  const cur = results?.[view] ?? null
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex flex-col gap-3">
        <div className={CARD}>
          <h2 className="font-display text-xl font-black text-[#EEF2F8]">Design for a world you have not seen</h2>
          <p className="mt-1 text-[15px] text-[#A7B0C0]">
            Practise on {LEGEND_COURSES} five-stretch courses. Once your robot survives {LEGEND_PASS} of them, it faces the real test: {LEGEND_COURSES} brand-new courses it has never seen, and it must survive {LEGEND_PASS} of those too — each within {LEGEND_TIME_S / 60} minutes on one battery. You only know the mix:
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {LEGEND_MIX.map((m) => (
              <div key={m.terrain} className="rounded-xl border border-white/10 bg-[#0A1120]/60 p-2 text-center">
                <p className="text-xl" aria-hidden>
                  {TERRAINS[m.terrain].emoji}
                </p>
                <p className="text-[11px] font-black text-[#EEF2F8]">{TERRAINS[m.terrain].name}</p>
                <p className="font-display text-sm font-black text-amber-300">{m.weight}%</p>
                <p className="text-[10px] text-[#A7B0C0]">
                  {m.min}–{m.max} m
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-[#A7B0C0]">Ice: μ = 0.15. Glass needs pads holding 2 × weight (pads hold 100 N). Wings lift 40 N at most.</p>
        </div>
        {results && cur && (
          <div ref={viewRef} className="flex scroll-mt-2 flex-col gap-3">
            <p className="text-xs font-black uppercase tracking-wide text-lime-300">{final ? 'Final test · never-seen courses' : 'Practice courses'}</p>
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Courses">
              {results.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={view === i}
                  onClick={() => setView(i)}
                  disabled={running}
                  className={`h-11 min-w-11 rounded-xl border-2 px-2 font-display text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${view === i ? 'border-amber-400' : 'border-transparent'} ${!done ? 'bg-white/10 text-[#A7B0C0]' : r.ok ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'}`}
                >
                  {i + 1} {done ? (r.ok ? '✔' : '✖') : ''}
                </button>
              ))}
            </div>
            <div className="overflow-hidden rounded-[28px] border border-white/10">
              <CourseStrip course={courses[view]} result={cur} p={runId > 0 ? (done ? 1 : p) : 0} t={t} running={runId > 0} />
            </div>
          </div>
        )}
        {!results && (
          <div className="flex min-h-[160px] items-center justify-center rounded-[28px] border border-dashed border-white/15 bg-white/[0.02] p-6 text-center text-[#A7B0C0]">
            The courses stay hidden until you test. Think first: which stretches could stop each design?
          </div>
        )}
        {done && results && cur && (
          <Debrief
            ok={passed >= LEGEND_PASS}
            title={
              final
                ? passed >= LEGEND_PASS
                  ? `${passed} of ${LEGEND_COURSES} never-seen courses survived — design approved!`
                  : `Only ${passed} of ${LEGEND_COURSES} new courses survived. Course ${view + 1}:`
                : passed >= LEGEND_PASS
                  ? `${passed} of ${LEGEND_COURSES} practice courses survived — ready for the final test`
                  : `${passed} of ${LEGEND_COURSES} survived. Course ${view + 1}:`
            }
          >
            {final && passed < LEGEND_PASS && (
              <p className="mb-2">Your design fitted the practice courses but not new ones. Real robots meet terrain nobody tested — design for the whole mix, not for one set of courses.</p>
            )}
            <p>{cur.ok ? `Course ${view + 1} done in ${fmtTime(cur.timeS)} using ${fmtKj(cur.energyJ)}.` : cur.why}</p>
            <SegmentList r={cur} />
            <div className="mt-3">
              <EnergyBar used={cur.energyJ} cap={cur.batteryJ} />
            </div>
          </Debrief>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <div className={CARD}>
          <Bench design={design} setDesign={edit} disabled={running} batteries />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat label="robot mass" value={`${mass} kg`} />
            <Stat label="weight" value={`${(mass * 9.81).toFixed(1)} N`} good={design.modules.includes('wings') ? mass * 9.81 <= 40 : undefined} />
          </div>
        </div>
        {!(final && done) && (
          <button type="button" className={PRIMARY} onClick={test} disabled={running || design.modules.length === 0}>
            {running ? `Testing on ${LEGEND_COURSES} courses…` : `Practise on ${LEGEND_COURSES} courses ▶`}
          </button>
        )}
        {!final && done && passed >= LEGEND_PASS && (
          <button type="button" className={PRIMARY} onClick={finalTest}>
            Final test: {LEGEND_COURSES} never-seen courses ▶
          </button>
        )}
        {final && done && passed < LEGEND_PASS && (
          <button type="button" className={GHOST} onClick={backToBench}>
            ← Back to the bench
          </button>
        )}
        {final && done && passed >= LEGEND_PASS && (
          <button
            type="button"
            className={PRIMARY}
            onClick={() => {
              playSound('click')
              setPhase('explain')
            }}
          >
            Explain the trade-offs →
          </button>
        )}
        <p className="text-center text-sm text-[#A7B0C0]">
          Tests so far: {tests} · best practice: {best}/{LEGEND_COURSES}
        </p>
      </div>
    </div>
  )
}

export default function BioBotsGameClient({ tier, onFinish }: { tier: number; onFinish: Finish }) {
  if (tier === 0) return <Cadet onFinish={onFinish} />
  if (tier === 1) return <Pilot onFinish={onFinish} />
  if (tier === 2) return <Ace onFinish={onFinish} />
  return <Legend onFinish={onFinish} />
}
