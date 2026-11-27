// components/kids/games/maze-mapper/game.ts
// The Maze Mapper round controller: owns the World, the Explorer, the
// animation state and the scoring, and tells the React panel what changed.
// No React and no DOM here, so the rules can be read (and tested) on their own.

import { playSound } from '@/lib/kids-audio'
import {
  ACE_BASELINE,
  BELIEF_WALL,
  DX4,
  DY4,
  Explorer,
  LEGEND_BIASES,
  LEGEND_PLANNERS,
  LEGEND_SCANS,
  LEGEND_THREE_SHARE,
  LEGEND_TRUSTS,
  WRONG_SQUARE_COST,
  batteryFor,
  followerDir,
  handWallComp,
  legendSweep,
  missionCost,
  pilotStats,
  plan,
  plannerRace,
  runHeadless,
  settingsKey,
  summarize,
  trueDistances,
  truePath,
  World,
  type AutoSettings,
  type LegendSweep,
  type PlanResult,
  type PlannerId,
  type RaceRow,
  type TickResult,
  type TierIndex,
} from './sim'
import { Fx, type RevealMode, type SceneState, type Wave } from './render'

export type Phase = 'brief' | 'play' | 'reveal'

/** Legend: what one changed setting would have done on the same maze. */
export interface TryRow {
  name: string
  mine?: boolean
  escaped: boolean
  cost: number
  energy: number
  wrong: number
  stars: number
}

export const PLANNER_NAMES: Record<PlannerId, string> = { bfs: 'BFS', astar: 'A*', greedy: 'Greedy' }

export interface Outcome {
  escaped: boolean
  stars: number
  score: number
  scoreLabel: string
  lowerIsBetter: boolean
  headline: string
  why: string[]
  /** Legend: your brain and every one-setting change of it. */
  tries: TryRow[] | null
  /** Legend: the same long trips planned by all three planners. */
  race: RaceRow[] | null
  /** Legend: how your brain ranks among every brain the panel can build. */
  rank: { beats: number; of: number; best: number; three: number; two: number } | null
}

export interface Snapshot {
  phase: Phase
  battery: number
  batteryMax: number
  steps: number
  coverage: number
  bumps: number
  slips: number
  compute: number
  expanded: number
  exitSeen: boolean
  manualLeft: number
  loops: number
  frontierCount: number
  running: boolean
  autoExplore: boolean
  escapeAllowed: boolean
  hand: 'left' | 'right'
  following: boolean
  lastPlan: { algo: string; expanded: number; length: number } | null
  status: string
  outcome: Outcome | null
  baseline: number
  optimal: number
  /** Legend: mission cost needed for 3 stars on this maze (null until worked out). */
  legendThree: number | null
}

const STEP_SEC = 0.17

export class MazeGame {
  readonly tier: TierIndex
  mazeIdx: number
  world: World
  explorer: Explorer
  fx: Fx
  scene: SceneState
  phase: Phase = 'brief'
  running = false
  speed = 1
  settings: AutoSettings
  hand: 'left' | 'right' = 'left'
  following = false
  loops = 0
  manualUsed = 0
  manualCap: number
  status = ''
  outcome: Outcome | null = null
  baseline = 0
  optimal = 0
  lastPlan: { algo: string; expanded: number; length: number } | null = null
  /** Cadet: hints shown this round. A hint does the finding for you, so it caps the finish at 2 stars (the shared rule). */
  hintsUsed = 0
  private reduced: boolean
  /** Kids calm mode: no particles, no screen shake (the glide still animates). */
  private calm = false
  private anim: { fx: number; fy: number; tx: number; ty: number; age: number; dur: number } | null = null
  private wait = 0
  private followSeen = new Set<number>()
  private followComp = new Map<number, number>()
  private milestones = new Set<number>()
  private exitAnnounced = false
  private onChange: () => void
  private lastClick = 0
  /** Hand-drive presses that arrived during a glide (at most 2), so quick taps are not lost. */
  private queued: number[] = []
  private sweep: LegendSweep | null = null

  constructor(tier: TierIndex, mazeIdx: number, settings: AutoSettings, reduced: boolean, onChange: () => void) {
    this.tier = tier
    this.mazeIdx = mazeIdx
    this.settings = settings
    this.reduced = reduced
    this.onChange = onChange
    this.fx = new Fx(reduced)
    this.world = this.makeWorld()
    this.explorer = this.makeExplorer()
    this.manualCap = tier === 1 ? pilotStats(mazeIdx).reach + 10 : Infinity
    this.scene = this.freshScene()
    this.computeRefs()
    this.status = this.briefStatus()
  }

