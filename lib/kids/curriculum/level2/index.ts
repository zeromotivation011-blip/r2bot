// lib/kids/curriculum/level2/index.ts
// Level 2 (Builders, ages 8–10) — "The Island Post", on Planet Gearon — in
// full: 24 composed sessions in four acts of six.
//   Act 1 (1–6)   Measuring the Islands  — encoders, any angle, stability,
//                                           two-motor curves, the island map
//   Act 2 (7–12)  The Lighthouse Line    — if / else line following, safe
//                                           loops, and / or / not, the timer,
//                                           debugging, the lighthouse delivery
//   Act 3 (13–18) Sand, Rocks and Turtles — fair tests, the gripper, colour,
//                                           nests, the camera, beach clean-up
//   Act 4 (19–24) Storm Season           — fooled sensors, search patterns,
//                                           design for everyone, reliability,
//                                           careers, the grand route
// Each session reuses verified parts (Code Lab / Physics Lab arenas, Skill
// Galaxy activities, a Universe game tier, Story Theatre where it fits); see
// ./types.ts. Checked by lib/kids/curriculum/verify.ts.
//
// About 120 KB of text: import it only where a full session is rendered (one
// session is passed to the client as props), never into a shared bundle.

import type { Certificate } from '../types'
import { levelByNumber } from '../levels'
import { ACT1 } from './act1'
import { ACT2 } from './act2'
import { ACT3 } from './act3'
import { ACT4 } from './act4'
import type { L2Session } from './types'

export type { ActivityRef, ArenaRef, GameTierRef, L2Quiz, L2QuizOption, L2QuizQuestion, L2Session } from './types'
export { L2_MISCONCEPTIONS, type MisconceptionId } from './misconceptions'

export const LEVEL2_SESSIONS: L2Session[] = [...ACT1, ...ACT2, ...ACT3, ...ACT4]

export function level2Session(n: number): L2Session | undefined {
  return LEVEL2_SESSIONS.find((s) => s.number === n)
}

/**
 * The Builder certificate, with criteria the product can actually see. The
 * button (components/kids/teach/CertificateButtonClient, level 2) unlocks when
 * every L2-S01…L2-S24 is in sessionsDone — which the runner records only after
 * the challenge is won and the check is answered. The wording lives in
 * levels.ts (one source; levels.ts cannot import this file — act1 imports it).
 */
export const LEVEL2_CERTIFICATE: Certificate = levelByNumber(2).certificate

/** Every Level 2 badge, for surfaces that name course badges (Garage, class view). */
export const LEVEL2_BADGES: { id: string; name: string; icon: string; session: number }[] = LEVEL2_SESSIONS.map((s) => ({
  id: s.badge.id,
  name: s.badge.name,
  icon: s.badge.icon,
  session: s.number,
}))
