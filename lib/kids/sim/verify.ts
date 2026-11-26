// lib/kids/sim/verify.ts
// Headless checks for the physics simulator. Runs the real engine + interpreter
// (no DOM) and asserts:
//   1. every demo's reference program reaches its goal with the right parts;
//   2. the SAME program with the wrong part fails in the expected way
//      (wheels stuck in sand, legs too slow, blocks locked without a sensor);
//   3. determinism: two runs of the same thing give identical final states;
//   4. physical sanity: a fast turn overshoots more than a slow one, ice slides,
//      the encoders over-count on sand;
//   5. the Blockly JSON round trip preserves every reference program;
//   6. regressions found in review: sensors are a pure read, loop timing is
//      exact, a wall is not "slipping", a spin is not "stuck", stalled blocks
//      give up, low objects are seen, forever programs can succeed, disabled
//      blocks do not run, light_on takes effect at once;
//   7. Level 1 calibration: turn_degrees +90 is a LEFT turn, the pen draws at
//      the turning centre (a turn on the spot leaves a dot), soft sand halves a
//      two-wheeler's speed without stopping it, a heavy load slows it uphill and
//      a stopped robot holds on a slope;
//   8. every Level 1 challenge arena (lib/kids/sim/arenas/level1.ts): its
//      palette, required parts and start match the curriculum session; its
//      reference program succeeds with the session's robot for ALL FOUR bodies;
//      every taught mistake fails for the taught reason; runs are deterministic.
//
// Run:  npx tsx lib/kids/sim/verify.ts

import { DEFAULT_DESIGN, type RobotDesign } from '../robot-design'
import type { Arena } from './arena'
import * as Blockly from 'blockly/core'
import { defineBlocks } from '../../../components/kids/sim/blockly-blocks'
import { blocklyToProgram, programToBlockly, type BWorkspace } from './blockly-json'
import { DEMOS, designFor } from './demos'
import { createSim, DT, type Sim } from './engine'
import { createInterpreter } from './interpreter'
import type { Expr, Program, Stmt } from './program'
import { loadRapier, type Rapier } from './rapier'
import { createRun, runHeadless, type RunResult } from './run'
import { LEVEL1_ARENAS, sessionDesign, toPalette } from './arenas/level1'
import { awardStars, compile, createChallengeRun, judgeChallengeRun, referenceFor, runChallengeHeadless } from './challenge'
import { LEVEL1_SESSIONS } from '../curriculum/level1'
import { HEADING_DEG } from './arenas/level1'
import type { BodyId } from '../robot-design'

const N = (v: number): Expr => ({ k: 'number', v })
const offsetTimes = (k: number): Expr => ({ k: 'math', op: '*', a: N(k), b: { k: 'sensor', s: 'line_offset' } })
const steer = (id: string): Stmt => ({
  op: 'set_motors',
  id,
  leftPct: { k: 'math', op: '+', a: N(40), b: offsetTimes(35) },
  rightPct: { k: 'math', op: '-', a: N(40), b: offsetTimes(35) },
})

