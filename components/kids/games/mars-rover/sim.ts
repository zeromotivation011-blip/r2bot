// components/kids/games/mars-rover/sim.ts
// Mars Rover Command — the simulation. Two places, one light-delay apart:
//
//  • MARS: the rover runs the commands it has received, one small action at a
//    time. It knows where it is only by counting wheel turns (dead reckoning)
//    unless visual odometry is on. Loose sand makes wheels slip, so the count
//    drifts from the truth. Optional onboard rules (hazard avoidance, visual
//    odometry, power guard, AEGIS) act WITHOUT waiting for Earth.
//  • EARTH: sees only what has had time to arrive: telemetry and pictures from
//    `delay` minutes ago. Commands sent now arrive `delay` minutes later.
//
// Fixed time step, no Math.random: the same plan always gives the same result.

import {
  DIRS,
  TIERS,
  idx,
  legendStarLines,
  inside,
  type MarsMap,
  type RuleId,
  type TierConfig,
  type TierIndex,
} from './terrain'

/** Mission minutes per simulation tick. */
export const DT = 0.25
/** Metres per map square (shown to the child). */
export const CELL_M = 5

export type Cmd =
  | { k: 'fwd'; n: number }
  | { k: 'turn'; d: number }
  | { k: 'sci' }
  | { k: 'photo' }
  | { k: 'goto'; target: number }
  | { k: 'wait'; min: number }

export type FaultKind = 'rock' | 'tilt' | 'edge' | 'blocked' | 'noroute'

export type RoverStatus = 'idle' | 'driving' | 'turning' | 'science' | 'photo' | 'waiting' | 'thinking' | 'charging' | 'zapping' | 'fault' | 'stuck' | 'dead'

interface Vec {
  x: number
  y: number
}

type Atomic =
  | { t: 'step'; dir: number; dur: number; el: number; slipped: boolean; fromT: Vec; toT: Vec; fromE: Vec; toE: Vec }
  | { t: 'turn'; d: 1 | -1; dur: number; el: number; fromH: number }
  | { t: 'sci'; dur: number; el: number }
  | { t: 'photo'; dur: number; el: number }
  | { t: 'wait'; dur: number; el: number }
  | { t: 'think'; dur: number; el: number }
  | { t: 'charge'; dur: number; el: number }
  | { t: 'zap'; dur: number; el: number; bonus: number }

type Running =
  | { k: 'fwd'; left: number; h0: number; path: number[] | null; goal: Vec | null; replans: number }
  | { k: 'goto'; target: number; path: number[] | null; replans: number }
  | { k: 'turn'; left: number }
  | { k: 'once'; cmd: Cmd }

export interface Rover {
  x: number
  y: number
  h: number
  ex: number
  ey: number
  slipAcc: number
  /** Battery energy, Wh (Legend). */
  wh: number
  status: RoverStatus
  plan: Cmd[]
  cur: Running | null
  act: Atomic | null
  rules: Set<RuleId>
  /** Hidden rocks the rover has seen, stored in its own (estimated) frame. */
  memory: Set<number>
  sampled: Set<number>
  zapped: Set<number>
  /** Uplink id currently running. */
  seq: number
}

export type MarsEvent =
  | { k: 'arrive'; seq: number; corrected: Vec | null }
  | { k: 'science'; target: number }
  | { k: 'sci-miss' }
  | { k: 'fault'; kind: FaultKind; at: Vec }
  | { k: 'stuck'; at: Vec }
  | { k: 'dead' }
  | { k: 'avoid'; at: Vec }
  | { k: 'replan' }
  | { k: 'slip'; at: Vec }
  | { k: 'image'; id: number }
  | { k: 'aegis'; bonus: number }
  | { k: 'done'; seq: number }
  | { k: 'charge' }
  | { k: 'sampled'; target: number }
  | { k: 'zapped'; bonus: number }

export interface Photo {
  id: number
  t: number
  /** True pose when taken. */
  x: number
  y: number
  h: number
  /** What the rover believed. */
  ex: number
  ey: number
  /** Hidden-rock cells in view. */
  rocks: number[]
}

export interface DataItem {
  kind: 'sci' | 'img' | 'aegis'
  ref: number
  mb: number
  made: number
}

export interface Uplink {
  id: number
  sentAt: number
  arriveAt: number
  cmds: Cmd[]
  rules: RuleId[]
  correction: Vec | null
}

export interface Signal {
  dir: 'up' | 'down'
  sentAt: number
  arriveAt: number
  kind: string
}

/** Something Earth receives at `at`. */
export interface Arrival {
  at: number
  /** Mars time it happened. */
  happened: number
  ev: MarsEvent
}

export interface Snap {
  x: number
  y: number
  ex: number
  ey: number
  h: number
  status: RoverStatus
  wh: number
}

export interface Stats {
  faults: Partial<Record<FaultKind, number>>
  slips: number
  slipsCaught: number
  avoids: number
  sciMiss: number
  charges: number
  minWhPct: number
  imagesSent: number
  parked: number
}

export interface Sim {
  tierIndex: TierIndex
  tier: TierConfig
  map: MarsMap
  t: number
  rover: Rover
  snaps: Snap[]
  /** Every Mars event, with when it happened (for the end-of-round truth replay). */
  marsLog: { t: number; ev: MarsEvent }[]
  arrivals: Arrival[]
  /** Arrivals already delivered to Earth (index into arrivals sorted by time). */
  delivered: Arrival[]
  uplinks: Uplink[]
  signals: Signal[]
  photos: Photo[]
  downlinkQueue: DataItem[]
  /** Relay passes (mission minutes) — Legend. */
  passes: { t: number; mb: number; used: number; done: boolean }[]
  // ── Earth's knowledge ──
  knownRocks: Set<number>
  earthPhoto: Photo | null
  /** Offset (true − believed) from the newest received picture, not yet sent. */
  pendingCorrection: Vec | null
  correctionPhotoId: number
  scienceAtEarth: Set<number>
  aegisAtEarth: Set<number>
  points: number
  earthKnowsIdle: boolean
  terminalAtEarth: 'stuck' | 'dead' | null
  stats: Stats
  /** Every true cell the rover visited (revealed at the end). */
  trail: Vec[]
  ended: boolean
}

