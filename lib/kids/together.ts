// lib/kids/together.ts — the "Play together" missions (roadmap #90): pure data
// and helpers, so the verify script can check every map is solvable.
// UI: components/kids/profiles/PlayTogetherClient.tsx.

export const TOGETHER_N = 7
const N = TOGETHER_N

export type Cell = '.' | '#' | 'S' | '*' | 'G'

export interface TogetherMission {
  /** Also the personalBests / reward id. */
  id: string
  title: string
  place: string
  emoji: string
  rock: string
  sample: string
  base: string
  /** 7 rows of 7: '.' open, '#' blocked, 'S' start, '*' sample (2), 'G' base. */
  map: string[]
}

export const TOGETHER_MISSIONS: TogetherMission[] = [
  {
    id: 'together-crater',
    title: 'Crater rescue',
    place: 'on the Moon',
    emoji: '🌙',
    rock: '🪨',
    sample: '💎',
    base: '🚀',
    map: ['S..#...', '##.#.#.', '.....#.', '.###...', '..*###.', '.....#.', '*###..G'],
  },
  {
    id: 'together-reef',
    title: 'Reef survey',
    place: 'under the sea',
    emoji: '🌊',
    rock: '🪸',
    sample: '🐚',
    base: '🚢',
    map: ['S.#.*..', '.##.##.', '...#...', '##.#.##', '*..#...', '.#...#.', '.#.#.#G'],
  },
  {
    id: 'together-farm',
    title: 'Harvest run',
    place: 'on the farm',
    emoji: '🌾',
    rock: '🌳',
    sample: '🍅',
    base: '🏠',
    map: ['S....#*', '####.#.', '...#...', '.#.###.', '.#*..#.', '.####..', '......G'],
  },
]

export function cellAt(m: TogetherMission, r: number, c: number): Cell {
  return (m.map[r]?.[c] as Cell | undefined) ?? '#'
}

export function startOf(m: TogetherMission): [number, number] {
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (cellAt(m, r, c) === 'S') return [r, c]
  return [0, 0]
}

export function samplesOf(m: TogetherMission): string[] {
  const out: string[] = []
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (cellAt(m, r, c) === '*') out.push(`${r},${c}`)
  return out
}

/** One shared result for the pair: 0 bumps 3★, up to 2 bumps 2★, more 1★. */
export function starsFor(bumps: number): number {
  return bumps === 0 ? 3 : bumps <= 2 ? 2 : 1
}

/** True when the map is 7×7, has 2 samples, and every sample and the base can be reached. */
export function missionSolvable(m: TogetherMission): boolean {
  if (m.map.length !== N || !m.map.every((row) => row.length === N) || samplesOf(m).length !== 2) return false
  const [sr, sc] = startOf(m)
  const seen = new Set([`${sr},${sc}`])
  const q: [number, number][] = [[sr, sc]]
  while (q.length) {
    const [r, c] = q.shift() as [number, number]
    for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const nr = r + dr
      const nc = c + dc
      const k = `${nr},${nc}`
      if (nr < 0 || nc < 0 || nr >= N || nc >= N || seen.has(k) || cellAt(m, nr, nc) === '#') continue
      seen.add(k)
      q.push([nr, nc])
    }
  }
  const need: string[] = []
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if ('*G'.includes(cellAt(m, r, c))) need.push(`${r},${c}`)
  return need.length === 3 && need.every((k) => seen.has(k))
}
