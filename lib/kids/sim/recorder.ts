// lib/kids/sim/recorder.ts
// The Flight Recorder (roadmap #38): every simulator run is recorded into a ring
// buffer, so a child can scrub back through it, see graphs of what the robot
// sensed and did, race a ghost of their best run, and get a marker on the
// timeline at the moment things went wrong.
//
// Pure TypeScript (no DOM, no Rapier import): the workbench calls record() after
// each fixed tick and the UI reads frames back. The recorder only READS the sim
// (snapshot, telemetry, battery and — when the robot has the part — sensors,
// which are a pure read), so recording never changes a run. verify checks that.

import type { DriveTelemetry, SensorReadings, SimEvent, SimSnapshot } from './engine'
import type { FailReason, RunResult } from './run'

/** Frames kept per second of robot time (every 2nd fixed tick at 60 Hz). */
export const RECORD_HZ = 30
/** Ring buffer size: three minutes of robot time. Older frames are dropped first. */
export const RECORD_CAPACITY = RECORD_HZ * 180

export interface FlightFrame {
  t: number
  /** Everything the renderer needs to redraw this moment. */
  snap: SimSnapshot
  /** Pen trail length (numbers) at this moment, so a replay draws the line up to here. */
  trailLen: number
  drive: DriveTelemetry
  /** null when the robot has no part for it. */
  distanceCm: number | null
  lineOffset: number | null
  lineSeen: boolean | null
  bumped: boolean | null
  floorColor: string
  headingDeg: number
  battery: { soc: number; volts: number; amps: number; motorAmps: number; flat: boolean; charging: boolean }
  /** The block running at this moment (Blockly id), for "what was it doing?". */
  active: string | null
}

export interface RecorderSource {
  time: number
  snapshot(): SimSnapshot
  telemetry(): DriveTelemetry
  sensors(): SensorReadings
  battery(): { soc: number; volts: number; amps: number; motorAmps: number; flat: boolean; charging: boolean }
  readonly trail: number[]
  readonly events: SimEvent[]
}

export interface SensorParts {
  distance: boolean
  line: boolean
  bump: boolean
}

/** A fixed-size ring buffer of frames. */
export class FlightRecorder {
  readonly capacity: number
  private buf: (FlightFrame | undefined)[]
  private start = 0
  private count = 0
  private tick = 0
  /** Frames dropped off the front (a very long run). */
  dropped = 0
  events: SimEvent[] = []

  constructor(capacity = RECORD_CAPACITY) {
    this.capacity = Math.max(2, Math.floor(capacity))
    this.buf = new Array(this.capacity)
  }

  get length(): number {
    return this.count
  }

  clear(): void {
    this.buf = new Array(this.capacity)
    this.start = 0
    this.count = 0
    this.tick = 0
    this.dropped = 0
    this.events = []
  }

  push(f: FlightFrame): void {
    const i = (this.start + this.count) % this.capacity
    this.buf[i] = f
    if (this.count < this.capacity) this.count++
    else {
      this.start = (this.start + 1) % this.capacity
      this.dropped++
    }
  }

  /** Call after every fixed tick; keeps every `60 / RECORD_HZ`-th tick, plus any tick `force`d (the first and last). */
  record(sim: RecorderSource, parts: SensorParts, active: string | null, force = false): void {
    const keep = force || this.tick % Math.max(1, Math.round(60 / RECORD_HZ)) === 0
    this.tick++
    if (keep) {
      const last = this.at(this.count - 1)
      if (!(last && last.t === sim.time)) this.push(captureFrame(sim, parts, active))
    }
    this.events = sim.events
  }

  at(i: number): FlightFrame | undefined {
    if (i < 0 || i >= this.count) return undefined
    return this.buf[(this.start + i) % this.capacity]
  }

  frames(): FlightFrame[] {
    const out: FlightFrame[] = []
    for (let i = 0; i < this.count; i++) {
      const f = this.at(i)
      if (f) out.push(f)
    }
    return out
  }
}

export function captureFrame(sim: RecorderSource, parts: SensorParts, active: string | null): FlightFrame {
  const s = parts.distance || parts.line || parts.bump ? sim.sensors() : null
  const snap = sim.snapshot()
  // Only the sensor fields the recorder needs, read from the cached reading (no extra ray casts).
  return {
    t: sim.time,
    snap,
    trailLen: sim.trail.length,
    drive: sim.telemetry(),
    distanceCm: s && parts.distance ? s.distanceCm : null,
    lineOffset: s && parts.line ? s.lineOffset : null,
    lineSeen: s && parts.line ? s.lineSeen : null,
    bumped: s && parts.bump ? s.bumped : null,
    floorColor: s ? s.floorColor : 'white',
    headingDeg: s ? s.headingDeg : 0,
    battery: pickBattery(sim.battery()),
    active,
  }
}

