// components/kids/games/maze-mapper/sim.ts
// Maze Mapper — the simulation underneath The Labyrinth. Pure TypeScript, no
// React, no DOM: the game client and the headless reference runs both use it.
//
// What is modelled (and what is not):
//  - The maze is a seeded "block" grid: every square is either wall or floor,
//    exactly like a robot's occupancy grid. A depth-first carve makes a perfect
//    maze; removing some walls ("braiding") adds loops and free-standing wall
//    islands, which is what defeats a wall-follower.
//  - The robot has a range sensor with 4 or 8 beams. Each beam walks cell by
//    cell up to its range and reports the distance to the first wall.
//  - The map is a log-odds occupancy grid (Thrun, Burgard & Fox, Probabilistic
//    Robotics, ch. 9): each reading ADDS evidence — "free" along the beam,
//    "occupied" at its end — and a cell is called a wall only when the evidence
//    passes a trust threshold. With noise (Legend), one reading can lie; many
//    readings out-vote it.
//  - Legend adds wheel slip: a commanded move sometimes spins the wheels
//    without moving. The robot's IMU notices, so its position stays known (we
//    do not simulate full SLAM — real robots must also estimate their pose).
//  - Planners: breadth-first search (BFS), A* with the Manhattan heuristic and
//    greedy best-first, all on the robot's OWN map, never the hidden truth.
//
// Every random number comes from a seeded generator, so the same maze and the
// same choices always give the same run — a fair score and a fair comparison.

export type TierIndex = 0 | 1 | 2 | 3

// ── Seeded randomness ────────────────────────────────────────────────────────

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

/**
 * A reproducible random number in [0, 1) for one particular reading. Noise is
 * keyed by WHERE and WHEN it happens (square, beam, how many times this square
 * has been scanned), not drawn from one shared stream, so changing a setting
 * only changes the readings it really affects. Real sensor noise is independent
 * from reading to reading; this keeps that and makes it repeatable.
 */
export function hash01(seed: number, a: number, b: number, c: number, d: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0
  for (const v of [a, b, c, d]) {
    h = Math.imul(h ^ (v >>> 0), 0x85ebca6b) >>> 0
    h = (h ^ (h >>> 13)) >>> 0
    h = Math.imul(h, 0xc2b2ae35) >>> 0
    h = (h ^ (h >>> 16)) >>> 0
  }
  return h / 4294967296
}

// ── Directions ───────────────────────────────────────────────────────────────

/** 0 = North (up), 1 = East, 2 = South, 3 = West. */
export const DX4 = [0, 1, 0, -1] as const
export const DY4 = [-1, 0, 1, 0] as const
export const DIR_NAMES = ['north', 'east', 'south', 'west'] as const

/** 8 beam directions, clockwise from North. Even indices are the 4 straight ones. */
export const DIR8: readonly (readonly [number, number])[] = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
]

// ── Tier settings ────────────────────────────────────────────────────────────

export interface TierConfig {
  /** Maze size in "rooms" (the block grid is 2n+1 squares). */
  cw: number
  ch: number
  /** Walls knocked out after carving: more loops, more islands. */
  loops: number
  beams: 4 | 8
  /** Beam range in squares. */
  range: number
  /** Chance a beam's distance is off by one square. */
  noise: number
  /** Chance a beam returns nothing at all. */
  dropout: number
  /** Chance a move slips (wheels spin, robot stays). */
  slip: number
  /** Log-odds added for "this square is free" / "this square is a wall". */
  lFree: number
  lOcc: number
  /** Default trust threshold (probability) before a square counts as known. */
  trust: number
  bumpCost: number
  /** Battery cost of each extra scan after the first at a stop. */
  extraScanCost: number
  /** Battery cost of each square a planner examines (computer energy). */
  computeCost: number
}

export const TIER_CONFIG: Record<TierIndex, TierConfig> = {
  0: { cw: 6, ch: 6, loops: 3, beams: 4, range: 4, noise: 0, dropout: 0, slip: 0, lFree: -3, lOcc: 3, trust: 0.7, bumpCost: 1, extraScanCost: 0, computeCost: 0 },
  1: { cw: 8, ch: 8, loops: 10, beams: 4, range: 3, noise: 0, dropout: 0, slip: 0, lFree: -3, lOcc: 3, trust: 0.7, bumpCost: 1, extraScanCost: 0, computeCost: 0 },
  2: { cw: 10, ch: 9, loops: 16, beams: 8, range: 3, noise: 0, dropout: 0, slip: 0, lFree: -3, lOcc: 3, trust: 0.7, bumpCost: 1, extraScanCost: 0, computeCost: 0 },
  3: { cw: 11, ch: 10, loops: 20, beams: 8, range: 4, noise: 0.2, dropout: 0.06, slip: 0.08, lFree: -0.7, lOcc: 0.9, trust: 0.8, bumpCost: 2, extraScanCost: 0.5, computeCost: 0.05 },
}

export const MAZES_PER_TIER = 3

export function mazeSeed(tier: TierIndex, idx: number): number {
  return 7919 * (tier + 1) + 104729 * (idx + 1) + 17
}

const L_CLAMP = 6

// ── Maze ─────────────────────────────────────────────────────────────────────

export interface Maze {
  W: number
  H: number
  /** 1 = wall, 0 = floor. Index = y * W + x. */
  wall: Uint8Array
  start: number
  startHeading: number
  exit: number
  /** Floor squares in the maze (all reachable). */
  freeCount: number
  /** Connected wall group of each wall square (-1 for floor). */
  wallComp: Int32Array
  /** The wall group that touches the outside edge. */
  outerComp: number
  seed: number
}

export function inBounds(W: number, H: number, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < W && y < H
}

function shuffle<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const t = arr[i]
    arr[i] = arr[j]
    arr[j] = t
  }
}

