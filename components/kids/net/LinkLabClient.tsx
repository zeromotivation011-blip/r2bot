'use client'

// components/kids/net/LinkLabClient.tsx
// The Link Lab (roadmap #88), the interactive half of /kids/lab/network.
// Pick a level, choose the protections, then drive a rover over a radio link
// that is slow, lossy, jumbled or cut. You see only the video that made it
// back. After the run the true path is revealed with the events that explain
// what went wrong (a lost STOP, an old FORWARD obeyed, a watchdog stop).
//
// Rewards: one reportBestRun per level (kind 'challenge', score = stars), only
// for a docked run, so a replay pays only when it beats the child's own best.
// Respects: reduced motion (no effects to cut — the sim is the content),
// high contrast, switch scanning (tap-to-latch controls), "more time"
// (kidsTimeLimit), Lite 3D (canvas DPR), Present mode (slow motion / freeze),
// and pauses while the tab is hidden.

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { KIDS_PROGRESS_EVENT, getProgress } from '@/lib/kids-progress'
import { reportBestRun } from '@/lib/kids/universe/rewards'
import { kidsTimeLimit, liteDpr, useKidsReducedMotion, useKidsSettings } from '@/lib/kids/settings'
import { readPresentSignal } from '@/lib/kids/teach/present-bridge'
import { playSound } from '@/lib/kids-audio'
import { ARENA, DEFAULT_PROTECTIONS, DT, LEVELS, LINK_BEST_PREFIX, cmdWord, createState, scoreRun, setControl, step, type Cmd, type LevelDef, type LinkState, type Protections, type RunScore, type SimEvent } from './link-sim'
import { drawLink } from './link-render'

const MISSION_S = 240

const card = 'rounded-[20px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:p-5'
const focus = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
const btnPrimary = `inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-amber-400 px-5 font-display text-base font-black text-[#1A1103] hover:bg-amber-300 ${focus}`
const btnGhost = `inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-4 text-sm font-bold text-slate-100 hover:bg-white/10 ${focus}`

const FIX_INFO: Record<'ack' | 'seq' | 'watchdog' | 'predict', { label: string; icon: string; what: string }> = {
  ack: { label: 'Ack + retry', icon: '📥', what: 'Number every command. The robot replies “got #7”. No reply in time? Send it again.' },
  seq: { label: 'Sequence numbers', icon: '🔢', what: 'The robot ignores any command older than the newest one it has obeyed.' },
  watchdog: { label: 'Watchdog stop', icon: '🐕', what: 'Send the command 10 times a second. If the robot hears nothing fresh for a moment, it stops itself.' },
  predict: { label: 'Predicted position', icon: '🔮', what: 'Draw where the robot probably is NOW, worked out from the old video and its speed.' },
}

function bestsFromStore(): Record<string, number> {
  const pb = getProgress().personalBests
  const out: Record<string, number> = {}
  for (const l of LEVELS) {
    const v = pb[LINK_BEST_PREFIX + l.id]
    if (typeof v === 'number') out[l.id] = v
  }
  return out
}

function Stars({ n, label }: { n: number; label?: string }) {
  return (
    <span aria-label={label ?? `${n} of 3 stars`} className="whitespace-nowrap font-display text-base">
      {[0, 1, 2].map((i) => (
        <span key={i} aria-hidden className={i < n ? 'text-amber-300' : 'text-white/20'}>
          ★
        </span>
      ))}
    </span>
  )
}

interface Hud {
  t: number
  sent: number
  lost: number
  resends: number
  watchdogStops: number
  needless: number
  bumps: number
  videoAge: number
  control: Cmd
  last: SimEvent | null
  packets: { t: number; dir: 'up' | 'down'; ok: boolean; stop: boolean }[]
}

function hudOf(s: LinkState): Hud {
  const recent = s.packets.filter((p) => s.t - p.t < 4)
  return {
    t: s.t,
    sent: s.stats.sent,
    lost: s.stats.lost,
    resends: s.stats.resends,
    watchdogStops: s.stats.watchdogStops,
    needless: s.stats.needlessStops,
    bumps: s.stats.bumps,
    videoAge: s.seen ? s.t - s.seen.t : s.t,
    control: s.control,
    last: s.events.length ? s.events[s.events.length - 1] : null,
    packets: recent,
  }
}

