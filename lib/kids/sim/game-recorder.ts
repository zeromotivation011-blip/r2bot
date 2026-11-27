// lib/kids/sim/game-recorder.ts
// The Flight Recorder for the Universe games' own simulations (roadmap #38).
//
// The robot simulator records full 3D frames (recorder.ts). A game's sim (Robo
// Sumo's two robots, Sky Port's drone, the Mars rover, …) has its own state,
// so games record NUMBERS instead: a few named channels per tick, plus moments
// worth a marker ("pushed out", "gust", "battery low"). The shared game shell
// (components/kids/ui/GameShellClient.tsx) opens one recording per round and,
// on the results card, shows the graphs with a scrubber.
//
// A game records with ONE line in its sim loop, after it steps the sim:
//
//   recordGameFrame(sim.t, { 'Height (m)': s.z, 'Target (m)': s.zt })
//   markGameMoment(sim.t, 'Gust!')
//
// Nothing happens when no shell is listening (a verify script, a teacher demo),
// and recording never feeds back into the game: it only copies numbers.
// Pure TypeScript: no DOM, no React.

/** Frames kept per second of game time. */
export const GAME_RECORD_HZ = 20
/** Most channels one game may record (more would not fit on a phone). */
export const GAME_MAX_CHANNELS = 6
/** Ring buffer: five minutes of game time. Older frames are dropped first. */
export const GAME_RECORD_CAPACITY = GAME_RECORD_HZ * 300
/** Most moments kept per round. */
export const GAME_MAX_MOMENTS = 60

export interface GameFrame {
  t: number
  /** One value per channel, in the order of `channels` (NaN = not recorded on this frame). */
  v: number[]
}

export interface GameMoment {
  t: number
  text: string
}

export interface GameRecording {
  channels: string[]
  frames: GameFrame[]
  moments: GameMoment[]
  /** Frames that fell off the front of the ring buffer. */
  dropped: number
}

/** One round's recording. */
export class GameRecorder {
  readonly capacity: number
  private buf: (GameFrame | undefined)[]
  private start = 0
  private count = 0
  private lastT = -Infinity
  readonly channels: string[] = []
  moments: GameMoment[] = []
  dropped = 0

  constructor(capacity = GAME_RECORD_CAPACITY) {
    this.capacity = Math.max(2, Math.floor(capacity))
    this.buf = new Array(this.capacity)
  }

  get length(): number {
    return this.count
  }

  /**
   * Record the game's numbers at game time `t` (seconds). Throttled to GAME_RECORD_HZ;
   * a frame with a time earlier than the last one (a restarted sim) is ignored.
   * Booleans are stored as 1/0 so a "sees the rival?" channel draws as a step.
   */
  frame(t: number, values: Record<string, number | boolean | null | undefined>): void {
    if (!Number.isFinite(t) || t < this.lastT + 1 / GAME_RECORD_HZ - 1e-9) return
    this.lastT = t
    for (const k of Object.keys(values)) {
      if (!this.channels.includes(k) && this.channels.length < GAME_MAX_CHANNELS) this.channels.push(k)
    }
    const v = this.channels.map((k) => {
      const x = values[k]
      if (typeof x === 'boolean') return x ? 1 : 0
      return typeof x === 'number' && Number.isFinite(x) ? x : Number.NaN
    })
    const i = (this.start + this.count) % this.capacity
    this.buf[i] = { t, v }
    if (this.count < this.capacity) this.count++
    else {
      this.start = (this.start + 1) % this.capacity
      this.dropped++
    }
  }

  /** A moment worth a marker on the timeline. Same text within 0.5 s is kept once. */
  mark(t: number, text: string): void {
    if (!Number.isFinite(t) || !text) return
    const last = this.moments[this.moments.length - 1]
    if (last && last.text === text && t - last.t < 0.5) return
    if (this.moments.length >= GAME_MAX_MOMENTS) return
    this.moments.push({ t, text: text.slice(0, 60) })
  }

