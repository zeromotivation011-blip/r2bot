// lib/kids/ai/talk/schema.ts
// Strict validator for a block program that came from OUTSIDE the parser (the
// optional AI helper). Nothing the model returns reaches the robot unless it
// rebuilds cleanly here: known blocks only, known sensors only, numbers inside
// the arena's limits, a small size, shallow nesting. Ids are re-issued, extra
// keys are dropped, and a "say" is kept only if its words were in what the
// child wrote (the model may not put words in the robot's mouth).
//
// Used on the server (app/api/kids/talk) AND again in the browser.

import type { Expr, Program, SensorId, Stmt } from '../../sim/program'
import { LIMITS } from './parser'
import { kidSafeSay } from './privacy'

export const MAX_STMTS = 40
export const MAX_DEPTH = 4
const MAX_EXPR_DEPTH = 4

const SENSORS: SensorId[] = ['distance_cm', 'line_seen', 'line_offset', 'floor_color', 'bumped', 'heading_deg', 'timer_s', 'battery_pct']
const COLORS = ['white', 'black', 'red', 'green', 'blue', 'yellow']
const SIMPLE = ['stop', 'grip_open', 'grip_close', 'pen_down', 'pen_up', 'light_on', 'light_off', 'beep'] as const

export type Validation = { ok: true; program: Program; dropped: string[] } | { ok: false; error: string }

class Invalid extends Error {}

function isObj(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object' && !Array.isArray(x)
}

/** Words in any script (letters and digits), lower-cased, punctuation ignored. */
function tokens(s: string): string[] {
  return s.normalize('NFKC').toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? []
}

