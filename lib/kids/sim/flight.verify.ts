// lib/kids/sim/flight.verify.ts
// Headless checks for the Flight Recorder (roadmap #38) and battery + power
// (roadmap #39). Runs the real engine; no DOM.
//   1. pack maths: series adds volts, parallel adds capacity and divides
//      resistance; sag is I × R; every chemistry's curve rises with charge;
//      solar sizing and runtime numbers;
//   2. an arena with no battery is only metered: the charge falls, it never
//      goes flat, and it never changes the physics (verify.ts fingerprints
//      also hold);
//   3. recording is a pure read: a run recorded every tick ends bit-identical
//      to one that is not; the ring buffer keeps the newest frames in order;
//   4. the charge model: a heavier robot, a thicker floor and a light all
//      drain more on the same route; a low battery is slower; more cells in
//      parallel last longer; a stopped robot on a charger fills up;
//   5. every Power Lab challenge: reference succeeds for all four bodies, the
//      wrong part and each taught mistake run flat, runs are deterministic,
//      the Blockly round trip keeps the battery block;
//   6. "Why did it fail?" points at the crash, the slip, the flat battery;
//      a success has no marker; the ghost survives storage and replays the
//      finish pose.
//
// Run:  npx tsx lib/kids/sim/flight.verify.ts

import { DEFAULT_DESIGN, type BodyId, type RobotDesign } from '../robot-design'
import type { Arena } from './arena'
import { CELLS, CHEMISTRIES, cellOcv, packInfo, runtimeMinutes, solarPlan, terminalVoltage } from './battery'
import { blocklyToProgram, programToBlockly } from './blockly-json'
import { DEMOS, designFor } from './demos'
import { DT } from './engine'
import { POWER_DEMOS } from './power-demos'
import type { Program } from './program'
import { loadRapier, type Rapier } from './rapier'
import { beatsGhost, buildGraphs, FlightRecorder, ghostPose, makeGhost, parseGhost, whyFailed, type FlightFrame } from './recorder'
import { createRun, runHeadless, type Run, type RunResult } from './run'

interface Check {
  name: string
  ok: boolean
  detail: string
}

const BODIES: BodyId[] = ['box', 'dome', 'tall', 'bug']
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps

function runAll(R: Rapier, arena: Arena, design: RobotDesign, program: Program, rec?: FlightRecorder): { run: Run; result: RunResult; fp: string } {
  const run = createRun(R, arena, design, program)
  const parts = { distance: true, line: arena.lines.length > 0, bump: design.sensor === 'bumper' }
  const cap = Math.ceil((arena.timeLimit + 4) / DT)
  if (rec) rec.record(run.sim, parts, null, true)
  for (let i = 0; i < cap && run.status !== 'done'; i++) {
    run.tick()
    if (rec) rec.record(run.sim, parts, run.interp?.ctx.active ?? null, run.result !== null)
  }
  const s = run.sim.snapshot()
  const fp = [s.t, s.robot.p.x, s.robot.p.y, s.robot.p.z, s.robot.q.y, s.wheelAngle[0], s.wheelAngle[1]].map((n) => n.toFixed(9)).join('|')
  if (!run.result) throw new Error('run did not finish')
  return { run, result: run.result, fp }
}

const flat = (over: Partial<Arena> = {}): Arena => ({
  id: 'flight-test',
  title: 'test',
  size: [3, 6],
  center: [0, 0],
  floor: 'tile',
  regions: [],
  lines: [],
  walls: [],
  ramps: [],
  boxes: [],
  objects: [],
  start: { pos: [0, -2.5], headingDeg: 0 },
  goal: { kind: 'reach', zone: { kind: 'circle', center: [0, 2.5], radius: 0.2 } },
  timeLimit: 30,
  ...over,
})

const drive = (cm: number, pct: number): Program => ({ body: [{ op: 'drive_distance', id: 'd', cm: { k: 'number', v: cm }, speedPct: { k: 'number', v: pct } }, { op: 'stop', id: 's' }] })