  frames(): GameFrame[] {
    const out: GameFrame[] = []
    for (let i = 0; i < this.count; i++) {
      const f = this.buf[(this.start + i) % this.capacity]
      if (f) out.push(f)
    }
    return out
  }

  /** A copy that is safe to keep after the round (the results card holds it). */
  snapshot(): GameRecording {
    const n = this.channels.length
    // Frames recorded before a later channel appeared are padded with NaN.
    const frames = this.frames().map((f) => ({ t: f.t, v: f.v.length === n ? f.v.slice() : [...f.v, ...new Array<number>(n - f.v.length).fill(Number.NaN)] }))
    return { channels: this.channels.slice(), frames, moments: this.moments.slice(), dropped: this.dropped }
  }
}

// ── The one active recorder (the shell owns it; games only write) ───────────

let active: GameRecorder | null = null

/** The game shell opens a recorder for each round (and passes null when the round ends). */
export function setActiveGameRecorder(r: GameRecorder | null): void {
  active = r
}

export function activeGameRecorder(): GameRecorder | null {
  return active
}

/** Games call this from their sim loop. Does nothing when no shell is recording. */
export function recordGameFrame(t: number, values: Record<string, number | boolean | null | undefined>): void {
  active?.frame(t, values)
}

/** Games call this when something worth a timeline marker happens. */
export function markGameMoment(t: number, text: string): void {
  active?.mark(t, text)
}

// ── Reading a recording back ────────────────────────────────────────────────

/** Is there enough to show? (two frames and at least one channel with a number). */
export function hasRecording(r: GameRecording | null): r is GameRecording {
  return Boolean(r && r.frames.length >= 2 && r.channels.length > 0 && r.frames.some((f) => f.v.some((x) => Number.isFinite(x))))
}

export interface ChannelSeries {
  name: string
  min: number
  max: number
  /** [t, value] pairs, NaN values skipped, thinned to at most maxPoints. */
  points: [number, number][]
  /** Every value is 0 or 1: draw as on/off. */
  onOff: boolean
}

/** Per-channel series for the graphs, each with its own scale (a channel of zeros gets 0..1). */
export function channelSeries(r: GameRecording, maxPoints = 240): ChannelSeries[] {
  const step = Math.max(1, Math.ceil(r.frames.length / Math.max(2, maxPoints)))
  return r.channels.map((name, ci) => {
    const pts: [number, number][] = []
    let min = Infinity
    let max = -Infinity
    let onOff = true
    for (let i = 0; i < r.frames.length; i++) {
      const v = r.frames[i].v[ci]
      if (!Number.isFinite(v)) continue
      if (v < min) min = v
      if (v > max) max = v
      if (v !== 0 && v !== 1) onOff = false
      if (i % step === 0 || i === r.frames.length - 1) pts.push([r.frames[i].t, v])
    }
    if (!Number.isFinite(min)) {
      min = 0
      max = 1
    }
    if (onOff) {
      min = 0
      max = 1
    } else if (max - min < 1e-9) {
      min -= 1
      max += 1
    }
    return { name, min, max, points: pts, onOff }
  })
}

/** The frame nearest time t (binary search; frames are in time order). */
export function gameFrameAt(frames: readonly GameFrame[], t: number): GameFrame | null {
  if (frames.length === 0) return null
  let lo = 0
  let hi = frames.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (frames[mid].t < t) lo = mid + 1
    else hi = mid
  }
  if (lo > 0 && Math.abs(frames[lo - 1].t - t) <= Math.abs(frames[lo].t - t)) return frames[lo - 1]
  return frames[lo]
}

/** "1.23", "45", "-0.5": short, for the readout under the scrubber. */
export function fmtValue(v: number): string {
  if (!Number.isFinite(v)) return '—'
  const a = Math.abs(v)
  if (a >= 100) return String(Math.round(v))
  if (a >= 10) return v.toFixed(1)
  return v.toFixed(2)
}
