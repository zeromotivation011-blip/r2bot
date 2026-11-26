'use client'

// components/kids/course/EpisodeStepClient.tsx
// Beat 1 of a session: the episode. Plays the 3D episode player
// (components/kids/episodes/EpisodePlayerClient, props { sessionId, onDone },
// which reports its own 'episode' reward). If that module cannot be loaded, or
// it crashes (no WebGL, an old phone), the same episode is shown as an
// illustrated storyboard from the curriculum's scenes, read aloud by Spark.
// A child can always choose the storyboard, and can always move on.

import dynamic from 'next/dynamic'
import { Component, createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { CharacterId, Episode } from '@/lib/kids/curriculum/types'
import { cancelSparkSpeech, playSound, sparkSays } from '@/lib/kids-audio'

/** The contract with the episode player (kept here so this file compiles without it). */
interface EpisodePlayerProps {
  sessionId: string
  onDone: () => void
}

const EpisodeCtx = createContext<{ episode: Episode; sessionNumber: number } | null>(null)

/** Used when the player module is missing: the storyboard, from context. */
function StoryboardFallback({ onDone }: EpisodePlayerProps) {
  const ctx = useContext(EpisodeCtx)
  if (!ctx) return null
  return <Storyboard episode={ctx.episode} sessionNumber={ctx.sessionNumber} onDone={onDone} />
}

function PlayerSkeleton() {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(ellipse_at_50%_30%,#19263F_0%,#0A1120_70%)] sm:aspect-video" aria-busy="true">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <div className="h-20 w-20 rounded-full bg-amber-500/20 motion-safe:animate-pulse" aria-hidden />
        <p className="font-display text-lg font-bold text-[#A7B0C0]">Getting the episode ready…</p>
      </div>
    </div>
  )
}

const EpisodePlayer = dynamic<EpisodePlayerProps>(
  () =>
    import('@/components/kids/episodes/EpisodePlayerClient')
      .then((m) => m.default as React.ComponentType<EpisodePlayerProps>)
      .catch(() => StoryboardFallback),
  { ssr: false, loading: PlayerSkeleton },
)

class PlayerBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    /* the storyboard takes over */
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

// ── Storyboard ────────────────────────────────────────────────────────────

const CAST: Record<CharacterId, { name: string; face: string; chip: string }> = {
  narrator: { name: 'Narrator', face: '📖', chip: 'bg-[#19263F] text-[#EEF2F8]' },
  spark: { name: 'Spark', face: '🤖', chip: 'bg-amber-500 text-[#1A1103]' },
  amara: { name: 'Amara', face: '👧🏾', chip: 'bg-yellow-300 text-[#1A1103]' },
  lucia: { name: 'Nana Lucía', face: '👵🏽', chip: 'bg-rose-300 text-[#1A1103]' },
  bolt: { name: 'Bolt', face: '🐕', chip: 'bg-cyan-400 text-[#1A1103]' },
  myrobot: { name: 'Your robot', face: '🦾', chip: 'bg-emerald-300 text-[#1A1103]' },
  guest: { name: 'Guest', face: '🧑🏽', chip: 'bg-sky-200 text-[#1A1103]' },
}

/** A sky colour per scene so the storyboard reads like panels of a picture book. */
const SKIES = [
  'from-[#1B2E55] via-[#22406E] to-[#0A1120]',
  'from-[#3A2614] via-[#5A3A1A] to-[#0A1120]',
  'from-[#0F3A3F] via-[#145057] to-[#0A1120]',
  'from-[#3A1E22] via-[#4E2A2C] to-[#0A1120]',
  'from-[#123222] via-[#1C4A33] to-[#0A1120]',
]

function Storyboard({ episode, sessionNumber, onDone }: { episode: Episode; sessionNumber: number; onDone: () => void }) {
  // Panel 0 = the title card, 1..n = scenes, n+1 = "next time".
  const total = episode.scenes.length + 2
  const [i, setI] = useState(0)
  const [reading, setReading] = useState(false)
  const scene = i >= 1 && i <= episode.scenes.length ? episode.scenes[i - 1] : null
  const last = i === total - 1

  useEffect(() => () => cancelSparkSpeech(), [])

  const readPanel = () => {
    cancelSparkSpeech()
    let text: string
    if (i === 0) text = `Episode ${sessionNumber}. ${episode.title}. ${episode.previously ?? ''}`
    else if (scene) text = scene.lines.map((l) => (l.who === 'narrator' ? l.line : `${l.who === 'guest' ? l.guestName ?? 'Guest' : CAST[l.who].name} says: ${l.line}`)).join(' ')
    else text = `Next time. ${episode.cliffhanger}`
    setReading(true)
    sparkSays(text, () => setReading(false))
  }

  const go = (d: number) => {
    cancelSparkSpeech()
    setReading(false)
    playSound('click')
    const n = Math.max(0, Math.min(total - 1, i + d))
    setI(n)
    if (n === total - 1 && d > 0) onDone()
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#111C32] shadow-[0_8px_24px_rgba(0,0,0,.45)]" data-testid="episode-storyboard">
      <div className={`relative flex min-h-[340px] flex-col bg-gradient-to-b p-5 sm:min-h-[400px] sm:p-7 ${SKIES[i % SKIES.length]}`}>
        <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
          {i === 0 ? `Episode ${sessionNumber}` : last ? 'Next time…' : `Scene ${i} of ${episode.scenes.length}`}
        </p>
        {i === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <span className="text-6xl" aria-hidden>
              🏮
            </span>
            <h3 className="mt-3 font-display text-3xl font-bold leading-tight text-[#EEF2F8] sm:text-4xl">{episode.title}</h3>
            {episode.previously && <p className="mt-3 max-w-xl text-[17px] italic text-[#A7B0C0]">Last time: {episode.previously}</p>}
          </div>
        )}
        {scene && (
          <div className="mt-2 flex flex-1 flex-col gap-3">
            <p className="text-[15px] font-semibold text-cyan-200">📍 {scene.setting}</p>
            <p className="rounded-2xl bg-black/25 px-4 py-3 text-[15px] italic leading-snug text-[#A7B0C0]">{scene.action}</p>
            <ul className="flex flex-col gap-2">
              {scene.lines.map((l, k) => (
                <li key={k} className="flex items-start gap-2">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-2xl" aria-hidden>
                    {CAST[l.who].face}
                  </span>
                  <span className="min-w-0 rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-[#0A1120] shadow">
                    <span className={`mr-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-black uppercase ${CAST[l.who].chip}`}>
                      {l.who === 'guest' ? l.guestName ?? 'Guest' : CAST[l.who].name}
                    </span>
                    <span className="text-[16px] font-semibold leading-snug">{l.line}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {last && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <span className="text-6xl" aria-hidden>
              ✨
            </span>
            <p className="mt-3 max-w-xl font-display text-2xl font-bold leading-snug text-[#EEF2F8]">{episode.cliffhanger}</p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 p-3">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={i === 0}
          className="min-h-[48px] rounded-2xl bg-white/[0.08] px-4 font-bold text-[#EEF2F8] hover:bg-white/15 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
          aria-label="Previous panel"
        >
          ←
        </button>
        <button
          type="button"
          onClick={readPanel}
          className="min-h-[48px] flex-1 rounded-2xl bg-white/[0.08] px-4 font-bold text-[#EEF2F8] hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 sm:flex-none"
          aria-pressed={reading}
        >
          🔊 {reading ? 'Reading…' : 'Read it to me'}
        </button>
        <span className="ml-auto hidden text-sm font-bold text-[#6E7888] sm:block" aria-hidden>
          {i + 1} / {total}
        </span>
        {!last && (
          <button
            type="button"
            onClick={() => go(1)}
            className="min-h-[48px] rounded-2xl bg-amber-500 px-5 font-display font-bold text-[#1A1103] hover:bg-amber-400 active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
            data-testid="storyboard-next"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  )
}

// ── The step ──────────────────────────────────────────────────────────────

interface Props {
  sessionId: string
  sessionNumber: number
  episode: Episode
  watched: boolean
  onWatched: () => void
  onNext: () => void
}

export default function EpisodeStepClient({ sessionId, sessionNumber, episode, watched, onWatched, onNext }: Props) {
  const [mode, setMode] = useState<'player' | 'storyboard'>('player')
  const storyboard = <Storyboard episode={episode} sessionNumber={sessionNumber} onDone={onWatched} />
  return (
    <EpisodeCtx.Provider value={{ episode, sessionNumber }}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto min-w-0 font-display text-xs font-bold uppercase tracking-wider text-cyan-300">
            Episode {sessionNumber} · <span className="normal-case tracking-normal">{episode.title}</span>
          </h2>
          <div className="flex gap-1 rounded-2xl bg-white/[0.05] p-1" role="group" aria-label="How to watch">
            {(
              [
                ['player', '🎬 Cartoon'],
                ['storyboard', '📖 Storybook'],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`min-h-[44px] rounded-xl px-3 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${mode === m ? 'bg-amber-500 text-[#1A1103]' : 'text-[#EEF2F8] hover:bg-white/10'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {mode === 'player' ? (
          <PlayerBoundary fallback={storyboard}>
            <EpisodePlayer sessionId={sessionId} onDone={onWatched} />
          </PlayerBoundary>
        ) : (
          storyboard
        )}
        <div className="flex flex-wrap items-center justify-end gap-3">
          {!watched && <p className="mr-auto text-[15px] text-[#A7B0C0]">Watch to the end, then build your robot.</p>}
          <button
            type="button"
            onClick={onNext}
            data-testid="beat-next"
            className={`min-h-[52px] rounded-2xl px-6 font-display text-lg font-bold transition-transform active:scale-[.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 ${
              watched ? 'bg-amber-500 text-[#1A1103] shadow-[0_8px_24px_rgba(252,104,24,.35)] hover:bg-amber-400' : 'bg-white/[0.08] text-[#EEF2F8] hover:bg-white/15'
            }`}
          >
            {watched ? 'Next: Build →' : 'Skip to Build →'}
          </button>
        </div>
      </div>
    </EpisodeCtx.Provider>
  )
}