export const CAPACITY_WH = 450
const SOLAR_PEAK_W = 110
const BASE_W = 25
const DRIVE_W = 100
const VO_W = 15
const SCI_W = 55
const PHOTO_W = 12
/** Electric heaters keep the electronics and motors warm in the cold morning. */
const HEATER_W = 45
/** Battery state of charge at dawn (the night heaters used the rest). */
export const START_PCT = 33
/** Relay-orbiter passes: Mars local time and how much data each can carry. */
export const PASSES: { clock: number; mb: number }[] = [
  { clock: 10 * 60 + 30, mb: 40 },
  { clock: 13 * 60 + 30, mb: 60 },
  { clock: 16 * 60 + 30, mb: 40 },
]

export function clockAt(sim: Sim, t: number): number {
  return sim.tier.startClock + t
}

export function fmtClock(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Heater power: full at dawn, off once the Sun has warmed the rover (10:30). */
export function heaterW(clockMin: number): number {
  const off = 10 * 60 + 30
  if (clockMin >= off) return 0
  return Math.min(HEATER_W, (HEATER_W * (off - clockMin)) / 180)
}

export function solarW(clockMin: number): number {
  const h = clockMin / 60
  if (h <= 6 || h >= 18) return 0
  return SOLAR_PEAK_W * Math.sin((Math.PI * (h - 6)) / 12)
}

export function createSim(tierIndex: TierIndex, map: MarsMap): Sim {
  const tier = TIERS[tierIndex]
  const rover: Rover = {
    x: map.start.x,
    y: map.start.y,
    h: map.start.h,
    ex: map.start.x,
    ey: map.start.y,
    slipAcc: 0,
    wh: (CAPACITY_WH * START_PCT) / 100,
    status: 'idle',
    plan: [],
    cur: null,
    act: null,
    rules: new Set(),
    memory: new Set(),
    sampled: new Set(),
    zapped: new Set(),
    seq: 0,
  }
  const passes = tier.legend
    ? PASSES.map((p) => ({ t: p.clock - tier.startClock, mb: p.mb, used: 0, done: false }))
    : []
  const sim: Sim = {
    tierIndex,
    tier,
    map,
    t: 0,
    rover,
    snaps: [],
    marsLog: [],
    arrivals: [],
    delivered: [],
    uplinks: [],
    signals: [],
    photos: [],
    downlinkQueue: [],
    passes,
    knownRocks: new Set(),
    earthPhoto: null,
    pendingCorrection: null,
    correctionPhotoId: -1,
    scienceAtEarth: new Set(),
    aegisAtEarth: new Set(),
    points: 0,
    earthKnowsIdle: true,
    terminalAtEarth: null,
    stats: { faults: {}, slips: 0, slipsCaught: 0, avoids: 0, sciMiss: 0, charges: 0, minWhPct: START_PCT, imagesSent: 0, parked: 0 },
    trail: [{ x: map.start.x, y: map.start.y }],
    ended: false,
  }
  sim.snaps.push(snapOf(rover))
  return sim
}

function snapOf(r: Rover): Snap {
  let x = r.x
  let y = r.y
  let ex = r.ex
  let ey = r.ey
  let h = r.h
  const a = r.act
  if (a && a.t === 'step') {
    const f = Math.min(1, a.el / a.dur)
    if (a.slipped) {
      // Wheels spin; the rover barely moves (and settles back).
      const wob = Math.sin(f * Math.PI) * 0.12
      x = a.fromT.x + DIRS[a.dir][0] * wob
      y = a.fromT.y + DIRS[a.dir][1] * wob
    } else {
      x = a.fromT.x + (a.toT.x - a.fromT.x) * f
      y = a.fromT.y + (a.toT.y - a.fromT.y) * f
    }
    ex = a.fromE.x + (a.toE.x - a.fromE.x) * f
    ey = a.fromE.y + (a.toE.y - a.fromE.y) * f
  } else if (a && a.t === 'turn') {
    h = a.fromH + a.d * Math.min(1, a.el / a.dur)
  }
  return { x, y, ex, ey, h, status: r.status, wh: r.wh }
}

// ── hazards and planning ───────────────────────────────────────────────────

function trueBlock(m: MarsMap, x: number, y: number): 'rock' | 'tilt' | 'edge' | null {
  if (!inside(m, x, y)) return 'edge'
  const i = idx(m, x, y)
  if (m.rock[i] || m.hidden[i]) return 'rock'
  if (m.steep[i]) return 'tilt'
  return null
}

/** Is an estimated-frame cell a hazard, as far as the rover knows? */
function roverThinksHazard(sim: Sim, ex: number, ey: number): boolean {
  const m = sim.map
  const r = sim.rover
  if (!inside(m, ex, ey)) return true
  const i = idx(m, ex, ey)
  if (m.dune[i]) return true // known from orbit
  if (Math.max(Math.abs(ex - r.ex), Math.abs(ey - r.ey)) <= 1) {
    // Its own cameras see this cell: use the truth around the real rover.
    const tx = ex - (r.ex - r.x)
    const ty = ey - (r.ey - r.y)
    return trueBlock(m, tx, ty) !== null || (inside(m, tx, ty) && m.dune[idx(m, tx, ty)])
  }
  return m.rock[i] || m.steep[i] || r.memory.has(i)
}

/** A* in the rover's own frame. Returns a list of directions, or null. */
function planPath(sim: Sim, from: Vec, goal: Vec): number[] | null {
  const m = sim.map
  if (!inside(m, goal.x, goal.y)) return null
  const N = m.W * m.H
  const g = new Array<number>(N).fill(Infinity)
  const came = new Array<number>(N).fill(-1)
  const cameDir = new Array<number>(N).fill(-1)
  const open: number[] = []
  const s = idx(m, from.x, from.y)
  const goalI = idx(m, goal.x, goal.y)
  if (!inside(m, from.x, from.y)) return null
  g[s] = 0
  open.push(s)
  const hEst = (i: number) => {
    const x = i % m.W
    const y = Math.floor(i / m.W)
    const dx = Math.abs(x - goal.x)
    const dy = Math.abs(y - goal.y)
    return Math.max(dx, dy) + 0.41 * Math.min(dx, dy)
  }
  const closed = new Array<boolean>(N).fill(false)
  while (open.length) {
    let bi = 0
    for (let k = 1; k < open.length; k++) if (g[open[k]] + hEst(open[k]) < g[open[bi]] + hEst(open[bi])) bi = k
    const c = open.splice(bi, 1)[0]
    if (c === goalI) break
    if (closed[c]) continue
    closed[c] = true
    const cx = c % m.W
    const cy = Math.floor(c / m.W)
    for (let d = 0; d < 8; d++) {
      const nx = cx + DIRS[d][0]
      const ny = cy + DIRS[d][1]
      if (!inside(m, nx, ny)) continue
      if (roverThinksHazard(sim, nx, ny)) continue
      if (d % 2 === 1 && (roverThinksHazard(sim, cx + DIRS[d][0], cy) || roverThinksHazard(sim, cx, cy + DIRS[d][1]))) continue
      const ni = idx(m, nx, ny)
      const ng = g[c] + (d % 2 ? 1.41 : 1) + 0.05 // tiny turn-free bias
      if (ng < g[ni]) {
        g[ni] = ng
        came[ni] = c
        cameDir[ni] = d
        open.push(ni)
      }
    }
  }
  if (g[goalI] === Infinity) return null
  const dirs: number[] = []
  for (let c = goalI; c !== s; c = came[c]) dirs.push(cameDir[c])
  return dirs.reverse()
}

function sense(sim: Sim) {
  const r = sim.rover
  const m = sim.map
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const tx = r.x + dx
      const ty = r.y + dy
      if (!inside(m, tx, ty) || !m.hidden[idx(m, tx, ty)]) continue
      const ex = r.ex + dx
      const ey = r.ey + dy
      if (inside(m, ex, ey)) r.memory.add(idx(m, ex, ey))
    }
}

