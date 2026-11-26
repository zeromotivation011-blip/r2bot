// components/kids/activities/templates/predict-output/logic.ts
// predict-output — read a robot's program and predict what it prints (or the
// final value of a variable) BEFORE running it. Then step through a full trace
// (line highlight + variable table + console) to see exactly why.
//
// Code is written as real Python (a safe subset — see lang.ts). Younger bands
// see it as friendly blocks ("set speed to 2", "repeat 3 times"); older bands
// see Python, or can toggle.
//
// Difficulty ladder (ages 5 → 17):
//   Explorers  2–4 lines, one repeat, numbers ≤ 20, view 'blocks', scratchpad on.
//   Builders   a loop with += and an if, view 'blocks' or 'toggle'.
//   Inventors  while loops, if/elif/else, %, several prints, view 'toggle'.
//   Engineers  nested loops, //, min/max clamping, a P-controller or sensor
//              filter; view 'python', showOutputCount false.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'
import { type RunOutput, type Stmt, LangError, fmt, parse, run, variableNames } from './lang'

export interface Params {
  /**
   * The program, in the Python subset of lang.ts (assignments, += -= *=,
   * print, if/elif/else, for … in range(…), while, ints, True/False,
   * + - * // %, comparisons, and/or/not, abs/min/max). Indent with 4 spaces.
   * Keep it about robots (speed, battery, distance, sensor readings).
   */
  code: string
  /**
   * What the child predicts:
   *   { kind: 'output' }                — every printed line, in order (≤ 8 lines)
   *   { kind: 'variable', name: 'x' }   — the value of `x` when the program ends
   */
  ask: { kind: 'output' } | { kind: 'variable'; name: string }
  /** 'blocks' (friendly words), 'python', or 'toggle' (child switches; starts on blocks). Default 'python'. */
  view?: 'blocks' | 'python' | 'toggle'
  /** Tell the child how many lines will be printed (default true). False = they must work it out too. */
  showOutputCount?: boolean
  /** Show a variable notepad with steppers the child can use while tracing in their head (default true for blocks view). */
  scratchpad?: boolean
  /** Step limit for the interpreter (default 500, max 2000). */
  maxSteps?: number
}

/** The prediction: printed lines in order (e.g. ['4', '8']), or one value for ask.kind 'variable'. Booleans as 'True'/'False'. */
export interface Answer {
  values: string[]
}

export interface Compiled {
  prog: Stmt[]
  result: RunOutput
  expected: string[]
}

/** Parse + run once. Throws LangError on bad code. */
export function compile(p: Params): Compiled {
  const prog = parse(p.code)
  const result = run(prog, Math.min(p.maxSteps ?? 500, 2000))
  const expected = p.ask.kind === 'output'
    ? result.out
    : p.ask.name in result.vars ? [fmt(result.vars[p.ask.name])] : []
  return { prog, result, expected }
}

function validate(p: Params): string[] {
  if (!p || typeof p !== 'object') return ['params missing']
  if (typeof p.code !== 'string' || !p.code.trim()) return ['code must be a non-empty string']
  if (!p.ask || (p.ask.kind !== 'output' && p.ask.kind !== 'variable')) return ['ask.kind must be "output" or "variable"']
  if (p.view !== undefined && !['blocks', 'python', 'toggle'].includes(p.view)) return ['view must be blocks, python or toggle']
  if (p.maxSteps !== undefined && (!Number.isInteger(p.maxSteps) || p.maxSteps < 10 || p.maxSteps > 2000)) return ['maxSteps must be an integer 10–2000']
  let c: Compiled
  try {
    c = compile(p)
  } catch (e) {
    return [`code does not parse: ${e instanceof LangError ? e.message : String(e)}`]
  }
  const errs: string[] = []
  if (c.result.error) errs.push(`code fails when run: ${c.result.error}`)
  if (p.ask.kind === 'output') {
    if (c.result.out.length === 0) errs.push('the program prints nothing, so there is nothing to predict')
    if (c.result.out.length > 8) errs.push(`the program prints ${c.result.out.length} lines; keep it to 8 or fewer`)
  } else {
    const name = p.ask.name
    if (!variableNames(c.prog).includes(name)) errs.push(`ask.name "${name}" is not a variable in the program`)
    else if (!(name in c.result.vars)) errs.push(`"${name}" never gets a value`)
  }
  c.expected.forEach((v) => { if (v.length > 12) errs.push(`printed value "${v}" is too long to type`) })
  if (c.result.out.some((o) => o.includes(' '))) errs.push('print one value per line (print(a, b) is hard to predict on a phone)')
  return errs
}

