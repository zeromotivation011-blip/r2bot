// components/kids/activities/templates/gear-train/logic.ts
// GEAR TRAIN — the child builds a train of gears between a motor and an
// output (a wheel, a winch, a fan) to hit a speed and/or torque target.
//
// The real physics (spur gears with the same tooth size, "module"):
//   - Two meshing gears turn in OPPOSITE directions.
//   - Speed ratio = teeth(driver) / teeth(driven): a small gear driving a big
//     one turns it slower; a big gear driving a small one turns it faster.
//   - Torque goes the other way: slower output = more turning force
//     (torque_out = torque_in × teeth(driven)/teeth(driver) × efficiency).
//   - Power (speed × torque) can only stay the same or drop — gears trade
//     speed for force, they never give both.
//   - In a simple CHAIN of gears, the middle gears are "idlers": they change
//     direction but not the overall ratio (only first and last count).
//   - In a COMPOUND train two gears share an axle, so ratios MULTIPLY — that is
//     how real gearboxes get 100:1 in a small box.
//
// Pure logic: no React, no DOM. Safe in Node (lib/kids/activities/verify.ts).

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'

/** A target range. Leave a side out for "at least" / "at most". */
export interface Range {
  min?: number
  max?: number
}

export interface Params {
  /**
   * 'chain'    — every gear meshes with the next (gears[0] is on the motor,
   *              the last one drives the output). Idlers flip direction only.
   *              Best for ages 5–10.
   * 'compound' — gears come in [driver, driven] PAIRS. Each pair is one mesh
   *              (one stage); the driven gear of a stage shares an axle with
   *              the driver of the next stage, so ratios multiply. Ages 11–17.
   */
  mode: 'chain' | 'compound'
  /** Motor shaft speed in revolutions per minute, e.g. 120 (hobby gearmotor) or 6000 (bare DC motor). */
  motorRpm: number
  /**
   * Motor torque in newton-centimetres (N·cm). Optional: needed only for a
   * torque target, or to show torque readouts. A small hobby motor is ~1–5 N·cm.
   */
  motorTorque?: number
  /** Tooth counts the child may use (unlimited copies of each). 2–8 sizes, each 6–120 teeth. */
  inventory: number[]
  /**
   * If set, the motor already has this pinion fitted and the child cannot
   * change gears[0]. It must be one of the inventory sizes.
   */
  motorGear?: number
  /**
   * Most gears the child may place, counting the motor gear.
   * chain: 2–6. compound: an even number 2–8 (1–4 stages).
   */
  maxGears: number
  /**
   * Fraction of torque kept at each mesh (0.5–1). 1 = ideal gears (ages 5–12);
   * real spur gears are ~0.95–0.98, so 0.95 teaches losses (ages 14–17).
   */
  efficiencyPerMesh?: number
  /** What the output must do. At least one of rpm / torque / direction. */
  target: {
    /** Output shaft speed in rpm. */
    rpm?: Range
    /** Output torque in N·cm (requires motorTorque). */
    torque?: Range
    /** Output turning the same way as the motor, or the opposite way. */
    direction?: 'same' | 'opposite'
  }
  /** What the output drives, for the picture and the feedback text. */
  output?: 'wheel' | 'winch' | 'fan' | 'arm' | 'clock-hand'
  /** Show the ratio maths (teeth ÷ teeth) under the gears. On for ages 11+. */
  showMath?: boolean
  /** Show the live output rpm/torque readout while building. Off = predict first, then run. */
  liveReadout?: boolean
}

/** The child's train: tooth counts in order (see Params.mode for how they mesh). */
export interface Answer {
  gears: number[]
}

export interface TrainResult {
  /** Overall speed ratio output/motor (e.g. 0.25 = four times slower). */
  speedRatio: number
  outputRpm: number
  /** Output torque in N·cm, or null when motorTorque is not given. */
  outputTorque: number | null
  meshes: number
  direction: 'same' | 'opposite'
  /** Per-gear signed rpm (negative = opposite to motor), same order as gears. */
  gearRpm: number[]
}