  /** Follow the kids Settings live: reduced motion (device OR kids setting) and calm. */
  setMotion(reduced: boolean, calm: boolean): void {
    this.reduced = reduced
    this.calm = calm
    this.fx.setQuiet(reduced || calm)
    this.scene.reduced = reduced
    if (reduced || calm) this.scene.shake = 0
  }

  private makeWorld(): World {
    const w = new World(this.tier, this.mazeIdx, batteryFor(this.tier, this.mazeIdx), this.tier === 3 ? this.settings.trust : undefined)
    w.scan()
    w.newlyKnown = []
    return w
  }

  private makeExplorer(): Explorer {
    const ex = new Explorer(this.tier === 3 ? this.settings : ACE_BASELINE)
    if (this.tier === 2) {
      ex.autoExplore = false
      ex.allowEscape = false
    }
    return ex
  }

  private freshScene(): SceneState {
    const w = this.world
    return {
      t: 0,
      rx: w.x(),
      ry: w.y(),
      angle: (w.heading - 1) * (Math.PI / 2),
      beamAge: 0,
      wave: null,
      path: [],
      target: -1,
      frontiers: this.tier === 2 ? w.frontiers() : null,
      selected: -1,
      hint: null,
      island: null,
      reveal: 'off',
      optimal: null,
      showProb: this.tier === 3,
      shake: 0,
      bumpAge: 9,
      reduced: this.reduced,
    }
  }

  private computeRefs(): void {
    const m = this.world.maze
    this.optimal = trueDistances(m, m.start)[m.exit]
    this.baseline = this.tier === 2 ? runHeadless(2, this.mazeIdx, ACE_BASELINE, 1e9).steps : 0
    this.sweep = this.tier === 3 ? legendSweep(this.mazeIdx, 0) : null
  }

  private briefStatus(): string {
    return ['Drive with the arrows. Map the maze, then find the green exit.', 'Pick a hand and start the wall-follower.', 'Choose where to explore: tap a glowing frontier or press Nearest.', 'Design the robot’s brain, then press Run.'][this.tier]
  }

  /** Switch maze (brief phase only). */
  setMaze(idx: number): void {
    this.mazeIdx = idx
    this.reset()
  }

  setSettings(s: AutoSettings): void {
    this.settings = s
    if (this.phase === 'brief') this.reset()
  }

  /** Back to the start of the same maze. */
  reset(): void {
    this.world = this.makeWorld()
    this.explorer = this.makeExplorer()
    this.manualCap = this.tier === 1 ? pilotStats(this.mazeIdx).reach + 10 : Infinity
    this.scene = this.freshScene()
    this.phase = 'brief'
    this.running = false
    this.following = false
    this.loops = 0
    this.manualUsed = 0
    this.hintsUsed = 0
    this.outcome = null
    this.lastPlan = null
    this.anim = null
    this.queued = []
    this.wait = 0
    this.followSeen.clear()
    this.followComp.clear()
    this.milestones.clear()
    this.exitAnnounced = false
    this.computeRefs()
    this.status = this.briefStatus()
    this.onChange()
  }

  start(): void {
    if (this.phase !== 'brief') return
    this.phase = 'play'
    if (this.tier === 3) {
      this.running = true
      this.status = 'Exploring… watch the map firm up as readings agree.'
    } else if (this.tier === 2) {
      this.running = true
      this.status = 'Tap a glowing frontier (or press Nearest) to send the robot there.'
    } else {
      this.status = this.tier === 0 ? 'Drive! Each move fires the sensor beams.' : 'Choose left or right hand, then start the wall-follower.'
    }
    playSound('click')
    this.onChange()
  }

  get busy(): boolean {
    return this.anim !== null || (this.scene.wave !== null && this.scene.wave.age < this.scene.wave.dur && this.scene.wave.escape)
  }

  snapshot(): Snapshot {
    const w = this.world
    return {
      phase: this.phase,
      battery: Math.max(0, w.battery),
      batteryMax: w.batteryMax,
      steps: w.steps,
      coverage: w.coverage(),
      bumps: w.bumps,
      slips: w.slips,
      compute: w.computeEnergy,
      expanded: w.expandedTotal,
      exitSeen: w.exitSeen(),
      manualLeft: Number.isFinite(this.manualCap) ? Math.max(0, this.manualCap - this.manualUsed) : -1,
      loops: this.loops,
      frontierCount: this.scene.frontiers ? this.scene.frontiers.length : 0,
      running: this.running,
      autoExplore: this.explorer.autoExplore,
      escapeAllowed: this.explorer.allowEscape,
      hand: this.hand,
      following: this.following,
      lastPlan: this.lastPlan,
      status: this.status,
      outcome: this.outcome,
      baseline: this.baseline,
      optimal: this.optimal,
      legendThree: this.sweep ? this.sweep.three : null,
    }
  }

