// components/kids/activities/templates/debug-program/logic.ts
// debug-program — find and fix the bug in a robot's program, then run it.
//
// The child gets a program that FAILS (crashes, stops short, loops forever,
// misses a pickup). They can run it to watch it fail, then edit it: change a
// block into another, change a repeat count, move, delete or insert blocks.
// The fix must reach the goal on every map AND stay within `maxEdits`
// single-block edits of the original — real debugging is finding the smallest
// change that explains the failure, not rewriting the code.
//
// Difficulty ladder (ages 5 → 17):
//   Explorers  a 3–5 block route with one wrong turn, maxEdits 1, blocks only.
//   Builders   a wrong repeat count or a block outside a loop, maxEdits 1–2.
//   Inventors  nested loops, an off-by-one, Python 'toggle'.
//   Engineers  a sensor algorithm (untilGoal + ifWall) that works on map 1 but
//              not map 2 (extraWorlds), branches swapped, Python 'on'.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'
import {
  type Cmd,
  type Op,
  type Theme,
  type World,
  ALL_OPS,
  THEMES,
  countBlocks,
  editDistance,
  explainRun,
  newBlock,
  nestingDepth,
  opsUsed,
  programShapeErrors,
  runProgram,
  validateWorld,
} from '../sequence-path/engine'

export type { Cmd, Op, Theme, World, Cell, Dir } from '../sequence-path/engine'

export interface Params {
  /** The map the robot must cross (same model as sequence-path). */
  world: World
  /** More maps the fixed program must ALSO solve (max 3). Great for "works on my map" bugs. */
  extraWorlds?: World[]
  /** The buggy program. It MUST fail on at least one map (validate() runs it). */
  buggy: Cmd[]
  /**
   * Largest number of single-block edits accepted (1–5). Change op = 1,
   * change repeat count = 1, insert/delete one block = 1. Set it to the size
   * of the real bug so the child hunts for it instead of rewriting.
   */
  maxEdits: number
  /** Blocks the child may insert or change blocks into. Defaults to every op used in `buggy`. */
  palette?: Op[]
  /** Maximum nesting depth of loops/ifs (default 2). */
  maxDepth?: number
  /** Python view: 'off' | 'toggle' | 'on'. Default 'off'. */
  python?: 'off' | 'toggle' | 'on'
  /** Skin + vocabulary. Default 'warehouse'. */
  theme?: Theme
  /** Optional bug report shown above the code, written as a user would ("It crashes after the second turn"). ≤ 120 chars. */
  bugReport?: string
}

/** The fixed program. */
export interface Answer {
  program: Cmd[]
}

export function paletteFor(p: Params): Op[] {
  if (p.palette?.length) return p.palette
  const used = opsUsed(p.buggy ?? [])
  return ALL_OPS.filter((o) => used.has(o) || o === 'forward' || o === 'left' || o === 'right')
}

