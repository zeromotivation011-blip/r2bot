// lib/kids/ai/talk/describe.ts
// Plain words for a block program: "drive 30 cm at 50% speed", "repeat until
// distance < 20 cm". Used by the "how I understood you" panel and the tests.
// Pure data, no DOM.

import type { Expr, Stmt } from '../../sim/program'

const SENSOR_WORDS: Record<string, string> = {
  distance_cm: 'distance',
  line_seen: 'line seen',
  line_offset: 'line offset',
  reflectance: 'reflectance',
  floor_color: 'floor colour',
  bumped: 'bumped',
  heading_deg: 'heading',
  timer_s: 'timer',
  battery_pct: 'battery %',
}

export function exprText(e: Expr): string {
  switch (e.k) {
    case 'number':
      return String(Math.round(e.v * 100) / 100)
    case 'text':
      return `“${e.v}”`
    case 'sensor':
      return SENSOR_WORDS[e.s] ?? e.s
    case 'get_var':
      return e.name
    case 'not':
      return `not ${exprText(e.a)}`
    case 'and':
    case 'or':
      return `${exprText(e.a)} ${e.k} ${exprText(e.b)}`
    case 'compare': {
      const unit = e.a.k === 'sensor' && e.a.s === 'distance_cm' ? ' cm' : e.a.k === 'sensor' && e.a.s === 'timer_s' ? ' s' : ''
      return `${exprText(e.a)} ${e.op} ${exprText(e.b)}${unit}`
    }
    case 'math':
      return `(${exprText(e.a)} ${e.op === '*' ? '×' : e.op === '/' ? '÷' : e.op} ${exprText(e.b)})`
  }
}

/** One line for one block (children are not included). */
export function stmtText(s: Stmt): string {
  switch (s.op) {
    case 'drive_for':
      return `drive at ${exprText(s.speedPct)}% for ${exprText(s.seconds)} s`
    case 'drive_distance':
      return `drive ${exprText(s.cm)} cm at ${exprText(s.speedPct)}%`
    case 'turn_degrees': {
      const d = s.deg.k === 'number' ? s.deg.v : null
      if (d === null) return `turn ${exprText(s.deg)}°`
      return `turn ${Math.abs(d)}° ${d >= 0 ? 'left' : 'right'}`
    }
    case 'set_motors':
      return `motors: left ${exprText(s.leftPct)}%, right ${exprText(s.rightPct)}%`
    case 'stop':
      return 'stop motors'
    case 'wait':
      return `wait ${exprText(s.seconds)} s`
    case 'repeat':
      return `repeat ${exprText(s.times)} times`
    case 'repeat_until':
      return `repeat until ${exprText(s.cond)}`
    case 'forever':
      return 'forever'
    case 'if':
      return s.else ? `if ${exprText(s.cond)} … else …` : `if ${exprText(s.cond)}`
    case 'grip_open':
      return 'open claw'
    case 'grip_close':
      return 'close claw'
    case 'pen_down':
      return 'pen down'
    case 'pen_up':
      return 'pen up'
    case 'set_carry':
      return `carry load ${s.pos}`
    case 'light_on':
      return 'light on'
    case 'light_off':
      return 'light off'
    case 'beep':
      return 'beep'
    case 'say':
      return `say ${exprText(s.text)}`
    case 'set_var':
      return `set ${s.name} to ${exprText(s.value)}`
    case 'change_var':
      return `change ${s.name} by ${exprText(s.by)}`
  }
}

/** The whole program as an indented outline (tests and the Engineers' "read the program" view). */
export function programOutline(list: Stmt[], depth = 0): string[] {
  const out: string[] = []
  const pad = '  '.repeat(depth)
  for (const s of list) {
    out.push(pad + stmtText(s))
    if ('body' in s) out.push(...programOutline(s.body, depth + 1))
    if (s.op === 'if') {
      out.push(...programOutline(s.then, depth + 1))
      if (s.else) {
        out.push(`${pad}else`)
        out.push(...programOutline(s.else, depth + 1))
      }
    }
  }
  return out
}
