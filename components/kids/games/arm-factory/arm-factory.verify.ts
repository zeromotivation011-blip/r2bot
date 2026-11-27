// components/kids/games/arm-factory/arm-factory.verify.ts
// Pure checks for Arm Factory's physics, scoring and debriefs. Run in CI:
//   npx tsx components/kids/games/arm-factory/arm-factory.verify.ts
//
// What it proves:
//  - the grip / weight numbers the game prints are true (μ·N friction, W = m·g);
//  - IK round-trips to FK (both elbow solutions);
//  - Legend is genuinely hard: the starter program slips a heavy part, slowing
//    every move is too slow to pass, and a random speed on each move of the
//    starter program passes well under 5 % of the time and never earns 2★+;
//  - the intended fix (slow only the heavy moves) passes, and a direct
//    pick-to-bin program reaches 3★;
//  - every failed shift is debriefed with the cause that really happened
//    (wrong bin vs floor vs belt vs too slow), never the opposite;
//  - the Cadet helper ghost caps a finish at 2 stars (shared hint rule).

import { G, GRIP_MAX_FORCE, fk, gripNeeded, ik, type Joints } from './kinematics'
import {
  ArmSim,
  HEAVY_KG,
  LEGEND_PARTS,
  LEGEND_PASS,
  LEGEND_TARGET3,
  cadetStars,
  legendShiftReport,
  legendStars,
  tierConfig,
  type ProgStep,
  type Stats,
  type When,
} from './sim'

