// components/kids/games/robot-surgeon/steady.ts
// PILOT — Steady Hands. A surgeon's console in miniature: the child moves the
// "hand control" (drag on the pad, or arrow keys) and the robot moves a tool
// tip along a narrow channel on a practice board — the kind of board trainee
// surgeons really practise on.
//
// The model:
//   tool = start + (hand − hand₀) / scale            (motion scaling)
//   hand = what the child does + tremor(t)
//   tremor = two sines at 9.1 Hz and 10.6 Hz (physiological tremor sits
//            around 8–12 Hz) plus a little noise, seeded.
//   filter = two cascaded first-order low-pass filters, cut-off 3 Hz: slow,
//            meant movement passes, the fast shake is cut to about a tenth
//            (gain ≈ 1 / (1 + (f/fc)²) at frequency f).
// The tremor here is exaggerated (±1.8 mm) so a child can see it; a real
// surgeon's is usually a fraction of a millimetre — but so are the tissues.

import { clamp, gauss, rng } from './shared'

export const BOARD_W = 60 // mm
export const BOARD_H = 36 // mm
export const HALF_W = 1.1 // mm, half-width of the channel
export const TREMOR_MM = 1.8
export const TREMOR_HZ = [9.1, 10.6]
export const FILTER_FC = 3
export const TIME_LIMIT = 90
/** Hand millimetres per CSS pixel dragged on the pad. */
export const MM_PER_PX = 0.35
/** Keyboard hand speed, mm/s. */
export const KEY_SPEED = 26

const WAYPOINTS: [number, number][] = [
  [5, 29],
  [11, 12],
  [22, 7],
  [30, 18],
  [36, 29],
  [47, 27],
  [53, 15],
  [55, 6],
]

/** Catmull-Rom through the waypoints, sampled every ~0.4 mm. */
function buildPath(): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  const P = [WAYPOINTS[0], ...WAYPOINTS, WAYPOINTS[WAYPOINTS.length - 1]]
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]]
    const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1])
    const n = Math.max(4, Math.ceil(segLen / 0.4))
    for (let k = 0; k < n; k++) {
      const t = k / n
      const t2 = t * t
      const t3 = t2 * t
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push({ x: f(p0[0], p1[0], p2[0], p3[0]), y: f(p0[1], p1[1], p2[1], p3[1]) })
    }
  }
  const last = WAYPOINTS[WAYPOINTS.length - 1]
  out.push({ x: last[0], y: last[1] })
  return out
}

export const PATH = buildPath()
export const PATH_LEN = PATH.reduce((s, p, i) => (i ? s + Math.hypot(p.x - PATH[i - 1].x, p.y - PATH[i - 1].y) : 0), 0)

export function nearest(x: number, y: number, from = 0, span = PATH.length): { i: number; d: number } {
  let bi = 0
  let bd = Infinity
  const lo = Math.max(0, from)
  const hi = Math.min(PATH.length, from + span)
  for (let i = lo; i < hi; i++) {
    const d = Math.hypot(PATH[i].x - x, PATH[i].y - y)
    if (d < bd) {
      bd = d
      bi = i
    }
  }
  return { i: bi, d: bd }
}

export interface SteadySettings {
  scale: 1 | 3 | 5
  filter: boolean
}

export interface SteadyState {
  /** Seconds since the tool entered the channel. */
  t: number
  /** Seconds since the round began (drives the tremor). */
  clock: number
  settings: SteadySettings
  /** Where the child's hand is (mm), without tremor. */
  hx: number
  hy: number
  /** Tool command and the two filter stages. */
  cx: number
  cy: number
  f1x: number
  f1y: number
  tx: number
  ty: number
  progress: number
  started: boolean
  finished: boolean
  timeUp: boolean
  samples: number
  inside: number
  touches: number
  outNow: boolean
  maxDev: number
  /** Measured shake at the tool: running RMS of (tool − tool without tremor). */
  shakeSq: number
  shakeN: number
  /** Recent tool positions for the trail. */
  trail: { x: number; y: number; ok: boolean }[]
  /** Tool position the same filter would give without tremor (to measure shake honestly). */
  qx: number
  qy: number
  q1x: number
  q1y: number
  phase: [number, number]
  rand: () => number
  noiseX: number
  noiseY: number
}

export function makeSteady(settings: SteadySettings, seed = 11): SteadyState {
  const r = rng(seed)
  const s0 = PATH[0]
  return {
    t: 0,
    clock: 0,
    settings,
    hx: 0,
    hy: 0,
    cx: s0.x,
    cy: s0.y,
    f1x: s0.x,
    f1y: s0.y,
    tx: s0.x,
    ty: s0.y,
    progress: 0,
    started: false,
    finished: false,
    timeUp: false,
    samples: 0,
    inside: 0,
    touches: 0,
    outNow: false,
    maxDev: 0,
    shakeSq: 0,
    shakeN: 0,
    trail: [],
    qx: s0.x,
    qy: s0.y,
    q1x: s0.x,
    q1y: s0.y,
    phase: [r() * Math.PI * 2, r() * Math.PI * 2],
    rand: r,
    noiseX: 0,
    noiseY: 0,
  }
}

