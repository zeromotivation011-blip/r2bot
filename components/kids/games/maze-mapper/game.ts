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
  LEGEND_REFERENCES,
  batteryFor,
  followerDir,
  handWallComp,
  pilotStats,
  plan,
  runHeadless,
  summarize,
  trueDistances,
  truePath,
  World,
  type AutoSettings,
  type PlanResult,
  type RunSummary,
  type TickResult,
  type TierIndex,
} from './sim'
import { Fx, type RevealMode, type SceneState, type Wave } from './render'

export type Phase = 'brief' | 'play' | 'reveal'

export interface CompareRow {
  name: string
  mine?: boolean
  s: RunSummary
}

export interface Outcome {
  escaped: boolean
  stars: number
  score: number
  scoreLabel: string
  lowerIsBetter: boolean
  headline: string
  why: string[]
  compare: CompareRow[] | null
  planners: CompareRow[] | null
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
  private reduced: boolean
  private anim: { fx: number; fy: number; tx: number; ty: number; age: number; dur: number } | null = null
  private wait = 0
  private followSeen = new Set<number>()
  private followComp = new Map<number, number>()
  private milestones = new Set<number>()
  private exitAnnounced = false
  private onChange: () => void
  private lastClick = 0

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
  }

  private briefStatus(): string {
    return ['Drive with the arrows. Map the maze, then find the green exit.', 'Pick a hand and start the wall-follower.', 'Choose where to explore: tap a glowing frontier or press Nearest.', 'Set up the robot’s brain, then press Run.'][this.tier]
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
    this.outcome = null
    this.lastPlan = null
    this.anim = null
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
    }
  }

  // ── Child actions ──────────────────────────────────────────────────────────

  manualMove(d: number): void {
    if (this.phase === 'brief') this.start()
    if (this.phase !== 'play' || this.busy) return
    if (this.tier >= 2) return
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
    this.status = 'The yellow dashes lead to the nearest unexplored edge.'
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
    this.running = false
    this.logicTick()
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
    sc.shake = Math.max(0, sc.shake - dt * 3)
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
    this.status = `Loop! The robot is back where it started, facing the same way. The ${this.hand}-hand wall it held is an island (glowing yellow) — it never touches the outside. Drive by hand to a different wall, then start again.`
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
    let compare: CompareRow[] | null = null
    let planners: CompareRow[] | null = null
    const unknownFloor = Math.round((1 - cov) * w.maze.freeCount)

    if (this.tier === 0) {
      score = Math.round(cov * 100)
      scoreLabel = '% mapped'
      stars = escaped ? (cov >= 0.8 ? 3 : cov >= 0.5 ? 2 : 1) : 0
      headline = escaped ? `You escaped in ${w.steps} moves and mapped ${score}% of the maze.` : reason
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
          : 'Your robot never looped: the wall it held was joined to the outside wall.',
      )
      why.push('Islands only exist in mazes with loops. In a “perfect” maze (no loops) every wall touches the outside, so wall-following always works. Robots use smarter methods (like frontier search) when they cannot trust that.')
    } else if (this.tier === 2) {
      score = w.steps
      scoreLabel = 'steps'
      lowerIsBetter = true
      stars = escaped ? (w.steps <= this.baseline ? 3 : w.steps <= Math.round(this.baseline * 1.25) ? 2 : 1) : 0
      headline = escaped ? `Escaped in ${w.steps} steps. The always-nearest-frontier robot needs ${this.baseline}; with a perfect map the best is ${this.optimal}.` : reason
      why.push('A frontier is the edge between what the robot knows and what it does not. Going to a frontier is the fastest way to learn something new.')
      why.push(
        w.steps <= this.baseline
          ? 'You matched or beat “nearest frontier first”. Greedy-nearest is a good rule, but not the best one: thinking about WHERE the exit probably is can do better.'
          : `The nearest-frontier robot did it in ${this.baseline}. Long trips to far frontiers and backtracking out of dead ends cost steps.`,
      )
      why.push(`BFS (breadth-first search) spreads out one step at a time, like a ripple. The first time the ripple touches the goal, that route is the shortest possible on the robot’s map. Your robot planned ${w.plans} times and checked ${w.expandedTotal} squares in total.`)
      why.push(`The robot only mapped ${Math.round(cov * 100)}% of the maze — it didn’t need the rest. Exploration stops paying once the way out is known.`)
    } else {
      score = Math.round(used)
      scoreLabel = 'energy used'
      lowerIsBetter = true
      const usedFrac = used / w.batteryMax
      stars = escaped ? (usedFrac <= 0.55 ? 3 : usedFrac <= 0.8 ? 2 : 1) : 0
      headline = escaped ? `Escaped using ${Math.round(usedFrac * 100)}% of the battery: ${w.steps} moves, ${w.bumps} bumps, ${w.slips} slips.` : reason
      const wrong = acc.wrongFloor + acc.wrongWalls
      why.push(
        wrong > 0
          ? `The final map still has ${wrong} wrong square${wrong === 1 ? '' : 's'} (red crosses): ${acc.wrongWalls} ghost wall${acc.wrongWalls === 1 ? '' : 's'} and ${acc.wrongFloor} wall${acc.wrongFloor === 1 ? '' : 's'} mistaken for floor. Each comes from noisy readings the robot trusted.`
          : 'The final map has no wrong squares: the evidence out-voted every noisy reading.',
      )
      why.push(
        this.settings.trust < 0.7
          ? 'With a low trust level ONE reading decides a square, so a single bad echo can draw a wall across a corridor or open a hole in a wall. More scans and a higher trust level make the map slower but honest.'
          : 'A higher trust level means a square only counts once several readings agree. Each reading adds or subtracts log-odds evidence, so one bad echo gets out-voted.',
      )
      why.push(
        `Planning cost ${w.computeEnergy.toFixed(1)} energy for ${w.expandedTotal} squares checked. ${this.settings.planner === 'bfs' ? 'BFS checks everything in rings around the robot.' : this.settings.planner === 'astar' ? 'A* aims at the goal with a distance guess (the heuristic), so it checks far fewer squares and still finds the shortest path.' : 'Greedy only follows the guess, so it checks very few squares but can pick a longer path.'}`,
      )
      if (this.settings.eastBias === 0) why.push('Tip: the exit is always in the east wall. A robot that leans toward the east (the “east hunch”) uses what it knows — that is prior knowledge, and real robots use it too.')
      compare = this.compareRows()
      planners = this.plannerRows()
    }
    return { escaped, stars, score, scoreLabel, lowerIsBetter, headline, why, compare, planners }
  }

  private compareRows(): CompareRow[] {
    const b = this.world.batteryMax
    const rows: CompareRow[] = [{ name: 'Your robot', mine: true, s: summarize(this.world) }]
    for (const r of LEGEND_REFERENCES) rows.push({ name: r.name, s: runHeadless(3, this.mazeIdx, r.settings, b) })
    return rows
  }

  private plannerRows(): CompareRow[] {
    const b = this.world.batteryMax
    return (['bfs', 'astar', 'greedy'] as const).map((p) => ({
      name: p === 'bfs' ? 'BFS' : p === 'astar' ? 'A*' : 'Greedy',
      mine: p === this.settings.planner,
      s: runHeadless(3, this.mazeIdx, { ...this.settings, planner: p }, b),
    }))
  }
}
