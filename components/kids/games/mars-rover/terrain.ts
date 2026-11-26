// components/kids/games/mars-rover/terrain.ts
// Mars Rover Command — tier settings and the seeded, procedural Mars map.
// Pure data + maths, no DOM. The same seed always builds the same map, so a
// score is fair, and every map is checked to have a safe route before it is
// used.

export type TierIndex = 0 | 1 | 2 | 3

export type RuleId = 'haz' | 'vo' | 'power' | 'aegis' | 'scifirst'

export interface TierConfig {
  name: string
  W: number
  H: number
  /** One-way light time Earth→Mars in mission minutes (real range: about 3–22). */
  delay: number
  /** Mission minutes that pass per real second (time is compressed). */
  minPerSec: number
  /** Earth-clock limit for the mission, in minutes after the first send. */
  timeLimit: number
  mappedRocks: number
  hiddenRocks: number
  /** Number of deep-sand (dune) traps, visible from orbit. */
  dunes: number
  /** Patches of loose, slippery sand (wheel slip). */
  slip: boolean
  steep: boolean
  /** Cadet turns in 90° steps only. */
  turn90Only: boolean
  targets: number
  /** Bonus rocks the rover can only find on its own (AEGIS). */
  bonusRocks: number
  /** Legend: power budget, relay passes, photos, AutoNav. */
  legend: boolean
  /** Cadet–Ace: the rover sends an end-of-drive picture for free. */
  autoImage: boolean
  rules: RuleId[]
  maxCmds: number
  /** Uplinks for 3★ / 2★ (Cadet–Ace). */
  starUplinks: [number, number]
  /** Legend: Mars local solar time (minutes after midnight) at mission start. */
  startClock: number
}

export const TIERS: TierConfig[] = [
  {
    name: 'Cadet',
    W: 14,
    H: 10,
    delay: 4,
    minPerSec: 2.5,
    timeLimit: 200,
    mappedRocks: 12,
    hiddenRocks: 0,
    dunes: 0,
    slip: false,
    steep: false,
    turn90Only: true,
    targets: 1,
    bonusRocks: 0,
    legend: false,
    autoImage: true,
    rules: [],
    maxCmds: 12,
    starUplinks: [2, 3],
    startClock: 9 * 60,
  },
  {
    name: 'Pilot',
    W: 16,
    H: 11,
    delay: 12,
    minPerSec: 4,
    timeLimit: 280,
    mappedRocks: 14,
    hiddenRocks: 0,
    dunes: 3,
    slip: false,
    steep: true,
    turn90Only: false,
    targets: 1,
    bonusRocks: 0,
    legend: false,
    autoImage: true,
    rules: [],
    maxCmds: 14,
    starUplinks: [1, 2],
    startClock: 9 * 60,
  },
  {
    name: 'Ace',
    W: 18,
    H: 12,
    delay: 20,
    minPerSec: 5,
    timeLimit: 380,
    mappedRocks: 12,
    hiddenRocks: 11,
    dunes: 1,
    slip: true,
    steep: true,
    turn90Only: false,
    targets: 1,
    bonusRocks: 0,
    legend: false,
    autoImage: true,
    rules: ['haz', 'vo'],
    maxCmds: 14,
    starUplinks: [1, 2],
    startClock: 9 * 60,
  },
  {
    name: 'Legend',
    W: 20,
    H: 13,
    delay: 22,
    minPerSec: 8,
    timeLimit: 17 * 60 + 15 - (7 * 60 + 30),
    mappedRocks: 14,
    hiddenRocks: 13,
    dunes: 3,
    slip: true,
    steep: true,
    turn90Only: false,
    targets: 4,
    bonusRocks: 3,
    legend: true,
    autoImage: false,
    rules: ['haz', 'vo', 'power', 'aegis', 'scifirst'],
    maxCmds: 16,
    starUplinks: [1, 2],
    startClock: 7 * 60 + 30,
  },
]

/** Legend: total points of the four targets on every map. */
export const LEGEND_TARGET_TOTAL = 240

