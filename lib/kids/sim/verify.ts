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
//   9. Wave 3: the reflectance block (L3 S4, "Find the faded line"), Workshop
//      upgrades in the physics (fittedSpec = specSheet mass and top speed),
//      the battery each power upgrade carries and its cruise runtime
//      (cruisePower), deep links (?demo=, ?tier=), the games' Flight Recorder;
//  10. Wave 4 (build log #23): the motor dead zone (measured per drive, the arena
//      override, "Find the dead zone"), carry positions (the carry load block,
//      "Low and slow": high tips every body on the 20° ramp, low delivers),
//      the drive pushing at the tyre (no tipping on the flat), every demo's
//      taught mistakes, and the lab result id the course reads;
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
import { POWER as SHEET_POWER, specSheet } from '../robot-growth'
import { cruisePower, fittedSpec, powerPack, POWER_PACKS, robotSpec } from './robot-spec'
import { packInfo } from './battery'
import { POWER_DEMOS } from './power-demos'
import { gameTierHref, labDemoHref } from './lab-links'
import { missingParts } from './program'
import { REFLECTANCE } from './arena'
import { GAME_MAX_CHANNELS, GameRecorder, hasRecording, markGameMoment, recordGameFrame, setActiveGameRecorder } from './game-recorder'
import { MOTOR_DEAD_ZONE_PCT } from './robot-spec'
import { FlightRecorder, whyFailed } from './recorder'
import { labResultId, labSolved } from './lab-links'
import { labScore, labTimeOf } from './lab-results'
import { reusePlayDone } from '../curriculum/level3/reuse-kit'
import { LEVEL3_REUSE } from '../curriculum/level3/reuse'
import { LEVEL4_REUSE } from '../curriculum/level4/reuse'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

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

  wave3Checks(R, push)
  wave4Checks(R, push)

  let failed = 0
  for (const c of checks) {
    if (!c.ok) failed++
    console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}\n      ${c.detail}`)
  }
  console.log(`\n${checks.length - failed}/${checks.length} checks passed`)
  if (failed > 0) process.exit(1)
}

// ── 9. Wave 3 ──────────────────────────────────────────────────────────────
function wave3Checks(R: Rapier, push: (name: string, ok: boolean, detail: string) => void): void {
  // Reflectance: white tile, fresh black tape, a smooth edge, a pure read, and it needs the line sensor.
  {
    const arena = open({ lines: [{ width: 0.03, points: [[-1, -1.75], [1, -1.75]] }] })
    const design: RobotDesign = { ...DEFAULT_DESIGN, sensor: 'line' }
    const sim = createSim(R, arena, design)
    const white = sim.sensors().reflectance
    const seen: number[] = []
    sim.setMotors(30, 30)
    for (let i = 0; i < Math.round(3 / DT); i++) {
      sim.step()
      seen.push(sim.sensors().reflectance)
    }
    const darkest = Math.min(...seen)
    const between = seen.some((v) => v > REFLECTANCE.black + 5 && v < REFLECTANCE.white - 5)
    push('reflectance: white tile ≈ 90, black tape ≈ 8, in between on the edge', white === REFLECTANCE.white && darkest === REFLECTANCE.black && between, `start ${white}, darkest ${darkest}, an edge reading ${between ? 'seen' : 'missing'}`)
    sim.dispose()
    const prog: Program = { body: [{ op: 'set_var', id: 'v', name: 'r', value: { k: 'sensor', s: 'reflectance' } }] }
    const lock = missingParts(prog, { ...DEFAULT_DESIGN, sensor: 'none' })
    push('reflectance: locked without a line sensor, free with one', lock.length === 1 && lock[0].needs === 'follow-line' && missingParts(prog, design).length === 0, lock.map((l) => l.message).join(' '))
    const a = runPolled(R, arena, design, { body: [{ op: 'drive_for', id: 'd', speedPct: N(40), seconds: N(2) }] }, 0)
    const b = runPolled(R, arena, design, { body: [{ op: 'drive_for', id: 'd', speedPct: N(40), seconds: N(2) }] }, 1)
    push('reflectance: reading it never changes a run', a.fp === b.fp, a.fp)
  }

  // "Find the faded line": the reference wins with every body; a lab threshold of 30 drives over the line.
  {
    const demo = DEMOS.find((d) => d.id === 'faded-line')
    push('faded-line: arena exists (L3 S4)', Boolean(demo), '')
    if (demo) {
      const bodies: BodyId[] = ['box', 'dome', 'tall', 'bug']
      const res = bodies.map((body) => runHeadless(R, demo.arena, designFor({ ...DEFAULT_DESIGN, body }, demo.goodParts), demo.reference).result)
      push('faded-line: calibrated threshold stops on the faded line, all four bodies', res.every((r) => r.success), res.map((r, i) => `${bodies[i]} ${r.success ? 'ok' : r.reason}`).join(' · '))
      const lineZ = demo.arena.lines[0].points[0][1]
      for (const m of demo.mistakes ?? []) {
        const run = createRun(R, demo.arena, designFor(DEFAULT_DESIGN, demo.goodParts), m.program)
        for (let i = 0; i < Math.ceil((demo.arena.timeLimit + 4) / DT) && run.status !== 'done'; i++) run.tick()
        const z = run.sim.snapshot().robot.p.z
        const r = run.result
        run.sim.dispose()
        push(`faded-line: mistake “${m.name}” fails past the line`, Boolean(r && !r.success && (r.reason === 'crashed' || r.reason === 'timeout')) && z > lineZ, `${r?.reason}: ended at z=${z.toFixed(2)} (line at ${lineZ})`)
      }
    }
  }

  // Upgrades in the physics (#33): no upgrades = the starter spec; masses and top speeds match the spec sheet.
  {
    const base = robotSpec(DEFAULT_DESIGN)
    push('upgrades: none fitted = robotSpec exactly', JSON.stringify(fittedSpec(DEFAULT_DESIGN)) === JSON.stringify(base) && JSON.stringify(fittedSpec({ ...DEFAULT_DESIGN, upgrades: { chassis: 'drone' } })) === JSON.stringify(base), '')
    let worst = ''
    let ok = true
    for (const drive of ['wheels2', 'wheels4', 'tracks', 'legs'] as const)
      for (const power of ['aa', 'lipo', 'bigpack', 'solar'] as const)
        for (const motor of ['gear', 'speedy', 'torque', 'brushless'] as const)
          for (const arm of ['none', 'arm2', 'arm3'] as const) {
            const d: RobotDesign = { ...DEFAULT_DESIGN, drive, upgrades: { power, motor, arm, sensor2: 'bumper' } }
            const f = fittedSpec(d)
            const sheet = specSheet(d)
            const dm = Math.abs(Math.round(f.mass * 100) / 100 - sheet.massKg)
            const dv = Math.abs(Math.round(f.drive.maxSpeed * 100) / 100 - sheet.topSpeed)
            if (dm > 0.011 || dv > 0.011) {
              ok = false
              worst = `${drive}/${power}/${motor}/${arm}: mass ${f.mass.toFixed(2)} vs ${sheet.massKg}, speed ${f.drive.maxSpeed.toFixed(2)} vs ${sheet.topSpeed}`
            }
          }
    push('upgrades: the sim’s mass and top speed are the spec sheet’s (256 ground designs)', ok, worst || 'all equal to 0.01')

    // Measured on tile: a speedy motor is faster than a gear motor, a torque motor slower but pushes harder.
    const topSpeed = (d: RobotDesign) => {
      const sim = createSim(R, open(), d)
      sim.setMotors(100, 100)
      for (let i = 0; i < Math.round(4 / DT); i++) sim.step()
      const v = sim.snapshot().groundSpeed
      sim.dispose()
      return v
    }
    const gear = topSpeed(DEFAULT_DESIGN)
    const speedy = topSpeed({ ...DEFAULT_DESIGN, upgrades: { motor: 'speedy' } })
    const torque = topSpeed({ ...DEFAULT_DESIGN, upgrades: { motor: 'torque' } })
    push('upgrades: on tile speedy > gear > torque (measured)', speedy > gear * 1.2 && torque < gear * 0.85, `speedy ${speedy.toFixed(3)}, gear ${gear.toFixed(3)}, torque ${torque.toFixed(3)} m/s`)
    // Up a steep ramp with the claw holding nothing: the torque motor climbs where speedy motors stall.
    const climb = (motor: 'speedy' | 'torque') => {
      const arena = open({ ramps: [{ center: [0, -1.2], size: [0.8, 1], height: 0.45, riseHeadingDeg: 0 }] })
      const sim = createSim(R, arena, { ...DEFAULT_DESIGN, upgrades: { motor, power: 'bigpack', arm: 'arm3' } })
      sim.setMotors(100, 100)
      for (let i = 0; i < Math.round(8 / DT); i++) sim.step()
      const y = sim.snapshot().robot.p.y
      sim.dispose()
      return y
    }
    const ySpeedy = climb('speedy')
    const yTorque = climb('torque')
    push('upgrades: a heavy robot climbs a 24° ramp with torque motors where speedy ones stall', yTorque > ySpeedy + 0.2, `torque reached y=${yTorque.toFixed(2)} m, speedy y=${ySpeedy.toFixed(2)} m`)
  }

  // The battery follows the robot's pack (#39): metered pack = power upgrade; the engine drains at cruisePower's rate.
  {
    for (const [id, pack] of Object.entries(POWER_PACKS)) {
      const info = packInfo(pack)
      const sheet = SHEET_POWER[id]
      const wh = sheet.volts * sheet.ampHours
      push(`battery: ${id} pack ${info.nominalV} V ${info.capacityMah} mAh matches the spec sheet within 3 %`, Math.abs(info.energyWh - wh) / wh <= 0.03 && Math.abs(info.nominalV - sheet.volts) <= 0.15, `${info.energyWh} Wh vs ${wh.toFixed(2)} Wh`)
    }
    const measure = (d: RobotDesign) => {
      const sim = createSim(R, open({ size: [6, 30], timeLimit: 120 }), d)
      sim.setMotors(100, 100)
      for (let i = 0; i < Math.round(3 / DT); i++) sim.step()
      const used0 = sim.battery().usedMah
      const secs = 10
      for (let i = 0; i < Math.round(secs / DT); i++) sim.step()
      const amps = ((sim.battery().usedMah - used0) / 1000) / (secs / 3600)
      const packMah = packInfo(sim.battery().pack).capacityMah
      const same = JSON.stringify(sim.battery().pack) === JSON.stringify(powerPack(d))
      sim.dispose()
      return { amps, runtimeMin: ((packMah / 1000) / amps) * 60, same }
    }
    const rows: string[] = []
    let ok = true
    let samePack = true
    const runtimes: Record<string, number> = {}
    for (const power of ['aa', 'lipo', 'bigpack'] as const) {
      const d: RobotDesign = { ...DEFAULT_DESIGN, upgrades: { power } }
      const m = measure(d)
      const c = cruisePower(d)
      runtimes[power] = m.runtimeMin
      samePack = samePack && m.same
      const err = Math.abs(m.amps - c.amps) / c.amps
      if (err > 0.15) ok = false
      rows.push(`${power}: sim ${m.amps.toFixed(3)} A (${Math.round(m.runtimeMin)} min) vs cruisePower ${c.amps} A (${c.runtimeMin} min)`)
    }
    push('battery: the metered pack is the robot’s power upgrade', samePack, '')
    push('battery: the engine drains at cruisePower’s rate within 15 % (runtime follows the pack)', ok, rows.join(' · '))
    push('battery: a bigger pack runs longer (bigpack > lipo > aa)', runtimes.bigpack > runtimes.lipo && runtimes.lipo > runtimes.aa, rows.join(' · '))
  }

  // Deep links: every lab arena opens on its own page; tiers open in the game.
  {
    const okSim = DEMOS.every((d) => !d.id.startsWith('power-') && labDemoHref(d.id) === `/kids/lab/sim?demo=${d.id}`)
    const okPow = POWER_DEMOS.every((d) => d.id.startsWith('power-') && labDemoHref(d.id) === `/kids/lab/power?demo=${d.id}`)
    push('links: ?demo= opens the right lab for every arena', okSim && okPow, '')
    push('links: ?tier= for tiers above Cadet', gameTierHref('sumo-arena', 0) === '/kids/play/sumo-arena' && gameTierHref('sumo-arena', 2) === '/kids/play/sumo-arena?tier=2', '')
    const lab = readFileSync(join(__dirname, '..', '..', '..', 'components', 'kids', 'sim', 'SimLabClient.tsx'), 'utf8')
    const power = readFileSync(join(__dirname, '..', '..', '..', 'components', 'kids', 'sim', 'PowerLabClient.tsx'), 'utf8')
    const shell = readFileSync(join(__dirname, '..', '..', '..', 'components', 'kids', 'ui', 'GameShellClient.tsx'), 'utf8')
    push('links: SimLab, Power Lab and the game shell read ?demo= / ?tier=', /get\('demo'\)/.test(lab) && /get\('demo'\)/.test(power) && /get\('tier'\)/.test(shell), '')
  }

  // Blocks: the new sensor is in the shared block set and in the Sense toolbox group.
  {
    const src = readFileSync(join(__dirname, '..', '..', '..', 'components', 'kids', 'sim', 'blockly-blocks.ts'), 'utf8')
    const sense = /name: '👀 Sense'[^\n]*/.exec(src)?.[0] ?? ''
    push('blocks: reflectance and battery % are defined and in the Sense group', /reporter\('reflectance'/.test(src) && /reporter\('battery_pct'/.test(src) && sense.includes("'reflectance'") && sense.includes("'battery_pct'"), sense.slice(0, 120))
  }

  // Games' Flight Recorder (#38): throttled, capped, no-op without a shell, safe snapshot.
  {
    recordGameFrame(0, { a: 1 }) // no shell: nothing happens, nothing throws
    const rec = new GameRecorder()
    setActiveGameRecorder(rec)
    for (let i = 0; i <= 600; i++) recordGameFrame(i / 60, { 'Height (m)': Math.sin(i / 60), 'Sees rival': i % 120 < 60 })
    markGameMoment(5, 'Gust!')
    markGameMoment(5.1, 'Gust!')
    recordGameFrame(11, { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7 })
    setActiveGameRecorder(null)
    recordGameFrame(12, { 'Height (m)': 9 })
    const snap = rec.snapshot()
    push('game recorder: 20 frames a second, not 60', snap.frames.length >= 200 && snap.frames.length <= 203, `${snap.frames.length} frames for 10 s`)
    push('game recorder: channels capped, booleans as 0/1, duplicate moments folded', snap.channels.length === GAME_MAX_CHANNELS && snap.frames[0].v[1] === 1 && snap.moments.length === 1, snap.channels.join(', '))
    push('game recorder: padded snapshot, nothing recorded after the round', snap.frames.every((f) => f.v.length === snap.channels.length) && snap.frames[snap.frames.length - 1].t === 11 && hasRecording(snap), '')
  }
}

// ── 10. Wave 4 ─────────────────────────────────────────────────────────────
function wave4Checks(R: Rapier, push: (name: string, ok: boolean, detail: string) => void): void {
  /** Steady speed (cm/s) on tile at a motor command, measured over 2 s after 3 s to settle. */
  const speedAt = (d: RobotDesign, pct: number, over: Partial<Arena> = {}) => {
    const sim = createSim(R, open({ size: [6, 30], ...over }), d)
    sim.setMotors(pct, pct)
    for (let i = 0; i < Math.round(3 / DT); i++) sim.step()
    const z0 = sim.snapshot().robot.p.z
    for (let i = 0; i < Math.round(2 / DT); i++) sim.step()
    const v = ((sim.snapshot().robot.p.z - z0) / 2) * 100
    const hum = sim.telemetry().humming
    sim.dispose()
    return { v, hum: Boolean(hum && hum[0] && hum[1]) }
  }

  // The dead zone: below it the wheels do not turn (the motor hums), from it they do — every drive.
  {
    const rows: string[] = []
    let ok = true
    for (const drive of ['wheels2', 'wheels4', 'tracks', 'legs'] as const) {
      const d: RobotDesign = { ...DEFAULT_DESIGN, drive }
      const below = [4, 8, MOTOR_DEAD_ZONE_PCT - 1].map((p) => speedAt(d, p))
      const at = speedAt(d, MOTOR_DEAD_ZONE_PCT)
      const above = speedAt(d, 30)
      ok = ok && below.every((b) => Math.abs(b.v) < 0.05 && b.hum) && at.v > 0.5 && !at.hum && above.v > at.v * 2
      rows.push(`${drive}: ${below.map((b) => b.v.toFixed(1)).join('/')} → ${at.v.toFixed(1)} at ${MOTOR_DEAD_ZONE_PCT} % → ${above.v.toFixed(1)} cm/s at 30 %`)
    }
    push(`dead zone: below ${MOTOR_DEAD_ZONE_PCT} % the motors hum and the wheels stay still; from it they turn (every drive)`, ok, rows.join(' · '))
    const worn = speedAt(DEFAULT_DESIGN, 20, { motorDeadZonePct: 25 })
    const fine = speedAt(DEFAULT_DESIGN, 20)
    push('dead zone: an arena can set a worn motor (25 %): 20 % no longer moves', Math.abs(worn.v) < 0.05 && worn.hum && fine.v > 5, `worn ${worn.v.toFixed(1)}, normal ${fine.v.toFixed(1)} cm/s`)
    // drive_distance inside the dead zone gives up with the stall message instead of hanging.
    const sim = createSim(R, open(), DEFAULT_DESIGN)
    const it = createInterpreter({ body: [{ op: 'drive_distance', id: 'd', cm: N(30), speedPct: N(8) }] }, sim)
    let n = 0
    while (n < 600 && it.advance()) {
      sim.step()
      n++
    }
    push('dead zone: drive_distance at 8 % stalls with a message (no endless wait)', n < 600 && sim.events.some((e) => e.kind === 'stalled'), `${n} ticks`)
    sim.dispose()
  }

  // "Find the dead zone" (L4 S2): the reference measures the threshold — it says exactly the dead zone.
  {
    const demo = DEMOS.find((d) => d.id === 'dead-zone')
    push('dead-zone: arena exists (L4 S2)', Boolean(demo), '')
    if (demo) {
      const said: string[] = []
      let ok = true
      for (const body of ['box', 'dome', 'tall', 'bug'] as BodyId[]) {
        const run = createRun(R, demo.arena, designFor({ ...DEFAULT_DESIGN, body }, demo.goodParts), demo.reference)
        for (let i = 0; i < Math.ceil((demo.arena.timeLimit + 4) / DT) && run.status !== 'done'; i++) run.tick()
        const say = run.sim.events.find((e) => e.kind === 'say')?.text
        said.push(`${body} said ${say} (${run.result?.success ? 'parked' : run.result?.reason})`)
        ok = ok && Boolean(run.result?.success) && say === String(MOTOR_DEAD_ZONE_PCT)
        run.sim.dispose()
      }
      push(`dead-zone: the reference finds ${MOTOR_DEAD_ZONE_PCT} % and parks, all four bodies`, ok, said.join(' · '))
      // The Flight Recorder names the dead zone when a creep at 8 % never arrives.
      const m = demo.mistakes?.[0]
      if (m) {
        const run = createRun(R, demo.arena, designFor(DEFAULT_DESIGN, demo.goodParts), m.program)
        const rec = new FlightRecorder()
        rec.record(run.sim, { distance: true, line: false, bump: false }, null, true)
        for (let i = 0; i < Math.ceil((demo.arena.timeLimit + 4) / DT) && run.status !== 'done'; i++) {
          run.tick()
          rec.record(run.sim, { distance: true, line: false, bump: false }, run.interp?.ctx.active ?? null)
        }
        const why = whyFailed(rec.frames(), run.sim.events, run.result)
        push('dead-zone: “Why did it fail?” names the dead zone for a creep at 8 %', why?.label === 'Dead zone', `${run.result?.reason}: ${why?.label} — ${why?.detail}`)
        run.sim.dispose()
      }
    }
  }

  // The drive pushes at the tyre now: hard starts and reversals never tip any robot on the flat.
  {
    let ok = true
    const bad: string[] = []
    for (const body of ['box', 'dome', 'tall', 'bug'] as BodyId[])
      for (const drive of ['wheels2', 'wheels4', 'tracks', 'legs'] as const)
        for (const tool of ['none', 'scoop'] as const) {
          const sim = createSim(R, open(), { ...DEFAULT_DESIGN, body, drive, tool })
          for (const [l, r] of [[100, 100], [-100, -100], [100, -100], [100, 100]] as const) {
            sim.setMotors(l, r)
            for (let i = 0; i < Math.round(0.8 / DT); i++) sim.step()
          }
          if (sim.tipped) {
            ok = false
            bad.push(`${body}/${drive}/${tool}`)
          }
          sim.dispose()
        }
    push('tyre push: full-power starts, reversals and spins never tip a robot on the flat (32 robots)', ok, bad.join(', ') || 'none tipped')
  }

  // Carry positions: the block round-trips, needs a claw or scoop, and moves the load.
  {
    const prog: Program = { body: [{ op: 'grip_close', id: 'g' }, { op: 'set_carry', id: 'c', pos: 'high' }, { op: 'set_carry', id: 'c2', pos: 'low' }] }
    push('carry: the carry load block survives the Blockly round trip', JSON.stringify(blocklyToProgram(programToBlockly(prog))) === JSON.stringify(prog), '')
    const lock = missingParts(prog, { ...DEFAULT_DESIGN, tool: 'none' })
    push('carry: locked without a claw or scoop', lock.some((l) => l.block === 'set_carry' && l.needs === 'grab'), lock.map((l) => l.block).join(', '))
    const heights: Record<string, string> = {}
    let ok = true
    for (const tool of ['scoop', 'gripper'] as const) {
      const sim = createSim(R, open({ objects: [{ id: 'b', kind: 'cube', pos: [0, -1.85], size: 0.03, mass: 0.1 }] }), { ...DEFAULT_DESIGN, tool })
      const grabbed = sim.grip(true)
      const yAt = (pos: 'normal' | 'high' | 'low') => {
        sim.setCarry(pos)
        for (let i = 0; i < 20; i++) sim.step()
        const b = sim.snapshot().bodies.find((x) => x.id === 'b')
        return b ? b.p.y : NaN
      }
      const n = yAt('normal')
      const h = yAt('high')
      const l = yAt('low')
      ok = ok && grabbed && h > n + 0.08 && l < n && sim.snapshot().holding === 'b' && sim.carry === 'low'
      heights[tool] = `low ${(l * 100).toFixed(0)} < normal ${(n * 100).toFixed(0)} < high ${(h * 100).toFixed(0)} cm`
      sim.dispose()
    }
    push('carry: high lifts the held load, low lowers it (scoop and claw), the load stays held', ok, JSON.stringify(heights))
    // On the flat, even the high carry does not tip: the slope does it.
    const sim = createSim(R, open({ objects: [{ id: 'b', kind: 'cube', pos: [0, -1.79], size: 0.04, mass: 0.3 }] }), { ...DEFAULT_DESIGN, tool: 'scoop' })
    sim.grip(true)
    sim.setCarry('high')
    sim.setMotors(40, 40)
    for (let i = 0; i < Math.round(4 / DT); i++) sim.step()
    push('carry: carried high on the flat, the robot does not tip', !sim.tipped && sim.snapshot().holding === 'b', '')
    sim.dispose()
  }

  // "Low and slow" (L3 S14): low delivers, high tips at the foot of the ramp — for every body.
  {
    const demo = DEMOS.find((d) => d.id === 'core-store-ramp')
    push('core-store-ramp: arena exists (L3 S14)', Boolean(demo), '')
    if (demo) {
      const bodies: BodyId[] = ['box', 'dome', 'tall', 'bug']
      const res = bodies.map((body) => runHeadless(R, demo.arena, designFor({ ...DEFAULT_DESIGN, body }, demo.goodParts), demo.reference).result)
      push('core-store-ramp: carried low, the core box reaches the store, all four bodies', res.every((r) => r.success), res.map((r, i) => `${bodies[i]} ${r.success ? 'ok' : r.reason}`).join(' · '))
      const ramp = demo.arena.ramps[0]
      const deg = (Math.atan(ramp.height / ramp.size[1]) * 180) / Math.PI
      push('core-store-ramp: the ramp is 20° as the session says', Math.abs(deg - 20) < 0.2, `${deg.toFixed(2)}°`)
      const tip = demo.mistakes?.find((m) => m.fails === 'tipped')
      if (tip) {
        const why: string[] = []
        let ok = true
        for (const body of bodies) {
          const run = createRun(R, demo.arena, designFor({ ...DEFAULT_DESIGN, body }, demo.goodParts), tip.program)
          const rec = new FlightRecorder()
          rec.record(run.sim, { distance: true, line: false, bump: false }, null, true)
          for (let i = 0; i < Math.ceil((demo.arena.timeLimit + 4) / DT) && run.status !== 'done'; i++) {
            run.tick()
            rec.record(run.sim, { distance: true, line: false, bump: false }, null)
          }
          const w = whyFailed(rec.frames(), run.sim.events, run.result)
          ok = ok && run.result?.reason === 'tipped' && w?.label === 'Tipped over'
          why.push(`${body} ${run.result?.reason} at ${w?.t.toFixed(1)} s`)
          run.sim.dispose()
        }
        push('core-store-ramp: carried high, every body tips over (and the recorder says so)', ok, why.join(' · '))
      }
    }
  }

  // Every demo's taught mistakes fail for the taught reason (faded-line is checked above).
  {
    for (const demo of DEMOS) {
      if (demo.id === 'faded-line') continue
      for (const m of demo.mistakes ?? []) {
        const r = runHeadless(R, demo.arena, designFor(DEFAULT_DESIGN, demo.goodParts), m.program).result
        push(`${demo.id}: mistake “${m.name}” fails with "${m.fails}"`, !r.success && r.reason === m.fails, `${r.reason}: ${r.message}`)
      }
    }
  }

  // The lab's result store as the course reads it: personalBests["lab:<id>"], higher is better.
  {
    push('lab results: one id per arena, and a stored score decodes to the time', labResultId('dead-zone') === 'lab:dead-zone' && labTimeOf({ timeLimit: 60 }, labScore({ timeLimit: 60 }, { time: 9.55 })) === 9.5, '')
    const sims = [...LEVEL3_REUSE, ...LEVEL4_REUSE].filter((r) => r.play.kind === 'sim-demo')
    const ok = sims.every((r) => !reusePlayDone(r.play, { personalBests: {}, codeMissions: {} }) && reusePlayDone(r.play, { personalBests: { [labResultId(r.play.id)]: 1 }, codeMissions: {} }))
    push(`lab results: the ${sims.length} Level 3–4 lab sessions count done from the store, not a button`, ok && labSolved({ 'lab:x': 3 }, 'x') && !labSolved({ 'lab:x': 0 }, 'x'), sims.map((r) => r.session).join(', '))
    const src = readFileSync(join(__dirname, '..', '..', '..', 'components', 'kids', 'course', 'SessionRunnerClient.tsx'), 'utf8')
    push('lab results: the session runner no longer offers "I finished it" for a lab arena', !/reuse\.play\.kind === 'sim-demo' \|\|/.test(src), '')
    const wb = readFileSync(join(__dirname, '..', '..', '..', 'components', 'kids', 'sim', 'SimWorkbenchClient.tsx'), 'utf8')
    push('lab results: the workbench (Physics Lab and Power Lab) reports every finished run', /reportLabRun\(/.test(wb), '')
  }
}

void main()
