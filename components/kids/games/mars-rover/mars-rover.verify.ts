// components/kids/games/mars-rover/mars-rover.verify.ts
// Pure checks for Mars Rover Command (no DOM). Run: npx tsx components/kids/games/mars-rover/mars-rover.verify.ts
//
// What it proves (independent QA, Wave 3):
//  1. Every Cadet, Pilot and Ace map has a one-plan solution within the command
//     limit, so ★★★ is always reachable.
//  2. Ace really needs the onboard rules: the orbital-map route with no rules
//     wins in one plan on at most 2 of 6 maps, with Hazard avoidance + Visual
//     odometry on at least 4 of 6.
//  3. Legend par (LEGEND_PAR) is exactly what the solver finds today, ★★★ is
//     reachable on every map WITHOUT the invisible AEGIS bonus rocks, and the
//     systems the tier teaches decide the result: no plan that ignores the
//     battery (no dawn Wait and no Power guard), and none without Visual
//     odometry, reaches ★★★.
//  4. A random setting does not win: random sensible-looking Legend plans
//     reach ★★★ under 8% of the time and any ★ under 40%; random button
//     presses win under 5% on every tier.
//  5. The debrief tells the truth for each failure cause (manual drive into a
//     dune vs AutoNav fooled by slip, flat battery, science on the wrong
//     square), and a stuck Legend rover's queued data still reaches Earth.
//  6. Turn merging in the plan builder wraps round a full circle.

import { buildMap, DIRS, idx, inside, legendStarLines, LEGEND_PAR, MAPS_PER_TIER, mulberry32, TIERS, type MarsMap, type RuleId, type TierIndex } from './terrain'
import { addCmd, createSim, earthBestPose, evaluate, isOver, runToEnd, sendUplink, tick, type Cmd, type Outcome, type Sim } from './sim'

let failures = 0
function check(ok: boolean, msg: string) {
  if (ok) console.log(`  ok   ${msg}`)
  else {
    failures++
    console.log(`  FAIL ${msg}`)
  }
}

/** Run one plan to its end exactly as the game does (Legend: then End sol). */
function runPlan(sim: Sim, cmds: Cmd[], rules: RuleId[]): void {
  sendUplink(sim, cmds, rules)
  let n = 0
  while (!isOver(sim) && !sim.earthKnowsIdle && n++ < 200000) tick(sim)
}

function finishLegend(sim: Sim): Outcome {
  if (!isOver(sim)) runToEnd(sim)
  sim.ended = true
  return evaluate(sim)
}

function playLegend(mapNo: number, cmds: Cmd[], rules: RuleId[]): Outcome {
  const sim = createSim(3, buildMap(3, mapNo))
  runPlan(sim, cmds, rules)
  return finishLegend(sim)
}

/** Fewest-command plan (turns + drives) from a pose to a cell, using what Earth knows. */
function planTo(m: MarsMap, from: { x: number; y: number; h: number }, goal: { x: number; y: number }, tier: TierIndex, known: Set<number>): Cmd[] | null {
  const t = TIERS[tier]
  const safe = (x: number, y: number) => {
    if (!inside(m, x, y)) return false
    const i = idx(m, x, y)
    return !m.rock[i] && !m.steep[i] && !m.dune[i] && !known.has(i)
  }
  const key = (x: number, y: number, h: number) => (y * m.W + x) * 8 + h
  const prev = new Map<number, { k: number; cmd: Cmd }>()
  const startK = key(from.x, from.y, from.h)
  prev.set(startK, { k: -1, cmd: { k: 'sci' } })
  let q = [startK]
  while (q.length) {
    const next: number[] = []
    for (const k of q) {
      const h = k % 8
      const c = (k - h) / 8
      const x = c % m.W
      const y = (c - x) / m.W
      if (x === goal.x && y === goal.y) {
        const out: Cmd[] = []
        for (let cur = k; cur !== startK; ) {
          const p = prev.get(cur)
          if (!p) break
          out.push(p.cmd)
          cur = p.k
        }
        return out.reverse()
      }
      for (let d = 1; d < 8; d++) {
        if (t.turn90Only && d % 2) continue
        const nh = (h + d) % 8
        const nk = key(x, y, nh)
        if (!prev.has(nk)) {
          prev.set(nk, { k, cmd: { k: 'turn', d: d > 4 ? d - 8 : d } })
          next.push(nk)
        }
      }
      let cx = x
      let cy = y
      for (let n = 1; n <= 9; n++) {
        cx += DIRS[h][0]
        cy += DIRS[h][1]
        if (!safe(cx, cy)) break
        const nk = key(cx, cy, h)
        if (!prev.has(nk)) {
          prev.set(nk, { k, cmd: { k: 'fwd', n } })
          next.push(nk)
        }
      }
    }
    q = next
  }
  return null
}

