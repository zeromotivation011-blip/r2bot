// components/kids/activities/templates/path-planner/logic.ts
// PATH PLANNER — the child plans a robot's route across a grid map by
// tapping/dragging cell to cell, then compares it with what a real planning
// algorithm finds (BFS, Dijkstra or A*), watching the algorithm's search
// spread across the map.
//
// The real ideas:
//   - A map is a GRAPH of cells; a route is a path through it.
//   - "Shortest" depends on COST: mud or sand costs more energy/time per cell,
//     so the cheapest route can be longer in steps (Dijkstra / A*).
//   - BFS finds the fewest steps; Dijkstra the lowest cost; A* the same answer
//     as Dijkstra while exploring fewer cells, because a heuristic (straight-
//     line distance) points it toward the goal.
//   - Checkpoints (pick up a parcel, then deliver) make the order matter.
//
// Map legend (one character per cell, rows top → bottom):
//   S start · G goal · # wall · . floor (cost 1) · ~ mud · : sand · 1–3 checkpoints
// Costs of ~ and : come from params.costs (defaults: sand 2, mud 4).
//
// Pure logic: no React, no DOM.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'

export type Cell = [row: number, col: number]

export interface Params {
  task: string
  /** Rows of the map (3–14 rows, 3–14 columns, all the same length). */
  map: string[]
  /** Per-cell entry cost of terrain. Defaults: sand ':' 2, mud '~' 4. Floor, S, G and checkpoints cost 1. */
  costs?: { sand?: number; mud?: number }
  /** What the two terrain kinds ARE in this map (legend text), e.g. { mud: 'Spill', sand: 'Busy aisle' }. Defaults "Mud" / "Sand". */
  terrainNames?: { sand?: string; mud?: string }
  /** Allow diagonal moves (cost × √2, cannot cut wall corners). Default false. Ages 14+. */
  diagonal?: boolean
  /**
   * How close to optimal the child must be: allowed extra cost as a fraction
   * of the optimal cost (0 = must be optimal, 0.25 = within 25 %). 0–1.
   */
  tolerance: number
  /** Which algorithm to show afterwards. 'bfs' (steps, ages 8–10), 'dijkstra' (costs), 'astar' (costs + heuristic, ages 14+). Default 'dijkstra' when there is terrain, else 'bfs'. */
  reveal?: 'bfs' | 'dijkstra' | 'astar'
  /** Show the cost number on terrain cells (default true). */
  showCosts?: boolean
  /** Ask the child to predict how many cells the algorithm explores before revealing (ages 14+). Not graded. */
  predictExplored?: boolean
  /** Label for the robot and the goal, e.g. "Rover", "Charging dock". */
  robotLabel?: string
  goalLabel?: string
}

export interface Answer {
  /** The route as cells from S to G (inclusive), each step to a neighbouring cell. */
  path: Cell[]
}

export interface Grid {
  rows: number
  cols: number
  start: Cell
  goal: Cell
  checkpoints: Cell[]
  at: (r: number, c: number) => string
}

export function parseMap(p: Params): Grid | null {
  const rows = p.map?.length ?? 0
  const cols = p.map?.[0]?.length ?? 0
  let start: Cell | null = null
  let goal: Cell | null = null
  const cps: { n: number; cell: Cell }[] = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const ch = p.map[r][c]
      if (ch === 'S') start = [r, c]
      if (ch === 'G') goal = [r, c]
      if (ch >= '1' && ch <= '3') cps.push({ n: Number(ch), cell: [r, c] })
    }
  if (!start || !goal) return null
  cps.sort((a, b) => a.n - b.n)
  return { rows, cols, start, goal, checkpoints: cps.map((x) => x.cell), at: (r, c) => (r >= 0 && r < rows && c >= 0 && c < cols ? p.map[r][c] : '#') }
}

export function cellCost(p: Params, ch: string): number {
  if (ch === '~') return p.costs?.mud ?? 4
  if (ch === ':') return p.costs?.sand ?? 2
  return 1
}

const SQ2 = Math.SQRT2
const key = (r: number, c: number) => r * 64 + c

function neighbours(p: Params, g: Grid, r: number, c: number): { r: number; c: number; mult: number }[] {
  const out: { r: number; c: number; mult: number }[] = []
  const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  for (const [dr, dc] of dirs) if (g.at(r + dr, c + dc) !== '#') out.push({ r: r + dr, c: c + dc, mult: 1 })
  if (p.diagonal)
    for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as [number, number][])
      if (g.at(r + dr, c + dc) !== '#' && g.at(r + dr, c) !== '#' && g.at(r, c + dc) !== '#') out.push({ r: r + dr, c: c + dc, mult: SQ2 })
  return out
}

