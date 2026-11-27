'use client'

// components/kids/course/level2/StorybookClient.tsx
// A course episode as an illustrated storybook: one panel per scene, the cast
// as colour chips with a face, every line readable and read aloud by Spark on
// request (voice setting respected by sparkSays). Used by the Level 2 runner,
// whose episodes are scripts (lib/kids/curriculum/level2) rather than
// pre-rendered 3D films. Reaching the last panel counts as watched.

import { useEffect, useState } from 'react'
import type { CharacterId, Episode } from '@/lib/kids/curriculum/types'
import { cancelSparkSpeech, playSound, sparkSays } from '@/lib/kids-audio'

const CAST: Record<CharacterId, { name: string; face: string; chip: string }> = {
  narrator: { name: 'Narrator', face: '📖', chip: 'bg-[#19263F] text-[#EEF2F8]' },
  spark: { name: 'Spark', face: '🤖', chip: 'bg-amber-500 text-[#1A1103]' },
  amara: { name: 'Amara', face: '👧🏾', chip: 'bg-yellow-300 text-[#1A1103]' },
  lucia: { name: 'Nana Lucía', face: '👵🏽', chip: 'bg-rose-300 text-[#1A1103]' },
  bolt: { name: 'Bolt', face: '🐕', chip: 'bg-cyan-400 text-[#1A1103]' },
  myrobot: { name: 'Your robot', face: '🦾', chip: 'bg-emerald-300 text-[#1A1103]' },
  guest: { name: 'Guest', face: '🧑🏽', chip: 'bg-sky-200 text-[#1A1103]' },
}

const SKIES = [
  'from-[#0F3A3F] via-[#145057] to-[#0A1120]',
  'from-[#1B2E55] via-[#22406E] to-[#0A1120]',
  'from-[#3A2614] via-[#5A3A1A] to-[#0A1120]',
  'from-[#12324A] via-[#1A4766] to-[#0A1120]',
  'from-[#2B3A1E] via-[#3D5228] to-[#0A1120]',
  'from-[#3A1E22] via-[#4E2A2C] to-[#0A1120]',
]

interface Props {
  episode: Episode
  sessionNumber: number
  onDone: () => void
}

export default function StorybookClient({ episode, sessionNumber, onDone }: Props) {
  // Panel 0 is the title card; then one per scene; the last is "next time".
  const total = episode.scenes.length + 2
  const [i, setI] = useState(0)

  useEffect(() => () => cancelSparkSpeech(), [])
  useEffect(() => {
    if (i === total - 1) onDone()
  }, [i, total, onDone])

  const go = (n: number) => {
    cancelSparkSpeech()
    playSound('click')
    setI(Math.max(0, Math.min(total - 1, n)))
  }

  const readPanel = () => {
    if (i === 0) sparkSays(`Episode ${sessionNumber}. ${episode.title}. ${episode.previously ?? ''}`)
    else if (i === total - 1) sparkSays(`Next time: ${episode.cliffhanger}`)
    else sparkSays(episode.scenes[i - 1].lines.map((l) => l.line).join(' '))
  }

  const scene = i > 0 && i < total - 1 ? episode.scenes[i - 1] : null

  return (
    <div className="flex flex-col gap-3" data-testid="storybook">
      <div
        className={`relative min-h-[300px] overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b ${SKIES[i % SKIES.length]} p-5 sm:min-h-[360px] sm:p-7`}
        aria-live="polite"
      >
        {i === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
            <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">Episode {sessionNumber}</p>
            <h3 className="mt-2 font-display text-3xl font-bold leading-tight text-[#EEF2F8] sm:text-4xl">{episode.title}</h3>
            {episode.previously && <p className="mt-3 max-w-xl text-[17px] italic text-[#A7B0C0]">Last time: {episode.previously.replace(/^Last time, /, '')}</p>}
          </div>
        ) : scene ? (
          <div>
            <p className="text-[15px] leading-relaxed text-[#A7B0C0]">
              <span className="sr-only">Scene {i} of {episode.scenes.length}. </span>
              {scene.setting}
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {scene.lines.map((l, k) => {
                const c = CAST[l.who]
                const name = l.who === 'guest' && l.guestName ? l.guestName : c.name
                return (
                  <li key={k} className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-2xl" aria-hidden>
                      {c.face}
                    </span>
                    <div className="min-w-0">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-black ${c.chip}`}>{name}</span>
                      <p className="mt-1 text-[17px] leading-snug text-[#EEF2F8]">{l.line}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
            <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-amber-300">Next time…</p>
            <p className="mt-3 max-w-xl font-display text-2xl font-bold leading-snug text-[#EEF2F8]">{episode.cliffhanger}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => go(i - 1)}
          disabled={i === 0}
          className="min-h-[48px] rounded-2xl bg-white/[0.08] px-4 font-black text-[#EEF2F8] hover:bg-white/15 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={readPanel}
          className="min-h-[48px] rounded-2xl border border-cyan-400/40 px-4 font-black text-cyan-200 hover:bg-cyan-400/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
        >
          🔊 Read to me
        </button>
        <span className="mx-auto text-sm font-bold text-[#A7B0C0]" aria-hidden>
          {i + 1} / {total}
        </span>
        <button
          type="button"
          onClick={() => go(i + 1)}
          disabled={i === total - 1}
          data-testid="story-next"
          className="min-h-[48px] rounded-2xl bg-amber-500 px-5 font-black text-[#1A1103] hover:bg-amber-400 disabled:bg-white/[0.08] disabled:text-[#6E7888] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60"
        >
          {i === 0 ? 'Start →' : 'Next →'}
        </button>
      </div>
    </div>
  )
}