function carve(seed: number, cw: number, ch: number, loops: number): Maze {
  const rng = mulberry32(seed)
  const W = 2 * cw + 1
  const H = 2 * ch + 1
  const wall = new Uint8Array(W * H).fill(1)
  const visited = new Uint8Array(cw * ch)
  const stack: number[] = [0]
  visited[0] = 1
  wall[1 * W + 1] = 0
  while (stack.length) {
    const c = stack[stack.length - 1]
    const cx = c % cw
    const cy = Math.floor(c / cw)
    const opts: number[] = []
    for (let d = 0; d < 4; d++) {
      const nx = cx + DX4[d]
      const ny = cy + DY4[d]
      if (nx >= 0 && ny >= 0 && nx < cw && ny < ch && !visited[ny * cw + nx]) opts.push(d)
    }
    if (!opts.length) {
      stack.pop()
      continue
    }
    const d = opts[Math.floor(rng() * opts.length)]
    const nx = cx + DX4[d]
    const ny = cy + DY4[d]
    wall[(2 * cy + 1 + DY4[d]) * W + (2 * cx + 1 + DX4[d])] = 0
    wall[(2 * ny + 1) * W + (2 * nx + 1)] = 0
    visited[ny * cw + nx] = 1
    stack.push(ny * cw + nx)
  }
  // Braid: knock out interior wall segments that sit between two rooms.
  const cands: number[] = []
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      if (!wall[y * W + x]) continue
      if ((x % 2 === 1 && y % 2 === 0) || (x % 2 === 0 && y % 2 === 1)) cands.push(y * W + x)
    }
  shuffle(cands, rng)
  for (let k = 0; k < Math.min(loops, cands.length); k++) wall[cands[k]] = 0

  // Exit: a gap in the east wall, in the lower part of the maze.
  const rows: number[] = []
  for (let y = 1; y < H - 1; y += 2) if (y >= H / 3) rows.push(y)
  const ey = rows[Math.floor(rng() * rows.length)]
  const exit = ey * W + (W - 1)
  wall[exit] = 0

  // Wall groups (4-connected).
  const wallComp = new Int32Array(W * H).fill(-1)
  let comp = 0
  for (let i = 0; i < W * H; i++) {
    if (!wall[i] || wallComp[i] >= 0) continue
    const q = [i]
    wallComp[i] = comp
    while (q.length) {
      const j = q.pop() as number
      const jx = j % W
      const jy = Math.floor(j / W)
      for (let d = 0; d < 4; d++) {
        const nx = jx + DX4[d]
        const ny = jy + DY4[d]
        if (!inBounds(W, H, nx, ny)) continue
        const n = ny * W + nx
        if (wall[n] && wallComp[n] < 0) {
          wallComp[n] = comp
          q.push(n)
        }
      }
    }
    comp++
  }
  let freeCount = 0
  for (let i = 0; i < W * H; i++) if (!wall[i]) freeCount++
  return { W, H, wall, start: 1 * W + 1, startHeading: 1, exit, freeCount, wallComp, outerComp: wallComp[0], seed }
}

/** One wall-follower step on the TRUE maze (adjacent squares are sensed perfectly in Pilot). */
export function followerDir(maze: Maze, pos: number, heading: number, hand: 'left' | 'right'): number {
  const order = hand === 'left' ? [heading + 3, heading, heading + 1, heading + 2] : [heading + 1, heading, heading + 3, heading + 2]
  const x = pos % maze.W
  const y = Math.floor(pos / maze.W)
  for (const o of order) {
    const d = o % 4
    const nx = x + DX4[d]
    const ny = y + DY4[d]
    if (inBounds(maze.W, maze.H, nx, ny) && !maze.wall[ny * maze.W + nx]) return d
  }
  return (heading + 2) % 4
}

export interface FollowRun {
  escaped: boolean
  steps: number
  /** Wall group the robot's hand was on when it looped (-1 if it escaped). */
  loopComp: number
}

/** Run a wall-follower on the true maze until it escapes or repeats a state. */
export function runFollower(maze: Maze, pos: number, heading: number, hand: 'left' | 'right'): FollowRun {
  const seen = new Set<number>()
  let p = pos
  let h = heading
  let steps = 0
  const compCount = new Map<number, number>()
  seen.add(p * 4 + h)
  for (let guard = 0; guard < 20000; guard++) {
    const d = followerDir(maze, p, h, hand)
    p = (Math.floor(p / maze.W) + DY4[d]) * maze.W + (p % maze.W) + DX4[d]
    h = d
    steps++
    if (p === maze.exit) return { escaped: true, steps, loopComp: -1 }
    const c = handWallComp(maze, p, h, hand)
    if (c >= 0) compCount.set(c, (compCount.get(c) ?? 0) + 1)
    const key = p * 4 + h
    if (seen.has(key)) {
      let best = -1
      let bestN = -1
      compCount.forEach((n, k) => {
        if (n > bestN) {
          best = k
          bestN = n
        }
      })
      return { escaped: false, steps, loopComp: best }
    }
    seen.add(key)
  }
  return { escaped: false, steps, loopComp: -1 }
}

/** The wall group under the robot's hand (the square on its hand side). */
export function handWallComp(maze: Maze, pos: number, heading: number, hand: 'left' | 'right'): number {
  const d = hand === 'left' ? (heading + 3) % 4 : (heading + 1) % 4
  const x = (pos % maze.W) + DX4[d]
  const y = Math.floor(pos / maze.W) + DY4[d]
  if (!inBounds(maze.W, maze.H, x, y)) return -1
  return maze.wallComp[y * maze.W + x]
}

/** BFS distances on the TRUE maze (for the optimal-path reveal and budgets). */
export function trueDistances(maze: Maze, from: number): Int32Array {
  const dist = new Int32Array(maze.W * maze.H).fill(-1)
  dist[from] = 0
  const q = [from]
  for (let h = 0; h < q.length; h++) {
    const c = q[h]
    const x = c % maze.W
    const y = Math.floor(c / maze.W)
    for (let d = 0; d < 4; d++) {
      const nx = x + DX4[d]
      const ny = y + DY4[d]
      if (!inBounds(maze.W, maze.H, nx, ny)) continue
      const n = ny * maze.W + nx
      if (maze.wall[n] || dist[n] >= 0) continue
      dist[n] = dist[c] + 1
      q.push(n)
    }
  }
  return dist
}

export function truePath(maze: Maze, from: number, to: number): number[] {
  const dist = trueDistances(maze, to)
  if (dist[from] < 0) return []
  const path: number[] = []
  let c = from
  while (c !== to) {
    const x = c % maze.W
    const y = Math.floor(c / maze.W)
    for (let d = 0; d < 4; d++) {
      const nx = x + DX4[d]
      const ny = y + DY4[d]
      if (!inBounds(maze.W, maze.H, nx, ny)) continue
      const n = ny * maze.W + nx
      if (dist[n] === dist[c] - 1 && dist[n] >= 0) {
        c = n
        break
      }
    }
    path.push(c)
  }
  return path
}

