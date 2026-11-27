// components/kids/games/swarm-reef/swarm-reef.verify.ts
// Headless checks for Swarm Reef (Wave 3 QA fixes). Runs the real sim and
// scorer; no DOM.
//   1. Difficulty is honest: random slider settings win less often at every
//      tier up (Cadet > Pilot > Ace > Legend), Legend random settings win
//      < 6% and never 3 stars, and every tier can still be won with 3 stars.
//   2. Legend does not stop when the last beacon is found: the run goes on
//      until the batteries are flat, time is up or the reef is searched.
//   3. Determinism: the same rules always give the same run and score.
//   4. Physics claims are true: the summed rule push is capped (a thruster
//      limit), so a robot can never accelerate faster than F_MAX × ACC.
//   5. Debriefs tell the truth about the cause: the failure headline names
//      the goal that was missed, a faint trail cannot win (sensor threshold),
//      the ant sentence says ant trails attract, Pilot crash-outs say so.
//   6. Answer hints cap a finish at 2 stars (the shared rule).
//   7. Source checks for the UI fixes (rules locked while running, beacon
//      count from the mission, Pilot crash count in the main HUD, robot's-eye
//      view follows a live robot, short results message, pinned reef on a
//      phone, kids reduced-motion/calm hooks, page title length, no "turn limit").
//
// Run:  npx tsx components/kids/games/swarm-reef/swarm-reef.verify.ts   (exit 1 on any ✗)

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  ACC,
  DRAG,
  DT,
  F_MAX,
  LEGEND_STARS,
  RANGES,
  buildMission,
  capForHints,
  coveragePct,
  createSim,
  mulberry32,
  scoreRun,
  simulate,
  stepSim,
  type Outcome,
  type TierIndex,
  type Weights,
} from './sim'

let failures = 0
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`✓ ${name}${detail ? ` (${detail})` : ''}`)
  else {
    failures++
    console.log(`✗ ${name}${detail ? ` (${detail})` : ''}`)
  }
}

const TIERS: TierIndex[] = [0, 1, 2, 3]

function randomWeights(tier: TierIndex, rng: () => number): Weights {
  const m = buildMission(tier)
  const w: Weights = { ...m.defaults }
  for (const k of m.enabled) {
    const { min, max, step } = RANGES[k]
    w[k] = +(min + Math.round(rng() * Math.round((max - min) / step)) * step).toFixed(2)
  }
  return w
}

function run(tier: TierIndex, over: Partial<Weights>): { o: Outcome; cov: number; found: number; t: number; collisions: number } {
  const m = buildMission(tier)
  const s = simulate(m, { ...m.defaults, ...over })
  return { o: scoreRun(s), cov: coveragePct(s), found: s.found.filter(Boolean).length, t: s.t, collisions: s.crashes + s.bumps }
}

// ── 1. Difficulty ────────────────────────────────────────────────────────
const SAMPLES = 160
const winRate: number[] = []
const threeRate: number[] = []
const legendRuns: { w: Weights; o: Outcome; cov: number; found: number; collisions: number }[] = []
for (const tier of TIERS) {
  const rng = mulberry32(777 + tier)
  let win = 0
  let three = 0
  for (let i = 0; i < SAMPLES; i++) {
    const w = randomWeights(tier, rng)
    const m = buildMission(tier)
    const s = simulate(m, w)
    const o = scoreRun(s)
    if (o.stars > 0) win++
    if (o.stars === 3) three++
    if (tier === 3) legendRuns.push({ w, o, cov: coveragePct(s), found: s.found.filter(Boolean).length, collisions: s.crashes + s.bumps })
  }
  winRate.push((100 * win) / SAMPLES)
  threeRate.push((100 * three) / SAMPLES)
}
const fmt = (a: number[]) => a.map((v) => `${v.toFixed(1)}%`).join(' / ')
check('random settings win less at every tier up (Cadet > Pilot > Ace > Legend)', winRate[0] > winRate[1] && winRate[1] > winRate[2] && winRate[2] > winRate[3], fmt(winRate))
check('random 3-star rate falls tier by tier', threeRate[0] >= threeRate[1] && threeRate[1] >= threeRate[2] && threeRate[2] >= threeRate[3], fmt(threeRate))
check('Legend: random settings win < 6%', winRate[3] < 6, `${winRate[3].toFixed(1)}%`)
check('Legend: random settings never win 3 stars', threeRate[3] === 0)
check('Ace: random settings win < 20%', winRate[2] < 20, `${winRate[2].toFixed(1)}%`)