// ── events ─────────────────────────────────────────────────────────────────

function emit(sim: Sim, ev: MarsEvent, arriveAt?: number | null) {
  sim.marsLog.push({ t: sim.t, ev })
  if (arriveAt === null) return
  const at = arriveAt ?? sim.t + sim.tier.delay
  sim.arrivals.push({ at, happened: sim.t, ev })
  if (ev.k !== 'slip' && ev.k !== 'replan') sim.signals.push({ dir: 'down', sentAt: at - sim.tier.delay, arriveAt: at, kind: ev.k })
}

function takePhoto(sim: Sim): Photo {
  const r = sim.rover
  const m = sim.map
  const rocks: number[] = []
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const x = r.x + dx
      const y = r.y + dy
      if (inside(m, x, y) && m.hidden[idx(m, x, y)]) rocks.push(idx(m, x, y))
    }
  const p: Photo = { id: sim.photos.length, t: sim.t, x: r.x, y: r.y, h: r.h, ex: r.ex, ey: r.ey, rocks }
  sim.photos.push(p)
  return p
}

function endSequence(sim: Sim, fault: boolean) {
  const r = sim.rover
  r.plan = []
  r.cur = null
  r.act = null
  if (!fault) r.status = 'idle'
  if (sim.tier.autoImage) {
    const p = takePhoto(sim)
    emit(sim, { k: 'image', id: p.id })
  }
  emit(sim, { k: 'done', seq: r.seq })
}

function fault(sim: Sim, kind: FaultKind) {
  const r = sim.rover
  sim.stats.faults[kind] = (sim.stats.faults[kind] ?? 0) + 1
  emit(sim, { k: 'fault', kind, at: { x: r.x, y: r.y } })
  r.status = 'fault'
  endSequence(sim, true)
}

// ── the rover's executive ──────────────────────────────────────────────────

function stepDur(sim: Sim, dir: number): number {
  return (dir % 2 ? 2.8 : 2) * (sim.rover.rules.has('vo') ? 1.4 : 1)
}

/** Start one step in `dir` (rover already facing it). Returns false if a fault ended the sequence. */
function beginStep(sim: Sim, dir: number): boolean {
  const r = sim.rover
  const m = sim.map
  const nx = r.x + DIRS[dir][0]
  const ny = r.y + DIRS[dir][1]
  const block = trueBlock(m, nx, ny)
  if (block) {
    fault(sim, block)
    return false
  }
  if (powerGuard(sim)) return true
  const here = m.slip[idx(m, r.x, r.y)]
  const there = m.slip[idx(m, nx, ny)]
  const s = Math.max(here, there)
  let slipped = false
  if (s > 0) {
    r.slipAcc += s
    if (r.slipAcc >= 1) {
      r.slipAcc -= 1
      slipped = true
    }
  }
  const vo = r.rules.has('vo')
  const toE = slipped && vo ? { x: r.ex, y: r.ey } : { x: r.ex + DIRS[dir][0], y: r.ey + DIRS[dir][1] }
  r.act = {
    t: 'step',
    dir,
    dur: stepDur(sim, dir),
    el: 0,
    slipped,
    fromT: { x: r.x, y: r.y },
    toT: slipped ? { x: r.x, y: r.y } : { x: nx, y: ny },
    fromE: { x: r.ex, y: r.ey },
    toE,
  }
  r.status = 'driving'
  return true
}