/**
 * Legend "par" per map: the best single-plan score our solver found by trying
 * every target order (2–4 targets), every set of onboard rules and a 0–120 min
 * dawn wait (4,800 plans per map). ★★★ needs 85% of par, ★★ 55%. Re-run the
 * solver and update these numbers if the Legend simulation or maps change.
 */
export const LEGEND_PAR = [253, 235, 299, 209, 257, 292]

/** [★★★ line, ★★ line, par] for a Legend map. */
export function legendStarLines(mapNo: number): [number, number, number] {
  const par = LEGEND_PAR[mapNo] ?? 250
  return [Math.round(par * 0.85), Math.round(par * 0.55), par]
}

export interface Target {
  id: number
  x: number
  y: number
  name: string
  /** Science points when its data reaches Earth. */
  value: number
  color: string
}

export interface BonusRock {
  id: number
  x: number
  y: number
}

export interface MarsMap {
  seed: number
  /** Which of the tier's maps this is (0-based). */
  no: number
  W: number
  H: number
  /** Height 0..1 per cell (for slope + shading). */
  height: number[]
  /** Cell flags. */
  rock: boolean[]
  /** Small rocks too small for the orbiter camera to see. */
  hidden: boolean[]
  dune: boolean[]
  steep: boolean[]
  /** Wheel slip 0..1 on loose sand (0 = firm ground). */
  slip: number[]
  start: { x: number; y: number; h: number }
  targets: Target[]
  bonus: BonusRock[]
  /** Craters for decoration only: centre (cells) and radius (cells). */
  craters: { x: number; y: number; r: number }[]
}

// ── seeded randomness ───────────────────────────────────────────────────────

export function mulberry32(a: number): () => number {
  let s = a >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash2(ix: number, iy: number, seed: number): number {
  let h = (ix * 374761393 + iy * 668265263 + seed * 2246822519) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

/** Continuous value noise, 0..1. */
export function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = smooth(x - ix)
  const fy = smooth(y - iy)
  const a = hash2(ix, iy, seed)
  const b = hash2(ix + 1, iy, seed)
  const c = hash2(ix, iy + 1, seed)
  const d = hash2(ix + 1, iy + 1, seed)
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}

/** Terrain height at a continuous cell position (used by the renderer too). */
export function heightAt(x: number, y: number, seed: number): number {
  return valueNoise(x / 5.5, y / 5.5, seed) * 0.62 + valueNoise(x / 2.4, y / 2.4, seed + 11) * 0.28 + valueNoise(x / 0.9, y / 0.9, seed + 23) * 0.1
}

export const DIRS: readonly [number, number][] = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
]

const SCIENCE_NAMES: { name: string; color: string }[] = [
  { name: 'Layered mudstone', color: '#38bdf8' },
  { name: 'Old riverbed pebbles', color: '#22c55e' },
  { name: 'Carbonate rim', color: '#facc15' },
  { name: 'Shiny iron meteorite', color: '#f472b6' },
]

export const idx = (m: { W: number }, x: number, y: number) => y * m.W + x
export const inside = (m: { W: number; H: number }, x: number, y: number) => x >= 0 && y >= 0 && x < m.W && y < m.H

/** Cells the rover can safely drive on (truth, every hazard). */
export function safeTruth(m: MarsMap, x: number, y: number): boolean {
  if (!inside(m, x, y)) return false
  const i = idx(m, x, y)
  return !m.rock[i] && !m.hidden[i] && !m.dune[i] && !m.steep[i]
}

/** Shortest safe route length (moves) between two cells, or -1. */
export function routeLength(m: MarsMap, from: { x: number; y: number }, to: { x: number; y: number }, fourWay: boolean): number {
  const dist = new Array<number>(m.W * m.H).fill(-1)
  const q: number[] = [idx(m, from.x, from.y)]
  dist[q[0]] = 0
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi]
    const cx = c % m.W
    const cy = Math.floor(c / m.W)
    if (cx === to.x && cy === to.y) return dist[c]
    for (let d = 0; d < 8; d++) {
      if (fourWay && d % 2 === 1) continue
      const nx = cx + DIRS[d][0]
      const ny = cy + DIRS[d][1]
      if (!safeTruth(m, nx, ny)) continue
      if (d % 2 === 1 && (!safeTruth(m, nx, cy) || !safeTruth(m, cx, ny))) continue
      const ni = idx(m, nx, ny)
      if (dist[ni] >= 0) continue
      dist[ni] = dist[c] + 1
      q.push(ni)
    }
  }
  return -1
}