export function validateProgram(raw: unknown, source?: string): Validation {
  let n = 0
  let count = 0
  const dropped: string[] = []
  const srcKey = source !== undefined ? ` ${tokens(source).join(' ')} ` : null

  // A number slot (distance, speed, seconds, times …) takes a plain number only, clamped to the
  // arena's limits — never maths or a sensor, which could slip past the clamp.
  const num = (x: unknown, lo: number, hi: number): Expr => {
    const e = expr(x, 0)
    if (e.k !== 'number' || !Number.isFinite(e.v)) throw new Invalid('a number slot needs a plain number')
    return { k: 'number', v: Math.min(hi, Math.max(lo, Math.round(e.v * 100) / 100)) }
  }
  // Motor power is the one slot where a sensor formula is allowed (line following steers with
  // "50 + line_offset × 40"): the engine clamps every motor to ±100 % whatever the formula gives.
  const motor = (x: unknown): Expr => {
    const e = expr(x, 0)
    if (e.k === 'number') return { k: 'number', v: Math.min(LIMITS.speedMax, Math.max(-LIMITS.speedMax, Math.round(e.v * 100) / 100)) }
    if (e.k !== 'math' && e.k !== 'sensor') throw new Invalid('motor power must be a number or a formula')
    return e
  }

  function expr(x: unknown, depth: number): Expr {
    if (depth > MAX_EXPR_DEPTH) throw new Invalid('expression too deep')
    if (!isObj(x)) throw new Invalid('expression is not an object')
    switch (x.k) {
      case 'number': {
        const v = typeof x.v === 'number' ? x.v : Number(x.v)
        if (!Number.isFinite(v) || Math.abs(v) > 10000) throw new Invalid('bad number')
        return { k: 'number', v }
      }
      case 'text': {
        if (typeof x.v !== 'string') throw new Invalid('bad text')
        const v = x.v.trim().toLowerCase()
        // In conditions the only text a robot can compare is a floor colour.
        if (!COLORS.includes(v)) throw new Invalid('unknown colour')
        return { k: 'text', v }
      }
      case 'sensor':
        if (typeof x.s !== 'string' || !SENSORS.includes(x.s as SensorId)) throw new Invalid('unknown sensor')
        return { k: 'sensor', s: x.s as SensorId }
      case 'compare':
        if (x.op !== '<' && x.op !== '>' && x.op !== '=') throw new Invalid('bad compare')
        return { k: 'compare', op: x.op, a: expr(x.a, depth + 1), b: expr(x.b, depth + 1) }
      case 'and':
      case 'or':
        return { k: x.k, a: expr(x.a, depth + 1), b: expr(x.b, depth + 1) }
      case 'not':
        return { k: 'not', a: expr(x.a, depth + 1) }
      case 'math':
        if (x.op !== '+' && x.op !== '-' && x.op !== '*' && x.op !== '/') throw new Invalid('bad maths')
        return { k: 'math', op: x.op, a: expr(x.a, depth + 1), b: expr(x.b, depth + 1) }
      default:
        throw new Invalid('unknown expression')
    }
  }

  function list(x: unknown, depth: number): Stmt[] {
    if (!Array.isArray(x)) throw new Invalid('block list is not a list')
    if (depth > MAX_DEPTH) throw new Invalid('too deeply nested')
    const out: Stmt[] = []
    for (const s of x) {
      const st = stmt(s, depth)
      if (st) out.push(st)
    }
    return out
  }

  function stmt(x: unknown, depth: number): Stmt | null {
    if (!isObj(x) || typeof x.op !== 'string') throw new Invalid('block is not an object')
    if (++count > MAX_STMTS) throw new Invalid('too many blocks')
    const id = `ai${++n}`
    const S = LIMITS.speedMax
    switch (x.op) {
      case 'drive_for':
        return { op: 'drive_for', id, speedPct: num(x.speedPct, -S, S), seconds: num(x.seconds, 0, LIMITS.seconds) }
      case 'drive_distance':
        return { op: 'drive_distance', id, cm: num(x.cm, -LIMITS.cm, LIMITS.cm), speedPct: num(x.speedPct, LIMITS.speedMin, S) }
      case 'turn_degrees':
        return { op: 'turn_degrees', id, deg: num(x.deg, -LIMITS.deg, LIMITS.deg), speedPct: num(x.speedPct, LIMITS.speedMin, S) }
      case 'set_motors':
        return { op: 'set_motors', id, leftPct: motor(x.leftPct), rightPct: motor(x.rightPct) }
      case 'wait':
        return { op: 'wait', id, seconds: num(x.seconds, 0, LIMITS.seconds) }
      case 'repeat':
        return { op: 'repeat', id, times: num(x.times, 1, LIMITS.times), body: list(x.body, depth + 1) }
      case 'repeat_until':
        return { op: 'repeat_until', id, cond: expr(x.cond, 0), body: list(x.body, depth + 1) }
      case 'forever':
        return { op: 'forever', id, body: list(x.body, depth + 1) }
      case 'if': {
        const then = list(x.then, depth + 1)
        return x.else !== undefined ? { op: 'if', id, cond: expr(x.cond, 0), then, else: list(x.else, depth + 1) } : { op: 'if', id, cond: expr(x.cond, 0), then }
      }
      case 'say': {
        const t = isObj(x.text) && typeof x.text.v === 'string' ? x.text.v : typeof x.text === 'string' ? x.text : null
        if (t === null) throw new Invalid('bad say')
        const v = t.replace(/[^\p{L}\p{M}\p{N} !?.,'’-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, LIMITS.sayChars)
        const words = tokens(v)
        // Only words the child wrote, in the order they wrote them, may be said — in any script.
        if (!v || words.length === 0 || (srcKey !== null && !srcKey.includes(` ${words.join(' ')} `))) {
          dropped.push(v || '(empty)')
          return null
        }
        return { op: 'say', id, text: { k: 'text', v: kidSafeSay(v).text } }
      }
      default:
        if ((SIMPLE as readonly string[]).includes(x.op)) return { op: x.op as (typeof SIMPLE)[number], id }
        throw new Invalid(`unknown block "${String(x.op).slice(0, 20)}"`)
    }
  }

  try {
    if (!isObj(raw)) throw new Invalid('not a program')
    const body = list(raw.body, 0)
    if (body.length === 0) throw new Invalid('empty program')
    return { ok: true, program: { body }, dropped }
  } catch (e) {
    return { ok: false, error: e instanceof Invalid ? e.message : 'invalid program' }
  }
}