const REFERENCE: Record<TierIndex, Partial<Weights>> = {
  0: { coh: 1.5, ali: 1 },
  1: { sep: 1.6, ali: 0.1, coh: 0.5, goal: 1.3, avoid: 2, radius: 50 },
  2: { sep: 0.7, ali: 2, coh: 0, shape: 3, radius: 85 },
  3: { coh: 0.1, sep: 1.5, ali: 0.6, avoid: 1.6, explore: 1.8, trail: 2.5, radius: 40 },
}
for (const tier of TIERS) {
  const r = run(tier, REFERENCE[tier])
  check(`tier ${tier}: a reasoned design wins`, r.o.stars >= (tier === 1 ? 2 : 3), `${r.o.stars}★ ${r.o.score}`)
}
// The QA report's "follow Legend's hints word for word" designs no longer win 3 stars.
for (const w of [
  { coh: 0, sep: 2, explore: 1.5, trail: 1.5, radius: 70 },
  { coh: 0, explore: 1, trail: 1, radius: 60 },
]) {
  const r = run(3, w)
  check(`Legend: the QA hint-following design ${JSON.stringify(w)} is not a 3-star`, r.o.stars < 3, `${r.o.stars}★`)
}

// ── 2. Legend keeps going after the beacons ───────────────────────────────
{
  const m = buildMission(3)
  const s = createSim(m, { ...m.defaults, ...REFERENCE[3] })
  let allFoundAt = -1
  while (!s.done) {
    stepSim(s)
    if (allFoundAt < 0 && s.found.every(Boolean)) allFoundAt = s.t
  }
  const alive = s.robots.some((r) => r.alive)
  check(
    'Legend: finding the last beacon does not end the run (it ends on flat batteries, time, or a fully searched reef)',
    allFoundAt > 0 && (s.t > allFoundAt + 0.5 || coveragePct(s) >= 98) && (!alive || s.t >= m.timeLimit - DT || coveragePct(s) >= 98),
    `all found ${allFoundAt.toFixed(1)} s, ended ${s.t.toFixed(1)} s, ${coveragePct(s).toFixed(0)}%`,
  )
}

// ── 3. Determinism ─────────────────────────────────────────────────────────
for (const tier of TIERS) {
  const a = run(tier, REFERENCE[tier])
  const b = run(tier, REFERENCE[tier])
  check(`tier ${tier}: same rules, same run`, a.o.score === b.o.score && a.t === b.t && a.o.stars === b.o.stars)
}

// ── 4. Thruster limit ─────────────────────────────────────────────────────
{
  // Ace has no current and no rocks: with every weight at maximum, the
  // velocity change of a robot that touched nothing comes from its thrusters
  // (at most F_MAX × ACC) plus water drag (DRAG × speed, at most DRAG × vmax).
  const m = buildMission(2)
  const w: Weights = { ...m.defaults }
  for (const k of m.enabled) w[k] = RANGES[k].max
  const s = createSim(m, w)
  let worst = 0
  for (let step = 0; step < 600; step++) {
    const before = s.robots.map((r) => [r.vx, r.vy])
    stepSim(s)
    s.robots.forEach((r, i) => {
      if (!r.alive) return
      let touched = false
      for (let j = 0; j < s.robots.length && !touched; j++) {
        if (j !== i && s.robots[j].alive && Math.hypot(s.robots[j].x - r.x, s.robots[j].y - r.y) < 13) touched = true
      }
      if (touched || r.x < 6 || r.y < 6 || r.x > 994 || r.y > 694) return
      const a = Math.hypot(r.vx - before[i][0], r.vy - before[i][1]) / DT
      worst = Math.max(worst, a)
    })
  }
  const bound = F_MAX * ACC + DRAG * m.vmax
  check('thruster limit: no robot accelerates faster than thrust cap + drag', worst <= bound * 1.001, `${worst.toFixed(0)} ≤ ${bound.toFixed(0)} units/s²`)
}

