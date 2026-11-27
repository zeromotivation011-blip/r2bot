// lib/kids/curriculum/level4/index.ts
// Level 4 (Engineers, ages 14–17) in full: 24 sessions in four acts of six,
// the season "Red Valley" (a Mars-analog research base).
//   Act 1 (1–6)   Landing            — systems, motor curves, kinematics,
//                                       heading hold, P, I and D, docking
//   Act 2 (7–12)  Mapping the Valley — scans, grid maps, wavefront planning,
//                                       behaviour layers, delay, survey
//   Act 3 (13–18) Sample Science     — reach and grasp, test plans, fault
//                                       detection, design review, people
//   Act 4 (19–24) Dust Storm         — filters, safety case, ethics,
//                                       pathways, review, capstone
// Heavy: import it only where a full session is rendered (server pages, the
// teacher guides, verify scripts), never into a shared client bundle.
// Shared kit (types, helpers, word blocks) lives in ../level3.

import type { Session } from '../types'
import { ACT1 } from './act1'
import { ACT2 } from './act2'
import { ACT3 } from './act3'
import { ACT4 } from './act4'

export const LEVEL4_SESSIONS: Session[] = [...ACT1, ...ACT2, ...ACT3, ...ACT4]

export function level4Session(n: number): Session | undefined {
  return LEVEL4_SESSIONS.find((s) => s.number === n)
}

export { LEVEL4_REUSE, level4Reuse } from './reuse'
export { LEVEL4_GUIDE } from './guide'
