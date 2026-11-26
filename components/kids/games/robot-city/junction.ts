// components/kids/games/robot-city/junction.ts
// ACE — Junction Timer. The child times the traffic lights of a busy
// crossroads: green time for the north–south road and for the east–west road,
// and whether the lights are "smart" (sensors in the road end a green early
// when nobody is waiting, up to the maximum you set).
//
// The model is a queue simulation used by real traffic engineers, simplified:
//   - Cars arrive at random (Poisson arrivals, seeded): north–south is busier.
//   - In each green, the queue discharges one car per SATURATION HEADWAY:
//     about 2.0 s for a human driver, 1.4 s for a connected self-driving car
//     that starts the moment the light changes (no "start-up" hesitation).
//   - The first car loses a start-up time (human 2.0 s, robot 0.6 s).
//   - Every phase change costs 3 s amber + 2 s all-red: "lost time" when no
//     one moves. Short cycles waste lots of lost time; long cycles make cars
//     wait through long reds. The best cycle balances the two (Webster, 1958).
// Score: average waiting time per car over 3 simulated minutes, with every
// car still queued at the end counted too, so starving one road never pays.
// Pure logic: no React, no DOM.

import { rng } from './shared'

export const SIM_T = 180 // s of traffic per test
export const DT = 0.1
export const AMBER = 3
export const ALL_RED = 2
export const LOST = AMBER + ALL_RED
export const MIN_GREEN = 5
/** Arrival rates, cars per second per approach. */
export const RATE = { N: 0.2, S: 0.18, E: 0.09, W: 0.08 }
export const HUMAN = { headway: 2.0, startup: 2.0 }
export const ROBOT = { headway: 1.4, startup: 0.6 }
export const GAP_OUT = 2.5 // s: a smart light ends the green when no car has crossed its sensor for this long
export const MAX_QUEUE_SHOWN = 14

export type Approach = 'N' | 'S' | 'E' | 'W'
export const APPROACHES: Approach[] = ['N', 'S', 'E', 'W']
export const PHASE_OF: Record<Approach, 0 | 1> = { N: 0, S: 0, E: 1, W: 1 }

export interface JunctionSettings {
  /** Green for north–south, s (max green when smart). */
  greenNS: number
  /** Green for east–west, s (max green when smart). */
  greenEW: number
  smart: boolean
  /** Share of self-driving cars, 0..1. */
  robotShare: number
}

export interface Vehicle {
  id: number
  arrive: number
  robot: boolean
}

export type Light = 'green' | 'amber' | 'red'

export interface JunctionFrame {
  t: number
  lightNS: Light
  lightEW: Light
  queues: Record<Approach, Vehicle[]>
  /** Cars currently crossing the box (for the picture). */
  crossing: { a: Approach; robot: boolean; age: number }[]
  served: number
}

export interface JunctionResult {
  frames: JunctionFrame[]
  served: number
  avgWait: number
  maxWait: number
  maxQueue: Record<Approach, number>
  leftAtEnd: number
  cycles: number
  cycleLen: number
  /** Share of green time when cars were actually crossing. */
  greenUse: number
}

interface ApproachState {
  queue: Vehicle[]
  nextDepart: number
  arrivals: Vehicle[]
  ai: number
}

function arrivals(seed: number, a: Approach, rate: number, robotShare: number): Vehicle[] {
  const r = rng(seed)
  const out: Vehicle[] = []
  let t = 0
  let id = 0
  for (;;) {
    t += -Math.log(1 - r()) / rate
    if (t > SIM_T) break
    out.push({ id: id++, arrive: t, robot: r() < robotShare })
  }
  return out.map((v) => ({ ...v, id: v.id * 4 + APPROACHES.indexOf(a) }))
}

