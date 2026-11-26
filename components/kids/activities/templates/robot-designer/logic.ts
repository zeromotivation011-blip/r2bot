// components/kids/activities/templates/robot-designer/logic.ts
// ROBOT DESIGNER — a real engineering trade-off. A client has a job with
// constraints (budget, mass, terrain, battery life, abilities). The child
// picks parts slot by slot (drive, power, brain, sensors, tools…) and live
// gauges show cost, mass, power draw, runtime and payload margin.
//
// The physics/engineering underneath (simplified but true):
//   - Runtime (min) = battery energy (Wh) ÷ total power draw (W) × 60.
//   - The drive system has a rated payload: total robot mass must not exceed it.
//   - Every part adds mass AND draws power — a bigger battery adds runtime but
//     also mass. Sensors cost energy.
//   - Wheels/tracks/legs/props each work only on some terrains.
//   - A job needs certain abilities ("see obstacles", "grip", "waterproof").
//
// Difficulty: few slots + generous budget (ages 5–7, ~2 choices) → many slots,
// tight budget + mass + runtime targets where the obvious "best part" breaks
// another constraint (ages 14–17).
//
// Pure logic: no React, no DOM.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'

export interface Part {
  id: string
  name: string
  icon: string
  /** Price in coins (abstract currency, works worldwide). */
  cost: number
  /** Mass in kg. */
  massKg: number
  /** Average power draw in watts (0 for passive parts; batteries draw 0). */
  powerW: number
  /** Batteries: stored energy in watt-hours. */
  energyWh?: number
  /** Drives: the most total robot mass they can carry, kg. */
  payloadKg?: number
  /** Drives: terrains this drive can cross. */
  terrains?: string[]
  /** Abilities this part gives, e.g. 'see-obstacles', 'grip', 'waterproof', 'gps'. */
  gives?: string[]
  /** One-line note shown on the card (a true fact about this kind of part). */
  note?: string
}

export interface Slot {
  id: string
  /** e.g. "Drive", "Battery", "Sensors". */
  label: string
  /** How many parts must be picked here (default 1). 0 = optional slot. */
  min?: number
  /** At most this many (default 1). */
  max?: number
  parts: Part[]
}

export interface Params {
  /** The client brief, e.g. "A farm needs a robot to check crops in muddy fields." */
  brief: string
  /** Terrain the robot must cross, e.g. 'mud', 'sand', 'stairs', 'water', 'floor', 'air'. */
  terrain: string
  /** Human name for the terrain, e.g. "Muddy fields". */
  terrainLabel: string
  /** Max total cost in coins. */
  budget: number
  /** Max total mass, kg (omit for no limit — younger bands). */
  maxMassKg?: number
  /** Minimum runtime in minutes (omit for no limit). Needs a slot with a battery. */
  minRuntimeMin?: number
  /** Abilities the robot must have, matching Part.gives. */
  requires: string[]
  /** Human labels for abilities, e.g. { 'see-obstacles': 'See obstacles' }. */
  abilityLabels: Record<string, string>
  /** 1–6 slots. */
  slots: Slot[]
  /** Show live gauges while choosing (default true). Off (ages 14+) = compute it yourself, then test. */
  liveGauges?: boolean
}

export interface Answer {
  /** Chosen part ids (across all slots). */
  parts: string[]
}

export interface Totals {
  cost: number
  massKg: number
  powerW: number
  energyWh: number
  /** Infinity when nothing draws power; 0 with no battery. */
  runtimeMin: number
  payloadKg: number | null
  terrainOk: boolean
  abilities: Set<string>
  hasDrive: boolean
}

export function partsOf(p: Params, ids: string[]): Part[] {
  const all = p.slots.flatMap((s) => s.parts)
  return ids.map((id) => all.find((x) => x.id === id)).filter((x): x is Part => !!x)
}