/** Power guard rule: stop and charge when the battery is low. True if it took over. */
function powerGuard(sim: Sim): boolean {
  const r = sim.rover
  if (!sim.tier.legend || !r.rules.has('power')) return false
  if (r.wh >= CAPACITY_WH * 0.2) return false
  sim.stats.charges++
  emit(sim, { k: 'charge' })
  const clock = clockAt(sim, sim.t)
  if (clock >= 12 * 60 && solarW(clock) <= BASE_W + 10) {
    // Afternoon and too dark to charge: park and save energy for the night.
    // (In the morning the Sun is rising, so it waits and charges instead.)
    r.status = 'fault'
    sim.stats.parked++
    endSequence(sim, true)
    return true
  }
  r.act = { t: 'charge', dur: 10, el: 0 }
  r.status = 'charging'
  return true
}

function turnToward(sim: Sim, dir: number): boolean {
  const r = sim.rover
  if (r.h === dir) return false
  const diff = (dir - r.h + 8) % 8
  const d: 1 | -1 = diff <= 4 ? 1 : -1
  r.act = { t: 'turn', d, dur: 0.5, el: 0, fromH: r.h }
  r.status = 'turning'
  return true
}

/** Hazard ahead that the rover's cameras can see (rocks, steep slopes, the map edge). */
function seesHazardAhead(sim: Sim, dir: number): boolean {
  const r = sim.rover
  return trueBlock(sim.map, r.x + DIRS[dir][0], r.y + DIRS[dir][1]) !== null
}

function followPath(sim: Sim, run: { path: number[] | null; replans: number }, goal: Vec): 'acting' | 'arrived' | 'failed' {
  const r = sim.rover
  if (!run.path || run.path.length === 0) return 'arrived'
  const dir = run.path[0]
  if (turnToward(sim, dir)) return 'acting'
  if (seesHazardAhead(sim, dir)) {
    sense(sim)
    if (run.replans++ > 8) return 'failed'
    const p = planPath(sim, { x: r.ex, y: r.ey }, goal)
    if (!p) return 'failed'
    run.path = p
    emit(sim, { k: 'replan' }, null)
    r.act = { t: 'think', dur: 0.5, el: 0 }
    r.status = 'thinking'
    return 'acting'
  }
  if (!beginStep(sim, dir)) return 'failed'
  return 'acting'
}

function nextAction(sim: Sim) {
  const r = sim.rover
  for (let guard = 0; guard < 40; guard++) {
    if (!r.cur) {
      const cmd = r.plan.shift()
      if (!cmd) {
        endSequence(sim, false)
        return
      }
      if (cmd.k === 'fwd') r.cur = { k: 'fwd', left: cmd.n, h0: r.h, path: null, goal: null, replans: 0 }
      else if (cmd.k === 'turn') r.cur = { k: 'turn', left: cmd.d }
      else if (cmd.k === 'goto') {
        r.cur = { k: 'goto', target: cmd.target, path: null, replans: 0 }
      } else r.cur = { k: 'once', cmd }
    }
    const c = r.cur
    if (c.k === 'turn') {
      if (c.left === 0) {
        r.cur = null
        continue
      }
      const d: 1 | -1 = c.left > 0 ? 1 : -1
      c.left -= d
      r.act = { t: 'turn', d, dur: 0.5, el: 0, fromH: r.h }
      r.status = 'turning'
      return
    }
    if (c.k === 'once') {
      const cmd = c.cmd
      r.cur = null
      if (cmd.k === 'sci') {
        if (powerGuard(sim)) {
          if (r.act) r.cur = c
          return
        }
        r.act = { t: 'sci', dur: 15, el: 0 }
        r.status = 'science'
      } else if (cmd.k === 'photo') {
        r.act = { t: 'photo', dur: 3, el: 0 }
        r.status = 'photo'
      } else if (cmd.k === 'wait') {
        r.act = { t: 'wait', dur: cmd.min, el: 0 }
        r.status = 'waiting'
      }
      return
    }
    if (c.k === 'fwd') {
      if (c.path) {
        // Following a detour around a hazard, then face the original way again.
        const res = followPath(sim, c, c.goal ?? { x: r.ex, y: r.ey })
        if (res === 'acting') return
        if (res === 'failed') {
          if (r.status !== 'fault') fault(sim, 'blocked')
          return
        }
        c.path = null
        if (turnToward(sim, c.h0)) return
        r.cur = null
        continue
      }
      if (c.left === 0) {
        if (turnToward(sim, c.h0)) return
        r.cur = null
        continue
      }
      const dir = r.h
      if (r.rules.has('haz') && seesHazardAhead(sim, dir)) {
        sense(sim)
        // Steer around: aim for the end of this drive, in the rover's own frame.
        const end: Vec = { x: r.ex + DIRS[dir][0] * c.left, y: r.ey + DIRS[dir][1] * c.left }
        // If the end itself is blocked, get as close to it as is safe.
        let goal: Vec | null = null
        let best = Infinity
        for (let rad = 0; rad <= 2 && !goal; rad++)
          for (let dy = -rad; dy <= rad; dy++)
            for (let dx = -rad; dx <= rad; dx++) {
              if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue
              const gx = end.x + dx
              const gy = end.y + dy
              if (!inside(sim.map, gx, gy) || roverThinksHazard(sim, gx, gy) || (gx === r.ex && gy === r.ey)) continue
              const score = Math.hypot(dx, dy) * 10 + Math.hypot(gx - r.ex, gy - r.ey)
              if (score < best) {
                best = score
                goal = { x: gx, y: gy }
              }
            }
        const p = goal ? planPath(sim, { x: r.ex, y: r.ey }, goal) : null
        if (!p || !goal) {
          fault(sim, 'blocked')
          return
        }
        sim.stats.avoids++
        emit(sim, { k: 'avoid', at: { x: r.x, y: r.y } })
        c.path = p
        c.goal = goal
        c.left = 0
        r.act = { t: 'think', dur: 1, el: 0 }
        r.status = 'thinking'
        return
      }
      if (!beginStep(sim, dir)) return
      return
    }
    if (c.k === 'goto') {
      const t = sim.map.targets[c.target]
      if (!t) {
        r.cur = null
        continue
      }
      if (c.path === null) {
        sense(sim)
        c.path = planPath(sim, { x: r.ex, y: r.ey }, t)
        if (!c.path) {
          fault(sim, 'noroute')
          return
        }
        r.act = { t: 'think', dur: 1, el: 0 }
        r.status = 'thinking'
        return
      }
      const res = followPath(sim, c, t)
      if (res === 'acting') return
      if (res === 'failed') {
        if (r.status !== 'fault') fault(sim, 'blocked')
        return
      }
      r.cur = null
      continue
    }
  }
}

