// components/kids/games/robot-city/crossing.ts
// CADET — Crossing Patrol. A pavement delivery robot carries a parcel across
// three kinds of road crossing:
//   1. a signal crossing (traffic lights with a walk signal),
//   2. a zebra crossing (cars give way to someone ON the crossing — if they can stop),
//   3. a plain road with no crossing at all (wait for a safe gap both ways).
// The robot waits at each kerb; the child decides when it crosses.
//
// The model underneath is real kinematics. Every car has a STOPPING DISTANCE:
//   stopping distance = reaction distance + braking distance
//                     = v × t_react     + v² / (2 × a)
// so it grows with the SQUARE of speed. Before the robot steps off the kerb we
// work out, for every car, whether it will reach the robot's path while the
// robot is still in its lane. If so, the car must brake; how hard it must brake
// decides whether that was fine, a hard brake, or a near miss. Cars never hit
// the robot (it is a children's game) — a near miss is the failure.
//
// Seeded traffic, fixed time step: the same choices give the same result.
// Pure logic: no React, no DOM.

import { rng } from './shared'

export const WORLD_W = 72 // m
export const WORLD_H = 50 // m
export const PATH_Y = 25 // the pavement line the robot follows (middle of the map)
export const ROBOT_R = 0.45
export const ROBOT_SPEED = 1.6 // m/s — pavement robots drive at about walking pace (≈ 6 km/h)
export const CAR_LEN = 4.2
export const CAR_W = 1.8
export const LANE_W = 3.5
export const ROAD_W = LANE_W * 2
export const T_REACT = 1.0 // s, the human drivers in this city
export const A_COMFORT = 3.5 // m/s², an ordinary stop
export const A_HARD = 8 // m/s², an emergency stop on a dry road
export const TIME_LIMIT = 120 // s
export const START_X = 3
export const DOOR_X = 68.5

export type RoadKind = 'signal' | 'zebra' | 'plain'

export interface Road {
  id: number
  kind: RoadKind
  name: string
  cx: number
  /** Speed limit / cruising speed of the cars, m/s. */
  v0: number
}

export const ROADS: Road[] = [
  { id: 0, kind: 'signal', name: 'Signal crossing', cx: 17, v0: 30 / 3.6 },
  { id: 1, kind: 'zebra', name: 'Zebra crossing', cx: 37, v0: 30 / 3.6 },
  { id: 2, kind: 'plain', name: 'Road with no crossing', cx: 57, v0: 40 / 3.6 },
]

/** Stopping distance (m) from speed v (m/s). */
export function stopDistance(v: number, tReact = T_REACT, a = A_COMFORT): number {
  return v * tReact + (v * v) / (2 * a)
}

// ── Traffic lights on road 0 (cars' view, then the walk signal) ─────────────
export const CYCLE = { carGreen: 10, amber: 3, allRed1: 1, walk: 6, flash: 3, allRed2: 1 }
export const CYCLE_LEN = CYCLE.carGreen + CYCLE.amber + CYCLE.allRed1 + CYCLE.walk + CYCLE.flash + CYCLE.allRed2
export type CarLight = 'green' | 'amber' | 'red'
export type WalkLight = 'walk' | 'flash' | 'dont'

export function lights(t: number): { car: CarLight; walk: WalkLight; walkLeft: number } {
  // Start part-way through the car green so the first walk comes quickly.
  let c = (t + 4) % CYCLE_LEN
  if (c < CYCLE.carGreen) return { car: 'green', walk: 'dont', walkLeft: 0 }
  c -= CYCLE.carGreen
  if (c < CYCLE.amber) return { car: 'amber', walk: 'dont', walkLeft: 0 }
  c -= CYCLE.amber
  if (c < CYCLE.allRed1) return { car: 'red', walk: 'dont', walkLeft: 0 }
  c -= CYCLE.allRed1
  if (c < CYCLE.walk) return { car: 'red', walk: 'walk', walkLeft: CYCLE.walk - c }
  c -= CYCLE.walk
  if (c < CYCLE.flash) return { car: 'red', walk: 'flash', walkLeft: 0 }
  return { car: 'red', walk: 'dont', walkLeft: 0 }
}

