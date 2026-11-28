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
import { missingParts, type MissingPart, type Program, type Stmt } from './program'
import type { Rapier } from './rapier'

export type RunStatus = 'running' | 'settling' | 'done'

export type FailReason = 'missing-part' | 'crashed' | 'stuck' | 'short' | 'off-line' | 'moving' | 'timeout' | 'flat' | 'not-visited' | 'tipped' | 'not-delivered'

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
  /** Battery at the end (roadmap #39). Absent on a run that never started. */
  battery?: { soc: number; usedMah: number; minVolts: number; flat: boolean; coupled: boolean }
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

/** Does the program contain a `forever` loop (so it never ends by itself)? */
export function hasForever(list: Stmt[]): boolean {
  for (const s of list) {
    if (s.op === 'forever') return true
    if ((s.op === 'repeat' || s.op === 'repeat_until') && hasForever(s.body)) return true
    if (s.op === 'if' && (hasForever(s.then) || (s.else ? hasForever(s.else) : false))) return true
  }
  return false
}

/**
 * @param reached  set when an endless program already met the goal mid-run (the run was ended there),
 *                 so coasting a little past the zone edge while stopping does not undo it.
 */
export function judge(arena: Arena, sim: Sim, onLineFraction: number, timedOut: boolean, reached = false, visited = true): RunResult {
  const snap = sim.snapshot()
  const { x, z } = snap.robot.p
  const g = arena.goal
  const inZone = reached || inShape(g.zone, x, z)
  const [gx, gz] = goalCenter(arena)
  // A delivery is measured where the LOAD is, not the robot.
  const load = g.kind === 'deliver' ? sim.objectPos(g.object) : null
  const base = {
    missing: [],
    time: Math.round(sim.time * 100) / 100,
    travelled: sim.travelled,
    wheelTravel: sim.wheelTravel,
    goalDistance: load ? Math.hypot(gx - load.x, gz - load.z) : Math.hypot(gx - x, gz - z),
    crashed: sim.crashed,
    onLineFraction,
    battery: batteryEnd(sim),
  }
  const fail = (reason: FailReason, message: string): RunResult => ({ ...base, success: false, reason, message })
  // A robot on its back cannot carry on, whatever else happened.
  if (sim.tipped) return fail('tipped', 'Your robot tipped over! Where the load sits moves its balance point: carry it lower and further forward, and try again.')
  if (g.kind === 'deliver') return judgeDeliver(g, sim, base, fail)
  const noCrash = g.kind === 'stop-in-zone' || ((g.kind === 'reach' || g.kind === 'visit-and-return') && g.noCrash === true)
  if (noCrash && sim.crashed) return fail('crashed', 'Bonk! Your robot crashed into the wall. Stop it before it touches.')
  if (!inZone) {
    // Touching a wall comes first: pushing against it is not a grip problem.
    if (sim.crashed) return fail('crashed', 'Your robot pushed into a wall and could not get to the goal. Steer or stop before the wall.')
    const bat = sim.battery()
    if (bat.coupled && bat.flat)
      return fail(
        'flat',
        bat.flatCause === 'sag'
          ? `The battery's voltage sagged too low under the load and the robot's computer switched off, ${Math.round(base.goalDistance * 100)} cm from the goal. More cells in parallel, or a gentler start, keeps the voltage up.`
          : `The battery ran flat ${Math.round(base.goalDistance * 100)} cm from the goal. Take a shorter or easier route, drive more gently, or carry less weight.`,
      )
    // The wheels slid over the floor more than the robot moved: that is slipping.
    // (Measured per wheel against the ground, so turning on the spot is not counted.)
    if (sim.slipTravel > 0.25 && sim.slipTravel > sim.travelled)
      return fail('stuck', `Your robot got stuck — the wheels spun ${Math.round(sim.wheelTravel * 100)} cm but it only moved ${Math.round(sim.travelled * 100)} cm. Try a drive that grips better.`)
    if (timedOut) return fail('timeout', 'Time ran out before your robot reached the goal.')
    return fail('short', `So close! Your robot finished ${Math.round(base.goalDistance * 100)} cm from the middle of the goal.`)
  }
  if (g.kind === 'visit-and-return' && !visited) return fail('not-visited', 'Your robot is back on the charger, but it never reached the flag. Visit the flag first, then come home.')
  if ((g.kind === 'stop-in-zone' || g.kind === 'visit-and-return') && snap.groundSpeed > 0.03)
    return fail('moving', 'Your robot was still rolling. Stop it inside the zone.')
  if (g.kind === 'follow-line' && onLineFraction < g.minOnLine)
    return fail('off-line', `Your robot reached the end but was on the line only ${Math.round(onLineFraction * 100)}% of the time. Steer back to the line.`)
  return { ...base, success: true, reason: null, message: 'You did it! Your robot reached the goal. ⭐' }
}

