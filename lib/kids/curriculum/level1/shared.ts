// lib/kids/curriculum/level1/shared.ts
// Building blocks for Level 1 (Explorers, ages 5–7): the picture blocks, the
// arena defaults and the standard 40-minute class plan.
//
// Level 1 conventions (the simulator must honour them — see OPEN_QUESTIONS):
// - Arenas are drawn on a 25 cm tile grid.
// - "Hop forward" is drive_for(speedPct 50, seconds N). The Level 1 robot is
//   tuned so that, on the flat mat with no load, one second at 50 % covers
//   about one tile (±5 %). On sand, ice, a slope or with a heavy load the same
//   block covers a different distance — sessions 14 and 15 are built on that.
// - Turns are exact quarter turns: turn_degrees(±90, 40). Positive = left.

import type {
  AllowedBlock,
  ArenaSpec,
  ConceptId,
  Episode,
  EpisodeScene,
  LearningObjective,
  MappingTag,
  TeacherNotes,
  TimingBlock,
} from '../types'

// ── Picture blocks ────────────────────────────────────────────────────────

export const HOP: AllowedBlock = {
  id: 'drive_for',
  label: 'Hop forward',
  fixed: { speedPct: 50 },
  choices: { seconds: [1, 2, 3] },
}

export const HOP_BACK: AllowedBlock = {
  id: 'drive_for',
  label: 'Hop back',
  fixed: { speedPct: -50, seconds: 1 },
}

/** Half-hop used with the bumper, so the robot checks often and touches gently. */
export const CREEP: AllowedBlock = {
  id: 'drive_for',
  label: 'Creep forward',
  fixed: { speedPct: 30, seconds: 0.5 },
}

export const LEFT: AllowedBlock = { id: 'turn_degrees', label: 'Turn left', fixed: { deg: 90, speedPct: 40 } }
export const RIGHT: AllowedBlock = { id: 'turn_degrees', label: 'Turn right', fixed: { deg: -90, speedPct: 40 } }
export const STOP: AllowedBlock = { id: 'stop', label: 'Stop' }
export const WAIT: AllowedBlock = { id: 'wait', label: 'Wait', choices: { seconds: [1, 2, 3] } }
export const BEEP: AllowedBlock = { id: 'beep', label: 'Beep' }
export const REPEAT: AllowedBlock = { id: 'repeat', label: 'Repeat', choices: { n: [2, 3, 4, 5] } }
export const PEN_DOWN: AllowedBlock = { id: 'pen_down', label: 'Pen down (draw)' }
export const PEN_UP: AllowedBlock = { id: 'pen_up', label: 'Pen up (stop drawing)' }
export const SCOOP_UP: AllowedBlock = { id: 'grip_close', label: 'Scoop up' }
export const TIP_OUT: AllowedBlock = { id: 'grip_open', label: 'Tip out' }
export const LIGHT_ON: AllowedBlock = { id: 'light_on', label: 'Light on' }
export const LIGHT_OFF: AllowedBlock = { id: 'light_off', label: 'Light off' }
export const UNTIL_BUMP: AllowedBlock = { id: 'repeat_until', label: 'Keep going until I feel a bump', fixed: { cond: 'bumped' } }
export const IF_BUMP: AllowedBlock = { id: 'if', label: 'If I feel a bump…', fixed: { cond: 'bumped' } }

export function say(...phrases: string[]): AllowedBlock {
  return { id: 'say', label: 'Say', choices: { text: phrases } }
}

export const MOVE_SET: AllowedBlock[] = [HOP, HOP_BACK, LEFT, RIGHT]

// ── Arenas ────────────────────────────────────────────────────────────────

export const TILE_CM = 25

export const FLAT_MAT_PHYSICS =
  'Gravity 9.81 m/s². Rubber tyres on a printed mat: high friction, no slip at Level 1 speeds. Robot mass about 1 kg with the default body.'

export function arena(a: Omit<ArenaSpec, 'tileCm'> & { tileCm?: number }): ArenaSpec {
  return { tileCm: TILE_CM, ...a }
}

// ── Episodes ──────────────────────────────────────────────────────────────

export function episode(title: string, scenes: EpisodeScene[], cliffhanger: string, previously?: string): Episode {
  return {
    title,
    previously,
    scenes,
    cliffhanger,
    runtimeSec: scenes.reduce((s, sc) => s + sc.seconds, 0),
  }
}

// ── Objectives ────────────────────────────────────────────────────────────

export function obj(id: string, text: string, kidText: string, concepts: ConceptId[], tags: MappingTag[]): LearningObjective {
  return { id, text, kidText, concepts, tags }
}

// ── Teacher notes ─────────────────────────────────────────────────────────

/** The standard Level 1 lesson: 40 minutes, many short changes of activity (attention spans at 5–7 are short). */
export function lessonTiming(warmup: string): TimingBlock[] {
  return [
    { minutes: 5, activity: `Unplugged warm-up: ${warmup}` },
    { minutes: 4, activity: 'Watch the episode together on the big screen. Pause at the question Spark asks and let children answer out loud.' },
    { minutes: 5, activity: 'BUILD: children snap on or look at the part, then press "Try without it" and say what went wrong.' },
    { minutes: 9, activity: 'CODE: guided program in the simulator, in pairs (one taps, one checks; swap halfway).' },
    { minutes: 8, activity: 'CHALLENGE: the mission. Hints are spoken by Spark; a teacher nudge is fine after hint 2.' },
    { minutes: 4, activity: 'CHECK: three spoken questions, answered by tapping pictures. Badge.' },
    { minutes: 5, activity: 'Share circle: two children show their robot run. Ask the discussion questions. Tidy up.' },
  ]
}

/** Project sessions (6, 12, 18, 24): more making, a real share. */
export function projectTiming(): TimingBlock[] {
  return [
    { minutes: 3, activity: 'Watch the short episode that sets the project.' },
    { minutes: 6, activity: 'IMAGINE + PLAN: draw the idea on the paper planning sheet (pictures, arrows, no words needed).' },
    { minutes: 16, activity: 'BUILD + CODE + TEST: make it in the simulator; test, fix, test again. Teacher visits each pair.' },
    { minutes: 9, activity: 'SHARE: each pair shows their project and says one thing they fixed. Classmates give a "star and a wish".' },
    { minutes: 3, activity: 'CHECK: three spoken questions.' },
    { minutes: 3, activity: 'Badge, light count on the class Lantern Clock poster, tidy up.' },
  ]
}

export const L1_COMMON_NOTES: string[] = [
  'Everything is spoken: every block, hint and question has a voice. Turn sound on; headphones per pair work best.',
  'Pairs, not individuals: one "driver" taps, one "navigator" checks the plan. Swap at half time.',
  'Never compare children. Stars are about care ("you planned first", "you fixed a bug"), not speed.',
]

export function teacher(t: Omit<TeacherNotes, 'notes'> & { notes?: string[] }): TeacherNotes {
  return { ...t, notes: [...(t.notes ?? []), ...L1_COMMON_NOTES] }
}