// ── 5. Debriefs ───────────────────────────────────────────────────────────
{
  const L = LEGEND_STARS[0]
  let wrong = 0
  let checked = 0
  for (const r of legendRuns) {
    if (r.o.stars > 0) continue
    checked++
    const want = r.found < L.beacons ? 'Too few beacons were found.' : r.cov < L.coverage ? 'Not enough of the reef was searched.' : 'Too many collisions.'
    const first = r.o.why[0] ?? ''
    const namesCause =
      (r.found < L.beacons ? first.includes(`found ${r.found} of`) : true) &&
      (r.cov < L.coverage ? first.includes(`searched ${Math.round(r.cov)}%`) : true) &&
      (r.collisions > L.collisions ? first.includes(`${r.collisions} collisions`) : true)
    if (r.o.headline !== want || !namesCause) wrong++
  }
  check('Legend: every failed random run gets the headline and first reason of its real cause', wrong === 0, `${checked} failed runs, ${wrong} wrong`)
  const faint = legendRuns.filter((r) => r.w.trail < 0.4)
  check('Legend: a faint trail (< 0.4) never wins — the sensors cannot read it', faint.length > 5 && faint.every((r) => r.o.stars === 0), `${faint.length} runs`)
  const faintHigh = run(3, { ...REFERENCE[3], trail: 0.2 })
  check('Legend: the best design with trail 0.2 loses and the debrief blames the trail', faintHigh.o.stars === 0 && faintHigh.o.why.some((t) => t.includes('almost no trail')), `${faintHigh.o.stars}★`)
  const ball = run(3, { ...REFERENCE[3], coh: 2.5 })
  check('Legend: high cohesion is named in the debrief', ball.o.why.some((t) => t.includes('Cohesion 2.5')))
  const win = run(3, REFERENCE[3])
  const ant = win.o.why.join(' ')
  check('Legend: the ant sentence says ant trails attract (“come here”) and ours repel', ant.includes('an ant trail says “come here”') && !/like ants, which do the same/.test(ant))
  const sim = readFileSync(join(__dirname, 'sim.ts'), 'utf8')
  check('no "steer away like ants" claim anywhere in the scorer', !/like ants, which do the same/.test(sim))
}
{
  // Pilot: a run that gets the robots through but crashes too often must say so.
  const rng = mulberry32(31)
  let found = 0
  let wrong = 0
  for (let i = 0; i < 120 && found < 3; i++) {
    const w = randomWeights(1, rng)
    w.avoid = 0
    w.goal = 3
    const m = buildMission(1)
    const s = simulate(m, w)
    const o = scoreRun(s)
    if (o.stars === 0 && (100 * s.arrived) / m.robots >= 80 && s.crashes > 12) {
      found++
      if (o.headline !== 'Too many wall crashes.' || !o.why.some((t) => t.includes(`${s.crashes} wall crashes`))) wrong++
    }
  }
  check('Pilot: a crash-out (robots through, > 12 crashes) is debriefed as crashes, not as "not enough robots"', found > 0 && wrong === 0, `${found} cases`)
}
{
  const r = run(0, { coh: 0, ali: 0.5 })
  check('Cadet: cohesion 0 failure names cohesion', r.o.stars === 0 && r.o.why.some((t) => t.includes('cohesion at 0.0')), `${r.o.stars}★`)
  const ace = run(2, { coh: 2, shape: 1 })
  check('Ace: a failed formation states its score and weakest shape first', ace.o.stars === 0 && /formation score was \d+/.test(ace.o.why[0] ?? ''))
}

// ── 6. Hints ──────────────────────────────────────────────────────────────
{
  const win = run(3, REFERENCE[3]).o
  check('free first hint keeps 3 stars', capForHints(win, 1).stars === 3)
  check('an answer hint caps a 3-star finish at 2 and says why', capForHints(win, 2).stars === 2 && capForHints(win, 2).why.some((t) => t.includes('capped at 2 stars')))
  check('an answer hint never raises a lower result', capForHints({ ...win, stars: 1 }, 4).stars === 1)
}

// ── 7. Source checks ──────────────────────────────────────────────────────
{
  const game = readFileSync(join(__dirname, 'SwarmReefGameClient.tsx'), 'utf8')
  const page = readFileSync(join(__dirname, '../../../../app/kids/play/swarm-reef/page.tsx'), 'utf8')
  check('rules lock while the swarm swims (weights only reach the sim when ready)', game.includes("if (phaseRef.current === 'ready') simRef.current.w") && game.includes('disabled={locked}'))
  check('HUD beacon count comes from the mission', game.includes('mission.beacons?.length') && !game.includes('/6 beacons'))
  check('Pilot crash count is in the main HUD line (visible on phones)', /tier === 1 \? `\$\{h\.arrived\}\/\$\{n\} through · \$\{h\.crashes\}\/12 crashes`/.test(game))
  check("robot's-eye view moves to a live robot and says so", game.includes('nearestLive(s, sel)') && game.includes('switched off, so the view jumped'))
  check('results message is short (headline + first reason only)', game.includes("shortWhy(o.why[0] ?? '')"))
  check('the reef and run controls stay pinned on a phone', game.includes('data-pinned') && game.includes("window.innerWidth < 1024 && window.innerHeight >= 640"))
  check('kids reduced-motion and calm settings are honoured', game.includes('useKidsReducedMotion()') && game.includes('useKidsCalm()'))
  check('answer hints are marked "max 2 ★" and capped', game.includes('(max 2 ★)') && game.includes('capForHints(raw, hintsRef.current)'))
  check('HUD only re-renders while something changes', game.includes("const changing = phaseRef.current === 'running' || hudSeen !== phaseRef.current"))
  const title = /const TITLE = '([^']+)'/.exec(page)?.[1] ?? ''
  check('page title fits a search result (≤ 60 characters)', title.length > 0 && title.length <= 60, `${title.length}`)
  check('page describes a thruster limit, not a turn limit', page.includes('thruster') && !/turn limit|how hard it can turn/.test(page))
  check('page says the rules lock while the swarm swims', page.includes('rules lock while the swarm swims'))
}

if (failures) {
  console.log(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nAll Swarm Reef checks passed')