export interface PilotSetup {
  maze: Maze
  left: FollowRun
  right: FollowRun
}

/**
 * Pilot needs a start square where wall-following is a real decision: ideally
 * both hands trace a free-standing island and loop forever. We search the
 * seeded variants in order, so the choice is still deterministic.
 */
function pilotMaze(seed: number, cfg: TierConfig): PilotSetup {
  let fallback: PilotSetup | null = null
  for (let k = 0; k < 40; k++) {
    const m = carve(seed + k * 31337, cfg.cw, cfg.ch, cfg.loops)
    const exitDist = trueDistances(m, m.exit)
    let best: { pos: number; h: number; score: number; l: FollowRun; r: FollowRun; both: boolean } | null = null
    for (let i = 0; i < m.W * m.H; i++) {
      if (m.wall[i] || i === m.exit) continue
      const x = i % m.W
      const y = Math.floor(i / m.W)
      if (x % 2 === 0 || y % 2 === 0) continue
      if (exitDist[i] < 10) continue
      for (let h = 0; h < 4; h++) {
        const nx = x + DX4[h]
        const ny = y + DY4[h]
        if (m.wall[ny * m.W + nx]) continue
        const l = runFollower(m, i, h, 'left')
        const r = runFollower(m, i, h, 'right')
        const both = !l.escaped && !r.escaped
        const one = !l.escaped || !r.escaped
        if (!one) continue
        const score = (both ? 1000 : 0) + exitDist[i]
        if (!best || score > best.score) best = { pos: i, h, score, l, r, both }
      }
    }
    if (best) {
      const setup: PilotSetup = { maze: { ...m, start: best.pos, startHeading: best.h, seed: seed + k * 31337 }, left: best.l, right: best.r }
      if (best.both) return setup
      if (!fallback) fallback = setup
    }
  }
  if (fallback) return fallback
  const m = carve(seed, cfg.cw, cfg.ch, cfg.loops)
  return { maze: m, left: runFollower(m, m.start, 1, 'left'), right: runFollower(m, m.start, 1, 'right') }
}

const mazeCache = new Map<string, Maze>()

export function getMaze(tier: TierIndex, idx: number): Maze {
  const key = `${tier}:${idx}`
  const hit = mazeCache.get(key)
  if (hit) return hit
  const cfg = TIER_CONFIG[tier]
  const seed = mazeSeed(tier, idx)
  const m = tier === 1 ? pilotMaze(seed, cfg).maze : carve(seed, cfg.cw, cfg.ch, cfg.loops)
  mazeCache.set(key, m)
  return m
}

// ── Planning ─────────────────────────────────────────────────────────────────

export type PlannerId = 'bfs' | 'astar' | 'greedy'

export interface PlanResult {
  found: boolean
  /** Squares to drive through, start excluded, goal included. */
  path: number[]
  /** Squares in the order the planner examined them (for the wavefront). */
  order: number[]
  /** Steps from the start for each examined square (-1 = not reached). */
  dist: Int32Array
  expanded: number
  algo: PlannerId
}

class MinHeap {
  private k: number[] = []
  private v: number[] = []
  get size(): number {
    return this.v.length
  }
  push(val: number, key: number): void {
    this.k.push(key)
    this.v.push(val)
    let i = this.v.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this.k[p] <= this.k[i]) break
      this.swap(i, p)
      i = p
    }
  }
  pop(): number {
    const top = this.v[0]
    const lk = this.k.pop() as number
    const lv = this.v.pop() as number
    if (this.v.length) {
      this.k[0] = lk
      this.v[0] = lv
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < this.v.length && this.k[l] < this.k[m]) m = l
        if (r < this.v.length && this.k[r] < this.k[m]) m = r
        if (m === i) break
        this.swap(i, m)
        i = m
      }
    }
    return top
  }
  private swap(a: number, b: number): void {
    const tk = this.k[a]
    this.k[a] = this.k[b]
    this.k[b] = tk
    const tv = this.v[a]
    this.v[a] = this.v[b]
    this.v[b] = tv
  }
}

/**
 * Plan on the robot's map. `passable` says which squares the robot believes
 * are floor; `goals` are acceptable end squares (the heuristic aims at the
 * nearest one). BFS ignores the heuristic and fans out evenly — that ripple is
 * the "wavefront" the game draws.
 */
export function plan(W: number, H: number, passable: (i: number) => boolean, start: number, goals: number[], algo: PlannerId): PlanResult {
  const N = W * H
  const dist = new Int32Array(N).fill(-1)
  const parent = new Int32Array(N).fill(-1)
  const closed = new Uint8Array(N)
  const goalSet = new Set(goals)
  const order: number[] = []
  const gx = goals.map((g) => g % W)
  const gy = goals.map((g) => Math.floor(g / W))
  const h = (i: number): number => {
    const x = i % W
    const y = Math.floor(i / W)
    let best = Infinity
    for (let k = 0; k < gx.length; k++) best = Math.min(best, Math.abs(gx[k] - x) + Math.abs(gy[k] - y))
    return best
  }
  dist[start] = 0
  let found = -1
  if (algo === 'bfs') {
    const q = [start]
    for (let head = 0; head < q.length; head++) {
      const c = q[head]
      order.push(c)
      if (goalSet.has(c)) {
        found = c
        break
      }
      const x = c % W
      const y = Math.floor(c / W)
      for (let d = 0; d < 4; d++) {
        const nx = x + DX4[d]
        const ny = y + DY4[d]
        if (!inBounds(W, H, nx, ny)) continue
        const n = ny * W + nx
        if (dist[n] >= 0 || !passable(n)) continue
        dist[n] = dist[c] + 1
        parent[n] = c
        q.push(n)
      }
    }
  } else {
    const heap = new MinHeap()
    heap.push(start, algo === 'astar' ? h(start) : h(start))
    while (heap.size) {
      const c = heap.pop()
      if (closed[c]) continue
      closed[c] = 1
      order.push(c)
      if (goalSet.has(c)) {
        found = c
        break
      }
      const x = c % W
      const y = Math.floor(c / W)
      for (let d = 0; d < 4; d++) {
        const nx = x + DX4[d]
        const ny = y + DY4[d]
        if (!inBounds(W, H, nx, ny)) continue
        const n = ny * W + nx
        if (closed[n] || !passable(n)) continue
        const g = dist[c] + 1
        if (dist[n] >= 0 && dist[n] <= g) continue
        dist[n] = g
        parent[n] = c
        // Tie-break toward larger g (deeper) so A* doesn't fan out on plateaus.
        const key = algo === 'astar' ? g + h(n) - g * 1e-3 : h(n)
        heap.push(n, key)
      }
    }
  }
  const path: number[] = []
  if (found >= 0) {
    let c = found
    while (c !== start) {
      path.push(c)
      c = parent[c]
    }
    path.reverse()
  }
  return { found: found >= 0, path, order, dist, expanded: order.length, algo }
}