let failures = 0
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`  ok  ${name}`)
  else {
    failures++
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

// ── Physics the game states as fact ─────────────────────────────────────────
console.log('Physics')
// Two rubber pads, μ = 0.6, squeeze 15.5 N each: friction limit = 2·μ·N.
check('grip limit is 2 × 0.6 × 15.5 = 18.6 N', Math.abs(GRIP_MAX_FORCE - 18.6) < 1e-9)
// Weight W = m·g = 1.6 × 9.81 = 15.7 N, so a still heavy part is held.
check('heavy part weighs 15.7 N and can be held still', Math.abs(HEAVY_KG * G - 15.696) < 1e-3 && HEAVY_KG * G < GRIP_MAX_FORCE)
// Accelerating upward needs m·(g + a): at 2.6 m/s² a 1.6 kg part needs 19.8 N > 18.6 N.
check('upward 2.6 m/s² with 1.6 kg needs 19.8 N (slips)', Math.abs(gripNeeded(1.6, { x: 0, y: 2.6, z: 0 }) - 19.856) < 1e-3)

console.log('Kinematics')
{
  let worst = 0
  const targets = [
    { x: 0.5, y: 0.2, z: 0.1 },
    { x: 0, y: 0.13, z: -0.55 },
    { x: -0.3, y: 0.34, z: 0.5 },
    { x: 0.35, y: 0.5, z: 0.35 },
  ]
  for (const t of targets) {
    for (const s of ik(t).solutions) {
      const p = fk(s.joints as Joints).tip
      worst = Math.max(worst, Math.hypot(p.x - t.x, p.y - t.y, p.z - t.z))
    }
  }
  check('IK solutions round-trip through FK within 0.1 mm', worst < 1e-4, `worst ${worst}`)
}

// ── Legend runs ─────────────────────────────────────────────────────────────
function runLegend(p: ProgStep[]): { sim: ArmSim; t: number; stars: number } {
  const s = new ArmSim(tierConfig(3, 0))
  s.beltOn = true
  s.runProgram(p)
  let n = 0
  while (s.running && !s.done && n < 240 * 400) {
    s.step()
    n++
  }
  const t = s.time - s.runStart
  return { sim: s, t, stars: s.done ? legendStars(s.stats.sorted, t) : 0 }
}

const mv = (pose: Extract<ProgStep, { kind: 'move' }>['pose'], speed: number, when: When = 'always'): ProgStep => ({ kind: 'move', pose, speed, when })
const starter = (sp: number[]): ProgStep[] => [
  { kind: 'wait', when: 'always' },
  mv('abovePick', sp[0]),
  mv('pick', sp[1]),
  { kind: 'grip', when: 'always' },
  mv('abovePick', sp[2]),
  mv('aboveBin', sp[3]),
  { kind: 'release', when: 'always' },
  mv('home', sp[4]),
]

console.log('Legend difficulty')
{
  const r = runLegend(starter([100, 100, 100, 100, 100]))
  check('starter program at full speed slips a heavy part', r.sim.stats.slips > 0 && r.stars === 0)

  const slow = runLegend(starter([30, 30, 30, 30, 30]))
  check(
    `slowing every move to 30 % sorts all 8 but is slower than ${LEGEND_PASS} s, so it does not pass`,
    slow.sim.done && slow.sim.stats.sorted === LEGEND_PARTS && slow.t > LEGEND_PASS && slow.stars === 0,
    `${slow.t.toFixed(1)} s`,
  )

  // Random speed (10–100 %) on each of the five starter moves.
  const SPEEDS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
  let seed = 1
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const N = 300
  let passes = 0
  let twoPlus = 0
  for (let i = 0; i < N; i++) {
    const r2 = runLegend(starter([0, 0, 0, 0, 0].map(() => SPEEDS[Math.floor(rnd() * SPEEDS.length)])))
    if (r2.stars > 0) passes++
    if (r2.stars >= 2) twoPlus++
  }
  check(`random speeds pass under 5 % of the time (${passes}/${N})`, passes / N < 0.05)
  check(`random speeds never reach 2★ (${twoPlus}/${N})`, twoPlus === 0)

  const heavySlow: ProgStep[] = [
    { kind: 'wait', when: 'always' },
    mv('abovePick', 100),
    mv('pick', 100),
    { kind: 'grip', when: 'always' },
    mv('abovePick', 100, 'light'),
    mv('abovePick', 30, 'heavy'),
    mv('aboveBin', 100, 'light'),
    mv('aboveBin', 30, 'heavy'),
    { kind: 'release', when: 'always' },
    mv('home', 100),
  ]
  const hs = runLegend(heavySlow)
  check('slowing only the heavy moves passes', hs.stars >= 1 && hs.sim.stats.slips === 0, `${hs.t.toFixed(1)} s, ${hs.stars}★`)

  const direct: ProgStep[] = [
    { kind: 'wait', when: 'always' },
    mv('pick', 100),
    { kind: 'grip', when: 'always' },
    mv('aboveBin', 100, 'light'),
    mv('aboveBin', 80, 'heavy'),
    { kind: 'release', when: 'always' },
  ]
  const d = runLegend(direct)
  check(`a direct pick-to-bin program reaches 3★ (≤ ${LEGEND_TARGET3} s)`, d.stars === 3, `${d.t.toFixed(1)} s`)
}

// ── Debriefs ────────────────────────────────────────────────────────────────
console.log('Legend debriefs')
{
  const base: Stats = { sorted: 0, wrong: 0, dropped: 0, rejected: 0, bumps: 0, crashes: 0, missedGrips: 0, slips: 0, overloads: 0 }
  const floor = legendShiftReport({ ...base, sorted: 6, dropped: 2 }, 30)
  check('floor drops are called floor drops, not wrong bins', !!floor && /floor/.test(floor.body) && !/wrong bin/.test(floor.body))
  const wrong = legendShiftReport({ ...base, sorted: 7, wrong: 1 }, 30)
  check('wrong bins are called wrong bins, not floor drops', !!wrong && /wrong bin/.test(wrong.body) && !/floor/.test(wrong.body))
  const belt = legendShiftReport({ ...base, sorted: 7, rejected: 1 }, 30)
  check('missed belt parts are named', !!belt && /end of the belt/.test(belt.body) && !/wrong bin|floor/.test(belt.body))
  const slow = legendShiftReport({ ...base, sorted: 8 }, 97)
  check('a full but slow shift says it was too slow', !!slow && /97\.0 s/.test(slow.title) && new RegExp(`${LEGEND_PASS} s`).test(slow.body))
  check('a good shift has no failure report', legendShiftReport({ ...base, sorted: 8 }, 34) === null)

  // A real floor drop: release while hovering above the pick spot, not a bin.
  const dropProg: ProgStep[] = [
    { kind: 'wait', when: 'always' },
    mv('pick', 30),
    { kind: 'grip', when: 'always' },
    mv('abovePick', 20),
    mv('home', 20),
    { kind: 'release', when: 'always' },
  ]
  const r = runLegend(dropProg)
  const rep = legendShiftReport(r.sim.stats, r.t)
  check(
    'a program that lets go outside the bins is debriefed as floor drops',
    r.sim.stats.dropped > 0 && r.sim.stats.wrong === 0 && !!rep && /floor/.test(rep.body) && !/wrong bin/.test(rep.body),
    JSON.stringify(r.sim.stats),
  )
}

console.log('Cadet hint cap')
check('no hint, no mistakes: 3★', cadetStars(0, false) === 3)
check('helper ghost used: capped at 2★', cadetStars(0, true) === 2)
check('helper ghost never raises stars', cadetStars(5, true) === 1)

if (failures) {
  console.error(`\narm-factory verify: ${failures} failure(s)`)
  process.exit(1)
}
console.log('\narm-factory verify: all checks passed')
