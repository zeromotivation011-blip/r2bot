// components/kids/activities/templates/simple-machines/logic.ts
// SIMPLE MACHINES — a job (lift this load this high) that is too heavy to do
// by hand. The child picks a machine (ramp, pulley, lever, wheel-and-axle),
// tunes it with a slider, and the simulation shows whether the robot's push
// is strong enough and whether the rope/space runs out.
//
// The real physics (g = 9.81 m/s²; weight W = m·g):
//   ramp of length L to height h     effort = W·(sin θ + μ·cos θ), θ = asin(h/L);  push distance = L
//   pulley with n supporting strands effort = W / (n·η);                          pull distance = n·h
//   lever, load arm a, effort arm e  effort = W·a/e;                               push distance = h·e/a
//   wheel & axle, axle r, wheel R    effort = W·r/R;                               crank distance = h·R/r
// Every machine trades force for distance: effort × distance ≥ W × h (equal
// only without friction). No machine reduces the WORK — that is the lesson.
//
// Pure logic: no React, no DOM.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'

export const G = 9.81

export type MachineKind = 'ramp' | 'pulley' | 'lever' | 'wheel-axle'

/** One machine the child may choose, with the slider range for its setting. */
export interface MachineOption {
  kind: MachineKind
  /**
   * The slider. Units by kind:
   *   ramp        — ramp length in metres (must be longer than the height)
   *   pulley      — number of rope strands holding the load (whole numbers 1–8)
   *   lever       — effort-arm length in metres (load arm is Params.leverLoadArm)
   *   wheel-axle  — crank/wheel radius in centimetres (axle is Params.axleRadiusCm)
   */
  min: number
  max: number
  step: number
}

export interface Params {
  load: { mass: number; label: string; emoji?: string }
  /** How high the load must go, metres (0.1–20). */
  height: number
  /** The strongest push/pull the robot (or child) can make, in newtons. */
  maxEffort: number
  /** Longest distance the effort can travel (rope length, room to push), metres. Omit = unlimited. */
  maxDistance?: number
  /** Machines on offer (1–4, each kind at most once). */
  machines: MachineOption[]
  /** Ramp friction coefficient μ (0–0.8). 0 = ideal (ages 5–12); 0.1–0.3 is realistic for a box on a plank. */
  rampFriction?: number
  /** Pulley system efficiency η (0.5–1). 1 = ideal; real rope-and-pulley blocks are ~0.8–0.9. */
  pulleyEfficiency?: number
  /** Lever: distance from the pivot to the load, metres. Default 0.5. The load end can rise at most 2 × this, so `height` must not exceed it when a lever is offered. */
  leverLoadArm?: number
  /** Wheel & axle: radius of the drum the rope winds on, cm. Default 2. */
  axleRadiusCm?: number
  /**
   * 'works'          — any setting within the effort (and distance) limits passes.
   * 'least-distance' — among settings that work, pick one with the SHORTEST
   *                    effort distance (only just enough help). Ages 14–17.
   */
  goal?: 'works' | 'least-distance'
  /**
   * How forces are shown. 'kg' shows "kg of push" (force ÷ g) for ages 5–10;
   * 'newtons' shows N for ages 11–17. Checking is identical.
   */
  units?: 'kg' | 'newtons'
  /** Show the formula and the work (force × distance) line. */
  showMath?: boolean
}

export interface Answer {
  machine: MachineKind
  setting: number
}

export interface MachineResult {
  effort: number // N
  distance: number // m
  /** effort × distance / (W·h): 1 = no losses. */
  workRatio: number
  /** Mechanical advantage W / effort. */
  ma: number
}

const EPS = 1e-9

export function weight(p: Params): number {
  return p.load.mass * G
}

