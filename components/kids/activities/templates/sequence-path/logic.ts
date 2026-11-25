// components/kids/activities/templates/sequence-path/logic.ts
// sequence-path — program a robot across a grid.
//
// The child builds a block program (forward, back, turns; loops, "repeat until
// at goal" and "if wall ahead" at higher difficulty), runs it, and watches the
// robot drive. It must end on the goal having collected every gem, within the
// block budget, on EVERY map (extraWorlds turns a route into an algorithm).
//
// Difficulty ladder (ages 5 → 17):
//   Explorers  3×3–4×4, no walls, palette [forward, left, right], no budget.
//   Builders   5×5–6×6, walls + gems, add `repeat`, a tight `maxBlocks` forces loops.
//   Inventors  7×7–8×8, nested repeats (maxDepth 2), Python 'toggle'.
//   Engineers  mazes with `untilGoal` + `ifWall`, `extraWorlds` so only a
//              general algorithm (wall following) passes, Python 'on'.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'
import {
  type Cmd,
  type Op,
  type Theme,
  type World,
  ALL_OPS,
  THEMES,
  countBlocks,
  explainRun,
  nestingDepth,
  opsUsed,
  programShapeErrors,
  runProgram,
  validateWorld,
} from './engine'

export type { Cmd, Op, Theme, World, Cell, Dir } from './engine'

export interface Params {
  /** The map. Row 0 is the top. The robot must END on `goal` with every gem collected. */
  world: World
  /**
   * Further maps the SAME program must also solve (Engineers). Use this to make
   * the child write a general algorithm (e.g. wall following with untilGoal +
   * ifWall) instead of a memorised route. Max 3.
   */
  extraWorlds?: World[]
  /**
   * Blocks offered in the palette. Must include 'forward'. Order is display order.
   * Explorers: ['forward','left','right']. Builders+: add 'repeat'.
   * Engineers: 'untilGoal' and 'ifWall'. 'back' is rarely needed — include it as a distractor.
   */
  palette: Op[]
  /**
   * Block budget ("the robot's memory holds N blocks"). Loop/if headers count 1
   * each, plus their contents. Set it tight to force the child to spot a
   * pattern and use `repeat`. Omit for no limit.
   */
  maxBlocks?: number
  /** Maximum nesting of loops/ifs (default 2). 1 = no loop inside a loop. */
  maxDepth?: number
  /** Python view: 'off' (blocks only), 'toggle' (child can flip), 'on' (side by side). Default 'off'. */
  python?: 'off' | 'toggle' | 'on'
  /** Skin + vocabulary (warehouse, mars, ocean, farm, hospital). Default 'warehouse'. */
  theme?: Theme
  /** Show a "ghost" of the shortest route at the start (Explorers scaffold). Default false. */
  showHintPath?: boolean
}

/** The child's program. */
export interface Answer {
  program: Cmd[]
}

function validate(p: Params): string[] {
  const errs: string[] = []
  if (!p || typeof p !== 'object') return ['params missing']
  errs.push(...validateWorld(p.world, 'world'))
  if (p.extraWorlds !== undefined) {
    if (!Array.isArray(p.extraWorlds) || p.extraWorlds.length > 3) errs.push('extraWorlds must be an array of at most 3 worlds')
    else p.extraWorlds.forEach((w, i) => errs.push(...validateWorld(w, `extraWorlds[${i}]`)))
  }
  if (!Array.isArray(p.palette) || p.palette.length === 0) errs.push('palette must list at least one block')
  else {
    p.palette.forEach((op) => { if (!ALL_OPS.includes(op)) errs.push(`palette has unknown block "${String(op)}"`) })
    if (!p.palette.includes('forward')) errs.push('palette must include "forward" — the robot has to be able to move')
    if (new Set(p.palette).size !== p.palette.length) errs.push('palette has duplicates')
    if (p.palette.includes('untilGoal') && !p.palette.includes('left') && !p.palette.includes('right') && !p.palette.includes('ifWall')) {
      errs.push('untilGoal without turns or ifWall can only drive straight; add turns')
    }
  }
  if (p.maxBlocks !== undefined && (!Number.isInteger(p.maxBlocks) || p.maxBlocks < 1 || p.maxBlocks > 60)) errs.push('maxBlocks must be an integer 1–60')
  if (p.maxDepth !== undefined && (!Number.isInteger(p.maxDepth) || p.maxDepth < 1 || p.maxDepth > 4)) errs.push('maxDepth must be an integer 1–4')
  if (p.python !== undefined && !['off', 'toggle', 'on'].includes(p.python)) errs.push('python must be off, toggle or on')
  if (p.theme !== undefined && !(p.theme in THEMES)) errs.push(`unknown theme "${String(p.theme)}"`)
  // A flat route needs at least (distance) forward blocks; if loops are not
  // offered, the budget must fit a shortest route.
  if (errs.length === 0 && p.maxBlocks !== undefined && !p.palette.includes('repeat') && !p.palette.includes('untilGoal')) {
    const r = shortestRouteBlocks(p.world)
    if (r > p.maxBlocks) errs.push(`maxBlocks ${p.maxBlocks} is below the shortest route (${r} blocks) and no loop block is offered — unsolvable`)
  }
  return errs
}

