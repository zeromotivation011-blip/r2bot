// lib/kids/sim/interpreter.ts
// Runs a Program (the shared block set) cooperatively over SIM time. Each block
// is a generator: blocks that take time (drive_for, wait, turn_degrees…) yield
// once per physics tick; instant blocks (set_motors, say…) do not. Sensors are
// read live every time an expression is evaluated, so repeat_until polls them
// every tick. No DOM, no timers: the runner below decides when ticks happen,
// which is what makes a run deterministic and testable headless.

import type { Expr, Program, Stmt } from './program'
import { DT, type Sim } from './engine'

type Value = number | string | boolean

/** Most instant blocks allowed in one tick before the interpreter forces a pause (stops a zero-time loop from freezing the page). */
const OPS_PER_TICK = 2000
const GRIP_TIME = 0.4
/** Watchdog for blocks that wait for the robot to get somewhere: check progress once per this many ticks. */
const STALL_WINDOW = Math.round(1 / DT)
/** Less progress than this in one window means the motors are not getting anywhere. */
const STALL_MIN_CM = 1
const STALL_MIN_DEG = 1

function stalled(ctx: InterpreterCtx): void {
  ctx.sim.setMotors(0, 0)
  ctx.sim.emit({ kind: 'stalled', text: 'My motors can’t move me — too slow, or something is in the way!' })
}

export interface InterpreterCtx {
  sim: Sim
  vars: Map<string, number>
  /** Block id currently running (for the editor's highlight). */
  active: string | null
  /** Ticks completed (advanced by the runner). */
  tick: number
  ops: number
}

export class ProgramError extends Error {}

function num(v: Value): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (typeof v === 'boolean') return v ? 1 : 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
function truthy(v: Value): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  return v.length > 0
}

export function evaluate(e: Expr, ctx: InterpreterCtx): Value {
  switch (e.k) {
    case 'number':
      return e.v
    case 'text':
      return e.v
    case 'get_var':
      return ctx.vars.get(e.name) ?? 0
    case 'sensor': {
      const s = ctx.sim.sensors()
      switch (e.s) {
        case 'distance_cm':
          return s.distanceCm
        case 'line_seen':
          return s.lineSeen
        case 'line_offset':
          return s.lineOffset
        case 'floor_color':
          return s.floorColor
        case 'bumped':
          return s.bumped
        case 'heading_deg':
          return s.headingDeg
        case 'timer_s':
          return s.timerS
      }
      return 0
    }
    case 'not':
      return !truthy(evaluate(e.a, ctx))
    case 'and':
      return truthy(evaluate(e.a, ctx)) && truthy(evaluate(e.b, ctx))
    case 'or':
      return truthy(evaluate(e.a, ctx)) || truthy(evaluate(e.b, ctx))
    case 'compare': {
      const a = evaluate(e.a, ctx)
      const b = evaluate(e.b, ctx)
      if (e.op === '=') {
        if (typeof a === 'string' || typeof b === 'string') return String(a).toLowerCase() === String(b).toLowerCase()
        return Math.abs(num(a) - num(b)) < 1e-9
      }
      return e.op === '<' ? num(a) < num(b) : num(a) > num(b)
    }
    case 'math': {
      const a = num(evaluate(e.a, ctx))
      const b = num(evaluate(e.b, ctx))
      switch (e.op) {
        case '+':
          return a + b
        case '-':
          return a - b
        case '*':
          return a * b
        case '/':
          return b === 0 ? 0 : a / b
      }
    }
  }
  return 0
}

type Gen = Generator<void, void, void>

function* waitTicks(n: number): Gen {
  for (let i = 0; i < n; i++) yield
}

function* runList(list: Stmt[], ctx: InterpreterCtx): Gen {
  for (const s of list) yield* runStmt(s, ctx)
}

/** One loop pass; if it took no sim time, wait a tick so a loop always lets the world move. */
function* loopPass(body: Stmt[], ctx: InterpreterCtx): Gen {
  const t0 = ctx.tick
  yield* runList(body, ctx)
  if (ctx.tick === t0) yield
}