  // ── Child actions ──────────────────────────────────────────────────────────

  manualMove(d: number): void {
    if (this.phase === 'brief') this.start()
    if (this.phase !== 'play' || this.tier >= 2) return
    if (this.busy || this.wait > 0) {
      // Remember the press; it runs as soon as the robot finishes its glide.
      if (this.queued.length < 2) this.queued.push(d)
      return
    }
    if (this.following) this.stopFollower()
    if (this.manualUsed >= this.manualCap) {
      this.status = 'Hand-drive limit reached. Let the wall-follower drive from here.'
      playSound('wrong')
      this.onChange()
      return
    }
    const before = this.world.pos
    const res = this.world.tryMove(d, 1)
    if (res !== 'bump' && res !== 'blocked') this.manualUsed++
    this.scene.hint = null
    this.after({ kind: res }, before)
    const now = performance.now()
    if (res === 'moved' && now - this.lastClick > 140) {
      playSound('click')
      this.lastClick = now
    }
  }

  setHand(h: 'left' | 'right'): void {
    this.hand = h
    this.onChange()
  }

  startFollower(): void {
    if (this.phase === 'brief') this.start()
    if (this.phase !== 'play' || this.tier !== 1) return
    this.following = true
    this.running = true
    this.scene.island = null
    this.followSeen.clear()
    this.followComp.clear()
    this.followSeen.add(this.world.pos * 4 + this.world.heading)
    this.status = `Following the wall with the ${this.hand} hand…`
    playSound('click')
    this.onChange()
  }

  stopFollower(): void {
    this.following = false
    this.running = false
    this.status = 'Follower stopped. Drive by hand or start it again.'
    this.onChange()
  }

  showHint(): void {
    if (this.phase === 'brief') this.start()
    const w = this.world
    const f = w.frontiers().filter((c) => c !== w.pos)
    if (!f.length) {
      this.status = w.exitSeen() ? 'Everything nearby is mapped. Head for the green exit!' : 'No unknown edges left.'
      this.onChange()
      return
    }
    const r = plan(w.W, w.H, w.passable, w.pos, f, 'bfs')
    this.scene.hint = r.found ? r.path : null
    if (r.found) this.hintsUsed++
    this.status = 'The yellow dashes lead to the nearest unexplored edge. (A hint caps this round at 2 stars.)'
    playSound('click')
    this.onChange()
  }

  nearestFrontier(): void {
    if (this.phase === 'brief') this.start()
    if (this.phase !== 'play' || this.tier !== 2) return
    const r = this.explorer.pickNearestByPath(this.world)
    if (!r) {
      this.status = 'No frontier left that the robot can reach.'
      this.onChange()
      return
    }
    this.explorer.mode = 'explore'
    this.explorer.path = r.path
    this.explorer.target = r.path[r.path.length - 1]
    this.showPlan(r, false)
    this.status = `BFS rippled out ${r.expanded} squares and found the nearest frontier ${r.path.length} steps away.`
    this.onChange()
  }

  /** Ace: tap a square — snaps to the nearest frontier within reach of the tap. */
  tapCell(x: number, y: number): void {
    if (this.phase === 'brief') this.start()
    if (this.phase !== 'play') return
    const w = this.world
    if (this.tier <= 1) {
      const dx = x - w.x()
      const dy = y - w.y()
      if (dx === 0 && dy === 0) return
      const d = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0
      this.manualMove(d)
      return
    }
    if (this.tier !== 2) return
    const fr = w.frontiers().filter((c) => c !== w.pos)
    let best = -1
    let bd = 9
    for (const f of fr) {
      const d = Math.hypot(w.x(f) - x, w.y(f) - y)
      if (d < bd) {
        bd = d
        best = f
      }
    }
    if (best < 0 || bd > 3) {
      this.status = 'Tap closer to a glowing frontier square.'
      this.onChange()
      return
    }
    this.goToFrontier(best)
  }

  goToFrontier(f: number): void {
    const r = this.explorer.goTo(this.world, f)
    if (!r) {
      this.status = 'The robot can’t reach that one on its map yet.'
      playSound('wrong')
      this.onChange()
      return
    }
    this.scene.selected = f
    this.showPlan(r, false)
    this.status = `Heading to that frontier: ${r.path.length} steps (BFS checked ${r.expanded} squares).`
    playSound('click')
    this.onChange()
  }

  /** Keyboard: cycle through frontiers, nearest first. */
  cycleFrontier(): void {
    if (this.tier !== 2 || this.phase !== 'play') return
    const w = this.world
    const fr = w
      .frontiers()
      .filter((c) => c !== w.pos)
      .sort((a, b) => Math.abs(w.x(a) - w.x()) + Math.abs(w.y(a) - w.y()) - (Math.abs(w.x(b) - w.x()) + Math.abs(w.y(b) - w.y())))
    if (!fr.length) return
    const k = fr.indexOf(this.scene.selected)
    this.scene.selected = fr[(k + 1) % fr.length]
    this.status = 'Frontier selected. Press Enter to go there.'
    this.onChange()
  }

