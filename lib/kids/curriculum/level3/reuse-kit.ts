// lib/kids/curriculum/level3/reuse-kit.ts
// What a Level 3 or Level 4 session reuses (roadmap #23), and two helpers a
// session runner needs: where the reused challenge lives, and whether the
// child has completed it. LIGHT: imports only the plain-string link helpers
// (lab-links.ts has no imports), safe in a client island. Links open the exact
// tier (?tier=) or arena (?demo=) the session is about.

import { gameTierHref, labDemoHref, labSolved } from '../../sim/lab-links'

/** The playable challenge, live today. `goal` is the success condition in words. */
export type ReusePlay =
  /** A Universe game at a tier (0 Cadet, 1 Pilot, 2 Ace, 3 Legend): /kids/play/<id>. Done when personalBests["<id>:t<tier>"] exists. */
  | { kind: 'game'; id: string; tier: 0 | 1 | 2 | 3; goal: string }
  /** A Code Lab mission (Blockly, real physics): /kids/code-lab/<id>. Done when codeMissions[id] exists. */
  | { kind: 'code-lab'; id: string; goal: string }
  /** A Physics Lab arena (/kids/lab/sim?demo=<id>, lib/kids/sim/demos.ts) or a Power Lab challenge (/kids/lab/power?demo=power-…). Done when the lab has recorded a solve: personalBests["lab:<id>"] (lib/kids/sim/lab-results.ts). */
  | { kind: 'sim-demo'; id: string; goal: string }
  /** A Skill Galaxy activity: /kids/galaxy/<track>/<id>. Done when the activities store has it. */
  | { kind: 'activity'; id: string; goal: string }

export interface SessionReuse {
  /** "L3-S05" */
  session: string
  /** The challenge beat as it can be played today. */
  play: ReusePlay
  /** 2–3 Galaxy activities (same band) on the session's concepts: practice, recharge and the guide's extensions. */
  practice: string[]
  /** A Story Theatre episode that teaches the same idea, if one fits. */
  story?: string
}

/** Minimal shapes of the stores a "done" check reads (so this file needs no store import). */
export interface ReuseProgress {
  personalBests: Record<string, number>
  codeMissions: Record<string, number>
}

/** Has the child completed the reused challenge? Activities need the activities store (ACTIVITIES_KEY). */
export function reusePlayDone(play: ReusePlay, p: ReuseProgress, activitiesDone: Record<string, unknown> = {}): boolean {
  switch (play.kind) {
    case 'game':
      for (let t = play.tier; t <= 3; t++) if (p.personalBests[`${play.id}:t${t}`] !== undefined) return true
      return false
    case 'code-lab':
      return (p.codeMissions[play.id] ?? 0) > 0
    case 'activity':
      return activitiesDone[play.id] !== undefined
    case 'sim-demo':
      return labSolved(p.personalBests, play.id)
  }
}

/** The page a reused challenge lives on. Galaxy activities need their track (pass activityHref from teach/catalogue). */
export function reusePlayHref(play: ReusePlay, activityHref?: (id: string) => string | null): string | null {
  switch (play.kind) {
    case 'game':
      return gameTierHref(play.id, play.tier)
    case 'code-lab':
      return `/kids/code-lab/${play.id}`
    case 'sim-demo':
      return labDemoHref(play.id)
    case 'activity':
      return activityHref ? activityHref(play.id) : null
  }
}

export const TIER_LABEL = ['Cadet', 'Pilot', 'Ace', 'Legend'] as const
