// Pure grid search used by the A* vs Dijkstra page. No React, no DOM, so it
// can be checked from a script and reused by an embed later.
//
// What the page compares (27 Nov 2026, before Show HN): the headline number is
// CELLS EXPANDED, not milliseconds. On a 22×14 grid both searches finish in a
// few milliseconds and the timing is dominated by JIT warm-up and by how each
// open list happens to be stored here — the default grid showed "A* 4.2 ms vs
// Dijkstra 2.8 ms", which reads as "A* is slower" when A* expanded a fraction
// of the cells. Expanded cells is the quantity the heuristic actually reduces
// (Hart, Nilsson & Raphael 1968), so that is what the page leads with.

export const COLS = 22
export const ROWS = 14
export const START: [number, number] = [1, 7]
export const GOAL: [number, number] = [20, 7]

export type CellState = 'empty' | 'wall'
export type Step = { x: number; y: number }
/** visited = cells in the order they were expanded (popped from the open list). */
export type SearchResult = { visited: Step[]; path: Step[] }

function key(x: number, y: number): string {
  return `${x},${y}`
}

export function defaultGrid(): CellState[][] {
  const g: CellState[][] = []
  for (let y = 0; y < ROWS; y++) {
    const row: CellState[] = []
    for (let x = 0; x < COLS; x++) row.push('empty')
    g.push(row)
  }
  // A wall between start and goal plus a ledge, so neither search can go straight.
  for (let y = 3; y < 10; y++) g[y][10] = 'wall'
  for (let x = 6; x < 13; x++) g[3][x] = 'wall'
  return g
}

function neighbours(x: number, y: number, grid: CellState[][]): [number, number][] {
  const out: [number, number][] = []
  const cand: [number, number][] = [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ]
  for (const [nx, ny] of cand) {
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue
    if (grid[ny][nx] === 'wall') continue
    out.push([nx, ny])
  }
  return out
}

/** Manhattan distance: admissible and consistent on a 4-connected grid with unit cost. */
function manhattan(x: number, y: number): number {
  return Math.abs(GOAL[0] - x) + Math.abs(GOAL[1] - y)
}

type OpenNode = { x: number; y: number; g: number; h: number; parent: string | null }

export function runAStar(grid: CellState[][]): SearchResult {
  const open = new Map<string, OpenNode>()
  const seen = new Map<string, OpenNode>()
  const closed = new Set<string>()
  const visited: Step[] = []

  const s: OpenNode = { x: START[0], y: START[1], g: 0, h: manhattan(...START), parent: null }
  open.set(key(...START), s)
  seen.set(key(...START), s)

  while (open.size > 0) {
    // Lowest f = g + h; on a tie, the node closer to the goal (lower h).
    // Without the tie-break, A* on an open grid with Manhattan distance wanders
    // through every equal-f cell before it commits (Patel, "Heuristics").
    let bestKey: string | null = null
    let best: OpenNode | null = null
    for (const [k, v] of open) {
      if (
        best === null ||
        v.g + v.h < best.g + best.h ||
        (v.g + v.h === best.g + best.h && v.h < best.h)
      ) {
        best = v
        bestKey = k
      }
    }
    if (bestKey === null || best === null) break
    open.delete(bestKey)
    closed.add(bestKey)
    visited.push({ x: best.x, y: best.y })

    if (best.x === GOAL[0] && best.y === GOAL[1]) {
      const path: Step[] = []
      let k: string | null = bestKey
      while (k !== null) {
        const node: OpenNode | undefined = seen.get(k)
        if (!node) break
        path.unshift({ x: node.x, y: node.y })
        k = node.parent
      }
      return { visited, path }
    }

    for (const [nx, ny] of neighbours(best.x, best.y, grid)) {
      const nk = key(nx, ny)
      if (closed.has(nk)) continue
      const g = best.g + 1
      const existing = open.get(nk)
      if (!existing || g < existing.g) {
        const node: OpenNode = { x: nx, y: ny, g, h: manhattan(nx, ny), parent: bestKey }
        open.set(nk, node)
        seen.set(nk, node)
      }
    }
  }
  return { visited, path: [] }
}

export function runDijkstra(grid: CellState[][]): SearchResult {
  const dist = new Map<string, number>()
  const parents = new Map<string, string | null>()
  const done = new Set<string>()
  const visited: Step[] = []
  const queue: { x: number; y: number; d: number }[] = []
  dist.set(key(...START), 0)
  parents.set(key(...START), null)
  queue.push({ x: START[0], y: START[1], d: 0 })

  while (queue.length > 0) {
    queue.sort((a, b) => a.d - b.d)
    const current = queue.shift()!
    const k = key(current.x, current.y)
    if (done.has(k)) continue
    done.add(k)
    visited.push({ x: current.x, y: current.y })
    if (current.x === GOAL[0] && current.y === GOAL[1]) {
      const path: Step[] = []
      let cur: string | null = k
      while (cur) {
        const [cx, cy] = cur.split(',').map((v) => parseInt(v, 10))
        path.unshift({ x: cx, y: cy })
        cur = parents.get(cur) ?? null
      }
      return { visited, path }
    }
    for (const [nx, ny] of neighbours(current.x, current.y, grid)) {
      const nk = key(nx, ny)
      const nd = current.d + 1
      if (!dist.has(nk) || nd < dist.get(nk)!) {
        dist.set(nk, nd)
        parents.set(nk, k)
        queue.push({ x: nx, y: ny, d: nd })
      }
    }
  }
  return { visited, path: [] }
}

/**
 * Median wall-clock time of `runs` calls, after one warm-up call. One timing of
 * a 3 ms function in a browser is mostly noise; the median of several is a
 * fairer secondary number. Runs alternate between the two searches in the
 * caller so neither always pays the cold start.
 */
export function medianMs(fn: () => unknown, runs: number): number {
  fn()
  const times: number[] = []
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now()
    fn()
    times.push(performance.now() - t0)
  }
  times.sort((a, b) => a - b)
  return times[Math.floor(times.length / 2)]
}
