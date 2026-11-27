// lib/kids/curriculum/level3/kit.ts
// The authoring kit shared by Level 3 (Inventors, 11–13) and Level 4
// (Engineers, 14–17). Both levels are written to the Level 1 standard — every
// session has all six beats, a 40-minute class plan, a family note and a
// three-question check — but they are BUILT FROM PARTS THAT ALREADY EXIST
// (roadmap #23): each session names a playable challenge that is live today
// (a game tier, a Code Lab mission, a Physics Lab arena or a Skill Galaxy
// activity) and 2–3 Galaxy activities for practice, in `SessionReuse`.
//
// Additions on top of lib/kids/curriculum/types.ts (read-only, shared with
// Level 2), kept structurally compatible so a Level 3/4 `Session` is an
// ordinary `Session`:
//   - Every wrong quiz option carries `misconception: <id>`, and the id is one
//     of the session's `teacher.misconceptions`, each of which has a 5-minute
//     `reteach`. That is what roadmap #30 (the Class Mind Map) counts.
//   - Session titles, objectives, kinds, concepts and new blocks are read
//     from the outlines in ../levels.ts, so the outline and the full session
//     can never drift apart.
//
// Pure data + helpers: no React, no browser APIs.

import { levelByNumber } from '../levels'
import type {
  BuildStep,
  CharacterId,
  CodeChallenge,
  ConceptId,
  Episode,
  EpisodeLine,
  EpisodeScene,
  LearningObjective,
  LevelNumber,
  MappingTag,
  ParentNote,
  QuizOption,
  QuizQuestion,
  Session,
  SuccessCriterion,
  SuccessKind,
  TeacherNotes,
  TimingBlock,
  AllowedBlock,
  ArenaSpec,
  Badge,
  PartRef,
} from '../types'

// ── Misconceptions and tagged checks ──────────────────────────────────────

/** A misconception the check can detect, with the teacher's 5-minute reteach. */
export interface Misconception {
  /** Stable, kebab-case, unique within the level (e.g. "gain-bigger-is-better"). */
  id: string
  /** What a child who picks this distractor believes. */
  idea: string
  /** The accurate idea, in one or two sentences. */
  correction: string
  /** A 5-minute reteach the teacher can run straight away (roadmap #30). */
  reteach: string
}

/** A quiz option. Wrong options name the misconception they reveal. */
export interface TaggedOption extends QuizOption {
  misconception?: string
}

export interface TaggedQuestion extends QuizQuestion {
  options: TaggedOption[]
}

export function mc(id: string, idea: string, correction: string, reteach: string): Misconception {
  return { id, idea, correction, reteach }
}

/** The correct option (no misconception). */
export function right(text: string, icon: string): TaggedOption {
  return { text, icon }
}

/** A wrong option and the misconception it reveals. */
export function wrong(text: string, icon: string, misconception: string): TaggedOption {
  return { text, icon, misconception }
}

/**
 * A check question. Write the correct option FIRST. makeSession() then places
 * the right answer at a position taken from a fixed pattern over the session
 * number and question index, so positions are balanced across a level and
 * never repeat more than twice in a row (renderers shuffle per child anyway —
 * see QuizQuestion). The stored order is stable: it depends only on where the
 * question sits, never on import order.
 */
export function q(prompt: string, options: TaggedOption[], why: string): TaggedQuestion {
  return { prompt, options, answer: 0, why }
}

/** Right-answer positions, cycled over (session × 3 + question). Each position 1/3; no run longer than 2. */
const ANSWER_PATTERN = [1, 2, 0, 2, 0, 1, 0, 1, 2] as const

function placeAnswer(t: TaggedQuestion, slot: number): TaggedQuestion {
  const correct = t.options[t.answer]
  const rest = t.options.filter((_, i) => i !== t.answer)
  const at = ANSWER_PATTERN[slot % ANSWER_PATTERN.length] % t.options.length
  return { ...t, options: [...rest.slice(0, at), correct, ...rest.slice(at)], answer: at }
}

/** The misconception a chosen option reveals (null for the right answer or an untagged option). */
export function misconceptionFor(session: Session, question: number, option: number): Misconception | null {
  const qq = session.quiz[question] as TaggedQuestion | undefined
  const tag = qq?.options[option]?.misconception
  if (!tag) return null
  const list = session.teacher.misconceptions as Misconception[]
  return list.find((m) => m.id === tag) ?? null
}