async function main(): Promise<void> {
  const R = await loadRapier()
  const checks: Check[] = []
  const push = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail })

  // ── 1. Pack maths ────────────────────────────────────────────────────
  {
    const one = packInfo({ cell: 'nimh', series: 1, parallel: 1 })
    const s4 = packInfo({ cell: 'nimh', series: 4, parallel: 1 })
    const p2 = packInfo({ cell: 'nimh', series: 4, parallel: 2 })
    push('pack: series adds voltage', near(s4.nominalV, one.nominalV * 4, 1e-9), `${one.nominalV} V → ${s4.nominalV} V`)
    push('pack: parallel adds capacity, not voltage', p2.capacityMah === s4.capacityMah * 2 && p2.nominalV === s4.nominalV, `${s4.capacityMah} → ${p2.capacityMah} mAh`)
    push('pack: parallel halves internal resistance', near(p2.internalOhm, s4.internalOhm / 2, 1e-4), `${s4.internalOhm} Ω → ${p2.internalOhm} Ω`)
    const v0 = terminalVoltage({ cell: 'alkaline', series: 4, parallel: 1 }, 0.5, 0)
    const v1 = terminalVoltage({ cell: 'alkaline', series: 4, parallel: 1 }, 0.5, 1)
    push('pack: sag = I × R', near(v0 - v1, packInfo({ cell: 'alkaline', series: 4, parallel: 1 }).internalOhm, 1e-9), `${v0.toFixed(2)} V at 0 A, ${v1.toFixed(2)} V at 1 A`)
    const nimhSag = terminalVoltage({ cell: 'nimh', series: 4, parallel: 1 }, 0.5, 0) - terminalVoltage({ cell: 'nimh', series: 4, parallel: 1 }, 0.5, 1)
    push('pack: alkaline sags more than NiMH', v0 - v1 > nimhSag * 3, `alkaline ${(v0 - v1).toFixed(2)} V, NiMH ${nimhSag.toFixed(2)} V at 1 A`)
    let mono = true
    for (const c of CHEMISTRIES) for (let s = 0; s < 1; s += 0.01) if (cellOcv(c, s + 0.01) < cellOcv(c, s) - 1e-9) mono = false
    push('cells: voltage rises with charge for every chemistry', mono, CHEMISTRIES.map((c) => `${c} ${CELLS[c].cutoffV}–${cellOcv(c, 1)} V`).join(', '))
    const plan = solarPlan(2, 3, 5, 1)
    push('solar: 2 W × 3 h, 5 sun hours → 6 Wh, 1.6 W panel, 7.5 Wh battery', plan.dailyWh === 6 && plan.panelW === 1.6 && plan.batteryWh === 7.5, JSON.stringify(plan))
    push('runtime: 2000 mAh at 1 A = 120 min', runtimeMinutes({ cell: 'nimh', series: 4, parallel: 1 }, 1) === 120, String(runtimeMinutes({ cell: 'nimh', series: 4, parallel: 1 }, 1)))
  }

  // ── 2. Metered battery (no arena battery) ─────────────────────────────
  {
    const demo = DEMOS[0]
    const { run, result } = runAll(R, demo.arena, designFor(DEFAULT_DESIGN, demo.goodParts), demo.reference)
    const b = run.sim.battery()
    push('metered: charge falls, never flat, not coupled', !b.coupled && !b.flat && b.soc < 1 && b.usedMah > 0 && result.success, `used ${b.usedMah.toFixed(2)} mAh, ${(b.soc * 100).toFixed(2)} % left, peak ${b.peakAmps.toFixed(2)} A`)
    run.sim.dispose()
  }

  // ── 3. Recording is a pure read; the ring buffer ──────────────────────
  {
    let same = true
    const notes: string[] = []
    for (const demo of [...DEMOS, ...POWER_DEMOS]) {
      const d = designFor(DEFAULT_DESIGN, demo.goodParts)
      const a = runAll(R, demo.arena, d, demo.reference)
      const rec = new FlightRecorder()
      const b = runAll(R, demo.arena, d, demo.reference, rec)
      if (a.fp !== b.fp) same = false
      notes.push(`${demo.id} ${rec.length} frames`)
      a.run.sim.dispose()
      b.run.sim.dispose()
    }
    push('recorder: a recorded run ends exactly like an unrecorded one', same, notes.join(', '))
    const ring = new FlightRecorder(10)
    const demo = DEMOS[0]
    const r = runAll(R, demo.arena, DEFAULT_DESIGN, demo.reference, ring)
    const fr = ring.frames()
    const ordered = fr.every((f, i) => i === 0 || f.t > fr[i - 1].t)
    push('recorder: ring buffer keeps the newest frames in order', ring.length === 10 && ring.dropped > 0 && ordered && near(fr[fr.length - 1].t, r.run.sim.time, 1e-9), `${ring.length} kept, ${ring.dropped} dropped, last t=${fr[fr.length - 1].t.toFixed(2)}`)
    r.run.sim.dispose()
  }

  // ── 4. The charge model ───────────────────────────────────────────────
  const used = (arena: Arena, design: RobotDesign, program: Program) => {
    const { run } = runAll(R, arena, design, program)
    const out = { mah: run.sim.battery().usedMah, t: run.sim.time, run }
    run.sim.dispose()
    return out
  }
  {
    const route = drive(300, 70)
    const metered = flat()
    const light = used(metered, { ...DEFAULT_DESIGN, body: 'bug' }, route)
    const heavy = used(metered, { ...DEFAULT_DESIGN, body: 'tall', tool: 'gripper' }, route)
    push('drain: a heavier robot uses more charge on the same route', heavy.mah > light.mah * 1.05, `bug ${light.mah.toFixed(3)} mAh, tall + gripper ${heavy.mah.toFixed(3)} mAh`)
    const rug = used(flat({ floor: 'carpet' }), DEFAULT_DESIGN, route)
    const tile = used(metered, DEFAULT_DESIGN, route)
    push('drain: a thick rug costs more than tiles', rug.mah > tile.mah * 1.1, `tile ${tile.mah.toFixed(3)} mAh, carpet ${rug.mah.toFixed(3)} mAh`)
    const lit: Program = { body: [{ op: 'light_on', id: 'l' }, ...route.body] }
    const lamp = used(metered, { ...DEFAULT_DESIGN, tool: 'light' }, lit)
    const dark = used(metered, { ...DEFAULT_DESIGN, tool: 'light' }, route)
    push('drain: a light left on costs charge', lamp.mah > dark.mah * 1.1, `off ${dark.mah.toFixed(3)} mAh, on ${lamp.mah.toFixed(3)} mAh`)

    const full = flat({ battery: { pack: { cell: 'nimh', series: 4, parallel: 1 }, startSoc: 1, drainScale: 1 } })
    const tired = flat({ battery: { pack: { cell: 'alkaline', series: 4, parallel: 1 }, startSoc: 0.12, drainScale: 1, ratedV: 4.8 } })
    const fast = used(full, DEFAULT_DESIGN, route)
    const slow = used(tired, DEFAULT_DESIGN, route)
    push('coupled: a low, sagging battery makes the same drive slower', slow.t > fast.t + 0.3, `full NiMH ${fast.t.toFixed(2)} s, tired alkaline ${slow.t.toFixed(2)} s`)

    const small = flat({ battery: { pack: { cell: 'nimh', series: 4, parallel: 1 }, startSoc: 0.05, drainScale: 60 } })
    const big = flat({ battery: { pack: { cell: 'nimh', series: 4, parallel: 2 }, startSoc: 0.05, drainScale: 60 } })
    const a = runAll(R, small, DEFAULT_DESIGN, drive(500, 70))
    const b = runAll(R, big, DEFAULT_DESIGN, drive(500, 70))
    push('coupled: 4S1P runs flat where 4S2P (two in parallel) gets there', a.result.reason === 'flat' && b.result.success, `4S1P ${a.result.reason} at ${a.result.time}s; 4S2P ${b.result.success ? 'made it' : b.result.reason} with ${((b.result.battery?.soc ?? 0) * 100).toFixed(1)} %`)
    a.run.sim.dispose()
    b.run.sim.dispose()

    const pad = flat({ battery: { pack: { cell: 'nimh', series: 4, parallel: 1 }, startSoc: 0.3, drainScale: 60 }, chargers: [{ center: [0, -2.5], radius: 0.2, amps: 2 }] })
    const waitHere: Program = { body: [{ op: 'wait', id: 'w', seconds: { k: 'number', v: 3 } }] }
    const c = runAll(R, pad, DEFAULT_DESIGN, waitHere)
    const bat = c.run.sim.battery()
    const charged = c.run.sim.events.some((e) => e.kind === 'battery' && e.text === 'charging')
    push('charger: a robot stopped on the pad fills up', bat.soc > 0.3 + 0.05 && charged, `30 % → ${(bat.soc * 100).toFixed(1)} % in 3 s on the battery clock`)
    c.run.sim.dispose()
  }

  // ── 5. Power Lab challenges ───────────────────────────────────────────
  for (const demo of POWER_DEMOS) {
    const ok: string[] = []
    const bad: string[] = []
    for (const body of BODIES) {
      const d = designFor({ ...DEFAULT_DESIGN, body }, demo.goodParts)
      const a = runHeadless(R, demo.arena, d, demo.reference)
      ;(a.result.success ? ok : bad).push(`${body} ${a.result.success ? `${a.result.time}s, ${Math.round((a.result.battery?.soc ?? 0) * 100)}% left` : `${a.result.reason}`}`)
    }
    push(`${demo.id}: reference succeeds for all four bodies`, bad.length === 0, [...ok, ...bad].join(' · '))
    if (Object.keys(demo.wrongParts).length > 0) {
      const res = BODIES.map((body) => runHeadless(R, demo.arena, designFor(designFor({ ...DEFAULT_DESIGN, body }, demo.goodParts), demo.wrongParts), demo.reference).result)
      push(`${demo.id}: wrong part ${JSON.stringify(demo.wrongParts)} fails with "${demo.wrongFails}"`, res.every((r) => !r.success && r.reason === demo.wrongFails), res.map((r, i) => `${BODIES[i]} ${r.reason}`).join(' · '))
    }
    for (const m of demo.mistakes ?? []) {
      const res = BODIES.map((body) => runHeadless(R, demo.arena, designFor({ ...DEFAULT_DESIGN, body }, demo.goodParts), m.program).result)
      push(`${demo.id}: mistake “${m.name}” fails with "${m.fails}"`, res.every((r) => !r.success && r.reason === m.fails), res.map((r, i) => `${BODIES[i]} ${r.reason}`).join(' · '))
    }
    const d = designFor(DEFAULT_DESIGN, demo.goodParts)
    const x = runHeadless(R, demo.arena, d, demo.reference)
    const y = runHeadless(R, demo.arena, d, demo.reference)
    push(`${demo.id}: deterministic`, x.fingerprint === y.fingerprint, x.fingerprint.slice(0, 50))
    const rt = blocklyToProgram(programToBlockly(demo.reference))
    push(`${demo.id}: Blockly JSON round trip`, JSON.stringify(rt) === JSON.stringify(demo.reference), JSON.stringify(rt).slice(0, 60))
  }
  {
    // The battery block: "drive until the battery is below 9 %" stops on its own.
    const prog: Program = {
      body: [
        {
          op: 'repeat_until',
          id: 'u',
          cond: { k: 'compare', op: '<', a: { k: 'sensor', s: 'battery_pct' }, b: { k: 'number', v: 9 } },
          body: [{ op: 'set_motors', id: 'm', leftPct: { k: 'number', v: 60 }, rightPct: { k: 'number', v: 60 } }],
        },
        { op: 'stop', id: 's' },
      ],
    }
    const arena = flat({ battery: { pack: { cell: 'nimh', series: 4, parallel: 1 }, startSoc: 0.12, drainScale: 60 } })
    const { run } = runAll(R, arena, DEFAULT_DESIGN, prog)
    const soc = run.sim.battery().soc
    push('battery block: a program can watch its own charge', soc < 0.09 && soc > 0.07 && !run.sim.battery().flat, `stopped at ${(soc * 100).toFixed(1)} %`)
    const rt = blocklyToProgram(programToBlockly(prog))
    push('battery block: Blockly round trip', JSON.stringify(rt) === JSON.stringify(prog), JSON.stringify(rt).slice(0, 60))
    run.sim.dispose()
  }

  // ── 6. Why did it fail? Ghosts. ───────────────────────────────────────
  {
    const wall = DEMOS.find((d) => d.id === 'stop-before-wall')
    if (wall) {
      const rec = new FlightRecorder()
      const crash: Program = { body: [{ op: 'drive_for', id: 'd', speedPct: { k: 'number', v: 80 }, seconds: { k: 'number', v: 8 } }] }
      const r = runAll(R, wall.arena, DEFAULT_DESIGN, crash, rec)
      const m = whyFailed(rec.frames(), r.run.sim.events, r.result)
      const crashT = r.run.sim.events.find((e) => e.kind === 'crash')?.t
      push('why: a crash is marked at the moment of impact', r.result.reason === 'crashed' && m?.kind === 'crash' && crashT !== undefined && near(m.t, crashT, 1e-9), `${r.result.reason} → ${m?.label} at ${m?.t.toFixed(2)} s (${m?.graph})`)
      r.run.sim.dispose()
    }
    const sand = DEMOS.find((d) => d.id === 'sand-trap')
    if (sand) {
      const rec = new FlightRecorder()
      const r = runAll(R, sand.arena, designFor(DEFAULT_DESIGN, sand.wrongParts), sand.reference, rec)
      const m = whyFailed(rec.frames(), r.run.sim.events, r.result)
      const g = buildGraphs(rec.frames(), { distance: true, line: false, bump: false })
      const shaded = g.find((x) => x.id === 'speed')?.bands?.[0].points.some((p) => p[2] - p[1] > 3) ?? false
      push('why: wheels stuck in sand → a slip marker, and the slip is shaded', r.result.reason === 'stuck' && m?.kind === 'slip' && m.t > 0 && shaded, `${m?.label} at ${m?.t.toFixed(2)} s, graph ${m?.graph}`)
      r.run.sim.dispose()
    }
    const home = POWER_DEMOS[0]
    {
      const rec = new FlightRecorder()
      const r = runAll(R, home.arena, designFor(DEFAULT_DESIGN, home.wrongParts), home.reference, rec)
      const m = whyFailed(rec.frames(), r.run.sim.events, r.result)
      push('why: a flat battery is marked, pointing at the battery graph', r.result.reason === 'flat' && m?.kind === 'flat' && m.graph === 'battery', `${m?.label} at ${m?.t.toFixed(2)} s: ${m?.detail}`)
      r.run.sim.dispose()
    }
    {
      const rec = new FlightRecorder()
      const d = designFor(DEFAULT_DESIGN, home.goodParts)
      const r = runAll(R, home.arena, d, home.reference, rec)
      const frames: FlightFrame[] = rec.frames()
      push('why: a success has no failure marker', r.result.success && whyFailed(frames, r.run.sim.events, r.result) === null, r.result.message)
      const ghost = makeGhost(home.arena.id, frames, r.result.time, `${d.body}/${d.drive}`)
      const back = ghost ? parseGhost(JSON.parse(JSON.stringify(ghost))) : null
      const endPose = back ? ghostPose(back, 1e9) : null
      const p = r.run.sim.snapshot().robot.p
      push(
        'ghost: survives storage and ends where the run ended',
        back !== null && endPose !== null && Math.hypot(endPose.p.x - p.x, endPose.p.z - p.z) < 0.01 && JSON.stringify(back).length < 40_000,
        `${back ? back.track.length / 5 : 0} rows, ${JSON.stringify(back).length} bytes`,
      )
      push(
        'ghost: only a faster success beats it',
        ghost !== null && beatsGhost({ success: true, time: ghost.time - 0.5 }, ghost) && !beatsGhost({ success: true, time: ghost.time + 0.5 }, ghost) && !beatsGhost({ success: false, time: 1 }, null) && beatsGhost({ success: true, time: 9 }, null),
        `ghost ${ghost?.time}s`,
      )
      push('ghost: junk in storage is rejected', parseGhost({ v: 1, arenaId: 'x', time: 1, parts: '', track: [1, 2, 3] }) === null && parseGhost('nope') === null, 'ok')
      r.run.sim.dispose()
    }
  }

  let failed = 0
  for (const c of checks) {
    if (!c.ok) failed++
    console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}`)
    console.log(`      ${c.detail}`)
  }
  console.log(`\n${checks.length - failed}/${checks.length} checks passed`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
