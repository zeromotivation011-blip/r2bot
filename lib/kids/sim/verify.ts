// lib/kids/sim/verify.ts
// Headless checks for the physics simulator. Runs the real engine + interpreter
// (no DOM) and asserts:
//   1. every demo's reference program reaches its goal with the right parts;
//   2. the SAME program with the wrong part fails in the expected way
//      (wheels stuck in sand, legs too slow, blocks locked without a sensor);
//   3. determinism: two runs of the same thing give identical final states;
//   4. physical sanity: a fast turn overshoots more than a slow one, ice slides,
//      the encoders over-count on sand;
//   5. the Blockly JSON round trip preserves every reference program.
//
// Run:  npx tsx lib/kids/sim/verify.ts

import { DEFAULT_DESIGN, type RobotDesign } from '../robot-design'
import type { Arena } from './arena'
import { blocklyToProgram, programToBlockly } from './blockly-json'
import { DEMOS, designFor } from './demos'
import { createSim, DT, type Sim } from './engine'
import { createInterpreter } from './interpreter'
import { loadRapier, type Rapier } from './rapier'
import { runHeadless } from './run'

interface Check {
  name: string
  ok: boolean
  detail: string
}

const open = (over: Partial<Arena> = {}): Arena => ({
  id: 'test',
  title: 'test',
  size: [6, 6],
  center: [0, 0],
  floor: 'tile',
  regions: [],
  lines: [],
  walls: [],
  ramps: [],
  boxes: [],
  objects: [],
  start: { pos: [0, -2], headingDeg: 0 },
  goal: { kind: 'reach', zone: { kind: 'circle', center: [0, 2], radius: 0.2 } },
  timeLimit: 30,
  ...over,
})

function runTurn(sim: Sim, speed: number): number {
  const interp = createInterpreter({ body: [{ op: 'turn_degrees', id: 't', deg: { k: 'number', v: 90 }, speedPct: { k: 'number', v: speed } }] }, sim)
  for (let i = 0; i < 600 && interp.advance(); i++) sim.step()
  for (let i = 0; i < 90; i++) sim.step() // let it come to rest
  const h = sim.headingUnwrapped()
  sim.dispose()
  return h
}

/** Degrees past (+) or short of (-) a 90° right turn. */
function turnError(R: Rapier, design: RobotDesign, speed: number, floor: Arena['floor']): number {
  return runTurn(createSim(R, open({ floor }), design), speed) - 90
}