// ── Cars ───────────────────────────────────────────────────────────────────
export interface Car {
  id: number
  road: number
  /** +1 drives down the screen (left lane), −1 drives up (right lane). */
  dir: 1 | -1
  /** Distance travelled from the spawn point to the FRONT bumper, m. */
  p: number
  v: number
  v0: number
  colour: string
  /** A point (p of the front bumper) it must stop at, or null. */
  stopAt: number | null
  /** Why it is stopping (for the picture). */
  stopFor: 'light' | 'robot' | 'queue' | null
  /** Decided at amber: true = stop at the line, false = carry on through. */
  amberStop: boolean | null
  /** Max braking it is using right now. */
  brake: number
  flash: number
}

const COLOURS = ['#E2E8F0', '#38BDF8', '#F87171', '#FBBF24', '#A3E635', '#F472B6', '#94A3B8', '#2DD4BF']

/** Lane centre x of a road for a direction. Cars drive on the right-hand side of the road: a car heading down the screen uses the lane on the screen's left (its own right). */
export function laneX(road: Road, dir: 1 | -1): number {
  return road.cx + (dir === 1 ? -LANE_W / 2 : LANE_W / 2)
}

/** p where the car's front reaches the robot's path strip (path edge closest to the car). */
export function pathEntryP(dir: 1 | -1): number {
  const spawnY = dir === 1 ? -6 : WORLD_H + 6
  const edge = dir === 1 ? PATH_Y - 1.1 : PATH_Y + 1.1
  return Math.abs(edge - spawnY)
}
export const PATH_DEPTH = 2.2

/** Car body y range on screen. */
export function carY(c: Car): { front: number; back: number } {
  const spawnY = c.dir === 1 ? -6 : WORLD_H + 6
  const front = spawnY + c.dir * c.p
  return { front, back: front - c.dir * CAR_LEN }
}

export interface Event {
  t: number
  kind: 'near-miss' | 'hard-brake' | 'red-man'
  road: number
  text: string
}

export type RobotState = 'walk' | 'wait' | 'cross' | 'done'

export interface CrossingState {
  t: number
  seed: number
  robotX: number
  robot: RobotState
  /** Index of the next road to cross (0..3). */
  next: number
  cars: Car[]
  /** Pre-rolled spawn times per [road][laneIdx]. */
  schedule: number[][][]
  spawnIdx: number[][]
  nextId: number
  events: Event[]
  /** How long the robot waited at each kerb. */
  waited: number[]
  /** Cars that slowed down calmly for the robot on the zebra (good!). */
  gaveWay: number
  timeUp: boolean
  flash: { text: string; kind: 'good' | 'warn' | 'bad'; ttl: number } | null
}

export function roadLeft(r: Road) {
  return r.cx - ROAD_W / 2
}
export function roadRight(r: Road) {
  return r.cx + ROAD_W / 2
}
/** Where the robot stops on the kerb before road r. */
export function kerbX(r: Road) {
  return roadLeft(r) - ROBOT_R - 0.15
}

function buildSchedule(seed: number): number[][][] {
  const r = rng(seed)
  return ROADS.map((road) =>
    [0, 1].map((lane) => {
      const out: number[] = []
      // Plain road: steady traffic with gaps, some long enough to cross.
      const minGap = road.kind === 'plain' ? 2.2 : 2.6
      const spread = road.kind === 'plain' ? 6.5 : 6
      let t = r() * 3 + (lane ? 1.2 : 0)
      while (t < TIME_LIMIT + 20) {
        out.push(t)
        let gap = minGap + r() * spread
        // Bunch cars sometimes (platoons), as real traffic does.
        if (r() < 0.3) gap = 1.6 + r() * 0.8
        t += gap
      }
      return out
    }),
  )
}

export function makeCrossing(seed = 20261126): CrossingState {
  return {
    t: 0,
    seed,
    robotX: START_X,
    robot: 'walk',
    next: 0,
    cars: [],
    schedule: buildSchedule(seed),
    spawnIdx: ROADS.map(() => [0, 0]),
    nextId: 1,
    events: [],
    waited: [0, 0, 0],
    gaveWay: 0,
    timeUp: false,
    flash: null,
  }
}

/** When (from now) the robot is inside the lane of a road with direction dir, if it crosses at full speed starting now. */
function robotLaneWindow(s: CrossingState, road: Road, dir: 1 | -1): [number, number] {
  const lx = laneX(road, dir)
  const enterX = lx - LANE_W / 2 - ROBOT_R
  const exitX = lx + LANE_W / 2 + ROBOT_R
  const tin = Math.max(0, (enterX - s.robotX) / ROBOT_SPEED)
  const tout = Math.max(0, (exitX - s.robotX) / ROBOT_SPEED)
  return [tin, tout]
}