export function simulate(p: Params, a: Answer): MachineResult {
  const W = weight(p)
  const h = p.height
  let effort = W
  let distance = h
  switch (a.machine) {
    case 'ramp': {
      const L = a.setting
      const sin = Math.min(1, h / L)
      const cos = Math.sqrt(Math.max(0, 1 - sin * sin))
      effort = W * (sin + (p.rampFriction ?? 0) * cos)
      distance = L
      break
    }
    case 'pulley': {
      const n = a.setting
      effort = W / (n * (p.pulleyEfficiency ?? 1))
      distance = n * h
      break
    }
    case 'lever': {
      const la = p.leverLoadArm ?? 0.5
      effort = (W * la) / a.setting
      distance = (h * a.setting) / la
      break
    }
    case 'wheel-axle': {
      const r = p.axleRadiusCm ?? 2
      effort = (W * r) / a.setting
      distance = (h * a.setting) / r
      break
    }
  }
  return { effort, distance, workRatio: (effort * distance) / (W * h), ma: W / effort }
}

function onGrid(o: MachineOption, v: number): boolean {
  if (v < o.min - EPS || v > o.max + EPS) return false
  const k = (v - o.min) / o.step
  return Math.abs(k - Math.round(k)) < 1e-6
}

export function gridValues(o: MachineOption): number[] {
  const out: number[] = []
  const n = Math.floor((o.max - o.min) / o.step + 1e-6)
  for (let i = 0; i <= n; i++) out.push(Math.round((o.min + i * o.step) * 1e6) / 1e6)
  return out
}

function works(p: Params, r: MachineResult): boolean {
  if (r.effort > p.maxEffort + EPS) return false
  if (p.maxDistance !== undefined && r.distance > p.maxDistance + EPS) return false
  return true
}

/** The shortest effort distance of any working setting (for 'least-distance'), or null. */
export function bestDistance(p: Params): { answer: Answer; distance: number } | null {
  let best: { answer: Answer; distance: number } | null = null
  for (const o of p.machines)
    for (const v of gridValues(o)) {
      const a = { machine: o.kind, setting: v }
      const r = simulate(p, a)
      if (works(p, r) && (!best || r.distance < best.distance - EPS)) best = { answer: a, distance: r.distance }
    }
  return best
}

export function forceText(p: Params, n: number): string {
  const units = p.units ?? 'newtons'
  return units === 'kg' ? `${Math.round((n / G) * 10) / 10} kg of push` : `${Math.round(n)} N`
}

const NAMES: Record<MachineKind, string> = { ramp: 'ramp', pulley: 'pulley', lever: 'lever', 'wheel-axle': 'wheel and axle' }

function validate(p: Params): string[] {
  const e: string[] = []
  if (!p.load || !(p.load.mass > 0) || p.load.mass > 10000) e.push('load.mass must be 0–10000 kg.')
  if (!(p.height >= 0.1 && p.height <= 20)) e.push('height must be 0.1–20 m.')
  if (!(p.maxEffort > 0)) e.push('maxEffort must be positive.')
  if (p.maxDistance !== undefined && !(p.maxDistance > 0)) e.push('maxDistance must be positive.')
  if (!Array.isArray(p.machines) || p.machines.length < 1 || p.machines.length > 4) e.push('machines: 1–4 options.')
  if (p.rampFriction !== undefined && !(p.rampFriction >= 0 && p.rampFriction <= 0.8)) e.push('rampFriction must be 0–0.8.')
  if (p.pulleyEfficiency !== undefined && !(p.pulleyEfficiency >= 0.5 && p.pulleyEfficiency <= 1)) e.push('pulleyEfficiency must be 0.5–1.')
  if (p.leverLoadArm !== undefined && !(p.leverLoadArm > 0)) e.push('leverLoadArm must be positive.')
  if (p.axleRadiusCm !== undefined && !(p.axleRadiusCm > 0)) e.push('axleRadiusCm must be positive.')
  if (e.length) return e
  const kinds = new Set<string>()
  for (const o of p.machines) {
    if (kinds.has(o.kind)) e.push(`${o.kind} is listed twice.`)
    kinds.add(o.kind)
    if (!['ramp', 'pulley', 'lever', 'wheel-axle'].includes(o.kind)) e.push(`Unknown machine ${o.kind}.`)
    if (!(o.step > 0) || !(o.min > 0) || o.min > o.max) e.push(`${o.kind}: need 0 < min ≤ max and step > 0.`)
    else if (gridValues(o).length > 400) e.push(`${o.kind}: too many slider steps (max 400).`)
    if (o.kind === 'ramp' && o.min <= p.height) e.push('ramp.min must be longer than the height (a ramp shorter than the height is a wall).')
    if (o.kind === 'pulley' && (!Number.isInteger(o.min) || !Number.isInteger(o.max) || !Number.isInteger(o.step) || o.max > 8))
      e.push('pulley strands must be whole numbers, at most 8.')
  }
  // A lever's load end swings on an arc of radius leverLoadArm: it can rise at most 2 × that.
  if (kinds.has('lever') && p.height > 2 * (p.leverLoadArm ?? 0.5) + EPS)
    e.push(`lever: a ${p.leverLoadArm ?? 0.5} m load arm can raise its end at most ${2 * (p.leverLoadArm ?? 0.5)} m — lower the height or lengthen leverLoadArm.`)
  if (e.length) return e
  if (weight(p) <= p.maxEffort) e.push('Trivial: the robot can lift the load straight up, so no machine is needed.')
  const best = bestDistance(p)
  if (!best) e.push('Unsolvable: no machine setting meets the effort and distance limits.')
  else {
    const least = (p.goal ?? 'works') === 'least-distance'
    const every = p.machines.every((o) =>
      gridValues(o).every((v) => {
        const r = simulate(p, { machine: o.kind, setting: v })
        return works(p, r) && (!least || r.distance <= best.distance + 1e-6)
      }),
    )
    if (every) e.push('Trivial: every machine and every slider setting works, so the choice teaches nothing.')
  }
  return e
}

