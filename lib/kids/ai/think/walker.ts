// lib/kids/ai/think/walker.ts
// The Legend challenge of the Learning Robot: a two-legged walker that learns
// to shuffle forward by policy search. Physics-lite on purpose — light enough
// for a cheap phone — but the learning is real: the "policy" is five numbers
// that shape each leg's rhythm, and random hill-climbing keeps any change that
// walks further (the idea behind evolution strategies used on real robots).
//
// Model: each hip swings θ(t) = amp·sin(ωt + legPhase); each leg shortens
// (a knee bend) by lift·max(0, sin(ωt + legPhase + liftPhase)). The foot that
// reaches lowest is planted and does not slide, so the body moves opposite to
// the planted foot's swing. If both feet are equally low they drag, cancelling
// out. Lift the leg while it swings forward and the robot walks; lift it at
// the wrong moment and it walks backwards.

import { clamp, gauss } from './common'

export interface Gait {
  /** Hip swing, radians (0.05–0.8). */
  amp: number
  /** Phase between the two legs, radians (0–2π). */
  legPhase: number
  /** How much the knee folds, fraction of leg length (0–0.45). */
  lift: number
  /** When the knee folds relative to the hip swing, radians (0–2π). */
  liftPhase: number
  /** Steps per second (0.4–2.5 Hz). */
  freq: number
}

export const LEG = 0.5 // metres

export const RANDOM_START: Gait = { amp: 0.3, legPhase: 1.2, lift: 0.08, liftPhase: 4.2, freq: 0.8 }

export interface LegPose {
  /** Foot position relative to the hip, metres (x forward, y down). */
  fx: number
  fy: number
  theta: number
  len: number
}

export function legPose(g: Gait, t: number, leg: 0 | 1): LegPose {
  const ph = 2 * Math.PI * g.freq * t + (leg === 1 ? g.legPhase : 0)
  const theta = g.amp * Math.sin(ph)
  const len = LEG * (1 - g.lift * Math.max(0, Math.sin(ph + g.liftPhase)))
  return { fx: len * Math.sin(theta), fy: len * Math.cos(theta), theta, len }
}

export interface WalkFrame {
  t: number
  hipX: number
  hipY: number
  legs: [LegPose, LegPose]
  stance: 0 | 1 | 2 // 2 = both dragging
}

export const DT = 1 / 60

/** Simulate a gait for `seconds`. Returns the distance walked and (optionally) every frame. */
export function simulate(g: Gait, seconds: number, keepFrames: boolean): { distance: number; frames: WalkFrame[] } {
  let hipX = 0
  const frames: WalkFrame[] = []
  let prev: [LegPose, LegPose] = [legPose(g, 0, 0), legPose(g, 0, 1)]
  const n = Math.round(seconds / DT)
  for (let i = 1; i <= n; i++) {
    const t = i * DT
    const cur: [LegPose, LegPose] = [legPose(g, t, 0), legPose(g, t, 1)]
    const d0 = cur[0].fx - prev[0].fx
    const d1 = cur[1].fx - prev[1].fx
    const diff = cur[0].fy - cur[1].fy
    let stance: 0 | 1 | 2
    let dx: number
    if (Math.abs(diff) < 0.004) {
      stance = 2
      dx = -(d0 + d1) / 2
    } else if (diff > 0) {
      stance = 0
      dx = -d0
    } else {
      stance = 1
      dx = -d1
    }
    hipX += dx
    if (keepFrames) frames.push({ t, hipX, hipY: Math.max(cur[0].fy, cur[1].fy), legs: cur, stance })
    prev = cur
  }
  return { distance: hipX, frames }
}

export function clampGait(g: Gait): Gait {
  const wrap = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  return {
    amp: clamp(g.amp, 0.05, 0.8),
    legPhase: wrap(g.legPhase),
    lift: clamp(g.lift, 0, 0.45),
    liftPhase: wrap(g.liftPhase),
    freq: clamp(g.freq, 0.4, 2.5),
  }
}

/** One random change to every number; `size` (0..1) is how bold the change is. */
export function mutate(g: Gait, size: number, rng: () => number): Gait {
  return clampGait({
    amp: g.amp + gauss(rng) * 0.12 * size,
    legPhase: g.legPhase + gauss(rng) * 0.9 * size,
    lift: g.lift + gauss(rng) * 0.08 * size,
    liftPhase: g.liftPhase + gauss(rng) * 0.9 * size,
    freq: g.freq + gauss(rng) * 0.35 * size,
  })
}

export const WALK_SECONDS = 8
export const WALK_TARGET_M = 3
