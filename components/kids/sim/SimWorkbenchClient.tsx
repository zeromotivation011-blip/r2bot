'use client'

// components/kids/sim/SimWorkbenchClient.tsx
// The heavy half of the physics lab: Rapier (WASM), three.js and Blockly all
// load here, and this file is only ever reached through next/dynamic({ ssr:
// false }) from SimLabClient, behind a skeleton of the same size.
//
// The loop: every animation frame adds real time × speed to an accumulator and
// runs as many FIXED 1/60 s ticks as fit (capped, so a slow phone slows the
// sim down instead of spiralling). The renderer draws the last two snapshots
// interpolated by what is left in the accumulator. The run itself never sees
// wall-clock time, so the same program gives the same result on any device.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { capabilitiesOf, type RobotDesign } from '@/lib/kids/robot-design'
import { DT, type SensorReadings, type SimEvent, type SimSnapshot } from '@/lib/kids/sim/engine'
import type { Demo } from '@/lib/kids/sim/demos'
import type { Program } from '@/lib/kids/sim/program'
import { loadRapier, type Rapier } from '@/lib/kids/sim/rapier'
import { createRun, type Run, type RunResult } from '@/lib/kids/sim/run'
import { beatsGhost, FlightRecorder, framesAround, ghostPose, makeGhost, type FlightFrame, type Ghost, type SensorParts } from '@/lib/kids/sim/recorder'
import { loadGhost, saveGhost } from '@/lib/kids/sim/ghost-store'
import { playSound } from '@/lib/kids-audio'
import { kidsReducedMotion } from '@/lib/kids/settings'
import BatteryBarClient from './BatteryBarClient'
import BlocklyEditor, { type BlocklyEditorHandle } from './BlocklyEditorClient'
import FlightRecorderClient, { RecorderTimelineClient, type GhostNews } from './FlightRecorderClient'
import type { CameraMode, SimRenderer } from './renderer'
import SensorPanel from './SensorPanel'
import { readPresentSignal } from '@/lib/kids/teach/present-bridge'

const MAX_TICKS_PER_FRAME = 8
const SPEEDS = [0.5, 1, 2, 4] as const
const PANEL_HZ = 10

type Phase = 'ready' | 'running' | 'paused' | 'done'

interface Props {
  demo: Demo
  design: RobotDesign
  /** Program loaded into the editor when the demo changes. */
  starter: Program
}

export interface WorkbenchLiveState {
  sensors: SensorReadings | null
  snap: SimSnapshot | null
  wheelTravel: number
  travelled: number
  /** Battery (roadmap #39). */
  battery?: { soc: number; volts: number; amps: number; flat: boolean; charging: boolean; coupled: boolean }
}

/** Which sensors the Flight Recorder graphs, from the robot's parts. */
function sensorParts(caps: Set<string>): SensorParts {
  return { distance: caps.has('see-wall'), line: caps.has('follow-line'), bump: caps.has('feel-bump') }
}

