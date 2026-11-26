// components/kids/games/swarm-reef/sim.ts
// Swarm Reef — the simulation. Pure TypeScript, no DOM: safe to run headless
// for tuning and tests.
//
// Every robot is a "boid" (Reynolds, 1987) that only knows what it can sense
// inside its own sensing radius. There is no leader and no central computer:
// the swarm's behaviour EMERGES from five local rules whose weights the child
// sets — separation, alignment, cohesion, plus goal-seeking / obstacle
// avoidance / shape pull / exploration depending on the mission.
//
// The step is fixed (1/60 s) and every random number comes from a seeded
// generator, so the same weights always give the same run and a score is fair.

export type TierIndex = 0 | 1 | 2 | 3

export const WORLD_W = 1000
export const WORLD_H = 700
export const DT = 1 / 60
export const ROBOT_R = 5
const ACC = 190 // max steering acceleration, units/s² per unit weight
const DRAG = 0.7 // water drag, 1/s
/** Separation only reacts to neighbours this close (or the sensing radius, if smaller). */
export const PERSONAL_SPACE = 55
/** Battery drain (percent per second): just staying on, plus sensing cost per unit of radius. */
export const BATTERY_BASE = 1.6
export const BATTERY_PER_RADIUS = 0.02

export interface Weights {
  sep: number
  ali: number
  coh: number
  goal: number
  avoid: number
  shape: number
  explore: number
  trail: number
  /** Sensing radius in world units (the reef is 1000 × 700). */
  radius: number
}

export type WeightKey = keyof Weights

export interface CircleObs {
  kind: 'circle'
  x: number
  y: number
  r: number
  /** Seed for the organic outline the renderer draws. */
  seed: number
}
export interface BoxObs {
  kind: 'box'
  x: number
  y: number
  w: number
  h: number
}
export type Obstacle = CircleObs | BoxObs

export interface Zone {
  x: number
  y: number
  r: number
}

export type Shape = { kind: 'ring'; x: number; y: number; r: number } | { kind: 'line'; x1: number; y1: number; x2: number; y2: number }

export interface ShapePhase {
  shape: Shape
  start: number
  end: number
  /** Formation quality is measured over [end - window, end]. */
  window: number
  label: string
}

export interface Mission {
  tier: TierIndex
  title: string
  robots: number
  /** Every k-th robot is a scout that can smell the food from anywhere (Cadet). 1 = all informed. */
  scoutEvery: number
  timeLimit: number
  vmax: number
  /** Robots like to keep swimming at this fraction of top speed (0 = happy to hover). */
  cruise: number
  current: number
  obstacles: Obstacle[]
  start: { x: number; y: number; w: number; h: number }
  food?: Zone
  phases?: ShapePhase[]
  loss?: { at: number; count: number }
  beacons?: { x: number; y: number }[]
  battery: boolean
  enabled: WeightKey[]
  defaults: Weights
  seed: number
}

export interface Robot {
  x: number
  y: number
  vx: number
  vy: number
  scout: boolean
  arrived: boolean
  arrivedAt: number
  alive: boolean
  /** Time the robot was switched off (Ace loss) or ran flat (Legend); -1 while running. */
  offAt: number
  battery: number
  inWall: boolean
  phase: number
  /** Number of neighbours seen on the last step (for the robot's-eye view). */
  seen: number
}

export type SimEventType = 'bump' | 'crash' | 'arrive' | 'beacon' | 'lost' | 'flat' | 'phase'

export interface SimEvent {
  type: SimEventType
  x: number
  y: number
}

export const CELL = 25
export const GRID_W = WORLD_W / CELL // 40
export const GRID_H = WORLD_H / CELL // 28

export interface SimState {
  m: Mission
  w: Weights
  t: number
  steps: number
  robots: Robot[]
  bumps: number
  crashes: number
  arrived: number
  events: SimEvent[]
  contact: Uint8Array
  // Ace
  phaseIdx: number
  quality: number
  phaseScores: number[]
  phaseSamples: number[]
  // Legend
  coverable: Uint8Array
  coverableCount: number
  covered: Uint8Array
  coveredCount: number
  trail: Float32Array
  found: boolean[]
  foundAt: number[]
  done: boolean
  /** Time-averaged stats used by the debrief. */
  stats: {
    strayTime: number
    sampleCount: number
    avgNeighbours: number
    minBatteryEnd: number
  }
}

// ── Seeded randomness ──────────────────────────────────────────────────────

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

// ── Missions ───────────────────────────────────────────────────────────────

const BASE: Weights = { sep: 1, ali: 0.5, coh: 0, goal: 1.5, avoid: 0, shape: 0, explore: 0, trail: 0, radius: 60 }

function rocks(rng: () => number, list: [number, number, number][]): CircleObs[] {
  return list.map(([x, y, r]) => ({ kind: 'circle', x, y, r, seed: Math.floor(rng() * 1e9) }))
}

