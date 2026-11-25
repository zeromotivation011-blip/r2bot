// lib/kids/curriculum/types.ts
// The schema of the R2BOT Kids curriculum: four levels (one per age band in
// lib/kids/bands.ts), each a 24-session story "season" in which the child
// builds and upgrades ONE robot ("my robot").
//
// Every session has the same six beats:
//   1. EPISODE   – a 3–5 min animated 3D story (script beats here; MP4 later)
//   2. BUILD     – add or upgrade one part of my robot, and see why it exists
//   3. CODE      – a guided program in the real-physics 3D simulator
//   4. CHALLENGE – a mission in a physics arena
//   5. CHECK     – three questions, each with the answer and the reason
//   6. BADGE     – a skill badge (never a rank)
// Sessions 6, 12, 18 and 24 are "Make it yours" projects the child designs.
//
// Pure data and types: no React, no browser APIs, safe on server and client.

import type { BandId } from '../bands'
import type { BodyId, Capability, DriveId, HeadId, SensorId, ToolId } from '../robot-design'

// ── Blocks (shared simulator block set — ids are a contract with the sim) ──

/**
 * Every block id the physics simulator understands. Both curriculum tracks
 * and the simulator must use exactly these ids.
 *
 * Conventions the simulator implements (see OPEN_QUESTIONS in levels.ts):
 * - speedPct is −100…100 (negative = backwards).
 * - turn_degrees: positive = turn LEFT (counter-clockwise, the ROS/maths
 *   convention); negative = turn right. Uses wheel encoders + the gyro.
 * - drive_for is time-based (open loop): the same block goes a different
 *   distance on sand, ice, a slope or with a heavy load. That is deliberate —
 *   Level 1 feels it, Level 2 fixes it with drive_distance (encoders).
 * - forever and repeat_until are capped by the simulator's run-time limit.
 */
export type BlockId =
  // Motion
  | 'drive_for' // (speedPct, seconds)
  | 'drive_distance' // (cm, speedPct) — closed loop on wheel encoders
  | 'turn_degrees' // (deg, speedPct) — encoders + gyro
  | 'set_motors' // (leftPct, rightPct)
  | 'stop'
  | 'wait' // (seconds)
  // Sensors (reporters)
  | 'distance_cm' // needs Distance Eyes or Camera Eye
  | 'line_seen' // boolean — needs Line Sensor
  | 'line_offset' // −1…1 — needs Line Sensor
  | 'floor_color' // needs Colour Sensor or Camera Eye
  | 'bumped' // boolean — needs Bumper Switch
  | 'heading_deg' // gyro, built in
  | 'timer_s' // built in
  // Control
  | 'repeat' // (n) { }
  | 'repeat_until' // (cond) { }
  | 'forever' // { } — capped by the sim
  | 'if' // (cond) { }
  | 'if_else' // (cond) { } else { }
  | 'compare' // (<, >, =)
  | 'and'
  | 'or'
  | 'not'
  | 'number'
  | 'math' // (+, −, ×, ÷)
  | 'variable_set' // Level 3+
  | 'variable_change' // Level 3+
  | 'variable_get' // Level 3+
  // Actions
  | 'grip_open' // needs Gripper Claw or Scoop
  | 'grip_close' // needs Gripper Claw or Scoop
  | 'pen_down' // needs Drawing Pen
  | 'pen_up' // needs Drawing Pen
  | 'light_on' // needs Headlight
  | 'light_off' // needs Headlight
  | 'say' // (text) — speaks aloud; shown on the Face Screen if fitted
  | 'beep'

/** The part capability a block needs, or null when every robot can use it. Mirrors CAPABILITY_NEEDS in robot-design.ts. */
export const BLOCK_NEEDS: Record<BlockId, Capability | null> = {
  drive_for: 'move',
  drive_distance: 'move',
  turn_degrees: 'move',
  set_motors: 'move',
  stop: null,
  wait: null,
  distance_cm: 'see-wall',
  line_seen: 'follow-line',
  line_offset: 'follow-line',
  floor_color: 'see-color',
  bumped: 'feel-bump',
  heading_deg: null,
  timer_s: null,
  repeat: null,
  repeat_until: null,
  forever: null,
  if: null,
  if_else: null,
  compare: null,
  and: null,
  or: null,
  not: null,
  number: null,
  math: null,
  variable_set: null,
  variable_change: null,
  variable_get: null,
  grip_open: 'grab',
  grip_close: 'grab',
  pen_down: 'draw',
  pen_up: 'draw',
  light_on: 'light',
  light_off: 'light',
  say: null,
  beep: null,
}

/**
 * A block as offered in one challenge. For young children most parameters are
 * fixed or chosen from a few picture chips, so a block is a single tap.
 */
export interface AllowedBlock {
  id: BlockId
  /** Picture-block label read aloud, e.g. "Hop forward". */
  label: string
  /** Fixed parameter values (the child cannot change them). */
  fixed?: Record<string, number | string>
  /** Parameter choices offered as picture chips. */
  choices?: Record<string, ReadonlyArray<number | string>>
}