/**
 * The robot is crossing (or about to). Does this car reach the robot's path
 * while the robot is still in its lane? If so it must stop, and how hard it has
 * to brake tells us whether the crossing was safe.
 */
function resolveConflict(s: CrossingState, car: Car, road: Road, stepping: boolean) {
  if (s.robot !== 'cross' || ROADS[s.next]?.id !== road.id) return
  const [tin, tout] = robotLaneWindow(s, road, car.dir)
  if (tout <= 0) return
  const entry = pathEntryP(car.dir)
  const dist = entry - car.p
  if (car.p - CAR_LEN > entry + PATH_DEPTH) return // already past
  if (road.kind === 'signal' && car.amberStop) return // already stopping at the red light
  // A car further along this lane already stops for the robot: this one just queues behind it.
  if (s.cars.some((o) => o !== car && o.road === car.road && o.dir === car.dir && o.p > car.p && o.stopFor === 'robot')) return
  if (dist <= 0) {
    // Inside the path strip right now while the robot comes: the robot's own
    // sensors would stop it; count it as a near miss.
    if (tin < 0.8) addEvent(s, 'near-miss', road.id, 'A car was already on the crossing!')
    return
  }
  const v = Math.max(0.1, car.v)
  const ta = car.stopAt !== null && car.stopAt <= entry ? Infinity : dist / v
  const tb = (dist + PATH_DEPTH + CAR_LEN) / v
  const overlap = ta < tout + 0.4 && tb > tin - 0.3
  if (!overlap) return
  // It must stop before the path.
  const stopP = entry - 0.6
  const react = road.kind === 'zebra' && !stepping ? 0 : v * 0.75 // on a zebra drivers watch for people
  const room = stopP - car.p - react
  const need = room <= 0.05 ? Infinity : (v * v) / (2 * room)
  car.stopAt = stopP
  car.stopFor = 'robot'
  if (need <= A_COMFORT + 0.5) {
    if (road.kind === 'zebra') s.gaveWay++
    car.brake = Math.max(A_COMFORT, need)
  } else if (need <= A_HARD) {
    car.brake = need
    car.flash = 1.2
    addEvent(s, 'hard-brake', road.id, 'A car had to brake hard!')
  } else {
    car.brake = 30 // the picture freezes the car just short of the robot
    car.flash = 2
    addEvent(s, 'near-miss', road.id, 'Near miss! That car could not stop in time.')
  }
}

function addEvent(s: CrossingState, kind: Event['kind'], road: number, text: string) {
  s.events.push({ t: s.t, kind, road, text })
  s.flash = { text, kind: kind === 'near-miss' ? 'bad' : 'warn', ttl: 2.2 }
}

/** The child presses GO at a kerb. */
export function goCross(s: CrossingState): boolean {
  if (s.robot !== 'wait') return false
  const road = ROADS[s.next]
  s.robot = 'cross'
  if (road.kind === 'signal') {
    const L = lights(s.t)
    if (L.walk !== 'walk') addEvent(s, 'red-man', road.id, L.walk === 'flash' ? 'The walk signal was flashing — too late to start.' : 'That was the red “don’t walk” signal!')
  }
  const lane = s.cars.filter((c) => c.road === road.id).sort((a, b) => b.p - a.p)
  for (const c of lane) resolveConflict(s, c, road, true)
  return true
}

function spawn(s: CrossingState) {
  ROADS.forEach((road, ri) => {
    ;([1, -1] as const).forEach((dir, li) => {
      const list = s.schedule[ri][li]
      while (s.spawnIdx[ri][li] < list.length && list[s.spawnIdx[ri][li]] <= s.t) {
        s.spawnIdx[ri][li]++
        // Do not spawn on top of a queued car.
        const last = s.cars.filter((c) => c.road === ri && c.dir === dir).reduce<Car | null>((m, c) => (m === null || c.p < m.p ? c : m), null)
        if (last && last.p < CAR_LEN + 3) continue
        const car: Car = {
          id: s.nextId++,
          road: ri,
          dir,
          p: 0,
          v: road.v0,
          v0: road.v0 * (0.94 + ((s.nextId * 37) % 11) / 100),
          colour: COLOURS[(s.nextId * 5) % COLOURS.length],
          stopAt: null,
          stopFor: null,
          amberStop: null,
          brake: A_COMFORT,
          flash: 0,
        }
        car.v = car.v0
        s.cars.push(car)
        resolveConflict(s, car, road, false)
      }
    })
  })
}