export default function SimWorkbenchClient({ demo, design, starter }: Props) {
  const viewRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<BlocklyEditorHandle>(null)
  const rendererRef = useRef<SimRenderer | null>(null)
  const rapierRef = useRef<Rapier | null>(null)
  const runRef = useRef<Run | null>(null)
  const prevRef = useRef<SimSnapshot | null>(null)
  const curRef = useRef<SimSnapshot | null>(null)
  const accRef = useRef(0)
  const phaseRef = useRef<Phase>('ready')
  const speedRef = useRef<number>(1)
  const activeRef = useRef<string | null>(null)
  const eventsSeenRef = useRef(0)
  const panelClockRef = useRef(0)
  const designRef = useRef(design)
  designRef.current = design
  const demoRef = useRef(demo)
  demoRef.current = demo

  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [phase, setPhaseState] = useState<Phase>('ready')
  const [speed, setSpeedState] = useState<number>(1)
  const [camera, setCamera] = useState<CameraMode>('follow')
  const [result, setResult] = useState<RunResult | null>(null)
  const [bubble, setBubble] = useState<string | null>(null)
  const [live, setLive] = useState<WorkbenchLiveState>({ sensors: null, snap: null, wheelTravel: 0, travelled: 0 })
  /** The running block in words, shown over the 3D view (on a phone the editor's highlight is off-screen). */
  const [nowDoing, setNowDoing] = useState<string | null>(null)
  const [showSensors, setShowSensors] = useState(false)
  const resultRef = useRef<RunResult | null>(null)
  const designDemoRef = useRef(demo.id)
  resultRef.current = result

  const caps = useMemo(() => capabilitiesOf(design), [design])
  const capsRef = useRef(caps)
  capsRef.current = caps
  const parts = useMemo(() => sensorParts(caps as Set<string>), [caps])
  const partsRef = useRef(parts)
  partsRef.current = parts

  // ── Flight Recorder (roadmap #38): every run is recorded; after it, scrub or replay it ──
  const recRef = useRef(new FlightRecorder())
  const [frames, setFrames] = useState<FlightFrame[]>([])
  const [recEvents, setRecEvents] = useState<SimEvent[]>([])
  /** 'replay' = the view shows the recording at replayT instead of the live sim. */
  const modeRef = useRef<'live' | 'replay'>('live')
  const replayTRef = useRef(0)
  const [replayT, setReplayT] = useState(0)
  const replayingRef = useRef(false)
  const [replaying, setReplaying] = useState(false)
  const framesRef = useRef<FlightFrame[]>([])
  const trailCacheRef = useRef<{ len: number; arr: number[] }>({ len: -1, arr: [] })
  const [ghost, setGhost] = useState<Ghost | null>(null)
  const ghostRef = useRef<Ghost | null>(null)
  const [ghostOn, setGhostOn] = useState(true)
  const ghostOnRef = useRef(true)
  const [ghostNews, setGhostNews] = useState<GhostNews | null>(null)

  const publishFrames = useCallback(() => {
    const f = recRef.current.frames()
    framesRef.current = f
    setFrames(f)
    setRecEvents(recRef.current.events.slice())
  }, [])

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p
    setPhaseState(p)
    // Draw every frame only while the robot runs; otherwise the view sleeps until something changes.
    rendererRef.current?.setLive(p === 'running')
  }, [])

  const publishLive = useCallback(() => {
    const run = runRef.current
    if (!run) return
    setLive({
      sensors: run.sim.sensors(),
      snap: run.sim.snapshot(),
      wheelTravel: run.sim.wheelTravel,
      travelled: run.sim.travelled,
      battery: (() => {
        const b = run.sim.battery()
        return { soc: b.soc, volts: b.volts, amps: b.amps, flat: b.flat, charging: b.charging, coupled: b.coupled }
      })(),
    })
  }, [])

  /** Throw away the current run and put a fresh robot on the start spot. */
  const resetRun = useCallback(
    (program: Program = { body: [] }) => {
      const R = rapierRef.current
      if (!R) return null
      runRef.current?.sim.dispose()
      const run = createRun(R, demoRef.current.arena, designRef.current, program)
      runRef.current = run
      const s = run.sim.snapshot()
      prevRef.current = s
      curRef.current = s
      accRef.current = 0
      recRef.current.clear()
      recRef.current.record(run.sim, partsRef.current, null, true)
      modeRef.current = 'live'
      replayingRef.current = false
      setReplaying(false)
      replayTRef.current = 0
      setReplayT(0)
      setGhostNews(null)
      publishFrames()
      eventsSeenRef.current = 0
      activeRef.current = null
      editorRef.current?.highlight(null)
      setBubble(null)
      setResult(null)
      setNowDoing(null)
      publishLive()
      rendererRef.current?.wake()
      return run
    },
    [publishLive, publishFrames],
  )

  // ── Load the engine and the renderer once ────────────────────────────────
  useEffect(() => {
    let cancelled = false
    let renderer: SimRenderer | null = null
    ;(async () => {
      try {
        const [R, mod] = await Promise.all([loadRapier(), import('./renderer')])
        if (cancelled || !viewRef.current) return
        rapierRef.current = R
        renderer = new mod.SimRenderer(viewRef.current)
        rendererRef.current = renderer
        renderer.setArena(demoRef.current.arena)
        renderer.setRobot(designRef.current)
        if (ghostRef.current) renderer.setGhost(designRef.current)
        renderer.onFrame((dt) => frame(dt))
        resetRun()
        setReady(true)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'The physics engine could not start.')
      }
    })()
    return () => {
      cancelled = true
      renderer?.dispose()
      rendererRef.current = null
      runRef.current?.sim.dispose()
      runRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once; demo/design changes are handled below
  }, [])

  /** The ghost's pose at robot time t, when it is switched on. */
  function ghostAt(t: number) {
    const g = ghostRef.current
    return g && ghostOnRef.current ? ghostPose(g, t) : null
  }

  function frame(dt: number) {
    const run = runRef.current
    // Present mode (lib/kids/teach/present-bridge): slow motion multiplies the speed, freeze stops time.
    const present = readPresentSignal()
    const pSpeed = present.frozen ? 0 : present.speed
    if (!run || !curRef.current || !prevRef.current) return null
    if (modeRef.current === 'replay') {
      const fr = framesRef.current
      if (replayingRef.current && fr.length > 1) {
        const end = fr[fr.length - 1].t
        let nt = replayTRef.current + dt * speedRef.current * pSpeed
        if (nt >= end) {
          nt = end
          replayingRef.current = false
          setReplaying(false)
          rendererRef.current?.setLive(false)
        }
        replayTRef.current = nt
        panelClockRef.current += dt
        if (panelClockRef.current >= 1 / PANEL_HZ || !replayingRef.current) {
          panelClockRef.current = 0
          setReplayT(nt)
        }
      }
      const around = framesAround(fr, replayTRef.current)
      if (around) {
        const tc = trailCacheRef.current
        if (tc.len !== around.a.trailLen) trailCacheRef.current = { len: around.a.trailLen, arr: run.sim.trail.slice(0, around.a.trailLen) }
        return { prev: around.a.snap, cur: around.b.snap, alpha: around.alpha, sensors: null, trail: trailCacheRef.current.arr, ghost: ghostAt(replayTRef.current) }
      }
    }
    if (phaseRef.current === 'running') {
      accRef.current += dt * speedRef.current * pSpeed
      const n = Math.min(MAX_TICKS_PER_FRAME, Math.floor(accRef.current / DT))
      // Only two snapshots per frame: just before the last tick and after it (what the renderer interpolates).
      for (let i = 0; i < n && run.status !== 'done'; i++) {
        if (i === n - 1) prevRef.current = run.sim.snapshot()
        run.tick()
        recRef.current.record(run.sim, partsRef.current, run.interp?.ctx.active ?? null, run.result !== null)
        accRef.current -= DT
      }
      if (n > 0) curRef.current = run.sim.snapshot()
      // Too slow to keep up: let the sim run slower rather than pile up work.
      if (n === MAX_TICKS_PER_FRAME) accRef.current = Math.min(accRef.current, DT)
      afterTicks(run)
    }
    panelClockRef.current += dt
    if (panelClockRef.current >= 1 / PANEL_HZ) {
      panelClockRef.current = 0
      if (phaseRef.current === 'running') {
        publishLive()
        publishFrames()
      }
    }
    return {
      prev: prevRef.current,
      cur: curRef.current,
      alpha: phaseRef.current === 'running' ? Math.min(1, accRef.current / DT) : 1,
      sensors: run.sim.sensors(), // always: the robot's-eye view needs line/colour/bump too; the renderer draws the beam only for robots that see walls
      trail: run.sim.trail,
      ghost: phaseRef.current === 'ready' ? ghostAt(0) : ghostAt(run.sim.time),
    }
  }

  function afterTicks(run: Run) {
    const active = run.interp?.ctx.active ?? null
    if (active !== activeRef.current) {
      activeRef.current = active
      editorRef.current?.highlight(active)
      setNowDoing(active ? editorRef.current?.describe(active) || null : null)
    }
    const ev = run.sim.events
    for (let i = eventsSeenRef.current; i < ev.length; i++) {
      const e = ev[i]
      if (e.kind === 'say' && e.text) setBubble(e.text)
      else if (e.kind === 'beep') playSound('click')
      else if (e.kind === 'crash') setBubble('Bonk!')
      else if (e.kind === 'grab') setBubble('Got it!')
      else if (e.kind === 'miss') setBubble('Missed — nothing in my claw’s reach.')
      else if (e.kind === 'stalled' && e.text) setBubble(e.text)
      else if (e.kind === 'battery' && e.text === 'flat') setBubble('My battery is flat…')
      else if (e.kind === 'battery' && e.text === 'low') setBubble('Battery low!')
      else if (e.kind === 'battery' && e.text === 'charging') setBubble('⚡ Charging…')
    }
    eventsSeenRef.current = ev.length
    if (run.status === 'done') {
      setPhase('done')
      editorRef.current?.highlight(null)
      activeRef.current = null
      setResult(run.result)
      setNowDoing(null)
      publishLive()
      finishRecording(run)
      if (run.result?.success) playSound('correct')
      else if (run.result) playSound('wrong')
    }
  }

  /** The run ended: freeze the recording, open it at the end, and keep a new best as the ghost. */
  function finishRecording(run: Run) {
    publishFrames()
    const fr = framesRef.current
    const end = fr.length > 0 ? fr[fr.length - 1].t : 0
    modeRef.current = 'replay'
    replayTRef.current = end
    setReplayT(end)
    const res = run.result
    if (!res || res.reason === 'missing-part') return
    const old = ghostRef.current
    if (beatsGhost(res, old)) {
      const d = designRef.current
      const g = makeGhost(demoRef.current.arena.id, fr, res.time, `${d.body}/${d.drive}/${d.head}`)
      if (g) {
        saveGhost(g)
        ghostRef.current = g
        setGhost(g)
        rendererRef.current?.setGhost(d)
        setGhostNews(old ? { kind: 'new-best', delta: old.time - res.time } : { kind: 'first' })
      }
    } else if (old && res.success) setGhostNews({ kind: 'behind', delta: res.time - old.time })
  }

  const onSeek = useCallback((t: number) => {
    if (phaseRef.current === 'running' || framesRef.current.length < 2) return
    modeRef.current = 'replay'
    replayingRef.current = false
    setReplaying(false)
    replayTRef.current = t
    setReplayT(t)
    rendererRef.current?.wake(0.5)
  }, [])

  const onReplay = useCallback(() => {
    const fr = framesRef.current
    if (phaseRef.current === 'running' || fr.length < 2) return
    modeRef.current = 'replay'
    if (replayingRef.current) {
      replayingRef.current = false
      setReplaying(false)
      rendererRef.current?.setLive(false)
      return
    }
    if (replayTRef.current >= fr[fr.length - 1].t - 0.01) replayTRef.current = 0
    replayingRef.current = true
    setReplaying(true)
    rendererRef.current?.setLive(true)
  }, [])

  const onGhostToggle = useCallback(() => {
    ghostOnRef.current = !ghostOnRef.current
    setGhostOn(ghostOnRef.current)
    rendererRef.current?.wake(0.5)
  }, [])

  // ── Demo or robot changed: rebuild the scene and the run ─────────────────
  useEffect(() => {
    const r = rendererRef.current
    if (!r) return
    r.setArena(demo.arena)
    const g = loadGhost(demo.arena.id)
    ghostRef.current = g
    setGhost(g)
    r.setGhost(g ? designRef.current : null)
    setPhase('ready')
    resetRun()
  }, [demo, resetRun, setPhase])

  useEffect(() => {
    const r = rendererRef.current
    if (!r) return
    // A new challenge can bring its own remembered parts: that is not "a part was swapped".
    const sameDemo = designDemoRef.current === demoRef.current.id
    designDemoRef.current = demoRef.current.id
    const wasRunning = sameDemo && (phaseRef.current === 'running' || phaseRef.current === 'paused')
    const last = sameDemo ? resultRef.current : null
    r.setRobot(design)
    if (ghostRef.current) r.setGhost(design)
    setPhase('ready')
    resetRun()
    // Swapping a part ends the run; say so, and keep the last result the child may have been reading.
    if (wasRunning || last) {
      if (last) setResult(last)
      setBubble('New part fitted! Press ▶ Run to try it.')
    }
  }, [design, resetRun, setPhase])

  useEffect(() => {
    rendererRef.current?.setCameraMode(camera)
  }, [camera, ready])

  // ── Controls ─────────────────────────────────────────────────────────────
  const onRun = useCallback(() => {
    const program = editorRef.current?.getProgram() ?? { body: [] }
    const run = resetRun(program)
    if (!run) return
    if (run.status === 'done') {
      // Locked block: nothing moves, the result explains which part is missing.
      setPhase('done')
      setResult(run.result)
      playSound('wrong')
      return
    }
    setPhase('running')
  }, [resetRun, setPhase])

  const onPause = useCallback(() => {
    if (phaseRef.current === 'running') {
      setPhase('paused')
      publishLive()
      publishFrames()
    } else if (phaseRef.current === 'paused') setPhase('running')
  }, [publishFrames, publishLive, setPhase])

  const onStep = useCallback(() => {
    const run = runRef.current
    if (!run || run.status === 'done') return
    if (phaseRef.current === 'ready') {
      // Stepping from the start begins a run, paused.
      const fresh = resetRun(editorRef.current?.getProgram() ?? { body: [] })
      if (!fresh || fresh.status === 'done') {
        setResult(fresh?.result ?? null)
        setPhase('done')
        return
      }
      setPhase('paused')
    }
    const r = runRef.current
    if (!r) return
    // One step = 6 fixed ticks (0.1 s of robot time) so a child can see it move.
    modeRef.current = 'live'
    for (let i = 0; i < 6 && r.status !== 'done'; i++) {
      prevRef.current = r.sim.snapshot()
      r.tick()
      recRef.current.record(r.sim, partsRef.current, r.interp?.ctx.active ?? null, r.result !== null)
      curRef.current = r.sim.snapshot()
    }
    prevRef.current = curRef.current
    afterTicks(r)
    if (r.status !== 'done') setPhase('paused')
    publishLive()
    publishFrames()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- afterTicks reads refs only
  }, [publishLive, publishFrames, resetRun, setPhase])

  const onReset = useCallback(() => {
    setPhase('ready')
    resetRun()
  }, [resetRun, setPhase])

  const setSpeed = (s: number) => {
    speedRef.current = s
    setSpeedState(s)
  }

  const loadProgram = (p: Program) => {
    editorRef.current?.setProgram(p)
    onReset()
  }

  const running = phase === 'running'
  const hasRecording = frames.length > 1
  const recordEnd = frames.length > 0 ? frames[frames.length - 1].t : 0
  /** Replaying or scrubbed back: the result card steps aside so the robot is visible. */
  const rewound = !running && hasRecording && (replaying || replayT < recordEnd - 0.05)
  const recorderT = running ? (frames.length > 0 ? frames[frames.length - 1].t : 0) : replayT
  const showView = () => {
    const reduce = kidsReducedMotion()
    viewRef.current?.parentElement?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  /** The phone's Run button under the editor: bring the robot into view, then go. */
  const onRunFromEditor = () => {
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    viewRef.current?.parentElement?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    onRun()
  }

  return (
    // Phone order: 3D view + Run bar, then the editor right under it, then the sensors (folded).
    // Desktop: view and sensors on the left, editor on the right.
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
      {/* ── 3D view ─────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 scroll-mt-2 flex-col gap-3 lg:col-start-1 lg:row-start-1">
        <div className="relative h-[42vh] min-h-[280px] sm:h-[52vh] sm:min-h-[320px] overflow-hidden rounded-3xl border border-white/10 bg-[#111C32] lg:h-[540px]">
          <div ref={viewRef} className="absolute inset-0" data-testid="sim-view" />
          {!ready && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#111C32] text-slate-200">
              <div className="h-16 w-16 animate-pulse rounded-2xl bg-white/10" aria-hidden />
              <p className="text-sm font-bold">{loadError ?? 'Starting the physics engine…'}</p>
            </div>
          )}
          {bubble && (
            <div className="pointer-events-none absolute left-1/2 top-4 max-w-[80%] -translate-x-1/2 rounded-2xl bg-white px-4 py-2 text-center text-sm font-black text-[#111C32] shadow-lg">
              💬 {bubble}
            </div>
          )}
          <div className="absolute right-3 top-3 flex gap-1 rounded-2xl bg-black/40 p-1 backdrop-blur" role="group" aria-label="Camera">
            {(
              [
                ['follow', '🎥', 'Follow'],
                ['orbit', '🔄', 'Orbit'],
                ['top', '🗺️', 'Top'],
              ] as const
            ).map(([m, icon, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setCamera(m)}
                aria-pressed={camera === m}
                className={`min-h-[44px] min-w-[44px] rounded-xl px-2 text-xs font-black ${camera === m ? 'bg-amber-400 text-[#111C32]' : 'text-white hover:bg-white/10'}`}
              >
                <span aria-hidden>{icon}</span> <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          {live.battery && (
            <div className="absolute right-3 top-[64px]">
              <BatteryBarClient {...live.battery} />
            </div>
          )}
          {nowDoing && (running || phase === 'paused') && (
            <div className="pointer-events-none absolute bottom-3 left-3 max-w-[85%] truncate rounded-xl bg-black/55 px-3 py-1.5 text-xs font-black text-amber-200 backdrop-blur" aria-hidden>
              ▶ {nowDoing}
            </div>
          )}
          {result && !rewound && (
            <div
              role="status"
              data-testid="sim-result"
              data-success={result.success ? 'yes' : 'no'}
              className={`absolute inset-x-3 bottom-3 rounded-2xl px-4 py-3 text-sm font-bold shadow-xl ${result.success ? 'bg-emerald-400 text-[#06281C]' : 'bg-rose-400 text-[#3B0A14]'}`}
            >
              <p className="text-base font-black">{result.success ? '⭐ Goal reached!' : 'Not yet — try again!'}</p>
              <p>{result.message}</p>
              {result.reason !== 'missing-part' && (
                <p className="mt-1 text-xs font-semibold opacity-80">
                  Time {result.time.toFixed(1)} s · moved {Math.round(result.travelled * 100)} cm · wheels turned {Math.round(result.wheelTravel * 100)} cm
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Run controls">
          <button
            type="button"
            onClick={onRun}
            disabled={!ready}
            data-testid="sim-run"
            className="min-h-[48px] rounded-2xl bg-amber-400 px-5 text-base font-black text-[#111C32] shadow hover:bg-amber-300 disabled:opacity-50"
          >
            ▶ Run
          </button>
          <button
            type="button"
            onClick={onPause}
            disabled={!ready || (phase !== 'running' && phase !== 'paused')}
            className="min-h-[48px] rounded-2xl bg-white/10 px-4 font-black text-white hover:bg-white/20 disabled:opacity-40"
          >
            {phase === 'paused' ? '⏵ Resume' : '⏸ Pause'}
          </button>
          <button
            type="button"
            onClick={onStep}
            disabled={!ready || phase === 'done' || running}
            className="min-h-[48px] rounded-2xl bg-white/10 px-4 font-black text-white hover:bg-white/20 disabled:opacity-40"
          >
            ⏭ Step
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={!ready}
            className="min-h-[48px] rounded-2xl bg-white/10 px-4 font-black text-white hover:bg-white/20 disabled:opacity-40"
          >
            ↺ Reset
          </button>
          <div className="ml-auto flex items-center gap-1 rounded-2xl bg-white/5 p-1" role="group" aria-label="Speed">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                aria-pressed={speed === s}
                className={`min-h-[44px] min-w-[44px] rounded-xl text-sm font-black ${speed === s ? 'bg-amber-400 text-[#1A1103]' : 'text-slate-200 hover:bg-white/10'}`}
              >
                {s === 0.5 ? '½×' : `${s}×`}
              </button>
            ))}
          </div>
        </div>
        {hasRecording && (
          <RecorderTimelineClient
            frames={frames}
            events={recEvents}
            result={result}
            t={recorderT}
            onSeek={onSeek}
            replaying={replaying}
            onReplay={onReplay}
            live={running}
          />
        )}
      </div>

      {/* ── Flight Recorder (roadmap #38): right under the robot on a phone once there is a run; full width on desktop ── */}
      <div className={`min-w-0 lg:col-span-2 lg:row-start-3 ${hasRecording ? '' : 'hidden lg:block'}`}>
        <FlightRecorderClient
          frames={hasRecording ? frames : []}
          events={recEvents}
          result={result}
          parts={parts}
          t={recorderT}
          onSeek={onSeek}
          onShowView={showView}
          replaying={replaying}
          onReplay={onReplay}
          live={running}
          ghost={ghost}
          ghostOn={ghostOn}
          onGhostToggle={onGhostToggle}
          ghostNews={ghostNews}
          batteryCoupled={demo.arena.battery !== undefined}
          drainScale={demo.arena.battery?.drainScale ?? 1}
        />
      </div>

      {/* ── Block editor ────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-col gap-3 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-lg font-black text-white">Your program</h2>
          <button
            type="button"
            onClick={() => loadProgram(demo.reference)}
            data-testid="sim-show-me"
            className="min-h-[44px] rounded-2xl border border-amber-300/50 px-3 text-sm font-black text-amber-200 hover:bg-amber-300/10"
          >
            💡 Show me an answer
          </button>
          <button
            type="button"
            onClick={() => loadProgram(starter)}
            className="min-h-[44px] rounded-2xl border border-white/20 px-3 text-sm font-black text-slate-200 hover:bg-white/10"
          >
            🧹 Start over
          </button>
        </div>
        <div className="relative h-[460px] overflow-hidden rounded-3xl border border-white/10 lg:h-[540px]" data-testid="sim-editor">
          <BlocklyEditor ref={editorRef} toolbox={demo.toolbox} caps={caps} initial={starter} resetKey={demo.id} />
          {/* Phones: Run from where the child is editing; it scrolls the robot into view first. */}
          <button
            type="button"
            onClick={onRunFromEditor}
            disabled={!ready}
            data-testid="sim-run-editor"
            className="absolute bottom-3 right-16 z-10 min-h-[48px] rounded-2xl bg-amber-400 px-4 text-base font-black text-[#111C32] shadow-xl hover:bg-amber-300 disabled:opacity-50 lg:hidden"
          >
            ▶ Run
          </button>
        </div>
        <p className="text-xs text-slate-300">
          Drag blocks under <strong>▶ when Run is pressed</strong>. Greyed blocks with a 🔒 need a part your robot does not have yet.
        </p>
      </div>

      {/* ── Sensors (folded on a phone so the editor sits right under the robot) ── */}
      <div className="min-w-0 lg:col-start-1 lg:row-start-2">
        <button
          type="button"
          onClick={() => setShowSensors((v) => !v)}
          aria-expanded={showSensors}
          className="mb-2 min-h-[44px] w-full rounded-2xl bg-white/5 px-4 text-left text-sm font-black text-slate-200 hover:bg-white/10 lg:hidden"
        >
          {showSensors ? '▾' : '▸'} What my robot senses
        </button>
        <div className={`${showSensors ? '' : 'hidden'} lg:block`}>
          <SensorPanel live={live} caps={caps} />
        </div>
      </div>
    </div>
  )
}
