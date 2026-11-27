'use client'

// components/kids/present/PresentClient.tsx — Present mode for the classroom
// projector (roadmap #42). Full screen, big type, one slide at a time:
//   - the lesson timer (5/10/20/5, LESSON_SHAPE) that follows the slides;
//   - the join code + QR in a corner;
//   - an embedded episode, simulator, replay or session (same-origin frame,
//     the kids chrome hidden inside it), with slow motion (½×, ¼×);
//   - freeze-and-draw over anything on screen;
//   - "ask the class" prompts from the teacher notes, one at a time;
//   - a hands-up vote for the check.
// Keys: → / PageDown next, ← / PageUp back (presentation clickers send these),
// F full screen, D draw, T timer, Esc stop drawing. Nothing is stored or sent.

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PresentDeck, PresentSlide } from '@/lib/kids/teach/present'
import { sendPresentSignal } from '@/lib/kids/teach/present-bridge'
import { FloorGridMap } from '@/app/kids/teach/unplugged/printables'
import LessonTimerClient from './LessonTimerClient'
import DrawLayerClient from './DrawLayerClient'
import HandsUpVoteClient from './HandsUpVoteClient'
import JoinCornerClient from './JoinCornerClient'

const SPEEDS = [1, 0.5, 0.25] as const

/** Hides the kids chrome inside a framed page (same origin). */
const FRAME_CSS = `
.kids-nav, .kids-tabbar, .kids-footer, button[aria-label^="Ask Spark"], button[aria-label^="Need help?"] { display: none !important; }
.kids-main { padding-top: 0 !important; padding-bottom: 0 !important; }
`

function frameWindow(f: HTMLIFrameElement | null): Window | null {
  try {
    const w = f?.contentWindow ?? null
    // Throws if the frame is cross-origin (it never should be).
    void w?.document
    return w
  } catch {
    return null
  }
}

/** Slow motion / freeze for media and CSS/Web animations inside the frame. */
function applyToFrame(f: HTMLIFrameElement | null, speed: number, frozen: boolean, paused: Set<HTMLMediaElement>) {
  const w = frameWindow(f)
  if (!w) return
  const doc = w.document
  for (const m of Array.from(doc.querySelectorAll('video, audio')) as HTMLMediaElement[]) {
    m.playbackRate = speed
    if (frozen && !m.paused) {
      m.pause()
      paused.add(m)
    } else if (!frozen && paused.has(m)) {
      void m.play().catch(() => undefined)
      paused.delete(m)
    }
  }
  if (typeof doc.getAnimations === 'function') {
    for (const a of doc.getAnimations()) {
      a.playbackRate = speed
      if (frozen) a.pause()
      else if (a.playState === 'paused') a.play()
    }
  }
  sendPresentSignal(w, { speed, frozen })
}