export function totals(p: Params, ids: string[]): Totals {
  const ps = partsOf(p, ids)
  const sum = (f: (x: Part) => number) => ps.reduce((a, x) => a + f(x), 0)
  const powerW = sum((x) => x.powerW)
  const energyWh = sum((x) => x.energyWh ?? 0)
  const drives = ps.filter((x) => x.payloadKg !== undefined || x.terrains)
  const payloadKg = drives.length ? Math.min(...drives.map((x) => x.payloadKg ?? Infinity)) : null
  return {
    cost: sum((x) => x.cost),
    massKg: Math.round(sum((x) => x.massKg) * 1000) / 1000,
    powerW,
    energyWh,
    runtimeMin: powerW > 0 ? (energyWh / powerW) * 60 : energyWh > 0 ? Infinity : 0,
    payloadKg: payloadKg === Infinity ? null : payloadKg,
    terrainOk: drives.length > 0 && drives.every((d) => !d.terrains || d.terrains.includes(p.terrain)),
    abilities: new Set(ps.flatMap((x) => x.gives ?? [])),
    hasDrive: drives.length > 0,
  }
}

export interface Problem {
  kind: 'slot' | 'terrain' | 'payload' | 'budget' | 'mass' | 'runtime' | 'ability'
  text: string
}

export function problems(p: Params, ids: string[]): Problem[] {
  const out: Problem[] = []
  for (const s of p.slots) {
    const n = ids.filter((id) => s.parts.some((x) => x.id === id)).length
    const min = s.min ?? 1
    const max = s.max ?? 1
    if (n < min) out.push({ kind: 'slot', text: `Choose ${min === 1 ? 'a' : min} ${s.label.toLowerCase()} part${min === 1 ? '' : 's'}.` })
    if (n > max) out.push({ kind: 'slot', text: `Only ${max} ${s.label.toLowerCase()} part${max === 1 ? '' : 's'} fit.` })
  }
  if (out.length) return out
  const t = totals(p, ids)
  const drive = partsOf(p, ids).find((x) => x.terrains)
  if (!t.terrainOk) out.push({ kind: 'terrain', text: `${drive ? `${drive.name} can’t cross ${p.terrainLabel.toLowerCase()}` : 'The robot has no way to move'}. Pick a drive made for ${p.terrainLabel.toLowerCase()}.` })
  if (t.payloadKg !== null && t.massKg > t.payloadKg + 1e-9)
    out.push({ kind: 'payload', text: `The robot weighs ${r2(t.massKg)} kg but its drive can only carry ${r2(t.payloadKg)} kg — the motors would stall. Use lighter parts or a stronger drive.` })
  if (t.cost > p.budget) out.push({ kind: 'budget', text: `It costs ${t.cost} coins — ${t.cost - p.budget} over the budget of ${p.budget}. Swap an expensive part for a cheaper one that still does the job.` })
  if (p.maxMassKg !== undefined && t.massKg > p.maxMassKg + 1e-9) out.push({ kind: 'mass', text: `It weighs ${r2(t.massKg)} kg; the limit is ${p.maxMassKg} kg. Heavy batteries and tools add up fast.` })
  if (p.minRuntimeMin !== undefined && t.runtimeMin + 1e-9 < p.minRuntimeMin)
    out.push({
      kind: 'runtime',
      text: `The battery lasts ${Math.floor(t.runtimeMin)} minutes (${t.energyWh} Wh ÷ ${t.powerW} W × 60) but the job needs ${p.minRuntimeMin}. Use a bigger battery or parts that draw less power.`,
    })
  for (const need of p.requires)
    if (!t.abilities.has(need)) out.push({ kind: 'ability', text: `The job needs “${p.abilityLabels[need] ?? need}”, and no part you picked can do that.` })
  return out
}

const r2 = (x: number) => Math.round(x * 100) / 100

/** Every legal pick within each slot (respecting min/max). */
function slotOptions(s: Slot): string[][] {
  const min = s.min ?? 1
  const max = s.max ?? 1
  const ids = s.parts.map((x) => x.id)
  const out: string[][] = []
  const rec = (i: number, acc: string[]) => {
    if (i === ids.length) {
      if (acc.length >= min && acc.length <= max) out.push(acc)
      return
    }
    rec(i + 1, acc)
    if (acc.length < max) rec(i + 1, [...acc, ids[i]])
  }
  rec(0, [])
  return out
}

/** All valid designs (capped). Used by validate() and to tell the child how many answers exist. */
export function solutions(p: Params, cap = 50): string[][] {
  const opts = p.slots.map(slotOptions)
  const found: string[][] = []
  const rec = (i: number, acc: string[]) => {
    if (found.length >= cap) return
    if (i === opts.length) {
      if (problems(p, acc).length === 0) found.push(acc)
      return
    }
    for (const o of opts[i]) rec(i + 1, [...acc, ...o])
  }
  rec(0, [])
  return found
}