function buildOnce(tier: TierConfig, seed: number): MarsMap {
  const { W, H } = tier
  const rnd = mulberry32(seed)
  const N = W * H
  const height: number[] = []
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) height.push(heightAt(x + 0.5, y + 0.5, seed))

  const rock = new Array<boolean>(N).fill(false)
  const hidden = new Array<boolean>(N).fill(false)
  const dune = new Array<boolean>(N).fill(false)
  const steep = new Array<boolean>(N).fill(false)
  const slip = new Array<number>(N).fill(0)

  const startY = 2 + Math.floor(rnd() * (H - 4))
  const start = { x: 1, y: startY, h: 2 }

  // Slopes: the steepest ~9% of cells (by local height change).
  if (tier.steep) {
    const grads: { i: number; g: number }[] = []
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const gx = heightAt(x + 1, y + 0.5, seed) - heightAt(x, y + 0.5, seed)
        const gy = heightAt(x + 0.5, y + 1, seed) - heightAt(x + 0.5, y, seed)
        grads.push({ i: idx({ W }, x, y), g: Math.hypot(gx, gy) })
      }
    grads.sort((a, b) => b.g - a.g)
    const n = Math.round(N * 0.09)
    for (let k = 0; k < n; k++) steep[grads[k].i] = true
  }

  // Loose sand: a second noise field.
  if (tier.slip) {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const s = valueNoise(x / 3.2, y / 3.2, seed + 101)
        if (s > 0.52) slip[idx({ W }, x, y)] = Math.min(0.7, 0.3 + (s - 0.52) * 1.6)
      }
  }

  // Dunes (deep sand): small blobs.
  for (let k = 0; k < tier.dunes; k++) {
    const cx = 4 + Math.floor(rnd() * (W - 7))
    const cy = 1 + Math.floor(rnd() * (H - 2))
    const len = 2 + Math.floor(rnd() * 2)
    const vertical = rnd() < 0.6
    for (let j = 0; j < len; j++) {
      const x = vertical ? cx : cx + j
      const y = vertical ? cy + j : cy
      if (inside({ W, H }, x, y)) {
        dune[idx({ W }, x, y)] = true
        steep[idx({ W }, x, y)] = false
      }
    }
  }

  const free = (x: number, y: number) => {
    const i = idx({ W }, x, y)
    return !rock[i] && !hidden[i] && !dune[i] && !steep[i]
  }

  // Targets on the far side of the map.
  const targets: Target[] = []
  const names = [...SCIENCE_NAMES]
  for (let t = 0; t < tier.targets; t++) {
    for (let tries = 0; tries < 200; tries++) {
      const minX = tier.targets === 1 ? W - 5 : 5
      const x = minX + Math.floor(rnd() * (W - 1 - minX))
      const y = 1 + Math.floor(rnd() * (H - 2))
      if (!free(x, y)) continue
      if (Math.abs(y - startY) < (tier.targets === 1 ? 2 : 0)) continue
      if (targets.some((o) => Math.max(Math.abs(o.x - x), Math.abs(o.y - y)) < 4)) continue
      if (Math.max(Math.abs(start.x - x), Math.abs(start.y - y)) < 5) continue
      const far = Math.hypot(x - start.x, y - start.y)
      const nm = names.splice(Math.floor(rnd() * names.length), 1)[0]
      targets.push({ id: t, x, y, name: nm.name, color: nm.color, value: Math.round((tier.legend ? 20 + far * 3.2 : 100) / 5) * 5 })
      break
    }
  }

  // Legend: farther targets are worth more, but every map offers the same
  // total (about 240 points), so the star thresholds are fair on every map.
  if (tier.legend && targets.length) {
    const raw = targets.map((t) => 20 + Math.hypot(t.x - start.x, t.y - start.y) * 3.2)
    const sum = raw.reduce((s, v) => s + v, 0)
    targets.forEach((t, i) => (t.value = Math.round((LEGEND_TARGET_TOTAL * raw[i]) / sum / 5) * 5))
  }

  const reserved = (x: number, y: number) =>
    (Math.abs(x - start.x) <= 1 && Math.abs(y - start.y) <= 1) || targets.some((t) => t.x === x && t.y === y)

  const place = (arr: boolean[], count: number) => {
    let placed = 0
    for (let tries = 0; placed < count && tries < 600; tries++) {
      const x = Math.floor(rnd() * W)
      const y = Math.floor(rnd() * H)
      if (reserved(x, y) || !free(x, y)) continue
      arr[idx({ W }, x, y)] = true
      placed++
    }
  }
  place(rock, tier.mappedRocks)
  place(hidden, tier.hiddenRocks)

  // Bias some hidden rocks onto the straight line start→target, where a
  // planner using only the orbital map would drive.
  if (tier.hiddenRocks > 0 && targets.length) {
    const t0 = targets[0]
    for (let k = 1; k <= 2; k++) {
      const f = k / 3
      const x = Math.round(start.x + (t0.x - start.x) * f)
      const y = Math.round(start.y + (t0.y - start.y) * f)
      if (!reserved(x, y) && free(x, y)) hidden[idx({ W }, x, y)] = true
    }
  }

  // Clear start + targets of everything.
  for (const c of [start, ...targets]) {
    const i = idx({ W }, c.x, c.y)
    rock[i] = hidden[i] = dune[i] = steep[i] = false
  }

  const bonus: BonusRock[] = []
  for (let b = 0; b < tier.bonusRocks; b++) {
    for (let tries = 0; tries < 200; tries++) {
      const x = 3 + Math.floor(rnd() * (W - 4))
      const y = Math.floor(rnd() * H)
      if (reserved(x, y) || !free(x, y)) continue
      if (bonus.some((o) => o.x === x && o.y === y)) continue
      bonus.push({ id: b, x, y })
      break
    }
  }

  const craters: { x: number; y: number; r: number }[] = []
  for (let k = 0; k < 3 + Math.floor(W / 6); k++) craters.push({ x: rnd() * W, y: rnd() * H, r: 0.6 + rnd() * 1.6 })

  return { seed, no: 0, W, H, height, rock, hidden, dune, steep, slip, start, targets, bonus, craters }
}