// ── Episodes ──────────────────────────────────────────────────────────────

export type Line = [CharacterId, string] | [CharacterId, string, string]

function line([who, text, extra]: Line): EpisodeLine {
  if (who === 'guest') return { who, line: text, guestName: extra }
  return extra ? { who, line: text, direction: extra } : { who, line: text }
}

export function scene(setting: string, action: string, seconds: number, lines: Line[]): EpisodeScene {
  return { setting, action, seconds, lines: lines.map(line) }
}

/** Runtime = title card (10 s, 15 s with "Previously…") + scenes + the 15 s "Next time…" card. */
export function episode(title: string, previously: string | undefined, scenes: EpisodeScene[], cliffhanger: string): Episode {
  const runtimeSec = (previously ? 15 : 10) + scenes.reduce((a, s) => a + s.seconds, 0) + 15
  return { title, ...(previously ? { previously } : {}), scenes, cliffhanger, runtimeSec }
}

// ── Challenges ────────────────────────────────────────────────────────────

export function crit(kind: SuccessKind, detail: string): SuccessCriterion {
  return { kind, detail }
}

export interface ChallengeInput {
  title: string
  mission: string
  arena: ArenaSpec
  blocks: AllowedBlock[]
  starter?: string[]
  example: string[]
  success: SuccessCriterion[]
  two: string
  three: string
  hints: [string, string, string]
}

export function challenge(c: ChallengeInput): CodeChallenge {
  return {
    title: c.title,
    mission: c.mission,
    arena: c.arena,
    allowedBlocks: c.blocks,
    ...(c.starter ? { starter: c.starter } : {}),
    exampleSolution: c.example,
    success: c.success,
    stars: { two: c.two, three: c.three },
    hints: c.hints,
  }
}

/** Arena from a base with changes (the base is never mutated). */
export function arena(base: ArenaSpec, patch: Partial<ArenaSpec>): ArenaSpec {
  return { ...base, ...patch, features: patch.features ?? [...base.features], requires: patch.requires ?? [...base.requires] }
}

// ── Class plans ───────────────────────────────────────────────────────────

/** The standard 40-minute Level 3/4 lesson. The warm-up minutes come first. */
export function lessonPlan(warmupMin: 5 | 6 | 7, warmupTitle: string, discuss: string): TimingBlock[] {
  const challengeMin = 10 - (warmupMin - 5)
  return [
    { minutes: warmupMin, activity: `Unplugged warm-up: ${warmupTitle}` },
    { minutes: 5, activity: 'Episode on the big screen (captions on); one prediction question before it ends' },
    { minutes: 3, activity: 'Build: fit or inspect the part; pairs say what it measures or does' },
    { minutes: 10, activity: 'Code: the guided program with Spark — pairs predict, run, then change one number and run again' },
    { minutes: challengeMin, activity: 'Challenge: the session’s mission (driver, navigator and recorder rotate each run)' },
    { minutes: 5, activity: `Check (three questions, voted with fingers) and discussion: ${discuss}` },
    { minutes: 2, activity: 'Badge and exit ticket: one sentence, “Today I learned that…”' },
  ]
}

/** The 40-minute project session (6, 12, 18, 24). */
export function projectPlan(warmupMin: 3 | 4, warmupTitle: string): TimingBlock[] {
  return [
    { minutes: warmupMin, activity: `Warm-up: ${warmupTitle}` },
    { minutes: 4, activity: 'Episode and the brief, read together; underline the constraints' },
    { minutes: 6, activity: 'Ask, imagine, plan: two sketches per pair, choose one, list variables and states' },
    { minutes: 16 + (4 - warmupMin), activity: 'Build, test, improve in the simulator; the recorder logs every run' },
    { minutes: 8, activity: 'Share: each pair shows a run and one design decision; peers give two stars and a wish' },
    { minutes: 2, activity: 'Self-check and badge' },
  ]
}

export interface TeacherInput {
  timing: TimingBlock[]
  warmup: { title: string; minutes: number; steps: string[]; materials: string[] }
  discussion: string[]
  misconceptions: Misconception[]
  faster: string[]
  slower: string[]
  notes?: string[]
}