const round = (n: number, d = 2) => {
  const f = Math.pow(10, d)
  return Math.round(n * f) / f
}

/** Simulate a train. Assumes the answer shape was already checked. */
export function simulate(p: Params, gears: number[]): TrainResult {
  const eff = p.efficiencyPerMesh ?? 1
  const gearRpm: number[] = []
  let meshes = 0
  if (p.mode === 'chain') {
    let rpm = p.motorRpm
    gearRpm.push(rpm)
    for (let i = 1; i < gears.length; i++) {
      rpm = -rpm * (gears[i - 1] / gears[i])
      gearRpm.push(rpm)
      meshes++
    }
  } else {
    let rpm = p.motorRpm
    for (let i = 0; i < gears.length; i += 2) {
      gearRpm.push(rpm) // driver turns with its axle
      rpm = -rpm * (gears[i] / gears[i + 1])
      gearRpm.push(rpm)
      meshes++
    }
  }
  const out = gearRpm[gearRpm.length - 1] ?? p.motorRpm
  const speedRatio = out / p.motorRpm
  const outputTorque = p.motorTorque !== undefined ? (p.motorTorque / Math.abs(speedRatio)) * Math.pow(eff, meshes) : null
  return {
    speedRatio: Math.abs(speedRatio),
    outputRpm: Math.abs(out),
    outputTorque,
    meshes,
    direction: out >= 0 ? 'same' : 'opposite',
    gearRpm,
  }
}

function inRange(v: number, r: Range | undefined): boolean {
  if (!r) return true
  const eps = 1e-9
  if (r.min !== undefined && v < r.min - eps) return false
  if (r.max !== undefined && v > r.max + eps) return false
  return true
}

export function rangeText(r: Range, unit: string): string {
  if (r.min !== undefined && r.max !== undefined && r.min === r.max) return `exactly ${r.min} ${unit}`
  if (r.min !== undefined && r.max !== undefined) return `between ${r.min} and ${r.max} ${unit}`
  if (r.min !== undefined) return `at least ${r.min} ${unit}`
  return `at most ${r.max} ${unit}`
}

function shapeProblems(p: Params, gears: number[]): string[] {
  const out: string[] = []
  if (!Array.isArray(gears) || gears.length < 2) out.push('Place at least two gears: one on the motor and one on the output.')
  else {
    if (gears.length > p.maxGears) out.push(`Use at most ${p.maxGears} gears.`)
    if (p.mode === 'compound' && gears.length % 2 !== 0) out.push('In a compound train every stage needs two gears: a driver and a driven gear.')
    if (gears.some((g) => !p.inventory.includes(g))) out.push('Use only the gears in the tray.')
    if (p.motorGear !== undefined && gears[0] !== p.motorGear) out.push(`The motor already has a ${p.motorGear}-tooth gear fitted.`)
  }
  return out
}

function meets(p: Params, r: TrainResult): boolean {
  const t = p.target
  if (!inRange(r.outputRpm, t.rpm)) return false
  if (t.torque && (r.outputTorque === null || !inRange(r.outputTorque, t.torque))) return false
  if (t.direction && t.direction !== r.direction) return false
  return true
}

/** Every legal train (bounded search). Used by validate() and by the hint text. */
export function findSolutions(p: Params, limit = 1): number[][] {
  const found: number[][] = []
  const sizes = [...new Set(p.inventory)].sort((a, b) => a - b)
  const minLen = 2
  const step = p.mode === 'compound' ? 2 : 1
  const cur: number[] = []
  const rec = (len: number): boolean => {
    if (cur.length === len) {
      if (shapeProblems(p, cur).length === 0 && meets(p, simulate(p, cur))) {
        found.push([...cur])
        if (found.length >= limit) return true
      }
      return false
    }
    const choices = cur.length === 0 && p.motorGear !== undefined ? [p.motorGear] : sizes
    for (const g of choices) {
      cur.push(g)
      if (rec(len)) return true
      cur.pop()
    }
    return false
  }
  for (let len = minLen; len <= p.maxGears; len += step) {
    if (rec(len)) break
  }
  return found
}