async function main(): Promise<void> {
  const R = await loadRapier()
  const checks: Check[] = []
  const push = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail })

  for (const demo of DEMOS) {
    const good = designFor(DEFAULT_DESIGN, demo.goodParts)
    const a = runHeadless(R, demo.arena, good, demo.reference)
    push(`${demo.id}: reference reaches goal`, a.result.success, `${a.result.message} (t=${a.result.time}s, moved ${(a.result.travelled * 100).toFixed(0)} cm, wheels ${(a.result.wheelTravel * 100).toFixed(0)} cm, ${(a.result.goalDistance * 100).toFixed(0)} cm from goal centre, on line ${(a.result.onLineFraction * 100).toFixed(0)}%)`)

    const bad = designFor(good, demo.wrongParts)
    const b = runHeadless(R, demo.arena, bad, demo.reference)
    push(
      `${demo.id}: wrong part (${JSON.stringify(demo.wrongParts)}) fails with "${demo.wrongFails}"`,
      !b.result.success && b.result.reason === demo.wrongFails,
      `${b.result.reason}: ${b.result.message}`,
    )

    const c = runHeadless(R, demo.arena, good, demo.reference)
    push(`${demo.id}: deterministic`, a.fingerprint === c.fingerprint, a.fingerprint === c.fingerprint ? a.fingerprint.slice(0, 60) : `${a.fingerprint} != ${c.fingerprint}`)

    const rt = blocklyToProgram(programToBlockly(demo.reference))
    push(`${demo.id}: Blockly JSON round trip`, JSON.stringify(rt) === JSON.stringify(demo.reference), JSON.stringify(rt).slice(0, 80))
  }

  // Momentum: a fast turn overshoots more than a slow one.
  const slow = turnError(R, DEFAULT_DESIGN, 25, 'tile')
  const fast = turnError(R, DEFAULT_DESIGN, 100, 'tile')
  push('turn: fast overshoots more than slow', Math.abs(fast) > Math.abs(slow) + 0.5, `slow ${slow.toFixed(1)}°, fast ${fast.toFixed(1)}°`)
  const ice = turnError(R, DEFAULT_DESIGN, 100, 'ice')
  push('turn: on ice the robot slides past further', Math.abs(ice) > Math.abs(fast), `ice ${ice.toFixed(1)}°`)

  // Encoders lie on sand: wheels count more than the robot moved.
  {
    const arena = open({ floor: 'sand' })
    const sim = createSim(R, arena, DEFAULT_DESIGN)
    sim.setMotors(80, 80)
    for (let i = 0; i < Math.round(3 / DT); i++) sim.step()
    push('sand: two wheels spin (encoders over-count)', sim.wheelTravel > sim.travelled * 3, `wheels ${(sim.wheelTravel * 100).toFixed(0)} cm vs moved ${(sim.travelled * 100).toFixed(0)} cm`)
    sim.dispose()
  }
  // Coasting on ice: after stop the robot keeps sliding much further than on tile.
  const coast = (floor: Arena['floor']) => {
    const sim = createSim(R, open({ floor }), DEFAULT_DESIGN)
    sim.setMotors(100, 100)
    for (let i = 0; i < Math.round(4 / DT); i++) sim.step()
    const z0 = sim.snapshot().robot.p.z
    sim.setMotors(0, 0)
    for (let i = 0; i < Math.round(3 / DT); i++) sim.step()
    const d = sim.snapshot().robot.p.z - z0
    sim.dispose()
    return d
  }
  const cTile = coast('tile')
  const cIce = coast('ice')
  push('ice: stopping distance much longer than tile', cIce > cTile * 3, `tile ${(cTile * 100).toFixed(1)} cm, ice ${(cIce * 100).toFixed(1)} cm`)

  // Mass matters: a heavy robot pushing a box accelerates slower — check pushing a box moves it.
  {
    const arena = open({ boxes: [{ pos: [0, -1.5], size: 0.14, mass: 0.4 }] })
    const sim = createSim(R, arena, DEFAULT_DESIGN)
    sim.setMotors(60, 60)
    for (let i = 0; i < Math.round(4 / DT); i++) sim.step()
    const box = sim.snapshot().bodies[0]
    push('box: the robot pushes a box', box.p.z > -1.2, `box z ${box.p.z.toFixed(2)}`)
    sim.dispose()
  }
  // Gripper picks an object and carries it.
  {
    const arena = open({ objects: [{ id: 'ball', kind: 'ball', pos: [0, -1.84], size: 0.03, mass: 0.05 }] })
    const design = { ...DEFAULT_DESIGN, tool: 'gripper' as const }
    const sim = createSim(R, arena, design)
    const interp = createInterpreter(
      {
        body: [
          { op: 'grip_close', id: 'g' },
          { op: 'drive_distance', id: 'd', cm: { k: 'number', v: 50 }, speedPct: { k: 'number', v: 50 } },
        ],
      },
      sim,
    )
    for (let i = 0; i < 1000 && interp.advance(); i++) sim.step()
    const ball = sim.snapshot().bodies.find((x) => x.id === 'ball')
    push('gripper: grabs and carries the ball', !!ball && ball.p.z > -1.4 && sim.snapshot().holding === 'ball', `ball z ${ball?.p.z.toFixed(2)}`)
    sim.dispose()
  }
  // A ramp: tracks climb it.
  {
    const arena = open({ ramps: [{ center: [0, -1], size: [0.8, 0.8], height: 0.12, riseHeadingDeg: 0 }] })
    const sim = createSim(R, arena, { ...DEFAULT_DESIGN, drive: 'tracks' })
    sim.setMotors(70, 70)
    let maxY = 0
    for (let i = 0; i < Math.round(8 / DT); i++) {
      sim.step()
      maxY = Math.max(maxY, sim.snapshot().robot.p.y)
    }
    push('ramp: robot drives up the ramp', maxY > 0.08, `max height ${(maxY * 100).toFixed(1)} cm`)
    sim.dispose()
  }

  let failed = 0
  for (const c of checks) {
    if (!c.ok) failed++
    console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}\n      ${c.detail}`)
  }
  console.log(`\n${checks.length - failed}/${checks.length} checks passed`)
  if (failed > 0) process.exit(1)
}

void main()