function finishAction(sim: Sim) {
  const r = sim.rover
  const a = r.act
  if (!a) return
  r.act = null
  const m = sim.map
  if (a.t === 'step') {
    if (a.slipped) {
      sim.stats.slips++
      emit(sim, { k: 'slip', at: { x: r.x, y: r.y } }, null)
      if (r.rules.has('vo')) sim.stats.slipsCaught++
    }
    r.x = a.toT.x
    r.y = a.toT.y
    r.ex = a.toE.x
    r.ey = a.toE.y
    const c = r.cur
    const counted = !(a.slipped && r.rules.has('vo'))
    if (c && c.k === 'fwd' && !c.path && counted) c.left--
    if (c && (c.k === 'goto' || (c.k === 'fwd' && c.path)) && c.path && counted) c.path.shift()
    if (!a.slipped) {
      const last = sim.trail[sim.trail.length - 1]
      if (last.x !== r.x || last.y !== r.y) sim.trail.push({ x: r.x, y: r.y })
    }
    sense(sim)
    if (m.dune[idx(m, r.x, r.y)]) {
      r.status = 'stuck'
      r.plan = []
      r.cur = null
      emit(sim, { k: 'stuck', at: { x: r.x, y: r.y } })
      if (sim.tier.autoImage) {
        const p = takePhoto(sim)
        emit(sim, { k: 'image', id: p.id })
      }
      return
    }
    // AEGIS: spot an interesting rock nearby and zap it, no Earth needed.
    if (r.rules.has('aegis')) {
      const b = m.bonus.find((o) => !r.zapped.has(o.id) && Math.max(Math.abs(o.x - r.x), Math.abs(o.y - r.y)) <= 1)
      if (b) {
        r.zapped.add(b.id)
        r.act = { t: 'zap', dur: 3, el: 0, bonus: b.id }
        r.status = 'zapping'
      }
    }
    return
  }
  if (a.t === 'turn') {
    r.h = (r.h + a.d + 8) % 8
    return
  }
  if (a.t === 'sci') {
    const t = m.targets.find((o) => o.x === r.x && o.y === r.y && !r.sampled.has(o.id))
    if (t) {
      r.sampled.add(t.id)
      if (sim.tier.legend) {
        sim.downlinkQueue.push({ kind: 'sci', ref: t.id, mb: 30, made: sim.t })
        emit(sim, { k: 'sampled', target: t.id })
      } else emit(sim, { k: 'science', target: t.id })
    } else {
      sim.stats.sciMiss++
      emit(sim, { k: 'sci-miss' })
    }
    return
  }
  if (a.t === 'photo') {
    const p = takePhoto(sim)
    if (sim.tier.legend) sim.downlinkQueue.push({ kind: 'img', ref: p.id, mb: 20, made: sim.t })
    else emit(sim, { k: 'image', id: p.id })
    return
  }
  if (a.t === 'zap') {
    sim.downlinkQueue.push({ kind: 'aegis', ref: a.bonus, mb: 8, made: sim.t })
    emit(sim, { k: 'zapped', bonus: a.bonus })
    return
  }
  if (a.t === 'charge') {
    if (r.wh < CAPACITY_WH * 0.45 && solarW(clockAt(sim, sim.t)) > BASE_W) {
      r.act = { t: 'charge', dur: 10, el: 0 }
      r.status = 'charging'
    }
    return
  }
}

function loadW(r: Rover): number {
  const a = r.act
  if (!a) return BASE_W
  switch (a.t) {
    case 'step':
      return BASE_W + DRIVE_W + (r.rules.has('vo') ? VO_W : 0)
    case 'turn':
      return BASE_W + DRIVE_W * 0.6
    case 'sci':
      return BASE_W + SCI_W
    case 'photo':
    case 'zap':
      return BASE_W + PHOTO_W + (a.t === 'zap' ? 30 : 0)
    case 'think':
      return BASE_W + VO_W
    default:
      return BASE_W
  }
}