  goSelected(): void {
    if (this.scene.selected >= 0 && this.world.isFrontier(this.scene.selected)) this.goToFrontier(this.scene.selected)
  }

  toggleAuto(): void {
    if (this.phase === 'brief') this.start()
    if (this.tier !== 2 || this.phase !== 'play') return
    this.explorer.autoExplore = !this.explorer.autoExplore
    this.status = this.explorer.autoExplore ? 'Auto-explore on: always the nearest frontier.' : 'Auto-explore off: you choose.'
    this.onChange()
  }

  planEscape(): void {
    if (this.phase !== 'play' || !this.world.exitSeen()) return
    this.explorer.allowEscape = true
    this.explorer.autoExplore = false
    const r = this.explorer.planEscape(this.world)
    if (!r) {
      this.status = 'No known route to the exit yet — explore a little more.'
      playSound('wrong')
      this.onChange()
      return
    }
    this.showPlan(r, true)
    this.status = `BFS wavefront: ${r.expanded} squares checked, shortest known route ${r.path.length} steps.`
    playSound('correct')
    this.onChange()
  }

  toggleRun(): void {
    if (this.phase === 'brief') {
      this.start()
      return
    }
    if (this.phase !== 'play' || this.tier !== 3) return
    this.running = !this.running
    this.status = this.running ? 'Running.' : 'Paused.'
    this.onChange()
  }

  stepOnce(): void {
    if (this.phase === 'brief') this.start()
    if (this.phase !== 'play' || this.tier !== 3) return
    if (this.anim) return
    this.running = false
    this.wait = 0
    this.status = 'Paused. Each press of Step makes one decision.'
    this.logicTick()
    this.onChange()
  }

  setReveal(m: RevealMode): void {
    this.scene.reveal = m
    this.onChange()
  }

  giveUp(): void {
    if (this.phase === 'play') this.finish(false, 'You stopped this run.')
  }

  // ── Frame loop ─────────────────────────────────────────────────────────────

  private showPlan(r: PlanResult, escape: boolean): void {
    this.lastPlan = { algo: r.algo === 'astar' ? 'A*' : r.algo === 'bfs' ? 'BFS' : 'Greedy', expanded: r.expanded, length: r.path.length }
    const base = escape ? 1.4 : this.tier === 3 ? 0.3 : 0.8
    const dur = this.reduced ? 0.01 : Math.min(base, Math.max(0.25, r.order.length * 0.012)) / this.speed
    this.scene.wave = { order: r.order, dist: r.dist, age: 0, dur, path: r.path, escape } satisfies Wave
    if (escape || this.tier === 2) this.wait = dur
  }

  frame(dt: number): void {
    const sc = this.scene
    sc.t += dt
    sc.beamAge += dt
    sc.bumpAge += dt
    sc.shake = this.calm ? 0 : Math.max(0, sc.shake - dt * 3)
    if (sc.wave) {
      sc.wave.age += dt
      if (sc.wave.age > sc.wave.dur + 1.3) sc.wave = null
    }
    // Glide.
    if (this.anim) {
      const a = this.anim
      a.age += dt
      const k = Math.min(1, a.age / a.dur)
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
      sc.rx = a.fx + (a.tx - a.fx) * e
      sc.ry = a.fy + (a.ty - a.fy) * e
      if (k >= 1) this.anim = null
    }
    const targetAngle = (this.world.heading - 1) * (Math.PI / 2)
    let da = targetAngle - sc.angle
    while (da > Math.PI) da -= Math.PI * 2
    while (da < -Math.PI) da += Math.PI * 2
    sc.angle = this.reduced ? targetAngle : sc.angle + da * Math.min(1, dt * 16)
    if (this.tier === 2 || this.tier === 3) {
      sc.path = this.explorer.path
      sc.target = this.phase === 'play' ? this.explorer.target : -1
    }
    this.fx.update(dt)

    // Legend: try every possible brain on this maze in the background, a few
    // milliseconds per frame, so the stars are measured against what is possible.
    if (this.tier === 3 && !this.sweep) {
      this.sweep = legendSweep(this.mazeIdx, 6)
      if (this.sweep) this.onChange()
    }

    // Cadet/Pilot: a hand-drive press that arrived during the glide.
    if (this.queued.length && !this.anim && this.phase === 'play') {
      if (this.wait > 0) this.wait -= dt
      else this.manualMove(this.queued.shift() as number)
    } else if (this.phase !== 'play') this.queued = []

    if (this.phase !== 'play' || !this.running) return
    if (this.wait > 0) {
      this.wait -= dt
      return
    }
    if (this.anim) return
    this.logicTick()
  }

