// components/kids/activities/templates/signal-graph/trace.ts
// Deterministic sensor traces: a clean signal (piecewise-linear keyframes)
// plus seeded Gaussian noise and occasional spikes — what a real sensor
// actually reports. Shared by signal-graph and threshold-tuner.
// Pure: no React, no DOM. The same seed always gives the same trace, so an
// activity's answer can be checked fairly and verified in Node.

/** A point of the clean signal. Two keyframes at the same t make a step. */
export interface Keyframe {
  t: number
  v: number
}

export interface SensorSpec {
  /** e.g. "Floor light sensor", "Ultrasonic distance". */
  name: string
  /** Unit shown on the axis, e.g. "%", "cm", "°C", "lux". */
  unit: string
  /** Axis range; readings are clamped to it like a real sensor's limits. */
  min: number
  max: number
}

export interface TraceSpec {
  durationS: number
  /** Samples per second (2–50). A real Arduino loop reads at 10–100 Hz. */
  sampleHz: number
  /** Standard deviation of the noise in sensor units. 0 = perfectly clean. */
  noise: number
  /** How many one-sample glitches to sprinkle in (electrical spikes, a stray echo). */
  spikes?: number
  /** Any integer. Same seed ⇒ same noise. */
  seed: number
}

export interface Sample {
  t: number
  v: number
  /** The clean value (no noise) — what is really happening. */
  clean: number
}

/** mulberry32: tiny, fast, good-enough seeded PRNG. Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Standard normal from a uniform PRNG (Box–Muller). */
export function gaussian(rng: () => number): number {
  const u = Math.max(1e-12, rng())
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** Clean signal value at time t (linear between keyframes; held before/after). */
export function cleanAt(keys: Keyframe[], t: number): number {
  if (keys.length === 0) return 0
  if (t <= keys[0].t) return keys[0].v
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]
    const b = keys[i]
    if (t < b.t) {
      const span = b.t - a.t
      return span <= 0 ? b.v : a.v + ((b.v - a.v) * (t - a.t)) / span
    }
  }
  return keys[keys.length - 1].v
}

export function sampleCount(spec: TraceSpec): number {
  return Math.floor(spec.durationS * spec.sampleHz) + 1
}

/** Build the trace: one sample every 1/sampleHz seconds from 0 to durationS. */
export function makeTrace(keys: Keyframe[], spec: TraceSpec, sensor: SensorSpec): Sample[] {
  const rng = mulberry32(spec.seed)
  const n = sampleCount(spec)
  const out: Sample[] = []
  const span = sensor.max - sensor.min
  for (let i = 0; i < n; i++) {
    const t = Math.round((i / spec.sampleHz) * 1e6) / 1e6
    const clean = cleanAt(keys, t)
    const v = clean + spec.noise * gaussian(rng)
    out.push({ t, clean, v: Math.max(sensor.min, Math.min(sensor.max, v)) })
  }
  // Spikes: deterministic positions, ±(25–45 % of the range), never on the first/last sample.
  const k = Math.max(0, Math.floor(spec.spikes ?? 0))
  for (let j = 0; j < k && n > 2; j++) {
    const i = 1 + Math.floor(rng() * (n - 2))
    const dir = rng() < 0.5 ? -1 : 1
    const mag = (0.25 + rng() * 0.2) * span
    out[i] = { ...out[i], v: Math.max(sensor.min, Math.min(sensor.max, out[i].clean + dir * mag)) }
  }
  return out
}

/** Problems with a sensor/trace spec (shared validation). */
export function traceProblems(spec: TraceSpec, sensor: SensorSpec): string[] {
  const out: string[] = []
  if (!sensor?.name?.trim()) out.push('sensor.name is required')
  if (!sensor?.unit?.trim()) out.push('sensor.unit is required')
  if (!(sensor.max > sensor.min)) out.push('sensor.max must be greater than sensor.min')
  if (!(spec.durationS >= 1 && spec.durationS <= 120)) out.push('durationS: 1–120')
  if (!(spec.sampleHz >= 2 && spec.sampleHz <= 50)) out.push('sampleHz: 2–50')
  if (spec.durationS * spec.sampleHz > 1500) out.push('too many samples (durationS × sampleHz must be ≤ 1500)')
  if (!(spec.noise >= 0)) out.push('noise must be ≥ 0')
  else if (sensor.max > sensor.min && spec.noise > (sensor.max - sensor.min) / 4) out.push('noise is more than a quarter of the axis — nothing would be readable')
  if (spec.spikes !== undefined && !(spec.spikes >= 0 && spec.spikes <= 20)) out.push('spikes: 0–20')
  if (!Number.isInteger(spec.seed)) out.push('seed must be an integer')
  return out
}

/** Round for display/feedback. */
export function r1(n: number): number {
  return Math.round(n * 10) / 10
}