function relay(sim: Sim) {
  for (const p of sim.passes) {
    if (p.done || sim.t < p.t) continue
    p.done = true
    const sciFirst = sim.rover.rules.has('scifirst')
    const order = [...sim.downlinkQueue].sort((a, b) => (sciFirst ? (a.kind === 'img' ? 1 : 0) - (b.kind === 'img' ? 1 : 0) : 0) || a.made - b.made)
    const keep: DataItem[] = []
    for (const item of order) {
      if (p.used + item.mb <= p.mb) {
        p.used += item.mb
        const ev: MarsEvent = item.kind === 'img' ? { k: 'image', id: item.ref } : item.kind === 'sci' ? { k: 'science', target: item.ref } : { k: 'aegis', bonus: item.ref }
        sim.arrivals.push({ at: sim.t + sim.tier.delay, happened: sim.t, ev })
        if (item.kind === 'img') sim.stats.imagesSent++
      } else keep.push(item)
    }
    sim.downlinkQueue = keep
    if (p.used > 0) sim.signals.push({ dir: 'down', sentAt: sim.t, arriveAt: sim.t + sim.tier.delay, kind: 'relay' })
  }
}

// ── Earth side ─────────────────────────────────────────────────────────────

/** Send a command sequence from Earth now. */
export function sendUplink(sim: Sim, cmds: Cmd[], rules: RuleId[]): Uplink {
  const u: Uplink = {
    id: sim.uplinks.length + 1,
    sentAt: sim.t,
    arriveAt: sim.t + sim.tier.delay,
    cmds: cmds.map((c) => ({ ...c })),
    rules: rules.filter((r) => sim.tier.rules.includes(r)),
    correction: sim.pendingCorrection,
  }
  sim.pendingCorrection = null
  sim.uplinks.push(u)
  sim.signals.push({ dir: 'up', sentAt: u.sentAt, arriveAt: u.arriveAt, kind: 'cmd' })
  sim.earthKnowsIdle = false
  return u
}

function deliverUplinks(sim: Sim) {
  const r = sim.rover
  for (const u of sim.uplinks) {
    if (u.arriveAt > sim.t || u.arriveAt <= sim.t - DT) continue
    if (r.status === 'stuck' || r.status === 'dead') continue
    if (u.correction) {
      r.ex += u.correction.x
      r.ey += u.correction.y
    }
    r.rules = new Set(u.rules)
    r.plan = u.cmds.map((c) => ({ ...c }))
    r.cur = null
    r.seq = u.id
    r.status = 'idle'
    emit(sim, { k: 'arrive', seq: u.id, corrected: u.correction }, null)
    nextAction(sim)
  }
}

/** Is the mission clock running? (Paused while Earth is planning.) */
export function clockRunning(sim: Sim): boolean {
  return !sim.ended && !sim.earthKnowsIdle
}

function receive(sim: Sim, a: Arrival) {
  sim.delivered.push(a)
  const ev = a.ev
  if (ev.k === 'image') {
    const p = sim.photos[ev.id]
    if (!p) return
    for (const c of p.rocks) sim.knownRocks.add(c)
    if (!sim.earthPhoto || p.t >= sim.earthPhoto.t) sim.earthPhoto = p
    const off = { x: p.x - p.ex, y: p.y - p.ey }
    // Only correct for drift not already corrected by an earlier uplink.
    if (p.id > sim.correctionPhotoId) {
      sim.correctionPhotoId = p.id
      const already = sim.uplinks.filter((u) => u.arriveAt > p.t && u.correction).reduce((acc, u) => ({ x: acc.x + (u.correction?.x ?? 0), y: acc.y + (u.correction?.y ?? 0) }), { x: 0, y: 0 })
      const need = { x: off.x - already.x, y: off.y - already.y }
      sim.pendingCorrection = need.x || need.y ? need : null
    }
  } else if (ev.k === 'science') {
    if (!sim.scienceAtEarth.has(ev.target)) {
      sim.scienceAtEarth.add(ev.target)
      sim.points += sim.map.targets[ev.target]?.value ?? 0
    }
  } else if (ev.k === 'aegis') {
    if (!sim.aegisAtEarth.has(ev.bonus)) {
      sim.aegisAtEarth.add(ev.bonus)
      sim.points += 15
    }
  } else if (ev.k === 'done') {
    if (ev.seq === sim.uplinks.length) sim.earthKnowsIdle = true
  } else if (ev.k === 'stuck') {
    sim.terminalAtEarth = 'stuck'
  } else if (ev.k === 'dead') {
    sim.terminalAtEarth = 'dead'
  }
}

/** Advance one tick. Returns Earth arrivals delivered this tick. */
export function tick(sim: Sim): Arrival[] {
  const r = sim.rover
  sim.t = Math.round((sim.t + DT) * 1000) / 1000
  deliverUplinks(sim)

  // Rover acts.
  if (r.status !== 'stuck' && r.status !== 'dead') {
    if (r.act) {
      r.act.el += DT
      if (r.act.el >= r.act.dur - 1e-9) {
        finishAction(sim)
        const st = r.status as RoverStatus
        if (!r.act && (r.cur || r.plan.length) && st !== 'stuck') nextAction(sim)
        else if (!r.act && !r.cur && r.plan.length === 0 && st !== 'stuck' && st !== 'fault' && st !== 'idle') endSequence(sim, false)
      }
    }
    // Energy.
    if (sim.tier.legend) {
      const clock = clockAt(sim, sim.t)
      const net = solarW(clock) - loadW(r) - heaterW(clock)
      r.wh = Math.min(CAPACITY_WH, r.wh + (net * DT) / 60)
      sim.stats.minWhPct = Math.min(sim.stats.minWhPct, (r.wh / CAPACITY_WH) * 100)
      if (r.wh <= 0) {
        r.wh = 0
        r.status = 'dead'
        r.act = null
        r.plan = []
        r.cur = null
        emit(sim, { k: 'dead' })
      }
    }
  }
  relay(sim)
  sim.snaps.push(snapOf(r))

  const out: Arrival[] = []
  const pending = sim.arrivals.filter((a) => a.at <= sim.t && !sim.delivered.includes(a))
  pending.sort((a, b) => a.at - b.at)
  for (const a of pending) {
    receive(sim, a)
    out.push(a)
  }
  return out
}

