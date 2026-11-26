'use client'

// components/kids/episodes/EpisodePlayerClient.tsx
// The R2BOT Kids episode player: a real-time 3D cartoon (three.js, loaded
// lazily behind a same-size poster) with natural pre-generated voices,
// captions that follow the words, a gentle music bed, "what do you think?"
// pauses, and kid-sized controls (play/pause, replay line, skip, captions,
// speed, sound, full screen).
//
// Props: { sessionId, onDone }. `onDone` fires once when the episode has
// played to its end. The player itself reports the reward
// (reportActivity kind 'episode', id `episode-<sessionId>`), so callers must
// NOT report 'episode' again.
//
// ?record=1 on the page URL: autoplay, no controls, choices auto-continue,
// and the clip timings are exposed for scripts/kids-voices/record-episode.mjs.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SparkCharacter } from '@/components/kids/SparkCharacter'
import { loadDesign } from '@/lib/kids/robot-design'
import { reportActivity } from '@/lib/kids/universe/rewards'
import { planEpisode, type Beat, type ChoiceBeat, type EpisodePlan } from '@/lib/kids/episodes/plan'
import { episodeUrl, normaliseSessionId, type EpisodeData } from '@/lib/kids/episodes/types'
import type { Director } from './engine/director'

export interface EpisodePlayerProps {
  sessionId: string
  onDone: () => void
}

type DirectorModule = typeof import('./engine/director')

let enginePromise: Promise<DirectorModule> | null = null
function loadEngine(): Promise<DirectorModule> {
  enginePromise ??= import('./engine/director')
  return enginePromise
}

const SPEAKER: Record<string, { name: string; chip: string }> = {
  narrator: { name: 'Narrator', chip: 'bg-white/15 text-[#EEF2F8]' },
  spark: { name: 'Spark', chip: 'bg-amber-500 text-[#1A1103]' },
  amara: { name: 'Amara', chip: 'bg-yellow-300 text-[#1A1103]' },
  lucia: { name: 'Nana Lucía', chip: 'bg-rose-300 text-[#1A1103]' },
  bolt: { name: 'Bolt', chip: 'bg-cyan-400 text-[#1A1103]' },
  myrobot: { name: 'Your robot', chip: 'bg-emerald-300 text-[#1A1103]' },
  guest: { name: 'Guest', chip: 'bg-sky-200 text-[#1A1103]' },
}

const SPEEDS = [0.75, 1, 1.25] as const

