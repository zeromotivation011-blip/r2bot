'use client'

// components/kids/sim/SimChallengeClient.tsx
// One course challenge, ready for the course player:
//
//   <SimChallengeClient arena={getLevel1Arena('L1-S07')} design={myRobot} onResult={…} />
//
// It shows the mission, checks the robot has the parts the mission needs (with
// a one-tap "Fit the …" that puts them on), offers ONLY the mission's picture
// blocks, runs the program in the real-physics arena and judges it against
// every success criterion. onResult fires after every run with
// { success, stars, attempts, program } — the course player decides what to
// reward (reportActivity) so nothing is counted twice.
//
// This file is light (no three.js, Rapier or Blockly): the 3D stage is
// next/dynamic({ ssr: false }) behind a skeleton of the same size.

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { capabilitiesOf, CAPABILITY_NEEDS, getPart, type RobotDesign } from '@/lib/kids/robot-design'
import {
  awardStars,
  compile,
  fitParts,
  keyOfStmt,
  partsToFit,
  referenceFor,
  startPoses,
  type Challenge,
  type ChallengeResult,
  type PicNode,
} from '@/lib/kids/sim/challenge'
import { blockNeeds, type Program } from '@/lib/kids/sim/program'
import { playSound, sparkSays } from '@/lib/kids-audio'
import PictureProgramClient, { cloneNodes, type Cursor } from './PictureProgramClient'
import type { StageRunRequest } from './ChallengeStageClient'
import type { CameraMode } from './renderer'

function StageSkeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0A1120]" aria-busy="true">
      <div className="h-16 w-16 animate-pulse rounded-2xl bg-white/10" aria-hidden />
      <span className="sr-only">Loading the robot arena…</span>
    </div>
  )
}

const Stage = dynamic(() => import('./ChallengeStageClient'), { ssr: false, loading: StageSkeleton })

export interface SimChallengeOutcome {
  success: boolean
  /** 0 when not done; 1 for done, 2–3 for craft (see the challenge's stars). */
  stars: number
  /** Runs so far, this one included. */
  attempts: number
  /** The program that ran (shared block set) and the picture blocks it came from. */
  program: Program
  nodes: PicNode[]
  result: ChallengeResult
}

interface Props {
  arena: Challenge
  design: RobotDesign
  onResult: (outcome: SimChallengeOutcome) => void
  /** Called when the child taps "Fit the …": save the fitted robot if you keep one. */
  onDesignChange?: (design: RobotDesign) => void
  /** Offer "Show me a way" after this many unsuccessful runs (0 = never). Default 3. */
  showMeAfter?: number
}

type Phase = 'edit' | 'running' | 'done'

