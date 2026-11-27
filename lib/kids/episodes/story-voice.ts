// lib/kids/episodes/story-voice.ts
//
// Story Theatre on the Piper voices (roadmap #8). The eight Story Theatre
// episodes used to be read by the browser's speech voice; every line they read
// aloud is now pre-generated with the same Piper voices as the 3D episodes
// (scripts/kids-voices/generate-stories.py → public/kids/audio/stories/).
//
// speakStoryLine() is a drop-in for speakLine() in lib/kids/stories/speech.ts
// (same arguments, same handle): it plays the clip for this speaker + text when
// the index has one and falls back to the browser voice when it does not (a
// line edited since the last voicing, an old browser, a failed fetch). So the
// player never goes silent and never waits on a missing file.
//
// Browser-only. One <audio> element for every line: once primeStoryVoice() has
// run inside a tap (iOS), later lines start without a gesture. Clips go through
// the kids service worker's audio cache (/kids/audio/**), so a watched story
// plays offline.

import { speakLine, type SpeakHandle } from '../stories/speech'
import type { SpeakerId } from '../stories/types'
import { storyVoiceKey } from './story-voice-key'

const INDEX_URL = '/kids/audio/stories/index.json'

interface StoryVoiceIndex {
  base: string
  lines: Record<string, { d: number }>
}

let indexPromise: Promise<StoryVoiceIndex | null> | null = null
let audio: HTMLAudioElement | null = null
let ext: 'ogg' | 'm4a' = 'ogg'

/** The voicing index (16 KB), fetched once per page. Null when missing or unreadable. */
export function loadStoryVoiceIndex(): Promise<StoryVoiceIndex | null> {
  if (!indexPromise) {
    indexPromise = fetch(INDEX_URL)
      .then(async (r) => {
        if (!r.ok) return null
        const j: unknown = await r.json()
        if (!j || typeof j !== 'object') return null
        const o = j as Record<string, unknown>
        if (typeof o.base !== 'string' || !o.lines || typeof o.lines !== 'object') return null
        return { base: o.base, lines: o.lines as StoryVoiceIndex['lines'] }
      })
      .catch(() => null)
  }
  return indexPromise
}

function el(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null
  if (!audio) {
    audio = new Audio()
    audio.preload = 'auto'
    const probe = audio.canPlayType('audio/ogg; codecs="opus"')
    ext = probe === 'probably' || probe === 'maybe' ? 'ogg' : 'm4a'
  }
  return audio
}

// 0.05 s of silence: lets a tap unlock the element without a sound.
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA='

/** Call inside the Play tap (next to primeAudio) so iOS lets later lines play. Also warms the index. */
export function primeStoryVoice(): void {
  void loadStoryVoiceIndex()
  const a = el()
  if (!a || a.src) return
  try {
    a.muted = true
    a.src = SILENT_WAV
    void a.play().then(
      () => {
        a.pause()
        a.muted = false
      },
      () => {
        a.muted = false
      },
    )
  } catch {
    /* noop */
  }
}

/** True when this line has a Piper clip (after the index has loaded). */
export async function hasStoryVoice(who: SpeakerId, text: string): Promise<boolean> {
  const idx = await loadStoryVoiceIndex()
  return !!idx?.lines[storyVoiceKey(who, text)]
}

/**
 * Speak one Story Theatre line: the Piper clip when there is one, else the
 * browser voice. `onEnd` fires exactly once (end, error, stall); `onBoundary`
 * ticks while the clip plays so the character's mouth moves.
 */
export function speakStoryLine(who: SpeakerId, text: string, expectedMs: number, onEnd: () => void, onBoundary?: () => void): SpeakHandle {
  let cancelled = false
  let done = false
  let inner: SpeakHandle | null = null
  let tick: ReturnType<typeof setInterval> | null = null
  let safety: ReturnType<typeof setTimeout> | null = null
  const a = el()

  const cleanup = () => {
    if (tick) clearInterval(tick)
    if (safety) clearTimeout(safety)
    tick = null
    safety = null
    if (a) {
      a.onended = null
      a.onerror = null
    }
  }
  const finish = () => {
    if (done || cancelled) return
    done = true
    cleanup()
    onEnd()
  }
  const fallback = () => {
    if (done || cancelled || inner) return
    cleanup()
    inner = speakLine(who, text, expectedMs, () => {
      if (done || cancelled) return
      done = true
      onEnd()
    }, onBoundary)
  }

  void loadStoryVoiceIndex().then((idx) => {
    if (cancelled || done) return
    const rec = idx?.lines[storyVoiceKey(who, text)]
    if (!a || !idx || !rec) return fallback()
    const file = `${idx.base}/${storyVoiceKey(who, text)}.${ext}`
    try {
      // The browser voice may still be talking from an earlier line.
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
      a.onended = finish
      a.onerror = fallback
      a.src = file
      a.currentTime = 0
      a.play().then(
        () => {
          if (cancelled) return a.pause()
          if (onBoundary) tick = setInterval(() => !a.paused && onBoundary(), 150)
          safety = setTimeout(finish, Math.max(expectedMs, rec.d * 1000) * 2 + 3000)
        },
        // Autoplay refused (no tap yet) or the clip failed: the browser voice takes over.
        () => fallback(),
      )
    } catch {
      fallback()
    }
  })

  return {
    cancel: () => {
      cancelled = true
      cleanup()
      inner?.cancel()
      if (a && !a.paused) {
        try {
          a.pause()
        } catch {
          /* noop */
        }
      }
    },
  }
}

/** Stop whatever is playing (clip or browser voice). */
export function stopStoryVoice(): void {
  if (audio && !audio.paused) {
    try {
      audio.pause()
    } catch {
      /* noop */
    }
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel()
    } catch {
      /* noop */
    }
  }
}