export function buildMission(tier: TierIndex): Mission {
  const rng = mulberry32(9100 + tier * 77)
  if (tier === 0) {
    return {
      tier,
      title: 'Cadet — Feeding time',
      robots: 40,
      scoutEvery: 5,
      timeLimit: 50,
      vmax: 85,
      cruise: 0.6,
      current: 26,
      obstacles: rocks(rng, [
        [470, 120, 55],
        [540, 590, 60],
        [300, 640, 35],
        [700, 90, 30],
      ]),
      start: { x: 50, y: 230, w: 210, h: 240 },
      food: { x: 870, y: 350, r: 75 },
      battery: false,
      enabled: ['sep', 'ali', 'coh', 'goal', 'radius'],
      defaults: { ...BASE, avoid: 1.2 },
      seed: 101,
    }
  }
  if (tier === 1) {
    const gapY = 350
    const half = 30
    return {
      tier,
      title: 'Pilot — The narrow gap',
      robots: 40,
      scoutEvery: 1,
      timeLimit: 50,
      vmax: 95,
      cruise: 0.55,
      current: 22,
      obstacles: [
        { kind: 'box', x: 470, y: 0, w: 70, h: gapY - half },
        { kind: 'box', x: 470, y: gapY + half, w: 70, h: WORLD_H - gapY - half },
        ...rocks(rng, [
          [300, 150, 38],
          [700, 560, 50],
          [720, 150, 40],
        ]),
      ],
      start: { x: 40, y: 110, w: 260, h: 480 },
      food: { x: 880, y: 350, r: 75 },
      battery: false,
      enabled: ['sep', 'ali', 'coh', 'goal', 'avoid', 'radius'],
      defaults: { ...BASE, sep: 1, ali: 0.5, coh: 0.5, goal: 2, avoid: 0, radius: 50 },
      seed: 202,
    }
  }
  if (tier === 2) {
    const cx = 500
    const cy = 350
    return {
      tier,
      title: 'Ace — Light-show formation',
      robots: 36,
      scoutEvery: 1,
      timeLimit: 45,
      vmax: 90,
      cruise: 0,
      current: 0,
      obstacles: [],
      start: { x: 200, y: 150, w: 600, h: 400 },
      phases: [
        { shape: { kind: 'ring', x: cx, y: cy, r: 200 }, start: 0, end: 15, window: 3, label: 'Ring' },
        { shape: { kind: 'ring', x: cx, y: cy, r: 200 }, start: 15, end: 30, window: 3, label: 'Heal the ring' },
        { shape: { kind: 'line', x1: 150, y1: cy, x2: 850, y2: cy }, start: 30, end: 45, window: 3, label: 'Line' },
      ],
      loss: { at: 15, count: 12 },
      battery: false,
      enabled: ['sep', 'ali', 'coh', 'shape', 'radius'],
      defaults: { ...BASE, sep: 0.5, ali: 0.5, coh: 1, goal: 0, shape: 1, radius: 40 },
      seed: 303,
    }
  }
  // Legend — search and rescue
  const obstacles = rocks(rng, [
    [250, 200, 60],
    [520, 420, 75],
    [770, 180, 55],
    [380, 590, 40],
    [820, 520, 45],
    [600, 110, 35],
  ])
  const beacons = [
    { x: 940, y: 60 },
    { x: 120, y: 80 },
    { x: 940, y: 650 },
    { x: 660, y: 640 },
    { x: 420, y: 300 },
    { x: 650, y: 290 },
  ]
  return {
    tier: 3,
    title: 'Legend — Search and rescue',
    robots: 14,
    scoutEvery: 1,
    timeLimit: 60,
    vmax: 60,
    cruise: 0.6,
    current: 10,
    obstacles,
    start: { x: 30, y: 560, w: 120, h: 110 },
    beacons,
    battery: true,
    enabled: ['sep', 'ali', 'coh', 'avoid', 'explore', 'trail', 'radius'],
    defaults: { ...BASE, sep: 1, ali: 1, coh: 1, goal: 0, avoid: 1, explore: 0, trail: 0, radius: 60 },
    seed: 404,
  }
}

// ── Geometry helpers ───────────────────────────────────────────────────────

function closestOnObstacle(o: Obstacle, x: number, y: number): { qx: number; qy: number; d: number; inside: boolean } {
  if (o.kind === 'circle') {
    const dx = x - o.x
    const dy = y - o.y
    const dist = Math.hypot(dx, dy) || 1e-6
    return { qx: o.x + (dx / dist) * o.r, qy: o.y + (dy / dist) * o.r, d: dist - o.r, inside: dist < o.r }
  }
  const qx = Math.max(o.x, Math.min(x, o.x + o.w))
  const qy = Math.max(o.y, Math.min(y, o.y + o.h))
  const inside = x > o.x && x < o.x + o.w && y > o.y && y < o.y + o.h
  if (inside) {
    // push out through the nearest face
    const faces = [
      { d: x - o.x, qx: o.x, qy: y },
      { d: o.x + o.w - x, qx: o.x + o.w, qy: y },
      { d: y - o.y, qx: x, qy: o.y },
      { d: o.y + o.h - y, qx: x, qy: o.y + o.h },
    ].sort((a, b) => a.d - b.d)
    return { qx: faces[0].qx, qy: faces[0].qy, d: -faces[0].d, inside: true }
  }
  return { qx, qy, d: Math.hypot(x - qx, y - qy), inside: false }
}

export function insideAnyObstacle(m: Mission, x: number, y: number, pad: number): boolean {
  return m.obstacles.some((o) => closestOnObstacle(o, x, y).d < pad)
}