// ── Robot parts ───────────────────────────────────────────────────────────

export type PartRef =
  | { slot: 'body'; id: BodyId }
  | { slot: 'drive'; id: DriveId }
  | { slot: 'head'; id: HeadId }
  | { slot: 'tool'; id: ToolId }
  | { slot: 'sensor'; id: SensorId }

/** A robot as the curriculum describes it (colours and name are the child's own). */
export interface RobotSpec {
  /** Body is the child's choice unless set. */
  body: BodyId | 'child-choice'
  drive: DriveId | 'child-choice'
  head: HeadId
  tool: ToolId
  sensor: SensorId
  /** Parts the child owns but is not wearing right now (tools are swapped for the job). */
  toolbox: PartRef[]
  /** One line a parent understands. */
  description: string
}

// ── Concepts and objectives ───────────────────────────────────────────────

/** The spiral strands that run through all four levels. */
export type ConceptId =
  | 'sense-think-act'
  | 'sequences'
  | 'decomposition'
  | 'loops'
  | 'debugging'
  | 'events-timing'
  | 'sensors'
  | 'conditions'
  | 'variables'
  | 'feedback-control'
  | 'physics'
  | 'autonomy'
  | 'data'
  | 'design-process'
  | 'safety-ethics'
  | 'careers'

/** Broad tags used by mapping.ts to align objectives with standards frameworks. */
export type MappingTag =
  | 'algorithms'
  | 'programming'
  | 'debugging'
  | 'computing-systems'
  | 'data'
  | 'impacts-of-computing'
  | 'collaboration'
  | 'engineering-design'
  | 'science-forces'
  | 'science-energy'
  | 'mathematics-measurement'
  | 'mathematics-geometry'
  | 'communication'

export interface LearningObjective {
  /** Stable id, e.g. "L1-S05-O1". Keys mapping.ts. */
  id: string
  /** For the teacher. */
  text: string
  /** For the child, read aloud: "I can …". */
  kidText: string
  concepts: ConceptId[]
  tags: MappingTag[]
}

// ── Episode (story) ───────────────────────────────────────────────────────

/** Speakers in the episode. `myrobot` is the child's own robot (its name is the child's choice). */
export type CharacterId = 'narrator' | 'spark' | 'amara' | 'lucia' | 'bolt' | 'myrobot' | 'guest'

export interface EpisodeLine {
  who: CharacterId
  /** Spoken line. Short words, short sentences for Level 1. */
  line: string
  /** Optional acting / animation note. */
  direction?: string
  /** For `guest`: who it is (e.g. "Mr Okafor, the baker"). */
  guestName?: string
}

export interface EpisodeScene {
  /** Where we are, for the 3D team. */
  setting: string
  /** What we see happen (camera, action). */
  action: string
  lines: EpisodeLine[]
  /** Approximate scene length in seconds. */
  seconds: number
}

export interface Episode {
  title: string
  /** "Last time…" one line, voiced over the opening (omitted for episode 1). */
  previously?: string
  scenes: EpisodeScene[]
  /** How the episode ends — a hook into next time (Level 1: gentle, never scary). */
  cliffhanger: string
  /** Sum of scene seconds; kept honest by a check in the doc script. */
  runtimeSec: number
}

// ── Build ─────────────────────────────────────────────────────────────────

export interface BuildStep {
  /** The part added, swapped in, or inspected. */
  part: PartRef
  action: 'choose' | 'add' | 'swap' | 'inspect'
  /** What Spark says while the child snaps it on (voice). */
  narration: string
  /** Why this part exists, in a child's words. */
  why: string
  /** The "try it without" moment: what goes wrong when it is missing. */
  tryWithout: string
  /** The real-world physical effect in the simulator (mass, grip, speed…). */
  physicsEffect: string
  /** A real robot that uses it. */
  realWorld: string
}

// ── Arenas and challenges ─────────────────────────────────────────────────

export type FloorType = 'mat' | 'wood' | 'carpet' | 'sand' | 'ice' | 'grass' | 'ramp' | 'mixed'

export interface ArenaSpec {
  id: string
  name: string
  /** What the child sees. */
  description: string
  /** Grid size in tiles (Level 1 uses a 25 cm tile grid). */
  gridTiles?: { cols: number; rows: number }
  tileCm?: number
  floor: FloorType
  /** Start tile (col,row from top-left, 0-based) and heading (0 = facing "up" the map). */
  start: { col: number; row: number; heading: 'up' | 'down' | 'left' | 'right' }
  /** Goal zone(s) in words, with tiles when on the grid. */
  goal: string
  /** Walls, objects, slopes, things to collect. */
  features: string[]
  /** Physics settings the simulator must use for this arena. */
  physics: string
  /** Capabilities the robot needs here. The arena refuses to load without them (with a friendly "add this part" prompt). */
  requires: Capability[]
}

export type SuccessKind =
  | 'reach-zone'
  | 'stop-in-zone'
  | 'no-collision'
  | 'deliver-object'
  | 'draw-path'
  | 'action-at-zone'
  | 'touch-and-react'
  | 'within-time'
  | 'within-blocks'

