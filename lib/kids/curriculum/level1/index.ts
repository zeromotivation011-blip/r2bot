// lib/kids/curriculum/level1/index.ts
// Level 1 (Explorers, ages 5–7) in full: 24 sessions in four acts of six.
//   Act 1 (1–6)   A Helper in a Box       — sense–think–act, moving, turning
//   Act 2 (7–12)  The Map of Lantern Hill — algorithms, bugs, the pen, loops
//   Act 3 (13–18) Heavy, Slippery, Dark   — tools, load, slopes, floors, light
//   Act 4 (19–24) Feel, Hear, Shine       — touch and echo sensors, "if",
//                                            safety, careers, the finale
// Heavy (≈250 KB of text): import it only where a full session is rendered,
// never into a shared client bundle. Overviews come from ../levels.ts.

import type { Session } from '../types'
import { ACT1 } from './act1'
import { ACT2 } from './act2'
import { ACT3 } from './act3'
import { ACT4 } from './act4'

export { L1_PROJECTS } from './projects'

export const LEVEL1_SESSIONS: Session[] = [...ACT1, ...ACT2, ...ACT3, ...ACT4]

export function level1Session(n: number): Session | undefined {
  return LEVEL1_SESSIONS.find((s) => s.number === n)
}
