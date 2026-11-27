// lib/kids/curriculum/level2/shared.ts
// Helpers shared by the Level 2 acts: the 45-minute class plans, the teacher
// notes (whose misconception list is BUILT from the check's tagged wrong
// options, so the two cannot drift apart), objectives and the episode builder.

import type { ConceptId, Episode, EpisodeScene, LearningObjective, MappingTag, TeacherNotes, TimingBlock } from '../types'
import { L2_MISCONCEPTIONS, type MisconceptionId } from './misconceptions'
import type { L2Quiz } from './types'

/** A Builders class period: 45 minutes (a 40-minute school can drop the second share, see notes). */
export const L2_LESSON_MIN = 45

export const OPENING_SEC = 10
export const PREVIOUSLY_SEC = 15
export const CLOSING_SEC = 15

export function episode(title: string, scenes: EpisodeScene[], cliffhanger: string, previously?: string): Episode {
  return {
    title,
    previously,
    scenes,
    cliffhanger,
    runtimeSec: (previously ? PREVIOUSLY_SEC : OPENING_SEC) + scenes.reduce((s, sc) => s + sc.seconds, 0) + CLOSING_SEC,
  }
}

export function obj(id: string, text: string, kidText: string, concepts: ConceptId[], tags: MappingTag[], discussionOnly = false): LearningObjective {
  return discussionOnly ? { id, text, kidText, concepts, tags, discussionOnly: true } : { id, text, kidText, concepts, tags }
}

/**
 * The standard Builders lesson (45 min). The episode is played once on the big
 * screen; pairs then rotate roles (driver, navigator) through practise and the
 * challenge; the check is answered alone, quietly, so it tells the teacher
 * something.
 */
export function lessonTiming(warmup: string): TimingBlock[] {
  return [
    { minutes: 5, activity: `Unplugged warm-up: ${warmup}` },
    { minutes: 4, activity: 'The teacher plays the episode once on the big screen (captions on). Stop at the question in the last scene and take two answers.' },
    { minutes: 2, activity: 'Devices out; pairs join with the class code and agree who drives first.' },
    { minutes: 4, activity: 'BUILD: fit or inspect the part, then "Try without it" and say what goes wrong.' },
    { minutes: 12, activity: 'PRACTISE: the arena first (predict, run, compare), then the Galaxy activities. Swap driver and navigator halfway.' },
    { minutes: 8, activity: 'CHALLENGE: the game tier. Pairs say out loud how the game uses today’s idea before they play.' },
    { minutes: 4, activity: 'CHECK: three questions, answered on your own. Read the “why” after each one.' },
    { minutes: 6, activity: 'Share: two pairs show a run on the big screen and explain one decision. Discussion questions. Devices away.' },
  ]
}

/** Project sessions (6, 12, 18, 24): design steps on paper first, then make, test, improve and share. */
export function projectTiming(): TimingBlock[] {
  return [
    { minutes: 3, activity: 'The teacher plays the short episode that sets the project.' },
    { minutes: 7, activity: 'ASK + IMAGINE + PLAN on the planning sheet: the problem in one sentence, two sketches, then one chosen plan with distances, angles or a flowchart.' },
    { minutes: 2, activity: 'Devices out; pairs join with the class code.' },
    { minutes: 18, activity: 'BUILD + CODE + TEST in the arena, one leg at a time. Keep a test log: what you predicted, what happened, what you changed.' },
    { minutes: 5, activity: 'CHALLENGE: the game tier, as a warm-down that uses the same idea.' },
    { minutes: 4, activity: 'CHECK: three questions on your own.' },
    { minutes: 6, activity: 'PAIR SHARE: each pair shows another pair one design decision and one bug it fixed; the listeners give “a star and a wish”.' },
  ]
}

export const L2_COMMON_NOTES: string[] = [
  'Roles rotate in pairs or threes: driver (taps), navigator (checks the plan), tester (predicts before each run) and recorder (writes the test log). Swap at half time.',
  'Text is shown AND spoken: every question, hint and story line has a speaker button; captions stay on in class.',
  'Never compare children or pairs. Praise process: “you predicted first”, “you changed one thing at a time”, “you tested from two starts”.',
  'A 40-minute period: drop the second share pair and take two minutes from Practise. A 60-minute period: add the Practise activities you skipped, or the Story Theatre cartoon.',
  'Access: every block is tapped, never dragged; every sound has a visual twin; colours always come with a shape or a word; scanning and keyboard work on every button. The games keep their own access settings (Settings → untimed).',
]

/** The misconceptions a check can reveal, in order, without repeats. */
export function quizMisconceptions(quiz: L2Quiz): MisconceptionId[] {
  const out: MisconceptionId[] = []
  for (const q of quiz) for (const o of q.options) if (o.misconception && !out.includes(o.misconception)) out.push(o.misconception)
  return out
}

/**
 * Teacher notes. `misconceptions` is NOT written by hand: it is every
 * misconception the session's check can reveal (plus any `extra` ids), with
 * the correction the teacher can use.
 */
export function teacher(
  t: Omit<TeacherNotes, 'notes' | 'misconceptions'> & { notes?: string[]; extra?: MisconceptionId[] },
  quiz: L2Quiz,
): TeacherNotes {
  const ids = quizMisconceptions(quiz)
  for (const e of t.extra ?? []) if (!ids.includes(e)) ids.push(e)
  return {
    timing: t.timing,
    unpluggedWarmup: t.unpluggedWarmup,
    discussion: t.discussion,
    misconceptions: ids.map((id) => ({ idea: L2_MISCONCEPTIONS[id].idea, correction: L2_MISCONCEPTIONS[id].correction })),
    differentiation: t.differentiation,
    notes: [...(t.notes ?? []), ...L2_COMMON_NOTES],
  }
}
