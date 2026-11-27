// lib/kids/curriculum/level1/shared.ts
// Building blocks for Level 1 (Explorers, ages 5–7): the picture blocks, the
// arena defaults and the standard 40-minute class plan.
//
// Level 1 conventions (the simulator must honour them — see OPEN_QUESTIONS):
// - Arenas are drawn on a 35 cm tile grid. The tile is set by the robot, not
//   the other way round: the sim's Level 1 robots are 21–27 cm wide and need a
//   25–33 cm circle to turn on the spot (L1_GEOMETRY, from sim/robot-spec.ts),
//   so a one-tile corridor must be wider than that.
// - "Hop forward" is drive_for(speedPct 80, seconds N): the sim's two-wheel
//   drive tops out at 0.42 m/s, so 80 % ≈ 34 cm/s ≈ one tile per second on the
//   flat mat with no load. On sand, ice, a slope or with a heavy load the same
//   block covers a different distance — sessions 14 and 15 are built on that.
// - Turns are exact quarter turns: turn_degrees(±90, 40). Positive = left.
// - "Until something is close" is distance_cm < 20, checked between creeps of
//   about 6 cm. checkL1Geometry() proves, for every body, that the robot then
//   stops inside the end tile, clear of the wall, with room to turn.

import { DEFAULT_DESIGN, type BodyId, type DriveId, type HeadId, type SensorId, type ToolId } from '../../robot-design'
import { DRIVES, robotSpec } from '../../sim/robot-spec'
import type { L1MisconceptionId } from '../../misconceptions/level1'
import type {
  AllowedBlock,
  ArenaSpec,
  ConceptId,
  Episode,
  EpisodeScene,
  LearningObjective,
  MappingTag,
  QuizOption,
  TeacherNotes,
  TimingBlock,
} from '../types'

// ── Check options ─────────────────────────────────────────────────────────

/** A check option carrying the misconception a wrong pick reveals (roadmap #30). */
export interface L1TaggedOption extends QuizOption {
  misconception: L1MisconceptionId
}

/**
 * A WRONG check option and the misconception it reveals (an id in
 * lib/kids/misconceptions/level1.ts — typed, so a typo fails type-check).
 * A function result, not an object literal, so it sits in a QuizOption[].
 */
export function mis(text: string, icon: string, misconception: L1MisconceptionId): L1TaggedOption {
  return { text, icon, misconception }
}

// ── Picture blocks ────────────────────────────────────────────────────────

/** Motor power of one Level 1 hop (one tile per second on the flat). */
export const HOP_PCT = 80

export const HOP: AllowedBlock = {
  id: 'drive_for',
  label: 'Hop forward',
  fixed: { speedPct: HOP_PCT },
  choices: { seconds: [1, 2, 3] },
}

export const HOP_BACK: AllowedBlock = {
  id: 'drive_for',
  label: 'Hop back',
  fixed: { speedPct: -HOP_PCT, seconds: 1 },
}

/** Short slow move (about 6 cm) used with sensors, so the robot checks often and touches gently. */
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

/** Reverse after a bump (about 13 cm), so even the widest body can turn without scraping the wall. */
export const BACK_OFF: AllowedBlock = { id: 'drive_for', label: 'Back off a little', fixed: { speedPct: -30, seconds: 1 } }

/** The Level 1 "close" threshold, in cm from the Distance Eyes. */
export const CLOSE_CM = 20
/** The Level 1 "clear" threshold: nothing in the next tile (eye to the far edge of the next tile, ≈ 1.5 tiles). */
export const CLEAR_CM = 50

/** repeat_until(distance_cm < CLOSE_CM) — the body is usually CREEP. */
export const UNTIL_CLOSE: AllowedBlock = {
  id: 'repeat_until',
  label: 'Keep going until something is close',
  fixed: { cond: `distance_cm < ${CLOSE_CM}` },
}

/**
 * repeat_until(distance_cm > CLEAR_CM) with nothing inside: the program waits
 * here until nothing is in the next tile in front. Every arena that offers it
 * must have nothing static within CLEAR_CM of the eye at a place the robot
 * waits, or the wait never ends (see the S22 arenas).
 */
