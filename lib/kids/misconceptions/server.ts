// lib/kids/misconceptions/server.ts
//
// SERVER ONLY (imports every level's sessions and the unplugged lessons).
// Joins the four places misconceptions are written into one view per session:
//
//   Level 1  ./level1.ts (L1_MISCONCEPTIONS: idea, correction, child words, reteach)
//   Level 2  lib/kids/curriculum/level2/misconceptions.ts (idea, correction)
//   Level 3–4  each session's teacher notes (id, idea, correction, 5-minute reteach)
//
// …and names what a teacher can use to re-teach it: the session's unplugged
// lesson (Level 1) or unplugged warm-up (Levels 2–4, in the session guide), and
// the episode to replay (the Episodes Theatre for Level 1, the Story Theatre
// cartoon for Level 2 sessions that have one, otherwise the session itself,
// whose first beat is the episode).
//
// Used by the class insights catalogue (lib/kids/classroom-insights-server.ts)
// and by ./verify.ts.

import { LEVEL1_SESSIONS } from '../curriculum/level1'
import { LEVEL2_SESSIONS } from '../curriculum/level2'
import { L2_MISCONCEPTIONS } from '../curriculum/level2/misconceptions'
import { LEVEL3_SESSIONS } from '../curriculum/level3'
import { LEVEL4_SESSIONS } from '../curriculum/level4'
import type { Misconception as L34Misconception } from '../curriculum/level3/kit'
import type { LevelNumber, Session } from '../curriculum/types'
import type { L2Session } from '../curriculum/level2/types'
import { unpluggedHref } from '../unplugged'
import { L1_MISCONCEPTIONS } from './level1'
import { optionMisconception } from './keys'

export type AnySession = Session | L2Session

export interface ResolvedMisconception {
  /** "L1-S05.turn-moves-forward" — the key the class snapshot counts. */
  key: string
  id: string
  sessionId: string
  level: LevelNumber
  idea: string
  correction: string
  /** Child-friendly words for the teacher to say (Level 1). */
  child?: string
  /** A 5-minute reteach (Levels 1, 3 and 4). */
  reteach?: string
  /** The answer option that reveals it (course content, the same for every child). */
  answer: string
}

export interface ReteachRef {
  title: string
  href: string
}

export interface SessionReteachRefs {
  /** The no-device way to teach it again. */
  unplugged: ReteachRef
  /** The episode to replay with the class. */
  episode: ReteachRef
}

export const LEVEL_SESSIONS: [LevelNumber, AnySession[]][] = [
  [1, LEVEL1_SESSIONS], [2, LEVEL2_SESSIONS], [3, LEVEL3_SESSIONS], [4, LEVEL4_SESSIONS],
]

interface OptionLike {
  text: string
}

function lookup(level: LevelNumber, s: AnySession, id: string): Omit<ResolvedMisconception, 'key' | 'id' | 'sessionId' | 'level' | 'answer'> | null {
  if (level === 1) {
    const m = (L1_MISCONCEPTIONS as Record<string, { idea: string; correction: string; child: string; reteach: string }>)[id]
    return m ? { idea: m.idea, correction: m.correction, child: m.child, reteach: m.reteach } : null
  }
  if (level === 2) {
    const m = (L2_MISCONCEPTIONS as Record<string, { idea: string; correction: string }>)[id]
    return m ? { idea: m.idea, correction: m.correction } : null
  }
  const notes = (s.teacher.misconceptions ?? []) as Partial<L34Misconception>[]
  const m = notes.find((x) => x.id === id)
  if (!m || !m.idea) return null
  return { idea: m.idea, correction: m.correction ?? '', ...(m.reteach ? { reteach: m.reteach } : {}) }
}

/** Every misconception a session's check can reveal, once each, in question order. Unknown ids are skipped (the verify script reports them). */
export function sessionMisconceptions(level: LevelNumber, s: AnySession): ResolvedMisconception[] {
  const out: ResolvedMisconception[] = []
  const seen = new Set<string>()
  for (const q of s.quiz as unknown as { options: OptionLike[] }[]) {
    for (const o of q.options) {
      const id = optionMisconception(o)
      if (!id || seen.has(id)) continue
      seen.add(id)
      const m = lookup(level, s, id)
      if (!m) continue
      out.push({ key: `${s.id}.${id}`, id, sessionId: s.id, level, answer: o.text, ...m })
    }
  }
  return out
}

/** The ids a session's check options carry that no catalogue explains (should be none). */
export function unknownMisconceptionIds(level: LevelNumber, s: AnySession): string[] {
  const out: string[] = []
  for (const q of s.quiz as unknown as { options: OptionLike[] }[]) {
    for (const o of q.options) {
      const id = optionMisconception(o)
      if (id && !lookup(level, s, id)) out.push(id)
    }
  }
  return out
}

function guide(level: LevelNumber, n: number, hash = ''): string {
  return `/kids/teach/${level}/${n}${hash}`
}

/** Where to re-teach a session's ideas: its unplugged lesson or warm-up, and its episode. */
export function sessionReteachRefs(level: LevelNumber, s: AnySession): SessionReteachRefs {
  const unplugged: ReteachRef =
    level === 1
      ? { title: `Unplugged lesson ${s.number}: ${s.title}`, href: unpluggedHref(s.number) }
      : { title: `Unplugged warm-up: ${s.teacher.unpluggedWarmup.title}`, href: guide(level, s.number, '#warm-h') }
  let episode: ReteachRef
  if (level === 1) episode = { title: `Episode ${s.number}: ${s.episode.title}`, href: `/kids/stories/episodes/${s.id}` }
  else if (level === 2 && 'theatre' in s && s.theatre) episode = { title: `Story Theatre cartoon for Session ${s.number}`, href: `/kids/stories/${s.theatre}` }
  else episode = { title: `The Session ${s.number} episode: ${s.episode.title}`, href: `/kids/course/${level}/${s.number}` }
  return { unplugged, episode }
}
