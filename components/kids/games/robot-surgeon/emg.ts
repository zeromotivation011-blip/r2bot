// components/kids/games/robot-surgeon/emg.ts
// ACE — Bionic Hand. A myoelectric prosthetic hand reads the muscle signal
// (surface EMG) from a sensor on the skin of the forearm and turns it into
// grip commands.
//
// The model (how surface EMG really looks):
//   raw(t) = activation(t) × A × noise + baseline noise + motion artifacts
//   — a zero-mean, random signal whose SIZE grows with how hard the muscle
//   squeezes. You cannot threshold the raw signal directly; you rectify it
//   (take |raw|) and average over a window to get the ENVELOPE.
//   envelope ≈ activation (we scale it to "% of the strongest squeeze").
// The controller: two thresholds (pinch, power grip) with hysteresis around
// each, as in many real prosthetic controllers (which also add timing rules
// and pattern recognition across several electrodes).
// The day test is scripted and seeded: same settings, same score.

import { gauss, rng } from './shared'

export const FS = 500 // samples per second
export const LAG_ALLOW = 0.35 // seconds after each change of intent that are not scored
export const ARTIFACT_S = 0.06

export type Grip = 'open' | 'pinch' | 'power'

export interface EmgSettings {
  /** Envelope (% of max) above which the hand pinches. */
  pinchAt: number
  /** Envelope (% of max) above which it closes in a power grip. */
  powerAt: number
  /** Hysteresis band (± half of this around each threshold), %. */
  hyst: number
  /** Smoothing window, ms. */
  windowMs: number
}

export const DEFAULT_SETTINGS: EmgSettings = { pinchAt: 45, powerAt: 85, hyst: 0, windowMs: 40 }

export interface Segment {
  from: number
  to: number
  intent: Grip
  /** What the person is doing — shown to the child. */
  task: string
  icon: string
  level: number
}

/** A morning with the bionic hand: grapes, a water bottle, a door handle, a pen, and an accidental knock. */
export function dayScript(seed = 5): { segs: Segment[]; artifacts: number[] } {
  const r = rng(seed)
  const plan: { d: number; intent: Grip; task: string; icon: string }[] = [
    { d: 2.0, intent: 'open', task: 'Relaxed', icon: '🖐️' },
    { d: 2.6, intent: 'pinch', task: 'Pick up a grape', icon: '🍇' },
    { d: 1.8, intent: 'open', task: 'Let go', icon: '🖐️' },
    { d: 3.0, intent: 'power', task: 'Hold a water bottle', icon: '🧴' },
    { d: 2.4, intent: 'open', task: 'Relaxed (arm bumps the table)', icon: '🖐️' },
    { d: 2.6, intent: 'pinch', task: 'Hold a pen', icon: '🖊️' },
    { d: 2.0, intent: 'open', task: 'Let go', icon: '🖐️' },
    { d: 3.2, intent: 'power', task: 'Turn a door handle', icon: '🚪' },
    { d: 1.6, intent: 'pinch', task: 'Pinch a key', icon: '🔑' },
    { d: 2.8, intent: 'open', task: 'Relaxed', icon: '🖐️' },
  ]
  const base: Record<Grip, number> = { open: 0.06, pinch: 0.36, power: 0.72 }
  const segs: Segment[] = []
  let t = 0
  for (const p of plan) {
    const jitter = (r() - 0.5) * 0.1
    segs.push({ from: t, to: t + p.d, intent: p.intent, task: p.task, icon: p.icon, level: Math.max(0.03, base[p.intent] + (p.intent === 'open' ? jitter * 0.2 : jitter)) })
    t += p.d
  }
  // Motion artifacts (bumps, cable tugs) — mostly while relaxed.
  const artifacts = [9.2, 9.9, 15.4, 21.8, 22.6].map((a) => a + (r() - 0.5) * 0.2)
  return { segs, artifacts }
}

export const SCRIPT = dayScript()
export const SCRIPT_END = SCRIPT.segs[SCRIPT.segs.length - 1].to

export function intentAt(t: number): Segment {
  return SCRIPT.segs.find((s) => t >= s.from && t < s.to) ?? SCRIPT.segs[SCRIPT.segs.length - 1]
}

/** Activation with a short ramp (muscles take ~0.15 s to tighten) and a little wander. */
export function scriptActivation(t: number): number {
  const seg = intentAt(t)
  const i = SCRIPT.segs.indexOf(seg)
  const prev = i > 0 ? SCRIPT.segs[i - 1].level : seg.level
  const k = Math.min(1, (t - seg.from) / 0.15)
  const wander = 1 + 0.08 * Math.sin(t * 2.3) + 0.05 * Math.sin(t * 5.1 + 1)
  return (prev + (seg.level - prev) * k) * wander
}

export interface EmgState {
  t: number
  rand: () => number
  /** Ring buffer of |raw| for the moving average. */
  buf: Float32Array
  bi: number
  sum: number
  /** Last samples for the plot (raw and envelope). */
  rawHist: number[]
  envHist: number[]
  gripHist: Grip[]
  grip: Grip
  env: number
  /** Scoring (test mode only). */
  scored: number
  correct: number
  drops: number
  falseGrabs: number
  wrongGrip: number
  switches: number
  settings: EmgSettings
  artifactIdx: number
  artifactLeft: number
  /** Response time: for each change of intent, seconds until the hand obeys. */
  respSeg: number
  respTimes: number[]
}