/** A careful child on Cadet–Ace: plan with what Earth knows, re-plan after news. */
function playSmart(tier: TierIndex, mapNo: number, rules: RuleId[], maxPlans: number): { o: Outcome; plans: number; firstFits: boolean } {
  const m = buildMap(tier, mapNo)
  const sim = createSim(tier, m)
  let firstFits = true
  for (let k = 0; k < maxPlans && !isOver(sim); k++) {
    const pose = earthBestPose(sim)
    const route = planTo(m, pose, m.targets[0], tier, sim.knownRocks)
    if (!route) break
    const cmds = [...route, { k: 'sci' } as Cmd]
    if (k === 0) firstFits = cmds.length <= TIERS[tier].maxCmds
    runPlan(sim, cmds.slice(0, TIERS[tier].maxCmds), rules)
  }
  let n = 0
  while (!isOver(sim) && n++ < 200000 && !sim.earthKnowsIdle) tick(sim)
  sim.ended = true
  return { o: evaluate(sim), plans: sim.uplinks.length, firstFits }
}

function perms<T>(a: T[]): T[][] {
  if (a.length <= 1) return [a]
  return a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p]))
}
function subsets<T>(a: T[]): T[][] {
  return a.reduce<T[][]>((acc, x) => acc.concat(acc.map((s) => [...s, x])), [[]])
}
function legendPlan(order: number[], waits: number): Cmd[] {
  const cmds: Cmd[] = []
  for (let k = 0; k < waits; k++) cmds.push({ k: 'wait', min: 30 })
  for (const t of order) cmds.push({ k: 'goto', target: t }, { k: 'sci' })
  return cmds
}

// ── 1 + 2: Cadet, Pilot, Ace ────────────────────────────────────────────────
console.log('Cadet / Pilot / Ace')
for (const tier of [0, 1, 2] as TierIndex[]) {
  const rules: RuleId[] = tier === 2 ? ['haz', 'vo'] : []
  let oneplan = 0
  let wins = 0
  for (let mapNo = 0; mapNo < MAPS_PER_TIER; mapNo++) {
    const r = playSmart(tier, mapNo, rules, 4)
    check(r.firstFits, `${TIERS[tier].name} map ${mapNo + 1}: a one-plan route fits in ${TIERS[tier].maxCmds} commands`)
    if (r.o.won) wins++
    if (r.o.won && r.plans === 1) oneplan++
  }
  check(wins === MAPS_PER_TIER, `${TIERS[tier].name}: a careful player wins all ${MAPS_PER_TIER} maps (${wins})`)
  if (tier < 2) check(oneplan === MAPS_PER_TIER, `${TIERS[tier].name}: the orbital route wins in ONE plan on every map (${oneplan}/${MAPS_PER_TIER})`)
  else check(oneplan >= 4, `Ace with Hazard avoidance + Visual odometry wins in one plan on ${oneplan}/6 maps (need ≥ 4)`)
}
{
  let noRules = 0
  for (let mapNo = 0; mapNo < MAPS_PER_TIER; mapNo++) {
    const r = playSmart(2, mapNo, [], 1)
    if (r.o.won) noRules++
  }
  check(noRules <= 2, `Ace needs its rules: the same route with NO rules wins in one plan on only ${noRules}/6 maps (max 2)`)
}

