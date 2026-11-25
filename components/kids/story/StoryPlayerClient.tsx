'use client'

// components/kids/story/StoryPlayerClient.tsx
// The Story Theatre player: a scripted cartoon on an SVG stage.
//
// How it runs: a cursor points at the current beat of the current scene. An
// effect "performs" that beat (speaks a line, starts a walk, moves the camera…)
// and moves the cursor on when the beat is done. Pausing cancels the beat;
// resuming performs it again from the start, which is why every beat sets
// absolute state (walk TO x, emotion IS happy) rather than relative changes.
// Choices hand the cursor to a short "interlude" (the consequence of the
// pick), then either retry the choice or carry on.

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import './story.css'
import type { Action, Beat, CastMember, CharacterId, ChoiceOption, Emotion, Episode, Lighting, Motion, PropId, Scene, SpeakerId } from '@/lib/kids/stories/types'
import { CAST } from '@/lib/kids/stories/cast'
import { lineMs } from '@/lib/kids/stories'
import { isVoiceMuted, speakLine, speechAvailable, stopSpeech, warmVoices, type SpeakHandle } from '@/lib/kids/stories/speech'
import { playSfx, primeSfx } from '@/lib/kids/stories/sfx'
import { playSound, primeAudio } from '@/lib/kids-audio'
import { completeEpisode } from '@/lib/kids-progress'
import { fireConfetti } from '@/components/kids/Confetti'
import { Background, FLOOR_Y } from './backgrounds'
import { PUPPETS, PUPPET_HEIGHT } from './characters'
import { PropCard } from './props'
import { FRAME } from './frame'

// ─── Stage state ──────────────────────────────────────────────────────────

interface ActorState {
  who: CharacterId
  x: number
  lift: number
  facing: 1 | -1
  emotion: Emotion
  scale: number
  variant?: 'wheels'
  motion: Motion | null
  moveMs: number
  action: Action | null
  actionKey: number
}

interface StageState {
  bg: Scene['background']
  lighting: Lighting
  actors: ActorState[]
  cam: { zoom: number; x: number; y: number; ms: number }
  prop: { id: PropId; label: string; at: 'left' | 'center' | 'right'; key: number } | null
}

function actorFrom(c: CastMember): ActorState {
  return {
    who: c.who,
    x: c.x,
    lift: c.lift ?? 0,
    facing: c.facing === 'left' ? -1 : 1,
    emotion: c.emotion ?? 'neutral',
    scale: c.scale ?? 1,
    variant: c.variant,
    motion: null,
    moveMs: 0,
    action: null,
    actionKey: 0,
  }
}

function stageFor(scene: Scene): StageState {
  return {
    bg: scene.background,
    lighting: scene.lighting ?? 'day',
    actors: scene.cast.map(actorFrom),
    cam: { zoom: 1, x: 50, y: 50, ms: 0 },
    prop: null,
  }
}

const ACTION_MS: Record<Action, number> = {
  hop: 700, spin: 800, shake: 600, nod: 700, bounce: 1000, tumble: 1100, wobble: 1200, zigzag: 400,
}

type Status = 'ready' | 'playing' | 'paused' | 'choice' | 'quiz' | 'done'

interface Interlude { beats: Beat[]; i: number; correct: boolean }

interface Caption { who: SpeakerId; text: string }

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

function voiceOn(): boolean {
  return speechAvailable() && !isVoiceMuted()
}

// ─── Component ─────────────────────────────────────────────────────────────

interface Props {
  episode: Episode
  next: { slug: string; title: string }
}