export const WAIT_CLEAR: AllowedBlock = {
  id: 'repeat_until',
  label: 'Wait until the path is clear',
  fixed: { cond: `distance_cm > ${CLEAR_CM}` },
}
export const IF_BUMP: AllowedBlock = { id: 'if', label: 'If I feel a bump…', fixed: { cond: 'bumped' } }

export function say(...phrases: string[]): AllowedBlock {
  return { id: 'say', label: 'Say', choices: { text: phrases } }
}

export const MOVE_SET: AllowedBlock[] = [HOP, HOP_BACK, LEFT, RIGHT]

// ── Arenas ────────────────────────────────────────────────────────────────

export const TILE_CM = 35

// ── Robot geometry and mass (one source of truth: lib/kids/sim/robot-spec.ts) ──

/**
 * Part masses in kg, copied from sim/robot-spec.ts so every physicsEffect
 * string can quote them. scripts/kids-curriculum-doc.ts fails if any value
 * drifts from what robotSpec() actually computes.
 */
export const PART_MASS_KG: {
  body: Record<BodyId, number>
  drive: Record<DriveId, number>
  head: Record<HeadId, number>
  tool: Record<ToolId, number>
  sensor: Record<SensorId, number>
} = {
  body: { box: 0.9, dome: 0.7, tall: 1.1, bug: 0.45 },
  drive: { wheels2: DRIVES.wheels2.mass, wheels4: DRIVES.wheels4.mass, tracks: DRIVES.tracks.mass, legs: DRIVES.legs.mass },
  head: { distance: 0.08, camera: 0.12, antenna: 0.05, screen: 0.15 },
  tool: { none: 0, gripper: 0.2, scoop: 0.18, pen: 0.05, light: 0.08 },
  sensor: { none: 0, line: 0.03, color: 0.03, bumper: 0.05 },
}

/** "0.18 kg" */
export function kg(n: number): string {
  return `${Number(n.toFixed(2))} kg`
}

export interface BodyGeometry {
  /** Chassis width including the wheels, cm. */
  widthCm: number
  /** Front edge ahead of the centre, cm. */
  frontCm: number
  /** Radius of the circle swept when turning on the spot, cm. */
  turnRadiusCm: number
  /** Distance Eyes: ahead of the centre, and height above the floor, cm. */
  eyeAheadCm: number
  eyeHeightCm: number
  /** Mass with two-wheel drive, Distance Eyes and a bumper, no tool, kg. */
  massKg: number
}

const BODIES: BodyId[] = ['box', 'dome', 'tall', 'bug']
const cm = (m: number) => Math.round(m * 1000) / 10

/** Level 1 robot geometry per body, derived from the simulator (two-wheel drive, Distance Eyes, bumper). */
export const L1_GEOMETRY = Object.fromEntries(
  BODIES.map((body) => {
    const s = robotSpec({ ...DEFAULT_DESIGN, body, drive: 'wheels2', head: 'distance', sensor: 'bumper', tool: 'none' })
    // engine.ts builds the chassis collider this wide (wheel track + tyre).
    const halfX = s.track + 0.015
    const halfL = Math.max(s.body.front, -s.body.back)
    return [body, {
      widthCm: cm(2 * halfX),
      frontCm: cm(s.body.front),
      turnRadiusCm: cm(Math.hypot(halfX, halfL)),
      eyeAheadCm: cm(s.eye[2]),
      eyeHeightCm: cm(s.eye[1]),
      massKg: Math.round(s.mass * 100) / 100,
    } satisfies BodyGeometry]
  }),
) as Record<BodyId, BodyGeometry>

const geo = Object.values(L1_GEOMETRY)
const maxOf = (f: (g: BodyGeometry) => number) => Math.max(...geo.map(f))
const minOf = (f: (g: BodyGeometry) => number) => Math.min(...geo.map(f))

/** Every obstacle a Level 1 sensor must find is at least this tall (above the highest Distance Eyes). */
export const OBSTACLE_MIN_CM = Math.ceil(maxOf((g) => g.eyeHeightCm) / 5) * 5 + 5