/** The last 4 s of radio traffic: dots that are hollow when a message was lost. */
function PacketStrip({ hud }: { hud: Hud }) {
  const W = 320
  return (
    <svg viewBox={`0 0 ${W} 44`} className="h-11 w-full" aria-hidden>
      <text x="2" y="12" fill="#A7B0C0" fontSize="10" fontWeight="700">to robot</text>
      <text x="2" y="38" fill="#A7B0C0" fontSize="10" fontWeight="700">to you</text>
      <line x1="56" y1="9" x2={W} y2="9" stroke="rgba(255,255,255,.08)" />
      <line x1="56" y1="35" x2={W} y2="35" stroke="rgba(255,255,255,.08)" />
      {hud.packets.map((p, i) => {
        const x = 56 + ((p.t - (hud.t - 4)) / 4) * (W - 62)
        const y = p.dir === 'up' ? 9 : 35
        const r = p.stop ? 5 : 3
        return p.ok ? (
          <circle key={i} cx={x} cy={y} r={r} fill={p.dir === 'up' ? (p.stop ? '#FBBF24' : '#FC6818') : '#22D3EE'} />
        ) : (
          <g key={i}>
            <circle cx={x} cy={y} r={r + 1} fill="none" stroke="#F87171" strokeWidth="1.5" />
            <line x1={x - r} y1={y - r} x2={x + r} y2={y + r} stroke="#F87171" strokeWidth="1.5" />
          </g>
        )
      })}
    </svg>
  )
}

type Phase = 'setup' | 'run' | 'done'

interface Result {
  score: RunScore
  reason: string
  outcome: LinkState['outcome']
  events: SimEvent[]
  stats: LinkState['stats']
  improved: boolean
  xp: number
}