/** Blocks in the shortest flat program (moves + turns) that visits every gem then the goal. Exact via BFS over (cell, dir, gems). */
export function shortestRouteBlocks(world: World): number {
  const gems = world.gems ?? []
  const D: Record<string, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }
  const L: Record<string, string> = { N: 'W', W: 'S', S: 'E', E: 'N' }
  const R: Record<string, string> = { N: 'E', E: 'S', S: 'W', W: 'N' }
  const blocked = (c: number, r: number) => c < 0 || r < 0 || c >= world.cols || r >= world.rows || (world.walls ?? []).some((w) => w[0] === c && w[1] === r)
  const full = (1 << gems.length) - 1
  const enc = (c: number, r: number, d: string, m: number) => `${c},${r},${d},${m}`
  const startMask = 0
  let frontier: [number, number, string, number][] = [[world.start.at[0], world.start.at[1], world.start.dir, startMask]]
  const seen = new Set([enc(frontier[0][0], frontier[0][1], frontier[0][2], 0)])
  let depth = 0
  while (frontier.length && depth < 400) {
    const next: [number, number, string, number][] = []
    for (const [c, r, d, m] of frontier) {
      if (c === world.goal[0] && r === world.goal[1] && m === full) return depth
      const cand: [number, number, string][] = [[c, r, L[d]], [c, r, R[d]]]
      for (const s of [1, -1]) {
        const nc = c + D[d][0] * s
        const nr = r + D[d][1] * s
        if (!blocked(nc, nr)) cand.push([nc, nr, d])
      }
      for (const [nc, nr, nd] of cand) {
        let nm = m
        gems.forEach((g, i) => { if (g[0] === nc && g[1] === nr) nm |= 1 << i })
        const k = enc(nc, nr, nd, nm)
        if (!seen.has(k)) {
          seen.add(k)
          next.push([nc, nr, nd, nm])
        }
      }
    }
    frontier = next
    depth++
  }
  return Infinity
}

function check(p: Params, a: Answer): CheckResult {
  const program = a?.program
  const shape = programShapeErrors(program)
  if (shape.length) return { correct: false, score: 0, feedback: 'Something in that program could not be read — try rebuilding it.' }
  if (program.length === 0) return { correct: false, score: 0, feedback: 'Your program is empty. Tap blocks to tell the robot what to do, step by step.' }
  const theme = p.theme ?? 'warehouse'
  const t = THEMES[theme]
  const notAllowed = [...opsUsed(program)].filter((op) => !p.palette.includes(op))
  if (notAllowed.length) return { correct: false, score: 0, feedback: `This robot does not have the “${notAllowed[0]}” block on this mission. Use only the blocks in the palette.` }
  const maxDepth = p.maxDepth ?? 2
  if (nestingDepth(program) > maxDepth) {
    return { correct: false, score: 0, feedback: `Your loops are nested ${nestingDepth(program)} deep, but this robot handles ${maxDepth}. Try flattening one loop.` }
  }
  const worlds = [p.world, ...(p.extraWorlds ?? [])]
  for (let i = 0; i < worlds.length; i++) {
    const r = runProgram(worlds[i], program)
    if (r.outcome !== 'goal') {
      const label = worlds.length > 1 ? `map ${i + 1}` : ''
      const others = worlds.length > 1 && i > 0 ? ` It worked on ${i === 1 ? 'map 1' : `maps 1–${i}`}, so the route is memorised rather than general — use the sensor block to decide each turn.` : ''
      return { correct: false, score: i / worlds.length * 0.5, feedback: explainRun(worlds[i], program, r, theme, label) + others }
    }
  }
  const used = countBlocks(program)
  if (p.maxBlocks !== undefined && used > p.maxBlocks) {
    return {
      correct: false,
      score: 0.6,
      feedback: `It works! But it uses ${used} blocks and the ${t.robot}’s memory only holds ${p.maxBlocks}. Look for a group of blocks that repeats and wrap it in a Repeat block — that is what loops are for.`,
    }
  }
  const best = worlds.length === 1 && !p.palette.includes('untilGoal') ? shortestRouteBlocks(p.world) : Infinity
  const note = p.maxBlocks !== undefined
    ? ` ${used} of ${p.maxBlocks} blocks — ${used < p.maxBlocks ? 'with memory to spare' : 'a perfect fit'}.`
    : Number.isFinite(best) && used <= best
      ? ' That is the shortest possible route.'
      : ''
  const general = worlds.length > 1 ? ` The same program solved all ${worlds.length} maps, so it is an algorithm, not just a route.` : ''
  return { correct: true, score: 1, feedback: `Mission complete! The ${t.robot} reached the ${t.goal}.${note}${general}` }
}

export const logic: TemplateLogic<Params, Answer> = {
  id: 'sequence-path',
  name: 'Program the route',
  validate,
  check,
}