/** Cost of one step INTO (r2,c2). */
export function stepCost(p: Params, g: Grid, r1: number, c1: number, r2: number, c2: number): number | null {
  const dr = Math.abs(r2 - r1)
  const dc = Math.abs(c2 - c1)
  if (g.at(r2, c2) === '#') return null
  if (dr + dc === 1) return cellCost(p, g.at(r2, c2))
  if (p.diagonal && dr === 1 && dc === 1 && g.at(r2, c1) !== '#' && g.at(r1, c2) !== '#') return cellCost(p, g.at(r2, c2)) * SQ2
  return null
}

export interface Search {
  cost: number
  path: Cell[]
  /** Cells in the order the algorithm expanded them. */
  explored: Cell[]
}

/** One search leg: BFS (unit costs), Dijkstra, or A* (octile/Manhattan heuristic × cheapest cell cost). */
export function searchLeg(p: Params, g: Grid, from: Cell, to: Cell, algo: 'bfs' | 'dijkstra' | 'astar'): Search | null {
  const minCell = Math.min(1, cellCost(p, '~'), cellCost(p, ':'))
  const h = (r: number, c: number) => {
    if (algo !== 'astar') return 0
    const dr = Math.abs(r - to[0])
    const dc = Math.abs(c - to[1])
    return (p.diagonal ? Math.max(dr, dc) - Math.min(dr, dc) + SQ2 * Math.min(dr, dc) : dr + dc) * minCell
  }
  const dist = new Map<number, number>()
  const prev = new Map<number, number>()
  const done = new Set<number>()
  const explored: Cell[] = []
  // Small grids (≤ 196 cells): a linear-scan priority queue is plenty and keeps tie-breaking deterministic.
  const open: { r: number; c: number; f: number; g: number; order: number }[] = []
  let order = 0
  dist.set(key(...from), 0)
  open.push({ r: from[0], c: from[1], f: h(...from), g: 0, order: order++ })
  while (open.length) {
    let bi = 0
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f - 1e-9 || (Math.abs(open[i].f - open[bi].f) < 1e-9 && open[i].order < open[bi].order)) bi = i
    const cur = open.splice(bi, 1)[0]
    const k = key(cur.r, cur.c)
    if (done.has(k)) continue
    done.add(k)
    explored.push([cur.r, cur.c])
    if (cur.r === to[0] && cur.c === to[1]) {
      const path: Cell[] = []
      let kk: number | undefined = k
      while (kk !== undefined) {
        path.unshift([Math.floor(kk / 64), kk % 64])
        kk = prev.get(kk)
      }
      // BFS counts steps; report the real terrain cost of the path it found.
      return { cost: pathCost(p, g, path) ?? cur.g, path, explored }
    }
    for (const n of neighbours(p, g, cur.r, cur.c)) {
      const nk = key(n.r, n.c)
      if (done.has(nk)) continue
      const sc = algo === 'bfs' ? 1 : stepCost(p, g, cur.r, cur.c, n.r, n.c)!
      const ng = cur.g + sc
      if (ng < (dist.get(nk) ?? Infinity) - 1e-9) {
        dist.set(nk, ng)
        prev.set(nk, k)
        open.push({ r: n.r, c: n.c, g: ng, f: ng + h(n.r, n.c), order: order++ })
      }
    }
  }
  return null
}

/** Cost of a full path, or null if a step is illegal. */
export function pathCost(p: Params, g: Grid, path: Cell[]): number | null {
  let total = 0
  for (let i = 1; i < path.length; i++) {
    const s = stepCost(p, g, path[i - 1][0], path[i - 1][1], path[i][0], path[i][1])
    if (s === null) return null
    total += s
  }
  return total
}

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs]
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((rest) => [x, ...rest]))
}

/** Best route through every checkpoint (any order) with the given algorithm. */
export function plan(p: Params, algo: 'bfs' | 'dijkstra' | 'astar' = 'dijkstra'): Search | null {
  const g = parseMap(p)
  if (!g) return null
  let best: Search | null = null
  for (const order of permutations(g.checkpoints)) {
    const stops = [g.start, ...order, g.goal]
    let cost = 0
    const path: Cell[] = [g.start]
    const explored: Cell[] = []
    let ok = true
    for (let i = 1; i < stops.length; i++) {
      const leg = searchLeg(p, g, stops[i - 1], stops[i], algo)
      if (!leg) {
        ok = false
        break
      }
      cost += leg.cost
      path.push(...leg.path.slice(1))
      explored.push(...leg.explored)
    }
    if (ok && (!best || cost < best.cost - 1e-9)) best = { cost, path, explored }
  }
  return best
}

export function revealAlgo(p: Params): 'bfs' | 'dijkstra' | 'astar' {
  if (p.reveal) return p.reveal
  return p.map.some((row) => /[~:]/.test(row)) ? 'dijkstra' : 'bfs'
}