export default function LinkLabClient() {
  const settings = useKidsSettings()
  const reduced = useKidsReducedMotion()
  const [levelId, setLevelId] = useState<string>(LEVELS[0].id)
  const level = LEVELS.find((l) => l.id === levelId) ?? LEVELS[0]
  const [prot, setProt] = useState<Protections>(DEFAULT_PROTECTIONS)
  const [phase, setPhase] = useState<Phase>('setup')
  const [hud, setHud] = useState<Hud | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [bests, setBests] = useState<Record<string, number>>({})
  const [latch, setLatch] = useState(false)
  const [paused, setPaused] = useState(false)
  const attemptsRef = useRef<Record<string, number>>({})

  const simRef = useRef<LinkState | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const widthRef = useRef(640)
  const heldRef = useRef<Cmd[]>([])
  const pausedRef = useRef(false)
  pausedRef.current = paused

  // Switch scanning and keyboard-only setups: latch by default.
  useEffect(() => {
    if (settings.scanMode !== 'off') setLatch(true)
  }, [settings.scanMode])

  useEffect(() => {
    const read = () => setBests(bestsFromStore())
    read()
    window.addEventListener(KIDS_PROGRESS_EVENT, read)
    window.addEventListener('storage', read)
    return () => {
      window.removeEventListener(KIDS_PROGRESS_EVENT, read)
      window.removeEventListener('storage', read)
    }
  }, [])

  const redraw = useCallback(() => {
    const s = simRef.current
    const c = canvasRef.current
    if (!s || !c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    drawLink(ctx, s, { width: widthRef.current, dpr: liteDpr(2), reveal: s.outcome !== 'running', highContrast: settings.highContrast })
  }, [settings.highContrast])

  // Size the canvas to its box (16:10).
  useEffect(() => {
    const wrap = wrapRef.current
    const c = canvasRef.current
    if (!wrap || !c) return
    const fit = () => {
      const w = Math.max(280, Math.floor(wrap.clientWidth))
      widthRef.current = w
      const dpr = liteDpr(2)
      c.width = Math.round(w * dpr)
      c.height = Math.round(((w * ARENA.h) / ARENA.w) * dpr)
      c.style.width = `${w}px`
      c.style.height = `${(w * ARENA.h) / ARENA.w}px`
      redraw()
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [phase, redraw])

  // A preview of the level while choosing.
  useEffect(() => {
    if (phase !== 'setup') return
    simRef.current = createState(level, prot, Infinity)
    redraw()
  }, [phase, level, prot, redraw])

  /** On phones the Start button sits below the arena: bring the arena (and the drive pad under it) into view. */
  const showArena = () => {
    requestAnimationFrame(() => wrapRef.current?.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }))
  }

  const finish = useCallback(
    (s: LinkState) => {
      const score = scoreRun(s)
      const lv = s.level
      const attempts = (attemptsRef.current[lv.id] = (attemptsRef.current[lv.id] ?? 0) + 1)
      let improved = false
      let xp = 0
      if (score.stars >= 1) {
        const r = reportBestRun({
          kind: 'challenge',
          id: LINK_BEST_PREFIX + lv.id,
          stars: score.stars,
          score: score.stars,
          attempts,
          badges: lv.badge ? [lv.badge] : undefined,
        })
        improved = !!r
        xp = r?.xpGained ?? 0
        playSound('correct')
      } else playSound('wrong')
      if (score.stars >= 1) attemptsRef.current[lv.id] = 0
      setResult({ score, reason: s.reason, outcome: s.outcome, events: s.events.slice(-40), stats: { ...s.stats }, improved, xp })
      setHud(hudOf(s))
      setPhase('done')
      showArena()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // The run loop.
  useEffect(() => {
    if (phase !== 'run') return
    let raf = 0
    let prev = performance.now()
    let acc = 0
    let hudAt = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const s = simRef.current
      if (!s) return
      const real = Math.min(0.1, (now - prev) / 1000)
      prev = now
      const present = readPresentSignal()
      if (document.hidden || pausedRef.current || present.frozen) return
      acc += real * present.speed
      while (acc >= DT && s.outcome === 'running') {
        step(s)
        acc -= DT
      }
      redraw()
      if (now - hudAt > 100) {
        hudAt = now
        setHud(hudOf(s))
      }
      if (s.outcome !== 'running') {
        cancelAnimationFrame(raf)
        finish(s)
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [phase, redraw, finish])

  const drive = useCallback((cmd: Cmd) => {
    const s = simRef.current
    if (!s || s.outcome !== 'running') return
    setControl(s, cmd)
  }, [])

  const press = useCallback(
    (cmd: Cmd) => {
      if (cmd === 'stop') {
        heldRef.current = []
        drive('stop')
        return
      }
      heldRef.current = [...heldRef.current.filter((c) => c !== cmd), cmd]
      drive(cmd)
    },
    [drive],
  )
  const release = useCallback(
    (cmd: Cmd) => {
      heldRef.current = heldRef.current.filter((c) => c !== cmd)
      drive(heldRef.current.length ? heldRef.current[heldRef.current.length - 1] : 'stop')
    },
    [drive],
  )

  // Keyboard: arrows / WASD hold to drive, Space stops.
  useEffect(() => {
    if (phase !== 'run') return
    const map: Record<string, Cmd> = { ArrowUp: 'fwd', w: 'fwd', W: 'fwd', ArrowDown: 'back', s: 'back', S: 'back', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' }
    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return
      if (e.key === ' ' && !(t && t.tagName === 'BUTTON')) {
        e.preventDefault()
        press('stop')
        return
      }
      const c = map[e.key]
      if (!c) return
      e.preventDefault()
      if (e.repeat) return
      if (latch) {
        heldRef.current = []
        drive(c)
      } else press(c)
    }
    const up = (e: KeyboardEvent) => {
      const c = map[e.key]
      if (!c || latch) return
      release(c)
    }
    const blur = () => {
      if (!latch) press('stop')
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [phase, latch, press, release, drive])

  const start = () => {
    heldRef.current = []
    simRef.current = createState(level, prot, kidsTimeLimit(MISSION_S))
    setResult(null)
    setPaused(false)
    setHud(hudOf(simRef.current))
    setPhase('run')
    playSound('click')
    showArena()
  }

  const abort = () => {
    const s = simRef.current
    if (s && s.outcome === 'running') {
      s.outcome = 'timeout'
      s.reason = 'You ended the run.'
      finish(s)
    }
  }

  const chooseLevel = (l: LevelDef) => {
    setLevelId(l.id)
    setPhase('setup')
    setResult(null)
  }

  const setFix = <K extends keyof Protections>(k: K, v: Protections[K]) => setProt((p) => ({ ...p, [k]: v }))

  const nextLevel = LEVELS[LEVELS.findIndex((l) => l.id === level.id) + 1]
  const recommended = LEVELS.find((l) => !(bests[l.id] >= 1))?.id

  return (
    <section aria-labelledby="link-lab-title" className="mx-auto max-w-6xl px-4 pb-8">
      <h2 id="link-lab-title" className="sr-only">
        Link Lab
      </h2>

      {/* Level picker */}
      <nav aria-label="Link Lab levels">
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {LEVELS.map((l) => {
            const on = l.id === level.id
            const best = bests[l.id] ?? 0
            return (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => chooseLevel(l)}
                  disabled={phase === 'run'}
                  aria-current={on ? 'true' : undefined}
                  className={`flex min-h-[72px] w-full flex-col items-start rounded-2xl border px-3 py-2 text-left transition disabled:opacity-50 ${focus} ${
                    on ? 'border-amber-300 bg-amber-400/15' : 'border-white/10 bg-[#111C32] hover:border-white/25'
                  }`}
                >
                  <span className="text-[12px] font-bold uppercase tracking-wide text-[#A7B0C0]">
                    {l.n}. {l.band === 'inventors' ? 'Inventors' : 'Engineers'}
                    {recommended === l.id && <span className="ml-1 text-amber-300">· next</span>}
                  </span>
                  <span className="font-display text-[15px] font-bold leading-tight text-[#EEF2F8]">{l.name}</span>
                  <Stars n={best} label={best ? `best ${best} of 3 stars` : 'not docked yet'} />
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* Arena */}
        <div>
          <div ref={wrapRef} className="relative scroll-mt-20 overflow-hidden rounded-3xl border border-white/10 bg-[#111C32]">
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={
                phase === 'done'
                  ? `After the run: the orange line is where the robot really went, the dashed cyan line is what your video showed. ${result?.reason ?? ''}`
                  : `Top-down view of the yard. The cyan robot is the last video frame that reached you. Dock at ${level.dock.x.toFixed(0)} metres across.`
              }
              className="block touch-none select-none"
            />
            {phase === 'run' && paused && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0A1120]/70">
                <p className="font-display text-2xl font-black text-white">Paused</p>
              </div>
            )}
          </div>
          {phase === 'done' && (
            <p className="mt-2 text-sm text-[#A7B0C0]">
              <span className="font-bold text-orange-400">━ where the robot really went</span> ·{' '}
              <span className="font-bold text-cyan-300">┅ what your video showed</span>
            </p>
          )}

          {phase === 'run' && hud && (
            <div className="mt-3 space-y-3">
              <div className={`${card} !p-3`}>
                <dl className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6" aria-live="off">
                  {[
                    ['Time', `${hud.t.toFixed(1)} s`],
                    ['Video age', `${hud.videoAge.toFixed(1)} s`],
                    ['Sent', String(hud.sent)],
                    ['Lost', String(hud.lost)],
                    ['Resends', String(hud.resends)],
                    ['Watchdog stops', String(hud.watchdogStops)],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[11px] font-bold uppercase tracking-wide text-[#A7B0C0]">{k}</dt>
                      <dd className="font-display text-lg font-black text-white tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
                <PacketStrip hud={hud} />
                <p className="min-h-[1.5rem] text-sm text-cyan-100" role="status">
                  {hud.last ? hud.last.text : 'Hold a direction to drive. Let go to send STOP.'}
                </p>
              </div>

              <DrivePad latch={latch} control={hud.control} onPress={press} onRelease={release} onLatch={(c) => { heldRef.current = []; drive(c) }} />

              <div className="flex flex-wrap items-center gap-2">
                <label className={`inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-2xl border border-white/15 px-3 text-sm font-bold text-slate-100 ${focus}`}>
                  <input type="checkbox" className="h-5 w-5 accent-amber-400" checked={latch} onChange={(e) => setLatch(e.target.checked)} />
                  Tap to latch (no holding)
                </label>
                <button type="button" className={btnGhost} onClick={() => setPaused((p) => !p)}>
                  {paused ? 'Resume' : 'Pause'}
                </button>
                <button type="button" className={btnGhost} onClick={abort}>
                  End run
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {phase !== 'done' && (
            <div className={card}>
              <p className="text-xs font-black uppercase tracking-wider text-amber-300">
                Level {level.n} · for {level.band === 'inventors' ? 'Inventors (11–13)' : 'Engineers (14–17)'}
              </p>
              <h3 className="mt-1 font-display text-2xl font-black text-white">{level.name}</h3>
              <p className="mt-2 text-[15px] leading-snug text-slate-200">{level.story}</p>
              <p className="mt-2 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-3 text-[15px] leading-snug text-amber-100">
                <span className="font-bold">The problem: </span>
                {level.problem}
              </p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-white/5 p-2">
                  <dt className="text-[11px] font-bold uppercase text-[#A7B0C0]">Delay</dt>
                  <dd className="font-display text-lg font-black text-white">{level.link.latencyMs} ms</dd>
                </div>
                <div className="rounded-2xl bg-white/5 p-2">
                  <dt className="text-[11px] font-bold uppercase text-[#A7B0C0]">Jitter</dt>
                  <dd className="font-display text-lg font-black text-white">±{level.link.jitterMs} ms</dd>
                </div>
                <div className="rounded-2xl bg-white/5 p-2">
                  <dt className="text-[11px] font-bold uppercase text-[#A7B0C0]">Lost</dt>
                  <dd className="font-display text-lg font-black text-white">{Math.round(level.link.loss * 100)}%</dd>
                </div>
              </dl>
            </div>
          )}

          {phase === 'setup' && (
            <div className={card}>
              <h3 className="font-display text-xl font-black text-white">Your protections</h3>
              {level.fixes.length === 0 ? (
                <p className="mt-2 text-[15px] text-slate-200">Nothing to set on a perfect link. Just drive!</p>
              ) : (
                <p className="mt-1 text-sm text-[#A7B0C0]">Try it with everything off first and watch what breaks. Then turn on a fix and try again.</p>
              )}
              <div className="mt-3 space-y-2">
                {(['ack', 'seq', 'watchdog', 'predict'] as const)
                  .filter((f) => level.fixes.includes(f))
                  .map((f) => (
                    <label key={f} className={`flex min-h-[56px] cursor-pointer items-start gap-3 rounded-2xl border p-3 ${prot[f] ? 'border-amber-300/60 bg-amber-400/10' : 'border-white/10 bg-[#111C32]'}`}>
                      <input
                        type="checkbox"
                        className="mt-1 h-6 w-6 shrink-0 accent-amber-400"
                        checked={prot[f]}
                        onChange={(e) => {
                          setFix(f, e.target.checked)
                          playSound('click')
                        }}
                      />
                      <span>
                        <span className="block font-bold text-white">
                          <span aria-hidden>{FIX_INFO[f].icon} </span>
                          {FIX_INFO[f].label}
                        </span>
                        <span className="block text-sm leading-snug text-[#A7B0C0]">{FIX_INFO[f].what}</span>
                      </span>
                    </label>
                  ))}
                {level.fixes.includes('speed') && (
                  <Slider label="Speed limit" value={Math.round(prot.speed * 100)} min={30} max={100} step={10} unit="%" onChange={(v) => setFix('speed', v / 100)} hint="Slower means a shorter overshoot when you are late to stop." />
                )}
                {level.fixes.includes('retryMs') && (
                  <Slider label="Resend after" value={prot.retryMs} min={100} max={1500} step={50} unit=" ms" onChange={(v) => setFix('retryMs', v)} hint="Too short floods the link with copies; too long leaves a lost STOP unsent." />
                )}
                {level.fixes.includes('watchdogMs') && (
                  <Slider label="Watchdog timeout" value={prot.watchdogMs} min={150} max={3000} step={50} unit=" ms" onChange={(v) => setFix('watchdogMs', v)} hint="Too short stops for every slow patch; too long lets the robot drive blind." />
                )}
              </div>
              <p className="mt-3 text-sm text-[#A7B0C0]">
                <span className="font-bold text-slate-200">Stars:</span> ★ dock safely · ★ {level.requiredText} ·{' '}
                ★ clean run (≤ {level.maxBumps} bumps{level.maxNeedless ? `, ≤ ${level.maxNeedless} needless watchdog stops` : ''}).
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className={btnPrimary} onClick={start}>
                  Start the run
                </button>
                <button type="button" className={btnGhost} onClick={() => setProt(DEFAULT_PROTECTIONS)}>
                  All protections off
                </button>
              </div>
              <p className="mt-3 text-sm text-[#A7B0C0]">Controls: hold ▲ ◀ ▶ ▼ (or the arrow keys / W A S D) to drive. Let go to stop. Space = STOP.</p>
            </div>
          )}

          {phase === 'done' && result && (
            <div className={card} aria-live="polite">
              <p className="text-xs font-black uppercase tracking-wider text-amber-300">Level {level.n} · {level.name}</p>
              <h3 className="mt-1 font-display text-2xl font-black text-white" data-cue={result.score.docked ? 'ok' : 'no'}>
                {result.score.docked ? 'Docked!' : result.outcome === 'fell' ? 'The robot fell into the pit' : 'Not docked this time'}
              </h3>
              <div className="mt-1">
                <Stars n={result.score.stars} />
              </div>
              <p className="mt-2 text-[15px] leading-snug text-slate-200">{result.reason}</p>
              <ul className="mt-3 space-y-1 text-[15px]">
                <li className={result.score.docked ? 'text-emerald-300' : 'text-[#A7B0C0]'}>{result.score.docked ? '✓' : '○'} Docked safely</li>
                <li className={result.score.protectedRight ? 'text-emerald-300' : 'text-[#A7B0C0]'}>
                  {result.score.protectedRight ? '✓' : '○'} {level.requiredText}
                </li>
                <li className={result.score.clean && result.score.docked ? 'text-emerald-300' : 'text-[#A7B0C0]'}>
                  {result.score.clean && result.score.docked ? '✓' : '○'} Clean run: {result.stats.bumps} bumps, {result.stats.needlessStops} needless stops
                </li>
              </ul>
              {result.improved && result.xp > 0 && <p className="mt-2 font-bold text-amber-300">+{result.xp} XP</p>}
              {result.score.docked && !result.improved && <p className="mt-2 text-sm text-[#A7B0C0]">Beat your best to earn more XP.</p>}

              <h4 className="mt-4 font-display text-lg font-black text-white">What happened on the radio</h4>
              <p className="text-sm text-[#A7B0C0]">
                {result.stats.sent} {result.stats.sent === 1 ? 'message' : 'messages'} sent, {result.stats.lost} lost, {result.stats.resends} {result.stats.resends === 1 ? 'resend' : 'resends'}
                {result.stats.staleObeyed ? `, ${result.stats.staleObeyed} old commands obeyed` : ''}
                {result.stats.staleIgnored ? `, ${result.stats.staleIgnored} old commands ignored` : ''}
                {result.stats.watchdogStops ? `, ${result.stats.watchdogStops} watchdog stops` : ''}.
              </p>
              <EventList events={result.events} />

              <p className="mt-3 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 p-3 text-[15px] leading-snug text-cyan-50">
                <span className="font-bold">The idea: </span>
                {level.lesson}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className={btnPrimary} onClick={() => setPhase('setup')}>
                  Change protections and try again
                </button>
                {nextLevel && result.score.docked && (
                  <button type="button" className={btnGhost} onClick={() => chooseLevel(nextLevel)}>
                    Next: {nextLevel.name}
                  </button>
                )}
                {!nextLevel && result.score.docked && (
                  <Link href="/kids/lab/network/guardian" className={btnGhost}>
                    Next: Robot Security Check
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function EventList({ events }: { events: SimEvent[] }) {
  const important = events.filter((e) => e.kind !== 'resend' && e.kind !== 'lost-cmd' && e.kind !== 'weak-enter')
  const shown = (important.length ? important : events).slice(-6)
  if (!shown.length) return <p className="mt-2 text-sm text-[#A7B0C0]">Nothing went wrong on the radio this time.</p>
  return (
    <ol className="mt-2 space-y-1">
      {shown.map((e, i) => (
        <li key={`${e.t}-${i}`} className="flex gap-2 text-sm leading-snug text-slate-200">
          <span className="w-12 shrink-0 font-mono text-[#A7B0C0]">{e.t.toFixed(1)}s</span>
          <span>{e.text}</span>
        </li>
      ))}
    </ol>
  )
}

function Slider({ label, value, min, max, step, unit, onChange, hint }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void; hint: string }) {
  const id = `slider-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111C32] p-3">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="font-bold text-white">
          {label}
        </label>
        <span className="font-display font-black tabular-nums text-amber-300">
          {value}
          {unit}
        </span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className={`mt-2 h-11 w-full accent-amber-400 ${focus}`} aria-describedby={`${id}-hint`} />
      <p id={`${id}-hint`} className="text-sm leading-snug text-[#A7B0C0]">
        {hint}
      </p>
    </div>
  )
}

const PAD: { cmd: Cmd; label: string; glyph: string; area: string }[] = [
  { cmd: 'fwd', label: 'Forward', glyph: '▲', area: 'col-start-2 row-start-1' },
  { cmd: 'left', label: 'Turn left', glyph: '◀', area: 'col-start-1 row-start-2' },
  { cmd: 'right', label: 'Turn right', glyph: '▶', area: 'col-start-3 row-start-2' },
  { cmd: 'back', label: 'Back', glyph: '▼', area: 'col-start-2 row-start-3' },
]

function DrivePad({ latch, control, onPress, onRelease, onLatch }: { latch: boolean; control: Cmd; onPress: (c: Cmd) => void; onRelease: (c: Cmd) => void; onLatch: (c: Cmd) => void }) {
  return (
    <div className="flex items-center justify-center gap-6" data-read-aloud="off">
      <div className="grid grid-cols-3 grid-rows-3 gap-2" role="group" aria-label="Drive controls">
        {PAD.map((p) => {
          const on = control === p.cmd
          return (
            <button
              key={p.cmd}
              type="button"
              aria-label={latch ? `${p.label} (tap to latch)` : `${p.label} (hold)`}
              aria-pressed={on}
              className={`${p.area} flex h-16 w-16 select-none items-center justify-center rounded-2xl border text-2xl font-black touch-none ${focus} ${
                on ? 'border-amber-200 bg-amber-400 text-[#1A1103]' : 'border-white/15 bg-[#19263F] text-white active:bg-white/20'
              }`}
              onPointerDown={(e) => {
                if (latch) return
                e.preventDefault()
                e.currentTarget.setPointerCapture?.(e.pointerId)
                onPress(p.cmd)
              }}
              onPointerUp={() => {
                if (!latch) onRelease(p.cmd)
              }}
              onPointerCancel={() => {
                if (!latch) onRelease(p.cmd)
              }}
              onKeyDown={(e) => {
                if (latch || (e.key !== 'Enter' && e.key !== ' ')) return
                e.preventDefault()
                e.stopPropagation()
                if (!e.repeat) onPress(p.cmd)
              }}
              onKeyUp={(e) => {
                if (latch || (e.key !== 'Enter' && e.key !== ' ')) return
                e.preventDefault()
                e.stopPropagation()
                onRelease(p.cmd)
              }}
              onClick={() => {
                if (latch) onLatch(p.cmd)
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              <span aria-hidden>{p.glyph}</span>
            </button>
          )
        })}
        <button
          type="button"
          aria-label="Stop"
          className={`col-start-2 row-start-2 flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-200 bg-red-600 font-display text-sm font-black text-white touch-none ${focus}`}
          onPointerDown={(e) => {
            e.preventDefault()
            onPress('stop')
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return
            e.preventDefault()
            e.stopPropagation()
            onPress('stop')
          }}
          onClick={() => onPress('stop')}
        >
          STOP
        </button>
      </div>
      <p className="hidden max-w-[10rem] text-sm text-[#A7B0C0] sm:block">
        You are holding: <span className="font-bold text-white">{cmdWord(control)}</span>
      </p>
    </div>
  )
}