export interface RaceRow {
  algo: PlannerId
  /** Squares examined over all trips. */
  expanded: number
  /** Total route length over all trips. */
  steps: number
  /** Trips where this planner's route was longer than the shortest one. */
  longer: number
  /** The worst detour on one trip, in extra steps. */
  maxExtra: number
}

/**
 * A fair planner race: the same seeded trips between floor squares of the
 * real maze, planned by BFS, A* and greedy best-first. Shows the trade-off
 * honestly — squares checked against route length — on long trips, where the
 * difference between the planners actually appears.
 */
export function plannerRace(maze: Maze, trips = 40): RaceRow[] {
  const free: number[] = []
  for (let i = 0; i < maze.W * maze.H; i++) if (!maze.wall[i]) free.push(i)
  const rng = mulberry32(maze.seed ^ 0x2545f491)
  const pass = (i: number): boolean => !maze.wall[i]
  const rows: RaceRow[] = (['bfs', 'astar', 'greedy'] as const).map((algo) => ({ algo, expanded: 0, steps: 0, longer: 0, maxExtra: 0 }))
  let done = 0
  for (let guard = 0; done < trips && guard < trips * 4; guard++) {
    const a = free[Math.floor(rng() * free.length)]
    const b = free[Math.floor(rng() * free.length)]
    if (Math.abs((a % maze.W) - (b % maze.W)) + Math.abs(Math.floor(a / maze.W) - Math.floor(b / maze.W)) < 8) continue
    done++
    const res = rows.map((r) => plan(maze.W, maze.H, pass, a, [b], r.algo))
    const best = Math.min(...res.map((r) => r.path.length))
    res.forEach((r, k) => {
      rows[k].expanded += r.expanded
      rows[k].steps += r.path.length
      const extra = r.path.length - best
      if (extra > 0) {
        rows[k].longer++
        rows[k].maxExtra = Math.max(rows[k].maxExtra, extra)
      }
    })
  }
  return rows
}

// ── The robot and its map ────────────────────────────────────────────────────

export interface Beam {
  /** Start square (robot) and the direction index into DIR8. */
  from: number
  dir: number
  /** Measured length in squares (where the beam ended). */
  len: number
  /** True if the beam reported a wall at its end. */
  hit: boolean
  /** True if the reading was wrong (Legend noise) — shown only in the reveal. */
  wrong: boolean
  dropped: boolean
}

export type MoveResult = 'moved' | 'bump' | 'slip' | 'escaped' | 'blocked'

export const BELIEF_UNKNOWN = 0
export const BELIEF_FREE = 1
export const BELIEF_WALL = 2

export class World {
  readonly tier: TierIndex
  readonly cfg: TierConfig
  readonly maze: Maze
  readonly W: number
  readonly H: number
  pos: number
  heading: number
  battery: number
  batteryMax: number
  steps = 0
  scans = 0
  bumps = 0
  slips = 0
  computeEnergy = 0
  expandedTotal = 0
  plans = 0
  lo: Float32Array
  /** Squares any beam has touched (for "revealed" sparkles). */
  touched: Uint8Array
  visits: Uint16Array
  trail: number[]
  beams: Beam[] = []
  /** Squares that became known in the last scan. */
  newlyKnown: number[] = []
  escaped = false
  /** How many times each square has been scanned / each move tried (noise keys). */
  private scanCount: Uint16Array
  private moveCount: Uint16Array
  private noiseSeed: number
  private lThresh: number

  constructor(tier: TierIndex, mazeIdx: number, batteryMax: number, trust?: number) {
    this.tier = tier
    this.cfg = TIER_CONFIG[tier]
    this.maze = getMaze(tier, mazeIdx)
    this.W = this.maze.W
    this.H = this.maze.H
    this.pos = this.maze.start
    this.heading = this.maze.startHeading
    this.battery = batteryMax
    this.batteryMax = batteryMax
    this.lo = new Float32Array(this.W * this.H)
    this.touched = new Uint8Array(this.W * this.H)
    this.visits = new Uint16Array(this.W * this.H)
    this.visits[this.pos] = 1
    this.trail = [this.pos]
    this.noiseSeed = (this.maze.seed ^ 0x5bd1e995) >>> 0
    this.scanCount = new Uint16Array(this.W * this.H)
    this.moveCount = new Uint16Array(this.W * this.H * 4)
    const p = trust ?? this.cfg.trust
    this.lThresh = Math.log(p / (1 - p))
    // The robot knows the square it is standing on is floor.
    this.lo[this.pos] = -L_CLAMP
  }

  x(i: number = this.pos): number {
    return i % this.W
  }
  y(i: number = this.pos): number {
    return Math.floor(i / this.W)
  }

  belief(i: number): number {
    const l = this.lo[i]
    if (l > this.lThresh) return BELIEF_WALL
    if (l < -this.lThresh) return BELIEF_FREE
    return BELIEF_UNKNOWN
  }
  isFree(i: number): boolean {
    return this.belief(i) === BELIEF_FREE
  }
  /** Probability the square is a wall, from its log-odds. */
  pWall(i: number): number {
    return 1 / (1 + Math.exp(-this.lo[i]))
  }

  private addEvidence(i: number, l: number): boolean {
    const before = this.belief(i)
    this.lo[i] = Math.max(-L_CLAMP, Math.min(L_CLAMP, this.lo[i] + l))
    this.touched[i] = 1
    return before === BELIEF_UNKNOWN && this.belief(i) !== BELIEF_UNKNOWN
  }