// ── 3: Legend par, AEGIS, and the systems that decide ─────────────────────────
console.log('Legend par and difficulty')
const ALL_RULES: RuleId[] = ['haz', 'vo', 'power', 'aegis', 'scifirst']
for (let mapNo = 0; mapNo < MAPS_PER_TIER; mapNo++) {
  const m = buildMap(3, mapNo)
  const ids = m.targets.map((t) => t.id)
  const orders = subsets(ids)
    .filter((s) => s.length >= 2)
    .flatMap((s) => perms(s))
  let best = 0
  let bestNoAegis = 0
  let bestNoWait = 0
  let bestNoVo = 0
  for (const order of orders)
    for (const rs of subsets(ALL_RULES))
      for (let w = 0; w <= 4; w++) {
        const o = playLegend(mapNo, legendPlan(order, w), rs)
        best = Math.max(best, o.score)
        if (!rs.includes('aegis')) bestNoAegis = Math.max(bestNoAegis, o.score)
        if (w === 0 && !rs.includes('power')) bestNoWait = Math.max(bestNoWait, o.score)
        if (!rs.includes('vo')) bestNoVo = Math.max(bestNoVo, o.score)
      }
  const lines = legendStarLines(mapNo)
  check(best === LEGEND_PAR[mapNo], `Legend map ${mapNo + 1}: solver best ${best} = LEGEND_PAR ${LEGEND_PAR[mapNo]}`)
  check(bestNoAegis >= lines.s3, `Legend map ${mapNo + 1}: ★★★ (${lines.s3}) reachable without the hidden AEGIS rocks (${bestNoAegis})`)
  check(bestNoWait < lines.s3, `Legend map ${mapNo + 1}: ignoring the battery (no Wait, no Power guard) cannot reach ★★★ (best ${bestNoWait} < ${lines.s3})`)
  check(bestNoVo < lines.s3, `Legend map ${mapNo + 1}: without Visual odometry ★★★ is out of reach (best ${bestNoVo} < ${lines.s3})`)
}

// ── 4: a random setting does not win ──────────────────────────────────────────
console.log('Random settings')
{
  const rnd = mulberry32(20261127)
  const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)]
  let n = 0
  let three = 0
  let any = 0
  for (let mapNo = 0; mapNo < MAPS_PER_TIER; mapNo++)
    for (let k = 0; k < 250; k++) {
      const count = 1 + Math.floor(rnd() * 4)
      const order = [0, 1, 2, 3].sort(() => rnd() - 0.5).slice(0, count)
      const rs = ALL_RULES.filter(() => rnd() < 0.5)
      const o = playLegend(mapNo, legendPlan(order, Math.floor(rnd() * 5)), rs)
      n++
      if (o.stars === 3) three++
      if (o.stars > 0) any++
    }
  check(three / n < 0.08, `Legend: random sensible plans reach ★★★ ${((100 * three) / n).toFixed(1)}% of the time (< 8%)`)
  check(any / n < 0.4, `Legend: random sensible plans win at all ${((100 * any) / n).toFixed(1)}% of the time (< 40%)`)

  for (const tier of [0, 1, 2, 3] as TierIndex[]) {
    const cfg = TIERS[tier]
    let wins = 0
    let runs = 0
    for (let mapNo = 0; mapNo < MAPS_PER_TIER; mapNo++)
      for (let k = 0; k < 60; k++) {
        const pool: (() => Cmd)[] = [
          () => ({ k: 'fwd', n: 1 + Math.floor(rnd() * 9) }),
          () => ({ k: 'turn', d: (cfg.turn90Only ? 2 : 1) * (rnd() < 0.5 ? -1 : 1) }),
          () => ({ k: 'sci' }),
        ]
        if (cfg.legend) pool.push(() => ({ k: 'photo' }), () => ({ k: 'goto', target: Math.floor(rnd() * 4) }), () => ({ k: 'wait', min: 30 }))
        let plan: Cmd[] = []
        const len = 1 + Math.floor(rnd() * cfg.maxCmds)
        for (let j = 0; j < len; j++) plan = addCmd(plan, pick(pool)(), cfg.maxCmds)
        const rs = cfg.rules.filter(() => rnd() < 0.5)
        const sim = createSim(tier, buildMap(tier, mapNo))
        runPlan(sim, plan, rs)
        const o = cfg.legend ? finishLegend(sim) : evaluate(sim)
        runs++
        if (o.won) wins++
      }
    check(wins / runs < 0.05, `${cfg.name}: random button presses win ${((100 * wins) / runs).toFixed(1)}% (< 5%)`)
  }
}