  private logicTick(): void {
    const w = this.world
    const before = w.pos
    if (this.tier === 1) {
      if (!this.following) return
      const d = followerDir(w.maze, w.pos, w.heading, this.hand)
      const res = w.tryMove(d, 1)
      if (res === 'moved') {
        const c = handWallComp(w.maze, w.pos, w.heading, this.hand)
        if (c >= 0) this.followComp.set(c, (this.followComp.get(c) ?? 0) + 1)
        const key = w.pos * 4 + w.heading
        if (this.followSeen.has(key)) {
          this.after({ kind: res }, before)
          this.loopDetected()
          return
        }
        this.followSeen.add(key)
      }
      this.after({ kind: res }, before)
      return
    }
    const r = this.explorer.tick(w)
    if (r.kind === 'plan' && r.plan) {
      this.showPlan(r.plan, !!r.escapePlan)
      if (r.escapePlan) {
        this.status = `Exit spotted! ${r.plan.algo === 'astar' ? 'A*' : r.plan.algo === 'bfs' ? 'BFS' : 'Greedy'} planned a ${r.plan.path.length}-step escape (${r.plan.expanded} squares checked).`
        playSound('correct')
      }
      this.onChange()
      return
    }
    if (r.kind === 'wait') return
    if (r.kind === 'stuck') {
      if (this.tier === 2 && w.exitSeen() && !this.explorer.allowEscape) {
        this.explorer.autoExplore = false
        this.status = 'Nothing left to explore. Press “Plan escape”.'
        this.onChange()
        return
      }
      this.finish(false, 'The robot ran out of places to explore and could not find a way out on its map.')
      return
    }
    if (r.kind === 'rescan') {
      this.scene.beamAge = 0
      this.wait = this.reduced ? 0.02 : 0.12 / this.speed
      this.sparkles()
      this.checkEnd()
      this.onChange()
      return
    }
    this.after(r, before)
  }

  private loopDetected(): void {
    this.following = false
    this.running = false
    this.loops++
    let comp = -1
    let best = -1
    this.followComp.forEach((n, c) => {
      if (n > best) {
        best = n
        comp = c
      }
    })
    const w = this.world
    const island = new Set<number>()
    if (comp >= 0 && comp !== w.maze.outerComp) {
      for (let i = 0; i < w.W * w.H; i++) if (w.maze.wallComp[i] === comp && w.belief(i) === BELIEF_WALL) island.add(i)
    }
    this.scene.island = island.size ? island : null
    this.scene.shake = 0.6
    playSound('wrong')
    this.fx.ring(w.x(), w.y(), '#fbbf24', 1.2)
    this.status = `Loop! The robot is back on a square it already drove through, facing the same way, so it will repeat the same circuit forever. The ${this.hand}-hand wall it held is an island${island.size ? ' (glowing yellow)' : ''} — it never touches the outside. Drive by hand to a different wall, then start again.`
    this.onChange()
  }

  private sparkles(): void {
    const w = this.world
    const list = w.newlyKnown
    w.newlyKnown = []
    let k = 0
    for (const c of list) {
      if (k++ > 18) break
      this.fx.sparkle(w.x(c), w.y(c), w.belief(c) === BELIEF_WALL ? '#5eead4' : '#00E5FF', 2)
    }
  }