export const PLOT_N = FS * 4 // 4 s on screen

export function makeEmg(settings: EmgSettings, seed = 3): EmgState {
  const n = Math.max(1, Math.round((settings.windowMs / 1000) * FS))
  return {
    t: 0,
    rand: rng(seed),
    buf: new Float32Array(n),
    bi: 0,
    sum: 0,
    rawHist: [],
    envHist: [],
    gripHist: [],
    grip: 'open',
    env: 0,
    scored: 0,
    correct: 0,
    drops: 0,
    falseGrabs: 0,
    wrongGrip: 0,
    switches: 0,
    settings,
    artifactIdx: 0,
    artifactLeft: 0,
    respSeg: 0,
    respTimes: [],
  }
}

/** E|N(0,1)| = √(2/π): divide by it so the envelope reads as activation. */
const MEAN_ABS = Math.sqrt(2 / Math.PI)

/** Decide the grip from the envelope with two thresholds and hysteresis. */
export function decide(g: Grip, env: number, st: EmgSettings): Grip {
  const h = st.hyst / 2
  const p = st.pinchAt
  const w = Math.max(st.powerAt, p + 1)
  if (g === 'open') {
    if (env > w + h) return 'power'
    if (env > p + h) return 'pinch'
    return 'open'
  }
  if (g === 'pinch') {
    if (env > w + h) return 'power'
    if (env < p - h) return 'open'
    return 'pinch'
  }
  if (env < p - h) return 'open'
  if (env < w - h) return 'pinch'
  return 'power'
}

/**
 * Advance by `samples` EMG samples. `activation` gives the muscle activation
 * (0..1) at time t. In test mode the hand is scored against the script.
 */
export function stepEmg(s: EmgState, samples: number, activation: (t: number) => number, test: boolean) {
  const dt = 1 / FS
  for (let k = 0; k < samples; k++) {
    s.t += dt
    const a = Math.max(0, activation(s.t))
    let raw = gauss(s.rand) * (a + 0.02) + gauss(s.rand) * 0.01
    // motion artifact: a big, short, one-sided swing (bumping the socket)
    if (test && s.artifactIdx < SCRIPT.artifacts.length && s.t >= SCRIPT.artifacts[s.artifactIdx]) {
      s.artifactLeft = ARTIFACT_S
      s.artifactIdx++
    }
    if (s.artifactLeft > 0) {
      s.artifactLeft -= dt
      raw += 0.75 * Math.sin((s.artifactLeft / ARTIFACT_S) * Math.PI) + gauss(s.rand) * 0.3
    }
    const v = Math.abs(raw)
    s.sum += v - s.buf[s.bi]
    s.buf[s.bi] = v
    s.bi = (s.bi + 1) % s.buf.length
    s.env = Math.max(0, (s.sum / s.buf.length / MEAN_ABS) * 100)
    const before = s.grip
    s.grip = decide(s.grip, s.env, s.settings)
    if (s.grip !== before) s.switches++
    if (test) {
      const seg = intentAt(s.t)
      const si = SCRIPT.segs.indexOf(seg)
      if (si > 0 && si === s.respSeg + 1 && s.grip === seg.intent) {
        s.respTimes.push(s.t - seg.from)
        s.respSeg = si
      } else if (si > s.respSeg + 1) {
        s.respTimes.push(SCRIPT.segs[s.respSeg + 1].to - SCRIPT.segs[s.respSeg + 1].from)
        s.respSeg++
      }
      if (s.grip !== before) {
        // Dropping something you meant to hold; grabbing when you meant to relax.
        if (s.grip === 'open' && seg.intent !== 'open' && s.t - seg.from > LAG_ALLOW) s.drops++
        if (before === 'open' && seg.intent === 'open' && s.t - seg.from > LAG_ALLOW) s.falseGrabs++
      }
      if (s.t - seg.from > LAG_ALLOW && s.t < SCRIPT_END) {
        s.scored++
        if (s.grip === seg.intent) s.correct++
        else if (s.grip !== 'open' && seg.intent !== 'open') s.wrongGrip++
      }
    }
    if (k % 4 === 0) {
      s.rawHist.push(raw)
      s.envHist.push(s.env)
      s.gripHist.push(s.grip)
      if (s.rawHist.length > PLOT_N / 4) {
        s.rawHist.shift()
        s.envHist.shift()
        s.gripHist.shift()
      }
    }
  }
}

export function emgAccuracy(s: EmgState): number {
  return s.scored ? s.correct / s.scored : 0
}

/** Mean time from a change of intent until the hand does it, s. */
export function emgResponse(s: EmgState): number {
  return s.respTimes.length ? s.respTimes.reduce((a, b) => a + b, 0) / s.respTimes.length : 0
}

/** A hand that answers in more than about a third of a second feels sluggish to its owner. */
export const SLUGGISH_S = 0.3

export function emgStars(s: EmgState): number {
  const acc = emgAccuracy(s)
  if (acc >= 0.93 && s.drops === 0 && s.falseGrabs === 0 && emgResponse(s) <= SLUGGISH_S) return 3
  if (acc >= 0.85 && s.drops + s.falseGrabs <= 2) return 2
  if (acc >= 0.72) return 1
  return 0
}

/** Run the whole day test headlessly (used to check the game is winnable). */
export function runDay(st: EmgSettings): EmgState {
  const s = makeEmg(st)
  stepEmg(s, Math.round(SCRIPT_END * FS), scriptActivation, true)
  return s
}