  /** Cast every beam once and fold the readings into the map. */
  scan(): void {
    const cfg = this.cfg
    const x0 = this.x()
    const y0 = this.y()
    this.scans++
    const visit = this.scanCount[this.pos]
    this.scanCount[this.pos] = Math.min(65000, visit + 1)
    const beams: Beam[] = []
    const step = cfg.beams === 8 ? 1 : 2
    for (let d = 0; d < 8; d += step) {
      const [dx, dy] = DIR8[d]
      // True reading: walk until a wall, the edge, or the range.
      const cells: number[] = []
      let trueHit = -1
      for (let k = 1; k <= cfg.range; k++) {
        const nx = x0 + dx * k
        const ny = y0 + dy * k
        if (!inBounds(this.W, this.H, nx, ny)) break
        // A diagonal beam cannot squeeze between two walls that touch at a corner.
        if (dx !== 0 && dy !== 0) {
          const px = x0 + dx * (k - 1)
          const py = y0 + dy * (k - 1)
          if (this.maze.wall[py * this.W + px + dx] && this.maze.wall[(py + dy) * this.W + px]) break
        }
        const n = ny * this.W + nx
        cells.push(n)
        if (this.maze.wall[n]) {
          trueHit = k
          break
        }
      }
      let len = trueHit > 0 ? trueHit : cells.length
      let hit = trueHit > 0
      let wrong = false
      let dropped = false
      if (cfg.noise > 0 || cfg.dropout > 0) {
        const r = hash01(this.noiseSeed, this.pos, d, visit, 0)
        const r2 = hash01(this.noiseSeed, this.pos, d, visit, 1)
        if (r < cfg.dropout) dropped = true
        else if (r < cfg.dropout + cfg.noise) {
          wrong = true
          if (hit) {
            const m = len + (r2 < 0.5 ? -1 : 1)
            if (m < 1) {
              wrong = false
            } else {
              len = m
            }
          } else if (cells.length >= 2) {
            // An open corridor read as a wall at the far end (a ghost echo).
            hit = true
            len = cells.length
          } else wrong = false
        }
      }
      if (dropped) {
        beams.push({ from: this.pos, dir: d, len: 0, hit: false, wrong: false, dropped: true })
        continue
      }
      // Fold the (possibly wrong) reading into the map.
      for (let k = 1; k <= len; k++) {
        const nx = x0 + dx * k
        const ny = y0 + dy * k
        if (!inBounds(this.W, this.H, nx, ny)) {
          len = k - 1
          hit = false
          break
        }
        const n = ny * this.W + nx
        const isEnd = k === len && hit
        if (this.addEvidence(n, isEnd ? cfg.lOcc : cfg.lFree)) this.newlyKnown.push(n)
      }
      beams.push({ from: this.pos, dir: d, len, hit, wrong, dropped: false })
    }
    this.beams = beams
  }

  spendCompute(expanded: number): void {
    this.plans++
    this.expandedTotal += expanded
    const e = expanded * this.cfg.computeCost
    this.computeEnergy += e
    this.battery -= e
  }

  /** Drive one square. Scans `scans` times after arriving (first scan is free). */
  tryMove(d: number, scans = 1): MoveResult {
    const nx = this.x() + DX4[d]
    const ny = this.y() + DY4[d]
    this.heading = d
    if (!inBounds(this.W, this.H, nx, ny)) return 'blocked'
    const n = ny * this.W + nx
    if (this.maze.wall[n]) {
      this.bumps++
      this.battery -= this.cfg.bumpCost
      // A bumper is certain: this IS a wall.
      if (this.addEvidence(n, 4)) this.newlyKnown.push(n)
      this.lo[n] = Math.max(this.lo[n], 4)
      return 'bump'
    }
    const mk = this.pos * 4 + d
    const tries = this.moveCount[mk]
    this.moveCount[mk] = Math.min(65000, tries + 1)
    if (this.cfg.slip > 0 && hash01(this.noiseSeed, this.pos, d, tries, 2) < this.cfg.slip) {
      this.slips++
      this.battery -= 1
      return 'slip'
    }
    this.pos = n
    this.steps++
    this.battery -= 1
    this.visits[n] = Math.min(65000, this.visits[n] + 1)
    this.trail.push(n)
    this.lo[n] = -L_CLAMP
    for (let s = 0; s < Math.max(1, scans); s++) {
      this.scan()
      if (s > 0) this.battery -= this.cfg.extraScanCost
    }
    if (n === this.maze.exit) {
      this.escaped = true
      return 'escaped'
    }
    return 'moved'
  }

  /** Extra scans standing still (Legend: when a square stays uncertain). */
  rescan(): void {
    this.scan()
    this.battery -= this.cfg.extraScanCost || 0.5
  }

  isFrontier(i: number): boolean {
    if (!this.isFree(i)) return false
    const x = this.x(i)
    const y = this.y(i)
    for (let d = 0; d < 4; d++) {
      const nx = x + DX4[d]
      const ny = y + DY4[d]
      if (!inBounds(this.W, this.H, nx, ny)) continue
      if (this.belief(ny * this.W + nx) === BELIEF_UNKNOWN) return true
    }
    return false
  }

  frontiers(): number[] {
    const out: number[] = []
    for (let i = 0; i < this.W * this.H; i++) if (this.isFrontier(i)) out.push(i)
    return out
  }

  /** Gaps the robot believes it sees in the outside wall. */
  exitCandidates(): number[] {
    const out: number[] = []
    for (let i = 0; i < this.W * this.H; i++) {
      const x = this.x(i)
      const y = this.y(i)
      if (x !== 0 && y !== 0 && x !== this.W - 1 && y !== this.H - 1) continue
      if (this.isFree(i)) out.push(i)
    }
    return out
  }

  exitSeen(): boolean {
    return this.isFree(this.maze.exit)
  }

  /** Share of the real floor the robot has mapped as floor. */
  coverage(): number {
    let k = 0
    for (let i = 0; i < this.W * this.H; i++) if (!this.maze.wall[i] && this.isFree(i)) k++
    return k / this.maze.freeCount
  }

