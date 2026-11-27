// lib/kids/curriculum/level2/types.ts
// The shape of a Level 2 (Builders, 8–10) session: a COMPOSED session.
//
// Level 1 wrote every beat from scratch (its own arena, its own picture
// blocks). Level 2 follows roadmap #23: each session is built mostly from
// parts that already exist and are already verified —
//   1. EPISODE   – an Island Post story script (curriculum Episode format, read
//                  as a storybook) plus, where one fits, a Story Theatre
//                  cartoon (lib/kids/stories) as the "watch" option;
//   2. BUILD     – one part of my robot (same BuildStep as Level 1);
//   3. PRACTISE  – a verified arena (a Code Lab mission, checked by
//                  lib/kids/code-lab/verify.ts, or a Physics Lab arena,
//                  checked by lib/kids/sim/verify.ts) and 2–3 concept-tagged
//                  Skill Galaxy activities (lib/kids/activities, checked by
//                  activities/verify.ts);
//   4. CHALLENGE – one tier of a Universe game (lib/kids/universe/worlds.ts
//                  GAMES), won when that game + tier has a personal best;
//   5. CHECK     – three questions whose wrong options are tagged with the
//                  misconception they reveal (./misconceptions.ts);
//   6. BADGE     – a skill badge, reported through reportActivity().
//
// Every id is checked by lib/kids/curriculum/verify.ts. Pure data and types:
// no React, no browser APIs.

import type {
  Badge,
  BlockId,
  BuildStep,
  ConceptId,
  Episode,
  LearningObjective,
  ParentNote,
  PartRef,
  Project,
  QuizOption,
  QuizQuestion,
  TeacherNotes,
} from '../types'
import type { MisconceptionId } from './misconceptions'

/** A verified arena the child practises in before the challenge. */
export interface ArenaRef {
  /**
   * 'code-lab': a mission in lib/kids/code-lab/missions.ts (/kids/code-lab/<id>).
   * 'physics': a Physics Lab arena in lib/kids/sim/demos.ts (/kids/lab/sim).
   */
  kind: 'code-lab' | 'physics'
  id: string
  /** What to do there today, in the child's words (it may differ from the arena's own task). */
  task: string
  /** Why this arena, for the teacher: what it shows about today's idea. */
  why: string
}

/** A Skill Galaxy activity used in the session (its concepts come from the activity itself). */
export interface ActivityRef {
  id: string
  /** One line for the child: why this one today. */
  why: string
}

/** The session's challenge: one tier of a Universe game. */
export interface GameTierRef {
  /** A GAMES id with a built page at /kids/play/<id>. */
  game: string
  /** 0 Cadet · 1 Pilot · 2 Ace · 3 Legend (TIER_NAMES in lib/kids/universe/tiers.ts). */
  tier: 0 | 1 | 2 | 3
  /** What winning looks like, in the child's words. */
  goal: string
  /** The link between the game and today's idea, said by Spark before playing. */
  link: string
}

export interface L2QuizOption extends QuizOption {
  /** Set on every WRONG option: the misconception choosing it reveals. Never on the answer. */
  misconception?: MisconceptionId
}

export interface L2QuizQuestion extends Omit<QuizQuestion, 'options'> {
  options: L2QuizOption[]
}

export type L2Quiz = [L2QuizQuestion, L2QuizQuestion, L2QuizQuestion]

export interface L2Session {
  /** "L2-S01" — also the progress id (sessionsDone) and the certificate's key. */
  id: string
  level: 2
  number: number
  title: string
  objective: string
  kind: 'lesson' | 'project'
  durationMin: number
  objectives: LearningObjective[]
  concepts: ConceptId[]
  /** Blocks introduced here (must equal the levels.ts outline). */
  newBlocks: BlockId[]
  /** The Island Post story for this session. */
  episode: Episode
  /** A Story Theatre cartoon (lib/kids/stories slug) that teaches the same idea, when one fits. */
  theatre?: string
  build: BuildStep
  arena: ArenaRef
  /** 2–3 Skill Galaxy activities; each shares at least one concept with the session. */
  activities: ActivityRef[]
  challenge: GameTierRef
  quiz: L2Quiz
  badge: Badge
  reward: { unlocks?: PartRef; note: string }
  /** Present on project sessions (6, 12, 18, 24): the levels.ts project. */
  project?: Project
  teacher: TeacherNotes
  parent: ParentNote
}