  private after(r: TickResult, before: number): void {
    const w = this.world
    const sc = this.scene
    if (r.kind === 'moved' || r.kind === 'escaped') {
      const dur = this.reduced ? 0.0001 : STEP_SEC / this.speed
      this.anim = { fx: w.x(before), fy: w.y(before), tx: w.x(), ty: w.y(), age: 0, dur }
      sc.beamAge = 0
      this.sparkles()
      if (r.probed) this.status = 'Bumper check: no wall there after all — the map is fixed.'
    } else if (r.kind === 'bump') {
      sc.bumpAge = 0
      sc.shake = 0.5
      this.fx.burst(w.x() + DX4[w.heading] * 0.5, w.y() + DY4[w.heading] * 0.5, '#fb7185', 10)
      playSound('wrong')
      this.wait = this.reduced ? 0.05 : 0.25 / this.speed
      if (this.tier === 3) this.status = r.probed ? 'Bumper check: that square really is a wall.' : 'Bump! The map said “floor” but it was a wall — a noisy reading fooled it. The bumper fixes the map.'
      else this.status = 'Bonk! That’s a wall.'
      this.sparkles()
    } else if (r.kind === 'slip') {
      sc.shake = 0.3
      this.wait = this.reduced ? 0.05 : 0.2 / this.speed
      this.status = 'Wheel slip! The wheels spun but the robot didn’t move. Its IMU noticed, so the map stays lined up — but the battery paid.'
    }
    if (this.tier === 2) {
      sc.frontiers = w.frontiers()
      if (sc.selected >= 0 && !w.isFrontier(sc.selected)) sc.selected = -1
    }
    // Exit discovered.
    if (!this.exitAnnounced && w.exitSeen()) {
      this.exitAnnounced = true
      playSound('unlock')
      this.fx.ring(w.x(w.maze.exit), w.y(w.maze.exit), '#22C55E', 1.4)
      this.fx.burst(w.x(w.maze.exit), w.y(w.maze.exit), '#86efac', 16)
      if (this.tier === 0) this.status = 'Exit found (green)! Map more for extra stars, or drive out.'
      else if (this.tier === 2) this.status = 'Exit spotted! Press “Plan escape” to let BFS find the shortest known route — or keep exploring.'
    }
    // Coverage milestones (Cadet).
    if (this.tier === 0) {
      const c = w.coverage()
      for (const m of [25, 50, 80]) {
        if (c * 100 >= m && !this.milestones.has(m)) {
          this.milestones.add(m)
          playSound('star')
          this.status = m === 80 ? '80% mapped — that’s a 3-star map!' : `${m}% of the maze mapped!`
        }
      }
    }
    this.checkEnd()
    this.onChange()
  }

  private checkEnd(): void {
    const w = this.world
    if (w.escaped) {
      this.finish(true, '')
      return
    }
    if (w.battery <= 0) this.finish(false, 'The battery ran flat before the robot escaped.')
  }

  // ── Scoring and the "why it happened" debrief ──────────────────────────────

  private finish(escaped: boolean, reason: string): void {
    if (this.phase !== 'play') return
    this.phase = 'reveal'
    this.running = false
    this.following = false
    const w = this.world
    const m = w.maze
    this.scene.reveal = 'compare'
    this.scene.optimal = truePath(m, m.start, m.exit)
    this.scene.frontiers = null
    this.scene.hint = null
    if (escaped) {
      playSound('zonecomplete')
      this.fx.burst(w.x(), w.y(), '#FFA878', 30)
      this.fx.burst(w.x(), w.y(), '#86efac', 20)
    } else playSound('wrong')
    this.outcome = this.score(escaped, reason)
    this.status = escaped ? 'Escaped! Compare the robot’s map with the real maze.' : reason
    this.onChange()
  }