  /** How many squares the robot claims to know, and how many of those are right. */
  accuracy(): { known: number; correct: number; wrongWalls: number; wrongFloor: number } {
    let known = 0
    let correct = 0
    let wrongWalls = 0
    let wrongFloor = 0
    for (let i = 0; i < this.W * this.H; i++) {
      const b = this.belief(i)
      if (b === BELIEF_UNKNOWN) continue
      known++
      const isWall = this.maze.wall[i] === 1
      if ((b === BELIEF_WALL) === isWall) correct++
      else if (b === BELIEF_WALL) wrongWalls++
      else wrongFloor++
    }
    return { known, correct, wrongWalls, wrongFloor }
  }

  passable = (i: number): boolean => this.isFree(i)
}

export function dirTo(W: number, from: number, to: number): number {
  const dx = (to % W) - (from % W)
  const dy = Math.floor(to / W) - Math.floor(from / W)
  if (dx === 1) return 1
  if (dx === -1) return 3
  if (dy === 1) return 2
  return 0
}

// ── Autonomous explorer (Ace auto mode, Legend, reference runs) ─────────────

export interface AutoSettings {
  /** Scans at every stop (Legend: 1–4). */
  scans: number
  /** Probability needed before a square counts as known (Legend). */
  trust: number
  planner: PlannerId
  /** How much the robot prefers frontiers toward the east wall (0 = none). */
  eastBias: number
  /** 'path' = truly nearest by driving distance (a BFS); 'straight' = nearest as the crow flies. */
  frontierRule: 'path' | 'straight'
}

export type TickKind = 'plan' | 'moved' | 'bump' | 'slip' | 'escaped' | 'blocked' | 'rescan' | 'wait' | 'stuck' | 'battery'

export interface TickResult {
  kind: TickKind
  plan?: PlanResult
  escapePlan?: boolean
  /** The robot touched an uncertain square with its bumper. */
  probed?: boolean
}

export class Explorer {
  settings: AutoSettings
  path: number[] = []
  target = -1
  mode: 'explore' | 'escape' = 'explore'
  /** Ace manual mode: the child picks frontiers; the explorer waits. */
  autoExplore = true
  /** Ace: the child must press "Plan escape" first. */
  allowEscape = true
  private tries = new Map<number, number>()
  /** Frontiers the planner could not reach on the current map (cleared after each move). */
  private unreachable = new Set<number>()
  private badExits = new Set<number>()
  /** The doubtful wall being driven to for a bumper check (-1 = none). */
  suspect = -1
  /** True while driving to double-check a weak wall. */
  checking = false

  constructor(settings: AutoSettings) {
    this.settings = settings
  }

  private planTo(w: World, goals: number[], algo: PlannerId): PlanResult {
    const r = plan(w.W, w.H, w.passable, w.pos, goals, algo)
    w.spendCompute(r.expanded)
    return r
  }

  /** Nearest frontier by driving distance: one BFS that stops at the first frontier. */
  pickNearestByPath(w: World): PlanResult | null {
    const goals = w.frontiers().filter((f) => !this.unreachable.has(f) && f !== w.pos)
    if (!goals.length) return null
    if (this.settings.eastBias <= 0) {
      const r = this.planTo(w, goals, 'bfs')
      return r.found ? r : null
    }
    // With an east bias: one full BFS, then score every frontier.
    const r = plan(w.W, w.H, w.passable, w.pos, [-1], 'bfs')
    w.spendCompute(r.expanded)
    let best = -1
    let bestScore = Infinity
    for (const f of goals) {
      if (r.dist[f] < 0) continue
      const s = r.dist[f] + this.settings.eastBias * (w.W - 1 - w.x(f))
      if (s < bestScore) {
        bestScore = s
        best = f
      }
    }
    if (best < 0) return null
    const p = plan(w.W, w.H, w.passable, w.pos, [best], 'bfs')
    return { ...p, order: r.order, expanded: r.expanded }
  }

  pickStraight(w: World): PlanResult | null {
    const cands = w
      .frontiers()
      .filter((f) => !this.unreachable.has(f) && f !== w.pos)
      .map((f) => ({ f, s: Math.abs(w.x(f) - w.x()) + Math.abs(w.y(f) - w.y()) + this.settings.eastBias * (w.W - 1 - w.x(f)) }))
      .sort((a, b) => a.s - b.s)
    for (let k = 0; k < Math.min(6, cands.length); k++) {
      const r = this.planTo(w, [cands[k].f], this.settings.planner)
      if (r.found) return r
      this.unreachable.add(cands[k].f)
    }
    return null
  }

  /**
   * Recovery when nothing is left to explore and no exit is known: a single
   * noisy echo may have drawn a wall across a corridor. Go and look again at
   * the weakest walls (those with little evidence behind them).
   */
  pickSuspect(w: World): PlanResult | null {
    const goalToSuspect = new Map<number, number>()
    for (let i = 0; i < w.W * w.H; i++) {
      // Bumper-confirmed walls (log-odds ≥ 4) are certain; everything else may be a lie.
      if (w.belief(i) !== BELIEF_WALL || w.lo[i] >= 4) continue
      const x = w.x(i)
      const y = w.y(i)
      if (x === 0 || y === 0 || x === w.W - 1 || y === w.H - 1) continue
      for (let d = 0; d < 4; d++) {
        const n = (y + DY4[d]) * w.W + x + DX4[d]
        if (w.isFree(n) && !goalToSuspect.has(n)) goalToSuspect.set(n, i)
      }
    }
    if (!goalToSuspect.size) return null
    const r = this.planTo(w, [...goalToSuspect.keys()], this.settings.planner)
    if (!r.found) return null
    const g = r.path.length ? r.path[r.path.length - 1] : w.pos
    this.suspect = goalToSuspect.get(g) ?? -1
    return r
  }

  private lookOrProbe(w: World, force: boolean): TickResult | null {
    const t = (this.tries.get(w.pos) ?? 0) + 1
    if (!force && t > 1) return null
    this.tries.set(w.pos, t)
    if (t <= 4) {
      w.rescan()
      return { kind: 'rescan' }
    }
    for (let d = 0; d < 4; d++) {
      const nx = w.x() + DX4[d]
      const ny = w.y() + DY4[d]
      if (!inBounds(w.W, w.H, nx, ny) || w.belief(ny * w.W + nx) !== BELIEF_UNKNOWN) continue
      const res = w.tryMove(d, this.settings.scans)
      if (res === 'moved' || res === 'escaped') this.unreachable.clear()
      return { kind: res === 'bump' ? 'bump' : res, probed: true }
    }
    return null
  }

