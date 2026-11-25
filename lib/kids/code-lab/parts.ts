// lib/kids/code-lab/parts.ts
// "Add the part": the smallest change to a robot design that gives it every
// capability a mission needs. Brute force over the catalogue (a few hundred
// combinations), so it is always correct and never removes a part that is
// still needed.

import {
  capabilitiesOf,
  getPart,
  partsForSlot,
  type BodyId,
  type Capability,
  type DriveId,
  type HeadId,
  type RobotDesign,
  type SensorId,
  type Slot,
  type ToolId,
} from '../robot-design'

const CHANGEABLE: Slot[] = ['drive', 'head', 'tool', 'sensor']

export function missingCaps(design: RobotDesign, needs: Capability[]): Capability[] {
  const caps = capabilitiesOf(design)
  return needs.filter((c) => !caps.has(c))
}

/** Returns the closest design that has every capability in `needs`, or null if none exists. */
export function designWith(design: RobotDesign, needs: Capability[]): RobotDesign | null {
  if (missingCaps(design, needs).length === 0) return design
  const options = CHANGEABLE.map((slot) => partsForSlot(slot).map((p) => p.id))
  let best: RobotDesign | null = null
  let bestCost = Infinity
  for (const drive of options[0]) {
    for (const head of options[1]) {
      for (const tool of options[2]) {
        for (const sensor of options[3]) {
          const cand: RobotDesign = {
            ...design,
            body: design.body as BodyId,
            drive: drive as DriveId,
            head: head as HeadId,
            tool: tool as ToolId,
            sensor: sensor as SensorId,
          }
          if (missingCaps(cand, needs).length > 0) continue
          const cost = CHANGEABLE.reduce((n, slot) => n + (cand[slot] === design[slot] ? 0 : 1), 0)
          if (cost < bestCost) {
            best = cand
            bestCost = cost
          }
        }
      }
    }
  }
  return best
}

/** Names of the parts that changed between two designs, e.g. ["Tank Tracks", "Headlight"]. */
export function changedParts(from: RobotDesign, to: RobotDesign): string[] {
  const names: string[] = []
  for (const slot of CHANGEABLE) {
    if (from[slot] !== to[slot]) {
      const p = getPart(slot, to[slot])
      if (p) names.push(`${p.emoji} ${p.name}`)
    }
  }
  return names
}