export interface SuccessCriterion {
  kind: SuccessKind
  /** Precise enough for the simulator team to implement. */
  detail: string
}

export interface CodeChallenge {
  title: string
  /** What the child is asked, read aloud. */
  mission: string
  arena: ArenaSpec
  allowedBlocks: AllowedBlock[]
  /** Pre-placed blocks, if any (e.g. a buggy program to fix). Written as plain pseudo-code. */
  starter?: string[]
  /** One correct program, as plain pseudo-code using block ids. */
  exampleSolution: string[]
  success: SuccessCriterion[]
  /** Stars: 1 = done, 2 and 3 for craft (never speed against other children). */
  stars: { two: string; three: string }
  /** Progressive hints, spoken by Spark — nudge first, near-answer last. */
  hints: [string, string, string]
}

// ── Check, badges, projects ───────────────────────────────────────────────

export interface QuizOption {
  text: string
  /** Emoji / icon so a non-reader can answer. */
  icon: string
}

export interface QuizQuestion {
  /** Read aloud. */
  prompt: string
  options: QuizOption[]
  /** Index into options. */
  answer: number
  /** Why — spoken after either answer. Never "wrong!": "Let's see why…". */
  why: string
}

export type Quiz = [QuizQuestion, QuizQuestion, QuizQuestion]

export interface Badge {
  id: string
  name: string
  icon: string
  /** "You earned this because you can …" */
  earnedFor: string
}

export interface Project {
  id: string
  /** The session that is the project (6, 12, 18 or 24). */
  session: number
  title: string
  /** The open brief, in the child's words. */
  brief: string
  /** The design steps (ask → imagine → plan → build → test → improve → share). */
  designSteps: string[]
  /** Fair limits that make it a design problem, not a free-for-all. */
  constraints: string[]
  /** "I can" self-checks (no scores, no ranking). */
  selfCheck: string[]
  /** How it is shared: to family, class gallery (teacher-moderated), never public by default. */
  share: string
}

// ── Teacher and parent ────────────────────────────────────────────────────

export interface TimingBlock {
  minutes: number
  activity: string
}

export interface TeacherNotes {
  /** A 40-minute class plan. Minutes must add up to 40. */
  timing: TimingBlock[]
  unpluggedWarmup: { title: string; minutes: number; steps: string[]; materials: string[] }
  discussion: string[]
  misconceptions: { idea: string; correction: string }[]
  differentiation: { faster: string[]; slower: string[] }
  /** Safety, classroom management, accessibility notes. */
  notes?: string[]
}

export interface ParentNote {
  /** What happened today, in one or two sentences. */
  today: string
  /** A 5-minute activity at home, with things every home has. */
  tryAtHome: string
  /** One question to ask the child (open, not a test). */
  askYourChild: string
}

// ── Sessions, seasons, levels ─────────────────────────────────────────────

export type LevelNumber = 1 | 2 | 3 | 4

export interface Session {
  /** "L1-S01" */
  id: string
  level: LevelNumber
  number: number
  title: string
  /** One line: what the child will be able to do. */
  objective: string
  kind: 'lesson' | 'project'
  durationMin: number
  objectives: LearningObjective[]
  concepts: ConceptId[]
  /** Blocks introduced for the first time in this session. */
  newBlocks: BlockId[]
  episode: Episode
  build: BuildStep
  code: CodeChallenge
  challenge: CodeChallenge
  quiz: Quiz
  badge: Badge
  /** Stars available (always 3 per challenge) and anything unlocked by learning. */
  reward: { unlocks?: PartRef; note: string }
  /** Present on project sessions (6, 12, 18, 24). */
  project?: Project
  teacher: TeacherNotes
  parent: ParentNote
}

/** A session as listed in a level overview (Levels 2–4 are outlined; Level 1 is in full). */
export interface SessionOutline {
  number: number
  title: string
  objective: string
  kind: 'lesson' | 'project'
  concepts: ConceptId[]
  /** Blocks introduced here. */
  newBlocks?: BlockId[]
  /** Part added or upgraded here. */
  part?: PartRef
}

export interface SeasonAct {
  sessions: [number, number]
  title: string
  summary: string
  /** The cliffhanger that closes the act. */
  actEnd: string
}

export interface Season {
  title: string
  premise: string
  setting: string
  arc: SeasonAct[]
  finale: string
}

export interface Certificate {
  title: string
  /** The wording printed on the certificate ({name} and {robotName} are filled in). */
  wording: string
  /** What the child must have done — learning, not attendance. */
  criteria: string[]
}

export interface Level {
  number: LevelNumber
  band: BandId
  name: string
  ages: string
  season: Season
  startRobot: RobotSpec
  endRobot: RobotSpec
  sessions: SessionOutline[]
  projects: Project[]
  certificate: Certificate
  /** Blocks available by the end of the level (cumulative). */
  blocks: BlockId[]
  /** How children of this age are supported (reading, motor skills, attention). */
  developmentalFit: string[]
}
