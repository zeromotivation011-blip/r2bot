// lib/kids/sim/run.ts
// Couples a Sim and an Interpreter: one tick = let the program decide, then one
// fixed physics step. When the program ends the motors stop and the robot is
// allowed to come to rest (momentum is real), then the arena's goal is judged.
// Used by the browser page (a few ticks per animation frame) and by verify.ts
// (as fast as possible, headless).

import type { RobotDesign } from '../robot-design'
import { distToSegment, inShape, type Arena } from './arena'
import { createSim, DT, type Sim } from './engine'
import { createInterpreter, type Interpreter } from './interpreter'
import { missingParts, type MissingPart, type Program } from './program'
import type { Rapier } from './rapier'

export type RunStatus = 'running' | 'settling' | 'done'

export type FailReason = 'missing-part' | 'crashed' | 'stuck' | 'short' | 'off-line' | 'moving' | 'timeout'

export interface RunResult {
  success: boolean
  reason: FailReason | null
  /** One or two sentences for the child. */
  message: string
  missing: MissingPart[]
  time: number
  /** Metres the robot really travelled vs what the wheels counted. */
  travelled: number
  wheelTravel: number
  /** Distance left to the goal zone centre, metres. */
  goalDistance: number
  crashed: boolean
  /** Fraction of ticks spent on the line (line arenas). */
  onLineFraction: number
}

export interface Run {
  sim: Sim
  interp: Interpreter | null
  status: RunStatus
  result: RunResult | null
  /** Advance one fixed tick. */
  tick(): void
}

const SETTLE_MAX = 2
const REST_SPEED = 0.01

function goalCenter(arena: Arena): [number, number] {
  const z = arena.goal.zone
  return z.kind === 'circle' ? z.center : z.center
}

function distToLines(arena: Arena, x: number, z: number): number {
  let best = Infinity
  for (const l of arena.lines) for (let i = 0; i + 1 < l.points.length; i++) best = Math.min(best, distToSegment(x, z, l.points[i], l.points[i + 1]))
  return best
}

export function judge(arena: Arena, sim: Sim, onLineFraction: number, timedOut: boolean): RunResult {
  const snap = sim.snapshot()
  const { x, z } = snap.robot.p
  const g = arena.goal
  const inZone = inShape(g.zone, x, z)
  const [gx, gz] = goalCenter(arena)
  const base = {
    missing: [],
    time: Math.round(sim.time * 100) / 100,
    travelled: sim.travelled,
    wheelTravel: sim.wheelTravel,
    goalDistance: Math.hypot(gx - x, gz - z),
    crashed: sim.crashed,
    onLineFraction,
  }
  const fail = (reason: FailReason, message: string): RunResult => ({ ...base, success: false, reason, message })
  const noCrash = g.kind === 'stop-in-zone' || (g.kind === 'reach' && g.noCrash === true)
  if (noCrash && sim.crashed) return fail('crashed', 'Bonk! Your robot crashed into the wall. Stop it before it touches.')
  if (!inZone) {
    // Wheels turned a lot but the robot hardly moved: that is slipping.
    if (sim.wheelTravel > 0.25 && sim.travelled < sim.wheelTravel * 0.4)
      return fail('stuck', `Your robot got stuck — the wheels spun ${Math.round(sim.wheelTravel * 100)} cm but it only moved ${Math.round(sim.travelled * 100)} cm. Try a drive that grips better.`)
    if (timedOut) return fail('timeout', 'Time ran out before your robot reached the goal.')
    return fail('short', `So close! Your robot finished ${Math.round(base.goalDistance * 100)} cm from the middle of the goal.`)
  }
  if (g.kind === 'stop-in-zone' && snap.groundSpeed > 0.03) return fail('moving', 'Your robot was still rolling. Stop it inside the zone.')
  if (g.kind === 'follow-line' && onLineFraction < g.minOnLine)
    return fail('off-line', `Your robot reached the end but was on the line only ${Math.round(onLineFraction * 100)}% of the time. Steer back to the line.`)
  return { ...base, success: true, reason: null, message: 'You did it! Your robot reached the goal. ⭐' }
}

export function createRun(R: Rapier, arena: Arena, design: RobotDesign, program: Program): Run {
  const sim = createSim(R, arena, design)
  const missing = missingParts(program, design)
  let onLineTicks = 0
  let ticks = 0
  let settle = 0
  const run: Run = {
    sim,
    interp: null,
    status: 'running',
    result: null,
    tick() {
      if (run.status === 'done') return
      if (run.status === 'running') {
        const more = run.interp ? run.interp.advance() : false
        if (!more) run.status = 'settling'
      }
      sim.step()
      ticks++
      if (arena.lines.length > 0) {
        const p = sim.snapshot().robot.p
        if (distToLines(arena, p.x, p.z) < 0.06) onLineTicks++
      }
      if (run.status === 'running' && sim.time >= arena.timeLimit) {
        run.status = 'done'
        sim.setMotors(0, 0)
        run.result = judge(arena, sim, onLineTicks / ticks, true)
        return
      }
      if (run.status === 'settling') {
        settle += DT
        if (settle >= SETTLE_MAX || (settle > 0.2 && sim.snapshot().groundSpeed < REST_SPEED)) {
          run.status = 'done'
          run.result = judge(arena, sim, onLineTicks / Math.max(1, ticks), false)
        }
      }
    },
  }
  if (missing.length > 0) {
    run.status = 'done'
    run.result = {
      success: false,
      reason: 'missing-part',
      message: missing[0].message,
      missing,
      time: 0,
      travelled: 0,
      wheelTravel: 0,
      goalDistance: 0,
      crashed: false,
      onLineFraction: 0,
    }
  } else {
    run.interp = createInterpreter(program, sim)
  }
  return run
}

/** Run to the end, headless. Returns the result and a fingerprint of the final state. */
export function runHeadless(R: Rapier, arena: Arena, design: RobotDesign, program: Program): { result: RunResult; fingerprint: string } {
  const run = createRun(R, arena, design, program)
  const cap = Math.ceil((arena.timeLimit + SETTLE_MAX + 1) / DT)
  for (let i = 0; i < cap && run.status !== 'done'; i++) run.tick()
  const s = run.sim.snapshot()
  const fingerprint = [s.t, s.robot.p.x, s.robot.p.y, s.robot.p.z, s.robot.q.y, s.wheelAngle[0], s.wheelAngle[1], run.sim.trail.length].map((n) => n.toFixed(9)).join('|')
  run.sim.dispose()
  if (!run.result) throw new Error('run did not finish')
  return { result: run.result, fingerprint }
}