function validate(p: Params): string[] {
  if (!p || typeof p !== 'object') return ['params missing']
  const errs: string[] = []
  errs.push(...validateWorld(p.world, 'world'))
  if (p.extraWorlds !== undefined) {
    if (!Array.isArray(p.extraWorlds) || p.extraWorlds.length > 3) errs.push('extraWorlds must be an array of at most 3 worlds')
    else p.extraWorlds.forEach((w, i) => errs.push(...validateWorld(w, `extraWorlds[${i}]`)))
  }
  errs.push(...programShapeErrors(p.buggy, 'buggy'))
  if (!Number.isInteger(p.maxEdits) || p.maxEdits < 1 || p.maxEdits > 5) errs.push('maxEdits must be an integer 1–5')
  if (p.palette !== undefined) {
    if (!Array.isArray(p.palette) || p.palette.length === 0) errs.push('palette must be a non-empty array')
    else p.palette.forEach((o) => { if (!ALL_OPS.includes(o)) errs.push(`palette has unknown block "${String(o)}"`) })
  }
  if (p.maxDepth !== undefined && (!Number.isInteger(p.maxDepth) || p.maxDepth < 1 || p.maxDepth > 4)) errs.push('maxDepth must be an integer 1–4')
  if (p.python !== undefined && !['off', 'toggle', 'on'].includes(p.python)) errs.push('python must be off, toggle or on')
  if (p.theme !== undefined && !(p.theme in THEMES)) errs.push(`unknown theme "${String(p.theme)}"`)
  if (p.bugReport !== undefined && (typeof p.bugReport !== 'string' || p.bugReport.length > 120)) errs.push('bugReport must be a string of at most 120 characters')
  if (errs.length) return errs
  if (p.buggy.length === 0) errs.push('buggy must contain at least one block')
  if (nestingDepth(p.buggy) > (p.maxDepth ?? 2)) errs.push('buggy is nested deeper than maxDepth')
  const pal = paletteFor(p)
  const missing = [...opsUsed(p.buggy)].filter((o) => !pal.includes(o))
  if (missing.length) errs.push(`buggy uses blocks not in the palette: ${missing.join(', ')}`)
  const worlds = [p.world, ...(p.extraWorlds ?? [])]
  if (worlds.every((w) => runProgram(w, p.buggy).outcome === 'goal')) {
    errs.push('buggy already solves every map — there is no bug to find')
    return errs
  }
  const fix = findFix(p)
  if (fix === 'cap') errs.push(`too many combinations to prove a fix exists within ${p.maxEdits} edits — lower maxEdits or shorten buggy`)
  else if (!fix) errs.push(`no program within ${p.maxEdits} single-block ${p.maxEdits === 1 ? 'edit' : 'edits'} of buggy (using the palette) reaches the goal on every map — unsolvable`)
  return errs
}

const MAX_FIX_CANDIDATES = 40000

/** Every program one single-block edit away from `list` (the edits editDistance counts as 1). */
function oneEdit(list: Cmd[], pal: Op[], depth: number, maxDepth: number): Cmd[][] {
  const out: Cmd[][] = []
  const prims: Op[] = pal.filter((o) => o === 'forward' || o === 'back' || o === 'left' || o === 'right')
  const insertable = pal.filter((o) => prims.includes(o) || depth + 1 <= maxDepth)
  const at = (i: number, c: Cmd | null): Cmd[] => [...list.slice(0, i), ...(c ? [c] : []), ...list.slice(i + 1)]
  for (let i = 0; i <= list.length; i++) {
    insertable.forEach((o) => out.push([...list.slice(0, i), newBlock(o), ...list.slice(i)]))
    if (i === list.length) break
    const c = list[i]
    if (c.op === 'forward' || c.op === 'back' || c.op === 'left' || c.op === 'right') {
      prims.forEach((o) => { if (o !== c.op) out.push(at(i, { op: o } as Cmd)) })
      out.push(at(i, null))
    } else if (c.op === 'repeat') {
      for (let t = 1; t <= 20; t++) if (t !== c.times) out.push(at(i, { ...c, times: t }))
      if (c.body.length === 0) out.push(at(i, null))
      oneEdit(c.body, pal, depth + 1, maxDepth).forEach((b) => out.push(at(i, { ...c, body: b })))
    } else if (c.op === 'untilGoal') {
      if (c.body.length === 0) out.push(at(i, null))
      oneEdit(c.body, pal, depth + 1, maxDepth).forEach((b) => out.push(at(i, { ...c, body: b })))
    } else {
      if (c.then.length === 0 && c.else.length === 0) out.push(at(i, null))
      oneEdit(c.then, pal, depth + 1, maxDepth).forEach((b) => out.push(at(i, { ...c, then: b })))
      oneEdit(c.else, pal, depth + 1, maxDepth).forEach((b) => out.push(at(i, { ...c, else: b })))
    }
  }
  return out
}