/** Run like the browser does, optionally reading sim.sensors() every `pollEvery` ticks (as the UI does), and fingerprint the end state. */
function runPolled(R: Rapier, arena: Arena, design: RobotDesign, program: Program, pollEvery: number): { result: RunResult | null; fp: string; events: string[] } {
  const run = createRun(R, arena, design, program)
  const cap = Math.ceil((arena.timeLimit + 4) / DT)
  for (let i = 0; i < cap && run.status !== 'done'; i++) {
    run.tick()
    if (pollEvery > 0 && i % pollEvery === 0) run.sim.sensors()
  }
  const s = run.sim.snapshot()
  const fp = [s.t, s.robot.p.x, s.robot.p.z, s.robot.q.y].map((n) => n.toFixed(9)).join('|')
  const events = run.sim.events.map((e) => e.kind)
  run.sim.dispose()
  return { result: run.result, fp, events }
}

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
  // -90 = a quarter turn RIGHT (positive is left): the compass heading grows by 90.
  const interp = createInterpreter({ body: [{ op: 'turn_degrees', id: 't', deg: { k: 'number', v: -90 }, speedPct: { k: 'number', v: speed } }] }, sim)
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
    push(
      'sand: two wheels crawl with heavy slip (encoders over-count)',
      sim.wheelTravel > sim.travelled * 3 && sim.travelled > 0.01,
      `wheels ${(sim.wheelTravel * 100).toFixed(0)} cm vs moved ${(sim.travelled * 100).toFixed(1)} cm`,
    )
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

  // ── Review regressions ────────────────────────────────────────────────────
  const lineDemo = DEMOS.find((d) => d.id === 'follow-line')
  const wallDemo = DEMOS.find((d) => d.id === 'stop-before-wall')
  if (!lineDemo || !wallDemo) throw new Error('demo missing')
  const lineBot = designFor(DEFAULT_DESIGN, lineDemo.goodParts)

  // Reading the sensors must not change the run (the UI polls them at frame rate).
  {
    const prog: Program = { body: [{ op: 'repeat', id: 'r', times: N(30), body: [steer('s'), { op: 'wait', id: 'w', seconds: N(0.4) }] }] }
    const a = runPolled(R, lineDemo.arena, lineBot, prog, 0)
    const b = runPolled(R, lineDemo.arena, lineBot, prog, 1)
    const c = runPolled(R, lineDemo.arena, lineBot, prog, 7)
    push('sensors: reading them never changes the run', a.fp === b.fp && a.fp === c.fp, a.fp === b.fp && a.fp === c.fp ? a.fp : `${a.fp} / ${b.fp} / ${c.fp}`)
  }

  // Loop timing: repeat 60 { wait 1/60 s } takes exactly 60 ticks (1 s).
  {
    const sim = createSim(R, open(), DEFAULT_DESIGN)
    const interp = createInterpreter({ body: [{ op: 'repeat', id: 'r', times: N(60), body: [{ op: 'wait', id: 'w', seconds: N(DT) }] }] }, sim)
    let ticks = 0
    while (interp.advance() && ticks < 1000) {
      sim.step()
      ticks++
    }
    sim.dispose()
    push('loops: repeat 60 { wait 1/60 s } takes 60 ticks', ticks === 60, `${ticks} ticks`)
  }

  // Driving into a wall: the wheels stall (no phantom encoder counts), the block gives up, and the child hears "wall", not "grip".
  {
    const arena = open({ walls: [{ from: [-3, -1], to: [3, -1], height: 0.4, thickness: 0.06 }] })
    const prog: Program = { body: [{ op: 'drive_distance', id: 'd', cm: N(300), speedPct: N(100) }] }
    const r = runPolled(R, arena, DEFAULT_DESIGN, prog, 0)
    const res = r.result
    push(
      'wall: stalled wheels do not count, the block stops, judged "crashed" not "stuck"',
      !!res && res.reason === 'crashed' && res.wheelTravel < res.travelled + 0.1 && r.events.includes('stalled') && res.time < 15,
      res ? `${res.reason} at ${res.time}s, wheels ${(res.wheelTravel * 100).toFixed(0)} cm, moved ${(res.travelled * 100).toFixed(0)} cm, events ${r.events.join(',')}` : 'no result',
    )
  }

  // A spin on the spot is not "stuck".
  {
    const r = runPolled(R, open(), DEFAULT_DESIGN, { body: [{ op: 'turn_degrees', id: 't', deg: N(720), speedPct: N(100) }] }, 0)
    push('spin: turning on the spot is not judged "stuck"', r.result?.reason === 'short', `${r.result?.reason}: ${r.result?.message}`)
  }

  // Too slow to move: the turn and drive blocks give up instead of waiting for the time limit.
  {
    const t = runPolled(R, open(), DEFAULT_DESIGN, { body: [{ op: 'turn_degrees', id: 't', deg: N(90), speedPct: N(1) }] }, 0)
    const d = runPolled(R, open(), DEFAULT_DESIGN, { body: [{ op: 'drive_distance', id: 'd', cm: N(100), speedPct: N(1) }] }, 0)
    push(
      'watchdog: a turn/drive that cannot move gives up with a message',
      t.events.includes('stalled') && d.events.includes('stalled') && (t.result?.time ?? 99) < 5 && (d.result?.time ?? 99) < 5,
      `turn ${t.result?.time}s ${t.events.join(',')}; drive ${d.result?.time}s ${d.events.join(',')}`,
    )
  }

  // The distance sensor sees a low box 50 cm ahead of the robot's front.
  {
    const front = createSim(R, open(), DEFAULT_DESIGN).spec.body.front
    const sim = createSim(R, open({ boxes: [{ pos: [0, -2 + front + 0.5 + 0.07], size: 0.14, mass: 0.4 }] }), DEFAULT_DESIGN)
    const eyeZ = sim.spec.eye[2]
    const cm = sim.sensors().distanceCm
    const want = (front - eyeZ + 0.5) * 100
    push('distance: a 14 cm box 50 cm ahead is seen', Math.abs(cm - want) < 3, `read ${cm} cm, expected ≈${want.toFixed(0)} cm from the eye`)
    sim.dispose()
  }

  // A forever line-follower succeeds when it reaches the finish (instead of driving on until time runs out).
  {
    const r = runPolled(R, lineDemo.arena, lineBot, { body: [{ op: 'forever', id: 'f', body: [steer('s')] }] }, 0)
    push('forever: a forever line-follower reaches the finish', !!r.result?.success && r.result.time < lineDemo.arena.timeLimit, `${r.result?.reason ?? 'success'} at ${r.result?.time}s: ${r.result?.message}`)
    const stopper: Program = {
      body: [
        {
          op: 'forever',
          id: 'f',
          body: [
            {
              op: 'if',
              id: 'i',
              cond: { k: 'compare', op: '<', a: { k: 'sensor', s: 'distance_cm' }, b: N(15) },
              then: [{ op: 'stop', id: 's' }],
              else: [{ op: 'set_motors', id: 'm', leftPct: N(60), rightPct: N(60) }],
            },
          ],
        },
      ],
    }
    const w = runPolled(R, wallDemo.arena, designFor(DEFAULT_DESIGN, wallDemo.goodParts), stopper, 0)
    push('forever: a forever wall-stopper succeeds once at rest in the zone', !!w.result?.success && w.result.time < wallDemo.arena.timeLimit, `${w.result?.reason ?? 'success'} at ${w.result?.time}s`)
  }

  // A disabled block (Blockly 12 saves disabledReasons) does not run.
  {
    defineBlocks()
    const ws = new Blockly.Workspace()
    const prog: Program = { body: [{ op: 'drive_for', id: 'a', speedPct: N(50), seconds: N(1) }, { op: 'beep', id: 'b' }] }
    Blockly.serialization.workspaces.load(programToBlockly(prog), ws)
    ws.getBlockById('a')?.setDisabledReason(true, 'MANUALLY_DISABLED')
    const back = blocklyToProgram(Blockly.serialization.workspaces.save(ws) as BWorkspace)
    ws.dispose()
    push('blockly: a block the child disabled does not run', back.body.length === 1 && back.body[0].op === 'beep', JSON.stringify(back.body.map((x) => x.op)))
  }

  // light_on lets the camera see in the dark in the same tick.
  {
    const sim = createSim(
      R,
      open({ regions: [{ shape: { kind: 'rect', center: [0, -1.5], size: [2, 1.6] }, color: 'red', dark: true }] }),
      { ...DEFAULT_DESIGN, head: 'camera', sensor: 'none' },
    )
    const before = sim.sensors().floorColor
    sim.setLight(true)
    const after = sim.sensors().floorColor
    push('light: light_on then floor colour reads at once', before === 'black' && after === 'red', `${before} → ${after}`)
    sim.dispose()
  }

  // ── Level 1 calibration ───────────────────────────────────────────────────
  {
    const sim = createSim(R, open(), DEFAULT_DESIGN)
    const it = createInterpreter({ body: [{ op: 'turn_degrees', id: 't', deg: N(90), speedPct: N(40) }] }, sim)
    for (let i = 0; i < 600 && it.advance(); i++) sim.step()
    push('turn: turn_degrees +90 is a quarter turn LEFT (the curriculum contract)', Math.abs(sim.sensors().headingDeg - 270) < 2, `heading ${sim.sensors().headingDeg}°`)
    sim.dispose()
  }
  {
    // Pen at the turning centre: a quarter turn on the spot leaves a dot (< 1 cm), for every body.
    const spread: string[] = []
    let ok = true
    for (const body of ['box', 'dome', 'tall', 'bug'] as BodyId[]) {
      const sim = createSim(R, open(), { ...DEFAULT_DESIGN, body, tool: 'pen' })
      const it = createInterpreter({ body: [{ op: 'pen_down', id: 'p' }, { op: 'turn_degrees', id: 't', deg: N(-90), speedPct: N(40) }, { op: 'turn_degrees', id: 't2', deg: N(180), speedPct: N(40) }] }, sim)
      for (let i = 0; i < 900 && it.advance(); i++) sim.step()
      let w = 0
      for (let i = 0; i + 1 < sim.trail.length; i += 2) w = Math.max(w, Math.hypot(sim.trail[i] - sim.trail[0], sim.trail[i + 1] - sim.trail[1]))
      ok = ok && w < 0.01
      spread.push(`${body} ${(w * 100).toFixed(1)} cm`)
      sim.dispose()
    }
    push('pen: draws at the turning centre — a turn on the spot leaves a dot', ok, spread.join(', '))
  }
  {
    // Soft sand: about half the mat speed at Hop power, for every body; never a stop.
    const out: string[] = []
    let ok = true
    for (const body of ['box', 'dome', 'tall', 'bug'] as BodyId[]) {
      const d = { ...DEFAULT_DESIGN, body }
      const go = (floor: Arena['floor']) => {
        const sim = createSim(R, open({ floor }), d)
        const z0 = sim.snapshot().robot.p.z
        sim.setMotors(80, 80)
        for (let i = 0; i < Math.round(3 / DT); i++) sim.step()
        const z = sim.snapshot().robot.p.z - z0
        sim.dispose()
        return z
      }
      const r = go('soft-sand') / go('tile')
      ok = ok && r > 0.4 && r < 0.6
      out.push(`${body} ${(r * 100).toFixed(0)}%`)
    }
    push('soft sand (Level 1): a two-wheeler goes about half as far, never stops', ok, out.join(', '))
  }
  {
    // A stopped robot holds still on a 10° ramp (geared motors), and a heavy load slows it uphill.
    // A 10° ramp from z = -2.0 to -0.4 (rise 28 cm); the robot starts 40 cm before it.
    const ramp = open({ ramps: [{ center: [0, -1.2], size: [0.8, 1.6], height: 0.28, riseHeadingDeg: 0 }], start: { pos: [0, -2.4], headingDeg: 0 } })
    const climb = (extra: number) => {
      const sim = createSim(R, extra > 0 ? { ...ramp, objects: [{ id: 'w', kind: 'cube', pos: [0, -2.4 + 0.2], size: 0.04, mass: extra }] } : ramp, { ...DEFAULT_DESIGN, tool: 'scoop' })
      if (extra > 0) sim.grip(true)
      sim.setMotors(80, 80)
      for (let i = 0; i < Math.round(4 / DT); i++) sim.step()
      const z1 = sim.snapshot().robot.p.z
      sim.setMotors(0, 0)
      for (let i = 0; i < Math.round(2 / DT); i++) sim.step()
      const z2 = sim.snapshot().robot.p.z
      sim.dispose()
      return { up: z1 + 2.4, back: z1 - z2 }
    }
    const light = climb(0)
    const heavy = climb(0.8)
    push('ramp: a 0.8 kg load slows a two-wheeler uphill; stopped, it holds', heavy.up < light.up * 0.85 && heavy.back < 0.01 && light.back < 0.01, `4 s from the foot: ${(light.up * 100).toFixed(0)} cm empty, ${(heavy.up * 100).toFixed(0)} cm loaded; rolled back ${(light.back * 100).toFixed(1)} / ${(heavy.back * 100).toFixed(1)} cm after stopping`)
  }

  // ── Level 1 challenge arenas ──────────────────────────────────────────────
  push('level 1: one challenge arena per session', LEVEL1_ARENAS.length === 24 && LEVEL1_ARENAS.every((a, i) => a.id === LEVEL1_SESSIONS[i].id), LEVEL1_ARENAS.map((a) => a.id).join(' '))
  for (const ch of LEVEL1_ARENAS) {
    const session = LEVEL1_SESSIONS.find((x) => x.id === ch.id)
    if (!session) {
      push(`${ch.id}: matches a curriculum session`, false, 'no session')
      continue
    }
    const spec = session.challenge
    const pal = JSON.stringify(toPalette(spec.allowedBlocks))
    const start = ch.arena.start
    const specStart = spec.arena.start
    push(
      `${ch.id}: palette, parts and start match the curriculum`,
      pal === JSON.stringify(ch.palette) &&
        JSON.stringify([...spec.arena.requires].sort()) === JSON.stringify([...ch.requires].sort()) &&
        start.headingDeg === HEADING_DEG[specStart.heading] &&
        ch.specArena === spec.arena.id &&
        ch.title === spec.title,
      `${ch.palette.map((b) => b.label).join(', ')} | needs ${ch.requires.join('+') || 'nothing'} | ${spec.arena.id}`,
    )
    const results: string[] = []
    let allOk = true
    for (const body of ['box', 'dome', 'tall', 'bug'] as BodyId[]) {
      const d = sessionDesign(ch, { ...DEFAULT_DESIGN, body })
      const ref = referenceFor(ch, d)
      const r = runChallengeHeadless(R, ch, d, ref)
      allOk = allOk && r.success
      results.push(`${body} ${r.success ? `✓ ${r.time}s` : `✗ ${r.reason}: ${r.message}`}`)
    }
    push(`${ch.id}: reference succeeds with the session robot (all 4 bodies)`, allOk, results.join(' · '))
    const box = sessionDesign(ch, { ...DEFAULT_DESIGN, body: 'box' })
    for (const f of ch.failures) {
      const out: string[] = []
      let ok = true
      for (const body of ['box', 'dome', 'tall', 'bug'] as BodyId[]) {
        const d = { ...sessionDesign(ch, { ...DEFAULT_DESIGN, body }), ...(f.parts ?? {}) }
        const r = runChallengeHeadless(R, ch, d, f.program ?? referenceFor(ch, d))
        ok = ok && !r.success && r.reason === f.expect
        out.push(`${body} ${r.success ? 'succeeded' : r.reason}`)
      }
      push(`${ch.id}: taught mistake “${f.name}” fails with "${f.expect}"`, ok, out.join(' · '))
    }
    // A robot without the needed part is refused with a "fit the part" message.
    const needsPart = ch.requires.find((c) => c !== 'move')
    if (needsPart) {
      const bare = { ...box, head: 'antenna' as const, tool: 'none' as const, sensor: 'none' as const }
      const r = runChallengeHeadless(R, ch, bare, ch.reference)
      push(`${ch.id}: without the ${needsPart} part the run is refused`, !r.success && r.reason === 'missing-part', r.message)
    }
    // Deterministic, and stars computed.
    const prog = compile(ch.palette, ch.reference)
    const fp = () => {
      const cr = createChallengeRun(R, ch, box, prog)
      for (let k = 0; k < Math.ceil((ch.arena.timeLimit + 4) / DT) && !cr.done; k++) cr.tick()
      const p = cr.run.sim.snapshot().robot.p
      const res = judgeChallengeRun(ch, cr, prog, ch.reference)
      cr.run.sim.dispose()
      return { key: [p.x, p.y, p.z].map((v) => v.toFixed(9)).join('|'), res }
    }
    const a1 = fp()
    const a2 = fp()
    const stars = awardStars(ch, { nodes: ch.reference, program: prog, result: a1.res, history: [] })
    push(`${ch.id}: deterministic; ${stars.stars}★ for the reference`, a1.key === a2.key && stars.stars >= 1, `${a1.key.slice(0, 40)}${stars.claimable.length ? ` (claimable: ${stars.claimable.join(', ')})` : ''}`)
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