  /** Point the robot at a frontier the child chose. */
  goTo(w: World, target: number): PlanResult | null {
    const r = this.planTo(w, [target], 'bfs')
    if (!r.found) return null
    this.mode = 'explore'
    this.path = r.path
    this.target = target
    return r
  }

  planEscape(w: World): PlanResult | null {
    const exits = w.exitCandidates().filter((e) => !this.badExits.has(e))
    if (!exits.length) return null
    const r = this.planTo(w, exits, w.tier === 3 ? this.settings.planner : 'bfs')
    if (!r.found) return null
    this.mode = 'escape'
    this.path = r.path
    this.target = r.path[r.path.length - 1]
    return r
  }

  tick(w: World): TickResult {
    if (w.escaped) return { kind: 'escaped' }
    if (w.battery <= 0) return { kind: 'battery' }

    if (this.mode !== 'escape' && this.allowEscape && w.exitCandidates().some((e) => !this.badExits.has(e))) {
      const r = this.planEscape(w)
      if (r) return { kind: 'plan', plan: r, escapePlan: true }
    }

    if (this.path.length) {
      const next = this.path[0]
      const okNext = w.isFree(next)
      const okTarget = this.mode === 'escape' ? w.isFree(this.target) : this.checking || w.isFrontier(this.target) || this.path.length > 1
      if (!okNext || !okTarget) {
        this.path = []
        this.mode = 'explore'
      }
    }

    if (!this.path.length) {
      // Arrived next to a doubtful wall: touch it with the bumper to be sure.
      if (this.checking && this.target === w.pos && this.suspect >= 0) {
        this.checking = false
        const res = w.tryMove(dirTo(w.W, w.pos, this.suspect), this.settings.scans)
        this.suspect = -1
        if (res === 'moved' || res === 'escaped') this.unreachable.clear()
        return { kind: res, probed: true }
      }
      // Standing on a frontier whose neighbour is still uncertain (noise): look
      // again, and if the readings keep disagreeing, feel for it with the bumper.
      if (w.tier === 3 && w.isFrontier(w.pos) && this.target === w.pos) {
        const probe = this.lookOrProbe(w, this.target === w.pos)
        if (probe) return probe
      }
      if (!this.autoExplore) return { kind: 'wait' }
      const r = this.settings.frontierRule === 'path' ? this.pickNearestByPath(w) : this.pickStraight(w)
      if (!r) {
        if (w.tier === 3) {
          // Nothing left to explore and no way out: some "wall" may be a lie.
          if (w.isFrontier(w.pos)) {
            const probe = this.lookOrProbe(w, true)
            if (probe) return probe
          }
      const s = this.pickSuspect(w)
          if (s) {
            this.checking = true
            this.mode = 'explore'
            this.path = s.path
            this.target = s.path.length ? s.path[s.path.length - 1] : w.pos
            return { kind: 'plan', plan: s }
          }
        }
        return { kind: 'stuck' }
      }
      this.checking = false
      this.mode = 'explore'
      this.path = r.path
      this.target = r.path[r.path.length - 1]
      return { kind: 'plan', plan: r }
    }

    const next = this.path[0]
    const res = w.tryMove(dirTo(w.W, w.pos, next), this.settings.scans)
    if (res === 'moved' || res === 'escaped') {
      this.path.shift()
      this.unreachable.clear()
    }
    else if (res === 'bump') {
      if (this.mode === 'escape' && next === this.target) this.badExits.add(this.target)
      this.path = []
      this.mode = 'explore'
    }
    return { kind: res }
  }
}

export interface RunSummary {
  escaped: boolean
  steps: number
  energy: number
  bumps: number
  slips: number
  compute: number
  expanded: number
  plans: number
  coverage: number
  accuracy: number
  wrong: number
}

export function summarize(w: World): RunSummary {
  const a = w.accuracy()
  return {
    escaped: w.escaped,
    steps: w.steps,
    energy: w.batteryMax - w.battery,
    bumps: w.bumps,
    slips: w.slips,
    compute: w.computeEnergy,
    expanded: w.expandedTotal,
    plans: w.plans,
    coverage: w.coverage(),
    accuracy: a.known ? a.correct / a.known : 1,
    wrong: a.wrongFloor + a.wrongWalls,
  }
}

/** Run the explorer to the end with no animation (budgets and comparisons). */
export function runHeadless(tier: TierIndex, mazeIdx: number, settings: AutoSettings, battery: number): RunSummary {
  const w = new World(tier, mazeIdx, battery, settings.trust)
  w.scan()
  const ex = new Explorer(settings)
  for (let guard = 0; guard < 6000; guard++) {
    const r = ex.tick(w)
    if (r.kind === 'escaped' || r.kind === 'battery' || r.kind === 'stuck') break
  }
  return summarize(w)
}

export const ACE_BASELINE: AutoSettings = { scans: 1, trust: 0.7, planner: 'bfs', eastBias: 0, frontierRule: 'path' }
/** A middling first brain: it gets out, but leaves plenty to improve. */
export const LEGEND_DEFAULT: AutoSettings = { scans: 2, trust: 0.65, planner: 'bfs', eastBias: 0, frontierRule: 'straight' }

// ── Legend mission score ─────────────────────────────────────────────────────
// The Legend mission is "get out AND bring back a map the rescue team can
// trust". A wrong square on the map costs as much as WRONG_SQUARE_COST energy,
// because a team that trusts a ghost wall (or walks into a missing one) pays
// for it later. So a careless, fast brain no longer wins.

export const WRONG_SQUARE_COST = 5

export function missionCost(s: RunSummary): number {
  // Whole numbers, so the score a child sees is exactly the one that is judged.
  return s.escaped ? Math.round(s.energy + WRONG_SQUARE_COST * s.wrong) : Infinity
}

export const LEGEND_SCANS = [1, 2, 3, 4] as const
export const LEGEND_TRUSTS = [0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9] as const
export const LEGEND_PLANNERS: readonly PlannerId[] = ['bfs', 'astar', 'greedy']
export const LEGEND_BIASES = [0, 1, 2] as const