function* runStmt(s: Stmt, ctx: InterpreterCtx): Gen {
  ctx.active = s.id
  if (++ctx.ops > OPS_PER_TICK) yield
  const sim = ctx.sim
  const n = (e: Expr) => num(evaluate(e, ctx))
  switch (s.op) {
    case 'drive_for': {
      const sp = n(s.speedPct)
      const secs = Math.max(0, n(s.seconds))
      sim.setMotors(sp, sp)
      yield* waitTicks(Math.round(secs / DT))
      sim.setMotors(0, 0)
      return
    }
    case 'drive_distance': {
      const cm = n(s.cm)
      const sp = Math.abs(n(s.speedPct))
      const dir = Math.sign(cm) || 1
      const goal = Math.abs(cm) / 100
      const start = sim.encoders()
      const travelled = () => {
        const e = sim.encoders()
        return Math.abs((e[0] - start[0] + e[1] - start[1]) / 2)
      }
      if (sp === 0) return
      sim.setMotors(dir * sp, dir * sp)
      // The encoders count wheel turns: if the wheels slip, they believe they went further than the robot did.
      let ticks = 0
      let mark = 0
      while (travelled() < goal) {
        yield
        if (++ticks % STALL_WINDOW === 0) {
          const now = travelled()
          if ((now - mark) * 100 < STALL_MIN_CM) return stalled(ctx)
          mark = now
        }
      }
      sim.setMotors(0, 0)
      return
    }
    case 'turn_degrees': {
      const deg = n(s.deg)
      const sp = Math.abs(n(s.speedPct))
      if (deg === 0 || sp === 0) return
      const dir = Math.sign(deg)
      const goal = sim.headingUnwrapped() + deg
      // Simple gyro controller: full speed, easing off over the last 20°, never below half speed.
      // It stops the motors once the gyro says "there" — a fast robot's momentum carries it past.
      let ticks = 0
      let mark = sim.headingUnwrapped()
      for (;;) {
        const rem = (goal - sim.headingUnwrapped()) * dir
        if (rem <= 0.5) break
        const k = Math.min(1, Math.max(0.5, rem / 20))
        const v = sp * k
        sim.setMotors(dir * v, -dir * v)
        yield
        if (++ticks % STALL_WINDOW === 0) {
          const now = sim.headingUnwrapped()
          if ((now - mark) * dir < STALL_MIN_DEG) return stalled(ctx)
          mark = now
        }
      }
      sim.setMotors(0, 0)
      yield* waitTicks(6)
      return
    }
    case 'set_motors':
      sim.setMotors(n(s.leftPct), n(s.rightPct))
      return
    case 'stop':
      sim.setMotors(0, 0)
      return
    case 'wait':
      yield* waitTicks(Math.round(Math.max(0, n(s.seconds)) / DT))
      return
    case 'repeat': {
      const times = Math.max(0, Math.floor(n(s.times)))
      for (let i = 0; i < times; i++) yield* loopPass(s.body, ctx)
      return
    }
    case 'repeat_until':
      while (!truthy(evaluate(s.cond, ctx))) {
        yield* loopPass(s.body, ctx)
        ctx.active = s.id
      }
      return
    case 'forever':
      for (;;) yield* loopPass(s.body, ctx)
    case 'if':
      if (truthy(evaluate(s.cond, ctx))) yield* runList(s.then, ctx)
      else if (s.else) yield* runList(s.else, ctx)
      return
    case 'grip_open':
    case 'grip_close':
      sim.grip(s.op === 'grip_close')
      yield* waitTicks(Math.round(GRIP_TIME / DT))
      return
    case 'pen_down':
    case 'pen_up':
      sim.setPen(s.op === 'pen_down')
      return
    case 'light_on':
    case 'light_off':
      sim.setLight(s.op === 'light_on')
      return
    case 'say':
      sim.emit({ kind: 'say', text: String(evaluate(s.text, ctx)).slice(0, 80) })
      return
    case 'beep':
      sim.emit({ kind: 'beep' })
      return
    case 'set_var':
      ctx.vars.set(s.name, n(s.value))
      return
    case 'change_var':
      ctx.vars.set(s.name, (ctx.vars.get(s.name) ?? 0) + n(s.by))
      return
  }
}

export interface Interpreter {
  ctx: InterpreterCtx
  /** Run until the program wants the next tick. Returns false when the program has finished. */
  advance(): boolean
}

export function createInterpreter(program: Program, sim: Sim): Interpreter {
  const ctx: InterpreterCtx = { sim, vars: new Map(), active: null, tick: 0, ops: 0 }
  const gen = runList(program.body, ctx)
  let done = false
  let started = false
  return {
    ctx,
    advance() {
      if (done) return false
      ctx.ops = 0
      // A new tick has begun (the first call is tick 0). loopPass compares this to see if a pass took time.
      if (started) ctx.tick++
      started = true
      const r = gen.next()
      if (r.done) {
        done = true
        ctx.active = null
        sim.setMotors(0, 0)
      }
      return !done
    },
  }
}
