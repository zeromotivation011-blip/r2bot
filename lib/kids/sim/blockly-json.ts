// lib/kids/sim/blockly-json.ts
// Program <-> Blockly's JSON serialization (Blockly.serialization.workspaces).
// Pure data in and out — no Blockly import — so it runs headless in verify.ts
// and the stored lesson format never depends on the editor library.
//
// Block types are exactly the shared block-set ids. The only extra block is
// the hat "when_run" ("when ▶ is pressed"); the program is the stack under it.

import type { Expr, Program, SensorId, Stmt } from './program'

export interface BBlock {
  type: string
  id?: string
  x?: number
  y?: number
  fields?: Record<string, string | number>
  inputs?: Record<string, { block?: BBlock; shadow?: BBlock }>
  next?: { block?: BBlock }
  [k: string]: unknown
}

export interface BWorkspace {
  blocks?: { languageVersion: number; blocks: BBlock[] }
  [k: string]: unknown
}

export const HAT = 'when_run'

export const SENSOR_IDS: SensorId[] = ['distance_cm', 'line_seen', 'line_offset', 'floor_color', 'bumped', 'heading_deg', 'timer_s', 'battery_pct']
const SIMPLE_STMTS = ['stop', 'grip_open', 'grip_close', 'pen_down', 'pen_up', 'light_on', 'light_off', 'beep'] as const

// ── Program → Blockly ─────────────────────────────────────────────────────
function exprBlock(e: Expr): BBlock {
  switch (e.k) {
    case 'number':
      return { type: 'number', fields: { NUM: e.v } }
    case 'text':
      return { type: 'text', fields: { TEXT: e.v } }
    case 'sensor':
      return { type: e.s }
    case 'get_var':
      return { type: 'get_var', fields: { VAR: e.name } }
    case 'not':
      return { type: 'not', inputs: { A: valueInput(e.a) } }
    case 'compare':
    case 'math':
      return { type: e.k, fields: { OP: e.op }, inputs: { A: valueInput(e.a), B: valueInput(e.b) } }
    case 'and':
    case 'or':
      return { type: e.k, inputs: { A: valueInput(e.a), B: valueInput(e.b) } }
  }
}

function valueInput(e: Expr): { block?: BBlock; shadow?: BBlock } {
  // Plain numbers and words are "shadows": the child can type over them.
  if (e.k === 'number' || e.k === 'text') return { shadow: exprBlock(e) }
  return { block: exprBlock(e) }
}

function stmtBlock(s: Stmt): BBlock {
  const b: BBlock = { type: s.op, id: s.id }
  switch (s.op) {
    case 'drive_for':
      b.inputs = { SPEED: valueInput(s.speedPct), SECONDS: valueInput(s.seconds) }
      break
    case 'drive_distance':
      b.inputs = { CM: valueInput(s.cm), SPEED: valueInput(s.speedPct) }
      break
    case 'turn_degrees':
      b.inputs = { DEG: valueInput(s.deg), SPEED: valueInput(s.speedPct) }
      break
    case 'set_motors':
      b.inputs = { LEFT: valueInput(s.leftPct), RIGHT: valueInput(s.rightPct) }
      break
    case 'wait':
      b.inputs = { SECONDS: valueInput(s.seconds) }
      break
    case 'repeat':
      b.inputs = { TIMES: valueInput(s.times), ...stack('DO', s.body) }
      break
    case 'repeat_until':
      b.inputs = { COND: valueInput(s.cond), ...stack('DO', s.body) }
      break
    case 'forever':
      b.inputs = { ...stack('DO', s.body) }
      break
    case 'if':
      if (s.else) {
        b.type = 'if_else'
        b.inputs = { COND: valueInput(s.cond), ...stack('DO', s.then), ...stack('ELSE', s.else) }
      } else {
        b.inputs = { COND: valueInput(s.cond), ...stack('DO', s.then) }
      }
      break
    case 'say':
      b.inputs = { TEXT: valueInput(s.text) }
      break
    case 'set_var':
      b.fields = { VAR: s.name }
      b.inputs = { VALUE: valueInput(s.value) }
      break
    case 'change_var':
      b.fields = { VAR: s.name }
      b.inputs = { BY: valueInput(s.by) }
      break
    default:
      break
  }
  return b
}

function chain(list: Stmt[]): BBlock | undefined {
  let head: BBlock | undefined
  let tail: BBlock | undefined
  for (const s of list) {
    const b = stmtBlock(s)
    if (!head) head = b
    else if (tail) tail.next = { block: b }
    tail = b
  }
  return head
}

function stack(name: string, list: Stmt[]): Record<string, { block?: BBlock }> {
  const b = chain(list)
  return b ? { [name]: { block: b } } : {}
}

export function programToBlockly(p: Program): BWorkspace {
  const hat: BBlock = { type: HAT, id: 'start', x: 24, y: 24, deletable: false }
  const body = chain(p.body)
  if (body) hat.next = { block: body }
  return { blocks: { languageVersion: 0, blocks: [hat] } }
}

// ── Blockly → Program ─────────────────────────────────────────────────────
/**
 * A block the child switched off (right-click → Disable) does not run.
 * Blockly 12 saves that as `disabledReasons: [...]`; older saves used `enabled: false` / `disabled: true`.
 */
