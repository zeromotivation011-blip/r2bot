'use client'

// components/kids/games/maze-mapper/MazeMapperGameClient.tsx
// Maze Mapper (The Labyrinth) — the playable game, loaded with next/dynamic.
// The round rules live in ./game (MazeGame) and the simulation in ./sim; this
// file is the canvas, the controls and the debrief panel.

import { useCallback, useEffect, useReducer, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { RoundResult } from '@/components/kids/ui/GameShellClient'
import { primeAudio } from '@/lib/kids-audio'
import { MazeGame, PLANNER_NAMES, type Snapshot } from './game'
import { cellAt, drawScene, makeView, type RevealMode, type View } from './render'
import { LEGEND_DEFAULT, MAZES_PER_TIER, WRONG_SQUARE_COST, type AutoSettings, type PlannerId, type TierIndex } from './sim'

interface Props {
  tier: number
  onFinish: (r: RoundResult) => void
}

const BRIEF: Record<TierIndex, { title: string; steps: string[] }> = {
  0: {
    title: 'Cadet — drive and draw the map',
    steps: [
      'Your robot is lost in fog. Drive it with the arrows (or tap where you want to go).',
      'Each move fires 4 sensor beams. Beams paint floor (dark green) and walls (bright blocks).',
      'Find the green exit and drive out. Map 50% for 2 stars, 80% for 3 stars.',
    ],
  },
  1: {
    title: 'Pilot — the wall-follower trap',
    steps: [
      'Pick LEFT or RIGHT hand. The robot keeps that hand on a wall and walks — no thinking needed.',
      'Watch closely: if it comes back to the same spot facing the same way, it is looping forever.',
      'Hand-drive (a few moves only) to a better wall, then follow again. Escape with battery to spare.',
    ],
  },
  2: {
    title: 'Ace — frontier explorer + BFS escape',
    steps: [
      'Glowing squares are frontiers: the edge of the known map. Tap one (or press Nearest) to explore it.',
      'Each trip is planned with BFS — watch the ripple (wavefront) spread through the known map.',
      'When the exit appears, press Plan escape. Pressing Nearest every time ties the nearest-frontier robot (2 stars). Beat it for 3 stars: the exit is always in the east wall.',
    ],
  },
  3: {
    title: 'Legend — noisy sensors, slipping wheels',
    steps: [
      'One beam in five lies (off by a square) and some vanish. Wheels sometimes slip. Hatched squares are uncertain.',
      'Design the brain: scans per stop, how sure it must be (trust), the planner, and an east hunch (the exit is in the east wall).',
      `Mission: get out AND bring back a map you can trust. Mission cost = energy used + ${WRONG_SQUARE_COST} for every wrong square. 3 stars = a top-10% brain for this maze.`,
    ],
  },
}

function attemptsKey(tier: number): string {
  return `r2bot_maze_mapper_attempts_t${tier}`
}

function readNum(key: string, fallback: number): number {
  try {
    const v = sessionStorage.getItem(key)
    return v === null ? fallback : Number(v) || fallback
  } catch {
    return fallback
  }
}

function writeNum(key: string, v: number): void {
  try {
    sessionStorage.setItem(key, String(v))
  } catch {
    /* ignore */
  }
}

function loadSettings(): AutoSettings {
  try {
    const raw = sessionStorage.getItem('r2bot_maze_mapper_legend')
    if (raw) {
      const p = JSON.parse(raw) as Partial<AutoSettings>
      return {
        scans: Math.min(4, Math.max(1, Math.round(Number(p.scans)) || LEGEND_DEFAULT.scans)),
        trust: Math.min(0.9, Math.max(0.55, Math.round((Number(p.trust) || LEGEND_DEFAULT.trust) * 20) / 20)),
        planner: p.planner === 'astar' || p.planner === 'greedy' ? p.planner : 'bfs',
        eastBias: Math.min(2, Math.max(0, Math.round(Number(p.eastBias)) || 0)),
        frontierRule: 'straight',
      }
    }
  } catch {
    /* ignore */
  }
  return { ...LEGEND_DEFAULT }
}

function Btn({
  children,
  onClick,
  tone = 'ghost',
  pressed,
  disabled,
  label,
  className = '',
}: {
  children: ReactNode
  onClick: () => void
  tone?: 'primary' | 'ghost' | 'cyan' | 'green'
  pressed?: boolean
  disabled?: boolean
  label?: string
  className?: string
}) {
  const tones: Record<string, string> = {
    primary: 'bg-amber-400 text-slate-900 hover:bg-amber-300',
    ghost: 'border border-white/15 bg-white/5 text-white hover:bg-white/10',
    cyan: 'border border-cyan-300/50 bg-cyan-400/15 text-cyan-100 hover:bg-cyan-400/25',
    green: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={label}
      className={`min-h-[48px] rounded-2xl px-4 font-black transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]} ${pressed ? 'ring-2 ring-amber-300' : ''} ${className}`}
    >
      {children}
    </button>
  )
}

function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="flex rounded-xl border border-white/15 bg-white/5 p-1" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={`min-h-[44px] flex-1 rounded-lg px-2 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${value === o.v ? 'bg-cyan-400 text-slate-950' : 'text-white/75 hover:text-white'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function raceLesson(race: { algo: PlannerId; expanded: number; longer: number; maxExtra: number }[]): string {
  const by = (a: PlannerId) => race.find((r) => r.algo === a)
  const bfs = by('bfs')
  const astar = by('astar')
  const greedy = by('greedy')
  if (!bfs || !astar || !greedy) return ''
  const pct = Math.round((astar.expanded / Math.max(1, bfs.expanded)) * 100)
  const g = greedy.longer
    ? `Greedy checked the fewest (${greedy.expanded}) but took a longer route on ${greedy.longer} trip${greedy.longer === 1 ? '' : 's'}, once by ${greedy.maxExtra} extra steps: following only the guess walks it into dead ends.`
    : `Greedy checked the fewest (${greedy.expanded}) and was lucky here: it never took a longer route.`
  return `BFS and A* always find a shortest route. A* checked ${astar.expanded} squares, about ${pct}% of BFS’s ${bfs.expanded}, because its guess points it at the goal. ${g}`
}

const ARROW_ICON: Record<number, string> = { 0: 'M12 5l7 8H5z', 1: 'M19 12l-8 7V5z', 2: 'M12 19l-7-8h14z', 3: 'M5 12l8-7v14z' }

function DPad({ onMove, disabled }: { onMove: (d: number) => void; disabled: boolean }) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
  }, [])
  useEffect(() => stop, [stop])
  const pad = (d: number, name: string, cls: string) => (
    <button
      type="button"
      aria-label={`Drive ${name}`}
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault()
        primeAudio()
        onMove(d)
        stop()
        timer.current = setInterval(() => onMove(d), 190)
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onMove(d)
        }
      }}
      className={`flex h-12 w-12 touch-none sm:h-14 sm:w-14 select-none items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 active:scale-95 active:bg-amber-400 active:text-slate-900 disabled:opacity-40 ${cls}`}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <path d={ARROW_ICON[d]} fill="currentColor" />
      </svg>
    </button>
  )
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1.5" role="group" aria-label="Drive the robot">
      <span />
      {pad(0, 'up', '')}
      <span />
      {pad(3, 'left', '')}
      <span className="flex h-12 w-12 items-center justify-center rounded-full sm:h-14 sm:w-14 bg-white/5 text-xs font-bold text-white/40" aria-hidden>
        R2
      </span>
      {pad(1, 'right', '')}
      <span />
      {pad(2, 'down', '')}
      <span />
    </div>
  )
}

function Stat({ label, value, tone = 'text-white', className = '' }: { label: string; value: ReactNode; tone?: string; className?: string }) {
  return (
    <div className={`min-w-[64px] rounded-xl border border-white/10 bg-white/[0.04] px-2 py-1.5 sm:px-2.5 ${className}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-white/50">{label}</p>
      <p className={`font-display text-lg font-black leading-tight ${tone}`}>{value}</p>
    </div>
  )
}