export function teacher(t: TeacherInput): TeacherNotes {
  return {
    timing: t.timing,
    unpluggedWarmup: t.warmup,
    discussion: t.discussion,
    misconceptions: t.misconceptions,
    differentiation: { faster: t.faster, slower: t.slower },
    ...(t.notes ? { notes: t.notes } : {}),
  }
}

// ── Objectives ────────────────────────────────────────────────────────────

export interface ObjectiveInput {
  text: string
  kid: string
  tags: MappingTag[]
  concepts?: ConceptId[]
  discussionOnly?: boolean
}

export function o(text: string, kid: string, tags: MappingTag[], extra: { concepts?: ConceptId[]; discussionOnly?: boolean } = {}): ObjectiveInput {
  return { text, kid, tags, ...extra }
}

// ── The session builder ───────────────────────────────────────────────────

export interface SessionInput {
  objectives: ObjectiveInput[]
  episode: Episode
  build: BuildStep
  code: CodeChallenge
  challenge: CodeChallenge
  quiz: [TaggedQuestion, TaggedQuestion, TaggedQuestion]
  badge: Badge
  reward: { unlocks?: PartRef; note: string }
  teacher: TeacherNotes
  parent: ParentNote
}

export function sessionId(level: LevelNumber, n: number): string {
  return `L${level}-S${String(n).padStart(2, '0')}`
}

/**
 * One full session. Title, objective, kind, concepts and new blocks come from
 * the outline in levels.ts; the project (sessions 6, 12, 18, 24) from the
 * level's project list.
 */
export function makeSession(level: LevelNumber, n: number, s: SessionInput): Session {
  const lvl = levelByNumber(level)
  const outline = lvl.sessions.find((x) => x.number === n)
  if (!outline) throw new Error(`Level ${level} has no session ${n} in levels.ts`)
  const id = sessionId(level, n)
  const objectives: LearningObjective[] = s.objectives.map((ob, i) => ({
    id: `${id}-O${i + 1}`,
    text: ob.text,
    kidText: ob.kid,
    concepts: ob.concepts ?? outline.concepts,
    tags: ob.tags,
    ...(ob.discussionOnly ? { discussionOnly: true } : {}),
  }))
  const project = outline.kind === 'project' ? lvl.projects.find((p) => p.session === n) : undefined
  return {
    id,
    level,
    number: n,
    title: outline.title,
    objective: outline.objective,
    kind: outline.kind,
    durationMin: 40,
    objectives,
    concepts: outline.concepts,
    newBlocks: outline.newBlocks ?? [],
    episode: s.episode,
    build: s.build,
    code: s.code,
    challenge: s.challenge,
    quiz: [placeAnswer(s.quiz[0], (n - 1) * 3), placeAnswer(s.quiz[1], (n - 1) * 3 + 1), placeAnswer(s.quiz[2], (n - 1) * 3 + 2)],
    badge: s.badge,
    reward: s.reward,
    ...(project ? { project } : {}),
    teacher: s.teacher,
    parent: s.parent,
  }
}

// ── What each session reuses (roadmap #23) ────────────────────────────────
// Light types + helpers live in ./reuse-kit.ts so a client island can import
// them without this file's levels.ts dependency.

export { reusePlayDone, reusePlayHref, TIER_LABEL, type ReusePlay, type ReuseProgress, type SessionReuse } from './reuse-kit'

// ── Teacher-guide data (per level) ────────────────────────────────────────

/**
 * What a teacher needs on top of each session's TeacherNotes: the level's
 * front matter for /kids/teach and, per session, the materials to gather and
 * what to look for (formative assessment). Session plans themselves come from
 * the Session (lib/kids/teach/guides.ts buildGuide).
 */
export interface LevelGuide {
  level: LevelNumber
  /** Heading for the level's section of /kids/teach. */
  title: string
  /** Server-rendered intro paragraph (real words, for teachers and search). */
  intro: string
  beforeYouStart: string[]
  /** 40-minute periods, 60–90-minute clubs, home use. */
  pacing: string[]
  /** How learning is evidenced (never ranks or compares children). */
  assessment: string[]
  safety: string[]
  sessions: Record<number, { materials: string[]; lookFor: string[] }>
}