/**
 * Breadth-first search for a program within `maxEdits` single-block edits of
 * `buggy` that reaches the goal on every map. Returns it, null when none
 * exists, or 'cap' when the search grew past MAX_FIX_CANDIDATES.
 */
export function findFix(p: Params): Cmd[] | null | 'cap' {
  const pal = paletteFor(p)
  const maxDepth = p.maxDepth ?? 2
  const worlds = [p.world, ...(p.extraWorlds ?? [])]
  const seen = new Set<string>([JSON.stringify(p.buggy)])
  let level: Cmd[][] = [p.buggy]
  for (let e = 1; e <= p.maxEdits; e++) {
    const next: Cmd[][] = []
    for (const prog of level) {
      for (const cand of oneEdit(prog, pal, 0, maxDepth)) {
        const k = JSON.stringify(cand)
        if (seen.has(k)) continue
        seen.add(k)
        if (seen.size > MAX_FIX_CANDIDATES) return 'cap'
        if (worlds.every((w) => runProgram(w, cand).outcome === 'goal')) return cand
        next.push(cand)
      }
    }
    level = next
  }
  return null
}

function check(p: Params, a: Answer): CheckResult {
  const program = a?.program
  if (programShapeErrors(program).length) return { correct: false, score: 0, feedback: 'Something in that program could not be read — tap “Reset to original” and try again.' }
  const theme = p.theme ?? 'warehouse'
  const t = THEMES[theme]
  const pal = paletteFor(p)
  const bad = [...opsUsed(program)].filter((o) => !pal.includes(o))
  if (bad.length) return { correct: false, score: 0, feedback: `The “${bad[0]}” block is not available on this robot. Fix the bug with the blocks you have.` }
  if (nestingDepth(program) > (p.maxDepth ?? 2)) return { correct: false, score: 0, feedback: 'Those loops are nested too deep for this robot. The bug is smaller than that!' }
  const edits = editDistance(p.buggy, program)
  if (edits === 0) {
    const worlds = [p.world, ...(p.extraWorlds ?? [])]
    const i = worlds.findIndex((w) => runProgram(w, program).outcome !== 'goal')
    const r = runProgram(worlds[i], program)
    return { correct: false, score: 0, feedback: `That is still the original program. ${explainRun(worlds[i], program, r, theme, worlds.length > 1 ? `map ${i + 1}` : '')} Find the block that causes it and change just that.` }
  }
  const worlds = [p.world, ...(p.extraWorlds ?? [])]
  for (let i = 0; i < worlds.length; i++) {
    const r = runProgram(worlds[i], program)
    if (r.outcome !== 'goal') {
      return { correct: false, score: 0.25 * (i / worlds.length), feedback: `Good thinking, but the bug is still there. ${explainRun(worlds[i], program, r, theme, worlds.length > 1 ? `map ${i + 1}` : '')}` }
    }
  }
  if (edits > p.maxEdits) {
    return {
      correct: false,
      score: 0.6,
      feedback: `It works — but you made ${edits} changes, and the real bug needs only ${p.maxEdits}. Good debuggers change the smallest thing that fixes the problem, so nothing else breaks. Tap “Reset to original” and look for the one ${p.maxEdits === 1 ? 'block' : 'spot'} that goes wrong.`,
    }
  }
  const blocks = countBlocks(program)
  return {
    correct: true,
    score: 1,
    feedback: `Bug squashed with ${edits} ${edits === 1 ? 'change' : 'changes'}! The ${t.robot} now reaches the ${t.goal}${worlds.length > 1 ? ` on all ${worlds.length} maps` : ''} with ${blocks} blocks. Run, watch, find the first thing that goes wrong, fix only that — that is how engineers debug.`,
  }
}

export const logic: TemplateLogic<Params, Answer> = {
  id: 'debug-program',
  name: 'Fix the bug',
  validate,
  check,
}