function judgeDeliver(
  g: Extract<Arena['goal'], { kind: 'deliver' }>,
  sim: Sim,
  base: Omit<RunResult, 'success' | 'reason' | 'message'>,
  fail: (reason: FailReason, message: string) => RunResult,
): RunResult {
  const p = sim.objectPos(g.object)
  const held = sim.snapshot().holding === g.object
  if (!held && p && inShape(g.zone, p.x, p.z)) return { ...base, success: true, reason: null, message: `You did it! The ${g.label} is in the right place. ⭐` }
  const bat = sim.battery()
  if (bat.coupled && bat.flat) return fail('flat', `The battery ran flat before the ${g.label} was delivered. Take a shorter route or drive more gently.`)
  if (sim.slipTravel > 0.25 && sim.slipTravel > sim.travelled) return fail('stuck', `Your robot got stuck — the wheels spun ${Math.round(sim.wheelTravel * 100)} cm but it only moved ${Math.round(sim.travelled * 100)} cm.`)
  if (held) return fail('not-delivered', `The ${g.label} is still in your robot’s ${sim.design.tool === 'scoop' ? 'scoop' : 'claw'}. Let go of it inside the marked spot.`)
  return fail('not-delivered', `The ${g.label} ended ${Math.round(base.goalDistance * 100)} cm from the middle of the marked spot. Where should the robot be when it lets go?`)
}

/** Is the load delivered right now: released and inside the zone? */
function delivered(g: Extract<Arena['goal'], { kind: 'deliver' }>, sim: Sim): boolean {
  if (sim.snapshot().holding === g.object) return false
  const p = sim.objectPos(g.object)
  return Boolean(p && inShape(g.zone, p.x, p.z))
}

function batteryEnd(sim: Sim): RunResult['battery'] {
  const b = sim.battery()
  return { soc: Math.round(b.soc * 1000) / 1000, usedMah: Math.round(b.usedMah * 10) / 10, minVolts: Math.round(b.minVolts * 100) / 100, flat: b.flat, coupled: b.coupled }
}

/** Goal check while an endless program runs. stop-in-zone needs the robot at rest in the zone for half a second. */
function goalMet(arena: Arena, sim: Sim, onLineFraction: number, restTicks: number, visited: boolean): boolean {
  const g = arena.goal
  if (g.kind === 'deliver') return delivered(g, sim)
  if (g.kind === 'stop-in-zone') return restTicks >= Math.round(0.5 / DT)
  if (g.kind === 'visit-and-return') return visited && restTicks >= Math.round(0.5 / DT)
  const p = sim.snapshot().robot.p
  if (!inShape(g.zone, p.x, p.z)) return false
  return g.kind !== 'follow-line' || onLineFraction >= g.minOnLine
}

export function createRun(R: Rapier, arena: Arena, design: RobotDesign, program: Program): Run {
  const sim = createSim(R, arena, design)
  const missing = missingParts(program, design)
  const endless = hasForever(program.body)
  let reached = false
  let onLineTicks = 0
  let ticks = 0
  let settle = 0
  let restTicks = 0
  let visited = arena.goal.kind !== 'visit-and-return'
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
      const snap = sim.snapshot()
      restTicks = snap.groundSpeed < REST_SPEED && inShape(arena.goal.zone, snap.robot.p.x, snap.robot.p.z) ? restTicks + 1 : 0
      if (!visited && arena.goal.kind === 'visit-and-return' && inShape(arena.goal.visit, snap.robot.p.x, snap.robot.p.z)) {
        visited = true
        sim.emit({ kind: 'say', text: 'Flag reached! Now home to the charger.' })
      }
      // A flat battery ends the program: the robot coasts to a stop and is judged where it is.
      if (run.status === 'running' && sim.battery().flat) {
        run.status = 'settling'
        sim.setMotors(0, 0)
      }
      if (arena.lines.length > 0) {
        const p = snap.robot.p
        if (distToLines(arena, p.x, p.z) < 0.06) onLineTicks++
      }
      // A `forever` program never ends, so its goal is checked as it runs: reaching it ends the run.
      if (run.status === 'running' && endless && goalMet(arena, sim, onLineTicks / ticks, restTicks, visited)) {
        reached = true
        run.status = 'settling'
        sim.setMotors(0, 0)
      }
      if (run.status === 'running' && sim.time >= arena.timeLimit) {
        run.status = 'done'
        sim.setMotors(0, 0)
        run.result = judge(arena, sim, onLineTicks / ticks, true, false, visited)
        return
      }
      if (run.status === 'settling') {
        settle += DT
        if (settle >= SETTLE_MAX || (settle > 0.2 && sim.snapshot().groundSpeed < REST_SPEED)) {
          run.status = 'done'
          run.result = judge(arena, sim, onLineTicks / Math.max(1, ticks), false, reached && arena.goal.kind !== 'stop-in-zone' && arena.goal.kind !== 'visit-and-return', visited)
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