function pickBattery(b: FlightFrame['battery']): FlightFrame['battery'] {
  return { soc: b.soc, volts: b.volts, amps: b.amps, motorAmps: b.motorAmps, flat: b.flat, charging: b.charging }
}

/** Index of the last frame at or before time t (binary search). */
export function frameIndexAt(frames: readonly FlightFrame[], t: number): number {
  let lo = 0
  let hi = frames.length - 1
  if (hi < 0) return -1
  if (t <= frames[0].t) return 0
  if (t >= frames[hi].t) return hi
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (frames[mid].t <= t) lo = mid
    else hi = mid - 1
  }
  return lo
}

/** The two frames around time t and how far between them (for smooth replay). */
export function framesAround(frames: readonly FlightFrame[], t: number): { a: FlightFrame; b: FlightFrame; alpha: number } | null {
  const i = frameIndexAt(frames, t)
  if (i < 0) return null
  const a = frames[i]
  const b = frames[Math.min(frames.length - 1, i + 1)]
  const span = b.t - a.t
  return { a, b, alpha: span > 0 ? Math.max(0, Math.min(1, (t - a.t) / span)) : 1 }
}

// ── "Why did it fail?" ───────────────────────────────────────────────────

export type MarkerKind = 'crash' | 'slip' | 'flat' | 'low' | 'lost-line' | 'stopped' | 'grab' | 'drop' | 'touch' | 'charge' | 'goal' | 'visit' | 'end'

export interface TimelineMarker {
  t: number
  kind: MarkerKind
  /** A few words for the timeline. */
  label: string
}

export interface WhyMarker extends TimelineMarker {
  /** One or two sentences: what the graphs show at that moment. */
  detail: string
  /** Which graph tells the story. */
  graph: GraphId
}

export type GraphId = 'speed' | 'motors' | 'sensors' | 'battery'

/** Every interesting moment of a run, for dots on the timeline. */
export function timelineMarkers(events: readonly SimEvent[]): TimelineMarker[] {
  const out: TimelineMarker[] = []
  for (const e of events) {
    if (e.kind === 'crash') out.push({ t: e.t, kind: 'crash', label: 'Bonk' })
    else if (e.kind === 'grab') out.push({ t: e.t, kind: 'grab', label: 'Grab' })
    else if (e.kind === 'drop') out.push({ t: e.t, kind: 'drop', label: 'Drop' })
    else if (e.kind === 'touch') out.push({ t: e.t, kind: 'touch', label: 'Touch' })
    else if (e.kind === 'battery' && e.text === 'flat') out.push({ t: e.t, kind: 'flat', label: 'Flat' })
    else if (e.kind === 'battery' && e.text === 'low') out.push({ t: e.t, kind: 'low', label: 'Low' })
    else if (e.kind === 'battery' && e.text === 'charging') out.push({ t: e.t, kind: 'charge', label: 'Charging' })
    else if (e.kind === 'say' && e.text?.startsWith('Flag reached')) out.push({ t: e.t, kind: 'visit', label: 'Flag' })
  }
  return out
}

/** First time a condition holds for at least `hold` seconds. */
function firstSustained(frames: readonly FlightFrame[], hold: number, test: (f: FlightFrame) => boolean): number | null {
  let since: number | null = null
  for (const f of frames) {
    if (test(f)) {
      if (since === null) since = f.t
      if (f.t - since >= hold) return since
    } else since = null
  }
  return null
}

/** How much faster the wheels turn than the ground passes under them, m/s (0 when gripping). */
export function slipSpeed(f: FlightFrame): number {
  let s = 0
  for (let i = 0; i < 2; i++) if (f.drive.slipping[i]) s = Math.max(s, Math.abs(f.drive.wheelSpeed[i] - f.drive.groundSpeed[i]))
  return s
}

/** What whyFailed needs from a result. A course challenge passes goalDistance NaN and its own message. */
export type WhyInput = Pick<RunResult, 'success' | 'reason' | 'goalDistance'> & { message?: string }

/**
 * The moment a failed run went wrong, with the graph that shows it. null for a success.
 * Works for the lab's FailReason and, through `reasonHint`, for course challenge failures too.
 */
