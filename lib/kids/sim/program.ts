// lib/kids/sim/program.ts
// A robot program as plain JSON — the SHARED BLOCK SET used by every R2BOT Kids
// track. The Blockly editor converts to and from this (see blockly-json.ts),
// the interpreter runs it, and stored lessons keep it. Block ids here are the
// same ids the Blockly blocks use.
//
// Statements carry the Blockly block id (`id`) so the editor can light up the
// block that is running.

import { CAPABILITY_NEEDS, capabilitiesOf, type Capability, type RobotDesign } from '../robot-design'

export type SensorId = 'distance_cm' | 'line_seen' | 'line_offset' | 'floor_color' | 'bumped' | 'heading_deg' | 'timer_s' | 'battery_pct'

export type Expr =
  | { k: 'number'; v: number }
  | { k: 'text'; v: string }
  | { k: 'sensor'; s: SensorId; id?: string }
  | { k: 'compare'; op: '<' | '>' | '='; a: Expr; b: Expr; id?: string }
  | { k: 'and' | 'or'; a: Expr; b: Expr; id?: string }
  | { k: 'not'; a: Expr; id?: string }
  | { k: 'math'; op: '+' | '-' | '*' | '/'; a: Expr; b: Expr; id?: string }
  | { k: 'get_var'; name: string; id?: string }

export type Stmt =
  | { op: 'drive_for'; id: string; speedPct: Expr; seconds: Expr }
  | { op: 'drive_distance'; id: string; cm: Expr; speedPct: Expr }
  | { op: 'turn_degrees'; id: string; deg: Expr; speedPct: Expr }
  | { op: 'set_motors'; id: string; leftPct: Expr; rightPct: Expr }
  | { op: 'stop'; id: string }
  | { op: 'wait'; id: string; seconds: Expr }
  | { op: 'repeat'; id: string; times: Expr; body: Stmt[] }
  | { op: 'repeat_until'; id: string; cond: Expr; body: Stmt[] }
  | { op: 'forever'; id: string; body: Stmt[] }
  | { op: 'if'; id: string; cond: Expr; then: Stmt[]; else?: Stmt[] }
  | { op: 'grip_open' | 'grip_close' | 'pen_down' | 'pen_up' | 'light_on' | 'light_off' | 'beep'; id: string }
  | { op: 'say'; id: string; text: Expr }
  | { op: 'set_var'; id: string; name: string; value: Expr }
  | { op: 'change_var'; id: string; name: string; by: Expr }

export interface Program {
  /** Statements under the "when ▶ pressed" hat block. */
  body: Stmt[]
}

export type StmtOp = Stmt['op']

/** Which part a block needs. A block whose need is missing is locked. */
export const SENSOR_NEEDS: Record<SensorId, Capability | null> = {
  distance_cm: 'see-wall',
  line_seen: 'follow-line',
  line_offset: 'follow-line',
  floor_color: 'see-color',
  bumped: 'feel-bump',
  heading_deg: null, // gyro is built in
  timer_s: null,
  battery_pct: null, // every robot can read its own battery (roadmap #39)
}

export const STMT_NEEDS: Partial<Record<StmtOp, Capability>> = {
  grip_open: 'grab',
  grip_close: 'grab',
  pen_down: 'draw',
  pen_up: 'draw',
  light_on: 'light',
  light_off: 'light',
}

/** Every block id the program uses (statements and reporters). */
export function usedBlockIds(p: Program): Set<string> {
  const out = new Set<string>()
  const walkE = (e: Expr): void => {
    switch (e.k) {
      case 'number':
      case 'text':
        out.add(e.k)
        return
      case 'sensor':
        out.add(e.s)
        return
      case 'get_var':
        out.add('get_var')
        return
      case 'not':
        out.add('not')
        walkE(e.a)
        return
      default:
        out.add(e.k)
        walkE(e.a)
        walkE(e.b)
    }
  }
  const walkS = (list: Stmt[]): void => {
    for (const s of list) {
      out.add(s.op === 'if' && s.else ? 'if_else' : s.op)
      for (const v of Object.values(s)) {
        if (v && typeof v === 'object' && !Array.isArray(v) && 'k' in v) walkE(v as Expr)
      }
      if ('body' in s) walkS(s.body)
      if (s.op === 'if') {
        walkS(s.then)
        if (s.else) walkS(s.else)
      }
    }
  }
  walkS(p.body)
  return out
}

/** The capability a block id needs, or null. */
export function blockNeeds(blockId: string): Capability | null {
  if (blockId in SENSOR_NEEDS) return SENSOR_NEEDS[blockId as SensorId]
  return STMT_NEEDS[blockId as StmtOp] ?? null
}

export interface MissingPart {
  block: string
  needs: Capability
  /** Plain words for a child: "Your robot needs Distance Eyes or a Camera Eye for this block." */
  message: string
}

export const BLOCK_LABEL: Record<string, string> = {
  distance_cm: 'distance',
  line_seen: 'line seen?',
  line_offset: 'line offset',
  floor_color: 'floor colour',
  bumped: 'bumped?',
  grip_open: 'open claw',
  grip_close: 'close claw',
  pen_down: 'pen down',
  pen_up: 'pen up',
  light_on: 'light on',
  light_off: 'light off',
}

export function lockMessage(blockId: string, need: Capability): string {
  return `The “${BLOCK_LABEL[blockId] ?? blockId}” block needs ${CAPABILITY_NEEDS[need]}. Add it to your robot to use this block.`
}

/** Blocks the program uses that this robot cannot do. Empty = ready to run. */
export function missingParts(p: Program, design: RobotDesign): MissingPart[] {
  const caps = capabilitiesOf(design)
  const out: MissingPart[] = []
  for (const b of usedBlockIds(p)) {
    const need = blockNeeds(b)
    if (need && !caps.has(need)) out.push({ block: b, needs: need, message: lockMessage(b, need) })
  }
  return out
}

/** Count statements (for "used N blocks"). */
export function countStmts(list: Stmt[]): number {
  let n = 0
  for (const s of list) {
    n++
    if ('body' in s) n += countStmts(s.body)
    if (s.op === 'if') n += countStmts(s.then) + (s.else ? countStmts(s.else) : 0)
  }
  return n
}