// ── 5: the debrief tells the truth ───────────────────────────────────────────
console.log('Debriefs')
/** Find a dune next to a free cell the rover can be driven to. */
function duneScenario(tier: TierIndex, mapNo: number, prefix: Cmd[], rules: RuleId[]): { sim: Sim; o: Outcome } | null {
  const m = buildMap(tier, mapNo)
  for (let i = 0; i < m.W * m.H; i++) {
    if (!m.dune[i]) continue
    const dx = i % m.W
    const dy = (i - dx) / m.W
    for (let h = 0; h < 8; h += tier === 0 ? 2 : 1) {
      const fx = dx - DIRS[h][0]
      const fy = dy - DIRS[h][1]
      if (!inside(m, fx, fy)) continue
      const sim = createSim(tier, m)
      runPlan(sim, prefix, rules)
      if (isOver(sim)) continue
      const pose = earthBestPose(sim)
      const route = planTo(m, pose, { x: fx, y: fy }, tier, sim.knownRocks)
      if (!route) continue
      // Face the dune and drive into it by hand.
      const d = (h - (route.length ? endHeading(pose.h, route) : pose.h) + 8) % 8
      const cmds = [...route]
      if (d) cmds.push({ k: 'turn', d: d > 4 ? d - 8 : d })
      cmds.push({ k: 'fwd', n: 1 })
      runPlan(sim, cmds, rules)
      if (sim.rover.status !== 'stuck') continue
      const o = sim.tier.legend ? finishLegend(sim) : ((sim.ended = true), evaluate(sim))
      return { sim, o }
    }
  }
  return null
}
function endHeading(h0: number, cmds: Cmd[]): number {
  let h = h0
  for (const c of cmds) if (c.k === 'turn') h = (h + c.d + 8) % 8
  return h
}