export function whyFailed(frames: readonly FlightFrame[], events: readonly SimEvent[], result: WhyInput | null): WhyMarker | null {
  if (!result || result.success || frames.length === 0) return null
  const end = frames[frames.length - 1]
  const reason: FailReason | null = result.reason
  const firstEvent = (kind: SimEvent['kind'], text?: string) => events.find((e) => e.kind === kind && (text === undefined || e.text === text))
  switch (reason) {
    case 'missing-part':
      return { t: 0, kind: 'end', label: 'Missing part', graph: 'motors', detail: 'The program needs a part your robot does not have, so it never started.' }
    case 'crashed': {
      const e = firstEvent('crash')
      const t = e?.t ?? end.t
      const f = frames[frameIndexAt(frames, t)]
      const cm = f.distanceCm
      return {
        t,
        kind: 'crash',
        label: 'Crash',
        graph: cm !== null ? 'sensors' : 'speed',
        detail:
          cm !== null
            ? `Here the robot touched the wall at ${Math.round(Math.abs(f.snap.groundSpeed) * 100)} cm/s. Look at the distance line just before: it was already low — that was the moment to stop.`
            : `Here the robot touched the wall at ${Math.round(Math.abs(f.snap.groundSpeed) * 100)} cm/s. With no Distance Eyes it could not see it coming: stop sooner, or fit a sensor.`,
      }
    }
    case 'flat': {
      const e = firstEvent('battery', 'flat')
      const t = e?.t ?? end.t
      const f = frames[frameIndexAt(frames, t)]
      return {
        t,
        kind: 'flat',
        label: 'Battery flat',
        graph: 'battery',
        detail:
          f.battery.soc > 0.02
            ? `The voltage dropped to ${f.battery.volts.toFixed(2)} V while the motors pulled ${f.battery.amps.toFixed(2)} A — too low for the computer. That is voltage sag.`
            : `The charge reached 0 % here. See how the battery line falls faster when the motors work hard.`,
      }
    }
    case 'stuck': {
      const t = firstSustained(frames, 0.4, (f) => slipSpeed(f) > 0.05) ?? end.t
      return { t, kind: 'slip', label: 'Wheels slip', graph: 'speed', detail: 'From here the wheels spin faster than the robot moves (the shaded gap). The floor cannot give enough grip for this push.' }
    }
    case 'off-line': {
      const t = firstSustained(frames, 0.3, (f) => f.lineSeen === false) ?? end.t
      return { t, kind: 'lost-line', label: 'Lost the line', graph: 'sensors', detail: 'Here the line sensor stopped seeing the line. Look at the line offset just before: it was at the edge, so steer harder or drive slower.' }
    }
    case 'short':
    case 'timeout': {
      let t = end.t
      for (let i = frames.length - 1; i >= 0; i--) {
        if (frames[i].snap.groundSpeed > 0.02) {
          t = frames[i].t
          break
        }
      }
      if (reason === 'short' && !Number.isFinite(result.goalDistance))
        return { t, kind: 'stopped', label: 'It stopped here', graph: 'motors', detail: `This is where the robot stopped moving. ${result.message ?? ''}`.trim() }
      return {
        t,
        kind: 'stopped',
        label: reason === 'timeout' ? 'Out of time' : 'Stopped short',
        graph: 'motors',
        detail:
          reason === 'timeout'
            ? 'The clock ran out. Look at the motor graph: was the robot waiting, or driving slowly?'
            : `The robot stopped here, ${Math.round(result.goalDistance * 100)} cm from the goal. Drive a little longer or a little faster.`,
      }
    }
    case 'moving':
      return { t: end.t, kind: 'end', label: 'Still rolling', graph: 'speed', detail: 'The robot was still moving at the end. A robot keeps rolling after the motors stop: stop a little earlier.' }
    case 'not-visited':
      return { t: end.t, kind: 'end', label: 'Missed the flag', graph: 'motors', detail: 'The robot came home without reaching the flag. Check the turn and the distance to the flag.' }
    default:
      return { t: end.t, kind: 'end', label: 'Here', graph: 'motors', detail: 'This is where the run ended.' }
  }
}

/** For a course challenge (its own failure ids): map onto the nearest lab reason, then reuse whyFailed. */
export function reasonFromChallenge(fail: string | null | undefined): FailReason | null {
  switch (fail) {
    case 'collision':
      return 'crashed'
    case 'missing-part':
      return 'missing-part'
    case 'moving':
      return 'moving'
    case 'timeout':
      return 'timeout'
    case 'short':
    case 'not-delivered':
    case 'facing':
    case 'crossed':
      return 'short'
    default:
      return null
  }
}

// ── Graph series ─────────────────────────────────────────────────────────

export interface Series {
  id: string
  label: string
  /** Tailwind-free colour (SVG stroke). */
  color: string
  points: [number, number][]
  dashed?: boolean
}

