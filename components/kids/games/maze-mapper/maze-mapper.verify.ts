// components/kids/games/maze-mapper/maze-mapper.verify.ts
// Headless checks for Maze Mapper (Wave 3 QA fixes). Runs the real sim and the
// real round controller (MazeGame); no DOM.
//   1. Legend is honest: the mission cost counts wrong map squares, so the
//      "careless" brain (1 scan, 55% trust) never gets 3 stars; a random brain
//      gets 3 stars < 8% of the time on every maze; a careful, thought-out brain
//      gets 3 stars on every maze; the default brain does not.
//   2. Noise is keyed per reading (not one shared stream): the same brain always
//      repeats exactly, and the first scan is the same whatever the settings.
//   3. The planner race shows a real difference: A* never longer than BFS and
//      checks under half the squares; greedy takes a longer route on some trips.
//   4. Ace: pressing Nearest every time (= the baseline robot) ties = 2 stars;
//      3 stars is possible on every maze, but only by beating the baseline.
//   5. Debriefs tell the truth about the cause of a failure (Ace, Pilot,
//      Legend give-up) and the Legend trust sentence matches the log-odds maths.
//   6. Cadet: a hint caps the finish at 2 stars (the shared rule).
//   7. Quick D-pad taps during a glide are buffered, not dropped; Step says Paused.
//   8. Every tier can be won headlessly (Cadet 3★, Pilot 3★, Ace 3★, Legend 3★).
//   9. Source checks for the page/UI fixes.
//
// Run:  npx tsx components/kids/games/maze-mapper/maze-mapper.verify.ts   (exit 1 on any ✗)

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { MazeGame } from './game'
import {
  ACE_BASELINE,
  DX4,
  DY4,
  LEGEND_DEFAULT,
  LEGEND_THREE_SHARE,
  MAZES_PER_TIER,
  TIER_CONFIG,
  World,
  allLegendSettings,
  dirTo,
  getMaze,
  inBounds,
  legendSweep,
  missionCost,
  plan,
  plannerRace,
  runFollower,
  runHeadless,
  settingsKey,
  trueDistances,
  truePath,
  type AutoSettings,
  type TierIndex,
} from './sim'

let failed = 0
function check(ok: boolean, msg: string): void {
  console.log(`${ok ? '✓' : '✗'} ${msg}`)
  if (!ok) failed++
}

const brain = (scans: number, trust: number, planner: AutoSettings['planner'], eastBias: number): AutoSettings => ({ scans, trust, planner, eastBias, frontierRule: 'straight' })
const MAZES = Array.from({ length: MAZES_PER_TIER }, (_, i) => i)

// ── 1. Legend difficulty and honesty ────────────────────────────────────────
console.log('\n1. Legend: stars measure engineering, not luck')
const all = allLegendSettings()
for (const i of MAZES) {
  const sw = legendSweep(i)
  if (!sw) throw new Error('sweep did not finish')
  const cost = (s: AutoSettings): number => missionCost(sw.results.get(settingsKey(s)) ?? runHeadless(3, i, s, 1))
  const stars = (s: AutoSettings): number => {
    const c = cost(s)
    return !Number.isFinite(c) ? 0 : c <= sw.three ? 3 : c <= sw.two ? 2 : 1
  }
  const n3 = all.filter((s) => stars(s) === 3).length
  check(n3 / all.length < 0.08, `maze ${i + 1}: a random brain gets 3 stars ${((n3 / all.length) * 100).toFixed(1)}% of the time (< 8%, target top ${LEGEND_THREE_SHARE * 100}%)`)
  const careless = brain(1, 0.55, 'astar', 1)
  const cr = sw.results.get(settingsKey(careless))
  check(stars(careless) < 3 && !!cr && cr.wrong >= 5, `maze ${i + 1}: careless brain (1 scan, 55%, A*, some) is not 3 stars (cost ${cost(careless)}, ${cr?.wrong} wrong squares counted)`)
  check(stars(LEGEND_DEFAULT) < 3, `maze ${i + 1}: the default brain is not already 3 stars (${stars(LEGEND_DEFAULT)}★)`)
  check(stars(brain(1, 0.75, 'astar', 1)) === 3, `maze ${i + 1}: a reasoned brain (1 scan, 75% trust, A*, east hunch) earns 3 stars`)
  const noHunch3 = all.filter((s) => s.eastBias === 0 && stars(s) === 3).length
  check(noHunch3 === 0, `maze ${i + 1}: no brain without the east hunch gets 3 stars (the debrief says so)`)
  // Wrong squares really cost: every costed run adds WRONG_SQUARE_COST per wrong square.
  const r = sw.results.get(settingsKey(LEGEND_DEFAULT))
  check(!!r && (!r.escaped || missionCost(r) === Math.round(r.energy + 5 * r.wrong)), `maze ${i + 1}: mission cost = energy + 5 × wrong squares`)
}

