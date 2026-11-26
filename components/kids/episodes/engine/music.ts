// components/kids/episodes/engine/music.ts
// A gentle generated music bed (WebAudio, no files): soft pad chords, a
// plucked arpeggio and a round bass, with a mood per scene. The same
// deterministic scheduler runs live (ducked under the voices) and offline
// (OfflineAudioContext) so record-episode.mjs can put the exact music in the MP4.

export type Mood = 'bright' | 'cosy' | 'night' | 'mystery' | 'festive'

const BPM: Record<Mood, number> = { bright: 92, cosy: 80, night: 68, mystery: 64, festive: 104 }
// Chords as semitones from A3 (220 Hz).
const PROGRESSIONS: Record<Mood, number[][]> = {
  bright: [[3, 7, 10], [10, 14, 17], [0, 3, 7], [8, 12, 15]], // C G Am F
  cosy: [[8, 12, 15], [3, 7, 10], [5, 8, 12], [10, 14, 17]], // F C Dm G
  night: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]], // Am F C G
  mystery: [[0, 3, 7], [-2, 2, 5], [5, 8, 12], [-4, 0, 3]], // Am G Dm F
  festive: [[3, 7, 10], [8, 12, 15], [10, 14, 17], [3, 7, 10]], // C F G C
}
const PATTERNS: Record<Mood, number[]> = {
  bright: [0, 1, 2, 1, 2, 1, 0, 2],
  cosy: [0, -1, 1, -1, 2, -1, 1, -1],
  night: [0, -1, -1, 1, -1, -1, 2, -1],
  mystery: [2, -1, -1, -1, 1, -1, -1, -1],
  festive: [0, 1, 2, 3, 2, 1, 2, 3],
}

const hz = (semi: number) => 220 * Math.pow(2, semi / 12)

/** Schedule music-time [from, to) of one mood onto ctx starting at ctx time `at`. */
export function scheduleMusic(ctx: BaseAudioContext, dest: AudioNode, at: number, from: number, to: number, mood: Mood): void {
  const beat = 60 / BPM[mood]
  const bar = beat * 4
  const prog = PROGRESSIONS[mood]
  const pat = PATTERNS[mood]
  const firstBar = Math.floor(from / bar)
  const lastBar = Math.ceil(to / bar)
  for (let b = firstBar; b < lastBar; b++) {
    const chord = prog[((b % prog.length) + prog.length) % prog.length]
    const barStart = b * bar
    // Pad: one chord per bar.
    if (barStart >= from && barStart < to) {
      const t0 = at + (barStart - from)
      for (const n of chord) pad(ctx, dest, t0, bar + 0.6, hz(n - 12), mood === 'night' || mood === 'mystery' ? 0.026 : 0.022)
      tone(ctx, dest, t0, beat * 2, hz(chord[0] - 24), 'sine', 0.06, 0.02, beat * 1.8)
    }
    // Arpeggio on eighths.
    for (let i = 0; i < 8; i++) {
      const tt = barStart + (i * beat) / 2
      if (tt < from || tt >= to) continue
      const k = pat[i]
      if (k < 0) continue
      const note = k < 3 ? chord[k] : chord[0] + 12
      const gain = mood === 'festive' ? 0.03 : 0.022
      tone(ctx, dest, at + (tt - from), beat * 0.9, hz(note + 12), mood === 'mystery' ? 'triangle' : 'sine', gain, 0.005, beat * 0.8)
      if (mood === 'festive' && i % 4 === 0) tone(ctx, dest, at + (tt - from), beat * 1.5, hz(note + 24), 'sine', 0.01, 0.002, beat * 1.4)
    }
  }
}

function tone(ctx: BaseAudioContext, dest: AudioNode, t: number, dur: number, freq: number, type: OscillatorType, gain: number, attack: number, decay: number): void {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.value = freq
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  o.connect(g).connect(dest)
  o.start(t)
  o.stop(t + dur + 0.1)
}

function pad(ctx: BaseAudioContext, dest: AudioNode, t: number, dur: number, freq: number, gain: number): void {
  const f = ctx.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = 900
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.8)
  g.gain.setValueAtTime(gain, t + dur - 0.9)
  g.gain.linearRampToValueAtTime(0, t + dur)
  f.connect(g).connect(dest)
  for (const det of [-6, 6]) {
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.value = freq
    o.detune.value = det
    o.connect(f)
    o.start(t)
    o.stop(t + dur + 0.05)
  }
}

/** Live music bed with ducking. */
export class MusicBed {
  private ctx: AudioContext
  private master: GainNode
  private duckGain: GainNode
  private timer: number | null = null
  private mood: Mood = 'bright'
  private musicTime = 0
  private scheduledUntil = 0 // ctx time
  private volume = 1

  constructor(ctx: AudioContext) {
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0.9
    this.duckGain = ctx.createGain()
    this.duckGain.connect(this.master).connect(ctx.destination)
  }

  setMood(m: Mood): void {
    if (m === this.mood) return
    this.mood = m
  }

  start(): void {
    if (this.timer !== null) return
    this.scheduledUntil = this.ctx.currentTime + 0.05
    const tick = () => {
      const horizon = this.ctx.currentTime + 1.2
      if (this.scheduledUntil < horizon) {
        const span = horizon - this.scheduledUntil
        scheduleMusic(this.ctx, this.duckGain, this.scheduledUntil, this.musicTime, this.musicTime + span, this.mood)
        this.musicTime += span
        this.scheduledUntil = horizon
      }
    }
    tick()
    this.timer = window.setInterval(tick, 250)
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
    // Fade what is already scheduled.
    const now = this.ctx.currentTime
    this.duckGain.gain.cancelScheduledValues(now)
    this.duckGain.gain.setTargetAtTime(0, now, 0.15)
    const next = this.ctx.createGain()
    next.connect(this.master)
    const old = this.duckGain
    window.setTimeout(() => old.disconnect(), 1500)
    this.duckGain = next
  }

  /** 1 = full, lower while someone speaks. */
  duck(level: number): void {
    this.duckGain.gain.setTargetAtTime(level * this.volume, this.ctx.currentTime, 0.12)
  }

  setVolume(v: number): void {
    this.volume = v
    this.duck(1)
  }

  dispose(): void {
    this.stop()
    this.master.disconnect()
  }
}

/** Render the music for a whole episode offline (for the MP4). Returns a 16-bit mono WAV as base64. */
export async function renderMusicWav(segments: { at: number; mood: Mood }[], duration: number, sampleRate = 44100): Promise<string> {
  const ctx = new OfflineAudioContext(1, Math.ceil(duration * sampleRate), sampleRate)
  const out = ctx.createGain()
  out.gain.value = 0.55 * 0.9 // the live bed sits ducked most of the time
  out.connect(ctx.destination)
  let musicTime = 0
  segments.forEach((s, i) => {
    const end = i + 1 < segments.length ? segments[i + 1].at : duration
    if (end <= s.at) return
    scheduleMusic(ctx, out, s.at, musicTime, musicTime + (end - s.at), s.mood)
    musicTime += end - s.at
  })
  const buf = await ctx.startRendering()
  const data = buf.getChannelData(0)
  const bytes = new Uint8Array(44 + data.length * 2)
  const view = new DataView(bytes.buffer)
  const w = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)))
  w(0, 'RIFF')
  view.setUint32(4, 36 + data.length * 2, true)
  w(8, 'WAVE')
  w(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  w(36, 'data')
  view.setUint32(40, data.length * 2, true)
  for (let i = 0; i < data.length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i])) * 32767, true)
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(bin)
}