export interface GraphData {
  id: GraphId
  title: string
  unit: string
  min: number
  max: number
  series: Series[]
  /** Shaded bands between two series (slip). [t, low, high]. */
  bands?: { label: string; color: string; points: [number, number, number][] }[]
  /** One line for the child. */
  explain: string
}

/** Thin frames to at most `max` evenly spaced ones (graphs never need more points than pixels). */
export function thin<T>(arr: readonly T[], max: number): T[] {
  if (arr.length <= max) return arr.slice()
  const out: T[] = []
  const step = (arr.length - 1) / (max - 1)
  for (let i = 0; i < max; i++) out.push(arr[Math.round(i * step)])
  return out
}

const avg2 = (p: [number, number]) => (p[0] + p[1]) / 2

export function buildGraphs(all: readonly FlightFrame[], parts: SensorParts, maxPoints = 240): GraphData[] {
  const frames = thin(all, maxPoints)
  const graphs: GraphData[] = []
  // Wheel speed vs ground speed, averaged over both sides; the gap while slipping is shaded.
  const wheel = frames.map((f): [number, number] => [f.t, Math.abs(avg2(f.drive.wheelSpeed)) * 100])
  const ground = frames.map((f): [number, number] => [f.t, Math.abs(avg2(f.drive.groundSpeed)) * 100])
  const band = frames.map((f, i): [number, number, number] => {
    const slip = f.drive.slipping[0] || f.drive.slipping[1]
    const a = ground[i][1]
    const b = wheel[i][1]
    return slip ? [f.t, Math.min(a, b), Math.max(a, b)] : [f.t, a, a]
  })
  const speedMax = Math.max(10, ...wheel.map((p) => p[1]), ...ground.map((p) => p[1]))
  graphs.push({
    id: 'speed',
    title: 'Wheel speed vs ground speed',
    unit: 'cm/s',
    min: 0,
    max: niceMax(speedMax),
    series: [
      { id: 'wheel', label: 'Wheels', color: '#FF8A4C', points: wheel },
      { id: 'ground', label: 'Over the ground', color: '#00E5FF', points: ground },
    ],
    bands: [{ label: 'Slip', color: 'rgba(248,113,113,0.35)', points: band }],
    explain: 'When the orange line is above the cyan one, the wheels are spinning faster than the robot moves: that gap (shaded) is slip.',
  })
  graphs.push({
    id: 'motors',
    title: 'Motor power',
    unit: '%',
    min: -100,
    max: 100,
    series: [
      { id: 'left', label: 'Left motor', color: '#FF8A4C', points: frames.map((f) => [f.t, f.drive.motorPct[0]]) },
      { id: 'right', label: 'Right motor', color: '#00E5FF', points: frames.map((f) => [f.t, f.drive.motorPct[1]]), dashed: true },
    ],
    explain: 'What your program told each motor. Both the same = straight; different = turning; below zero = backwards.',
  })
  const sensorSeries: Series[] = []
  if (parts.distance) sensorSeries.push({ id: 'distance', label: 'Distance (cm)', color: '#22C55E', points: frames.map((f) => [f.t, f.distanceCm ?? 0]) })
  if (parts.line) sensorSeries.push({ id: 'line', label: 'Line offset × 100', color: '#00E5FF', points: frames.map((f) => [f.t, (f.lineOffset ?? 0) * 100]) })
  if (parts.bump) sensorSeries.push({ id: 'bump', label: 'Bumper (100 = pressed)', color: '#F87171', points: frames.map((f) => [f.t, f.bumped ? 100 : 0]) })
  sensorSeries.push({ id: 'heading', label: 'Heading (°)', color: '#A7B0C0', points: frames.map((f) => [f.t, f.headingDeg]), dashed: true })
  const sMax = Math.max(100, ...sensorSeries.flatMap((s) => s.points.map((p) => p[1])))
  graphs.push({
    id: 'sensors',
    title: 'What the robot sensed',
    unit: '',
    min: parts.line ? -100 : 0,
    max: niceMax(sMax),
    series: sensorSeries,
    explain: parts.distance
      ? 'The green line is how far away the nearest thing ahead was. A falling line means something is getting closer.'
      : 'Your robot has no distance or line sensor yet, so here you see its compass heading. Fit a sensor to see more.',
  })
  const vMax = Math.max(1, ...frames.map((f) => f.battery.volts))
  graphs.push({
    id: 'battery',
    title: 'Battery',
    unit: '',
    min: 0,
    max: 100,
    series: [
      { id: 'soc', label: 'Charge (%)', color: '#22C55E', points: frames.map((f) => [f.t, f.battery.soc * 100]) },
      { id: 'volts', label: `Voltage (% of ${vMax.toFixed(1)} V)`, color: '#FF8A4C', points: frames.map((f) => [f.t, (f.battery.volts / vMax) * 100]) },
      { id: 'amps', label: 'Current (A × 20)', color: '#00E5FF', points: frames.map((f) => [f.t, Math.max(0, Math.min(100, f.battery.amps * 20))]), dashed: true },
    ],
    explain: 'Current jumps when the motors start or push hard, and the voltage dips at the same moment: that dip is sag.',
  })
  return graphs
}

