// lib/kids-audio.ts
// Web Audio API helpers — no files, no npm packages.
// Master volume 0.3, respects document.hidden.

export type SoundType =
  | 'click'
  | 'correct'
  | 'wrong'
  | 'star'
  | 'levelup'
  | 'zonecomplete'
  | 'unlock'

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null

function ensureCtx(): { ctx: AudioContext; master: GainNode } | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    try {
      const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
      if (!Ctor) return null
      ctx = new Ctor()
      masterGain = ctx.createGain()
      masterGain.gain.value = 0.3
      masterGain.connect(ctx.destination)
    } catch {
      return null
    }
  }
  if (!ctx || !masterGain) return null
  return { ctx, master: masterGain }
}

function tone(opts: {
  freq: number
  durationMs: number
  type?: OscillatorType
  startAt?: number
  peakGain?: number
}) {
  const got = ensureCtx()
  if (!got) return
  const { ctx, master } = got
  const start = ctx.currentTime + (opts.startAt ?? 0)
  const end = start + opts.durationMs / 1000

  const osc = ctx.createOscillator()
  osc.type = opts.type ?? 'sine'
  osc.frequency.value = opts.freq

  const env = ctx.createGain()
  env.gain.setValueAtTime(0, start)
  env.gain.linearRampToValueAtTime(opts.peakGain ?? 0.6, start + 0.01)
  env.gain.exponentialRampToValueAtTime(0.0001, end)

  osc.connect(env).connect(master)
  osc.start(start)
  osc.stop(end + 0.02)
}

function sweep(opts: { from: number; to: number; durationMs: number; type?: OscillatorType }) {
  const got = ensureCtx()
  if (!got) return
  const { ctx, master } = got
  const start = ctx.currentTime
  const end = start + opts.durationMs / 1000

  const osc = ctx.createOscillator()
  osc.type = opts.type ?? 'sine'
  osc.frequency.setValueAtTime(opts.from, start)
  osc.frequency.exponentialRampToValueAtTime(opts.to, end)

  const env = ctx.createGain()
  env.gain.setValueAtTime(0, start)
  env.gain.linearRampToValueAtTime(0.6, start + 0.02)
  env.gain.exponentialRampToValueAtTime(0.0001, end)

  osc.connect(env).connect(master)
  osc.start(start)
  osc.stop(end + 0.02)
}

const NOTES = {
  C: 261.63,
  D: 293.66,
  E: 329.63,
  F: 349.23,
  G: 392.0,
  A: 440.0,
  B: 493.88,
  C2: 523.25,
  E2: 659.25,
  G2: 783.99,
  C3: 1046.5,
}

export function playSound(type: SoundType) {
  if (typeof document !== 'undefined' && document.hidden) return
  const got = ensureCtx()
  if (!got) return

  switch (type) {
    case 'click':
      tone({ freq: NOTES.A, durationMs: 80, type: 'sine', peakGain: 0.4 })
      break

    case 'correct':
      // ascending C-E-G arpeggio
      tone({ freq: NOTES.C2, durationMs: 140, type: 'sine', startAt: 0,    peakGain: 0.5 })
      tone({ freq: NOTES.E2, durationMs: 140, type: 'sine', startAt: 0.12, peakGain: 0.5 })
      tone({ freq: NOTES.G2, durationMs: 180, type: 'sine', startAt: 0.24, peakGain: 0.6 })
      break

    case 'wrong':
      // gentle descending G→E (square but quiet)
      tone({ freq: NOTES.G, durationMs: 180, type: 'square', startAt: 0,    peakGain: 0.25 })
      tone({ freq: NOTES.E, durationMs: 200, type: 'square', startAt: 0.18, peakGain: 0.25 })
      break

    case 'star':
      // C-G-C' bright sparkle
      tone({ freq: NOTES.C2, durationMs: 110, type: 'triangle', startAt: 0,    peakGain: 0.5 })
      tone({ freq: NOTES.G2, durationMs: 110, type: 'triangle', startAt: 0.10, peakGain: 0.55 })
      tone({ freq: NOTES.C3, durationMs: 140, type: 'triangle', startAt: 0.20, peakGain: 0.6 })
      break

    case 'levelup':
      // 4-note fanfare C-E-G-C'
      tone({ freq: NOTES.C2, durationMs: 120, type: 'square', startAt: 0,    peakGain: 0.4 })
      tone({ freq: NOTES.E2, durationMs: 120, type: 'square', startAt: 0.12, peakGain: 0.4 })
      tone({ freq: NOTES.G2, durationMs: 120, type: 'square', startAt: 0.24, peakGain: 0.4 })
      tone({ freq: NOTES.C3, durationMs: 240, type: 'square', startAt: 0.36, peakGain: 0.5 })
      break

    case 'zonecomplete':
      // bigger 6-note triumphant
      tone({ freq: NOTES.C2, durationMs: 120, type: 'triangle', startAt: 0,    peakGain: 0.45 })
      tone({ freq: NOTES.E2, durationMs: 120, type: 'triangle', startAt: 0.12, peakGain: 0.45 })
      tone({ freq: NOTES.G2, durationMs: 120, type: 'triangle', startAt: 0.24, peakGain: 0.45 })
      tone({ freq: NOTES.C3, durationMs: 120, type: 'triangle', startAt: 0.36, peakGain: 0.5 })
      tone({ freq: NOTES.G2, durationMs: 120, type: 'triangle', startAt: 0.48, peakGain: 0.5 })
      tone({ freq: NOTES.C3, durationMs: 320, type: 'triangle', startAt: 0.60, peakGain: 0.6 })
      break

    case 'unlock':
      sweep({ from: 220, to: 880, durationMs: 400, type: 'sawtooth' })
      break
  }
}