export default function SimChallengeClient({ arena: ch, design, onResult, onDesignChange, showMeAfter = 3 }: Props) {
  const [fitted, setFitted] = useState<RobotDesign>(design)
  // Follow the caller's robot when it really changes (not when a parent re-renders with an equal object).
  const designKey = `${design.name}|${design.body}|${design.drive}|${design.head}|${design.tool}|${design.sensor}|${design.primary}|${design.accent}`
  useEffect(() => setFitted(design), [designKey]) // eslint-disable-line react-hooks/exhaustive-deps -- keyed on the design's content
  const caps = useMemo(() => capabilitiesOf(fitted), [fitted])
  const toFit = useMemo(() => partsToFit(ch, fitted, caps), [ch, fitted, caps])
  const missingCaps = ch.requires.filter((c) => !caps.has(c))

  const [nodes, setNodes] = useState<PicNode[]>(() => cloneNodes(ch.starter))
  const [cursor, setCursor] = useState<Cursor>({ parent: null, index: ch.starter.length })
  const [phase, setPhase] = useState<Phase>('edit')
  const [result, setResult] = useState<ChallengeResult | null>(null)
  const [stars, setStars] = useState<{ stars: number; two: boolean; three: boolean; claimable: ('two' | 'three')[] } | null>(null)
  const [claimed, setClaimed] = useState<Set<'two' | 'three'>>(new Set())
  const [attempts, setAttempts] = useState(0)
  const [fails, setFails] = useState(0)
  const historyRef = useRef<PicNode[][]>([])
  const [run, setRun] = useState<StageRunRequest | null>(null)
  const [resetNonce, setResetNonce] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [camera, setCamera] = useState<CameraMode>('follow')
  const [activeUid, setActiveUid] = useState<string | null>(null)
  const [bubble, setBubble] = useState<string | null>(null)
  const [startInfo, setStartInfo] = useState<{ i: number; n: number } | null>(null)
  const [ready, setReady] = useState(false)
  /** The result card can be folded away to look at the robot (or its drawing). */
  const [cardOpen, setCardOpen] = useState(true)
  const lastRef = useRef<{ program: Program; nodes: PicNode[] } | null>(null)
  const viewRef = useRef<HTMLDivElement>(null)

  // A new challenge: its starter program, a clean slate.
  useEffect(() => {
    setNodes(cloneNodes(ch.starter))
    setCursor({ parent: null, index: ch.starter.length })
    setPhase('edit')
    setResult(null)
    setStars(null)
    setAttempts(0)
    setFails(0)
    historyRef.current = []
  }, [ch])

  /** Palette blocks the robot cannot use yet. */
  const locked = useMemo(() => {
    const out = new Set<string>()
    for (const b of ch.palette) {
      const need = blockNeeds(b.op)
      if (need && !caps.has(need)) out.add(b.key)
      if (b.fixed.cond !== undefined) {
        const cond = String(b.fixed.cond)
        const sensor = cond === 'bumped' ? 'bumped' : cond.startsWith('distance_cm') ? 'distance_cm' : null
        const n = sensor ? blockNeeds(sensor) : null
        if (n && !caps.has(n)) out.add(b.key)
      }
    }
    return out
  }, [ch, caps])

  const fit = () => {
    const d = fitParts(fitted, toFit)
    setFitted(d)
    onDesignChange?.(d)
    playSound('unlock')
    setBubble(`${toFit.map((p) => getPart(p.slot, p.id)?.name ?? p.id).join(' + ')} fitted!`)
  }

  const go = () => {
    if (phase === 'running' || toFit.length > 0) return
    const program = compile(ch.palette, nodes)
    lastRef.current = { program, nodes }
    setResult(null)
    setStars(null)
    setClaimed(new Set())
    setPhase('running')
    setRun({ nonce: Date.now(), program, nodes })
    playSound('click')
    // Phones: bring the robot into view.
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    viewRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' })
  }

  const reset = () => {
    setPhase('edit')
    setResult(null)
    setStars(null)
    setBubble(null)
    setActiveUid(null)
    setResetNonce((n) => n + 1)
  }

  const onDone = useCallback(
    (res: ChallengeResult) => {
      const last = lastRef.current
      if (!last) return
      const n = attempts + 1
      setAttempts(n)
      setResult(res)
      setCardOpen(true)
      setPhase('done')
      setActiveUid(null)
      const s = awardStars(ch, { nodes: last.nodes, program: last.program, result: res, history: historyRef.current })
      historyRef.current = [...historyRef.current, last.nodes]
      setStars(s)
      if (res.success) {
        playSound(s.stars >= 3 ? 'levelup' : 'star')
        sparkSays(`You did it! ${s.stars} star${s.stars === 1 ? '' : 's'}!`)
      } else {
        setFails((f) => f + 1)
        playSound('wrong')
        sparkSays(res.message)
      }
      onResult({ success: res.success, stars: s.stars, attempts: n, program: last.program, nodes: last.nodes, result: res })
    },
    [attempts, ch, onResult],
  )

  const claim = (which: 'two' | 'three') => {
    if (!stars || !result || !lastRef.current) return
    const next = new Set(claimed)
    next.add(which)
    setClaimed(next)
    const total = Math.min(3, stars.stars + 1)
    setStars({ ...stars, stars: total })
    playSound('star')
    onResult({ success: true, stars: total, attempts, program: lastRef.current.program, nodes: lastRef.current.nodes, result })
  }

  const showMe = () => {
    const ref = cloneNodes(referenceFor(ch, fitted))
    setNodes(ref)
    setCursor({ parent: null, index: ref.length })
    reset()
  }

  const multi = startPoses(ch).length > 1
  const running = phase === 'running'

  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-4" data-testid="sim-challenge" data-challenge={ch.id}>
      {/* Mission + parts */}
      <section className="rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] lg:col-span-2">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-xs font-bold uppercase tracking-wider text-cyan-300">Mission</p>
            <h2 className="font-display text-xl font-bold leading-tight text-slate-50 sm:text-2xl">{ch.title}</h2>
            <p className="mt-1 text-[17px] leading-snug text-slate-300">{ch.mission}</p>
            {multi && <p className="mt-1 text-sm font-bold text-cyan-200">Your program runs from {startPoses(ch).length} starting places. It must work from all of them.</p>}
          </div>
          <button
            type="button"
            onClick={() => sparkSays(ch.mission)}
            aria-label="Read the mission aloud"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08] text-xl hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-slate-100" aria-hidden>
              <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
              <path d="M16 8.5a4.5 4.5 0 010 7M18.5 6a8 8 0 010 12" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {toFit.length > 0 && (
          <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3 sm:flex-row sm:items-center" role="note" data-testid="parts-check">
            <p className="flex-1 text-[15px] font-bold text-amber-100">
              🔧 This mission needs {missingCaps.map((c) => CAPABILITY_NEEDS[c]).join(' and ')}. {fitted.name} doesn’t have {toFit.length > 1 ? 'them' : 'it'} yet.
            </p>
            <button
              type="button"
              onClick={fit}
              data-testid="fit-part"
              className="min-h-[48px] rounded-2xl bg-amber-400 px-4 text-base font-black text-[#1A1103] shadow transition-transform hover:bg-amber-300 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            >
              {toFit.map((p) => `${getPart(p.slot, p.id)?.emoji ?? ''} Fit the ${getPart(p.slot, p.id)?.name ?? p.id}`).join(' + ')}
            </button>
          </div>
        )}
      </section>

      {/* Arena */}
      <div ref={viewRef} className="flex min-w-0 scroll-mt-2 flex-col gap-2 lg:sticky lg:top-4">
        <div className="relative h-[44vh] min-h-[280px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0A1120] sm:h-[50vh] lg:h-[520px]">
          <Stage
            challenge={ch}
            design={fitted}
            run={run}
            resetNonce={resetNonce}
            speed={speed}
            camera={camera}
            onActive={(id) => setActiveUid(id ? id.slice(keyOfStmt(id).length + 1) : null)}
            onBubble={setBubble}
            onDone={onDone}
            onReady={() => setReady(true)}
            onStart={(i, n) => setStartInfo({ i, n })}
          />
          {bubble && (
            <div className="pointer-events-none absolute left-1/2 top-3 max-w-[78%] -translate-x-1/2 rounded-2xl bg-white px-4 py-2 text-center text-sm font-black text-[#0A1120] shadow-lg" aria-live="polite">
              {bubble}
            </div>
          )}
          {multi && startInfo && running && (
            <div className="pointer-events-none absolute left-3 top-3 rounded-xl bg-black/55 px-3 py-1.5 text-xs font-black text-cyan-200 backdrop-blur">
              Start {startInfo.i + 1} of {startInfo.n}
            </div>
          )}
          <div className="absolute right-3 top-3 flex gap-1 rounded-2xl bg-black/45 p-1 backdrop-blur" role="group" aria-label="Camera">
            {(
              [
                ['follow', 'Follow'],
                ['top', 'Map'],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setCamera(m)}
                aria-pressed={camera === m}
                className={`min-h-[44px] min-w-[48px] rounded-xl px-2.5 text-xs font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${camera === m ? 'bg-amber-400 text-[#1A1103]' : 'text-slate-100 hover:bg-white/10'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {result && !cardOpen && (
            <button
              type="button"
              onClick={() => setCardOpen(true)}
              className="absolute bottom-3 left-3 min-h-[44px] rounded-2xl bg-black/60 px-4 text-sm font-black text-slate-50 backdrop-blur focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            >
              {result.success ? `${'⭐'.repeat(stars?.stars ?? 1)} Show result` : 'Show what happened'}
            </button>
          )}
          {result && cardOpen && (
            <div
              role="status"
              data-testid="challenge-result"
              data-success={result.success ? 'yes' : 'no'}
              data-stars={stars?.stars ?? 0}
              className={`absolute inset-x-3 bottom-3 rounded-[20px] py-3 pl-4 pr-12 shadow-[0_8px_24px_rgba(0,0,0,.45)] ${result.success ? 'bg-[#0F2A1C]/95 ring-2 ring-emerald-400' : 'bg-[#2A1410]/95 ring-2 ring-amber-400/70'}`}
            >
              <button
                type="button"
                onClick={() => setCardOpen(false)}
                aria-label="Hide the result and look at the arena"
                className="absolute right-1.5 top-1.5 flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
              </button>
              {result.success ? (
                <>
                  <p className="flex items-center gap-2 font-display text-lg font-bold text-emerald-200">
                    <span className="flex gap-0.5" aria-label={`${stars?.stars ?? 1} of 3 stars`}>
                      {[1, 2, 3].map((i) => (
                        <span key={i} className={`text-2xl ${i <= (stars?.stars ?? 1) ? 'motion-safe:animate-[pulse_1s_ease-out_1]' : 'opacity-25 grayscale'}`} aria-hidden>
                          ⭐
                        </span>
                      ))}
                    </span>
                    Mission done!
                  </p>
                  <ul className="mt-1 space-y-1 text-sm text-slate-200">
                    {(['two', 'three'] as const).map((w) => {
                      const got = stars?.[w] || claimed.has(w)
                      const canClaim = stars?.claimable.includes(w) && !claimed.has(w)
                      return (
                        <li key={w} className="flex items-center gap-2">
                          <span aria-hidden>{got ? '⭐' : '☆'}</span>
                          <span className="flex-1">{ch.stars[w].text}</span>
                          {canClaim && (
                            <button
                              type="button"
                              onClick={() => claim(w)}
                              className="min-h-[44px] shrink-0 rounded-xl bg-white/10 px-3 text-xs font-black text-slate-50 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                            >
                              I did this
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </>
              ) : (
                <>
                  <p className="font-display text-lg font-bold text-amber-200">Not yet — let’s fix it!</p>
                  <p className="text-[15px] font-semibold text-slate-100">{result.message}</p>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Run controls">
          <button
            type="button"
            onClick={go}
            disabled={!ready || running || toFit.length > 0 || nodes.length === 0}
            data-testid="challenge-go"
            className="min-h-[52px] flex-1 rounded-2xl bg-amber-400 px-6 font-display text-lg font-bold text-[#1A1103] shadow-[0_8px_24px_rgba(252,104,24,.35)] transition-transform hover:bg-amber-300 active:scale-[.97] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 sm:flex-none"
          >
            ▶ Go!
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={!ready}
            className="min-h-[52px] rounded-2xl bg-white/[0.08] px-4 font-bold text-slate-100 hover:bg-white/15 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            ↺ Reset
          </button>
          <div className="ml-auto flex items-center gap-1 rounded-2xl bg-white/[0.05] p-1" role="group" aria-label="Speed">
            {[1, 2].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                aria-pressed={speed === s}
                className={`min-h-[44px] min-w-[48px] rounded-xl text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${speed === s ? 'bg-cyan-400 text-[#0A1120]' : 'text-slate-200 hover:bg-white/10'}`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Picture blocks */}
      <section aria-label="Your program" className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="mr-auto font-display text-lg font-bold text-slate-50">Your program</h3>
          {showMeAfter > 0 && fails >= showMeAfter && (
            <button
              type="button"
              onClick={showMe}
              disabled={running}
              data-testid="show-me"
              className="min-h-[44px] rounded-2xl border border-amber-400/50 px-3 text-sm font-black text-amber-300 hover:bg-amber-400/10 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            >
              💡 Show me a way
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setNodes(cloneNodes(ch.starter))
              setCursor({ parent: null, index: ch.starter.length })
            }}
            disabled={running}
            className="min-h-[44px] rounded-2xl border border-white/15 px-3 text-sm font-black text-slate-200 hover:bg-white/10 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            Start over
          </button>
        </div>
        <PictureProgramClient
          palette={ch.palette}
          nodes={nodes}
          cursor={cursor}
          onChange={(n, c) => {
            setNodes(n)
            setCursor(c)
            if (phase === 'done') setPhase('edit')
          }}
          locked={locked}
          activeUid={activeUid}
          disabled={running}
        />
      </section>
    </div>
  )
}
