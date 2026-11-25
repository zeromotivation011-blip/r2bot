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
import { DT, type SensorReadings, type SimSnapshot } from '@/lib/kids/sim/engine'
import type { Demo } from '@/lib/kids/sim/demos'
import type { Program } from '@/lib/kids/sim/program'
import { loadRapier, type Rapier } from '@/lib/kids/sim/rapier'
import { createRun, type Run, type RunResult } from '@/lib/kids/sim/run'
import { playSound } from '@/lib/kids-audio'
import BlocklyEditor, { type BlocklyEditorHandle } from './BlocklyEditorClient'
import type { CameraMode, SimRenderer } from './renderer'
import SensorPanel from './SensorPanel'

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

  const caps = useMemo(() => capabilitiesOf(design), [design])
  const capsRef = useRef(caps)
  capsRef.current = caps

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p
    setPhaseState(p)
  }, [])

  const publishLive = useCallback(() => {
    const run = runRef.current
    if (!run) return
    setLive({
      sensors: run.sim.sensors(),
      snap: run.sim.snapshot(),
      wheelTravel: run.sim.wheelTravel,
      travelled: run.sim.travelled,
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
      eventsSeenRef.current = 0
      activeRef.current = null
      editorRef.current?.highlight(null)
      setBubble(null)
      setResult(null)
      publishLive()
      return run
    },
    [publishLive],
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

  function frame(dt: number) {
    const run = runRef.current
    if (!run || !curRef.current || !prevRef.current) return null
    if (phaseRef.current === 'running') {
      accRef.current += dt * speedRef.current
      let n = 0
      while (accRef.current >= DT && n < MAX_TICKS_PER_FRAME && run.status !== 'done') {
        prevRef.current = curRef.current
        run.tick()
        curRef.current = run.sim.snapshot()
        accRef.current -= DT
        n++
      }
      // Too slow to keep up: let the sim run slower rather than pile up work.
      if (n === MAX_TICKS_PER_FRAME) accRef.current = Math.min(accRef.current, DT)
      afterTicks(run)
    }
    panelClockRef.current += dt
    if (panelClockRef.current >= 1 / PANEL_HZ) {
      panelClockRef.current = 0
      if (phaseRef.current === 'running') publishLive()
    }
    return {
      prev: prevRef.current,
      cur: curRef.current,
      alpha: phaseRef.current === 'running' ? Math.min(1, accRef.current / DT) : 1,
      sensors: capsRef.current.has('see-wall') ? run.sim.sensors() : null,
      trail: run.sim.trail,
    }
  }

  function afterTicks(run: Run) {
    const active = run.interp?.ctx.active ?? null
    if (active !== activeRef.current) {
      activeRef.current = active
      editorRef.current?.highlight(active)
    }
    const ev = run.sim.events
    for (let i = eventsSeenRef.current; i < ev.length; i++) {
      const e = ev[i]
      if (e.kind === 'say' && e.text) setBubble(e.text)
      else if (e.kind === 'beep') playSound('click')
      else if (e.kind === 'crash') setBubble('Bonk!')
      else if (e.kind === 'grab') setBubble('Got it!')
    }
    eventsSeenRef.current = ev.length
    if (run.status === 'done') {
      setPhase('done')
      editorRef.current?.highlight(null)
      activeRef.current = null
      setResult(run.result)
      publishLive()
      if (run.result?.success) playSound('correct')
      else if (run.result) playSound('wrong')
    }
  }

  // ── Demo or robot changed: rebuild the scene and the run ─────────────────
  useEffect(() => {
    const r = rendererRef.current
    if (!r) return
    r.setArena(demo.arena)
    setPhase('ready')
    resetRun()
  }, [demo, resetRun, setPhase])

  useEffect(() => {
    const r = rendererRef.current
    if (!r) return
    r.setRobot(design)
    setPhase('ready')
    resetRun()
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
    } else if (phaseRef.current === 'paused') setPhase('running')
  }, [publishLive, setPhase])

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
    for (let i = 0; i < 6 && r.status !== 'done'; i++) {
      prevRef.current = r.sim.snapshot()
      r.tick()
      curRef.current = r.sim.snapshot()
    }
    prevRef.current = curRef.current
    afterTicks(r)
    if (r.status !== 'done') setPhase('paused')
    publishLive()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- afterTicks reads refs only
  }, [publishLive, resetRun, setPhase])

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

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* ── 3D view ─────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-col gap-3">
        <div className="relative h-[52vh] min-h-[320px] overflow-hidden rounded-3xl border border-white/10 bg-[#120A2E] lg:h-[540px]">
          <div ref={viewRef} className="absolute inset-0" data-testid="sim-view" />
          {!ready && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#120A2E] text-purple-100">
              <div className="h-16 w-16 animate-pulse rounded-2xl bg-white/10" aria-hidden />
              <p className="text-sm font-bold">{loadError ?? 'Starting the physics engine…'}</p>
            </div>
          )}
          {bubble && (
            <div className="pointer-events-none absolute left-1/2 top-4 max-w-[80%] -translate-x-1/2 rounded-2xl bg-white px-4 py-2 text-center text-sm font-black text-[#1A1040] shadow-lg">
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
                className={`min-h-[44px] min-w-[44px] rounded-xl px-2 text-xs font-black ${camera === m ? 'bg-amber-400 text-[#1A1040]' : 'text-white hover:bg-white/10'}`}
              >
                <span aria-hidden>{icon}</span> <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          {result && (
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
            className="min-h-[48px] rounded-2xl bg-amber-400 px-5 text-base font-black text-[#1A1040] shadow hover:bg-amber-300 disabled:opacity-50"
          >
            ▶ Run
          </button>
          <button
            type="button"
            onClick={onPause}
            disabled={!ready || (phase !== 'running' && phase !== 'paused')}
            className="min-h-[48px] rounded-2xl bg-white/10 px-4 font-black text-white hover:bg-white/20 disabled:opacity-40"
          >
            {running ? '⏸ Pause' : '⏵ Resume'}
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
                className={`min-h-[44px] min-w-[44px] rounded-xl text-sm font-black ${speed === s ? 'bg-purple-400 text-[#1A1040]' : 'text-purple-100 hover:bg-white/10'}`}
              >
                {s === 0.5 ? '½×' : `${s}×`}
              </button>
            ))}
          </div>
        </div>

        <SensorPanel live={live} caps={caps} />
      </div>

      {/* ── Block editor ────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-col gap-3">
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
            className="min-h-[44px] rounded-2xl border border-white/20 px-3 text-sm font-black text-purple-100 hover:bg-white/10"
          >
            🧹 Start over
          </button>
        </div>
        <div className="h-[460px] overflow-hidden rounded-3xl border border-white/10 lg:h-[540px]" data-testid="sim-editor">
          <BlocklyEditor ref={editorRef} toolbox={demo.toolbox} caps={caps} initial={starter} resetKey={demo.id} />
        </div>
        <p className="text-xs text-purple-200">
          Drag blocks under <strong>▶ when Run is pressed</strong>. Greyed blocks with a 🔒 need a part your robot does not have yet.
        </p>
      </div>
    </div>
  )
}
