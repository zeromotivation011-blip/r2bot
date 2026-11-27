// lib/kids/curriculum/level3/index.ts
// Level 3 (Inventors, ages 11–13) in full: 24 sessions in four acts of six,
// the season "Ridgeback Station".
//   Act 1 (1–6)   Arrival at the Ridge — variables, maths, the gyro,
//                                        calibration, proportional steering
//   Act 2 (7–12)  The Weather Mast     — gap control, tuning, states, data,
//                                        energy
//   Act 3 (13–18) The Boulder Field    — trade-offs, centre of mass, odometry,
//                                        landmarks, gentle approach
//   Act 4 (19–24) Whiteout             — autonomy levels, fail-safes, sensor
//                                        priorities, honest data, careers
// Heavy: import it only where a full session is rendered (server pages, the
// teacher guides, verify scripts), never into a shared client bundle.
// Overviews come from ../levels.ts; what each session reuses is in ./reuse.ts.

import type { Session } from '../types'
import { ACT1 } from './act1'
import { ACT2 } from './act2'
import { ACT3 } from './act3'
import { ACT4 } from './act4'

export const LEVEL3_SESSIONS: Session[] = [...ACT1, ...ACT2, ...ACT3, ...ACT4]

export function level3Session(n: number): Session | undefined {
  return LEVEL3_SESSIONS.find((s) => s.number === n)
}

export { LEVEL3_REUSE, level3Reuse } from './reuse'
export { LEVEL3_GUIDE } from './guide'
