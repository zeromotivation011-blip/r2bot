'use client'

// components/kids/sim/ChallengeStageClient.tsx
// The heavy half of a course challenge: Rapier (WASM) and three.js load here,
// and only through next/dynamic({ ssr: false }) from SimChallengeClient, behind
// a skeleton of the same size.
//
// Same fixed-step loop as the physics lab (SimWorkbenchClient): real time ×
// speed feeds an accumulator of 1/60 s ticks, the renderer interpolates the
// last two snapshots, and the run itself never sees wall-clock time. A
// challenge with several start poses runs them one after another.

import { useEffect, useRef, useState } from 'react'
import { capabilitiesOf, type RobotDesign } from '@/lib/kids/robot-design'
import { DT, type SimSnapshot } from '@/lib/kids/sim/engine'
import { createChallengeRun, judgeChallengeRun, startPoses, type Challenge, type ChallengeResult, type ChallengeRun, type PicNode } from '@/lib/kids/sim/challenge'
import type { Program } from '@/lib/kids/sim/program'
import { loadRapier, type Rapier } from '@/lib/kids/sim/rapier'
import { playSound } from '@/lib/kids-audio'
import type { CameraMode, SimRenderer } from './renderer'

const MAX_TICKS_PER_FRAME = 8
/** Pause between two start poses, real seconds. */
const BETWEEN_STARTS = 0.8

export interface StageRunRequest {
  nonce: number
  program: Program
  nodes: PicNode[]
}

interface Props {
  challenge: Challenge
  design: RobotDesign
  /** A new nonce starts a run of this program. */
  run: StageRunRequest | null
  /** A new value puts a fresh robot on the start spot. */
  resetNonce: number
  speed: number
  camera: CameraMode
  onActive: (stmtId: string | null) => void
  onBubble: (text: string | null) => void
  onDone: (result: ChallengeResult) => void
  onReady: () => void
  onStart: (index: number, total: number) => void
}