export default function MazeMapperGameClient({ tier: tierProp, onFinish }: Props) {
  const tier = Math.max(0, Math.min(3, Math.round(tierProp))) as TierIndex
  const [, bump] = useReducer((x: number) => x + 1, 0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<View | null>(null)
  const [settings, setSettings] = useState<AutoSettings>(() => (typeof window === 'undefined' ? { ...LEGEND_DEFAULT } : loadSettings()))
  const [speed, setSpeed] = useState(1)
  const gameRef = useRef<MazeGame | null>(null)
  const finishedRef = useRef(false)

  if (gameRef.current === null && typeof window !== 'undefined') {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const idx = Math.min(MAZES_PER_TIER - 1, Math.max(0, readNum(`r2bot_maze_mapper_maze_t${tier}`, 0)))
    gameRef.current = new MazeGame(tier, idx, settings, reduced, () => bump())
  }
  const game = gameRef.current

  // MazeGame calls bump() on every change; the snapshot is re-read each render.
  const cur: Snapshot | null = game ? game.snapshot() : null

  // Canvas size.
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas || !game) return
    const resize = () => {
      const r = wrap.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.max(1, Math.round(r.width * dpr))
      canvas.height = Math.max(1, Math.round(r.height * dpr))
      viewRef.current = makeView(r.width, r.height, game.world.W, game.world.H)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [game])

  // Frame loop: animation + simulation; pauses when the tab is hidden.
  useEffect(() => {
    if (!game) return
    let raf = 0
    let last = performance.now()
    let hidden = document.hidden
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!hidden) {
        game.frame(dt)
        const canvas = canvasRef.current
        const v = viewRef.current
        const ctx = canvas?.getContext('2d')
        if (canvas && v && ctx) {
          const dpr = canvas.width / Math.max(1, v.w)
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          drawScene(ctx, v, game.world, game.scene, game.fx)
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const onVis = () => {
      hidden = document.hidden
      last = performance.now()
      if (hidden && game.running) {
        game.running = false
        game.following = false
        game.status = 'Paused while you were away.'
        bump()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [game])

  useEffect(() => {
    if (game) game.speed = speed
  }, [game, speed])

  // Keyboard.
  useEffect(() => {
    if (!game) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return
      if (document.querySelector('[role="dialog"]')) return
      if (game.phase === 'reveal') return
      const k = e.key
      const dirs: Record<string, number> = { ArrowUp: 0, w: 0, W: 0, ArrowRight: 1, d: 1, D: 1, ArrowDown: 2, s: 2, S: 2, ArrowLeft: 3, a: 3, A: 3 }
      if (tier <= 1 && k in dirs) {
        e.preventDefault()
        primeAudio()
        game.manualMove(dirs[k])
        return
      }
      if (tier === 0 && (k === 'h' || k === 'H')) game.showHint()
      if (tier === 1) {
        if (k === 'l' || k === 'L') game.setHand('left')
        if (k === 'r' || k === 'R') game.setHand('right')
        if (k === 'f' || k === 'F') (game.following ? game.stopFollower() : game.startFollower())
      }
      if (tier === 2) {
        if (k === 'n' || k === 'N') game.nearestFrontier()
        if (k === 'Tab' && game.phase === 'play' && e.shiftKey === false && (e.target as HTMLElement | null)?.tagName === 'CANVAS') {
          e.preventDefault()
          game.cycleFrontier()
        }
        if (k === 'c' || k === 'C') game.cycleFrontier()
        if (k === 'Enter' && (e.target as HTMLElement | null)?.tagName === 'CANVAS') game.goSelected()
        if (k === 'g' || k === 'G') game.goSelected()
        if (k === 'a' || k === 'A') game.toggleAuto()
        if (k === 'e' || k === 'E') game.planEscape()
      }
      if (tier === 3 && k === ' ' && (e.target as HTMLElement | null)?.tagName !== 'BUTTON') {
        e.preventDefault()
        game.toggleRun()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [game, tier])

  const onPointer = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!game || !viewRef.current) return
      primeAudio()
      const r = e.currentTarget.getBoundingClientRect()
      const c = cellAt(viewRef.current, game.world.W, game.world.H, e.clientX - r.left, e.clientY - r.top)
      if (c) game.tapCell(c.x, c.y)
    },
    [game],
  )

  const changeSettings = (p: Partial<AutoSettings>) => {
    const next = { ...settings, ...p }
    setSettings(next)
    try {
      sessionStorage.setItem('r2bot_maze_mapper_legend', JSON.stringify(next))
    } catch {
      /* ignore */
    }
    game?.setSettings(next)
  }

  const sendResult = () => {
    if (!game || !game.outcome || finishedRef.current) return
    finishedRef.current = true
    const o = game.outcome
    const prev = readNum(attemptsKey(tier), 0)
    let attempts = prev + 1
    if (o.stars > 0) writeNum(attemptsKey(tier), 0)
    else writeNum(attemptsKey(tier), attempts)
    if (o.stars === 0) attempts = 0
    // The results card is centred on the whole game column, which on a phone is
    // taller than the screen: bring the column's middle to the middle first.
    const root = rootRef.current
    if (root) {
      const r = root.getBoundingClientRect()
      window.scrollTo({ top: Math.max(0, window.scrollY + r.top + r.height / 2 - window.innerHeight / 2), behavior: 'auto' })
    }
    onFinish({
      stars: o.stars,
      score: o.score,
      scoreLabel: o.scoreLabel,
      lowerIsBetter: o.lowerIsBetter,
      message: o.headline,
      badges: o.stars > 0 ? ['map-maker'] : undefined,
      attempts: o.stars > 0 ? attempts : undefined,
    })
  }

  const scrollToMaze = () => {
    // On a phone the Run button sits below the settings; bring the maze back into view.
    const el = wrapRef.current
    if (el && window.matchMedia('(max-width: 1023px)').matches) el.scrollIntoView({ block: 'start', behavior: 'auto' })
  }

  const retry = () => {
    if (!game) return
    if (game.outcome && game.outcome.stars === 0) writeNum(attemptsKey(tier), readNum(attemptsKey(tier), 0) + 1)
    finishedRef.current = false
    game.reset()
  }

  const pickMaze = (i: number) => {
    if (!game) return
    writeNum(`r2bot_maze_mapper_maze_t${tier}`, i)
    game.setMaze(i)
  }

  const aspect = game ? game.world.W / game.world.H : 1
  if (!game || !cur) return <div className="h-[420px] rounded-3xl bg-white/5" />

  const brief = BRIEF[tier]
  const batteryPct = Math.max(0, Math.min(1, cur.battery / cur.batteryMax))
  const o = cur.outcome

  return (
    <div ref={rootRef} className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* On phones both columns dissolve (max-lg:contents) so the controls can sit right under the maze. */}
      <div className="flex min-w-0 flex-col gap-2 max-lg:contents">
        {/* Live stats */}
        <div className="flex flex-wrap gap-1.5 max-lg:order-1 sm:gap-2" aria-label="Robot status">
          <div className="min-w-[96px] flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/50">Battery</p>
            <div className="mt-1 h-3 overflow-hidden rounded-full bg-white/10" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(batteryPct * 100)} aria-label="Battery">
              <div className={`h-full rounded-full transition-[width] duration-200 ${batteryPct > 0.4 ? 'bg-emerald-400' : batteryPct > 0.15 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${batteryPct * 100}%` }} />
            </div>
            <p className="mt-0.5 text-xs font-bold text-white/70">
              {Math.round(cur.battery)} / {cur.batteryMax}
            </p>
          </div>
          <Stat label="Moves" value={cur.steps} />
          {tier === 0 && <Stat label="Mapped" value={`${Math.round(cur.coverage * 100)}%`} tone="text-cyan-200" />}
          {tier === 1 && <Stat label="Hand-drive" value={cur.manualLeft} tone="text-amber-200" />}
          {tier === 1 && <Stat label="Loops" value={cur.loops} tone={cur.loops ? 'text-amber-300' : 'text-white'} />}
          {tier === 2 && <Stat label="3★: beat" value={cur.baseline} tone="text-amber-200" />}
          {tier === 2 && <Stat label="Frontiers" value={cur.frontierCount} tone="text-cyan-200" />}
          {tier === 3 && <Stat label="Bumps / slips" value={`${cur.bumps} / ${cur.slips}`} tone="text-rose-200" />}
          {tier === 3 && <Stat label="3★ cost ≤" value={cur.legendThree === null ? '…' : Math.round(cur.legendThree)} tone="text-amber-200" />}
          <Stat label="Exit" value={cur.exitSeen ? 'Seen' : '???'} tone={cur.exitSeen ? 'text-emerald-300' : 'text-white/60'} className={tier === 1 ? 'max-sm:hidden' : ''} />
        </div>

        {/* The maze */}
        <div
          className={`relative mx-auto w-full max-lg:order-2 lg:max-w-[calc(62vh*var(--mm-aspect))] ${tier <= 1 ? 'max-w-[calc(38vh*var(--mm-aspect))]' : 'max-w-[calc(46vh*var(--mm-aspect))]'}`}
          style={{ '--mm-aspect': aspect.toFixed(3) } as CSSProperties}
        >
          <div ref={wrapRef} className="relative w-full overflow-hidden rounded-3xl border border-teal-300/20 bg-[#0A1120] shadow-[0_8px_24px_rgba(0,0,0,.45)]" style={{ aspectRatio: `${game.world.W} / ${game.world.H}` }}>
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full touch-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
              tabIndex={0}
              role="img"
              aria-label={`Maze map, ${game.world.W} by ${game.world.H} squares. Robot at column ${game.world.x() + 1}, row ${game.world.y() + 1}. ${cur.exitSeen ? 'Exit seen.' : 'Exit not found yet.'}`}
              onPointerDown={onPointer}
            />
            {cur.phase === 'brief' && (
              <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-slate-950/80 p-3 text-center text-sm font-bold text-white/85 backdrop-blur-sm">
                Fog hides the maze. Only what the sensor sees gets drawn.
              </div>
            )}
          </div>
          {cur.phase === 'reveal' && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-bold text-white/70">
              <Seg<RevealMode>
                label="What to show"
                value={game.scene.reveal}
                onChange={(m) => game.setReveal(m)}
                options={[
                  { v: 'map', label: 'Robot’s map' },
                  { v: 'compare', label: 'Map vs truth' },
                  { v: 'truth', label: 'Real maze' },
                ]}
              />
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-5 rounded bg-emerald-500" /> shortest route
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-5 rounded bg-orange-400" /> robot’s route
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="font-black text-rose-400">✕</span> wrong on the map
              </span>
            </div>
          )}
        </div>
        <p className="min-h-[3rem] rounded-2xl border max-lg:order-4 border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white/85" aria-live="polite">
          {cur.status}
        </p>
      </div>

      {/* Side panel */}
      <aside className="flex flex-col gap-3 max-lg:contents">
        {cur.phase !== 'reveal' && (
          <section className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 max-lg:order-5">
            <h2 className="font-display text-lg font-black text-amber-300">{brief.title}</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-white/80">
              {brief.steps.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
            {cur.phase === 'brief' && (
              <div className="mt-3">
                <p className="text-xs font-bold uppercase tracking-wide text-white/50">Maze (same maze = fair score)</p>
                <div className="mt-1">
                  <Seg<number> label="Choose a maze" value={game.mazeIdx} onChange={pickMaze} options={Array.from({ length: MAZES_PER_TIER }, (_, i) => ({ v: i, label: `Maze ${i + 1}` }))} />
                </div>
              </div>
            )}
          </section>
        )}

        {/* Legend brain designer */}
        {tier === 3 && cur.phase === 'brief' && (
          <section className="space-y-3 rounded-[20px] border border-cyan-300/20 bg-cyan-400/[0.04] p-4 max-lg:order-6" aria-label="Robot brain settings">
            <div>
              <p className="text-sm font-black text-white">Scans at every stop</p>
              <p className="text-xs text-white/60">More looks = more evidence per square. Each extra scan costs 0.5 energy.</p>
              <div className="mt-1">
                <Seg<number> label="Scans per stop" value={settings.scans} onChange={(v) => changeSettings({ scans: v })} options={[1, 2, 3, 4].map((v) => ({ v, label: String(v) }))} />
              </div>
            </div>
            <div>
              <label htmlFor="mm-trust" className="text-sm font-black text-white">
                Trust level: {Math.round(settings.trust * 100)}% sure
              </label>
              <p className="text-xs text-white/60">How sure before a square counts as wall or floor. Low = fast but fooled by one bad echo.</p>
              <input
                id="mm-trust"
                type="range"
                min={55}
                max={90}
                step={5}
                value={Math.round(settings.trust * 100)}
                onChange={(e) => changeSettings({ trust: Number(e.target.value) / 100 })}
                className="mt-2 h-11 w-full accent-amber-400"
              />
            </div>
            <div>
              <p className="text-sm font-black text-white">Path planner</p>
              <p className="text-xs text-white/60">Thinking costs 0.05 energy per square checked.</p>
              <div className="mt-1">
                <Seg<PlannerId>
                  label="Planner"
                  value={settings.planner}
                  onChange={(v) => changeSettings({ planner: v })}
                  options={[
                    { v: 'bfs', label: 'BFS' },
                    { v: 'astar', label: 'A*' },
                    { v: 'greedy', label: 'Greedy' },
                  ]}
                />
              </div>
            </div>
            <div>
              <p className="text-sm font-black text-white">East hunch</p>
              <p className="text-xs text-white/60">The exit is somewhere in the east (right) wall. How much should the robot prefer frontiers on that side?</p>
              <div className="mt-1">
                <Seg<number>
                  label="East hunch"
                  value={settings.eastBias}
                  onChange={(v) => changeSettings({ eastBias: v })}
                  options={[
                    { v: 0, label: 'None' },
                    { v: 1, label: 'Some' },
                    { v: 2, label: 'Strong' },
                  ]}
                />
              </div>
            </div>
            <Btn tone="primary" className="w-full text-lg" onClick={() => (primeAudio(), scrollToMaze(), game.start())}>
              Run this brain ▶
            </Btn>
          </section>
        )}

        {/* Controls */}
        {cur.phase !== 'reveal' && (
          <section className="order-first rounded-[20px] border border-white/10 bg-white/[0.03] p-2.5 max-lg:order-3 sm:p-4">
            {cur.phase === 'brief' && tier >= 2 && (
              <Btn tone="primary" className="w-full text-lg" onClick={() => (primeAudio(), game.start())}>
                {tier === 3 ? 'Run the robot ▶' : 'Start exploring ▶'}
              </Btn>
            )}

            {tier <= 1 && (
              <div className="flex flex-wrap items-center justify-center gap-4">
                <DPad onMove={(d) => game.manualMove(d)} disabled={cur.phase !== 'brief' && cur.phase !== 'play'} />
                <div className="flex min-w-[140px] flex-1 flex-col gap-2">
                  {tier === 0 && (
                    <Btn onClick={() => game.showHint()} label="Show a hint (H)">
                      💡 Hint
                    </Btn>
                  )}
                  {tier === 1 && (
                    <>
                      <Seg<'left' | 'right'>
                        label="Which hand on the wall"
                        value={cur.hand}
                        onChange={(h) => game.setHand(h)}
                        options={[
                          { v: 'left', label: '✋ Left' },
                          { v: 'right', label: 'Right 🤚' },
                        ]}
                      />
                      {cur.following ? (
                        <Btn tone="ghost" onClick={() => game.stopFollower()}>
                          ■ Stop follower
                        </Btn>
                      ) : (
                        <Btn tone="primary" onClick={() => (primeAudio(), game.startFollower())}>
                          Start wall-follower ▶
                        </Btn>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {tier === 2 && cur.phase === 'play' && (
              <div className="grid grid-cols-2 gap-2">
                <Btn tone="cyan" onClick={() => game.nearestFrontier()} label="Go to the nearest frontier (N)">
                  Nearest
                </Btn>
                <Btn tone="ghost" pressed={cur.autoExplore} onClick={() => game.toggleAuto()} label="Auto-explore (A)">
                  Auto {cur.autoExplore ? 'on' : 'off'}
                </Btn>
                <Btn tone="green" className="col-span-2" disabled={!cur.exitSeen || cur.escapeAllowed} onClick={() => game.planEscape()} label="Plan escape with BFS (E)">
                  {cur.escapeAllowed ? 'Escaping…' : 'Plan escape (BFS) 🏁'}
                </Btn>
                <p className="col-span-2 text-xs text-white/55">Keys: N nearest · C cycle · G go · A auto · E escape. Or tap a glowing square.</p>
              </div>
            )}

            {tier === 3 && cur.phase === 'play' && (
              <div className="grid grid-cols-2 gap-2">
                <Btn tone="primary" onClick={() => game.toggleRun()} label="Run or pause (Space)">
                  {cur.running ? '❚❚ Pause' : '▶ Run'}
                </Btn>
                <Btn onClick={() => game.stepOnce()} label="One step">
                  Step ›
                </Btn>
                <Btn className="col-span-2" onClick={() => game.giveUp()}>
                  Stop and debrief
                </Btn>
              </div>
            )}

            {(tier === 2 || tier === 3 || tier === 1) && (
              <div className="mt-3">
                <p className="text-xs font-bold uppercase tracking-wide text-white/50">Robot speed</p>
                <div className="mt-1">
                  <Seg<number> label="Robot speed" value={speed} onChange={setSpeed} options={[1, 2, 4].map((v) => ({ v, label: `${v}×` }))} />
                </div>
              </div>
            )}
            {cur.lastPlan && tier >= 2 && (
              <p className="mt-3 rounded-xl bg-white/5 p-2 text-xs text-white/70">
                Last plan: <b className="text-cyan-200">{cur.lastPlan.algo}</b> checked <b className="text-white">{cur.lastPlan.expanded}</b> squares → route of <b className="text-white">{cur.lastPlan.length}</b> steps.
              </p>
            )}
          </section>
        )}

        {/* Map legend */}
        {cur.phase !== 'reveal' && (
          <section className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3 text-xs text-white/70 max-lg:order-7">
            <p className="font-black text-white/85">Reading the map</p>
            <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
              <li className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm bg-[#16494d]" /> floor (free)
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm bg-teal-400" /> wall (occupied)
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm bg-[#111d33] ring-1 ring-white/20" /> unknown (fog)
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block h-0.5 w-3 bg-cyan-300" /> sensor beam
              </li>
              {tier >= 2 && (
                <li className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-sm ring-2 ring-cyan-300" /> frontier
                </li>
              )}
              {tier === 3 && (
                <li className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-sm bg-teal-400/30 ring-1 ring-amber-200/70" /> not sure yet
                </li>
              )}
              {tier === 1 && (
                <li className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-sm bg-amber-400" /> island wall
                </li>
              )}
            </ul>
          </section>
        )}

        {/* Debrief */}
        {cur.phase === 'reveal' && o && (
          <section className="rounded-[20px] border-2 border-amber-300/40 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-4 max-lg:order-5" aria-label="Debrief">
            <p className="text-3xl" aria-label={`${o.stars} stars`}>
              {[0, 1, 2].map((i) => (
                <span key={i} className={i < o.stars ? '' : 'opacity-20 grayscale'}>
                  ⭐
                </span>
              ))}
            </p>
            <h2 className="mt-1 font-display text-xl font-black text-white">{o.escaped ? 'Escaped!' : 'Not out yet'}</h2>
            <p className="mt-1 text-sm font-semibold text-white/85">{o.headline}</p>
            <h3 className="mt-3 text-sm font-black uppercase tracking-wide text-amber-300">Why it happened</h3>
            <ul className="mt-1 list-disc space-y-1.5 pl-5 text-sm text-white/80">
              {o.why.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            {o.tries && (
              <div className="mt-3 overflow-x-auto">
                <h3 className="text-sm font-black uppercase tracking-wide text-cyan-300">Change one thing at a time</h3>
                <p className="text-[11px] text-white/55">Your brain, then the same brain with ONE setting changed, on this same maze. That is how engineers tune: one change, compare, repeat.</p>
                <table className="mt-1 w-full text-left text-xs text-white/80">
                  <thead className="text-white/50">
                    <tr>
                      <th className="py-1 pr-2 font-bold">Brain</th>
                      <th className="py-1 pr-2 font-bold">Energy</th>
                      <th className="py-1 pr-2 font-bold">Wrong</th>
                      <th className="py-1 pr-2 font-bold">Cost</th>
                      <th className="py-1 font-bold">Stars</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.tries.map((r) => (
                      <tr key={r.name} className={r.mine ? 'font-black text-amber-200' : ''}>
                        <td className="py-1 pr-2">{r.name}</td>
                        <td className="py-1 pr-2">{r.escaped ? Math.round(r.energy) : '—'}</td>
                        <td className="py-1 pr-2">{r.escaped ? r.wrong : '—'}</td>
                        <td className="py-1 pr-2">{r.escaped ? r.cost : 'not out'}</td>
                        <td className="py-1" aria-label={`${r.stars} stars`}>
                          {r.stars ? '★'.repeat(r.stars) : '✗'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {o.rank && (
                  <p className="mt-1 text-[11px] text-white/55">
                    On this maze: 3 stars needs a cost of {o.rank.three} or less, 2 stars {o.rank.two} or less. Each maze has its own best brain.
                  </p>
                )}
              </div>
            )}
            {o.race && (
              <div className="mt-3 overflow-x-auto">
                <h3 className="text-sm font-black uppercase tracking-wide text-cyan-300">Planner race: 40 long trips</h3>
                <p className="text-[11px] text-white/55">The same 40 trips across this maze’s real layout, planned three ways.</p>
                <table className="mt-1 w-full text-left text-xs text-white/80">
                  <thead className="text-white/50">
                    <tr>
                      <th className="py-1 pr-2 font-bold">Planner</th>
                      <th className="py-1 pr-2 font-bold">Squares checked</th>
                      <th className="py-1 pr-2 font-bold">Total route</th>
                      <th className="py-1 font-bold">Longer than shortest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.race.map((r) => (
                      <tr key={r.algo} className={r.algo === settings.planner ? 'font-black text-amber-200' : ''}>
                        <td className="py-1 pr-2">{PLANNER_NAMES[r.algo]}</td>
                        <td className="py-1 pr-2">{r.expanded}</td>
                        <td className="py-1 pr-2">{r.steps}</td>
                        <td className="py-1">{r.longer ? `${r.longer} trips (up to +${r.maxExtra})` : 'never'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-1 text-[11px] text-white/55">{raceLesson(o.race)}</p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Btn tone="primary" onClick={sendResult}>
                {o.stars > 0 ? 'Collect reward →' : 'Finish round'}
              </Btn>
              <Btn onClick={retry}>{tier === 3 ? 'Re-tune & run again' : 'Try again'}</Btn>
            </div>
          </section>
        )}
      </aside>
    </div>
  )
}