export default function StoryPlayerClient({ episode, next }: Props) {
  const scenes = episode.scenes
  const reduced = useReducedMotion()

  const [status, setStatus] = useState<Status>('ready')
  const [cursor, setCursor] = useState({ scene: 0, beat: 0 })
  const [interlude, setInterlude] = useState<Interlude | null>(null)
  const [stage, setStage] = useState<StageState>(() => stageFor(scenes[0]))
  const [speaker, setSpeaker] = useState<CharacterId | null>(null)
  const [caption, setCaption] = useState<Caption | null>(null)
  const [captionsOn, setCaptionsOn] = useState(true)
  const [curtain, setCurtain] = useState<{ title: string; n: number } | null>(null)
  const [runNonce, setRunNonce] = useState(0)
  const [tried, setTried] = useState<number[]>([])
  const [fullscreen, setFullscreen] = useState(false)
  const [canFullscreen, setCanFullscreen] = useState(false)
  // Quiz
  const [qi, setQi] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [result, setResult] = useState<{ stars: number; added: number } | null>(null)

  const rootRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const stageRef = useRef(stage)
  stageRef.current = stage
  const talkRef = useRef({ active: false, lastBoundary: 0, hasBoundary: false })
  const motionTimers = useRef<Map<CharacterId, ReturnType<typeof setTimeout>>>(new Map())
  const curtainTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const propKey = useRef(0)
  const speechRef = useRef<SpeakHandle | null>(null)

  const scene = scenes[cursor.scene]
  const choiceBeat = status === 'choice' ? scene.beats[cursor.beat] : undefined
  const activeChoice = choiceBeat && choiceBeat.kind === 'choice' ? choiceBeat : null

  // ── helpers ────────────────────────────────────────────────────────────
  const patchActor = useCallback((who: CharacterId, patch: Partial<ActorState> | ((a: ActorState) => Partial<ActorState>)) => {
    setStage((s) => ({
      ...s,
      actors: s.actors.map((a) => (a.who === who ? { ...a, ...(typeof patch === 'function' ? patch(a) : patch) } : a)),
    }))
  }, [])

  const say = useCallback((who: SpeakerId, text: string, onEnd: () => void) => {
    speechRef.current?.cancel()
    const ms = lineMs(text)
    talkRef.current = { active: who !== 'narrator', lastBoundary: 0, hasBoundary: false }
    const end = () => {
      talkRef.current.active = false
      speechRef.current = null
      onEnd()
    }
    if (voiceOn()) {
      speechRef.current = speakLine(who, text, ms, end, () => {
        talkRef.current.lastBoundary = performance.now()
        talkRef.current.hasBoundary = true
      })
    } else {
      const t = setTimeout(end, ms)
      speechRef.current = { cancel: () => clearTimeout(t) }
    }
  }, [])

  const hush = useCallback(() => {
    speechRef.current?.cancel()
    speechRef.current = null
    talkRef.current.active = false
    setSpeaker(null)
  }, [])

  // Mouth: write --talk on the svg every frame while someone is talking.
  useEffect(() => {
    let raf = 0
    let v = 0
    const loop = (t: number) => {
      const talk = talkRef.current
      let target = 0.12
      if (talk.active) {
        if (talk.hasBoundary) {
          const since = t - talk.lastBoundary
          target = Math.max(0.15, 1 - since / 220) * (0.75 + 0.25 * Math.sin(t / 40))
        } else {
          target = 0.25 + 0.75 * Math.abs(Math.sin(t / 95)) * (0.6 + 0.4 * Math.sin(t / 310))
        }
      }
      v += (target - v) * 0.35
      svgRef.current?.style.setProperty('--talk', v.toFixed(3))
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => warmVoices(), [])

  // Stop everything on unmount.
  useEffect(() => {
    const motions = motionTimers.current
    const curtains = curtainTimers.current
    return () => {
      stopSpeech()
      motions.forEach(clearTimeout)
      curtains.forEach(clearTimeout)
    }
  }, [])

  // Fullscreen support + tracking.
  useEffect(() => {
    setCanFullscreen(typeof document !== 'undefined' && !!document.fullscreenEnabled)
    const on = () => setFullscreen(document.fullscreenElement === rootRef.current)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])

  // ── scene changes ──────────────────────────────────────────────────────
  const startQuiz = useCallback(() => {
    hush()
    setCaption(null)
    setInterlude(null)
    setQi(0)
    setPicked(null)
    setScore(0)
    setStage((s) => ({
      ...s,
      prop: null,
      cam: { zoom: 1, x: 50, y: 50, ms: 600 },
      actors: s.actors.map((a) => (a.who === 'spark' ? { ...a, x: 50, lift: 70, facing: 1, emotion: 'excited', motion: 'fly', moveMs: reduced ? 0 : 900 } : a)),
    }))
    setStatus('quiz')
  }, [hush, reduced])

  const goToScene = useCallback(
    (n: number) => {
      hush()
      curtainTimers.current.forEach(clearTimeout)
      curtainTimers.current = []
      motionTimers.current.forEach(clearTimeout)
      motionTimers.current.clear()
      setInterlude(null)
      if (n >= scenes.length) {
        startQuiz()
        return
      }
      const swap = () => {
        setStage(stageFor(scenes[n]))
        setCursor({ scene: n, beat: 0 })
        setCaption(null)
      }
      if (reduced) {
        swap()
        return
      }
      setCurtain({ title: scenes[n].title, n })
      curtainTimers.current.push(setTimeout(swap, 450))
      curtainTimers.current.push(setTimeout(() => setCurtain(null), 1700))
    },
    [hush, reduced, scenes, startQuiz],
  )

  // ── performing a beat ───────────────────────────────────────────────────
  const perform = useCallback(
    (beat: Beat, done: () => void): (() => void) => {
      const timers: ReturnType<typeof setTimeout>[] = []
      const after = (ms: number) => timers.push(setTimeout(done, ms))
      switch (beat.kind) {
        case 'say':
        case 'narrate': {
          const who: SpeakerId = beat.kind === 'say' ? beat.who : 'narrator'
          setCaption({ who, text: beat.text })
          if (beat.kind === 'say') {
            setSpeaker(beat.who)
            if (beat.emotion) patchActor(beat.who, { emotion: beat.emotion })
          } else setSpeaker(null)
          say(who, beat.text, () => {
            setSpeaker(null)
            after(260)
          })
          break
        }
        case 'move': {
          const cur = stageRef.current.actors.find((a) => a.who === beat.who)
          const instant = reduced || beat.motion === 'teleport'
          const ms = instant ? 0 : beat.ms ?? 1200
          const facing: 1 | -1 = beat.face ? (beat.face === 'left' ? -1 : 1) : cur && beat.to !== cur.x ? (beat.to > cur.x ? 1 : -1) : cur?.facing ?? 1
          patchActor(beat.who, (a) => ({ x: beat.to, lift: beat.lift ?? a.lift, facing, motion: instant ? null : beat.motion ?? 'walk', moveMs: ms }))
          const old = motionTimers.current.get(beat.who)
          if (old) clearTimeout(old)
          motionTimers.current.set(beat.who, setTimeout(() => patchActor(beat.who, { motion: null }), ms))
          after(beat.wait === false ? 0 : ms + 60)
          break
        }
        case 'act':
          patchActor(beat.who, (a) => ({ action: reduced ? null : beat.action, actionKey: a.actionKey + 1, emotion: beat.emotion ?? a.emotion }))
          after(reduced ? 250 : ACTION_MS[beat.action])
          break
        case 'emote':
          patchActor(beat.who, { emotion: beat.emotion })
          after(350)
          break
        case 'face':
          patchActor(beat.who, { facing: beat.face === 'left' ? -1 : 1 })
          after(250)
          break
        case 'camera': {
          const ms = reduced ? 0 : beat.ms ?? 900
          setStage((s) => ({ ...s, cam: { zoom: reduced ? 1 : beat.zoom, x: beat.x ?? 50, y: beat.y ?? 50, ms } }))
          after(beat.wait === false ? 0 : ms)
          break
        }
        case 'prop':
          propKey.current += 1
          setStage((s) => ({ ...s, prop: { id: beat.prop, label: beat.label, at: beat.at ?? 'center', key: propKey.current } }))
          after(650)
          break
        case 'hideProp':
          setStage((s) => ({ ...s, prop: null }))
          after(250)
          break
        case 'sfx':
          playSfx(beat.sound)
          after(beat.sound === 'rumble' ? 900 : 280)
          break
        case 'pause':
          after(beat.ms)
          break
        case 'lights':
          setStage((s) => ({ ...s, lighting: beat.level }))
          after(700)
          break
        case 'choice':
          setTried([])
          setStatus('choice')
          break
      }
      return () => {
        timers.forEach(clearTimeout)
      }
    },
    [patchActor, reduced, say],
  )

  // The beat runner.
  useEffect(() => {
    if (status !== 'playing' || curtain) return
    const sc = scenes[cursor.scene]
    if (interlude) {
      const beat = interlude.beats[interlude.i]
      if (!beat) {
        setInterlude(null)
        if (interlude.correct) setCursor((c) => ({ ...c, beat: c.beat + 1 }))
        else setStatus('choice')
        return
      }
      const stop = perform(beat, () => setInterlude((it) => (it ? { ...it, i: it.i + 1 } : it)))
      return () => {
        stop()
        hush()
      }
    }
    const beat = sc.beats[cursor.beat]
    if (!beat) {
      goToScene(cursor.scene + 1)
      return
    }
    const stop = perform(beat, () => setCursor((c) => ({ ...c, beat: c.beat + 1 })))
    return () => {
      stop()
      if (beat.kind === 'say' || beat.kind === 'narrate') hush()
    }
  }, [status, cursor, interlude, runNonce, curtain, scenes, perform, goToScene, hush])

  // Choice: the asker reads the question out.
  useEffect(() => {
    if (status !== 'choice' || !activeChoice) return
    setCaption({ who: activeChoice.who, text: activeChoice.prompt })
    patchActor(activeChoice.who, { emotion: 'thinking' })
    setSpeaker(activeChoice.who)
    say(activeChoice.who, activeChoice.prompt, () => setSpeaker(null))
    return () => hush()
  }, [status, activeChoice, runNonce, patchActor, say, hush])

  // Quiz: read each question and its options aloud.
  const question = episode.quiz[qi]
  useEffect(() => {
    if (status !== 'quiz' || picked !== null) return
    const opts = question.options
    const text = `${question.q} ${opts.slice(0, -1).join(', ')}, or ${opts[opts.length - 1]}?`
    say('narrator', text, () => {})
    return () => hush()
  }, [status, qi, picked, question, say, hush])

  // ── controls ───────────────────────────────────────────────────────────
  const start = () => {
    primeAudio()
    primeSfx()
    // iOS only allows speech that starts inside a tap; a silent line unlocks it.
    if (voiceOn()) {
      try {
        const u = new SpeechSynthesisUtterance(' ')
        u.volume = 0
        window.speechSynthesis.speak(u)
      } catch { /* noop */ }
    }
    playSound('click')
    setStatus('playing')
    rootRef.current?.focus({ preventScroll: true })
  }

  const togglePlay = () => {
    if (status === 'ready') return start()
    if (status === 'playing') {
      hush()
      setStatus('paused')
    } else if (status === 'paused') {
      setStatus('playing')
    }
  }

  const replayLine = () => {
    if (status === 'choice') {
      setRunNonce((n) => n + 1)
      return
    }
    if (status !== 'playing' && status !== 'paused') return
    hush()
    if (interlude) {
      let i = interlude.i
      while (i > 0 && !['say', 'narrate'].includes(interlude.beats[i]?.kind ?? '')) i--
      setInterlude({ ...interlude, i })
    } else {
      let b = Math.min(cursor.beat, scene.beats.length - 1)
      while (b > 0 && !['say', 'narrate'].includes(scene.beats[b].kind)) b--
      setCursor({ scene: cursor.scene, beat: b })
    }
    setRunNonce((n) => n + 1)
    setStatus('playing')
  }

  const skipScene = () => {
    if (status === 'quiz' || status === 'done' || status === 'ready') return
    setStatus('playing')
    goToScene(cursor.scene + 1)
  }

  const jumpTo = (n: number) => {
    if (status === 'ready') start()
    setStatus('playing')
    goToScene(n)
  }

  const pick = (i: number, opt: ChoiceOption) => {
    if (!activeChoice || tried.includes(i)) return
    hush()
    if (opt.correct) {
      playSound('correct')
    } else {
      playSound('wrong')
      setTried((t) => [...t, i])
    }
    setInterlude({ beats: opt.beats, i: 0, correct: opt.correct })
    setStatus('playing')
  }

  const answer = (i: number) => {
    if (picked !== null) return
    hush()
    setPicked(i)
    const ok = i === question.answer
    if (ok) setScore((s) => s + 1)
    playSound(ok ? 'correct' : 'wrong')
    patchActor('spark', { emotion: ok ? 'excited' : 'worried', action: reduced ? null : ok ? 'hop' : 'shake', actionKey: Date.now() })
    setSpeaker('spark')
    say('spark', `${ok ? 'Yes!' : 'Not quite.'} ${question.explain}`, () => setSpeaker(null))
  }

  const nextQuestion = () => {
    hush()
    if (qi < episode.quiz.length - 1) {
      setQi(qi + 1)
      setPicked(null)
      patchActor('spark', { emotion: 'thinking' })
      return
    }
    const stars = Math.max(1, score)
    const { starsAdded } = completeEpisode(episode.slug, stars)
    setResult({ stars, added: starsAdded })
    setStatus('done')
    playSound('levelup')
    fireConfetti()
    patchActor('spark', { emotion: 'excited', action: reduced ? null : 'bounce', actionKey: Date.now() })
    setSpeaker('spark')
    say('spark', `You earned ${stars} ${stars === 1 ? 'star' : 'stars'}! ${episode.concept}: you’ve got it.`, () => setSpeaker(null))
  }

  const restart = () => {
    hush()
    setResult(null)
    setInterlude(null)
    setStage(stageFor(scenes[0]))
    setCursor({ scene: 0, beat: 0 })
    setCaption(null)
    setRunNonce((n) => n + 1)
    setStatus('playing')
  }

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await rootRef.current?.requestFullscreen()
    } catch { /* not allowed here */ }
  }

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const onButton = (e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'A'
    if ((e.key === ' ' || e.key === 'Enter') && onButton) return
    switch (e.key.toLowerCase()) {
      case ' ':
      case 'k':
        e.preventDefault()
        togglePlay()
        break
      case 'arrowright':
      case 'n':
        e.preventDefault()
        skipScene()
        break
      case 'r':
        replayLine()
        break
      case 'c':
        setCaptionsOn((c) => !c)
        break
      case 'f':
        if (canFullscreen) void toggleFullscreen()
        break
    }
  }

  // ── camera transform ───────────────────────────────────────────────────
  const camTransform = useMemo(() => {
    const z = Math.max(1, stage.cam.zoom)
    const fx = Math.min(1600 - 800 / z, Math.max(800 / z, stage.cam.x * 16))
    const fy = Math.min(900 - 450 / z, Math.max(450 / z, stage.cam.y * 9))
    return `translate(800px, 450px) scale(${z}) translate(${-fx}px, ${-fy}px)`
  }, [stage.cam])

  const paused = status === 'paused'
  const sceneLabel = status === 'quiz' || status === 'done' ? 'Quiz' : `Scene ${cursor.scene + 1} of ${scenes.length}: ${scene.title}`

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      role="region"
      aria-label={`Story player: ${episode.title}`}
      aria-describedby="st-keys"
      className={`${FRAME.root} outline-none ${fullscreen ? 'flex h-full max-w-none flex-col justify-center bg-[#0b0820] p-3' : ''}`}
    >
      <p id="st-keys" className="sr-only">
        Keyboard: Space or K to play and pause, R to replay the line, N or right arrow to skip the scene, C for captions{canFullscreen ? ', F for full screen' : ''}.
      </p>
      <div className={`${FRAME.stage} ${fullscreen ? 'mx-auto max-w-[calc((100svh_-_14rem)*16/9)]' : ''}`}>
        <svg
          ref={svgRef}
          viewBox="0 0 1600 900"
          className={`st-stage absolute inset-0 h-full w-full ${paused || status === 'ready' ? 'st-paused' : ''}`}
          role="img"
          aria-label={caption ? `${CAST[caption.who].name}: ${caption.text}` : `${episode.title}, ${scene.title}`}
        >
          <g className="st-camera" style={{ transform: camTransform, transitionDuration: `${stage.cam.ms}ms` }}>
            <Background id={stage.bg} />
            {stage.actors.map((a) => (
              <Actor key={a.who} a={a} talking={speaker === a.who} />
            ))}
          </g>
          <Lights level={stage.lighting} />
          {stage.prop && <PropCard key={stage.prop.key} id={stage.prop.id} label={stage.prop.label} at={stage.prop.at} />}
        </svg>

        {curtain && (
          <div className="st-curtain pointer-events-none absolute inset-0 flex items-center justify-center bg-[#0b0820] [container-type:inline-size]">
            <p className="st-title-in px-6 text-center font-black text-white [font-size:clamp(1rem,4cqw,2.6rem)]">
              <span className="block text-[0.6em] font-bold uppercase tracking-widest text-orange-300">Scene {curtain.n + 1}</span>
              {curtain.title}
            </p>
          </div>
        )}

        {status === 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-t from-black/70 via-black/30 to-black/10 p-4 text-center">
            <button
              type="button"
              onClick={start}
              aria-label={`Play ${episode.title}`}
              className="st-pulse-ring flex h-20 w-20 items-center justify-center rounded-full bg-orange-500 text-white shadow-xl transition hover:scale-105 hover:bg-orange-400 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-amber-300 sm:h-28 sm:w-28"
            >
              <svg viewBox="0 0 24 24" className="ml-1 h-10 w-10 sm:h-14 sm:w-14" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor" /></svg>
            </button>
            <p className="max-w-md text-sm font-bold text-white drop-shadow sm:text-lg">{episode.title}</p>
            <p className="hidden text-xs text-white/80 sm:block">Turn your sound on 🔊</p>
          </div>
        )}

        {paused && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label="Resume"
            className="absolute inset-0 flex items-center justify-center bg-black/40 text-white"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-orange-600 sm:h-20 sm:w-20">
              <svg viewBox="0 0 24 24" className="ml-1 h-8 w-8" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor" /></svg>
            </span>
          </button>
        )}
      </div>

      {/* Controls */}
      <div className={FRAME.controls}>
        <CtrlButton
          label={status === 'playing' || status === 'choice' ? 'Pause' : 'Play'}
          onClick={togglePlay}
          disabled={status === 'choice' || status === 'quiz' || status === 'done'}
          icon={status === 'playing' ? 'pause' : 'play'}
        />
        <CtrlButton label="Replay this line" onClick={replayLine} disabled={status === 'ready' || status === 'quiz' || status === 'done'} icon="replay" />
        <CtrlButton label="Skip to the next scene" onClick={skipScene} disabled={status === 'ready' || status === 'quiz' || status === 'done'} icon="skip" />
        <button
          type="button"
          onClick={() => setCaptionsOn((c) => !c)}
          aria-pressed={captionsOn}
          className={`flex h-11 min-w-11 items-center justify-center rounded-xl px-2.5 text-xs font-black ring-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ${captionsOn ? 'bg-white text-indigo-950 ring-white' : 'bg-white/10 text-white ring-white/20 hover:bg-white/20'}`}
        >
          CC<span className="sr-only"> captions {captionsOn ? 'on' : 'off'}</span>
        </button>
        {canFullscreen && <CtrlButton label={fullscreen ? 'Exit full screen' : 'Full screen'} onClick={() => void toggleFullscreen()} icon={fullscreen ? 'shrink' : 'expand'} />}
        <p className="ml-auto truncate pl-2 text-right text-xs font-semibold text-white/70 sm:text-sm" aria-live="off">{sceneLabel}</p>
      </div>

      {/* Scene progress */}
      <nav className={FRAME.progress} aria-label="Scenes">
        {scenes.map((s, i) => {
          const state = status === 'quiz' || status === 'done' || i < cursor.scene ? 'done' : i === cursor.scene && status !== 'ready' ? 'now' : 'todo'
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => jumpTo(i)}
              aria-label={`Scene ${i + 1}: ${s.title}${state === 'now' ? ' (playing)' : ''}`}
              aria-current={state === 'now' ? 'step' : undefined}
              className="group flex h-11 flex-1 items-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
            >
              <span className={`block h-2 w-full rounded-full transition-colors ${state === 'done' ? 'bg-orange-400' : state === 'now' ? 'bg-orange-300 st-glow' : 'bg-white/15 group-hover:bg-white/30'}`} />
            </button>
          )
        })}
        <span className="flex h-11 items-center pl-1 text-base" aria-label="Quiz at the end" role="img">
          {status === 'done' ? '🏆' : '⭐'}
        </span>
      </nav>

      {/* Caption / choice / quiz panel */}
      <div className={FRAME.panel}>
        {status === 'choice' && activeChoice ? (
          <ChoicePanel prompt={activeChoice.prompt} asker={activeChoice.who} options={activeChoice.options} tried={tried} onPick={pick} />
        ) : status === 'quiz' ? (
          <QuizPanel
            n={qi}
            total={episode.quiz.length}
            q={question.q}
            options={question.options}
            answer={question.answer}
            explain={question.explain}
            picked={picked}
            onPick={answer}
            onNext={nextQuestion}
          />
        ) : status === 'done' && result ? (
          <DonePanel stars={result.stars} added={result.added} episode={episode} next={next} onReplay={restart} />
        ) : (
          <div aria-live="polite" aria-atomic="true" className="min-h-[5.5rem]">
            {status === 'ready' ? (
              <p className="text-sm text-white/80 sm:text-base">
                Press play to start. Spark and friends will talk you through the story, and sometimes you get to decide what happens.
              </p>
            ) : captionsOn && caption ? (
              <p className="text-base leading-snug text-white sm:text-lg">
                <span className={`mr-1.5 font-black ${CAST[caption.who].captionClass}`}>{caption.who === 'narrator' ? '' : `${CAST[caption.who].name}:`}</span>
                <span className={caption.who === 'narrator' ? 'italic text-white/90' : ''}>{caption.text}</span>
              </p>
            ) : !captionsOn ? (
              <p className="text-sm text-white/50">Captions are off. Press CC to show them.</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Pieces ────────────────────────────────────────────────────────────────

/** Every puppet is drawn at 1×; the stage shows them a little larger so faces read on a phone. */
const STAGE_SCALE = 1.3

function Actor({ a, talking }: { a: ActorState; talking: boolean }) {
  const Puppet = PUPPETS[a.who]
  const k = a.scale * STAGE_SCALE
  const h = PUPPET_HEIGHT[a.who] * k
  const X = a.x * 16
  const Y = FLOOR_Y - a.lift
  const motionClass = a.motion === 'walk' || a.motion === 'drive' ? 'st-walking' : a.motion === 'fly' ? 'st-flying' : a.motion === 'hop' ? 'st-hopping st-walking' : ''
  const hovering = a.who === 'spark' && a.variant !== 'wheels'
  return (
    <g
      className="st-actor"
      data-motion={a.motion ?? undefined}
      style={{ transform: `translate(${X}px, ${Y}px)`, transitionDuration: `${a.moveMs}ms` }}
    >
      <ellipse cx={0} cy={a.lift + 4} rx={70 * k * (a.who === 'rover' ? 1.8 : 1)} ry={12 * k} fill="#000" opacity={a.lift > 0 ? 0.12 : 0.22} />
      <g className={hovering ? 'st-hover' : undefined}>
        <g key={a.actionKey} className={a.action ? `st-act st-act-${a.action}` : undefined}>
          <g transform={`scale(${a.facing * k} ${k})`}>
            <g className={`${motionClass} ${talking ? 'st-talking' : ''}`}>
              <Puppet emotion={a.emotion} talking={talking} variant={a.variant} />
            </g>
          </g>
          <EmotionMark emotion={a.emotion} top={-h - 30} />
        </g>
      </g>
    </g>
  )
}

function EmotionMark({ emotion, top }: { emotion: Emotion; top: number }) {
  if (emotion === 'thinking') {
    return (
      <g transform={`translate(40 ${top})`}>
        <g className="st-float-q">
          <text fontSize={64} fontWeight={900} fill="#fb923c" stroke="#7c2d12" strokeWidth={3} fontFamily="system-ui, sans-serif">?</text>
        </g>
      </g>
    )
  }
  if (emotion === 'surprised') {
    return (
      <g transform={`translate(36 ${top})`}>
        <g className="st-sparkle">
          <text fontSize={64} fontWeight={900} fill="#fde047" stroke="#713f12" strokeWidth={3} fontFamily="system-ui, sans-serif">!</text>
        </g>
      </g>
    )
  }
  if (emotion === 'excited') {
    return (
      <g transform={`translate(0 ${top + 20})`}>
        {[-70, 70, 0].map((x, i) => (
          <g key={x} transform={`translate(${x} ${i === 2 ? -30 : 0})`}>
            <g className={`st-sparkle ${i === 1 ? '[animation-delay:-.4s]' : i === 2 ? '[animation-delay:-.7s]' : ''}`}>
              <path d="M0 -16 L4 -4 L16 0 L4 4 L0 16 L-4 4 L-16 0 L-4 -4 Z" fill="#fde047" />
            </g>
          </g>
        ))}
      </g>
    )
  }
  if (emotion === 'worried' || emotion === 'sad') {
    return (
      <g transform={`translate(56 ${top + 50})`}>
        <path d="M0 0 Q-10 16 0 22 Q10 16 0 0 Z" fill="#7dd3fc" opacity={0.9} />
      </g>
    )
  }
  return null
}

function Lights({ level }: { level: Lighting }) {
  return (
    <g pointerEvents="none">
      <defs>
        <radialGradient id="st-torch" cx="50%" cy="62%" r="60%">
          <stop offset="0" stopColor="#0b0820" stopOpacity="0" />
          <stop offset="0.55" stopColor="#0b0820" stopOpacity="0.35" />
          <stop offset="1" stopColor="#0b0820" stopOpacity="0.85" />
        </radialGradient>
      </defs>
      <rect className="st-lights" width="1600" height="900" fill="#0a0a2a" opacity={level === 'dark' ? 0.72 : 0} />
      <rect className="st-lights" width="1600" height="900" fill="url(#st-torch)" opacity={level === 'dim' ? 1 : 0} />
    </g>
  )
}

type Icon = 'play' | 'pause' | 'replay' | 'skip' | 'expand' | 'shrink'

function CtrlButton({ label, onClick, icon, disabled }: { label: string; onClick: () => void; icon: Icon; disabled?: boolean }) {
  const paths: Record<Icon, string> = {
    play: 'M7 4.5v15l13-7.5z',
    pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
    replay: 'M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z',
    skip: 'M5 4l10 8-10 8zM17 4h3v16h-3z',
    expand: 'M4 4h6v2H6v4H4zM14 4h6v6h-2V6h-4zM4 14h2v4h4v2H4zM18 14h2v6h-6v-2h4z',
    shrink: 'M8 4h2v6H4V8h4zM14 4h2v4h4v2h-6zM4 14h6v6H8v-4H4zM14 14h6v2h-4v4h-2z',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 disabled:opacity-35"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true"><path d={paths[icon]} fill="currentColor" /></svg>
    </button>
  )
}

function ChoicePanel({ prompt, asker, options, tried, onPick }: { prompt: string; asker: CharacterId; options: ChoiceOption[]; tried: number[]; onPick: (i: number, o: ChoiceOption) => void }) {
  return (
    <div>
      <p className="text-base font-black text-white sm:text-lg">
        <span className={`mr-1.5 ${CAST[asker].captionClass}`}>{CAST[asker].name} asks:</span>
        {prompt}
      </p>
      <p className="mt-0.5 text-xs text-white/60">You decide! Tap an answer.</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {options.map((o, i) => {
          const no = tried.includes(i)
          return (
            <button
              key={o.label}
              type="button"
              onClick={() => onPick(i, o)}
              disabled={no}
              className={`min-h-12 rounded-xl px-3 py-2 text-left text-sm font-bold ring-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 sm:text-base ${no ? 'bg-white/5 text-white/40 line-through ring-white/10' : 'bg-indigo-600 text-white ring-indigo-300/50 hover:-translate-y-0.5 hover:bg-indigo-500'}`}
            >
              <span aria-hidden className="mr-1.5 text-amber-300">{String.fromCharCode(65 + i)}.</span>
              {o.label}
              {no && <span className="sr-only"> (already tried)</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function QuizPanel(props: { n: number; total: number; q: string; options: string[]; answer: number; explain: string; picked: number | null; onPick: (i: number) => void; onNext: () => void }) {
  const { n, total, q, options, answer, explain, picked, onPick, onNext } = props
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-orange-300">Quiz · question {n + 1} of {total}</p>
      <p className="mt-1 text-base font-black text-white sm:text-lg">{q}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {options.map((o, i) => {
          const isRight = picked !== null && i === answer
          const isWrong = picked === i && i !== answer
          return (
            <button
              key={o}
              type="button"
              onClick={() => onPick(i)}
              disabled={picked !== null}
              aria-pressed={picked === i}
              className={`min-h-12 rounded-xl px-3 py-2 text-left text-sm font-bold ring-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 sm:text-base ${isRight ? 'bg-emerald-600 text-white ring-emerald-300' : isWrong ? 'bg-rose-700/80 text-white ring-rose-300' : picked !== null ? 'bg-white/5 text-white/50 ring-white/10' : 'bg-indigo-600 text-white ring-indigo-300/50 hover:bg-indigo-500'}`}
            >
              <span aria-hidden className="mr-1.5 text-amber-300">{String.fromCharCode(65 + i)}.</span>
              {o}
              {isRight && <span className="ml-1">✓</span>}
            </button>
          )
        })}
      </div>
      {picked !== null && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center" aria-live="polite">
          <p className="flex-1 text-sm text-white/90 sm:text-base">
            <span className={`font-black ${picked === answer ? 'text-emerald-300' : 'text-amber-300'}`}>{picked === answer ? 'Correct! ' : 'Good try! '}</span>
            {explain}
          </p>
          <button
            type="button"
            onClick={onNext}
            className="min-h-11 rounded-xl bg-orange-500 px-5 font-black text-white hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            {n + 1 < total ? 'Next question →' : 'See my stars ★'}
          </button>
        </div>
      )}
    </div>
  )
}

function DonePanel({ stars, added, episode, next, onReplay }: { stars: number; added: number; episode: Episode; next: { slug: string; title: string }; onReplay: () => void }) {
  return (
    <div className="text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-orange-300">Episode complete!</p>
      <div className="mt-1 flex justify-center gap-2 text-4xl sm:text-5xl" role="img" aria-label={`${stars} out of 3 stars`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`st-star-pop ${i === 1 ? '[animation-delay:.15s]' : i === 2 ? '[animation-delay:.3s]' : ''} ${i < stars ? 'text-amber-300 drop-shadow-[0_0_12px_rgba(252,211,77,.7)]' : 'text-white/20'}`}>★</span>
        ))}
      </div>
      <p className="mt-1 text-sm text-white/80">
        {added > 0 ? `+${added} ${added === 1 ? 'star' : 'stars'} for your collection!` : 'You already had these stars. Can you beat your best?'}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Link href={`/kids/stories/${next.slug}`} className="flex min-h-12 items-center justify-center rounded-xl bg-orange-500 px-3 py-2 font-black text-white hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
          Next episode: {next.title} →
        </Link>
        <Link href={episode.handsOn.href} className="flex min-h-12 items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 font-black text-white hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
          {episode.handsOn.label}
        </Link>
        <button type="button" onClick={onReplay} className="min-h-12 rounded-xl bg-white/10 px-3 py-2 font-bold text-white ring-1 ring-white/20 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
          ↺ Watch again
        </button>
      </div>
    </div>
  )
}