function check(p: Params, a: Answer): CheckResult {
  const o = p.machines.find((m) => m.kind === a?.machine)
  if (!o) return { correct: false, score: 0, feedback: 'Choose one of the machines on offer first.' }
  if (!onGrid(o, a.setting)) return { correct: false, score: 0, feedback: `Set the ${NAMES[o.kind]} with the slider.` }
  const r = simulate(p, a)
  const W = weight(p)
  const effTxt = forceText(p, r.effort)
  const limTxt = forceText(p, p.maxEffort)
  const dist = Math.round(r.distance * 100) / 100
  const trade = `Lifting straight up needs ${forceText(p, W)}; your ${NAMES[o.kind]} needs ${effTxt} but the robot must move ${dist} m instead of ${p.height} m.`
  if (r.effort > p.maxEffort + EPS) {
    const how =
      o.kind === 'ramp'
        ? 'Make the ramp longer — a gentler slope needs less push.'
        : o.kind === 'pulley'
          ? 'Use more rope strands — each strand carries part of the weight.'
          : o.kind === 'lever'
            ? 'Make the effort arm longer — a longer lever multiplies your push.'
            : 'Use a bigger wheel — a bigger crank turns the axle with less force.'
    return { correct: false, score: 0.3, feedback: `Too heavy: it needs ${effTxt}, but the robot can only give ${limTxt}. ${how}` }
  }
  if (p.maxDistance !== undefined && r.distance > p.maxDistance + EPS)
    return {
      correct: false,
      score: 0.5,
      feedback: `The robot is strong enough (${effTxt}), but it would have to move ${dist} m and there is only ${p.maxDistance} m of ${
        o.kind === 'pulley' || o.kind === 'wheel-axle' ? 'rope' : 'room'
      }. Less help means less distance — find the middle.`,
    }
  if ((p.goal ?? 'works') === 'least-distance') {
    const best = bestDistance(p)
    if (best && r.distance > best.distance + 1e-6)
      return {
        correct: false,
        score: 0.7,
        feedback: `It works, but the robot moves ${dist} m. An engineer would choose just enough help: a setting exists that needs only ${
          Math.round(best.distance * 100) / 100
        } m of movement while staying under ${limTxt}.`,
      }
  }
  const losses = r.workRatio > 1.005 ? ` Friction costs extra: the robot does ${Math.round((r.workRatio - 1) * 100)}% more work than the lift itself.` : ''
  return {
    correct: true,
    score: 1,
    feedback: `${trade} Machines trade force for distance: push × distance is never less than weight × height, so they never make the work smaller.${losses}`,
  }
}

export const logic: TemplateLogic<Params, Answer> = {
  id: 'simple-machines',
  name: 'Simple Machines',
  validate,
  check,
}