function validate(p: Params): string[] {
  const out: string[] = []
  if (!p || !Array.isArray(p.slots)) return ['slots are required']
  if (!p.brief?.trim()) out.push('brief is required')
  if (!p.terrain?.trim() || !p.terrainLabel?.trim()) out.push('terrain and terrainLabel are required')
  if (!(p.budget > 0)) out.push('budget must be > 0')
  if (p.slots.length < 1 || p.slots.length > 6) out.push('slots: 1–6')
  const ids = new Set<string>()
  let combos = 1
  for (const s of p.slots) {
    if (!s.parts?.length || s.parts.length > 6) out.push(`slot ${s.id}: 1–6 parts`)
    const min = s.min ?? 1
    const max = s.max ?? 1
    if (!(min >= 0 && max >= Math.max(1, min) && max <= (s.parts?.length ?? 0))) out.push(`slot ${s.id}: need 0 ≤ min ≤ max ≤ number of parts`)
    for (const x of s.parts ?? []) {
      if (ids.has(x.id)) out.push(`duplicate part id ${x.id}`)
      ids.add(x.id)
      if (!(x.cost >= 0 && x.massKg >= 0 && x.powerW >= 0)) out.push(`part ${x.id}: cost, massKg and powerW must be ≥ 0`)
      if (x.energyWh !== undefined && !(x.energyWh > 0)) out.push(`part ${x.id}: energyWh must be > 0`)
      for (const g of x.gives ?? []) if (!p.abilityLabels?.[g]) out.push(`part ${x.id}: ability ${g} has no label in abilityLabels`)
    }
    combos *= Math.max(1, slotOptions(s).length)
  }
  for (const need of p.requires ?? []) if (!p.abilityLabels?.[need]) out.push(`requires ${need}: missing from abilityLabels`)
  if (!p.slots.some((s) => s.parts?.some((x) => x.terrains))) out.push('at least one part must be a drive (with terrains)')
  if (p.minRuntimeMin !== undefined && !p.slots.some((s) => s.parts?.some((x) => x.energyWh))) out.push('minRuntimeMin needs at least one battery part (energyWh)')
  if (combos > 20000) out.push(`too many combinations (${combos}); keep it under 20 000`)
  if (out.length) return out
  const sols = solutions(p, 1)
  if (!sols.length) out.push('no combination of parts meets every constraint — loosen the budget, mass or runtime')
  // A design challenge needs at least one tempting wrong choice.
  const opts = p.slots.map(slotOptions)
  const total = opts.reduce((a, o) => a * o.length, 1)
  if (total > 1 && solutions(p, total).length === total) out.push('every combination works — add a constraint that makes choices matter')
  return out
}

function check(p: Params, a: Answer): CheckResult {
  const ids = a?.parts ?? []
  const probs = problems(p, ids)
  if (probs.length && probs[0].kind === 'slot') return { correct: false, score: 0, feedback: probs[0].text }
  const t = totals(p, ids)
  if (!probs.length) {
    const bits = [`${t.cost}/${p.budget} coins`, `${r2(t.massKg)} kg`]
    if (p.minRuntimeMin !== undefined) bits.push(`${Number.isFinite(t.runtimeMin) ? Math.floor(t.runtimeMin) : '∞'} min of battery`)
    const n = solutions(p, 50).length
    return {
      correct: true,
      score: 1,
      feedback: `Your robot meets every requirement (${bits.join(', ')}). ${
        n > 1 ? `There ${n >= 50 ? 'are many' : `are ${n}`} working designs — engineers pick between them by what matters most: price, weight or battery life.` : 'It is the only design that meets every constraint — well found!'
      }`,
    }
  }
  const checks = 2 + (p.maxMassKg !== undefined ? 1 : 0) + (p.minRuntimeMin !== undefined ? 1 : 0) + p.requires.length + 1
  const score = Math.max(0, Math.min(0.9, 1 - probs.length / checks))
  const more = probs.length > 1 ? ` (${probs.length - 1} more thing${probs.length > 2 ? 's' : ''} to fix after that.)` : ''
  return { correct: false, score, feedback: `${probs[0].text}${more}` }
}

export const logic: TemplateLogic<Params, Answer> = { id: 'robot-designer', name: 'Robot designer', validate, check }