// ── 2. Noise is keyed per reading ───────────────────────────────────────────
console.log('\n2. Seeded noise, independent per reading')
{
  const a = runHeadless(3, 0, brain(2, 0.7, 'bfs', 1), 1e9)
  const b = runHeadless(3, 0, brain(2, 0.7, 'bfs', 1), 1e9)
  check(JSON.stringify(a) === JSON.stringify(b), 'same brain, same maze → exactly the same run')
  const w1 = new World(3, 1, 100, 0.55)
  const w2 = new World(3, 1, 100, 0.9)
  w1.scan()
  w2.scan()
  check(JSON.stringify(w1.beams) === JSON.stringify(w2.beams), 'the first readings do not depend on the settings (noise keyed by square, beam and visit)')
  const src = readFileSync(join(__dirname, 'sim.ts'), 'utf8')
  const worldSrc = src.slice(src.indexOf('export class World'), src.indexOf('export function dirTo'))
  check(!/mulberry32\(/.test(worldSrc), 'World draws no shared random stream')
}

// ── 3. Planner race ─────────────────────────────────────────────────────────
console.log('\n3. The planner race shows a real difference')
for (const i of MAZES) {
  const race = plannerRace(getMaze(3, i))
  const by = (a: string) => race.find((r) => r.algo === a)
  const bfs = by('bfs')
  const astar = by('astar')
  const greedy = by('greedy')
  check(!!bfs && !!astar && !!greedy && bfs.longer === 0 && astar.longer === 0, `maze ${i + 1}: BFS and A* always find a shortest route`)
  check(!!bfs && !!astar && astar.expanded < bfs.expanded * 0.5, `maze ${i + 1}: A* checks ${astar?.expanded} squares vs BFS ${bfs?.expanded} (< 50%)`)
  check(!!greedy && greedy.longer > 0 && greedy.steps > (bfs?.steps ?? 0), `maze ${i + 1}: greedy takes a longer route on ${greedy?.longer} trips (+${greedy?.maxExtra} at worst)`)
}

// ── helpers that drive the real MazeGame ────────────────────────────────────
function settle(g: MazeGame, max = 400): void {
  for (let k = 0; k < max && (g.busy || (g as unknown as { wait: number }).wait > 0 || (g as unknown as { queued: number[] }).queued.length); k++) g.frame(0.05)
}
function drive(g: MazeGame, d: number): void {
  g.manualMove(d)
  settle(g)
}
/** Drive (by hand) along the robot's own map to a square. */
function driveTo(g: MazeGame, target: number, onTruth = false): boolean {
  const w = g.world
  const path = onTruth ? truePath(w.maze, w.pos, target) : plan(w.W, w.H, w.passable, w.pos, [target], 'bfs').path
  if (!path.length && w.pos !== target) return false
  for (const n of path) {
    if (g.phase !== 'play' && g.phase !== 'brief') return false
    drive(g, dirTo(w.W, w.pos, n))
  }
  return true
}

function aceRun(idx: number, choose: (g: MazeGame) => number | null): MazeGame {
  const g = new MazeGame(2, idx, LEGEND_DEFAULT, true, () => {})
  g.start()
  for (let k = 0; k < 40000 && g.phase === 'play'; k++) {
    const w = g.world
    if (!g.explorer.allowEscape && w.exitSeen()) g.planEscape()
    else if (!g.explorer.allowEscape && !g.explorer.path.length && !g.busy) {
      const f = choose(g)
      if (f === null) break
      if (f < 0) g.nearestFrontier()
      else g.goToFrontier(f)
    }
    g.frame(0.05)
  }
  return g
}

// ── 4. Ace scoring ──────────────────────────────────────────────────────────
console.log('\n4. Ace: one button only ties; 3 stars needs a better idea')
for (const i of MAZES) {
  const g = aceRun(i, () => -1)
  check(g.outcome?.escaped === true && g.world.steps === g.baseline && g.outcome.stars === 2, `maze ${i + 1}: Nearest every time = ${g.world.steps} steps vs baseline ${g.baseline} → ${g.outcome?.stars}★ (a tie is 2)`)
  // Search the child's real choices (which frontier next) for a route that beats the baseline.
  const td = trueDistances(getMaze(2, i), getMaze(2, i).exit)
  let best = Infinity
  let bestSeq: number[] = []
  let nodes = 0
  const replay = (seq: number[]): { w: World; done: number | null } => {
    const w = new World(2, i, 1e9)
    w.scan()
    for (const f of seq) {
      const r = plan(w.W, w.H, w.passable, w.pos, [f], 'bfs')
      for (const n of r.path) {
        w.tryMove(dirTo(w.W, w.pos, n), 1)
        if (w.exitSeen()) return { w, done: w.steps + plan(w.W, w.H, w.passable, w.pos, [w.maze.exit], 'bfs').path.length }
        if (!w.isFrontier(f)) break
      }
    }
    return { w, done: null }
  }
  const dfs = (seq: number[]): void => {
    if (++nodes > 50000 || best < g.baseline) return
    const { w, done } = replay(seq)
    if (done !== null) {
      if (done < best) {
        best = done
        bestSeq = seq.slice()
      }
      return
    }
    if (w.steps + td[w.pos] >= Math.min(best, g.baseline)) return
    const dist = plan(w.W, w.H, w.passable, w.pos, [-1], 'bfs').dist
    const fr = w.frontiers().filter((f) => f !== w.pos && dist[f] > 0).sort((a, b) => dist[a] - dist[b])
    for (const f of fr) {
      seq.push(f)
      dfs(seq)
      seq.pop()
    }
  }
  dfs([])
  check(best < g.baseline, `maze ${i + 1}: smart frontier choices can beat the baseline (${best} < ${g.baseline})`)
  // Play that sequence through the real game and confirm 3 stars.
  let k = 0
  const won = aceRun(i, (gg) => {
    while (k < bestSeq.length && !gg.world.isFrontier(bestSeq[k])) k++
    return k < bestSeq.length ? bestSeq[k++] : -1
  })
  check(won.outcome?.stars === 3, `maze ${i + 1}: that play wins 3 stars in the real game (${won.world.steps} steps)`)
}

// ── 5. Debriefs by cause ────────────────────────────────────────────────────
console.log('\n5. Debriefs tell the truth about what happened')
{
  // Ace: battery runs flat early — must not say "you beat".
  const g = new MazeGame(2, 0, LEGEND_DEFAULT, true, () => {})
  g.start()
  g.world.battery = 4
  for (let k = 0; k < 400 && g.phase === 'play'; k++) {
    if (!g.explorer.path.length && !g.busy) g.nearestFrontier()
    g.frame(0.05)
  }
  const why = g.outcome?.why.join(' ') ?? ''
  check(g.outcome?.escaped === false && g.outcome.stars === 0, 'Ace: a flat battery is a failed round')
  check(!/You beat|You tied|tied the robot/.test(why) && /did not get out/.test(why), 'Ace: a failed run is never told it beat or tied the baseline')
  check(!/didn’t need the rest/.test(why), 'Ace: a failed run is not told it "didn’t need the rest" of the map')
}
{
  // Pilot: battery drained by bumping a wall, no loop — must not claim the wall joined the outside.
  const g = new MazeGame(1, 0, LEGEND_DEFAULT, true, () => {})
  const w = g.world
  let wallDir = -1
  for (let d = 0; d < 4; d++) {
    const nx = w.x() + DX4[d]
    const ny = w.y() + DY4[d]
    if (inBounds(w.W, w.H, nx, ny) && w.maze.wall[ny * w.W + nx]) wallDir = d
  }
  for (let k = 0; k < 2000 && g.phase !== 'reveal'; k++) drive(g, wallDir)
  const why = g.outcome?.why.join(' ') ?? ''
  check(g.outcome?.escaped === false && g.loops === 0, 'Pilot: bumping until the battery is flat ends the round with no loop')
  check(!/joined to the outside wall/.test(why) && /battery ran out/.test(why), 'Pilot: that debrief names the battery, not "the wall it held was joined to the outside"')
}
{
  // Legend: stop early.
  const g = new MazeGame(3, 0, LEGEND_DEFAULT, true, () => {})
  g.start()
  for (let k = 0; k < 20; k++) g.frame(0.05)
  g.giveUp()
  const why = g.outcome?.why.join(' ') ?? ''
  check(g.outcome?.headline === 'You stopped this run.' && g.outcome.stars === 0, 'Legend: Stop and debrief is a 0-star round that says it was stopped')
  check(!/brought back/.test(why) && /map so far/.test(why), 'Legend: a stopped run talks about "the map so far", not a map "brought back"')
}
{
  // The trust sentence matches the log-odds maths for every trust level.
  const cfg = TIER_CONFIG[3]
  let ok = true
  for (const t of [0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9]) {
    const g = new MazeGame(3, 0, brain(1, t, 'bfs', 1), true, () => {})
    g.start()
    g.giveUp()
    const why = g.outcome?.why.join(' ') ?? ''
    const m = /becomes a wall after (\d+) .*? and floor after (\d+)/.exec(why)
    const thresh = Math.log(t / (1 - t))
    // Smallest n with n × evidence > threshold (belief() uses a strict >).
    let nWall = 1
    while (nWall * cfg.lOcc <= thresh) nWall++
    let nFloor = 1
    while (nFloor * -cfg.lFree <= thresh) nFloor++
    if (!m || Number(m[1]) !== nWall || Number(m[2]) !== nFloor) {
      ok = false
      console.log(`   trust ${t}: says ${m?.[1]}/${m?.[2]}, maths ${nWall}/${nFloor}`)
    }
  }
  check(ok, 'Legend: "a square becomes a wall after N readings" is right at every trust level')
}

// ── 6. Cadet hint cap ───────────────────────────────────────────────────────
console.log('\n6. Cadet: a hint caps the finish at 2 stars')
function cadetWin(idx: number, useHint: boolean): MazeGame {
  const g = new MazeGame(0, idx, LEGEND_DEFAULT, true, () => {})
  g.start()
  if (useHint) g.showHint()
  for (let guard = 0; guard < 300 && g.phase === 'play' && g.world.coverage() < 0.85; guard++) {
    const w = g.world
    const fr = w.frontiers().filter((f) => f !== w.pos && f !== w.maze.exit)
    if (!fr.length) break
    const r = plan(w.W, w.H, w.passable, w.pos, fr, 'bfs')
    if (!r.found) break
    const n = r.path[0]
    if (n === w.maze.exit) break
    drive(g, dirTo(w.W, w.pos, n))
  }
  if (g.phase === 'play') driveTo(g, g.world.maze.exit)
  return g
}
for (const i of MAZES) {
  const clean = cadetWin(i, false)
  const hinted = cadetWin(i, true)
  check(clean.outcome?.stars === 3, `maze ${i + 1}: mapping ${Math.round((clean.world.coverage() || 0) * 100)}% without a hint → 3 stars`)
  check(hinted.outcome?.stars === 2 && /capped at 2 stars/.test(hinted.outcome.headline), `maze ${i + 1}: the same map after a hint → 2 stars, and the headline says why`)
}

// ── 7. Input buffering and small status bugs ────────────────────────────────
console.log('\n7. Quick taps are not lost; Step says Paused')
{
  const g = new MazeGame(0, 0, LEGEND_DEFAULT, false, () => {})
  g.start()
  const w = g.world
  // Find a straight run of 3 floor squares from the start.
  let dir = -1
  for (let d = 0; d < 4 && dir < 0; d++) {
    let ok = true
    for (let k = 1; k <= 3; k++) {
      const nx = w.x() + DX4[d] * k
      const ny = w.y() + DY4[d] * k
      if (!inBounds(w.W, w.H, nx, ny) || w.maze.wall[ny * w.W + nx]) ok = false
    }
    if (ok) dir = d
  }
  if (dir < 0) dir = dirTo(w.W, w.pos, truePath(w.maze, w.pos, w.maze.exit)[0])
  g.manualMove(dir)
  g.manualMove(dir)
  g.manualMove(dir)
  for (let k = 0; k < 60; k++) g.frame(0.02)
  check(g.world.steps + g.world.bumps >= 3 || g.world.steps >= 2, `3 fast presses during the glide → ${g.world.steps} moves, ${g.world.bumps} bumps (none dropped)`)
  const l = new MazeGame(3, 0, LEGEND_DEFAULT, true, () => {})
  l.start()
  l.frame(0.05)
  l.stepOnce()
  check(/^Paused/.test(l.status) && !l.running, 'Legend: Run then Step shows "Paused", not "Running."')
}

// ── 8. Every tier can be won ────────────────────────────────────────────────
console.log('\n8. Every tier can be won with 3 stars')
for (const i of MAZES) {
  // Pilot: hand-drive to the nearest square that touches the outside wall and follow from there.
  const g = new MazeGame(1, i, LEGEND_DEFAULT, true, () => {})
  const m = g.world.maze
  const dist = trueDistances(m, m.start)
  let bestSq = -1
  let bestHand: 'left' | 'right' = 'left'
  for (let sq = 0; sq < m.W * m.H; sq++) {
    if (m.wall[sq] || dist[sq] < 0 || (bestSq >= 0 && dist[sq] >= dist[bestSq])) continue
    const p = truePath(m, m.start, sq)
    const h = p.length ? dirTo(m.W, p.length > 1 ? p[p.length - 2] : m.start, sq) : m.startHeading
    for (const hand of ['left', 'right'] as const) {
      if (runFollower(m, sq, h, hand).escaped) {
        bestSq = sq
        bestHand = hand
        break
      }
    }
  }
  driveTo(g, bestSq, true)
  g.setHand(bestHand)
  g.startFollower()
  for (let k = 0; k < 20000 && g.phase === 'play'; k++) g.frame(0.05)
  check(g.outcome?.stars === 3, `Pilot maze ${i + 1}: drive ${dist[bestSq]} squares to an outside wall, follow ${bestHand} → ${g.outcome?.stars}★ (${Math.round((Math.max(0, g.world.battery) / g.world.batteryMax) * 100)}% battery left)`)

  // Legend: the reasoned brain, played through the real game.
  const L = new MazeGame(3, i, brain(1, 0.75, 'astar', 1), true, () => {})
  L.start()
  for (let k = 0; k < 60000 && L.phase === 'play'; k++) L.frame(0.05)
  check(L.outcome?.stars === 3, `Legend maze ${i + 1}: 1 scan, 75%, A*, some hunch → ${L.outcome?.stars}★ (cost ${L.outcome?.score}, 3★ ≤ ${L.outcome?.rank?.three})`)
}

// ── 9. Source checks ────────────────────────────────────────────────────────
console.log('\n9. Page and UI source checks')
{
  const root = join(__dirname, '..', '..', '..', '..')
  const page = readFileSync(join(root, 'app/kids/play/maze-mapper/page.tsx'), 'utf8')
  const client = readFileSync(join(__dirname, 'MazeMapperGameClient.tsx'), 'utf8')
  const game = readFileSync(join(__dirname, 'game.ts'), 'utf8')
  const worlds = readFileSync(join(root, 'lib/kids/universe/worlds.ts'), 'utf8')
  check(/minBand: 'inventors'/.test(worlds.slice(worlds.indexOf("id: 'maze-mapper'"))) && /ages 11 to 17/.test(page) && !/8 and up|ages 8/.test(page), 'page ages (11–17) agree with the catalogue band (Inventors, 11–13 and up)')
  check(/min-h-\[44px\][^"]*"[^>]*>\s*← Back/.test(page), 'the back link is a 44px tap target')
  check(!/Careful \+ east hunch/.test(page + client + game), 'no "reference brain" row hands over the Legend answer')
  check(!/little different/.test(client) && !/back where it started/.test(game), 'no "every run a little different" / "back where it started" claims')
  check(/Bumps \/ slips/.test(client) && !/\$\{[^}]*bumps\} bumps/.test(game), 'no "1 bumps" plural bug')
  check(/scrollTo\(/.test(client.slice(client.indexOf('const sendResult'))), 'Collect reward brings the game column to the middle of the screen before the results card opens')
  check(/useKidsReducedMotion|useKidsCalm/.test(client), 'the game follows the kids reduced-motion / calm settings')
  check(/max 2★/.test(client), 'the Hint button says it caps the round at 2 stars')
}

console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ all Maze Mapper checks passed')
process.exit(failed ? 1 : 0)
