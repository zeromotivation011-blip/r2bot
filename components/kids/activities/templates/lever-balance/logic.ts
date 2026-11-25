// components/kids/activities/templates/lever-balance/logic.ts
// LEVER BALANCE — a beam (a see-saw, a robot arm, a crane jib) on a fulcrum.
// The child places weights on pegs and/or slides the fulcrum to balance the
// beam or to lift a load.
//
// The real physics (moments / torque about the fulcrum):
//   moment = weight × distance from the fulcrum
//   The beam balances when the moments on the left equal the moments on the
//   right; the heavier-moment side goes down. A small weight far out can
//   balance a big weight close in — that is a lever's mechanical advantage,
//   and why a robot arm's motor at the shoulder works hardest when the arm is
//   stretched out.
// A beam with its own weight counts too: its weight acts at its middle.
//
// Units: positions are peg numbers 0..beamLength, one peg = one length unit
// (shown as 10 cm). Masses are in kg; moments are shown in kg·pegs (or N·m for
// older bands — the balance condition is identical, g cancels out).
//
// Pure logic: no React, no DOM.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'

export interface LeverItem {
  /** kg (any positive number; whole numbers are easiest for young bands). */
  mass: number
  /** Short name shown on the item, e.g. "Battery", "Rock". */
  label?: string
  /** One emoji for the item (content only). */
  emoji?: string
}

export interface FixedItem extends LeverItem {
  /** Peg it sits on, 0..beamLength. Cannot be moved by the child. */
  pos: number
}

export interface Params {
  /** Beam length in pegs (4–20). Pegs are 0..beamLength; the middle is beamLength/2. */
  beamLength: number
  /** Where the fulcrum starts (0..beamLength, a whole peg). */
  fulcrum: number
  /** Can the child slide the fulcrum? (Teaches "move the pivot" levers, crowbars.) */
  fulcrumMovable: boolean
  /** Mass of the beam itself in kg, acting at its middle. 0/omitted = weightless (ages 5–10). */
  beamMass?: number
  /** Items already on the beam (loads). */
  fixed: FixedItem[]
  /** Items the child may place (each at most once), 0–4 items. */
  tray: LeverItem[]
  /**
   * 'balance' — net moment within `tolerance` (the beam is level).
   * 'lift'    — the item fixed[liftIndex] must go UP (its side must be lighter).
   */
  goal: 'balance' | 'lift'
  /** For goal 'lift': index into `fixed` of the item that must rise. */
  liftIndex?: number
  /** For goal 'balance': allowed |net moment| in kg·pegs. Default 0 (exact). */
  tolerance?: number
  /** Every tray item must be placed. */
  mustUseAll?: boolean
  /**
   * true  — the beam tilts live as you build (explore; ages 5–10).
   * false — the beam is held until "Let go" (predict with maths; ages 11–17).
   */
  liveTilt?: boolean
  /** Show the moment sums (left vs right) and the item distances. */
  showMoments?: boolean
}

export interface Placement {
  /** Index into Params.tray. */
  item: number
  /** Peg 0..beamLength. */
  pos: number
}

export interface Answer {
  fulcrum: number
  placed: Placement[]
}

const EPS = 1e-9

/** Net moment about the fulcrum, kg·pegs. Positive = the RIGHT side goes down. */
export function netMoment(p: Params, a: Answer): { net: number; left: number; right: number } {
  let left = 0
  let right = 0
  const add = (mass: number, pos: number) => {
    const d = pos - a.fulcrum
    if (d < 0) left += mass * -d
    else right += mass * d
  }
  for (const f of p.fixed) add(f.mass, f.pos)
  for (const pl of a.placed) {
    const it = p.tray[pl.item]
    if (it) add(it.mass, pl.pos)
  }
  if (p.beamMass) add(p.beamMass, p.beamLength / 2)
  return { net: right - left, left, right }
}

function shapeProblems(p: Params, a: Answer): string[] {
  const out: string[] = []
  if (!a || !Array.isArray(a.placed)) return ['Place something on the beam first.']
  if (!Number.isInteger(a.fulcrum) || a.fulcrum < 0 || a.fulcrum > p.beamLength) out.push('The pivot must sit under a peg on the beam.')
  if (!p.fulcrumMovable && a.fulcrum !== p.fulcrum) out.push('This pivot is bolted down — it cannot move.')
  const seen = new Set<number>()
  for (const pl of a.placed) {
    if (!p.tray[pl.item]) out.push('That item is not in the tray.')
    if (seen.has(pl.item)) out.push('Each tray item can be used once.')
    seen.add(pl.item)
    if (!Number.isInteger(pl.pos) || pl.pos < 0 || pl.pos > p.beamLength) out.push('Every item must sit on a peg of the beam.')
  }
  if (p.mustUseAll && seen.size !== p.tray.length) out.push(`Use all ${p.tray.length} items from the tray.`)
  return out
}

function success(p: Params, a: Answer): boolean {
  const { net } = netMoment(p, a)
  if (p.goal === 'balance') return Math.abs(net) <= (p.tolerance ?? 0) + EPS
  const load = p.fixed[p.liftIndex ?? 0]
  const side = Math.sign(load.pos - a.fulcrum)
  if (side === 0) return false // a load on the pivot never rises
  // load on the right rises when net < 0 (left goes down), and vice versa
  return side > 0 ? net < -EPS : net > EPS
}

