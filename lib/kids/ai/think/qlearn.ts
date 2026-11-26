// lib/kids/ai/think/qlearn.ts
// Tabular Q-learning (Watkins, 1989) in a gridworld, for the Learning Robot
// lab. The robot knows nothing about the world: it tries moves, gets rewards,
// and keeps a table Q[state][action] of how good each move looked. The update
// is the textbook one:
//   Q(s,a) ← Q(s,a) + α · ( r + γ · max_a' Q(s',a') − Q(s,a) )
// Exploration is ε-greedy. No browser APIs.

import type { TierName } from '@/lib/kids/universe/tiers'

export type Cell = 'empty' | 'wall' | 'lava' | 'goal'

export interface GridWorld {
  w: number
  h: number
  cells: Cell[]
  start: number
}

export type Action = 0 | 1 | 2 | 3
export const ACTIONS: Action[] = [0, 1, 2, 3]
export const ACTION_NAMES = ['up', 'right', 'down', 'left'] as const
const DX = [0, 1, 0, -1]
const DY = [-1, 0, 1, 0]

export const REWARD = { step: -1, bump: -2, lava: -30, goal: 30 } as const

export interface StepResult {
  s2: number
  r: number
  done: boolean
  event: 'move' | 'bump' | 'lava' | 'goal' | 'slip'
}

/**
 * Take action a from state s. On an icy floor the robot slides to a random
 * side direction 20% of the time — the world is no longer predictable.
 */
export function envStep(world: GridWorld, s: number, a: Action, icy: boolean, rng: () => number): StepResult {
  let act: number = a
  let slipped = false
  if (icy && rng() < 0.2) {
    act = (a + (rng() < 0.5 ? 1 : 3)) % 4
    slipped = true
  }
  const x = s % world.w
  const y = Math.floor(s / world.w)
  const nx = x + DX[act]
  const ny = y + DY[act]
  if (nx < 0 || ny < 0 || nx >= world.w || ny >= world.h || world.cells[ny * world.w + nx] === 'wall') {
    return { s2: s, r: REWARD.bump, done: false, event: 'bump' }
  }
  const s2 = ny * world.w + nx
  const c = world.cells[s2]
  if (c === 'lava') return { s2, r: REWARD.lava, done: true, event: 'lava' }
  if (c === 'goal') return { s2, r: REWARD.goal, done: true, event: 'goal' }
  return { s2, r: REWARD.step, done: false, event: slipped ? 'slip' : 'move' }
}

export function newQ(world: GridWorld): Float64Array {
  return new Float64Array(world.w * world.h * 4)
}

export function bestAction(Q: Float64Array, s: number, rng: () => number): Action {
  let best = -Infinity
  const ties: Action[] = []
  for (const a of ACTIONS) {
    const q = Q[s * 4 + a]
    if (q > best + 1e-9) {
      best = q
      ties.length = 0
      ties.push(a)
    } else if (Math.abs(q - best) <= 1e-9) ties.push(a)
  }
  return ties[Math.floor(rng() * ties.length)]
}

export function maxQ(Q: Float64Array, s: number): number {
  return Math.max(Q[s * 4], Q[s * 4 + 1], Q[s * 4 + 2], Q[s * 4 + 3])
}

export function chooseAction(Q: Float64Array, s: number, epsilon: number, rng: () => number): { a: Action; explored: boolean } {
  if (rng() < epsilon) return { a: ACTIONS[Math.floor(rng() * 4)], explored: true }
  return { a: bestAction(Q, s, rng), explored: false }
}

export function qUpdate(Q: Float64Array, s: number, a: Action, r: number, s2: number, done: boolean, alpha: number, gamma: number): void {
  const target = done ? r : r + gamma * maxQ(Q, s2)
  Q[s * 4 + a] += alpha * (target - Q[s * 4 + a])
}

/** Shortest number of moves from start to goal avoiding walls and lava (BFS), or -1. */
export function shortestPath(world: GridWorld): number {
  const dist = new Int32Array(world.w * world.h).fill(-1)
  dist[world.start] = 0
  const q = [world.start]
  while (q.length) {
    const s = q.shift() as number
    if (world.cells[s] === 'goal') return dist[s]
    const x = s % world.w
    const y = Math.floor(s / world.w)
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d]
      const ny = y + DY[d]
      if (nx < 0 || ny < 0 || nx >= world.w || ny >= world.h) continue
      const n = ny * world.w + nx
      if (dist[n] >= 0 || world.cells[n] === 'wall' || world.cells[n] === 'lava') continue
      dist[n] = dist[s] + 1
      q.push(n)
    }
  }
  return -1
}

/** Follow the learned table greedily (no exploring). */
export function greedyRun(world: GridWorld, Q: Float64Array, maxSteps: number, rng: () => number): { path: number[]; reached: boolean; event: StepResult['event'] } {
  let s = world.start
  const path = [s]
  for (let i = 0; i < maxSteps; i++) {
    const r = envStep(world, s, bestAction(Q, s, rng), false, rng)
    s = r.s2
    path.push(s)
    if (r.done) return { path, reached: r.event === 'goal', event: r.event }
  }
  return { path, reached: false, event: 'move' }
}

// ── Levels ────────────────────────────────────────────────────────────────

export type LevelId = 'cookie' | 'walls' | 'cliff' | 'maze' | 'own'

/** Map legend: . empty, # wall, L lava, G goal, S start. */
function parse(rows: string[]): GridWorld {
  const h = rows.length
  const w = rows[0].length
  const cells: Cell[] = []
  let start = 0
  rows.forEach((row, y) =>
    row.split('').forEach((ch, x) => {
      if (ch === 'S') start = y * w + x
      cells.push(ch === '#' ? 'wall' : ch === 'L' ? 'lava' : ch === 'G' ? 'goal' : 'empty')
    }),
  )
  return { w, h, cells, start }
}

export interface Level {
  id: LevelId
  name: string
  tier: TierName
  blurb: string
  rows: string[]
}

export const LEVELS: Level[] = [
  { id: 'cookie', name: 'Cookie corner', tier: 'Cadet', blurb: 'An empty room. The battery cookie is in the far corner.', rows: ['S....', '.....', '.....', '.....', '....G'] },
  {
    id: 'walls',
    name: 'Wall room',
    tier: 'Pilot',
    blurb: 'Walls block the straight path. The robot must find the way round.',
    rows: ['S..#..', '.#.#..', '.#....', '.####.', '.....#', '##...G'],
  },
  {
    id: 'cliff',
    name: 'Lava cliff',
    tier: 'Ace',
    blurb: 'The shortest path runs along the lava. Brave — or safe?',
    rows: ['........', '........', '........', 'SLLLLLLG'],
  },
  {
    id: 'maze',
    name: 'The maze',
    tier: 'Legend',
    blurb: 'A real maze with lava traps. Try it on an icy floor.',
    rows: ['S.#.....', '..#.##.#', '.##..#..', '....L#.#', '#.####..', '.....L#.', '.###.##.', '...#...G'],
  },
  { id: 'own', name: 'Build your own', tier: 'Ace', blurb: 'Tap squares to place walls, lava and the goal.', rows: ['S.....', '......', '......', '......', '......', '.....G'] },
]

export function levelWorld(id: LevelId): GridWorld {
  const l = LEVELS.find((x) => x.id === id) ?? LEVELS[0]
  return parse(l.rows)
}