export function settingsKey(s: AutoSettings): string {
  return `${s.scans}|${Math.round(s.trust * 100)}|${s.planner}|${s.eastBias}`
}

/** Every brain the Legend panel can build (4 × 8 × 3 × 3 = 288). */
export function allLegendSettings(): AutoSettings[] {
  const out: AutoSettings[] = []
  for (const scans of LEGEND_SCANS)
    for (const trust of LEGEND_TRUSTS)
      for (const planner of LEGEND_PLANNERS)
        for (const eastBias of LEGEND_BIASES) out.push({ scans, trust, planner, eastBias, frontierRule: 'straight' })
  return out
}

export interface LegendSweep {
  results: Map<string, RunSummary>
  /** Mission costs of every brain, best first (Infinity = did not get out). */
  costs: number[]
  /** Cost needed for 3 stars (top LEGEND_THREE_SHARE) and 2 stars (top LEGEND_TWO_SHARE). */
  three: number
  two: number
}

/**
 * Legend stars are relative to every brain the panel can build on that maze.
 * 3 stars = the best 5% (was 10%: a random brain then had a 1-in-10 chance of
 * 3 stars, which is luck, not engineering). Ties at the cut all count, so the
 * real share can be a little higher; legend.verify keeps it under 8%.
 */
export const LEGEND_THREE_SHARE = 0.05
export const LEGEND_TWO_SHARE = 0.4

const sweepCache = new Map<number, { todo: AutoSettings[]; results: Map<string, RunSummary>; done: LegendSweep | null }>()

/**
 * Runs every possible Legend brain on one maze, a few at a time, so the stars
 * are relative to what is actually possible on THAT maze. Call with a time
 * budget from the frame loop; returns the finished sweep once all are run.
 */
export function legendSweep(idx: number, budgetMs = Infinity): LegendSweep | null {
  let st = sweepCache.get(idx)
  if (!st) {
    st = { todo: allLegendSettings(), results: new Map(), done: null }
    sweepCache.set(idx, st)
  }
  if (st.done) return st.done
  const battery = batteryFor(3, idx)
  const t0 = Date.now()
  while (st.todo.length) {
    const s = st.todo.pop() as AutoSettings
    st.results.set(settingsKey(s), runHeadless(3, idx, s, battery))
    if (Date.now() - t0 > budgetMs) return null
  }
  const costs = [...st.results.values()].map(missionCost).sort((a, b) => a - b)
  const at = (q: number): number => costs[Math.max(0, Math.ceil(q * costs.length) - 1)]
  st.done = { results: st.results, costs, three: at(LEGEND_THREE_SHARE), two: at(LEGEND_TWO_SHARE) }
  return st.done
}

export interface PilotStats {
  /** Longest loop the robot can fall into from the start. */
  loop: number
  /** Fewest hand-driven moves from the start to a square touching the outside wall. */
  reach: number
  /** Longest successful wall-follow from that square (worst hand and heading). */
  follow: number
}

const pilotCache = new Map<number, PilotStats>()

export function pilotStats(idx: number): PilotStats {
  const hit = pilotCache.get(idx)
  if (hit) return hit
  const m = getMaze(1, idx)
  const left = runFollower(m, m.start, m.startHeading, 'left')
  const right = runFollower(m, m.start, m.startHeading, 'right')
  const loop = Math.max(left.escaped ? 0 : left.steps, right.escaped ? 0 : right.steps)
  const dist = trueDistances(m, m.start)
  let reach = Infinity
  let follow = 0
  for (let i = 0; i < m.W * m.H; i++) {
    if (m.wall[i] || dist[i] < 0 || dist[i] >= reach) continue
    const x = i % m.W
    const y = Math.floor(i / m.W)
    let touchesOuter = false
    for (let d = 0; d < 4; d++) {
      const nx = x + DX4[d]
      const ny = y + DY4[d]
      if (inBounds(m.W, m.H, nx, ny) && m.wall[ny * m.W + nx] && m.wallComp[ny * m.W + nx] === m.outerComp) touchesOuter = true
    }
    if (!touchesOuter) continue
    let worst = 0
    for (let h = 0; h < 4; h++)
      for (const hand of ['left', 'right'] as const) {
        const r = runFollower(m, i, h, hand)
        if (r.escaped) worst = Math.max(worst, r.steps)
      }
    if (worst > 0) {
      reach = dist[i]
      follow = worst
    }
  }
  const out: PilotStats = { loop, reach: Number.isFinite(reach) ? reach : 0, follow }
  pilotCache.set(idx, out)
  return out
}

const budgetCache = new Map<string, number>()

/** The battery for a tier and maze, derived from the maze itself so every maze is fair. */
export function batteryFor(tier: TierIndex, idx: number): number {
  const key = `${tier}:${idx}`
  const hit = budgetCache.get(key)
  if (hit !== undefined) return hit
  const m = getMaze(tier, idx)
  let b: number
  if (tier === 0) {
    b = Math.round(m.freeCount * 3)
  } else if (tier === 1) {
    const ps = pilotStats(idx)
    b = Math.round((ps.loop + ps.reach + ps.follow) * 1.3) + 12
  } else if (tier === 2) {
    const s = runHeadless(2, idx, ACE_BASELINE, 1e9)
    b = Math.round(s.energy * 1.5) + 10
  } else {
    // Generous: most brains get out, so the stars (from legendSweep) decide
    // how good a brain is. 2.5 × the median of four sensible set-ups.
    const sensible: AutoSettings[] = [
      { scans: 1, trust: 0.7, planner: 'astar', eastBias: 0, frontierRule: 'straight' },
      { scans: 2, trust: 0.7, planner: 'bfs', eastBias: 0, frontierRule: 'straight' },
      { scans: 2, trust: 0.8, planner: 'astar', eastBias: 1, frontierRule: 'straight' },
      { scans: 1, trust: 0.8, planner: 'astar', eastBias: 1, frontierRule: 'straight' },
    ]
    const e = sensible.map((st) => runHeadless(3, idx, st, 1e9).energy).sort((a, c) => a - c)
    b = Math.round(((e[1] + e[2]) / 2) * 2.5) + 10
  }
  budgetCache.set(key, b)
  return b
}