export function tremor(s: SteadyState): { x: number; y: number } {
  const a = TREMOR_MM * 0.62
  const w1 = 2 * Math.PI * TREMOR_HZ[0] * s.clock + s.phase[0]
  const w2 = 2 * Math.PI * TREMOR_HZ[1] * s.clock + s.phase[1]
  return {
    x: a * Math.sin(w1) + a * 0.55 * Math.sin(w2 + 1.3) + s.noiseX,
    y: a * Math.cos(w1 * 1.02 + 0.7) + a * 0.55 * Math.sin(w2) + s.noiseY,
  }
}

/** Amplitude gain of the two-stage low-pass at frequency f. */
export const filterGain = (f: number) => 1 / (1 + (f / FILTER_FC) ** 2)

/** Expected shake amplitude at the tool (mm) for these settings. */
export function expectedShake(st: SteadySettings): number {
  const f = (TREMOR_HZ[0] + TREMOR_HZ[1]) / 2
  return (TREMOR_MM / st.scale) * (st.filter ? filterGain(f) : 1)
}

/** Advance; hdx/hdy = hand movement this step (mm, no tremor). */
export function stepSteady(s: SteadyState, hdx: number, hdy: number, dt: number) {
  if (s.finished || s.timeUp) return
  s.clock += dt // tremor never stops
  if (s.started) s.t += dt // the timer starts when the tool enters the channel
  const sc = s.settings.scale
  s.hx += hdx
  s.hy += hdy
  s.noiseX = 0.9 * s.noiseX + 0.1 * gauss(s.rand) * 0.25
  s.noiseY = 0.9 * s.noiseY + 0.1 * gauss(s.rand) * 0.25
  const tr = tremor(s)
  const s0 = PATH[0]
  const clean = { x: s0.x + s.hx / sc, y: s0.y + s.hy / sc }
  // Keep the hand's meaning inside the board (the robot's workspace limit).
  const bx = clamp(clean.x, 0, BOARD_W)
  const by = clamp(clean.y, 0, BOARD_H)
  if (bx !== clean.x) s.hx = (bx - s0.x) * sc
  if (by !== clean.y) s.hy = (by - s0.y) * sc
  s.cx = bx + tr.x / sc
  s.cy = by + tr.y / sc
  if (s.settings.filter) {
    const rc = 1 / (2 * Math.PI * FILTER_FC)
    const a = dt / (rc + dt)
    s.f1x += a * (s.cx - s.f1x)
    s.f1y += a * (s.cy - s.f1y)
    s.tx += a * (s.f1x - s.tx)
    s.ty += a * (s.f1y - s.ty)
    s.q1x += a * (bx - s.q1x)
    s.q1y += a * (by - s.q1y)
    s.qx += a * (s.q1x - s.qx)
    s.qy += a * (s.q1y - s.qy)
  } else {
    s.tx = s.cx
    s.ty = s.cy
    s.qx = bx
    s.qy = by
  }
  const sh = Math.hypot(s.tx - s.qx, s.ty - s.qy)
  s.shakeSq += sh * sh
  s.shakeN++

  // Progress along the channel (search a window ahead of where we are).
  const n = nearest(s.tx, s.ty, s.progress - 20, 60)
  // Starts when the CHILD moves the tool into the channel (tremor alone never starts it).
  if (!s.started && Math.hypot(s.hx, s.hy) > 3 && n.i > 6 && n.d < HALF_W * 2) s.started = true
  if (!s.started) s.progress = 0
  if (n.d <= HALF_W * 2.2 && n.i > s.progress) s.progress = n.i
  if (s.started && !s.finished) {
    s.samples++
    const ok = n.d <= HALF_W
    if (ok) s.inside++
    if (!ok && !s.outNow) s.touches++
    s.outNow = !ok
    s.maxDev = Math.max(s.maxDev, n.d)
    if (s.samples % 2 === 0) {
      s.trail.push({ x: s.tx, y: s.ty, ok })
      if (s.trail.length > 600) s.trail.shift()
    }
  }
  if (s.progress >= PATH.length - 3 && n.d <= HALF_W * 1.5) s.finished = true
  if (s.t >= TIME_LIMIT) s.timeUp = true
}

export function accuracy(s: SteadyState): number {
  return s.samples ? s.inside / s.samples : 0
}

export function shakeRms(s: SteadyState): number {
  return s.shakeN ? Math.sqrt(s.shakeSq / s.shakeN) : 0
}

export function steadyStars(s: SteadyState): number {
  if (!s.finished) return 0
  const acc = accuracy(s)
  if (acc >= 0.96 && s.touches <= 2) return 3
  if (acc >= 0.88) return 2
  if (acc >= 0.75) return 1
  return 0
}