// Quick helper if you want to unlock the AudioContext early (some browsers require user gesture).
export function primeAudio() {
  ensureCtx()
}

// ─── Speech synthesis (Spark's voice) ─────────────────────────────────────
// Voice mode is global; gated by lib/kids-voice.ts (useKidsVoice).

let lastUtterance: string | null = null

export function sparkSays(text: string, onDone?: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onDone?.()
    return
  }
  // Cancel anything currently speaking so we never queue up runaway speech.
  window.speechSynthesis.cancel()
  lastUtterance = text

  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.88     // slightly slower — kids need time to process
  utt.pitch = 1.25    // slightly higher — friendlier, robot-like
  utt.lang = 'en-IN'  // Indian English accent where available
  utt.volume = 1

  // Some browsers benefit from picking an Indian/English voice explicitly.
  const voices = window.speechSynthesis.getVoices()
  const preferred =
    voices.find(v => /en[-_]?IN/i.test(v.lang)) ||
    voices.find(v => /Google.*UK English Female/i.test(v.name)) ||
    voices.find(v => /female/i.test(v.name) && /en/i.test(v.lang))
  if (preferred) utt.voice = preferred

  utt.onend = () => onDone?.()
  utt.onerror = () => onDone?.()
  window.speechSynthesis.speak(utt)
}

export function repeatLastSparkLine(onDone?: () => void): void {
  if (lastUtterance) sparkSays(lastUtterance, onDone)
}

export function cancelSparkSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

// ─── Speech recognition (child speaks back) ────────────────────────────────

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: unknown) => void) | null
  onend: (() => void) | null
  start: () => void
  abort: () => void
  stop: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

export function sparkListen(
  onResult: (transcript: string) => void,
  onError?: () => void,
): () => void {
  if (typeof window === 'undefined') {
    onError?.()
    return () => {}
  }
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition
  if (!SR) {
    onError?.()
    return () => {}
  }
  let stopped = false
  let rec: SpeechRecognitionLike | null = null
  try {
    rec = new SR()
    rec.lang = 'en-IN'
    rec.interimResults = false
    rec.maxAlternatives = 3
    rec.onresult = (e) => {
      if (stopped) return
      const transcript = e.results[0]?.[0]?.transcript ?? ''
      onResult(transcript.toLowerCase().trim())
    }
    rec.onerror = () => {
      if (!stopped) onError?.()
    }
    rec.onend = () => {
      // recognition naturally ends; consumers handle restart if needed
    }
    rec.start()
  } catch {
    onError?.()
  }
  return () => {
    stopped = true
    try { rec?.abort() } catch { /* noop */ }
  }
}

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function speechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition)
}

// ─── Spark's praise lines (randomised for variety) ────────────────────────

export const SPARK_PRAISE: readonly string[] = [
  "Woah, you're amazing!",
  "YES! That's it!",
  "Brilliant work, champ!",
  "Shabaash! You got it!",
  "Whoa — you're a robot whisperer!",
  "Wah! Bilkul sahi!",
  "Boom! Nailed it!",
  "Look at YOU go!",
  "That's the spirit!",
  "Ekdum first class!",
] as const

export const SPARK_OOPS: readonly string[] = [
  "Oops! Almost there — let's try again.",
  "Hmm, not quite. Don't worry, we'll figure it out!",
  "Close! One more try?",
  "Tricky one! Have another go.",
  "Arre — almost! Let's try once more.",
] as const

export function randomPraise(): string {
  return SPARK_PRAISE[Math.floor(Math.random() * SPARK_PRAISE.length)]
}

export function randomOops(): string {
  return SPARK_OOPS[Math.floor(Math.random() * SPARK_OOPS.length)]
}