export function isDisabled(b: BBlock): boolean {
  if (Array.isArray(b.disabledReasons) && b.disabledReasons.length > 0) return true
  return b.enabled === false || b.disabled === true
}

function val(input: { block?: BBlock; shadow?: BBlock } | undefined, fallback: Expr): Expr {
  const b = input?.block ?? input?.shadow
  return b ? toExpr(b, fallback) : fallback
}

function field(b: BBlock, name: string): string {
  const v = b.fields?.[name]
  return v === undefined ? '' : String(v)
}

function toExpr(b: BBlock, fallback: Expr): Expr {
  const ZERO: Expr = { k: 'number', v: 0 }
  switch (b.type) {
    case 'number': {
      const n = Number(b.fields?.NUM)
      return { k: 'number', v: Number.isFinite(n) ? n : 0 }
    }
    case 'text':
      return { k: 'text', v: field(b, 'TEXT') }
    case 'get_var':
      return { k: 'get_var', name: field(b, 'VAR') || 'x' }
    case 'not':
      return { k: 'not', a: val(b.inputs?.A, { k: 'number', v: 0 }) }
    case 'compare': {
      const op = field(b, 'OP')
      return { k: 'compare', op: op === '>' ? '>' : op === '=' ? '=' : '<', a: val(b.inputs?.A, ZERO), b: val(b.inputs?.B, ZERO) }
    }
    case 'math': {
      const op = field(b, 'OP')
      return { k: 'math', op: op === '-' ? '-' : op === '*' ? '*' : op === '/' ? '/' : '+', a: val(b.inputs?.A, ZERO), b: val(b.inputs?.B, ZERO) }
    }
    case 'and':
    case 'or':
      return { k: b.type, a: val(b.inputs?.A, ZERO), b: val(b.inputs?.B, ZERO) }
    default:
      if ((SENSOR_IDS as string[]).includes(b.type)) return { k: 'sensor', s: b.type as SensorId }
      return fallback
  }
}

function toStmts(first: BBlock | undefined): Stmt[] {
  const out: Stmt[] = []
  const N0: Expr = { k: 'number', v: 0 }
  for (let b = first; b; b = b.next?.block) {
    if (isDisabled(b)) continue
    const id = b.id ?? `${b.type}-${out.length}`
    const inp = b.inputs ?? {}
    switch (b.type) {
      case 'drive_for':
        out.push({ op: 'drive_for', id, speedPct: val(inp.SPEED, { k: 'number', v: 50 }), seconds: val(inp.SECONDS, { k: 'number', v: 1 }) })
        break
      case 'drive_distance':
        out.push({ op: 'drive_distance', id, cm: val(inp.CM, { k: 'number', v: 20 }), speedPct: val(inp.SPEED, { k: 'number', v: 50 }) })
        break
      case 'turn_degrees':
        out.push({ op: 'turn_degrees', id, deg: val(inp.DEG, { k: 'number', v: 90 }), speedPct: val(inp.SPEED, { k: 'number', v: 40 }) })
        break
      case 'set_motors':
        out.push({ op: 'set_motors', id, leftPct: val(inp.LEFT, N0), rightPct: val(inp.RIGHT, N0) })
        break
      case 'wait':
        out.push({ op: 'wait', id, seconds: val(inp.SECONDS, { k: 'number', v: 1 }) })
        break
      case 'repeat':
        out.push({ op: 'repeat', id, times: val(inp.TIMES, { k: 'number', v: 1 }), body: toStmts(inp.DO?.block) })
        break
      case 'repeat_until':
        out.push({ op: 'repeat_until', id, cond: val(inp.COND, { k: 'number', v: 1 }), body: toStmts(inp.DO?.block) })
        break
      case 'forever':
        out.push({ op: 'forever', id, body: toStmts(inp.DO?.block) })
        break
      case 'if':
        out.push({ op: 'if', id, cond: val(inp.COND, N0), then: toStmts(inp.DO?.block) })
        break
      case 'if_else':
        out.push({ op: 'if', id, cond: val(inp.COND, N0), then: toStmts(inp.DO?.block), else: toStmts(inp.ELSE?.block) })
        break
      case 'say':
        out.push({ op: 'say', id, text: val(inp.TEXT, { k: 'text', v: '' }) })
        break
      case 'set_var':
        out.push({ op: 'set_var', id, name: field(b, 'VAR') || 'x', value: val(inp.VALUE, N0) })
        break
      case 'change_var':
        out.push({ op: 'change_var', id, name: field(b, 'VAR') || 'x', by: val(inp.BY, { k: 'number', v: 1 }) })
        break
      default:
        if ((SIMPLE_STMTS as readonly string[]).includes(b.type)) out.push({ op: b.type as (typeof SIMPLE_STMTS)[number], id })
    }
  }
  return out
}

/** The program under the "when ▶ pressed" block. Loose blocks elsewhere do not run (like any block editor). */
export function blocklyToProgram(ws: BWorkspace): Program {
  const hat = ws.blocks?.blocks.find((b) => b.type === HAT)
  return { body: toStmts(hat?.next?.block) }
}