  private score(escaped: boolean, reason: string): Outcome {
    const w = this.world
    const cov = w.coverage()
    const acc = w.accuracy()
    const used = w.batteryMax - Math.max(0, w.battery)
    const left = Math.max(0, w.battery) / w.batteryMax
    const why: string[] = []
    let stars = 0
    let score = 0
    let scoreLabel = ''
    let lowerIsBetter = false
    let headline = ''
    let tries: TryRow[] | null = null
    let race: RaceRow[] | null = null
    let rank: Outcome['rank'] = null
    const unknownFloor = Math.round((1 - cov) * w.maze.freeCount)

    if (this.tier === 0) {
      score = Math.round(cov * 100)
      scoreLabel = '% mapped'
      const raw = escaped ? (cov >= 0.8 ? 3 : cov >= 0.5 ? 2 : 1) : 0
      stars = this.hintsUsed > 0 ? Math.min(2, raw) : raw
      headline = escaped
        ? `You escaped in ${w.steps} moves and mapped ${score}% of the maze.${this.hintsUsed > 0 && raw === 3 ? ' You used a hint, so this finish is capped at 2 stars — map it again without one for 3.' : ''}`
        : reason
      why.push(`Every move fired 4 sensor beams up to ${w.cfg.range} squares. A beam marks the squares it passes as floor and the square that stops it as wall — that grid of free / wall / unknown is an occupancy map.`)
      why.push(unknownFloor > 0 ? `${unknownFloor} floor squares stayed unknown: no beam ever reached them. Dead ends hide behind corners, so a robot must go and look.` : 'Every floor square got mapped — nothing left unknown!')
      why.push(`The shortest possible escape was ${this.optimal} moves (green dashes). Mapping more costs moves: real robots trade a complete map against time and battery.`)
    } else if (this.tier === 1) {
      score = w.steps
      scoreLabel = 'moves'
      lowerIsBetter = true
      stars = escaped ? (left >= 0.4 ? 3 : left >= 0.15 ? 2 : 1) : 0
      headline = escaped ? `Escaped with ${Math.round(left * 100)}% battery left after ${this.loops} loop${this.loops === 1 ? '' : 's'}.` : reason
      why.push('A wall-follower keeps one hand on a wall. If that wall is connected to the outside wall, following it MUST lead to every gap in the outside wall — including the exit.')
      why.push(
        this.loops > 0
          ? `Your robot looped ${this.loops} time${this.loops === 1 ? '' : 's'}: it was holding an island — a wall that floats free in the middle. Following an island just goes round and round it.`
          : escaped
            ? 'Your robot never looped: the wall it held was joined to the outside wall.'
            : `The battery ran out before the wall-follower finished a trip${w.bumps ? ` — ${w.bumps} bump${w.bumps === 1 ? '' : 's'} into walls cost energy too` : ''}. Start the follower early and let it do the walking.`,
      )
      why.push('Islands only exist in mazes with loops. In a “perfect” maze (no loops) every wall touches the outside, so wall-following always works. Robots use smarter methods (like frontier search) when they cannot trust that.')
    } else if (this.tier === 2) {
      score = w.steps
      scoreLabel = 'steps'
      lowerIsBetter = true
      const base = this.baseline
      stars = escaped ? (w.steps < base ? 3 : w.steps <= Math.round(base * 1.2) ? 2 : 1) : 0
      headline = escaped
        ? `Escaped in ${w.steps} steps. The always-nearest-frontier robot needs ${base}${w.steps < base ? ' — you beat it!' : w.steps === base ? ' — a tie.' : '.'} With a perfect map the best is ${this.optimal}.`
        : reason
      why.push('A frontier is the edge between what the robot knows and what it does not. Going to a frontier is the fastest way to learn something new.')
      if (!escaped) why.push(`The robot did not get out, so there is no score to compare with the nearest-frontier robot (${base} steps). Explore toward the east wall, and press Plan escape as soon as the exit glows green.`)
      else if (w.steps < base) why.push(`You beat “nearest frontier first” by ${base - w.steps} step${base - w.steps === 1 ? '' : 's'}. Nearest-first is a good rule, but it ignores what you know — that the exit is always in the east wall. Choosing frontiers with that in mind is what real explorers call using a prior.`)
      else if (w.steps === base) why.push(`You tied the robot that always picks the nearest frontier — pressing Nearest every time IS that robot. To beat it (3 stars), use something it doesn't: the exit is always in the east wall, so a frontier on the east side can be worth more than a closer one in the west. And escape the moment a route is known.`)
      else why.push(`The nearest-frontier robot did it in ${base}. Long trips to far frontiers and backtracking out of dead ends cost steps. Beat ${base} for 3 stars.`)
      why.push(`BFS (breadth-first search) spreads out one step at a time, like a ripple. The first time the ripple touches the goal, that route is the shortest possible on the robot’s map. Your robot planned ${w.plans} time${w.plans === 1 ? '' : 's'} and checked ${w.expandedTotal} squares in total.`)
      if (escaped) why.push(`The robot only mapped ${Math.round(cov * 100)}% of the maze — it didn’t need the rest. Exploration stops paying once the way out is known.`)
    } else {
      const sw = legendSweep(this.mazeIdx) as LegendSweep
      this.sweep = sw
      const mine = summarize(w)
      const cost = missionCost(mine)
      const wrong = acc.wrongFloor + acc.wrongWalls
      const usedR = Math.round(used)
      score = escaped ? Math.round(cost) : 0
      scoreLabel = 'mission cost'
      lowerIsBetter = true
      const starsFor = (c: number): number => (!Number.isFinite(c) ? 0 : c <= sw.three ? 3 : c <= sw.two ? 2 : 1)
      stars = escaped ? starsFor(cost) : 0
      const beats = sw.costs.filter((c) => c > cost).length
      rank = { beats: escaped ? beats : 0, of: sw.costs.length, best: Math.round(sw.costs[0]), three: Math.round(sw.three), two: Math.round(sw.two) }
      headline = escaped
        ? `Mission cost ${Math.round(cost)} = ${usedR} energy + ${wrong} wrong square${wrong === 1 ? '' : 's'} × ${WRONG_SQUARE_COST}. ${stars === 3 ? `A top-${Math.round(LEGEND_THREE_SHARE * 100)}% brain for this maze!` : `3 stars needs ${Math.round(sw.three)} or less.`}`
        : reason
      why.push(
        wrong > 0
          ? `The map ${escaped ? 'you brought back' : 'so far'} has ${wrong} wrong square${wrong === 1 ? '' : 's'} (red crosses): ${acc.wrongWalls} ghost wall${acc.wrongWalls === 1 ? '' : 's'} and ${acc.wrongFloor} real wall${acc.wrongFloor === 1 ? '' : 's'} marked as floor. Each one costs ${WRONG_SQUARE_COST}: a rescue team using this map would be fooled by it.`
          : `The map ${escaped ? 'you brought back' : 'so far'} has no wrong squares: the evidence out-voted every noisy reading.`,
      )
      const t = this.settings.trust
      const thresh = Math.log(t / (1 - t))
      const nWall = Math.floor(thresh / w.cfg.lOcc) + 1
      const nFloor = Math.floor(thresh / -w.cfg.lFree) + 1
      const need = `At ${Math.round(t * 100)}% trust, a square nobody has looked at becomes a wall after ${nWall} “wall” reading${nWall === 1 ? '' : 's'} and floor after ${nFloor} “floor” reading${nFloor === 1 ? '' : 's'}.`
      why.push(
        nWall === 1
          ? `${need} So a single bad echo can draw a ghost wall across a corridor. Fast, but the map pays.`
          : nWall >= 3
            ? `${need} The map is careful, but every doubtful square means stopping to look again (${w.scans} scans for ${w.steps} moves).`
            : `${need} Each reading adds or subtracts log-odds evidence, so one bad echo gets out-voted by the next good ones.`,
      )
      if (this.settings.scans > 1)
        why.push(`You asked for ${this.settings.scans} scans at every stop, at ${this.world.cfg.extraScanCost} energy for each extra one — even where the map was already sure. The robot also looks again by itself when a frontier stays doubtful. Were all those extra scans worth it?`)
      why.push(
        this.settings.eastBias === 0
          ? 'No east hunch: the robot chose between frontiers almost blindly, so tiny differences in the map sent it down different corridors — that is why results without a hunch swing so much. The exit is always in the east wall. Using what you already know (a “prior”) makes a robot’s choices steadier, and real robots do it too.'
          : `Your east hunch (${this.settings.eastBias === 1 ? 'some' : 'strong'}) pulled the robot toward the east wall, where the exit must be. A prior like this cuts out whole wrong corridors — but a strong one can drag the robot past nearer, useful frontiers.`,
      )
      why.push(
        `Your planner (${PLANNER_NAMES[this.settings.planner]}) checked ${w.expandedTotal} squares for ${w.computeEnergy.toFixed(1)} energy. Most of the robot’s trips were short hops to nearby frontiers; on hops that short all three planners usually find the same route, so the planner mostly changes thinking energy. The race below shows where planners really differ: long trips.`,
      )
      why.push(escaped ? `Your brain beats ${beats} of the ${sw.costs.length} brains this panel can build, on this maze. The best possible mission cost here is ${Math.round(sw.costs[0])}.` : `Of the ${sw.costs.length} brains this panel can build, ${sw.costs.filter(Number.isFinite).length} get out of this maze.`)
      tries = this.tryRows(sw, mine, starsFor)
      race = plannerRace(w.maze)
    }
    return { escaped, stars, score, scoreLabel, lowerIsBetter, headline, why, tries, race, rank }
  }