/** Calls `visit` for every train the child could legally build, until it returns true. */
function forEachTrain(p: Params, visit: (gears: number[]) => boolean): void {
  const sizes = [...new Set(p.inventory)].sort((a, b) => a - b)
  const step = p.mode === 'compound' ? 2 : 1
  const cur: number[] = []
  const rec = (len: number): boolean => {
    if (cur.length === len) return shapeProblems(p, cur).length === 0 ? visit([...cur]) : false
    const choices = cur.length === 0 && p.motorGear !== undefined ? [p.motorGear] : sizes
    for (const g of choices) {
      cur.push(g)
      if (rec(len)) return true
      cur.pop()
    }
    return false
  }
  for (let len = 2; len <= p.maxGears; len += step) if (rec(len)) return
}

function validate(p: Params): string[] {
  const e: string[] = []
  if (p.mode !== 'chain' && p.mode !== 'compound') e.push('mode must be "chain" or "compound".')
  if (!(p.motorRpm > 0 && p.motorRpm <= 30000)) e.push('motorRpm must be between 0 and 30000.')
  if (p.motorTorque !== undefined && !(p.motorTorque > 0)) e.push('motorTorque must be positive.')
  if (!Array.isArray(p.inventory) || p.inventory.length < 2 || p.inventory.length > 8) e.push('inventory needs 2–8 gear sizes.')
  else if (p.inventory.some((g) => !Number.isInteger(g) || g < 6 || g > 120)) e.push('Every gear needs a whole number of teeth from 6 to 120.')
  if (p.motorGear !== undefined && !p.inventory.includes(p.motorGear)) e.push('motorGear must be one of the inventory sizes.')
  if (p.mode === 'chain' && !(Number.isInteger(p.maxGears) && p.maxGears >= 2 && p.maxGears <= 6)) e.push('chain maxGears must be 2–6.')
  if (p.mode === 'compound' && !(Number.isInteger(p.maxGears) && p.maxGears >= 2 && p.maxGears <= 8 && p.maxGears % 2 === 0))
    e.push('compound maxGears must be an even number 2–8.')
  if (p.efficiencyPerMesh !== undefined && !(p.efficiencyPerMesh >= 0.5 && p.efficiencyPerMesh <= 1)) e.push('efficiencyPerMesh must be 0.5–1.')
  const t = p.target
  if (!t || (!t.rpm && !t.torque && !t.direction)) e.push('target needs rpm, torque or direction.')
  for (const [name, r] of [
    ['rpm', t?.rpm],
    ['torque', t?.torque],
  ] as const) {
    if (!r) continue
    if (r.min === undefined && r.max === undefined) e.push(`target.${name} needs a min or a max.`)
    if (r.min !== undefined && r.max !== undefined && r.min > r.max) e.push(`target.${name}.min is above its max.`)
    if ((r.min ?? 0) < 0 || (r.max ?? 0) < 0) e.push(`target.${name} cannot be negative.`)
  }
  if (t?.torque && p.motorTorque === undefined) e.push('A torque target needs motorTorque.')
  if (e.length) return e
  // Combinatorial size guard (keeps verify fast and the UI sane).
  const sizes = new Set(p.inventory).size
  if (Math.pow(sizes, p.maxGears) > 1_000_000) e.push('Too many combinations: reduce inventory sizes or maxGears.')
  if (e.length) return e
  // Solvable, but not trivially: at least one legal train must miss the target.
  let good = 0
  let bad = 0
  forEachTrain(p, (g) => {
    if (meets(p, simulate(p, g))) good++
    else bad++
    return good > 0 && bad > 0
  })
  if (good === 0) e.push('Unsolvable: no train from this inventory meets the target.')
  else if (bad === 0) e.push('Trivial: every train the child can build meets the target, so the choice teaches nothing.')
  return e
}

