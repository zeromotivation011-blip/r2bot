'use client'

// components/kids/ai/think/LearningRobotClient.tsx
// Learning Robot: reinforcement learning the child can watch. A robot in a
// gridworld learns, by trial and error, to reach the battery cookie
// (tabular Q-learning, lib/kids/ai/think/qlearn.ts). The screen shows the
// reward of every move, the robot's growing "map" of how good each square is
// (max Q heat map + best-move arrows), the Q-values of any square, a
// curiosity (ε) slider and the reward of every episode. Legend tier adds a
// two-legged walker that learns to walk by policy search (walker.ts).
// Runs entirely on the device: no network, works offline.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ACTION_NAMES,
  chooseAction,
  bestAction,
  envStep,
  LEVELS,
  levelWorld,
  maxQ,
  newQ,
  qUpdate,
  REWARD,
  shortestPath,
  type Action,
  type Cell,
  type GridWorld,
  type LevelId,
} from '@/lib/kids/ai/think/qlearn'
import { learnMissionsFor, type LearnMission, type LearnSnapshot } from '@/lib/kids/ai/think/learn-missions'
import { makeRng, prefersReducedMotion } from '@/lib/kids/ai/think/common'
import { DT, LEG, mutate, RANDOM_START, simulate, WALK_SECONDS, WALK_TARGET_M, type Gait, type WalkFrame } from '@/lib/kids/ai/think/walker'
import { playSound } from '@/lib/kids-audio'
import type { TierName } from '@/lib/kids/universe/tiers'
import { Btn, cx, fitCanvas, MissionDone, MissionList, Panel, Slider, Stat, TierTabs, useElementWidth, useThinkMissions, useTier } from './LabUiClient'

const TIER_RANK: Record<TierName, number> = { Cadet: 0, Pilot: 1, Ace: 2, Legend: 3 }
const DEFAULT_LEVEL: Record<TierName, LevelId> = { Cadet: 'cookie', Pilot: 'walls', Ace: 'cliff', Legend: 'maze' }

type RunMode = 'idle' | 'watch' | 'test'
type EditTool = 'wall' | 'lava' | 'goal' | 'empty'

interface Flash {
  s: number
  r: number
  event: string
  explored: boolean
}

function maxStepsFor(w: GridWorld): number {
  return w.w * w.h * 4
}