/** Canonical form of a typed value: trims, removes spaces and leading +, maps true/false → True/False, −5 → -5, 007 → 7. */
export function normalize(v: string): string {
  const s = String(v ?? '').trim().replace(/\s+/g, '').replace(/[−–]/g, '-')
  if (/^true$/i.test(s)) return 'True'
  if (/^false$/i.test(s)) return 'False'
  if (/^[+-]?\d+$/.test(s)) return String(Number(s))
  return s
}

function check(p: Params, a: Answer): CheckResult {
  let c: Compiled
  try {
    c = compile(p)
  } catch {
    return { correct: false, score: 0, feedback: 'This program could not be read.' }
  }
  const got = (a?.values ?? []).map(normalize)
  const want = c.expected
  const { trace } = c.result
  if (p.ask.kind === 'variable') {
    const name = p.ask.name
    const history = trace.filter((s) => s.note.startsWith(`${name} = `)).map((s) => s.note.slice(name.length + 3))
    const story = history.length > 1 ? ` ${name} went ${history.slice(0, 10).join(' → ')}${history.length > 10 ? ' → …' : ''}.` : ''
    if (got[0] === want[0]) return { correct: true, score: 1, feedback: `Exactly right: ${name} ends as ${want[0]}.${story} You ran the program in your head — that is called tracing.` }
    if (!got[0]) return { correct: false, score: 0, feedback: `Type what you think ${name} is when the program ends.` }
    const seen = history.includes(got[0])
    return {
      correct: false,
      score: 0,
      feedback: seen
        ? `${name} does become ${got[0]} at one point — but the program keeps going after that. Step through the trace and watch for the very last change.`
        : `Not quite. Trace it line by line and write each new value of ${name} on the notepad.${history.length > 1 ? ` (Hint: it changes ${history.length - 1} times.)` : ''}`,
    }
  }
  // Output prediction.
  if (got.length === 0 || got.every((g) => g === '')) return { correct: false, score: 0, feedback: 'Fill in what you think the robot prints.' }
  let matched = 0
  for (let i = 0; i < Math.min(got.length, want.length); i++) if (got[i] === want[i]) matched++
  const score = matched / Math.max(want.length, got.length)
  if (got.length === want.length && matched === want.length) {
    return { correct: true, score: 1, feedback: `Perfect prediction: ${want.join(', ')}. You traced every step of the program in your head, just like a programmer checking code before it runs on a real robot.` }
  }
  if (got.length !== want.length) {
    const fewer = got.length < want.length
    return {
      correct: false,
      score: score * 0.8,
      feedback: `The robot prints ${want.length} ${want.length === 1 ? 'line' : 'lines'}, not ${got.length}. ${fewer ? 'A loop probably runs more times than you counted' : 'A loop probably stops sooner than you counted'} — check exactly when it ends${hasRangeLoop(c.prog) ? ' (range(n) counts 0 up to n−1)' : ''}.`,
    }
  }
  const i = got.findIndex((g, k) => g !== want[k])
  const printStep = trace.filter((s) => s.note.startsWith('printed '))[i]
  const vars = printStep ? Object.entries(printStep.vars).map(([k, v]) => `${k} = ${fmt(v)}`).join(', ') : ''
  return {
    correct: false,
    score,
    feedback: `${matched > 0 ? `${matched} of ${want.length} right! ` : ''}Line ${i + 1} is where it goes wrong: you said ${got[i] || '(blank)'}. At that moment ${vars || 'the variables had different values'}. Step through the trace to watch it happen.`,
  }
}

function hasRangeLoop(prog: Stmt[]): boolean {
  return prog.some((s) => s.k === 'for' || (s.k === 'while' && hasRangeLoop(s.body)) || (s.k === 'if' && s.branches.some((b) => hasRangeLoop(b.body))))
}

export const logic: TemplateLogic<Params, Answer> = {
  id: 'predict-output',
  name: 'Predict the output',
  validate,
  check,
}