/** What Earth currently sees of the rover: telemetry from `delay` minutes ago. */
export function earthSnap(sim: Sim, frac = 0): Snap {
  const tt = Math.max(0, sim.t + frac * DT - sim.tier.delay)
  const i = Math.min(sim.snaps.length - 1, Math.floor(tt / DT))
  const a = sim.snaps[Math.max(0, i)]
  const b = sim.snaps[Math.min(sim.snaps.length - 1, i + 1)]
  const f = tt / DT - i
  if (!b || f <= 0) return a
  const dh = ((b.h - a.h + 12) % 8) - 4
  return { ...a, x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, ex: a.ex + (b.ex - a.ex) * f, ey: a.ey + (b.ey - a.ey) * f, h: a.h + dh * f }
}

/** The rover's live (true) snapshot — only revealed after the round. */
export function marsSnap(sim: Sim): Snap {
  return sim.snaps[sim.snaps.length - 1]
}

/** Earth's best guess of where the rover is (telemetry + newest photo fix). */
export function earthBestPose(sim: Sim): { x: number; y: number; h: number } {
  const s = earthSnap(sim)
  const c = sim.pendingCorrection
  return { x: Math.round(s.ex) + (c?.x ?? 0), y: Math.round(s.ey) + (c?.y ?? 0), h: Math.round(s.h + 8) % 8 }
}

// ── plan preview (what Earth expects, using only the orbital map) ─────────

export interface PreviewStep {
  x: number
  y: number
  bad: null | 'rock' | 'tilt' | 'edge' | 'dune' | 'known-rock'
}

export interface Preview {
  cells: PreviewStep[]
  end: { x: number; y: number; h: number }
  issue: string | null
  sciOnTarget: boolean[]
}

export function previewPlan(sim: Sim, cmds: Cmd[]): Preview {
  const m = sim.map
  const p = earthBestPose(sim)
  let { x, y, h } = p
  const cells: PreviewStep[] = [{ x, y, bad: null }]
  let issue: string | null = null
  const sciOnTarget: boolean[] = []
  outer: for (const c of cmds) {
    if (c.k === 'turn') h = (h + c.d + 80) % 8
    else if (c.k === 'fwd') {
      for (let s = 0; s < c.n; s++) {
        const nx = x + DIRS[h][0]
        const ny = y + DIRS[h][1]
        let bad: PreviewStep['bad'] = null
        if (!inside(m, nx, ny)) bad = 'edge'
        else {
          const i = idx(m, nx, ny)
          if (m.rock[i]) bad = 'rock'
          else if (sim.knownRocks.has(i)) bad = 'known-rock'
          else if (m.steep[i]) bad = 'tilt'
          else if (m.dune[i]) bad = 'dune'
        }
        if (bad) {
          cells.push({ x: nx, y: ny, bad })
          issue =
            bad === 'edge'
              ? 'This drive leaves the map.'
              : bad === 'dune'
                ? 'This drive ends in deep sand — the rover would get stuck!'
                : bad === 'tilt'
                  ? 'This drive climbs a slope that is too steep.'
                  : 'This drive hits a rock.'
          break outer
        }
        x = nx
        y = ny
        cells.push({ x, y, bad: null })
      }
    } else if (c.k === 'sci') {
      sciOnTarget.push(m.targets.some((t) => t.x === x && t.y === y))
    } else if (c.k === 'goto') {
      const t = m.targets[c.target]
      if (t) {
        x = t.x
        y = t.y
        cells.push({ x, y, bad: null })
      }
    }
  }
  return { cells, end: { x, y, h }, issue, sciOnTarget }
}

// ── scoring and the debrief ───────────────────────────────────────────────

export interface Outcome {
  won: boolean
  stars: number
  score: number
  scoreLabel: string
  lowerIsBetter: boolean
  message: string
  why: string[]
}

export function isOver(sim: Sim): boolean {
  if (sim.terminalAtEarth === 'dead') return true
  // A stuck rover still has its radio (Spirit sent science home for months
  // after it got stuck), so in Legend the relay passes carry on to sunset.
  if (sim.terminalAtEarth === 'stuck' && !sim.tier.legend) return true
  if (sim.t >= sim.tier.timeLimit) return true
  if (!sim.tier.legend && sim.scienceAtEarth.size >= sim.map.targets.length) return true
  return false
}