export default function ChallengeStageClient({ challenge, design, run, resetNonce, speed, camera, onActive, onBubble, onDone, onReady, onStart }: Props) {
  const viewRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<SimRenderer | null>(null)
  const rapierRef = useRef<Rapier | null>(null)
  const runRef = useRef<ChallengeRun | null>(null)
  const prevRef = useRef<SimSnapshot | null>(null)
  const curRef = useRef<SimSnapshot | null>(null)
  const accRef = useRef(0)
  const liveRef = useRef(false)
  const speedRef = useRef(speed)
  speedRef.current = speed
  const reqRef = useRef<StageRunRequest | null>(null)
  const startRef = useRef(0)
  const waitRef = useRef(0)
  const activeRef = useRef<string | null>(null)
  const eventsSeenRef = useRef(0)
  const chRef = useRef(challenge)
  chRef.current = challenge
  const designRef = useRef(design)
  designRef.current = design
  const cb = useRef({ onActive, onBubble, onDone, onReady, onStart })
  cb.current = { onActive, onBubble, onDone, onReady, onStart }
  const [failed, setFailed] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  /** Throw away the current run and put a robot on start pose i, with this program (or none). */
  function place(i: number, program: Program): ChallengeRun | null {
    const R = rapierRef.current
    if (!R) return null
    runRef.current?.run.sim.dispose()
    const cr = createChallengeRun(R, chRef.current, designRef.current, program, i)
    runRef.current = cr
    const s = cr.run.sim.snapshot()
    prevRef.current = s
    curRef.current = s
    accRef.current = 0
    eventsSeenRef.current = 0
    activeRef.current = null
    rendererRef.current?.wake()
    return cr
  }

  function setLive(live: boolean) {
    liveRef.current = live
    rendererRef.current?.setLive(live)
  }

  // Load the engine and the renderer once.
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
        renderer.setArena(chRef.current.arena)
        renderer.setRobot(designRef.current)
        renderer.setCameraMode(camera)
        renderer.onFrame((dt) => frame(dt))
        place(0, { body: [] })
        setReady(true)
        cb.current.onReady()
      } catch (e) {
        if (!cancelled) setFailed(e instanceof Error ? e.message : 'The physics engine could not start.')
      }
    })()
    return () => {
      cancelled = true
      renderer?.dispose()
      rendererRef.current = null
      runRef.current?.run.sim.dispose()
      runRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once; changes are handled below
  }, [])

  function frame(dt: number) {
    const cr = runRef.current
    if (!cr || !curRef.current || !prevRef.current) return null
    if (liveRef.current) {
      if (waitRef.current > 0) {
        // Between two start poses: hold the last frame for a moment.
        waitRef.current -= dt
        if (waitRef.current <= 0) {
          const req = reqRef.current
          if (req) {
            place(startRef.current, req.program)
            cb.current.onStart(startRef.current, startPoses(chRef.current).length)
          }
        }
      } else {
        accRef.current += dt * speedRef.current
        const n = Math.min(MAX_TICKS_PER_FRAME, Math.floor(accRef.current / DT))
        for (let i = 0; i < n && !cr.done; i++) {
          if (i === n - 1) prevRef.current = cr.run.sim.snapshot()
          cr.tick()
          accRef.current -= DT
        }
        if (n > 0) curRef.current = cr.run.sim.snapshot()
        if (n === MAX_TICKS_PER_FRAME) accRef.current = Math.min(accRef.current, DT)
        afterTicks(cr)
      }
    }
    return {
      prev: prevRef.current,
      cur: curRef.current,
      alpha: liveRef.current ? Math.min(1, accRef.current / DT) : 1,
      sensors: capabilitiesOf(designRef.current).has('see-wall') ? cr.run.sim.sensors() : null,
      trail: cr.run.sim.trail,
    }
  }

  function afterTicks(cr: ChallengeRun) {
    const active = cr.run.interp?.ctx.active ?? null
    if (active !== activeRef.current) {
      activeRef.current = active
      cb.current.onActive(active)
    }
    const ev = cr.run.sim.events
    for (let i = eventsSeenRef.current; i < ev.length; i++) {
      const e = ev[i]
      if (e.kind === 'say' && e.text) cb.current.onBubble(`“${e.text}”`)
      else if (e.kind === 'beep') {
        playSound('click')
        cb.current.onBubble('🔔 Beep!')
      } else if (e.kind === 'crash' || e.kind === 'touch') cb.current.onBubble('Bonk!')
      else if (e.kind === 'grab') cb.current.onBubble('Got it!')
      else if (e.kind === 'drop') cb.current.onBubble('Tipped out!')
      else if (e.kind === 'miss') cb.current.onBubble('Nothing in reach!')
      else if (e.kind === 'light') cb.current.onBubble(e.text === 'on' ? '💡 Light on' : 'Light off')
      else if (e.kind === 'stalled' && e.text) cb.current.onBubble(e.text)
    }
    eventsSeenRef.current = ev.length
    if (!cr.done) return
    const req = reqRef.current
    if (!req) return
    const res = judgeChallengeRun(chRef.current, cr, req.program, req.nodes)
    const total = startPoses(chRef.current).length
    if (res.success && cr.startIndex + 1 < total) {
      // Same program, next start pose.
      startRef.current = cr.startIndex + 1
      waitRef.current = BETWEEN_STARTS
      cb.current.onBubble('Now from the other start…')
      return
    }
    setLive(false)
    activeRef.current = null
    cb.current.onActive(null)
    cb.current.onDone(res)
  }

  // A new run request.
  useEffect(() => {
    if (!run || !ready) return
    reqRef.current = run
    startRef.current = 0
    waitRef.current = 0
    const cr = place(0, run.program)
    if (!cr) return
    cb.current.onBubble(null)
    cb.current.onStart(0, startPoses(chRef.current).length)
    if (cr.done) {
      // A locked block: nothing moves, the result says which part is missing.
      cb.current.onDone(judgeChallengeRun(chRef.current, cr, run.program, run.nodes))
      return
    }
    setLive(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new nonce starts a run
  }, [run?.nonce, ready])

  // Reset, a new arena or a new robot: a fresh, idle robot on the start spot.
  useEffect(() => {
    const r = rendererRef.current
    if (!r || !ready) return
    r.setArena(challenge.arena)
    r.setRobot(design)
    reqRef.current = null
    setLive(false)
    place(0, { body: [] })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- place reads refs
  }, [challenge, design, resetNonce, ready])

  useEffect(() => {
    rendererRef.current?.setCameraMode(camera)
  }, [camera, ready])

  return (
    <div className="absolute inset-0">
      <div ref={viewRef} className="absolute inset-0" data-testid="challenge-view" />
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0A1120] text-slate-300">
          <div className="h-16 w-16 animate-pulse rounded-2xl bg-white/10" aria-hidden />
          <p className="text-sm font-bold">{failed ?? 'Getting your robot ready…'}</p>
        </div>
      )}
    </div>
  )
}