/** Creep: drive_for(30 %, 0.5 s) on the flat mat, cm. */
export const CREEP_CM = cm(DRIVES.wheels2.maxSpeed * 0.3 * 0.5)

export const L1_ROBOT_GEOMETRY =
  `Robot (from sim/robot-spec.ts): ${minOf((g) => g.widthCm)}–${maxOf((g) => g.widthCm)} cm wide with wheels, ` +
  `turns on the spot inside a circle of radius ${minOf((g) => g.turnRadiusCm)}–${maxOf((g) => g.turnRadiusCm)} cm; ` +
  `Distance Eyes ${minOf((g) => g.eyeAheadCm)}–${maxOf((g) => g.eyeAheadCm)} cm ahead of the centre and ${minOf((g) => g.eyeHeightCm)}–${maxOf((g) => g.eyeHeightCm)} cm above the floor; ` +
  `mass ${minOf((g) => g.massKg)}–${maxOf((g) => g.massKg)} kg with Distance Eyes and bumper, before a tool. ` +
  `Every wall, post or person a sensor must find is at least ${OBSTACLE_MIN_CM} cm tall.`

export const FLAT_MAT_PHYSICS =
  `Gravity 9.81 m/s². Rubber tyres on a printed mat: high friction, no slip at Level 1 speeds. Robot size, sensor position and mass: the Level 1 robot geometry table (L1_GEOMETRY). Anything a sensor must find is at least ${OBSTACLE_MIN_CM} cm tall.`

/**
 * Static check of the Level 1 sensor maths, for every body. Returns problems
 * (empty when the numbers work). Run by scripts/kids-curriculum-doc.ts.
 */
export function checkL1Geometry(): string[] {
  const out: string[] = []
  const coastCm = 2
  for (const [body, g] of Object.entries(L1_GEOMETRY)) {
    // A one-tile corridor must fit the robot turning on the spot.
    if (g.turnRadiusCm + 0.5 > TILE_CM / 2) out.push(`${body}: turning circle (r ${g.turnRadiusCm} cm) does not fit a ${TILE_CM} cm corridor`)
    // "Until close": the loop exits with the eye between CLOSE_CM − CREEP_CM and CLOSE_CM from the wall.
    const centreMin = CLOSE_CM - CREEP_CM + g.eyeAheadCm
    const centreMax = CLOSE_CM + g.eyeAheadCm
    const gapMin = CLOSE_CM - CREEP_CM - (g.frontCm - g.eyeAheadCm)
    if (centreMax + coastCm > TILE_CM) out.push(`${body}: "until close" can stop with the centre ${centreMax} cm from the wall — outside the end tile`)
    if (centreMin < g.turnRadiusCm + 1) out.push(`${body}: "until close" can stop too near the wall to turn (centre ${centreMin} cm, turn radius ${g.turnRadiusCm} cm)`)
    if (gapMin < 3) out.push(`${body}: "until close" can stop only ${gapMin} cm from the wall`)
    // "Back off" after a bump: the front touches the wall, then backs off 2 creeps.
    const afterBackOff = g.frontCm + 2 * CREEP_CM
    if (afterBackOff < g.turnRadiusCm + 1) out.push(`${body}: after "back off" the centre is ${afterBackOff} cm from the wall — too near to turn (r ${g.turnRadiusCm} cm)`)
    // "Clear": a person anywhere in the next tile must read below CLEAR_CM.
    const farEdge = 1.5 * TILE_CM - g.eyeAheadCm
    if (farEdge > CLEAR_CM) out.push(`${body}: "wait until clear" misses a person at the far side of the next tile (${farEdge} cm)`)
  }
  return out
}

export function arena(a: Omit<ArenaSpec, 'tileCm'> & { tileCm?: number }): ArenaSpec {
  return { tileCm: TILE_CM, ...a }
}

// ── Episodes ──────────────────────────────────────────────────────────────

/** Title card (10 s), extended to 15 s when a "Previously…" line is voiced over it. */
export const OPENING_SEC = 10
export const PREVIOUSLY_SEC = 15
/** Closing "Next time…" card that voices the cliffhanger. */
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

// ── Objectives ────────────────────────────────────────────────────────────