{
  // Pilot: drive into a dune by hand.
  const s = duneScenario(1, 0, [], [])
  check(!!s, 'Pilot: found a hand-driven dune scenario')
  if (s) {
    check(s.sim.stats.stuckBy === 'drive' && !s.o.won, 'Pilot dune: stuck by a ▲ drive, round lost')
    check(/▲ drive goes exactly where you point it/.test(s.o.message) && !/AutoNav/.test(s.o.message), 'Pilot dune: debrief blames the hand drive, not AutoNav')
  }
}
{
  // Legend (QA repro): sample a target with AutoNav, then drive into a dune by
  // hand. The rover's radio still works, so the queued sample must reach Earth.
  let done = false
  for (let mapNo = 0; mapNo < MAPS_PER_TIER && !done; mapNo++)
    for (let t = 0; t < 4 && !done; t++) {
      const s = duneScenario(3, mapNo, [{ k: 'goto', target: t }, { k: 'sci' }], ['haz', 'vo'])
      if (!s || s.sim.rover.sampled.size === 0) continue
      done = true
      check(s.sim.stats.stuckBy === 'drive', `Legend map ${mapNo + 1}: stuck by a hand drive after sampling target ${t + 1}`)
      check(s.sim.t >= s.sim.tier.timeLimit - 1e-6, 'Legend stuck: the sol runs on to its end (relay passes keep working)')
      check(s.sim.scienceAtEarth.has(t), 'Legend stuck: the sample taken before getting stuck reached Earth')
      check(/radio/.test(s.o.message + s.o.why.join(' ')), 'Legend stuck: the debrief says the radio still worked')
      check(!/AutoNav steers round/.test(s.o.message + s.o.why.join(' ')), 'Legend stuck: the debrief does not blame AutoNav for a hand drive')
    }
  check(done, 'Legend: found a sample-then-dune scenario')
}
{
  // AutoNav fooled by slip: search Legend plans without Visual odometry until
  // one ends in a dune; its debrief must name position error, not hand drives.
  let found: { sim: Sim; o: Outcome } | null = null
  for (let mapNo = 0; mapNo < MAPS_PER_TIER && !found; mapNo++)
    for (const order of perms([0, 1, 2, 3])) {
      for (const rs of [[], ['haz'], ['aegis'], ['haz', 'aegis']] as RuleId[][]) {
        const sim = createSim(3, buildMap(3, mapNo))
        runPlan(sim, legendPlan(order, 2), rs)
        if (sim.rover.status === 'stuck') {
          found = { sim, o: finishLegend(sim) }
          break
        }
      }
      if (found) break
    }
  if (found) {
    const text = found.o.message + ' ' + found.o.why.join(' ')
    check(found.sim.stats.stuckBy === 'autonav' || found.sim.stats.stuckBy === 'detour', 'AutoNav dune: recorded as AutoNav/detour')
    check(/THINKS it is/.test(text) && !/▲ drive goes exactly/.test(text), 'AutoNav dune: debrief explains the position error, not a hand drive')
  } else console.log('  note no AutoNav-into-dune case exists on these maps (nothing to check)')
}
{
  // Flat battery: drive hard at dawn with photos and no rules.
  let dead: Outcome | null = null
  for (let mapNo = 0; mapNo < MAPS_PER_TIER && !dead; mapNo++) {
    const cmds: Cmd[] = []
    for (const t of [3, 2, 1, 0]) cmds.push({ k: 'goto', target: t }, { k: 'sci' }, { k: 'photo' })
    const sim = createSim(3, buildMap(3, mapNo))
    runPlan(sim, cmds, ['vo'])
    const o = finishLegend(sim)
    if (sim.rover.status === 'dead') dead = o
  }
  check(!!dead, 'Legend: a dawn sprint can flatten the battery')
  if (dead) check(dead.stars === 0 && /safe mode/.test(dead.message) && dead.why.some((w) => /heaters/.test(w)), 'Flat battery: 0★, safe-mode message, heaters + weak Sun explained')
}
{
  // Science on the wrong square (Cadet): lost, and told why.
  const sim = createSim(0, buildMap(0, 0))
  runPlan(sim, [{ k: 'fwd', n: 1 }, { k: 'sci' }], [])
  while (!isOver(sim)) {
    if (sim.earthKnowsIdle) sim.t = sim.tier.timeLimit
    else tick(sim)
  }
  const o = evaluate(sim)
  check(!o.won && o.why.some((w) => /ON the target square/.test(w)), 'Cadet: Science off-target loses and says it must be ON the target')
}
{
  // One target home in Legend is not a win, and the message says what ★ needs.
  const m = buildMap(3, 0)
  const near = [...m.targets].sort((a, b) => a.value - b.value)[0]
  const o = playLegend(0, [{ k: 'wait', min: 30 }, { k: 'goto', target: near.id }, { k: 'sci' }], ['vo'])
  check(o.stars === 0 && /needs \d+ points/.test(o.message), `Legend: one ${near.value}-pt target home is 0★ and the message says what ★ needs (${o.score} pts)`)
}

// ── 6: turn merging ─────────────────────────────────────────────────────────
console.log('Plan builder')
{
  let p: Cmd[] = []
  for (let k = 0; k < 5; k++) p = addCmd(p, { k: 'turn', d: 2 }, 12)
  check(p.length === 1 && p[0].k === 'turn' && p[0].d === 2, 'Five right 90° turns merge into one right 90° turn')
  p = []
  for (let k = 0; k < 4; k++) p = addCmd(p, { k: 'turn', d: 2 }, 12)
  check(p.length === 0, 'A full circle of turns disappears')
  p = addCmd(addCmd([], { k: 'fwd', n: 5 }, 12), { k: 'fwd', n: 4 }, 12)
  check(p.length === 1 && p[0].k === 'fwd' && p[0].n === 9, 'Drives in a row merge up to 9 squares')
  let full: Cmd[] = []
  for (let k = 0; k < 20; k++) full = addCmd(full, k % 2 ? { k: 'sci' } : { k: 'fwd', n: 1 }, 12)
  check(full.length === 12, 'The plan stops at the command limit')
}

if (failures) {
  console.log(`\n${failures} check(s) FAILED`)
  process.exit(1)
}
console.log('\nmars-rover verify: all checks passed')