export function stepCrossing(s: CrossingState, dt: number) {
  if (s.robot === 'done' || s.timeUp) return
  s.t += dt
  if (s.flash) {
    s.flash.ttl -= dt
    if (s.flash.ttl <= 0) s.flash = null
  }
  spawn(s)
  const L = lights(s.t)

  // ── Robot ──
  if (s.robot === 'walk') {
    const road = ROADS[s.next]
    const target = road ? kerbX(road) : DOOR_X
    s.robotX = Math.min(target, s.robotX + ROBOT_SPEED * dt)
    if (s.robotX >= target - 1e-6) {
      if (road) s.robot = 'wait'
      else s.robot = 'done'
    }
  } else if (s.robot === 'wait') {
    s.waited[s.next] += dt
  } else if (s.robot === 'cross') {
    const road = ROADS[s.next]
    s.robotX += ROBOT_SPEED * dt
    if (s.robotX >= roadRight(road) + ROBOT_R + 0.15) {
      s.robot = 'walk'
      s.next++
      // Cars that were waiting for the robot may go again.
      for (const c of s.cars) if (c.road === road.id && c.stopFor === 'robot') {
        c.stopAt = null
        c.stopFor = null
      }
    }
  }

  // ── Cars ──
  for (const road of ROADS) {
    for (const dir of [1, -1] as const) {
      const lane = s.cars.filter((c) => c.road === road.id && c.dir === dir).sort((a, b) => b.p - a.p)
      const entry = pathEntryP(dir)
      const stopLine = entry - 1.4
      lane.forEach((c, i) => {
        if (c.flash > 0) c.flash -= dt
        // Traffic light decision at amber (decided once per red phase).
        if (road.kind === 'signal') {
          if (L.car === 'green') c.amberStop = null
          else if (c.amberStop === null) {
            const d = stopLine - c.p
            c.amberStop = d >= stopDistance(c.v, T_REACT, A_COMFORT) * 0.8 || d > 0 && c.v < 0.5
            if (d < 0) c.amberStop = false
          }
        }
        let limitP = Infinity
        let decel = A_COMFORT
        if (road.kind === 'signal' && c.amberStop) limitP = Math.min(limitP, stopLine)
        if (c.stopAt !== null) {
          if (c.stopAt < limitP) decel = Math.max(decel, c.brake)
          limitP = Math.min(limitP, c.stopAt)
        }
        const ahead = i > 0 ? lane[i - 1] : null
        if (ahead) limitP = Math.min(limitP, ahead.p - CAR_LEN - 2)
        let vTarget = c.v0
        if (limitP < Infinity) {
          const room = limitP - c.p
          vTarget = Math.min(vTarget, room <= 0 ? 0 : Math.sqrt(2 * decel * room))
        }
        if (c.v < vTarget) c.v = Math.min(vTarget, c.v + 2.2 * dt)
        else c.v = Math.max(vTarget, c.v - Math.max(decel, 1) * dt * 1.6)
        let np = c.p + c.v * dt
        if (limitP < Infinity && np > limitP && c.p <= limitP + 0.05) {
          np = Math.max(c.p, limitP)
          c.v = Math.min(c.v, (np - c.p) / dt)
        }
        c.p = np
      })
    }
  }
  s.cars = s.cars.filter((c) => c.p < WORLD_H + 12 + CAR_LEN)

  if (s.t >= TIME_LIMIT && s.robot !== 'done') s.timeUp = true
}

export function nearMisses(s: CrossingState) {
  return s.events.filter((e) => e.kind === 'near-miss').length
}
export function hardBrakes(s: CrossingState) {
  return s.events.filter((e) => e.kind === 'hard-brake').length
}
export function redMen(s: CrossingState) {
  return s.events.filter((e) => e.kind === 'red-man').length
}

export function crossingStars(s: CrossingState): number {
  if (s.robot !== 'done') return 0
  // Stepping in front of a car that cannot stop, or starting on the "don't walk"
  // signal, fails the round however quickly the parcel arrived: safety first.
  if (nearMisses(s) > 0 || redMen(s) > 0) return 0
  if (hardBrakes(s) > 0) return 2
  return 3
}

export function crossingScore(s: CrossingState): number {
  if (s.robot !== 'done') return 0
  return Math.max(0, Math.round(1000 - nearMisses(s) * 300 - (hardBrakes(s) + redMen(s)) * 120 - Math.max(0, s.t - 40) * 4))
}