export default function PresentClient({ deck, joinCode }: { deck: PresentDeck; joinCode: string | null }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const pausedMedia = useRef(new Set<HTMLMediaElement>())
  const [i, setI] = useState(0)
  const [phase, setPhase] = useState(deck.slides[0]?.phase ?? 0)
  const [speed, setSpeed] = useState<number>(1)
  const [drawing, setDrawing] = useState(false)
  const [showJoin, setShowJoin] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  // Portalled to <body> after mount, above the shell's own portals (Ask Spark, toasts).
  const [portal, setPortal] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setPortal(document.body)
    // On a phone the corner would cover the slide: start with it folded away.
    if (window.innerWidth < 768) setShowJoin(false)
  }, [])
  const slide = deck.slides[i]

  const go = useCallback(
    (n: number) => {
      const next = Math.max(0, Math.min(deck.slides.length - 1, n))
      setI(next)
      setDrawing(false)
      setPhase(deck.slides[next].phase)
    },
    [deck.slides],
  )

  // Body scroll lock while presenting.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
    else void rootRef.current?.requestFullscreen?.().catch(() => undefined)
  }, [])

  // Keep the frame in step with slow motion and freeze.
  useEffect(() => {
    applyToFrame(frameRef.current, speed, drawing, pausedMedia.current)
  }, [speed, drawing, i])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input, textarea, select')) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault()
        go(i + 1)
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        go(i - 1)
      } else if (e.key === 'f' || e.key === 'F') toggleFullscreen()
      else if (e.key === 'd' || e.key === 'D') setDrawing((d) => !d)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, i, toggleFullscreen])

  const onFrameLoad = () => {
    const w = frameWindow(frameRef.current)
    if (!w) return
    try {
      const style = w.document.createElement('style')
      style.textContent = FRAME_CSS
      w.document.head.appendChild(style)
    } catch {
      /* ignore */
    }
    pausedMedia.current.clear()
    applyToFrame(frameRef.current, speed, drawing, pausedMedia.current)
  }

  const btn = 'min-h-[44px] min-w-[44px] shrink-0 whitespace-nowrap rounded-xl px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
  const isEmbed = slide?.kind === 'embed'

  const ui = (
    <div ref={rootRef} className="fixed inset-0 z-[200] flex flex-col bg-[#0A1120] text-white" role="dialog" aria-modal="true" aria-label={`Present mode: ${deck.title}`}>
      {/* Top bar: title, timer, tools */}
      <header className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#111C32] px-3 py-2">
        <div className="mr-auto min-w-0 max-md:basis-full">
          <p className="truncate text-xs font-bold uppercase tracking-wider text-amber-300">{deck.kicker}</p>
          <p className="truncate font-display text-lg font-bold">{deck.title}</p>
        </div>
        <LessonTimerClient phases={deck.phases} phase={Math.min(phase, deck.phases.length - 1)} onPhase={setPhase} />
        <div className="-mx-1 flex max-w-full flex-nowrap items-center gap-1 overflow-x-auto px-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0" role="toolbar" aria-label="Present tools">
          {isEmbed && (
            <div className="flex shrink-0 items-center gap-1 rounded-xl bg-white/[0.06] p-1" role="group" aria-label="Slow motion">
              {SPEEDS.map((s) => (
                <button key={s} type="button" onClick={() => setSpeed(s)} aria-pressed={speed === s} className={`${btn} ${speed === s ? 'bg-amber-500 text-[#1A1103]' : 'text-slate-200 hover:bg-white/10'}`}>
                  {s === 1 ? '1×' : s === 0.5 ? '½×' : '¼×'}
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={() => setDrawing((d) => !d)} aria-pressed={drawing} className={`${btn} ${drawing ? 'bg-amber-500 text-[#1A1103]' : 'bg-white/[0.06] hover:bg-white/10'}`}>
            {drawing ? 'Drawing…' : 'Freeze & draw'}
          </button>
          <button type="button" onClick={() => setShowJoin((v) => !v)} aria-pressed={showJoin} className={`${btn} bg-white/[0.06] hover:bg-white/10`}>Join code</button>
          <button type="button" onClick={toggleFullscreen} className={`${btn} bg-white/[0.06] hover:bg-white/10`} aria-label={fullscreen ? 'Leave full screen' : 'Full screen'}>
            {fullscreen ? 'Exit full screen' : 'Full screen'}
          </button>
          <Link href={deck.backHref} className={`${btn} inline-flex items-center bg-white/[0.06] hover:bg-white/10`}>Exit</Link>
        </div>
      </header>

      {/* Stage */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className={isEmbed ? 'flex h-full flex-col p-2 sm:p-4' : `h-full overflow-y-auto px-4 py-5 sm:px-8 sm:py-8 ${showJoin && !drawing ? 'pb-44' : ''}`}>
          {slide && <Slide slide={slide} frameRef={frameRef} onFrameLoad={onFrameLoad} />}
        </div>
        {drawing && <DrawLayerClient onDone={() => setDrawing(false)} />}
        {showJoin && !drawing && <JoinCornerClient initialCode={joinCode} onClose={() => setShowJoin(false)} />}
      </div>

      {/* Bottom bar: slide navigation */}
      <footer className="flex items-center gap-3 border-t border-white/10 bg-[#111C32] px-3 py-2">
        <button type="button" onClick={() => go(i - 1)} disabled={i === 0} className="min-h-[52px] rounded-xl bg-white/[0.06] px-5 text-lg font-bold hover:bg-white/10 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">← Back</button>
        <p className="mx-auto font-display text-lg font-bold tabular-nums text-slate-200 sm:hidden" aria-hidden>{i + 1} / {deck.slides.length}</p>
        <ol className="mx-auto hidden flex-wrap justify-center gap-1 sm:flex" aria-label="Slides">
          {deck.slides.map((s, n) => (
            <li key={n}>
              <button
                type="button"
                onClick={() => go(n)}
                aria-current={n === i ? 'step' : undefined}
                aria-label={`Slide ${n + 1}: ${slideName(s)}`}
                className="grid min-h-[44px] min-w-[44px] place-items-center rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
              >
                <span className={`block h-3 rounded-full ${n === i ? 'w-8 bg-amber-500' : 'w-3 bg-white/30'}`} />
              </button>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => go(i + 1)} disabled={i >= deck.slides.length - 1} className="min-h-[52px] rounded-xl bg-amber-500 px-5 text-lg font-bold text-[#1A1103] hover:bg-amber-400 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60">Next →</button>
      </footer>
    </div>
  )
  return portal ? createPortal(ui, portal) : ui
}

function slideName(s: PresentSlide): string {
  return s.title
}

function Slide({ slide, frameRef, onFrameLoad }: { slide: PresentSlide; frameRef: React.RefObject<HTMLIFrameElement | null>; onFrameLoad: () => void }) {
  switch (slide.kind) {
    case 'title':
      return (
        <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center">
          <p className="text-[clamp(1rem,2vw,1.6rem)] font-bold uppercase tracking-wider text-amber-300">{slide.kicker}</p>
          <h1 className="mt-3 font-display text-[clamp(2.4rem,7vw,6rem)] font-bold leading-[1.02]">{slide.title}</h1>
          <ul className="mt-8 space-y-3">
            {slide.lines.map((l) => (
              <li key={l} className="flex gap-3 text-[clamp(1.2rem,2.6vw,2.2rem)] leading-snug text-slate-100"><span aria-hidden className="text-amber-400">★</span>{l}</li>
            ))}
          </ul>
        </div>
      )
    case 'steps':
      return (
        <div className="mx-auto max-w-5xl">
          <p className="text-[clamp(1rem,1.8vw,1.4rem)] font-bold uppercase tracking-wider text-amber-300">{slide.kicker}</p>
          <h1 className="mt-2 font-display text-[clamp(2rem,5vw,4rem)] font-bold leading-tight">{slide.title}</h1>
          <ol className="mt-6 space-y-4">
            {slide.steps.map((s, n) => (
              <li key={s} className="flex gap-4 text-[clamp(1.15rem,2.3vw,2rem)] leading-snug text-slate-100">
                <span className="grid h-[1.8em] w-[1.8em] shrink-0 place-items-center rounded-full bg-amber-500 font-display font-bold text-[#1A1103]">{n + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      )
    case 'story':
      return (
        <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center">
          <p className="text-[clamp(1rem,1.8vw,1.4rem)] font-bold uppercase tracking-wider text-amber-300">{slide.title}</p>
          <p className="mt-4 font-display text-[clamp(1.6rem,3.6vw,3.2rem)] font-bold leading-snug">{slide.text}</p>
          <p className="mt-8 text-[clamp(1.1rem,2vw,1.7rem)] text-cyan-300">What should Spark do?</p>
        </div>
      )
    case 'embed':
      return (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className="font-display text-[clamp(1.3rem,2.6vw,2.2rem)] font-bold">{slide.title}</h1>
            <p className="text-[clamp(0.95rem,1.4vw,1.15rem)] text-slate-300">{slide.note}</p>
          </div>
          <iframe
            ref={frameRef}
            key={slide.src}
            src={slide.src}
            title={slide.title}
            onLoad={onFrameLoad}
            allow="fullscreen; autoplay"
            className="min-h-0 w-full flex-1 rounded-[20px] border border-white/10 bg-[#0A1120]"
          />
        </div>
      )
    case 'map':
      return (
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <p className="text-[clamp(1rem,1.8vw,1.4rem)] font-bold uppercase tracking-wider text-amber-300">Human-robot mission</p>
            <h1 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.6rem)] font-bold leading-tight">{slide.title}</h1>
            <p className="mt-4 text-[clamp(1.15rem,2.2vw,1.9rem)] leading-snug text-slate-100">{slide.mission.ask}</p>
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Cards you can use">
              {slide.cards.map((c) => (
                <li key={c.label} className="rounded-2xl bg-white px-3 py-2 text-[clamp(0.95rem,1.5vw,1.25rem)] font-bold text-[#111C32]"><span aria-hidden>{c.icon} </span>{c.label}</li>
              ))}
            </ul>
          </div>
          <FloorGridMap mission={slide.mission} caption="The map" />
        </div>
      )
    case 'ask':
      return <AskSlide prompts={slide.prompts} listenFor={slide.listenFor} title={slide.title} />
    case 'vote':
      return <HandsUpVoteClient questions={slide.questions} />
  }
}

function AskSlide({ title, prompts, listenFor }: { title: string; prompts: string[]; listenFor: string[] }) {
  const [n, setN] = useState(0)
  const [notes, setNotes] = useState(false)
  const [think, setThink] = useState<number | null>(null)

  useEffect(() => {
    if (think === null || think <= 0) return
    const id = window.setTimeout(() => setThink((t) => (t === null ? null : t - 1)), 1000)
    return () => window.clearTimeout(id)
  }, [think])

  const btn = 'min-h-[48px] rounded-xl px-4 font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60'
  if (!prompts.length) return null
  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center">
      <p className="text-[clamp(1rem,1.8vw,1.4rem)] font-bold uppercase tracking-wider text-amber-300">{title} · {n + 1} of {prompts.length}</p>
      <p className="mt-4 font-display text-[clamp(1.8rem,4.4vw,4rem)] font-bold leading-tight" aria-live="polite">{prompts[n]}</p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button type="button" disabled={n === 0} onClick={() => setN(n - 1)} className={`${btn} bg-white/[0.06] hover:bg-white/10 disabled:opacity-40`}>← Prompt</button>
        <button type="button" disabled={n >= prompts.length - 1} onClick={() => setN(n + 1)} className={`${btn} bg-white/[0.06] hover:bg-white/10 disabled:opacity-40`}>Prompt →</button>
        <button type="button" onClick={() => setThink(10)} className={`${btn} bg-cyan-400 text-[#0A1120] hover:bg-cyan-300`}>Think 10 s</button>
        <button type="button" onClick={() => setThink(30)} className={`${btn} bg-cyan-400 text-[#0A1120] hover:bg-cyan-300`}>Pair 30 s</button>
        {think !== null && (
          <span className="rounded-xl bg-white/[0.06] px-4 py-2 font-display text-3xl font-bold tabular-nums" role="timer" aria-live="off">
            {think > 0 ? `${think}s` : 'Share!'}
          </span>
        )}
        {listenFor.length > 0 && (
          <button type="button" onClick={() => setNotes((v) => !v)} aria-expanded={notes} className={`${btn} ml-auto text-slate-300 hover:bg-white/10`}>
            {notes ? 'Hide teacher notes' : 'Teacher notes'}
          </button>
        )}
      </div>
      {notes && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm font-bold uppercase tracking-wider text-amber-300">Listen for</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-lg text-slate-200">{listenFor.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
      )}
    </div>
  )
}