function niceMax(v: number): number {
  const steps = [10, 20, 25, 50, 100, 150, 200, 250, 300, 400, 500, 1000]
  for (const s of steps) if (v <= s) return s
  return Math.ceil(v / 100) * 100
}

// ── Ghost: the best run, kept small enough to store on the device ────────

/** A ghost pose track: flat [t, x, y, z, yaw] rows. */
export interface Ghost {
  v: 1
  arenaId: string
  /** The finish time this ghost set, s (lower is better). */
  time: number
  /** Parts it ran with (drive/head/body), for "your ghost had tracks". */
  parts: string
  /** Flat rows of 5 numbers. */
  track: number[]
}

/** Longest ghost kept, in rows (at most ~10 per second). */
export const GHOST_MAX_ROWS = 600

function yawOf(q: { x: number; y: number; z: number; w: number }): number {
  // Heading about +y from the quaternion (the robot faces +z).
  const fx = 2 * (q.x * q.z + q.w * q.y)
  const fz = 1 - 2 * (q.x * q.x + q.y * q.y)
  return Math.atan2(fx, fz)
}

const r3 = (v: number) => Math.round(v * 1000) / 1000

export function makeGhost(arenaId: string, frames: readonly FlightFrame[], time: number, parts: string): Ghost | null {
  if (frames.length < 2) return null
  const duration = frames[frames.length - 1].t - frames[0].t
  const rows = Math.min(GHOST_MAX_ROWS, Math.max(2, Math.ceil(duration * 10) + 1))
  const picked = thin(frames, rows)
  const track: number[] = []
  for (const f of picked) {
    const p = f.snap.robot.p
    track.push(r3(f.t), r3(p.x), r3(p.y), r3(p.z), r3(yawOf(f.snap.robot.q)))
  }
  return { v: 1, arenaId, time: Math.round(time * 100) / 100, parts, track }
}

/** The ghost's pose at time t (held at its last pose after it finished). */
export function ghostPose(g: Ghost, t: number): { p: { x: number; y: number; z: number }; q: { x: number; y: number; z: number; w: number } } | null {
  const n = Math.floor(g.track.length / 5)
  if (n === 0) return null
  const row = (i: number) => g.track.slice(i * 5, i * 5 + 5)
  let i = 0
  while (i + 1 < n && g.track[(i + 1) * 5] <= t) i++
  const a = row(i)
  const b = row(Math.min(n - 1, i + 1))
  const span = b[0] - a[0]
  const u = span > 0 ? Math.max(0, Math.min(1, (t - a[0]) / span)) : 0
  let dy = b[4] - a[4]
  if (dy > Math.PI) dy -= 2 * Math.PI
  if (dy < -Math.PI) dy += 2 * Math.PI
  const yaw = a[4] + dy * u
  return {
    p: { x: a[1] + (b[1] - a[1]) * u, y: a[2] + (b[2] - a[2]) * u, z: a[3] + (b[3] - a[3]) * u },
    q: { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) },
  }
}

/** Is this result a new best for the ghost (a success, faster than the old ghost)? */
export function beatsGhost(result: Pick<RunResult, 'success' | 'time'>, old: Ghost | null): boolean {
  if (!result.success) return false
  return !old || result.time < old.time - 0.005
}

/** Validate a ghost read from storage (never trust stored JSON). */
export function parseGhost(x: unknown): Ghost | null {
  if (!x || typeof x !== 'object') return null
  const g = x as Partial<Ghost>
  if (g.v !== 1 || typeof g.arenaId !== 'string' || typeof g.time !== 'number' || !Number.isFinite(g.time) || typeof g.parts !== 'string') return null
  if (!Array.isArray(g.track) || g.track.length % 5 !== 0 || g.track.length > GHOST_MAX_ROWS * 5) return null
  if (!g.track.every((n) => typeof n === 'number' && Number.isFinite(n))) return null
  return { v: 1, arenaId: g.arenaId.slice(0, 80), time: g.time, parts: g.parts.slice(0, 80), track: g.track }
}