  /** One change at a time: what each single setting change would have done here. */
  private tryRows(sw: LegendSweep, mine: ReturnType<typeof summarize>, starsFor: (c: number) => number): TryRow[] {
    const s = this.settings
    const row = (name: string, st: AutoSettings, own = false): TryRow | null => {
      const r = own ? mine : sw.results.get(settingsKey(st))
      if (!r) return null
      const cost = missionCost(r)
      return { name, mine: own, escaped: r.escaped, cost, energy: r.energy, wrong: r.wrong, stars: starsFor(cost) }
    }
    const out: (TryRow | null)[] = [row('Your brain', s, true)]
    const ti = LEGEND_TRUSTS.findIndex((v) => Math.abs(v - s.trust) < 1e-6)
    if (ti > 0) out.push(row(`Trust ${Math.round(LEGEND_TRUSTS[ti - 1] * 100)}%`, { ...s, trust: LEGEND_TRUSTS[ti - 1] }))
    if (ti >= 0 && ti < LEGEND_TRUSTS.length - 1) out.push(row(`Trust ${Math.round(LEGEND_TRUSTS[ti + 1] * 100)}%`, { ...s, trust: LEGEND_TRUSTS[ti + 1] }))
    for (const sc of LEGEND_SCANS) if (Math.abs(sc - s.scans) === 1) out.push(row(`${sc} scan${sc === 1 ? '' : 's'} per stop`, { ...s, scans: sc }))
    for (const b of LEGEND_BIASES) if (b !== s.eastBias) out.push(row(`East hunch: ${['none', 'some', 'strong'][b]}`, { ...s, eastBias: b }))
    for (const p of LEGEND_PLANNERS) if (p !== s.planner) out.push(row(`Planner: ${PLANNER_NAMES[p]}`, { ...s, planner: p }))
    return out.filter((r): r is TryRow => r !== null)
  }
}