/** Build a solvable map for a tier. Deterministic for (tier, mapNo). */
export function buildMap(tierIndex: TierIndex, mapNo: number): MarsMap {
  const tier = TIERS[tierIndex]
  const base = 7919 * (tierIndex + 1) + 104729 * mapNo
  for (let attempt = 0; attempt < 80; attempt++) {
    const m = buildOnce(tier, base + attempt * 31)
    if (m.targets.length < tier.targets) continue
    let ok = true
    let longest = 0
    for (const t of m.targets) {
      const L = routeLength(m, m.start, t, tier.turn90Only)
      if (L < 0) {
        ok = false
        break
      }
      longest = Math.max(longest, L)
    }
    // Reject maps whose shortest safe route is a long detour (more than 6
    // moves longer than the straight line), so a good plan fits within the
    // command limit. Nothing here forces a hazard onto the straight line; Ace
    // and Legend place hidden rocks on it on purpose in buildOnce.
    if (ok && tier.targets === 1) {
      const t = m.targets[0]
      const direct = tier.turn90Only ? Math.abs(t.x - m.start.x) + Math.abs(t.y - m.start.y) : Math.max(Math.abs(t.x - m.start.x), Math.abs(t.y - m.start.y))
      if (longest > direct + 6) ok = false
    }
    if (ok) {
      m.no = mapNo
      return m
    }
  }
  // Fallback: the last attempt with its hazards cleared (never reached in practice).
  const m = buildOnce(tier, base)
  m.rock.fill(false)
  m.hidden.fill(false)
  m.dune.fill(false)
  m.steep.fill(false)
  m.no = mapNo
  return m
}

export const MAPS_PER_TIER = 6