function check(p: Params, a: Answer): CheckResult {
  const gears = a?.gears ?? []
  const shape = shapeProblems(p, gears)
  if (shape.length) return { correct: false, score: 0, feedback: shape[0] }
  const r = simulate(p, gears)
  const t = p.target
  const outName = p.output ?? 'output'
  const ratioText =
    p.mode === 'chain'
      ? `In a chain only the first and last gear set the speed: ${gears[0]} ÷ ${gears[gears.length - 1]} = ${round(r.speedRatio, 3)}, so the ${outName} turns at ${round(r.outputRpm, 1)} rpm.`
      : `Each stage multiplies: ${gears
          .reduce<string[]>((acc, g, i) => (i % 2 === 0 ? [...acc, `${g}/${gears[i + 1]}`] : acc), [])
          .join(' × ')} = ${round(r.speedRatio, 4)}, so the ${outName} turns at ${round(r.outputRpm, 1)} rpm.`

  const problems: string[] = []
  let partial = 0
  let parts = 0
  if (t.rpm) {
    parts++
    if (inRange(r.outputRpm, t.rpm)) partial++
    else if (t.rpm.max !== undefined && r.outputRpm > t.rpm.max)
      problems.push(
        `It spins too fast — the target is ${rangeText(t.rpm, 'rpm')}. To slow it down, make the driven gear bigger than the driver (small gear turning a big gear).`,
      )
    else
      problems.push(
        `It turns too slowly — the target is ${rangeText(t.rpm, 'rpm')}. To speed it up, let a BIG gear drive a SMALL one.`,
      )
  }
  if (t.torque) {
    parts++
    const tq = r.outputTorque ?? 0
    if (inRange(tq, t.torque)) partial++
    else if (t.torque.min !== undefined && tq < t.torque.min)
      problems.push(
        `It is not strong enough: ${round(tq, 1)} N·cm, but the job needs ${rangeText(t.torque, 'N·cm')}. Gears trade speed for force — gear DOWN (slower) to get more torque.${
          (p.efficiencyPerMesh ?? 1) < 1 ? ` Remember each mesh loses ${Math.round((1 - (p.efficiencyPerMesh ?? 1)) * 100)}% of the torque to friction.` : ''
        }`,
      )
    else problems.push(`Too much torque (${round(tq, 1)} N·cm) for this job — the target is ${rangeText(t.torque, 'N·cm')}. Gear up a little.`)
  }
  if (t.direction) {
    parts++
    if (t.direction === r.direction) partial++
    else
      problems.push(
        `The ${outName} turns the ${r.direction === 'same' ? 'same' : 'opposite'} way to the motor, but it must turn the ${t.direction} way. Every mesh flips the direction: you have ${r.meshes} mesh${r.meshes === 1 ? '' : 'es'}${
          p.mode === 'chain' ? ' — add or remove one idler gear in the middle (it flips direction without changing the speed).' : '.'
        }`,
      )
  }
  if (problems.length === 0) {
    const tq = r.outputTorque !== null ? ` and pushes with ${round(r.outputTorque, 1)} N·cm` : ''
    const lesson =
      r.speedRatio < 1
        ? 'Slower output, more turning force — the trade every robot gearbox makes.'
        : r.speedRatio > 1
          ? 'Faster output, less force — gearing up.'
          : 'Same speed — the gears only moved the motion somewhere else.'
    return { correct: true, score: 1, feedback: `${ratioText.replace(/\.$/, '')}${tq}. ${lesson}` }
  }
  return { correct: false, score: parts ? partial / parts : 0, feedback: `${ratioText} ${problems[0]}` }
}

export const logic: TemplateLogic<Params, Answer> = {
  id: 'gear-train',
  name: 'Gear Train',
  validate,
  check,
}