function fmt(t: number): string {
  const s = Math.max(0, Math.floor(t))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function clipLeadOf(b: Beat): number {
  return b.kind === 'title' ? 0.8 : b.kind === 'next' ? 0.9 : b.kind === 'previously' ? 0.3 : 0
}

// ── Icons (simple SVG, labelled buttons) ──────────────────────────────────

function Icon({ d, className = 'h-6 w-6' }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}
const I = {
  play: 'M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z',
  pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
  replay: 'M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7Z',
  skip: 'M5 5.5v13a1 1 0 0 0 1.55.83L15 13.7V18a1 1 0 0 0 2 0V6a1 1 0 0 0-2 0v4.3L6.55 4.67A1 1 0 0 0 5 5.5Z',
  sound: 'M4 9v6h4l5 4V5L8 9H4Zm12.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12ZM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06a9 9 0 0 0 0-17.54Z',
  mute: 'M4 9v6h4l5 4V5L8 9H4Zm12.3 3 2.85-2.85-1.3-1.3L15 10.7l-2.85-2.85-1.3 1.3L13.7 12l-2.85 2.85 1.3 1.3L15 13.3l2.85 2.85 1.3-1.3L16.3 12Z',
  full: 'M5 5h5v2H7v3H5V5Zm9 0h5v5h-2V7h-3V5ZM5 14h2v3h3v2H5v-5Zm12 3v-3h2v5h-5v-2h3Z',
  exitFull: 'M8 5h2v5H5V8h3V5Zm6 0h2v3h3v2h-5V5ZM5 14h5v5H8v-3H5v-2Zm9 0h5v2h-3v3h-2v-5Z',
}

export default function EpisodePlayerClient({ sessionId, onDone }: EpisodePlayerProps) {
  const id = useMemo(() => normaliseSessionId(sessionId) ?? sessionId, [sessionId])
  const wrapRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const directorRef = useRef<Director | null>(null)
  const doneRef = useRef(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  const [data, setData] = useState<EpisodeData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<'poster' | 'loading' | 'ready'>('poster')
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [beatIndex, setBeatIndex] = useState(0)
  const [captions, setCaptions] = useState(true)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)
  const [muted, setMuted] = useState(false)
  const [choice, setChoice] = useState<ChoiceBeat | null>(null)
  const [reply, setReply] = useState<string | null>(null)
  const [ended, setEnded] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [chrome, setChrome] = useState(true)
  const [record, setRecord] = useState(false)
  const [robotName, setRobotName] = useState('Your robot')
  const hideTimer = useRef<number | null>(null)

  const plan: EpisodePlan | null = useMemo(() => (data ? planEpisode(data) : null), [data])

  // Episode data (small JSON) on mount; the 3D engine warms up when idle.
  useEffect(() => {
    let alive = true
    setData(null)
    setError(null)
    fetch(episodeUrl(id))
      .then((r) => (r.ok ? (r.json() as Promise<EpisodeData>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => alive && setData(d))
      .catch(() => alive && setError('This episode is not ready yet.'))
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback
    const warm = () => void loadEngine().catch(() => undefined)
    if (idle) idle(warm)
    else window.setTimeout(warm, 1200)
    try {
      setCaptions(localStorage.getItem('r2bot:kids-captions') !== 'off')
      setRobotName(loadDesign().name || 'Your robot')
    } catch {
      // storage blocked: defaults are fine
    }
    setRecord(new URLSearchParams(window.location.search).get('record') === '1')
    return () => {
      alive = false
    }
  }, [id])

  useEffect(() => () => directorRef.current?.dispose(), [])

  const finish = useCallback(() => {
    setEnded(true)
    setChrome(true)
    if (doneRef.current) return
    doneRef.current = true
    try {
      if (!record) reportActivity({ kind: 'episode', id: `episode-${id}` })
    } catch {
      // progress storage unavailable — the episode still ends normally
    }
    ;(window as Window & { __episodeDone?: boolean }).__episodeDone = true
    onDoneRef.current()
  }, [id, record])

  const start = useCallback(async () => {
    if (!data || !plan || !hostRef.current || directorRef.current) {
      directorRef.current?.play()
      return
    }
    setPhase('loading')
    setProgress(0.05)
    const calm = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mod = await loadEngine()
    if (!hostRef.current) return
    const d = new mod.Director(hostRef.current, data, plan, {
      calm,
      design: loadDesign(),
      record,
      onTime: (t, bi) => {
        setTime(t)
        setBeatIndex(bi)
      },
      onBeat: (bi) => setBeatIndex(bi),
      onChoice: (c) => {
        setChoice(c)
        setReply(null)
        setChrome(true)
      },
      onEnd: finish,
      onPlayState: setPlaying,
      onChoiceEnd: () => {
        setChoice(null)
        setReply(null)
      },
    })
    directorRef.current = d
    d.unlockAudio()
    d.setSpeed(speed)
    d.setMuted(muted)
    await d.preload((done, total) => setProgress(0.1 + 0.9 * (done / Math.max(1, total))))
    const w = window as Window & { __episode?: { director: Director; duration: number; startedAt: number } }
    w.__episode = { director: d, duration: plan.duration, startedAt: Date.now() }
    setPhase('ready')
    d.play()
  }, [data, plan, record, finish, speed, muted])

  // Record mode: start by itself.
  useEffect(() => {
    if (record && data && plan && phase === 'poster') void start()
  }, [record, data, plan, phase, start])

  // Choices: record mode answers for the viewer after a beat.
  const answer = useCallback(
    (opt: string | null) => {
      if (!choice) return
      setReply(choice.reply)
      void opt
      window.setTimeout(() => {
        setChoice(null)
        setReply(null)
        directorRef.current?.resolveChoice()
      }, 1500)
    },
    [choice],
  )
  useEffect(() => {
    if (!choice || record) return
    const t = window.setTimeout(() => answer(null), 15000)
    return () => window.clearTimeout(t)
  }, [choice, record, answer])

  // Controls auto-hide while playing.
  const poke = useCallback(() => {
    setChrome(true)
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setChrome(false), 3200)
  }, [])
  useEffect(() => {
    if (!playing) setChrome(true)
    else poke()
  }, [playing, poke])

  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === wrapRef.current)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const toggle = useCallback(() => {
    if (phase === 'poster') {
      void start()
      return
    }
    if (ended) {
      setEnded(false)
      directorRef.current?.seek(0)
      directorRef.current?.play()
      return
    }
    directorRef.current?.toggle()
  }, [phase, start, ended])

  const toggleCaptions = useCallback(() => {
    setCaptions((c) => {
      try {
        localStorage.setItem('r2bot:kids-captions', c ? 'off' : 'on')
      } catch {
        // ignore
      }
      return !c
    })
  }, [])

  const cycleSpeed = useCallback(() => {
    setSpeed((s) => {
      const next = SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length]
      directorRef.current?.setSpeed(next)
      return next
    })
  }, [])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      directorRef.current?.setMuted(!m)
      return !m
    })
  }, [])

  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
    else void el.requestFullscreen?.().catch(() => undefined)
  }, [])

  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (phase !== 'ready') return
      const k = e.key.toLowerCase()
      if (k === ' ' || k === 'k') {
        e.preventDefault()
        toggle()
      } else if (k === 'arrowleft') directorRef.current?.replayLine()
      else if (k === 'arrowright') directorRef.current?.skipScene()
      else if (k === 'c') toggleCaptions()
      else if (k === 'f') toggleFullscreen()
      else if (k === 'm') toggleMute()
      poke()
    },
    [phase, toggle, toggleCaptions, toggleFullscreen, toggleMute, poke],
  )

  // ── Derived view state ───────────────────────────────────────────────────

  const beat = plan?.beats[beatIndex] ?? null
  const sceneTicks = useMemo(() => {
    if (!plan) return []
    const seen = new Set<number>()
    return plan.beats.filter((b) => b.kind === 'establish' && !seen.has(b.scene) && seen.add(b.scene)).map((b) => b.start / plan.duration)
  }, [plan])

  const caption = useMemo(() => {
    if (!beat || !beat.clip || (beat.kind !== 'line' && beat.kind !== 'previously')) return null
    const clip = beat.clip
    const t = time - (beat.start + clipLeadOf(beat))
    let current = -1
    clip.words.forEach((w, i) => {
      if (w[1] <= t) current = i
    })
    const who = beat.who ?? 'narrator'
    const meta = SPEAKER[who] ?? SPEAKER.narrator
    let name = meta.name
    if (who === 'myrobot') name = robotName
    if (who === 'guest' && 'guestName' in clip && clip.guestName) name = clip.guestName.split(',')[0]
    if (beat.kind === 'previously') name = 'Last time…'
    return { words: clip.words.length ? clip.words.map((w) => w[0]) : clip.text.split(/\s+/), current, name, chip: meta.chip }
  }, [beat, time, robotName])

  const pct = plan ? Math.min(100, (time / plan.duration) * 100) : 0
  const showTitle = beat?.kind === 'title' && data
  const showNext = beat?.kind === 'next' && data
  const showCard = beat?.kind === 'card'
  const sceneFade = beat?.kind === 'establish' && time - beat.start < 0.45

  const seekFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!plan || !directorRef.current) return
    const r = e.currentTarget.getBoundingClientRect()
    const p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    directorRef.current.seek(p * plan.duration)
    setEnded(false)
  }

  const ctrlBtn =
    'inline-flex h-12 min-w-12 items-center justify-center rounded-2xl px-2 text-[#EEF2F8] transition hover:bg-white/10 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'

  return (
    <div
      ref={wrapRef}
      className={`group/player relative isolate w-full overflow-hidden bg-[#0A1120] text-[#EEF2F8] shadow-[0_8px_24px_rgba(0,0,0,.45)] ${
        fullscreen || record ? 'h-full rounded-none' : 'aspect-[4/5] rounded-[28px] border border-white/10 sm:aspect-video'
      }`}
      onPointerMove={phase === 'ready' ? poke : undefined}
      onKeyDown={onKey}
      tabIndex={-1}
      role="region"
      aria-label={data ? `Episode ${data.number}: ${data.title}` : 'Episode player'}
    >
      {/* The 3D stage (canvas mounts here). */}
      <div ref={hostRef} className="absolute inset-0" onClick={phase === 'ready' && !choice ? toggle : undefined} />

      {/* Scene change: a quick dip to navy. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-[#0A1120] transition-opacity duration-300 ${sceneFade ? 'opacity-70' : 'opacity-0'}`}
      />

      {/* Poster (same size as the stage) */}
      {phase !== 'ready' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(120%_90%_at_50%_100%,#1E2F55_0%,#111C32_45%,#0A1120_100%)] p-6 text-center">
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(to_top,rgba(252,104,24,0.18),transparent)]" />
          <div aria-hidden="true" className="absolute left-[12%] top-[18%] h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_18px_6px_rgba(255,176,32,.6)] motion-safe:animate-pulse" />
          <div aria-hidden="true" className="absolute right-[16%] top-[28%] h-1.5 w-1.5 rounded-full bg-amber-200 shadow-[0_0_14px_5px_rgba(255,176,32,.5)] motion-safe:animate-pulse" />
          <div aria-hidden="true" className="absolute right-[30%] top-[12%] h-1 w-1 rounded-full bg-cyan-300 shadow-[0_0_10px_4px_rgba(0,229,255,.45)]" />
          <SparkCharacter mood="happy" size={110} className="relative mb-3 drop-shadow-[0_10px_30px_rgba(252,104,24,.35)]" label="Spark" />
          <p className="relative font-display text-sm font-bold uppercase tracking-[0.18em] text-amber-300">
            {data ? `Lantern Hill · Episode ${data.number}` : 'Lantern Hill'}
          </p>
          <h2 className="relative mt-1 max-w-xl font-display text-2xl font-bold leading-tight text-white sm:text-4xl">
            {data ? data.title : error ? 'Episode coming soon' : ' '}
          </h2>
          {error ? (
            <p className="relative mt-3 text-[#A7B0C0]">{error}</p>
          ) : (
            <button
              type="button"
              onClick={() => void start()}
              disabled={!data || phase === 'loading'}
              className="relative mt-5 inline-flex h-14 items-center gap-3 rounded-full bg-amber-500 px-7 font-display text-lg font-bold text-[#1A1103] shadow-[0_8px_24px_rgba(252,104,24,.4)] transition hover:-translate-y-0.5 hover:bg-amber-400 active:scale-[.97] disabled:opacity-70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            >
              <Icon d={I.play} className="h-6 w-6" />
              {phase === 'loading' ? 'Getting the set ready…' : 'Watch the episode'}
            </button>
          )}
          {phase === 'loading' && (
            <div className="relative mt-4 h-2 w-56 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Loading the episode">
              <div className="h-full rounded-full bg-amber-400 transition-[width] duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}
          {data && phase === 'poster' && (
            <p className="relative mt-4 text-sm text-[#A7B0C0]">
              {plan ? `${Math.round(plan.duration / 60)} min · voices, captions, music` : ' '}
            </p>
          )}
        </div>
      )}

      {/* Title card */}
      {showTitle && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(closest-side,rgba(10,17,32,.55),rgba(10,17,32,.15))] p-6 text-center">
          <p className="font-display text-sm font-bold uppercase tracking-[0.22em] text-amber-300">R2BOT Kids · Lantern Hill</p>
          <p className="mt-2 font-display text-lg font-bold text-white/90">Episode {data.number}</p>
          <h2 className="mt-1 max-w-2xl font-display text-3xl font-bold leading-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,.6)] sm:text-5xl">{data.title}</h2>
        </div>
      )}

      {showCard && beat?.cardText && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#0A1120]/70 p-6">
          <p className="rounded-2xl bg-amber-500 px-5 py-3 font-display text-xl font-bold text-[#1A1103]">{beat.cardText}</p>
        </div>
      )}

      {showNext && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center p-4 pt-6 text-center sm:pt-10">
          <p className="rounded-full bg-amber-500 px-4 py-1.5 font-display text-sm font-bold uppercase tracking-wider text-[#1A1103]">Next time…</p>
          <p className="mt-3 max-w-2xl rounded-2xl bg-[#0A1120]/75 px-4 py-3 font-display text-lg font-bold leading-snug text-white backdrop-blur-sm sm:text-2xl">{data.cliffhanger.text}</p>
        </div>
      )}

      {/* Captions */}
      {captions && caption && phase === 'ready' && !choice && (
        <div className={`pointer-events-none absolute inset-x-0 flex justify-center px-3 transition-[bottom] duration-200 ${chrome && !record ? 'bottom-[5.5rem]' : 'bottom-4'}`}>
          <p className="max-w-3xl rounded-2xl bg-[#0A1120]/80 px-4 py-2.5 text-center text-[17px] font-semibold leading-snug backdrop-blur-sm sm:text-xl" aria-live="polite">
            <span className={`mr-2 inline-block rounded-full px-2.5 py-0.5 align-middle font-display text-xs font-bold uppercase tracking-wide ${caption.chip}`}>{caption.name}</span>
            {caption.words.map((w, i) => (
              <span key={i} className={i === caption.current ? 'text-amber-300' : i < caption.current ? 'text-white' : 'text-white/75'}>
                {w}{' '}
              </span>
            ))}
          </p>
        </div>
      )}

      {/* Choice: "what do you think?" */}
      {choice && (
        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-[#0A1120]/90 via-[#0A1120]/40 to-transparent p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-[28px] border border-white/15 bg-[#111C32]/95 p-5 text-center shadow-[0_8px_24px_rgba(0,0,0,.45)]">
            <p className="font-display text-sm font-bold uppercase tracking-wider text-cyan-300">What do you think?</p>
            <p className="mt-1 font-display text-xl font-bold text-white sm:text-2xl">{choice.prompt}</p>
            {reply ? (
              <p className="mt-4 rounded-2xl bg-amber-500 px-4 py-3 font-display text-lg font-bold text-[#1A1103]" role="status">
                {reply}
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {choice.options.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => answer(o)}
                    className="h-14 min-w-28 rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.03] px-5 font-display text-lg font-bold text-white transition hover:-translate-y-0.5 hover:border-amber-400 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
                  >
                    {o}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* End card */}
      {ended && !record && data && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A1120]/85 p-6 text-center backdrop-blur-sm">
          <SparkCharacter mood="celebrating" size={90} label="Spark" />
          <p className="mt-2 font-display text-sm font-bold uppercase tracking-wider text-amber-300">Episode {data.number} complete</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">{data.title}</h2>
          <button
            type="button"
            onClick={toggle}
            className="mt-5 inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-6 font-display font-bold text-white transition hover:border-amber-400 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          >
            <Icon d={I.replay} className="h-5 w-5" /> Watch again
          </button>
          <p className="mt-5 max-w-md text-xs text-[#6E7888]">Voices made with Piper TTS (VCTK and alba voices: University of Edinburgh, CC BY 4.0).</p>
        </div>
      )}

      {/* Controls */}
      {phase === 'ready' && !record && (
        <div
          className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0A1120]/95 via-[#0A1120]/70 to-transparent px-3 pb-2 pt-6 transition-opacity duration-200 ${
            chrome || !playing ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <div
            className="group/bar relative mx-1 mb-1 flex h-6 cursor-pointer items-center"
            role="slider"
            tabIndex={0}
            aria-label="Episode position"
            aria-valuemin={0}
            aria-valuemax={Math.round(plan?.duration ?? 0)}
            aria-valuenow={Math.round(time)}
            aria-valuetext={`${fmt(time)} of ${fmt(plan?.duration ?? 0)}`}
            onPointerDown={seekFromPointer}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') directorRef.current?.seek(time + 10)
              if (e.key === 'ArrowLeft') directorRef.current?.seek(time - 10)
              e.stopPropagation()
            }}
          >
            <div className="h-1.5 w-full rounded-full bg-white/15">
              <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
            </div>
            {sceneTicks.map((p, i) => (
              <span key={i} aria-hidden="true" className="absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 rounded bg-white/40" style={{ left: `${p * 100}%` }} />
            ))}
            <span aria-hidden="true" className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 shadow" style={{ left: `${pct}%` }} />
          </div>
          <div className="flex items-center gap-1">
            <button type="button" className={ctrlBtn} onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
              <Icon d={playing ? I.pause : I.play} className="h-7 w-7" />
            </button>
            <button type="button" className={ctrlBtn} onClick={() => directorRef.current?.replayLine()} aria-label="Hear that line again">
              <Icon d={I.replay} />
            </button>
            <button type="button" className={ctrlBtn} onClick={() => directorRef.current?.skipScene()} aria-label="Skip to the next scene">
              <Icon d={I.skip} />
            </button>
            <span className="ml-1 hidden font-display text-sm tabular-nums text-[#A7B0C0] sm:inline">
              {fmt(time)} / {fmt(plan?.duration ?? 0)}
            </span>
            <span className="flex-1" />
            <button type="button" className={`${ctrlBtn} font-display text-sm font-bold`} onClick={toggleCaptions} aria-pressed={captions} aria-label="Captions">
              <span className={`rounded-md border-2 px-1 ${captions ? 'border-amber-400 text-amber-300' : 'border-white/50 text-white/70'}`}>CC</span>
            </button>
            <button type="button" className={`${ctrlBtn} font-display text-sm font-bold`} onClick={cycleSpeed} aria-label={`Speed ${speed} times`}>
              {speed}×
            </button>
            <button type="button" className={ctrlBtn} onClick={toggleMute} aria-pressed={muted} aria-label={muted ? 'Sound on' : 'Sound off'}>
              <Icon d={muted ? I.mute : I.sound} />
            </button>
            <button type="button" className={ctrlBtn} onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}>
              <Icon d={fullscreen ? I.exitFull : I.full} />
            </button>
          </div>
        </div>
      )}

      {/* Big centre play when paused mid-episode */}
      {phase === 'ready' && !playing && !ended && !choice && !record && (
        <button
          type="button"
          onClick={toggle}
          aria-label="Play"
          className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-amber-500 text-[#1A1103] shadow-[0_8px_24px_rgba(252,104,24,.45)] transition hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
        >
          <Icon d={I.play} className="h-10 w-10" />
        </button>
      )}
    </div>
  )
}