export function evaluate(sim: Sim): Outcome {
  const tier = sim.tier
  const uplinks = sim.uplinks.length
  const why: string[] = []
  const st = sim.stats
  const d = tier.delay
  const waitMin = uplinks * 2 * d
  if (st.faults.rock) why.push(`The rover stopped ${st.faults.rock}× for a rock in its path. A real rover stops and waits for Earth when something is wrong — and each wait costs a ${2 * d}-minute round trip.`)
  if (st.faults.tilt) why.push(`It refused a slope that was too steep ${st.faults.tilt}×. Rovers have a tilt limit so they never roll over.`)
  if (st.faults.edge) why.push('A drive would have left the mapped area, so the rover stopped.')
  if (st.faults.blocked || st.faults.noroute) why.push('Its cameras found no safe way through, so it stopped and called home.')
  if (sim.rover.status === 'stuck') why.push('It drove into deep sand and dug itself in. Wheels spin, rover sinks — the real rover Spirit got stuck like this in 2009 and never drove again.')
  if (sim.rover.status === 'stuck' && tier.legend)
    why.push('A stuck rover still has its radio, so the relay passes kept carrying its data home. Spirit sent science back for about ten months after it got stuck.')
  if (st.slips > 0 && !st.slipsCaught)
    why.push(`Loose sand made the wheels slip ${st.slips}×. The wheels turned but the rover did not move, so its wheel-count (dead reckoning) said it had gone further than it really had.`)
  if (st.slipsCaught > 0) why.push(`Visual odometry caught ${st.slipsCaught} wheel slips by comparing camera pictures, so the rover kept driving until it had really arrived.`)
  if (st.avoids > 0) why.push(`Hazard avoidance steered around ${st.avoids} rock${st.avoids > 1 ? 's' : ''} on its own — no need to wait ${2 * d} minutes for Earth.`)
  if (st.sciMiss > 0) why.push(`Science ran ${st.sciMiss}× on the wrong spot. Science only works with the rover parked ON the target square: the arm reaches just the ground at its front wheels.`)
  if (sim.photos.length && !tier.legend && st.slips > 0 && !st.slipsCaught) why.push('The pictures showed where the rover REALLY was — that is how mission teams find out about slip.')
  if (uplinks > 0) why.push(`You sent ${uplinks} plan${uplinks > 1 ? 's' : ''}. Each one costs at least ${2 * d} minutes of waiting for signals (${d} there, ${d} back): ${waitMin} minutes in total.`)

  if (!tier.legend) {
    const won = sim.scienceAtEarth.size >= sim.map.targets.length
    if (!won) {
      const reason =
        sim.rover.status === 'stuck'
          ? 'The rover is stuck in deep sand. Plan routes around the dark dunes — no rover can drive out of soft sand that deep.'
          : sim.rover.sampled.size > 0
            ? 'The sample was taken but its data did not reach Earth before time ran out.'
            : `Time ran out. With a ${d}-minute delay each way, every extra plan is expensive — try to plan the whole route in one go.`
      return { won: false, stars: 0, score: Math.round(sim.t), scoreLabel: 'mission min', lowerIsBetter: true, message: reason, why }
    }
    const [s3, s2] = tier.starUplinks
    const stars = uplinks <= s3 ? 3 : uplinks <= s2 ? 2 : 1
    const msg =
      stars === 3
        ? `Science data received after ${Math.round(sim.t)} mission minutes with ${uplinks} plan${uplinks > 1 ? 's' : ''}. Planning ahead beat the ${d}-minute delay!`
        : `Science data received! It took ${uplinks} plans — fewer plans means less time waiting for signals. Try to get it right in ${s3}.`
    return { won: true, stars, score: Math.round(sim.t), scoreLabel: 'mission min', lowerIsBetter: true, message: msg, why }
  }

  // Legend: points.
  const pct = (sim.rover.wh / CAPACITY_WH) * 100
  const energyBonus = sim.rover.status === 'dead' ? 0 : Math.round(Math.max(0, pct - 25) * 0.6)
  const nightRisk = sim.rover.status !== 'dead' && pct < 25
  const total = sim.points + energyBonus - (nightRisk ? 20 : 0)
  const unsent = sim.downlinkQueue.length
  if (unsent) why.push(`${unsent} data item${unsent > 1 ? 's were' : ' was'} still waiting on the rover when the last relay pass ended. The passes carry only 40, 60 and 40 MB, and only data that reaches Earth counts.`)
  if (sim.rover.status === 'dead') why.push('The battery ran flat and the rover went into safe mode. In the cold early morning the heaters use power and the Sun is weak, so driving straight away drains the battery fast. A Wait at dawn, or the Power guard rule, lets the Sun do the work.')
  if (nightRisk) why.push(`The battery ended at ${Math.round(pct)}%. The heaters need energy to survive the −80 °C night, so finishing below 25% costs points.`)
  if (st.parked) why.push('Late in the day the Sun was too low to charge, so the power guard parked the rover to save energy for the night.')
  if (st.charges) why.push(`The power guard stopped to charge ${st.charges}× — it kept the rover alive.`)
  if (sim.aegisAtEarth.size) why.push(`AEGIS found ${sim.aegisAtEarth.size} bonus rock${sim.aegisAtEarth.size > 1 ? 's' : ''} by itself while driving — real science done with no human in the loop.`)
  const [s3, s2, par] = legendStarLines(sim.map.no)
  const stars = sim.rover.status === 'dead' || total <= 0 || sim.scienceAtEarth.size === 0 ? 0 : total >= s3 ? 3 : total >= s2 ? 2 : 1
  if (stars > 0 && stars < 3) why.push(`★★★ on this map needs ${s3} points. Our best computer plan scored ${par} — try a different target order, or time your drives for the Sun and the relay passes.`)
  const msg =
    stars === 0
      ? sim.rover.status === 'dead'
        ? 'Low-power safe mode: the rover had to stop everything to stay alive. Watch the Sun and the battery!'
        : sim.rover.status === 'stuck'
          ? 'The rover got stuck in deep sand before any science reached Earth. AutoNav 🧭 steers around the dunes on the orbital map, but a ▲ drive goes exactly where you point it.'
          : 'No science reached Earth this sol. Sample a target and make sure its data fits in a relay pass.'
      : `${sim.scienceAtEarth.size} of ${sim.map.targets.length} targets' data reached Earth${sim.aegisAtEarth.size ? ` plus ${sim.aegisAtEarth.size} AEGIS find${sim.aegisAtEarth.size > 1 ? 's' : ''}` : ''}, battery ${Math.round(pct)}%.`
  return { won: stars > 0, stars, score: total, scoreLabel: 'science pts', lowerIsBetter: false, message: msg, why }
}

/** Legend: let the sol run to its end (last relay pass + light time). */
export function runToEnd(sim: Sim): Arrival[] {
  const out: Arrival[] = []
  let n = 0
  while (sim.t < sim.tier.timeLimit && sim.terminalAtEarth !== 'dead' && n++ < 100000) out.push(...tick(sim))
  return out
}