function validate(p: Params): string[] {
  const out: string[] = []
  if (!p || !Array.isArray(p.map)) return ['map is required']
  if (!p.task?.trim()) out.push('task is required')
  const rows = p.map.length
  const cols = p.map[0]?.length ?? 0
  if (rows < 3 || rows > 14 || cols < 3 || cols > 14) out.push('map: 3–14 rows and 3–14 columns')
  if (p.map.some((r) => r.length !== cols)) out.push('every map row must be the same length')
  if (p.map.some((r) => /[^SG#.~:123]/.test(r))) out.push('map may only use S G # . ~ : 1 2 3')
  const all = p.map.join('')
  if ((all.match(/S/g) ?? []).length !== 1) out.push('map needs exactly one S')
  if ((all.match(/G/g) ?? []).length !== 1) out.push('map needs exactly one G')
  for (const d of ['1', '2', '3']) if ((all.match(new RegExp(d, 'g')) ?? []).length > 1) out.push(`checkpoint ${d} appears more than once`)
  const cps = (all.match(/[123]/g) ?? []).map(Number).sort()
  if (cps.some((n, i) => n !== i + 1)) out.push('checkpoints must be numbered 1, 2, 3 without gaps')
  for (const [k, v] of Object.entries(p.costs ?? {})) if (!(typeof v === 'number' && v >= 1 && v <= 9)) out.push(`costs.${k}: 1–9`)
  if (!(p.tolerance >= 0 && p.tolerance <= 1)) out.push('tolerance: 0–1')
  if (out.length) return out
  if (!plan(p)) out.push('the goal (and every checkpoint) must be reachable from S')
  return out
}

const fmt = (x: number) => (Math.abs(x - Math.round(x)) < 1e-6 ? String(Math.round(x)) : x.toFixed(1))

function check(p: Params, a: Answer): CheckResult {
  const g = parseMap(p)!
  const path = a?.path ?? []
  if (path.length < 2) return { correct: false, score: 0, feedback: 'Draw a route first: start at the robot and tap neighbouring squares to the goal.' }
  const [r0, c0] = path[0]
  if (r0 !== g.start[0] || c0 !== g.start[1]) return { correct: false, score: 0, feedback: 'The route has to start where the robot is.' }
  const last = path[path.length - 1]
  const cost = pathCost(p, g, path)
  if (cost === null) {
    const i = path.findIndex((cell, j) => j > 0 && stepCost(p, g, path[j - 1][0], path[j - 1][1], cell[0], cell[1]) === null)
    const bad = path[i]
    const intoWall = g.at(bad[0], bad[1]) === '#'
    return { correct: false, score: 0.1, feedback: intoWall ? 'Your route goes through a wall — robots can’t drive through walls! Go around.' : 'Your route jumps between squares that are not next to each other. Every step must go to a neighbouring square.' }
  }
  if (last[0] !== g.goal[0] || last[1] !== g.goal[1]) return { correct: false, score: 0.2, feedback: `The route stops before the ${p.goalLabel ?? 'goal'}. Keep going until you reach it.` }
  const visited = new Set(path.map(([r, c]) => key(r, c)))
  const missed = g.checkpoints.filter(([r, c]) => !visited.has(key(r, c)))
  if (missed.length) return { correct: false, score: 0.3, feedback: `The route misses checkpoint ${g.checkpoints.findIndex((x) => x === missed[0]) + 1}. The robot has to visit every checkpoint before the ${p.goalLabel ?? 'goal'}.` }
  const best = plan(p)!
  const allowed = best.cost * (1 + p.tolerance)
  const terrain = p.map.some((row) => /[~:]/.test(row))
  const steps = path.length - 1
  if (cost <= allowed + 1e-6) {
    const perfect = cost <= best.cost + 1e-6
    return {
      correct: true,
      score: 1,
      feedback: perfect
        ? `A perfect route: cost ${fmt(cost)}, the lowest possible. ${terrain ? 'You weighed short-but-muddy against long-but-smooth, exactly like a planner does.' : 'No route has fewer steps.'}`
        : `Good route: cost ${fmt(cost)}, close to the best possible ${fmt(best.cost)}. Watch the algorithm to see where it saved a little.`,
    }
  }
  const crossesMud = path.some(([r, c]) => g.at(r, c) === '~')
  let why = `The best route costs ${fmt(best.cost)}; yours costs ${fmt(cost)} in ${steps} steps.`
  if (terrain && crossesMud) why += ` Mud costs ${cellCost(p, '~')} per square — sometimes going around is cheaper than going through.`
  else if (g.checkpoints.length > 1) why += ' Try visiting the checkpoints in a different order.'
  else why += ' Look for a shortcut with fewer turns and detours.'
  return { correct: false, score: Math.max(0.3, Math.min(0.9, best.cost / cost)), feedback: why }
}

export const logic: TemplateLogic<Params, Answer> = { id: 'path-planner', name: 'Path planner', validate, check }