export function closestOnShape(s: Shape, x: number, y: number): { qx: number; qy: number } {
  if (s.kind === 'ring') {
    const dx = x - s.x
    const dy = y - s.y
    const d = Math.hypot(dx, dy) || 1e-6
    return { qx: s.x + (dx / d) * s.r, qy: s.y + (dy / d) * s.r }
  }
  const lx = s.x2 - s.x1
  const ly = s.y2 - s.y1
  const len2 = lx * lx + ly * ly
  const u = Math.max(0, Math.min(1, ((x - s.x1) * lx + (y - s.y1) * ly) / len2))
  return { qx: s.x1 + u * lx, qy: s.y1 + u * ly }
}

export function currentAt(m: Mission, x: number, y: number, t: number): { cx: number; cy: number } {
  if (m.current === 0) return { cx: 0, cy: 0 }
  return {
    cx: m.current * 0.35 * Math.sin(y / 140 + t * 0.25),
    cy: m.current * Math.sin(x / 170 - t * 0.35 + 1.3),
  }
}

function clampLen(x: number, y: number, max: number): [number, number] {
  const l = Math.hypot(x, y)
  if (l > max && l > 0) return [(x / l) * max, (y / l) * max]
  return [x, y]
}

// ── Create ─────────────────────────────────────────────────────────────────

export function createSim(m: Mission, w: Weights): SimState {
  const rng = mulberry32(m.seed)
  const robots: Robot[] = []
  for (let i = 0; i < m.robots; i++) {
    let x = 0
    let y = 0
    for (let k = 0; k < 40; k++) {
      x = m.start.x + rng() * m.start.w
      y = m.start.y + rng() * m.start.h
      if (!insideAnyObstacle(m, x, y, 12) && robots.every((o) => Math.hypot(o.x - x, o.y - y) > 16)) break
    }
    const a = rng() * Math.PI * 2
    const s = m.vmax * 0.3 * rng()
    robots.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      scout: m.scoutEvery <= 1 ? true : i % m.scoutEvery === 0,
      arrived: false,
      arrivedAt: -1,
      alive: true,
      offAt: -1,
      battery: 100,
      inWall: false,
      phase: rng() * Math.PI * 2,
      seen: 0,
    })
  }
  const coverable = new Uint8Array(GRID_W * GRID_H)
  let coverableCount = 0
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const ok = !insideAnyObstacle(m, (gx + 0.5) * CELL, (gy + 0.5) * CELL, 0)
      coverable[gy * GRID_W + gx] = ok ? 1 : 0
      if (ok) coverableCount++
    }
  }
  return {
    m,
    w,
    t: 0,
    steps: 0,
    robots,
    bumps: 0,
    crashes: 0,
    arrived: 0,
    events: [],
    contact: new Uint8Array(m.robots * m.robots),
    phaseIdx: 0,
    quality: 0,
    phaseScores: (m.phases ?? []).map(() => 0),
    phaseSamples: (m.phases ?? []).map(() => 0),
    coverable,
    coverableCount,
    covered: new Uint8Array(GRID_W * GRID_H),
    coveredCount: 0,
    trail: new Float32Array(GRID_W * GRID_H),
    found: (m.beacons ?? []).map(() => false),
    foundAt: (m.beacons ?? []).map(() => -1),
    done: false,
    stats: { strayTime: 0, sampleCount: 0, avgNeighbours: 0, minBatteryEnd: 100 },
  }
}

// ── Formation quality (Ace) ────────────────────────────────────────────────

export function formationQuality(s: SimState, shape: Shape): number {
  const live = s.robots.filter((r) => r.alive)
  const n = live.length
  if (n < 3) return 0
  if (shape.kind === 'ring') {
    let radial = 0
    const angles: number[] = []
    for (const r of live) {
      const dx = r.x - shape.x
      const dy = r.y - shape.y
      radial += Math.abs(Math.hypot(dx, dy) - shape.r)
      angles.push(Math.atan2(dy, dx))
    }
    radial /= n
    angles.sort((a, b) => a - b)
    const gaps: number[] = []
    for (let i = 0; i < n; i++) {
      const next = i === n - 1 ? angles[0] + Math.PI * 2 : angles[i + 1]
      gaps.push(next - angles[i])
    }
    const ideal = (Math.PI * 2) / n
    const cv = Math.sqrt(gaps.reduce((a, g) => a + (g - ideal) ** 2, 0) / n) / ideal
    return Math.max(0, 1 - radial / 45) * Math.max(0, 1 - cv * 0.8)
  }
  const lx = shape.x2 - shape.x1
  const ly = shape.y2 - shape.y1
  const len = Math.hypot(lx, ly)
  let dist = 0
  const us: number[] = []
  for (const r of live) {
    const q = closestOnShape(shape, r.x, r.y)
    dist += Math.hypot(r.x - q.qx, r.y - q.qy)
    us.push(((r.x - shape.x1) * lx + (r.y - shape.y1) * ly) / len)
  }
  dist /= n
  us.sort((a, b) => a - b)
  const ideal = len / n
  // gaps including half-gaps at both ends, so the line must be filled end to end
  const gaps: number[] = [(us[0] - 0) * 2]
  for (let i = 1; i < n; i++) gaps.push(us[i] - us[i - 1])
  gaps.push((len - us[n - 1]) * 2)
  const cv = Math.sqrt(gaps.reduce((a, g) => a + (g - ideal) ** 2, 0) / gaps.length) / ideal
  return Math.max(0, 1 - dist / 35) * Math.max(0, 1 - cv * 0.8)
}