export function obj(id: string, text: string, kidText: string, concepts: ConceptId[], tags: MappingTag[]): LearningObjective {
  return { id, text, kidText, concepts, tags }
}

// ── Teacher notes ─────────────────────────────────────────────────────────

/**
 * The standard Level 1 lesson: 40 minutes including hand-out and moving
 * between rug and devices (with 5-year-olds those take real time), and many
 * short changes of activity (attention spans at 5–7 are short). The episode
 * (3:10–3:45) is played ONCE by the teacher on the big screen, so devices are
 * silent during it. A 45-minute period adds the 5 minutes to CODE.
 */
export function lessonTiming(warmup: string): TimingBlock[] {
  return [
    { minutes: 4, activity: `Unplugged warm-up: ${warmup}` },
    { minutes: 5, activity: 'The teacher plays the episode once for everyone on the big screen (captions on). Pause at the question Spark asks and let children answer out loud.' },
    { minutes: 3, activity: 'Hand out devices; pairs join with the class code and their picture password.' },
    { minutes: 4, activity: 'BUILD: children snap on or look at the part, then press "Try without it" and say what went wrong. (Short on time? Skip "Try without it" and show it once on the big screen.)' },
    { minutes: 8, activity: 'CODE: guided program in the simulator, in pairs (one taps, one checks; swap halfway).' },
    { minutes: 7, activity: 'CHALLENGE: the mission. Hints are spoken by Spark; a teacher nudge is fine after hint 2.' },
    { minutes: 3, activity: 'CHECK: three spoken questions, answered by tapping pictures. Badge.' },
    { minutes: 2, activity: 'Devices down (screens face-down), back to the rug.' },
    { minutes: 4, activity: 'Share circle: two children show their run on the big screen. Ask the discussion questions.' },
  ]
}

/**
 * Project sessions (6, 12, 18, 24): more making, and a share that works for a
 * class of 30+. Every pair shows its run to the neighbouring pair (pairs of
 * pairs, about 2 minutes each way — the share is assessed, so nobody skips
 * it), then two volunteer pairs show theirs on the big screen. The teacher
 * listens in on the pair shares during the walk round.
 */
export function projectTiming(): TimingBlock[] {
  return [
    { minutes: 3, activity: 'The teacher plays the short episode that sets the project (captions on).' },
    { minutes: 5, activity: 'IMAGINE + PLAN: draw the idea on the paper planning sheet (pictures, arrows, no words needed).' },
    { minutes: 2, activity: 'Hand out devices; pairs join with the class code.' },
    { minutes: 15, activity: 'BUILD + CODE + TEST: make it in the simulator; test, fix, test again. Teacher visits each pair.' },
    { minutes: 5, activity: 'PAIR SHARE: each pair turns to the neighbouring pair, shows its run and says one thing it fixed; the other pair gives a "star and a wish". Then swap. The teacher listens in and notes who explained a fix.' },
    { minutes: 4, activity: 'BIG-SCREEN SHARE: two volunteer pairs show their project to the class.' },
    { minutes: 3, activity: 'CHECK: three spoken questions.' },
    { minutes: 3, activity: 'Badge, light count on the class Lantern Clock poster, devices away.' },
  ]
}

export const L1_COMMON_NOTES: string[] = [
  'Everything is spoken AND shown: every block, hint and question has a voice, captions and a picture. In class the teacher plays the episode once for everyone; on devices keep the volume low with captions on, or use a headphone splitter so both children in a pair can listen.',
  'Pairs, not individuals: one "driver" taps, one "navigator" checks the plan. Swap at half time.',
  'Never compare children. Stars are about care ("you planned first", "you fixed a bug"), not speed.',
  'Access: every sound has a visual twin (a beep flashes a ring, Say shows a speech bubble); colours always come with a shape or icon; every block is tapped, never dragged, and switch and keyboard scanning work on every button and option (the fast canvas games still need touch or a pointer); a reduced-motion setting slows the episode camera. See "Access for every child" in the school guide.',
]

export function teacher(t: Omit<TeacherNotes, 'notes'> & { notes?: string[] }): TeacherNotes {
  return { ...t, notes: [...(t.notes ?? []), ...L1_COMMON_NOTES] }
}