/** Exhaustive search over fulcrum × placements, using sets of reachable moments. Returns one solution or null. */
export function findSolution(p: Params): Answer | null {
  const fulcrums = p.fulcrumMovable ? Array.from({ length: p.beamLength + 1 }, (_, i) => i) : [p.fulcrum]
  for (const f of fulcrums) {
    // reachable: map net-moment key → placements
    let reach = new Map<string, { net: number; placed: Placement[] }>()
    const base = netMoment(p, { fulcrum: f, placed: [] }).net
    reach.set(base.toFixed(6), { net: base, placed: [] })
    p.tray.forEach((it, idx) => {
      const next = new Map<string, { net: number; placed: Placement[] }>()
      for (const st of reach.values()) {
        if (!p.mustUseAll) next.set(st.net.toFixed(6), st)
        for (let pos = 0; pos <= p.beamLength; pos++) {
          const n = st.net + it.mass * (pos - f)
          const key = n.toFixed(6)
          if (!next.has(key)) next.set(key, { net: n, placed: [...st.placed, { item: idx, pos }] })
        }
      }
      reach = next
    })
    for (const st of reach.values()) {
      const a = { fulcrum: f, placed: st.placed }
      if (success(p, a)) return a
    }
  }
  return null
}

function validate(p: Params): string[] {
  const e: string[] = []
  if (!Number.isInteger(p.beamLength) || p.beamLength < 4 || p.beamLength > 20) e.push('beamLength must be a whole number 4–20.')
  if (!Number.isInteger(p.fulcrum) || p.fulcrum < 0 || p.fulcrum > p.beamLength) e.push('fulcrum must be a peg 0..beamLength.')
  if (p.beamMass !== undefined && !(p.beamMass >= 0)) e.push('beamMass cannot be negative.')
  if (!Array.isArray(p.fixed) || p.fixed.length > 4) e.push('fixed: 0–4 items.')
  if (!Array.isArray(p.tray) || p.tray.length > 4) e.push('tray: 0–4 items.')
  if (e.length) return e
  for (const f of p.fixed) {
    if (!(f.mass > 0)) e.push('Every fixed item needs a positive mass.')
    if (!Number.isInteger(f.pos) || f.pos < 0 || f.pos > p.beamLength) e.push('Every fixed item must sit on a peg.')
  }
  for (const t of p.tray) if (!(t.mass > 0)) e.push('Every tray item needs a positive mass.')
  if (p.tray.length === 0 && !p.fulcrumMovable) e.push('The child needs something to do: give tray items or a movable fulcrum.')
  if (p.goal !== 'balance' && p.goal !== 'lift') e.push('goal must be "balance" or "lift".')
  if (p.goal === 'lift') {
    const i = p.liftIndex ?? 0
    if (!p.fixed[i]) e.push('goal "lift" needs liftIndex pointing at a fixed item.')
  }
  if (p.tolerance !== undefined && !(p.tolerance >= 0)) e.push('tolerance cannot be negative.')
  if (e.length) return e
  // Already solved before the child does anything? Then there is nothing to learn.
  if (!p.mustUseAll && success(p, { fulcrum: p.fulcrum, placed: [] })) e.push('Trivial: the start position already meets the goal.')
  if (!findSolution(p)) e.push('Unsolvable: no placement of the tray items (and pivot) meets the goal.')
  return e
}

const r1 = (n: number) => Math.round(n * 10) / 10

function check(p: Params, a: Answer): CheckResult {
  const shape = shapeProblems(p, a)
  if (shape.length) return { correct: false, score: 0, feedback: shape[0] }
  const { net, left, right } = netMoment(p, a)
  const sums = `Left side: ${r1(left)} kg·pegs, right side: ${r1(right)} kg·pegs (weight × distance from the pivot).`
  if (success(p, a)) {
    if (p.goal === 'balance')
      return {
        correct: true,
        score: 1,
        feedback: `${sums} They match, so the beam stays level. A light weight far from the pivot can balance a heavy one close to it.`,
      }
    return {
      correct: true,
      score: 1,
      feedback: `${sums} Your side wins, so the load goes up. The longer your side of the lever, the less weight you need — that is mechanical advantage.`,
    }
  }
  const heavier = net > 0 ? 'right' : 'left'
  const lighter = heavier === 'right' ? 'left' : 'right'
  if (p.goal === 'balance') {
    const diff = Math.abs(net)
    const close = diff <= Math.max(left, right) * 0.15
    return {
      correct: false,
      score: close ? 0.5 : 0,
      feedback: `${sums} The ${heavier} side pushes ${r1(diff)} more, so it goes down. Move weight further out on the ${lighter} side, or closer to the pivot on the ${heavier} side${
        p.fulcrumMovable ? ' — or slide the pivot towards the heavy side' : ''
      }.`,
    }
  }
  const load = p.fixed[p.liftIndex ?? 0]
  if (load.pos === a.fulcrum) return { correct: false, score: 0, feedback: `The ${load.label ?? 'load'} is right on top of the pivot, so it can never go up or down. Move the pivot.` }
  return {
    correct: false,
    score: 0,
    feedback: `${sums} The ${load.label ?? 'load'}'s side is still the heavier one, so it stays down. Put your weight further from the pivot${
      p.fulcrumMovable ? ', or move the pivot closer to the load' : ''
    } — a longer lever arm multiplies your push.`,
  }
}

export const logic: TemplateLogic<Params, Answer> = {
  id: 'lever-balance',
  name: 'Lever Balance',
  validate,
  check,
}