// ── Step ───────────────────────────────────────────────────────────────────

function cellOf(x: number, y: number): number {
  const gx = Math.max(0, Math.min(GRID_W - 1, Math.floor(x / CELL)))
  const gy = Math.max(0, Math.min(GRID_H - 1, Math.floor(y / CELL)))
  return gy * GRID_W + gx
}

function trailAt(s: SimState, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return 4
  const c = cellOf(x, y)
  if (!s.coverable[c]) return 4
  return s.trail[c]
}

export function activeShape(s: SimState): Shape | null {
  const ph = s.m.phases
  if (!ph) return null
  return ph[Math.min(s.phaseIdx, ph.length - 1)].shape
}

/** Advance the world by one fixed step. */
export function stepSim(s: SimState): void {
  if (s.done) return
  const { m, w, robots } = s
  const n = robots.length
  const R = Math.max(10, w.radius)
  const R2 = R * R
  const SEP_R = Math.min(R, PERSONAL_SPACE)
  const vmax = m.vmax
  const shape = activeShape(s)
  const avoidR = Math.max(28, R * 0.9)

  // Ace: phase changes and robot loss
  if (m.phases) {
    const ph = m.phases
    while (s.phaseIdx < ph.length - 1 && s.t >= ph[s.phaseIdx].end) {
      s.phaseIdx++
      s.events.push({ type: 'phase', x: WORLD_W / 2, y: WORLD_H / 2 })
    }
  }
  if (m.loss && s.t >= m.loss.at && s.t - DT < m.loss.at) {
    // switch off robots spread around the swarm (deterministic: every third one)
    let off = 0
    for (let i = 0; i < n && off < m.loss.count; i += 3) {
      const r = robots[i]
      if (!r.alive) continue
      r.alive = false
      r.offAt = s.t
      off++
      s.events.push({ type: 'lost', x: r.x, y: r.y })
    }
  }

  const ax = new Float32Array(n)
  const ay = new Float32Array(n)
  let neighbourSum = 0
  let strays = 0
  let liveCount = 0

  for (let i = 0; i < n; i++) {
    const r = robots[i]
    if (!r.alive) continue
    liveCount++
    let sx = 0
    let sy = 0
    let avx = 0
    let avy = 0
    let cx = 0
    let cy = 0
    let k = 0
    for (let j = 0; j < n; j++) {
      if (j === i) continue
      const o = robots[j]
      if (!o.alive) continue
      const dx = r.x - o.x
      const dy = r.y - o.y
      const d2 = dx * dx + dy * dy
      if (d2 > R2) continue
      const d = Math.sqrt(d2) || 1e-3
      if (d < SEP_R) {
        // personal space: only close neighbours push, and the closer the harder
        const f = 1 - d / SEP_R
        sx += (dx / d) * f * (1 + 2 * f)
        sy += (dy / d) * f * (1 + 2 * f)
      }
      avx += o.vx
      avy += o.vy
      cx += o.x
      cy += o.y
      k++
    }
    r.seen = k
    neighbourSum += k
    if (k === 0) strays++
    let fx = 0
    let fy = 0
    if (k > 0) {
      const [sepx, sepy] = clampLen(sx, sy, 1.5)
      fx += w.sep * sepx
      fy += w.sep * sepy
      const [alx, aly] = clampLen((avx / k - r.vx) / vmax, (avy / k - r.vy) / vmax, 1)
      fx += w.ali * alx
      fy += w.ali * aly
      const [chx, chy] = clampLen((cx / k - r.x) / R, (cy / k - r.y) / R, 1)
      fx += w.coh * chx
      fy += w.coh * chy
    }

    // Goal-seeking: scouts smell the food from anywhere; others only inside their radius
    if (m.food) {
      const dx = m.food.x - r.x
      const dy = m.food.y - r.y
      const d = Math.hypot(dx, dy) || 1e-3
      if (r.arrived) {
        // docked: hold station gently in the food cloud
        const pull = Math.min(1, d / m.food.r)
        fx += 1.2 * (dx / d) * pull - (0.8 * r.vx) / vmax
        fy += 1.2 * (dy / d) * pull - (0.8 * r.vy) / vmax
      } else if (r.scout || d < R + m.food.r) {
        const [gx, gy] = clampLen(dx / d - r.vx / vmax, dy / d - r.vy / vmax, 1)
        fx += w.goal * gx
        fy += w.goal * gy
      }
    }

    // Obstacle avoidance (sensed inside the robot's own range; looks a little ahead)
    if (w.avoid > 0 && m.obstacles.length) {
      let ox = 0
      let oy = 0
      const px = r.x + r.vx * 0.35
      const py = r.y + r.vy * 0.35
      for (const ob of m.obstacles) {
        for (const [qx0, qy0] of [
          [r.x, r.y],
          [px, py],
        ]) {
          const c = closestOnObstacle(ob, qx0, qy0)
          const d = c.d - ROBOT_R
          if (d < avoidR) {
            let nx = qx0 - c.qx
            let ny = qy0 - c.qy
            const l = Math.hypot(nx, ny) || 1e-3
            nx /= l
            ny /= l
            if (c.inside) {
              nx = -nx
              ny = -ny
            }
            const f = 1 - Math.max(0, d) / avoidR
            ox += nx * f * f * 1.6
            oy += ny * f * f * 1.6
          }
        }
      }
      const [aox, aoy] = clampLen(ox, oy, 2)
      fx += w.avoid * aox
      fy += w.avoid * aoy
    }

    // Shape pull (Ace): every robot knows the shape, nobody has an assigned slot
    if (shape && w.shape > 0) {
      const q = closestOnShape(shape, r.x, r.y)
      const [spx, spy] = clampLen((q.qx - r.x) / 15, (q.qy - r.y) / 15, 1.5)
      fx += w.shape * spx
      fy += w.shape * spy
    }

    // Exploration (Legend): steer down the shared trail — away from where the swarm has been
    if (m.battery && w.explore > 0) {
      let ex = 0
      let ey = 0
      let total = 0
      const look = Math.max(30, R * 0.6)
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2
        const dx = Math.cos(ang)
        const dy = Math.sin(ang)
        const v = trailAt(s, r.x + dx * look, r.y + dy * look)
        ex -= dx * v
        ey -= dy * v
        total += v
      }
      if (total > 1e-3) {
        const [exx, exy] = clampLen(ex / (total * 0.35), ey / (total * 0.35), 1)
        fx += w.explore * exx
        fy += w.explore * exy
      }
    }

    // Keep swimming: like a fish, a robot holds a cruising speed along its heading
    if (m.cruise > 0) {
      const sp = Math.hypot(r.vx, r.vy)
      if (sp > 1) {
        const want = (m.cruise * vmax - sp) / vmax
        fx += (r.vx / sp) * want * 1.5
        fy += (r.vy / sp) * want * 1.5
      }
    }

    // A little wobble so a robot with no rules still drifts like a real one
    const wt = s.t * 0.7 + r.phase
    fx += 0.18 * Math.cos(wt + Math.sin(s.t * 1.3 + r.phase * 2))
    fy += 0.18 * Math.sin(wt + Math.cos(s.t * 1.1 + r.phase))

    // Soft fence at the edge of the reef (not a weight the child sets)
    const edge = 30
    if (r.x < edge) fx += (edge - r.x) / edge
    if (r.x > WORLD_W - edge) fx -= (r.x - (WORLD_W - edge)) / edge
    if (r.y < edge) fy += (edge - r.y) / edge
    if (r.y > WORLD_H - edge) fy -= (r.y - (WORLD_H - edge)) / edge

    ax[i] = fx * ACC
    ay[i] = fy * ACC
  }

  // Integrate
  for (let i = 0; i < n; i++) {
    const r = robots[i]
    if (!r.alive) {
      // switched-off robots sink slowly
      r.vx *= 0.96
      r.vy = r.vy * 0.96 + 4 * DT
      r.x += r.vx * DT
      r.y = Math.min(WORLD_H - 6, r.y + r.vy * DT)
      continue
    }
    r.vx += ax[i] * DT
    r.vy += ay[i] * DT
    r.vx *= 1 - DRAG * DT
    r.vy *= 1 - DRAG * DT
    const sp = Math.hypot(r.vx, r.vy)
    if (sp > vmax) {
      r.vx = (r.vx / sp) * vmax
      r.vy = (r.vy / sp) * vmax
    }
    const cur = currentAt(m, r.x, r.y, s.t)
    r.x += (r.vx + cur.cx) * DT
    r.y += (r.vy + cur.cy) * DT
    // hard world bounds
    if (r.x < ROBOT_R) {
      r.x = ROBOT_R
      r.vx = Math.abs(r.vx) * 0.3
    }
    if (r.x > WORLD_W - ROBOT_R) {
      r.x = WORLD_W - ROBOT_R
      r.vx = -Math.abs(r.vx) * 0.3
    }
    if (r.y < ROBOT_R) {
      r.y = ROBOT_R
      r.vy = Math.abs(r.vy) * 0.3
    }
    if (r.y > WORLD_H - ROBOT_R) {
      r.y = WORLD_H - ROBOT_R
      r.vy = -Math.abs(r.vy) * 0.3
    }
    // rock / wall contact
    let touching = false
    let near = false
    for (const ob of m.obstacles) {
      const c = closestOnObstacle(ob, r.x, r.y)
      if (c.d < ROBOT_R + 4) near = true
      if (c.d < ROBOT_R) {
        touching = true
        let nx = r.x - c.qx
        let ny = r.y - c.qy
        const l = Math.hypot(nx, ny) || 1e-3
        nx /= l
        ny /= l
        if (c.inside) {
          nx = -nx
          ny = -ny
        }
        r.x = c.qx + nx * (ROBOT_R + 0.5)
        r.y = c.qy + ny * (ROBOT_R + 0.5)
        const vn = r.vx * nx + r.vy * ny
        if (vn < 0) {
          r.vx -= 1.4 * vn * nx
          r.vy -= 1.4 * vn * ny
        }
      }
    }
    // a crash is counted once per touch: the robot must swim clear before it can crash again
    if (touching && !r.inWall) {
      s.crashes++
      s.events.push({ type: 'crash', x: r.x, y: r.y })
      r.inWall = true
    } else if (!near) {
      r.inWall = false
    }

    // battery (Legend): moving and sensing both cost energy
    if (m.battery) {
      const spn = Math.hypot(r.vx, r.vy) / vmax
      r.battery -= (BATTERY_BASE + 1.2 * spn * spn + R * BATTERY_PER_RADIUS) * DT
      if (r.battery <= 0) {
        r.battery = 0
        r.alive = false
        r.offAt = s.t
        s.events.push({ type: 'flat', x: r.x, y: r.y })
      }
    }

    // arrival
    if (m.food && !r.arrived) {
      if (Math.hypot(r.x - m.food.x, r.y - m.food.y) < m.food.r) {
        r.arrived = true
        r.arrivedAt = s.t
        s.arrived++
        s.events.push({ type: 'arrive', x: r.x, y: r.y })
      }
    }
  }

  // Robot-robot contact (bumps are counted once per touch)
  const D = ROBOT_R * 2
  for (let i = 0; i < n; i++) {
    const a = robots[i]
    if (!a.alive) continue
    for (let j = i + 1; j < n; j++) {
      const b = robots[j]
      if (!b.alive) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d2 = dx * dx + dy * dy
      const key = i * n + j
      if (d2 < D * D) {
        const d = Math.sqrt(d2) || 1e-3
        const nx = dx / d
        const ny = dy / d
        const push = (D - d) / 2
        a.x -= nx * push
        a.y -= ny * push
        b.x += nx * push
        b.y += ny * push
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
        if (rv < 0) {
          a.vx += rv * nx * 0.5
          a.vy += rv * ny * 0.5
          b.vx -= rv * nx * 0.5
          b.vy -= rv * ny * 0.5
        }
        if (!s.contact[key]) {
          s.contact[key] = 1
          // docked robots nudging each other inside the food cloud are not crashes
          if (!(a.arrived && b.arrived)) {
            s.bumps++
            s.events.push({ type: 'bump', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
          }
        }
      } else if (d2 > (D + 3) * (D + 3)) {
        s.contact[key] = 0
      }
    }
  }

  // Legend: coverage, shared trail, beacons
  if (m.battery) {
    const decay = 1 - 0.035 * DT
    for (let c = 0; c < s.trail.length; c++) s.trail[c] *= decay
    const senseR = R
    const cr = Math.ceil(senseR / CELL)
    for (const r of robots) {
      if (!r.alive) continue
      s.trail[cellOf(r.x, r.y)] += w.trail * 0.9 * DT
      // smear onto the 4 neighbours so the trail has a gradient to follow
      const gx0 = Math.floor(r.x / CELL)
      const gy0 = Math.floor(r.y / CELL)
      for (const [ox, oy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const gx = gx0 + ox
        const gy = gy0 + oy
        if (gx >= 0 && gy >= 0 && gx < GRID_W && gy < GRID_H) s.trail[gy * GRID_W + gx] += w.trail * 0.35 * DT
      }
      for (let gy = gy0 - cr; gy <= gy0 + cr; gy++) {
        if (gy < 0 || gy >= GRID_H) continue
        for (let gx = gx0 - cr; gx <= gx0 + cr; gx++) {
          if (gx < 0 || gx >= GRID_W) continue
          const c = gy * GRID_W + gx
          if (s.covered[c] || !s.coverable[c]) continue
          const ddx = (gx + 0.5) * CELL - r.x
          const ddy = (gy + 0.5) * CELL - r.y
          if (ddx * ddx + ddy * ddy <= senseR * senseR) {
            s.covered[c] = 1
            s.coveredCount++
          }
        }
      }
    }
    const beacons = m.beacons ?? []
    for (let b = 0; b < beacons.length; b++) {
      if (s.found[b]) continue
      for (const r of robots) {
        if (!r.alive) continue
        if (Math.hypot(r.x - beacons[b].x, r.y - beacons[b].y) <= senseR) {
          s.found[b] = true
          s.foundAt[b] = s.t
          s.events.push({ type: 'beacon', x: beacons[b].x, y: beacons[b].y })
          break
        }
      }
    }
  }

  // Ace: measure formation quality
  if (shape && m.phases) {
    s.quality = formationQuality(s, shape)
    const ph = m.phases[s.phaseIdx]
    if (s.t >= ph.end - ph.window && s.t < ph.end) {
      s.phaseScores[s.phaseIdx] += s.quality
      s.phaseSamples[s.phaseIdx]++
    }
  }

  if (liveCount > 0) {
    s.stats.sampleCount++
    s.stats.avgNeighbours += (neighbourSum / liveCount - s.stats.avgNeighbours) / s.stats.sampleCount
    s.stats.strayTime += strays / liveCount
  }

  s.t += DT
  s.steps++

  // End conditions
  if (s.t >= m.timeLimit) s.done = true
  if (m.food && s.arrived >= n) s.done = true
  if (m.battery) {
    if (robots.every((r) => !r.alive)) s.done = true
    if (s.found.length && s.found.every(Boolean)) s.done = true
  }
  if (s.done && m.battery) s.stats.minBatteryEnd = Math.min(...robots.map((r) => r.battery))
}

/** Run a whole mission headless (tests, tuning). */
export function simulate(m: Mission, w: Weights): SimState {
  const s = createSim(m, w)
  while (!s.done) stepSim(s)
  return s
}

// ── Scoring and the debrief ────────────────────────────────────────────────

export interface Outcome {
  stars: number
  score: number
  scoreLabel: string
  lowerIsBetter?: boolean
  headline: string
  /** "Why it happened" — plain language, from the run's own numbers. */
  why: string[]
  stats: { label: string; value: string }[]
}

const pct = (v: number) => `${Math.round(v)}%`

export function coveragePct(s: SimState): number {
  return s.coverableCount ? (100 * s.coveredCount) / s.coverableCount : 0
}

export function aceScores(s: SimState): number[] {
  return s.phaseScores.map((v, i) => (s.phaseSamples[i] ? (100 * v) / s.phaseSamples[i] : 0))
}

export function scoreRun(s: SimState): Outcome {
  const { m, w } = s
  const n = m.robots
  const strayPct = s.stats.sampleCount ? (100 * s.stats.strayTime) / s.stats.sampleCount : 0
  const why: string[] = []

  if (m.tier === 0 || m.tier === 1) {
    const arrivedPct = (100 * s.arrived) / n
    const t = s.t
    let stars = 0
    if (m.tier === 0) {
      if (arrivedPct >= 70) stars = 1
      if (arrivedPct >= 85) stars = 2
      if (arrivedPct >= 95 && t <= 35) stars = 3
    } else {
      if (arrivedPct >= 80 && s.crashes <= 12) stars = 1
      if (arrivedPct >= 90 && s.crashes <= 6 && s.bumps <= 30) stars = 2
      if (arrivedPct >= 95 && s.crashes <= 2 && s.bumps <= 15 && t <= 30) stars = 3
    }
    if (m.tier === 0) {
      const followers = s.robots.filter((r) => !r.scout)
      const followersHome = followers.filter((r) => r.arrived).length
      if (w.coh < 0.3 && followersHome < followers.length * 0.7)
        why.push(
          `Only ${n - followers.length} gold scouts can smell the food. With cohesion at ${w.coh.toFixed(1)} the other robots had no reason to stay near them, so the current carried them away.`,
        )
      if (w.radius < 40 && followersHome < followers.length * 0.8)
        why.push(`A sensing radius of ${w.radius} is tiny: each robot could barely see its neighbours, so the group kept breaking into pieces.`)
      if (w.sep > 2 * Math.max(0.2, w.coh) && arrivedPct < 85)
        why.push('Separation was much stronger than cohesion, so the robots pushed each other apart and the swarm spread out too thin to follow the scouts.')
      if (w.goal < 0.6) why.push('Goal-seeking was weak, so even the scouts wandered instead of heading for the food.')
      if (w.ali < 0.2 && arrivedPct < 85) why.push('With almost no alignment, robots did not copy their neighbours’ direction, so the followers zig-zagged instead of swimming with the scouts.')
      if (stars > 0)
        why.unshift(
          `${s.arrived} of ${n} robots reached the food. ${followersHome} of them could not smell it at all — they got there by staying with their neighbours. That is emergence: a few informed robots lead the whole group, and nobody is in charge.`,
        )
      if (why.length === 0) why.push('Try a little more cohesion and alignment so the robots who cannot smell the food stay with the scouts who can.')
    } else {
      if (w.avoid < 0.5 && s.crashes > 6)
        why.push(`Obstacle avoidance was ${w.avoid.toFixed(1)}, so robots only noticed the rock wall by hitting it: ${s.crashes} crashes. Avoidance lets them feel the wall before they touch it and slide along it to the gap.`)
      if (w.sep < 0.8 && s.bumps > 15) why.push(`Separation was low, so robots squeezed together in the gap and bumped ${s.bumps} times. More separation keeps a safe space around each robot.`)
      if (w.coh > 1.5 && s.bumps > 15) why.push('Strong cohesion packed the swarm into a tight ball — too fat to pass the gap without bumping.')
      if (w.ali < 0.3 && s.bumps > 15) why.push('With little alignment the robots crossed each other’s paths in the gap. Alignment makes them line up and flow through like a school of fish.')
      if (arrivedPct < 80 && s.t >= m.timeLimit - 0.01)
        why.push(`Time ran out with ${n - s.arrived} robots still on the wrong side. Robots that hit the wall head-on can get stuck pushing against it — avoidance and a bit more goal-seeking help them slide along to the gap.`)
      if (stars > 0)
        why.unshift(
          `${s.arrived} of ${n} robots made it through with ${s.crashes} wall crashes and ${s.bumps} bumps. No robot planned a route: each one just kept its space, matched its neighbours and steered away from rocks, and a tidy queue formed by itself at the gap.`,
        )
      if (why.length === 0) why.push('Balance it: enough avoidance to feel the wall early, enough separation to keep space, and alignment so they queue instead of jostle.')
    }
    const safety = Math.max(0, Math.round(arrivedPct - 3 * s.crashes - s.bumps))
    return {
      stars,
      score: m.tier === 0 ? Math.round(arrivedPct) : safety,
      scoreLabel: m.tier === 0 ? '% reached the food' : 'safe-passage score',
      headline: stars > 0 ? 'The swarm made it!' : 'Not enough robots made it.',
      why,
      stats: [
        { label: 'Reached food', value: `${s.arrived}/${n}` },
        { label: 'Time', value: `${t.toFixed(1)} s` },
        { label: 'Wall crashes', value: String(s.crashes) },
        { label: 'Bumps', value: String(s.bumps) },
        { label: 'Alone (avg)', value: pct(strayPct) },
      ],
    }
  }

  if (m.tier === 2) {
    const sc = aceScores(s)
    const total = sc.reduce((a, b) => a + b, 0) / sc.length
    let stars = 0
    if (total >= 62 && sc.every((v) => v >= 45)) stars = 1
    if (total >= 68 && sc.every((v) => v >= 50)) stars = 2
    if (total >= 80 && sc.every((v) => v >= 65)) stars = 3
    const [ring, heal, line] = sc
    const spacingAfter = (2 * Math.PI * 200) / (m.robots - (m.loss?.count ?? 0))
    if (w.coh > 0.6 && ring < 60)
      why.push(`Cohesion pulls each robot toward the middle of its neighbours — on a ring that is INSIDE the ring, so it squashed the shape (cohesion ${w.coh.toFixed(1)}). Shapes need cohesion low or off.`)
    if (w.shape < 0.6) why.push('Shape pull was weak, so robots did not know where the light-show shape was.')
    if (w.sep < 0.6 && (ring < 60 || line < 60)) why.push('With little separation, robots bunched up on one side of the shape and left the rest empty. Separation spreads them evenly.')
    if (heal < ring - 12 && w.radius < spacingAfter * 1.2)
      why.push(
        `After 12 robots were lost, the gaps on the ring grew to about ${Math.round(spacingAfter)} units — wider than the sensing radius of ${w.radius}. A robot cannot spread into a gap it cannot sense, so the holes stayed. A bigger radius lets the survivors feel the gap and close it.`,
      )
    if (line < ring - 15) why.push('The line was harder than the ring: the robots at the two ends only have neighbours on one side, so separation must push them all the way out to the ends.')
    if (stars > 0)
      why.unshift(
        `Formation scores — ring ${Math.round(ring)}, healed ring ${Math.round(heal)}, line ${Math.round(line)}. No robot had a fixed spot: each one just followed your local rules, and the shape appeared — and repaired itself when robots dropped out. That self-healing is why engineers love swarms.`,
      )
    if (why.length === 0) why.push('Try: separation high, cohesion off, a firm shape pull, and a sensing radius bigger than the gap between robots.')
    return {
      stars,
      score: Math.round(total),
      scoreLabel: 'formation score',
      headline: stars > 0 ? 'Formation held!' : 'The shape fell apart.',
      why,
      stats: [
        { label: 'Ring', value: String(Math.round(ring)) },
        { label: 'Healed ring', value: String(Math.round(heal)) },
        { label: 'Line', value: String(Math.round(line)) },
        { label: 'Bumps', value: String(s.bumps) },
      ],
    }
  }

  // Legend
  const cov = coveragePct(s)
  const found = s.found.filter(Boolean).length
  const nb = s.found.length
  const allFoundAt = s.found.every(Boolean) ? Math.max(...s.foundAt) : m.timeLimit
  const collisions = s.crashes + s.bumps
  const score = Math.max(0, Math.round(found * 100 + cov * 6 + (m.timeLimit - allFoundAt) * 4 - collisions * 3))
  let stars = 0
  if (found >= 4 && cov >= 60) stars = 1
  if (found >= 5 && cov >= 80 && collisions <= 20) stars = 2
  if (found >= 6 && cov >= 92 && collisions <= 5) stars = 3
  if (w.explore < 0.4 || w.trail < 0.4)
    why.push(
      w.trail < 0.4
        ? 'The robots left almost no trail, so “explore” had nothing to read: nobody knew where the others had already searched, and they kept re-checking the same water.'
        : 'Exploration was weak, so robots ignored the shared trail and kept searching places the swarm had already covered.',
    )
  if (w.coh > 0.8)
    why.push(`Cohesion ${w.coh.toFixed(1)} kept the swarm in one ball. A ball of ${n} robots searches like one big robot — for searching, you want them to spread out.`)
  if (w.radius > 110) why.push(`A ${w.radius}-unit sensing radius sees a lot, but sensing costs power: the batteries ran flat sooner.`)
  if (w.radius < 45) why.push(`With a ${w.radius}-unit radius each robot searched a thin strip, so coverage grew slowly.`)
  if (collisions > 40) why.push(`${collisions} collisions — raise separation and avoidance so robots don’t waste battery bumping into each other and the rocks.`)
  if (stars > 0)
    why.unshift(
      `Found ${found} of ${nb} beacons and searched ${Math.round(cov)}% of the reef. Each robot only saw a small circle, but by leaving a fading trail and steering away from trails, the swarm shared one memory of where it had been — like ants, which do the same with chemical pheromones.`,
    )
  if (why.length === 0) why.push('Spread out (separation up, cohesion down), leave a trail and explore away from it, and pick a sensing radius that sees enough without draining the battery.')
  return {
    stars,
    score,
    scoreLabel: 'rescue points',
    headline: stars > 0 ? 'Rescue complete!' : 'Not enough of the reef was searched.',
    why,
    stats: [
      { label: 'Beacons', value: `${found}/${nb}` },
      { label: 'Coverage', value: pct(cov) },
      { label: 'Time', value: `${s.t.toFixed(1)} s` },
      { label: 'Collisions', value: String(collisions) },
    ],
  }
}