export default function LearningRobotClient() {
  const [tier, setTier] = useTier()
  const [level, setLevel] = useState<LevelId>('cookie')
  const [ownCells, setOwnCells] = useState<Cell[] | null>(null)
  const world = useMemo<GridWorld>(() => {
    const base = levelWorld(level)
    return level === 'own' && ownCells ? { ...base, cells: ownCells } : base
  }, [level, ownCells])
  const optimal = useMemo(() => shortestPath(world), [world])

  const [epsilon, setEpsilon] = useState(0.2)
  const [alpha, setAlpha] = useState(0.5)
  const [gamma, setGamma] = useState(0.95)
  const [icy, setIcy] = useState(false)
  const [speed, setSpeed] = useState(8)
  const [showMap, setShowMap] = useState(true)
  const [editTool, setEditTool] = useState<EditTool | null>(null)
  const [selected, setSelected] = useState<number | null>(null)

  // Learning state lives in refs so the robot can move without re-rendering React every step.
  const Qref = useRef<Float64Array>(newQ(world))
  const rng = useRef(makeRng(7))
  const pos = useRef(world.start)
  const epReward = useRef(0)
  const epSteps = useRef(0)
  const trail = useRef<number[]>([])
  const flash = useRef<Flash | null>(null)
  const history = useRef<number[]>([])
  const successes = useRef<boolean[]>([])

  const [mode, setMode] = useState<RunMode>('idle')
  const [autoTrain, setAutoTrain] = useState(false)
  const [episodes, setEpisodes] = useState(0)
  const [explored, setExplored] = useState(0)
  const [test, setTest] = useState<LearnSnapshot['test']>(null)
  const [tick, setTick] = useState(0)
  const [note, setNote] = useState('Press “Try once” and watch the robot explore. It knows nothing yet.')
  const [walkerBest, setWalkerBest] = useState(0)

  const missions = useMemo(() => learnMissionsFor(tier), [tier])
  const ms = useThinkMissions<LearnMission>('learn')

  const redraw = useCallback(() => setTick((t) => t + 1), [])

  const resetBrain = useCallback(
    (w: GridWorld) => {
      Qref.current = newQ(w)
      pos.current = w.start
      epReward.current = 0
      epSteps.current = 0
      trail.current = [w.start]
      flash.current = null
      history.current = []
      successes.current = []
      setEpisodes(0)
      setExplored(0)
      setTest(null)
      setMode('idle')
      setAutoTrain(false)
      setSelected(null)
      redraw()
    },
    [redraw],
  )

  useEffect(() => {
    setLevel(DEFAULT_LEVEL[tier])
    if (TIER_RANK[tier] < 2) setIcy(false)
  }, [tier])

  useEffect(() => {
    resetBrain(world)
    setNote(LEVELS.find((l) => l.id === level)?.blurb ?? '')
  }, [world, level, resetBrain])

  const finishEpisode = useCallback(
    (reached: boolean, wasTest: boolean) => {
      if (wasTest) {
        setTest({ reached, steps: epSteps.current, optimal })
        setNote(
          reached
            ? epSteps.current === optimal
              ? `Test run: cookie in ${epSteps.current} moves — the shortest possible path!`
              : `Test run: cookie in ${epSteps.current} moves. The shortest is ${optimal}. Train more to find it.`
            : 'Test run failed — the robot has not learned enough yet. Train it more.',
        )
        playSound(reached ? 'correct' : 'wrong')
      } else {
        history.current.push(epReward.current)
        if (history.current.length > 400) history.current.shift()
        successes.current.push(reached)
        if (successes.current.length > 20) successes.current.shift()
        setEpisodes((e) => e + 1)
        if (epsilon >= 0.3) setExplored((e) => e + 1)
      }
    },
    [optimal, epsilon],
  )

  /** One move of the robot. Returns true when the episode ended. */
  const stepOnce = useCallback(
    (learn: boolean, eps: number): boolean => {
      const s = pos.current
      const { a, explored: ex } = learn ? chooseAction(Qref.current, s, eps, rng.current) : { a: bestAction(Qref.current, s, rng.current), explored: false }
      const r = envStep(world, s, a, icy, rng.current)
      if (learn) qUpdate(Qref.current, s, a, r.r, r.s2, r.done, alpha, gamma)
      pos.current = r.s2
      epReward.current += r.r
      epSteps.current++
      trail.current.push(r.s2)
      if (trail.current.length > 60) trail.current.shift()
      flash.current = { s: r.s2, r: r.r, event: r.event, explored: ex }
      const timeout = epSteps.current >= maxStepsFor(world)
      return r.done || timeout
    },
    [world, icy, alpha, gamma],
  )

  const startEpisode = useCallback(() => {
    pos.current = world.start
    epReward.current = 0
    epSteps.current = 0
    trail.current = [world.start]
    flash.current = null
  }, [world])

  // Animated runs (watching one try, auto-training, or a test run).
  const modeRef = useRef(mode)
  modeRef.current = mode
  const autoRef = useRef(autoTrain)
  autoRef.current = autoTrain
  useEffect(() => {
    if (mode === 'idle') return
    const reduced = prefersReducedMotion()
    let raf = 0
    let last = performance.now()
    let acc = 0
    const interval = 1000 / (mode === 'test' ? Math.min(speed, 10) : speed)
    const loop = (now: number) => {
      acc += Math.min(250, now - last)
      last = now
      let ended = false
      while (acc >= interval && !ended) {
        acc -= interval
        const isTest = modeRef.current === 'test'
        const done = stepOnce(!isTest, epsilon)
        if (done) {
          const reached = world.cells[pos.current] === 'goal'
          if (!isTest && !reduced) playSound(reached ? 'correct' : 'click')
          finishEpisode(reached, isTest)
          if (!isTest && autoRef.current) {
            startEpisode()
          } else {
            ended = true
          }
        }
      }
      redraw()
      if (ended) {
        setMode('idle')
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const onHide = () => {
      if (document.hidden) {
        setAutoTrain(false)
        setMode('idle')
      }
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [mode, speed, epsilon, stepOnce, finishEpisode, startEpisode, redraw, world])

  const tryOnce = () => {
    playSound('click')
    setAutoTrain(false)
    setTest(null)
    startEpisode()
    setNote('Watch: orange numbers are rewards. A “?” means the robot is being curious and trying a random move.')
    setMode('watch')
  }

  const toggleAuto = () => {
    playSound('click')
    if (autoTrain) {
      setAutoTrain(false)
      setMode('idle')
      return
    }
    setTest(null)
    startEpisode()
    setAutoTrain(true)
    setMode('watch')
  }

  const trainFast = (n: number) => {
    playSound('click')
    setAutoTrain(false)
    setMode('idle')
    setTest(null)
    let reachedCount = 0
    for (let i = 0; i < n; i++) {
      startEpisode()
      let done = false
      while (!done) done = stepOnce(true, epsilon)
      const reached = world.cells[pos.current] === 'goal'
      if (reached) reachedCount++
      finishEpisode(reached, false)
    }
    setNote(`Trained ${n} tries in a flash: reached the cookie ${reachedCount} times. Now press “Test run”.`)
    startEpisode()
    redraw()
  }

  // On a phone the Test run button sits below the board, so bring the whole
  // board into view before the run starts, and hold any mission card (and the
  // shell's reward toasts it triggers) until the child has watched the run end.
  const boardRef = useRef<HTMLDivElement | null>(null)
  const [holdMissions, setHoldMissions] = useState(false)
  const testRun = () => {
    playSound('click')
    setAutoTrain(false)
    startEpisode()
    setNote('Test run: no curiosity now — the robot always picks the move its map says is best.')
    setHoldMissions(true)
    setMode('test')
    const el = boardRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      if (r.top < 64 || r.bottom > window.innerHeight) el.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    }
  }
  useEffect(() => {
    if (!holdMissions || mode !== 'idle') return
    const t = window.setTimeout(() => setHoldMissions(false), 1200)
    return () => window.clearTimeout(t)
  }, [holdMissions, mode])

  // ── Editing your own world ──
  const onCellTap = (i: number) => {
    if (level === 'own' && editTool && mode === 'idle') {
      if (i === world.start) return
      const cells = [...world.cells]
      if (editTool === 'goal') {
        for (let k = 0; k < cells.length; k++) if (cells[k] === 'goal') cells[k] = 'empty'
      } else if (cells[i] === 'goal' && cells.filter((c) => c === 'goal').length === 1) {
        setNote('Your world needs one cookie. Move it with the cookie tool instead.')
        return
      }
      cells[i] = editTool
      playSound('click')
      setOwnCells(cells)
      return
    }
    playSound('click')
    setSelected((s) => (s === i ? null : i))
  }

  const ownWalls = level === 'own' ? world.cells.filter((c) => c === 'wall').length : 0
  const ownLava = level === 'own' ? world.cells.filter((c) => c === 'lava').length : 0

  // ── Missions ──
  useEffect(() => {
    if (holdMissions) return
    const snap: LearnSnapshot = { level, episodes, test, epsilon, icy, exploredEpisodes: explored, ownWalls, ownLava, walkerBest }
    for (const m of missions) if (!ms.done.includes(m.id) && m.check(snap)) ms.complete(m)
  }, [holdMissions, level, episodes, test, epsilon, icy, explored, ownWalls, ownLava, walkerBest, missions, ms])

  const rank = TIER_RANK[tier]
  const levelsShown = LEVELS.filter((l) => TIER_RANK[l.tier] <= Math.max(rank, 1) || l.id === 'cookie')
  const recent = successes.current
  const rate = recent.length ? Math.round((100 * recent.filter(Boolean).length) / recent.length) : 0
  const lastReward = history.current.length ? history.current[history.current.length - 1] : null
  const busy = mode !== 'idle'

  return (
    <div className="mx-auto max-w-6xl px-3 pb-6 sm:px-4">
      <TierTabs tier={tier} onChange={setTier} />

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Choose a world">
        {levelsShown.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => {
              playSound('click')
              setEditTool(null)
              setLevel(l.id)
            }}
            aria-pressed={level === l.id}
            className={cx(
              'min-h-11 flex-none rounded-full border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60',
              level === l.id ? 'border-amber-400 bg-amber-500/20 text-amber-200' : 'border-white/15 text-slate-200',
            )}
          >
            {l.name}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div ref={boardRef} className="scroll-mt-20">
          <Panel>
            <GridBoard
              world={world}
              Q={Qref.current}
              pos={pos.current}
              trail={trail.current}
              flash={flash.current}
              showMap={showMap}
              showNumbers={rank >= 3}
              selected={selected}
              version={tick}
              onCell={onCellTap}
            />
            <p className="mt-2 min-h-[3rem] text-[15px] text-slate-200" aria-live="polite">
              {note}
            </p>
            {level === 'own' && (
              <div className="mt-2">
                <p className="mb-1 text-sm font-semibold text-slate-300">Build tools (tap a square):</p>
                <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Build tool">
                  {(['wall', 'lava', 'goal', 'empty'] as EditTool[]).map((t) => (
                    <Btn key={t} pressed={editTool === t} onClick={() => setEditTool((x) => (x === t ? null : t))} className="px-1 text-sm">
                      {t === 'wall' ? 'Wall' : t === 'lava' ? 'Lava' : t === 'goal' ? 'Cookie' : 'Clear'}
                    </Btn>
                  ))}
                </div>
                {optimal < 0 && <p className="mt-2 text-sm font-semibold text-rose-300">There is no safe way to the cookie. Clear a wall or some lava.</p>}
              </div>
            )}
          </Panel>
          </div>

          <Panel title="Teach by rewards">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Btn kind="primary" onClick={tryOnce} disabled={busy || optimal < 0}>
                Try once
              </Btn>
              <Btn pressed={autoTrain} onClick={toggleAuto} disabled={(busy && !autoTrain) || optimal < 0}>
                {autoTrain ? 'Stop' : 'Keep trying'}
              </Btn>
              <Btn onClick={() => trainFast(rank === 0 ? 20 : 50)} disabled={busy || optimal < 0}>
                Train {rank === 0 ? 20 : 50} fast
              </Btn>
              <Btn onClick={testRun} disabled={busy || optimal < 0}>
                Test run
              </Btn>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat label="Tries" value={String(episodes)} />
              <Stat label="Last reward" value={lastReward === null ? '–' : String(lastReward)} tone={lastReward !== null && lastReward > 0 ? 'good' : 'plain'} />
              <Stat label="Success (last 20)" value={`${rate}%`} tone={rate >= 80 ? 'good' : 'plain'} />
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-slate-300 sm:grid-cols-4" aria-label="Rewards">
              <li>
                <span className="font-display font-bold text-emerald-400">+{REWARD.goal}</span> cookie
              </li>
              <li>
                <span className="font-display font-bold text-slate-100">{REWARD.step}</span> each move
              </li>
              <li>
                <span className="font-display font-bold text-rose-300">{REWARD.bump}</span> bump a wall
              </li>
              <li>
                <span className="font-display font-bold text-rose-300">{REWARD.lava}</span> lava
              </li>
            </ul>
            <EpisodeChart hist={history.current} version={episodes} />
          </Panel>
        </div>

        <div className="space-y-3">
          <Panel title="The robot’s brain settings">
            <div className="space-y-3">
              <Slider
                label="Curiosity (ε, epsilon)"
                value={epsilon}
                min={0}
                max={1}
                step={0.05}
                format={(v) => v.toFixed(2)}
                onChange={setEpsilon}
                hint="How often it tries a random move instead of the best one it knows."
              />
              <Slider label="Robot speed" value={speed} min={2} max={60} step={1} format={(v) => `${v} moves/s`} onChange={setSpeed} />
              {rank >= 2 && (
                <>
                  <Slider
                    label="Learning rate (α, alpha)"
                    value={alpha}
                    min={0.05}
                    max={1}
                    step={0.05}
                    format={(v) => v.toFixed(2)}
                    onChange={setAlpha}
                    hint="How much one new experience changes what it believed."
                  />
                  <Slider
                    label="Patience (γ, gamma)"
                    value={gamma}
                    min={0.5}
                    max={0.99}
                    step={0.01}
                    format={(v) => v.toFixed(2)}
                    onChange={setGamma}
                    hint="How much future rewards count. Low = it only cares about now."
                  />
                </>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Btn pressed={showMap} onClick={() => setShowMap((m) => !m)} className="text-sm">
                  {showMap ? 'Hide its map' : 'Show its map'}
                </Btn>
                {rank >= 2 ? (
                  <Btn pressed={icy} onClick={() => setIcy((v) => !v)} className="text-sm">
                    Icy floor {icy ? 'on' : 'off'}
                  </Btn>
                ) : (
                  <Btn onClick={() => resetBrain(world)} disabled={busy} className="text-sm">
                    Forget everything
                  </Btn>
                )}
              </div>
              {rank >= 2 && (
                <Btn onClick={() => resetBrain(world)} disabled={busy} className="w-full text-sm">
                  Forget everything (new brain)
                </Btn>
              )}
            </div>
            <QPanel Q={Qref.current} world={world} selected={selected} version={tick} />
          </Panel>

          <Panel title={`Missions · ${tier}`}>
            <MissionList missions={missions} done={ms.done} />
          </Panel>
        </div>
      </div>

      {rank >= 3 && <WalkerLab onBest={(d) => setWalkerBest((b) => Math.max(b, d))} />}

      <MissionDone mission={ms.justDone} onClose={ms.dismiss} hold={holdMissions} />
    </div>
  )
}

// ── The grid ───────────────────────────────────────────────────────────

const ARROW: Record<Action, [number, number]> = { 0: [0, -1], 1: [1, 0], 2: [0, 1], 3: [-1, 0] }

function GridBoard({
  world,
  Q,
  pos,
  trail,
  flash,
  showMap,
  showNumbers,
  selected,
  version,
  onCell,
}: {
  world: GridWorld
  Q: Float64Array
  pos: number
  trail: number[]
  flash: Flash | null
  showMap: boolean
  showNumbers: boolean
  selected: number | null
  version: number
  onCell: (i: number) => void
}) {
  const [wrap, width] = useElementWidth<HTMLDivElement>()
  const canvas = useRef<HTMLCanvasElement>(null)
  const size = Math.min(width || 320, 460)
  const cell = size / Math.max(world.w, world.h)
  const W = cell * world.w
  const H = cell * world.h

  useEffect(() => {
    const c = canvas.current
    if (!c || !size) return
    const ctx = fitCanvas(c, W, H)
    if (!ctx) return
    ctx.clearRect(0, 0, W, H)
    // Value range for the heat map.
    let lo = Infinity
    let hi = -Infinity
    const vals: number[] = []
    for (let s = 0; s < world.cells.length; s++) {
      const known = Q[s * 4] !== 0 || Q[s * 4 + 1] !== 0 || Q[s * 4 + 2] !== 0 || Q[s * 4 + 3] !== 0
      const v = known && world.cells[s] === 'empty' ? maxQ(Q, s) : NaN
      vals.push(v)
      if (!Number.isNaN(v)) {
        lo = Math.min(lo, v)
        hi = Math.max(hi, v)
      }
    }
    for (let s = 0; s < world.cells.length; s++) {
      const x = (s % world.w) * cell
      const y = Math.floor(s / world.w) * cell
      const kind = world.cells[s]
      if (kind === 'wall') ctx.fillStyle = '#3A4766'
      else if (kind === 'lava') ctx.fillStyle = '#B42318'
      else if (kind === 'goal') ctx.fillStyle = '#14532D'
      else ctx.fillStyle = '#111C32'
      ctx.fillRect(x, y, cell, cell)
      if (kind === 'empty' && showMap && !Number.isNaN(vals[s]) && hi > lo) {
        const t = (vals[s] - lo) / (hi - lo)
        ctx.fillStyle = t >= 0.5 ? `rgba(252,104,24,${0.12 + (t - 0.5) * 1.3})` : `rgba(0,184,212,${0.12 + (0.5 - t) * 0.9})`
        ctx.fillRect(x, y, cell, cell)
      }
      if (kind === 'lava') {
        ctx.fillStyle = '#F97316'
        for (let k = 0; k < 3; k++) {
          ctx.beginPath()
          ctx.arc(x + cell * (0.25 + k * 0.25), y + cell * (0.55 + (k % 2) * 0.12), cell * 0.08, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      if (kind === 'wall') {
        ctx.strokeStyle = 'rgba(255,255,255,.12)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, y + cell / 2)
        ctx.lineTo(x + cell, y + cell / 2)
        ctx.moveTo(x + cell / 2, y)
        ctx.lineTo(x + cell / 2, y + cell / 2)
        ctx.stroke()
      }
      if (kind === 'goal') {
        ctx.font = `${Math.round(cell * 0.6)}px system-ui, "Apple Color Emoji", "Noto Color Emoji", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('🍪', x + cell / 2, y + cell / 2 + 1)
      }
      // Best-move arrows.
      if (kind === 'empty' && showMap && !Number.isNaN(vals[s])) {
        const a = argmaxAction(Q, s)
        const [dx, dy] = ARROW[a]
        const cxp = x + cell / 2
        const cyp = y + cell / 2
        const L = cell * 0.26
        ctx.strokeStyle = 'rgba(238,242,248,.75)'
        ctx.fillStyle = 'rgba(238,242,248,.75)'
        ctx.lineWidth = Math.max(1.5, cell * 0.05)
        ctx.beginPath()
        ctx.moveTo(cxp - dx * L * 0.6, cyp - dy * L * 0.6)
        ctx.lineTo(cxp + dx * L, cyp + dy * L)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(cxp + dx * L * 1.35, cyp + dy * L * 1.35)
        ctx.lineTo(cxp + dx * L * 0.7 - dy * L * 0.45, cyp + dy * L * 0.7 + dx * L * 0.45)
        ctx.lineTo(cxp + dx * L * 0.7 + dy * L * 0.45, cyp + dy * L * 0.7 - dx * L * 0.45)
        ctx.fill()
        if (showNumbers && cell >= 40) {
          ctx.font = `600 ${Math.max(9, Math.round(cell * 0.2))}px system-ui, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'alphabetic'
          ctx.fillStyle = '#EEF2F8'
          ctx.fillText(vals[s].toFixed(0), cxp, y + cell - 4)
        }
      }
      ctx.strokeStyle = 'rgba(255,255,255,.08)'
      ctx.lineWidth = 1
      ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1)
    }
    // Start marker.
    const sx = (world.start % world.w) * cell
    const sy = Math.floor(world.start / world.w) * cell
    ctx.strokeStyle = 'rgba(255,168,120,.6)'
    ctx.setLineDash([4, 4])
    ctx.strokeRect(sx + 3, sy + 3, cell - 6, cell - 6)
    ctx.setLineDash([])
    // Trail.
    if (trail.length > 1) {
      ctx.strokeStyle = 'rgba(255,209,102,.55)'
      ctx.lineWidth = Math.max(2, cell * 0.06)
      ctx.beginPath()
      trail.forEach((s, i) => {
        const px = (s % world.w) * cell + cell / 2
        const py = Math.floor(s / world.w) * cell + cell / 2
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      })
      ctx.stroke()
    }
    // Selected square.
    if (selected !== null) {
      ctx.strokeStyle = '#FFD166'
      ctx.lineWidth = 3
      ctx.strokeRect((selected % world.w) * cell + 1.5, Math.floor(selected / world.w) * cell + 1.5, cell - 3, cell - 3)
    }
    // Robot.
    const rx = (pos % world.w) * cell + cell / 2
    const ry = Math.floor(pos / world.w) * cell + cell / 2
    const R = cell * 0.3
    ctx.fillStyle = '#FC6818'
    ctx.beginPath()
    ctx.arc(rx, ry, R, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#0A1120'
    ctx.beginPath()
    ctx.arc(rx - R * 0.35, ry - R * 0.1, R * 0.16, 0, Math.PI * 2)
    ctx.arc(rx + R * 0.35, ry - R * 0.1, R * 0.16, 0, Math.PI * 2)
    ctx.fill()
    // Reward pop.
    if (flash) {
      ctx.font = `700 ${Math.max(12, Math.round(cell * 0.3))}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = flash.r > 0 ? '#4ADE80' : flash.r <= -5 ? '#FDA4AF' : '#FFD166'
      ctx.fillText(`${flash.r > 0 ? '+' : ''}${flash.r}`, rx, ry - R - cell * 0.15)
      if (flash.explored) {
        ctx.fillStyle = '#7DE3F4'
        ctx.fillText('?', rx + R + cell * 0.12, ry - R * 0.6)
      }
    }
  }, [world, Q, pos, trail, flash, showMap, showNumbers, selected, version, size, cell, W, H])

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const gx = Math.floor(((e.clientX - rect.left) / rect.width) * world.w)
    const gy = Math.floor(((e.clientY - rect.top) / rect.height) * world.h)
    if (gx < 0 || gy < 0 || gx >= world.w || gy >= world.h) return
    onCell(gy * world.w + gx)
  }

  const rx = (pos % world.w) + 1
  const ry = Math.floor(pos / world.w) + 1
  return (
    <div ref={wrap} className="flex justify-center">
      <canvas
        ref={canvas}
        onPointerDown={onPointerDown}
        style={{ width: W || 320, height: H || 320 }}
        className="touch-manipulation rounded-2xl"
        role="img"
        aria-label={`Grid world ${world.w} by ${world.h}. The robot is in column ${rx}, row ${ry}. Brighter orange squares are ones the robot has learned are closer to the cookie. Tap a square to see what the robot thinks of it.`}
      />
    </div>
  )
}

function argmaxAction(Q: Float64Array, s: number): Action {
  let best: Action = 0
  for (const a of [1, 2, 3] as Action[]) if (Q[s * 4 + a] > Q[s * 4 + best]) best = a
  return best
}

function QPanel({ Q, world, selected, version }: { Q: Float64Array; world: GridWorld; selected: number | null; version: number }) {
  void version
  if (selected === null || world.cells[selected] !== 'empty') {
    return <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">Tap an empty square on the grid to see the robot’s Q-values there — how good it thinks each move is.</p>
  }
  const vals = [0, 1, 2, 3].map((a) => Q[selected * 4 + a])
  const best = argmaxAction(Q, selected)
  const symbols = ['↑', '→', '↓', '←']
  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-sm font-semibold text-slate-200">
        Q-values at column {(selected % world.w) + 1}, row {Math.floor(selected / world.w) + 1}
      </p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {vals.map((v, a) => (
          <div key={a} className={cx('rounded-xl border px-2 py-1 text-center', a === best && vals.some((x) => x !== 0) ? 'border-amber-400 bg-amber-500/15' : 'border-white/10')}>
            <div className="text-lg text-slate-200" aria-hidden>
              {symbols[a]}
            </div>
            <div className="font-display text-base font-bold tabular-nums text-white">{v.toFixed(1)}</div>
            <div className="text-[11px] text-slate-400">{ACTION_NAMES[a]}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">After each move: Q ← Q + α·(reward + γ·best Q of the next square − Q).</p>
    </div>
  )
}

function EpisodeChart({ hist, version }: { hist: number[]; version: number }) {
  const [wrap, width] = useElementWidth<HTMLDivElement>()
  const canvas = useRef<HTMLCanvasElement>(null)
  const H = 100
  useEffect(() => {
    const c = canvas.current
    if (!c || !width) return
    const ctx = fitCanvas(c, width, H)
    if (!ctx) return
    ctx.fillStyle = '#0D1628'
    ctx.fillRect(0, 0, width, H)
    if (!hist.length) {
      ctx.fillStyle = '#6E7888'
      ctx.font = '13px system-ui, sans-serif'
      ctx.fillText('Each try’s total reward appears here', 10, H / 2 + 4)
      return
    }
    const lo = Math.min(-40, ...hist)
    const hi = Math.max(35, ...hist)
    const y = (v: number) => H - 6 - ((v - lo) / (hi - lo)) * (H - 12)
    ctx.strokeStyle = 'rgba(255,255,255,.18)'
    ctx.setLineDash([3, 4])
    ctx.beginPath()
    ctx.moveTo(0, y(0))
    ctx.lineTo(width, y(0))
    ctx.stroke()
    ctx.setLineDash([])
    const n = hist.length
    const bw = Math.max(1, (width - 8) / Math.max(n, 20))
    hist.forEach((v, i) => {
      ctx.fillStyle = v > 0 ? 'rgba(74,222,128,.7)' : 'rgba(0,184,212,.55)'
      const x = 4 + i * bw
      ctx.fillRect(x, Math.min(y(0), y(v)), Math.max(1, bw - 1), Math.abs(y(v) - y(0)))
    })
    // Moving average of the last 10 tries.
    ctx.strokeStyle = '#FF8A4C'
    ctx.lineWidth = 2
    ctx.beginPath()
    hist.forEach((_, i) => {
      const from = Math.max(0, i - 9)
      const slice = hist.slice(from, i + 1)
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length
      const x = 4 + i * bw + bw / 2
      if (i === 0) ctx.moveTo(x, y(avg))
      else ctx.lineTo(x, y(avg))
    })
    ctx.stroke()
  }, [hist, version, width])
  return (
    <div ref={wrap} className="mt-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Reward per try — orange line is the average</p>
      <canvas ref={canvas} style={{ width: '100%', height: H }} className="rounded-xl" role="img" aria-label={`Reward of each of ${hist.length} tries. Latest ${hist.length ? hist[hist.length - 1] : 'none'}.`} />
    </div>
  )
}

// ── Legend: the walker ─────────────────────────────────────────────────

function WalkerLab({ onBest }: { onBest: (d: number) => void }) {
  const [gait, setGait] = useState<Gait>(RANDOM_START)
  const [best, setBest] = useState(() => simulate(RANDOM_START, WALK_SECONDS, false).distance)
  const [trials, setTrials] = useState(0)
  const [boldness, setBoldness] = useState(0.6)
  const [learning, setLearning] = useState(false)
  const [lastTry, setLastTry] = useState<number | null>(null)
  const histRef = useRef<number[]>([])
  const rng = useRef(makeRng(21))
  const frames = useMemo<WalkFrame[]>(() => simulate(gait, WALK_SECONDS, true).frames, [gait])

  const gaitRef = useRef(gait)
  gaitRef.current = gait
  const bestRef = useRef(best)
  bestRef.current = best
  const boldRef = useRef(boldness)
  boldRef.current = boldness

  useEffect(() => {
    onBest(best)
  }, [best, onBest])

  useEffect(() => {
    if (!learning) return
    const id = window.setInterval(() => {
      // A few random changes per tick; keep any that walks further (hill climbing).
      let g = gaitRef.current
      let b = bestRef.current
      let last = 0
      for (let k = 0; k < 4; k++) {
        const cand = mutate(g, boldRef.current, rng.current)
        const d = simulate(cand, WALK_SECONDS, false).distance
        last = d
        histRef.current.push(Math.max(b, d))
        if (d > b) {
          b = d
          g = cand
        }
      }
      if (histRef.current.length > 300) histRef.current = histRef.current.slice(-300)
      setTrials((t) => t + 4)
      setLastTry(last)
      if (g !== gaitRef.current) {
        setGait(g)
        setBest(b)
        playSound('click')
      }
      if (b >= WALK_TARGET_M * 1.6) setLearning(false)
    }, 220)
    const onHide = () => {
      if (document.hidden) setLearning(false)
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [learning])

  const restart = () => {
    playSound('click')
    setLearning(false)
    setGait(RANDOM_START)
    setBest(simulate(RANDOM_START, WALK_SECONDS, false).distance)
    setTrials(0)
    setLastTry(null)
    histRef.current = []
  }

  return (
    <Panel title="Legend: teach a walker to walk" className="mt-3">
      <p className="text-[15px] text-slate-200">
        This robot has two legs and no idea how to use them. Its “policy” is five numbers: how far each hip swings, the timing between the legs, how much
        and when each knee bends, and how fast it steps. Learning = change the numbers a little at random, test for 8 seconds, keep the change only if it
        walked further. That is <strong>policy search</strong>.
      </p>
      <WalkerView frames={frames} />
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Best distance" value={`${best.toFixed(2)} m`} tone={best >= WALK_TARGET_M ? 'good' : best < 0 ? 'bad' : 'plain'} />
        <Stat label="Last try" value={lastTry === null ? '–' : `${lastTry.toFixed(2)} m`} />
        <Stat label="Tries" value={String(trials)} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Btn kind="primary" onClick={() => setLearning((l) => !l)}>
          {learning ? 'Pause learning' : trials ? 'Keep learning' : 'Start learning'}
        </Btn>
        <Btn onClick={restart}>Start over</Btn>
      </div>
      <div className="mt-3">
        <Slider
          label="Boldness of each change"
          value={boldness}
          min={0.1}
          max={1.5}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={setBoldness}
          hint="Small changes polish a gait; big ones can jump to a new way of walking."
        />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-slate-300 sm:grid-cols-5">
        <div>
          <dt className="text-slate-400">Hip swing</dt>
          <dd className="font-display font-bold text-white">{((gait.amp * 180) / Math.PI).toFixed(0)}°</dd>
        </div>
        <div>
          <dt className="text-slate-400">Leg timing</dt>
          <dd className="font-display font-bold text-white">{((gait.legPhase * 180) / Math.PI).toFixed(0)}°</dd>
        </div>
        <div>
          <dt className="text-slate-400">Knee bend</dt>
          <dd className="font-display font-bold text-white">{Math.round(gait.lift * 100)}%</dd>
        </div>
        <div>
          <dt className="text-slate-400">Knee timing</dt>
          <dd className="font-display font-bold text-white">{((gait.liftPhase * 180) / Math.PI).toFixed(0)}°</dd>
        </div>
        <div>
          <dt className="text-slate-400">Steps/s</dt>
          <dd className="font-display font-bold text-white">{gait.freq.toFixed(2)}</dd>
        </div>
      </dl>
      <BestChart hist={histRef.current} version={trials} />
      <p className="mt-2 text-xs text-slate-400">
        Simplified physics: the lowest foot grips the ground and the body moves past it. Real walking robots learn with full physics simulators and millions of
        tries — the idea is the same.
      </p>
    </Panel>
  )
}

function WalkerView({ frames }: { frames: WalkFrame[] }) {
  const [wrap, width] = useElementWidth<HTMLDivElement>()
  const canvas = useRef<HTMLCanvasElement>(null)
  const H = 170
  useEffect(() => {
    const c = canvas.current
    if (!c || !width || !frames.length) return
    const reduced = prefersReducedMotion()
    let raf = 0
    let i = reduced ? frames.length - 1 : 0
    const scale = 70 // px per metre
    const draw = () => {
      const ctx = fitCanvas(c, width, H)
      if (!ctx) return
      const f = frames[i]
      const camX = f.hipX
      const groundY = H - 24
      ctx.fillStyle = '#0D1628'
      ctx.fillRect(0, 0, width, H)
      // Ground with metre marks that scroll.
      ctx.strokeStyle = 'rgba(255,255,255,.25)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, groundY)
      ctx.lineTo(width, groundY)
      ctx.stroke()
      ctx.fillStyle = '#A7B0C0'
      ctx.font = '11px system-ui, sans-serif'
      ctx.textAlign = 'center'
      const left = camX - width / 2 / scale
      for (let m = Math.floor(left); m < left + width / scale + 1; m++) {
        const x = width / 2 + (m - camX) * scale
        ctx.fillRect(x - 0.5, groundY, 1, 6)
        ctx.fillText(`${m} m`, x, groundY + 18)
      }
      // Target line.
      const tx = width / 2 + (WALK_TARGET_M - camX) * scale
      ctx.strokeStyle = '#4ADE80'
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(tx, 10)
      ctx.lineTo(tx, groundY)
      ctx.stroke()
      ctx.setLineDash([])
      // Body.
      const hipPx = width / 2
      const hipPy = groundY - f.hipY * scale
      f.legs.forEach((leg, k) => {
        const planted = f.stance === k || f.stance === 2
        ctx.strokeStyle = k === 0 ? '#FC6818' : '#00B8D4'
        ctx.lineWidth = 6
        ctx.lineCap = 'round'
        // Knee bends outward when the leg is shortened.
        const fx = hipPx + leg.fx * scale
        const fy = hipPy + leg.fy * scale
        const bend = Math.sqrt(Math.max(0, (LEG / 2) ** 2 - (leg.len / 2) ** 2)) * scale
        const mx = (hipPx + fx) / 2 + Math.cos(leg.theta) * bend
        const my = (hipPy + fy) / 2 - Math.sin(leg.theta) * bend
        ctx.beginPath()
        ctx.moveTo(hipPx, hipPy)
        ctx.lineTo(mx, my)
        ctx.lineTo(fx, fy)
        ctx.stroke()
        ctx.fillStyle = planted ? '#FFD166' : '#6E7888'
        ctx.beginPath()
        ctx.arc(fx, fy, 4, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.fillStyle = '#EEF2F8'
      ctx.fillRect(hipPx - 18, hipPy - 34, 36, 30)
      ctx.fillStyle = '#0A1120'
      ctx.beginPath()
      ctx.arc(hipPx - 6, hipPy - 22, 3, 0, Math.PI * 2)
      ctx.arc(hipPx + 8, hipPy - 22, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#EEF2F8'
      ctx.textAlign = 'left'
      ctx.font = '600 12px system-ui, sans-serif'
      ctx.fillText(`t = ${f.t.toFixed(1)} s   distance ${f.hipX.toFixed(2)} m`, 8, 16)
    }
    const loop = () => {
      draw()
      i += 1
      if (i >= frames.length) i = 0
      raf = requestAnimationFrame(loop)
    }
    if (reduced) draw()
    else raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [frames, width])
  const last = frames.length ? frames[frames.length - 1].hipX : 0
  return (
    <div ref={wrap} className="mt-3">
      <canvas ref={canvas} style={{ width: '100%', height: H }} className="rounded-2xl" role="img" aria-label={`Walking robot replay: the best gait so far walks ${last.toFixed(2)} metres in ${WALK_SECONDS} seconds (${(DT * 1000).toFixed(0)} ms physics steps).`} />
    </div>
  )
}

function BestChart({ hist, version }: { hist: number[]; version: number }) {
  const [wrap, width] = useElementWidth<HTMLDivElement>()
  const canvas = useRef<HTMLCanvasElement>(null)
  const H = 80
  useEffect(() => {
    const c = canvas.current
    if (!c || !width) return
    const ctx = fitCanvas(c, width, H)
    if (!ctx) return
    ctx.fillStyle = '#0D1628'
    ctx.fillRect(0, 0, width, H)
    const lo = Math.min(-2, ...hist)
    const hi = Math.max(WALK_TARGET_M + 1, ...hist)
    const y = (v: number) => H - 6 - ((v - lo) / (hi - lo)) * (H - 12)
    ctx.strokeStyle = '#4ADE80'
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(0, y(WALK_TARGET_M))
    ctx.lineTo(width, y(WALK_TARGET_M))
    ctx.stroke()
    ctx.setLineDash([])
    if (hist.length < 2) return
    ctx.strokeStyle = '#FF8A4C'
    ctx.lineWidth = 2
    ctx.beginPath()
    hist.forEach((v, i) => {
      const x = 4 + (i / (hist.length - 1)) * (width - 8)
      if (i === 0) ctx.moveTo(x, y(v))
      else ctx.lineTo(x, y(v))
    })
    ctx.stroke()
  }, [hist, version, width])
  return (
    <div ref={wrap} className="mt-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Best distance so far — green line is the 3 m goal</p>
      <canvas ref={canvas} style={{ width: '100%', height: H }} className="rounded-xl" role="img" aria-label={`Best distance after ${hist.length} tries`} />
    </div>
  )
}