export function runJunction(set: JunctionSettings, seed = 7, keepFrames = true): JunctionResult {
  const st: Record<Approach, ApproachState> = {
    N: { queue: [], nextDepart: 0, arrivals: arrivals(seed + 1, 'N', RATE.N, set.robotShare), ai: 0 },
    S: { queue: [], nextDepart: 0, arrivals: arrivals(seed + 2, 'S', RATE.S, set.robotShare), ai: 0 },
    E: { queue: [], nextDepart: 0, arrivals: arrivals(seed + 3, 'E', RATE.E, set.robotShare), ai: 0 },
    W: { queue: [], nextDepart: 0, arrivals: arrivals(seed + 4, 'W', RATE.W, set.robotShare), ai: 0 },
  }
  let phase: 0 | 1 = 0
  let stage: 'green' | 'amber' | 'red' = 'green'
  let stageT = 0
  let lastCross = 0
  let served = 0
  let waitSum = 0
  let maxWait = 0
  const maxQueue: Record<Approach, number> = { N: 0, S: 0, E: 0, W: 0 }
  const frames: JunctionFrame[] = []
  let crossing: JunctionFrame['crossing'] = []
  let cycles = 0
  let greenTime = 0
  let busyGreen = 0
  const green = () => (phase === 0 ? set.greenNS : set.greenEW)

  for (let t = 0; t < SIM_T; t += DT) {
    // arrivals
    for (const a of APPROACHES) {
      const s = st[a]
      while (s.ai < s.arrivals.length && s.arrivals[s.ai].arrive <= t) s.queue.push(s.arrivals[s.ai++])
    }
    // departures in green
    if (stage === 'green') {
      greenTime += DT
      let any = false
      for (const a of APPROACHES) {
        if (PHASE_OF[a] !== phase) continue
        const s = st[a]
        if (s.queue.length && t >= s.nextDepart) {
          const v = s.queue.shift()!
          const wait = Math.max(0, t - v.arrive)
          waitSum += wait
          maxWait = Math.max(maxWait, wait)
          served++
          any = true
          lastCross = t
          crossing.push({ a, robot: v.robot, age: 0 })
          s.nextDepart = t + (v.robot ? ROBOT.headway : HUMAN.headway)
        }
        if (s.queue.length) any = true
      }
      if (any) busyGreen += DT
    }
    // phase logic
    stageT += DT
    if (stage === 'green') {
      const g = green()
      const waitingHere = APPROACHES.some((a) => PHASE_OF[a] === phase && st[a].queue.length > 0)
      const waitingOther = APPROACHES.some((a) => PHASE_OF[a] !== phase && st[a].queue.length > 0)
      const gapOut = set.smart && stageT >= MIN_GREEN && !waitingHere && t - lastCross >= GAP_OUT && waitingOther
      if (stageT >= g || gapOut) {
        stage = 'amber'
        stageT = 0
      }
    } else if (stage === 'amber' && stageT >= AMBER) {
      stage = 'red'
      stageT = 0
    } else if (stage === 'red' && stageT >= ALL_RED) {
      phase = phase === 0 ? 1 : 0
      if (phase === 0) cycles++
      stage = 'green'
      stageT = 0
      // start-up loss for the first car of each queue
      for (const a of APPROACHES) {
        if (PHASE_OF[a] !== phase) continue
        const s = st[a]
        const first = s.queue[0]
        s.nextDepart = t + (first ? (first.robot ? ROBOT.startup : HUMAN.startup) : 0)
      }
    }
    for (const a of APPROACHES) maxQueue[a] = Math.max(maxQueue[a], st[a].queue.length)
    crossing = crossing.map((c) => ({ ...c, age: c.age + DT })).filter((c) => c.age < 2.4)
    if (keepFrames && Math.round(t / DT) % 2 === 0) {
      const lightNS: Light = phase === 0 ? (stage === 'green' ? 'green' : stage === 'amber' ? 'amber' : 'red') : 'red'
      const lightEW: Light = phase === 1 ? (stage === 'green' ? 'green' : stage === 'amber' ? 'amber' : 'red') : 'red'
      frames.push({
        t,
        lightNS,
        lightEW,
        queues: { N: st.N.queue.slice(0, MAX_QUEUE_SHOWN), S: st.S.queue.slice(0, MAX_QUEUE_SHOWN), E: st.E.queue.slice(0, MAX_QUEUE_SHOWN), W: st.W.queue.slice(0, MAX_QUEUE_SHOWN) },
        crossing,
        served,
      })
    }
  }
  // cars still waiting at the end count with the wait they have had so far
  let left = 0
  for (const a of APPROACHES)
    for (const v of st[a].queue) {
      left++
      const wait = SIM_T - v.arrive
      waitSum += wait
      maxWait = Math.max(maxWait, wait)
    }
  const total = served + left
  return {
    frames,
    served,
    avgWait: total ? waitSum / total : 0,
    maxWait,
    maxQueue,
    leftAtEnd: left,
    cycles,
    cycleLen: set.greenNS + set.greenEW + 2 * LOST,
    greenUse: greenTime ? busyGreen / greenTime : 0,
  }
}

/** Fairness rule: nobody should wait longer than this, s. */
export const MAX_WAIT_OK = 60
export const STAR3_AVG = 14
export const STAR2_AVG = 18
export const STAR1_AVG = 26

export function junctionStars(r: JunctionResult): number {
  if (r.avgWait <= STAR3_AVG && r.maxWait <= MAX_WAIT_OK) return 3
  if (r.avgWait <= STAR2_AVG && r.maxWait <= MAX_WAIT_OK * 1.25) return 2
  if (r.avgWait <= STAR1_AVG) return 1
  return 0
}
