// lib/kids/universe/quests.ts
// The weekly quest pool of the R2BOT Universe (roadmap #10, 27 Nov 2026).
// Pure data + pure functions: no storage, no React. lib/kids/universe/rewards.ts
// counts progress; lib/kids/universe/rewards.verify.ts proves every quest can be
// finished by something that really reports it.
//
// Rules (docs/kids-universe.md → Rewards):
//   - Split by age band (lib/kids/bands.ts). Every child gets three quests and a
//     bonus fourth one each ISO week, the same for every child of that band.
//   - Quests only count things that are REPORTED (first finishes and
//     improvements), so a replay never moves a quest either.
//   - Course-only quests are hidden from a child with no open course session.
//   - A new week starts fresh and nothing is lost or shamed for a missed week:
//     no week streaks, no "you missed it" copy, no carried-over penalties.

import type { BandId } from '../bands'

export type ActivityKind =
  | 'session' // a curriculum session finished
  | 'challenge' // a physics challenge solved
  | 'game' // a Universe game round finished
  | 'episode' // an episode watched with its check
  | 'build' // the robot design changed and saved
  | 'project' // a "make it yours" project shared
  | 'bugfix' // a failing program fixed by the child
  | 'activity' // a Skill Galaxy activity completed
  | 'discovery' // a Robodex / Meet the Makers badge claimed (0 XP; no quest counts it)

/**
 * Where a report came from, worked out from its kind and id (see `sourceOf`).
 * The ids are the contract each reporter already uses — grep the source for them.
 */
export type QuestSource =
  | 'galaxy' // components/kids/activities/ActivityPlayerClient.tsx — the activity id
  | 'think' // components/kids/ai/think/LabUiClient.tsx — `think-<lab>-<mission>`
  | 'vision' // components/kids/ai/vision/VisionLabClient.tsx — `vision-lab:<mission>`
  | 'ask-spark' // components/kids/ai/spark/SparkSheetClient.tsx — 'ask-spark', once a day
  | 'talk' // components/kids/ai/talk/TalkClient.tsx — `talk-<mission>`
  | 'story' // components/kids/story/StoryPlayerClient.tsx — `story-<slug>`
  | 'course' // components/kids/course/SessionRunnerClient.tsx + EpisodePlayerClient — `L1-S09`, `L1-S09-build`, `episode-L1-S09`
  | 'codelab' // components/kids/codelab/MissionClient.tsx — `codelab-<mission>`
  | 'spark-trail' // app/kids/spark-trail/[zoneId]/[levelId]/LevelClient.tsx — `spark-trail-<zone>-<level>`
  | 'boss' // app/kids/challenge/[missionId]/ChallengeClient.tsx — `boss-<zone>`
  | 'game' // components/kids/ui/GameShellClient.tsx — `<game>:t<tier>`
  | 'garage' // reportRobotSaved() — 'robot-save', once a day
  | 'other'

const COURSE_ID = /^(episode-)?L\d+-S\d+/

export function sourceOf(kind: ActivityKind, id: string): QuestSource {
  if (kind === 'game') return 'game'
  if (kind === 'session' || kind === 'project' || COURSE_ID.test(id)) return 'course'
  if (id === 'robot-save') return 'garage'
  if (id === 'ask-spark') return 'ask-spark'
  if (id.startsWith('think-')) return 'think'
  if (id.startsWith('vision-lab:')) return 'vision'
  if (id.startsWith('talk-')) return 'talk'
  if (id.startsWith('story-')) return 'story'
  if (id.startsWith('codelab-')) return 'codelab'
  if (id.startsWith('spark-trail-')) return 'spark-trail'
  if (id.startsWith('boss-')) return 'boss'
  if (kind === 'activity') return 'galaxy'
  return 'other'
}

/**
 * Skill Galaxy activities built on the `debug-program` template: finishing one
 * is fixing a bug, so it also counts as a 'bugfix' (quest + Bug Hunter badge).
 * A copy of the ids, so the client bundle never loads the 600-activity
 * catalogue; rewards.verify.ts fails if it drifts from lib/kids/activities.
 */
export const DEBUG_ACTIVITY_IDS: ReadonlySet<string> = new Set([
  'code-ex-04',
  'code-ex-09',
  'code-bu-03',
  'code-bu-09',
  'code-in-06',
  'code-en-06',
  'code-en-10',
  'control-bu-03',
  'control-en-06',
])

/** Skill Galaxy activity id prefixes for each track (the content files and the older sample/zone ids). */
export const TRACK_PREFIXES = {
  motion: ['motion-'],
  sensors: ['sensors-', 'sense-'],
  code: ['code-'],
  electronics: ['electronics-', 'elec-'],
  mechanics: ['mechanics-', 'mech-'],
  control: ['control-'],
  ai: ['ai-'],
  design: ['design-'],
  space: ['space-', 'station-'],
  world: ['world-'],
  ocean: ['ocean-'],
  city: ['city-'],
  farm: ['farm-'],
} as const

export interface Quest {
  id: string
  /** The full line, for readers. */
  title: string
  /** Two to four words under the picture card (Explorers, pre-readers). */
  short: string
  /** What Spark says aloud for this quest (Explorers band; voice on). */
  say: string
  icon: string
  kind: ActivityKind
  target: number
  xp: number
  /** The bands that get this quest. */
  bands: readonly BandId[]
  /** Only reports from these sources count (omitted: any report of `kind`). */
  sources?: readonly QuestSource[]
  /** Only Skill Galaxy activities whose id starts with one of these count. */
  idPrefixes?: readonly string[]
  /** Only reports with at least this many stars count. */
  minStars?: number
  /** Only a replay that beats the child's own best counts. */
  improvement?: boolean
  /** The bonus fourth quest of the week: a stretch, never required. */
  bonus?: boolean
}

const ALL: readonly BandId[] = ['explorers', 'builders', 'inventors', 'engineers']
const E: readonly BandId[] = ['explorers']
const EB: readonly BandId[] = ['explorers', 'builders']
const B: readonly BandId[] = ['builders']
const BI: readonly BandId[] = ['builders', 'inventors']
const BIN: readonly BandId[] = ['builders', 'inventors', 'engineers']
const IN: readonly BandId[] = ['inventors', 'engineers']
const N: readonly BandId[] = ['engineers']

const GALAXY: readonly QuestSource[] = ['galaxy']

/** The pool. Each band sees only its own quests; course-only ones need an open course. */
export const QUEST_POOL: readonly Quest[] = [
  // ── Skill Galaxy ──
  { id: 'q-galaxy-3', title: 'Complete 3 Skill Galaxy missions', short: '3 Galaxy missions', say: 'Play three missions in the Skill Galaxy!', icon: '✨', kind: 'activity', target: 3, xp: 50, bands: E, sources: GALAXY },
  { id: 'q-galaxy-5', title: 'Complete 5 Skill Galaxy missions', short: '5 Galaxy missions', say: 'Complete five Skill Galaxy missions.', icon: '✨', kind: 'activity', target: 5, xp: 70, bands: BI, sources: GALAXY },
  { id: 'q-galaxy-8', title: 'Complete 8 Skill Galaxy missions', short: '8 Galaxy missions', say: 'Complete eight Skill Galaxy missions.', icon: '🌌', kind: 'activity', target: 8, xp: 110, bands: N, sources: GALAXY },
  { id: 'q-galaxy-3star', title: 'Get 3 stars on 2 Skill Galaxy missions', short: '3 stars, 2 times', say: 'Get three stars on two Galaxy missions!', icon: '🌟', kind: 'activity', target: 2, xp: 70, bands: EB, sources: GALAXY, minStars: 3 },
  { id: 'q-galaxy-3star-4', title: 'Get 3 stars on 4 Skill Galaxy missions', short: '3 stars, 4 times', say: 'Get three stars on four Galaxy missions.', icon: '🌟', kind: 'activity', target: 4, xp: 100, bands: IN, sources: GALAXY, minStars: 3 },
  { id: 'q-track-motion', title: 'Complete 2 Motion missions in the Skill Galaxy', short: '2 Motion missions', say: 'Make robots move! Do two Motion missions.', icon: '🛞', kind: 'activity', target: 2, xp: 60, bands: EB, sources: GALAXY, idPrefixes: [...TRACK_PREFIXES.motion] },
  { id: 'q-track-sensors', title: 'Complete 2 Sensor missions in the Skill Galaxy', short: '2 Sensor missions', say: 'How do robots see and feel? Do two Sensor missions.', icon: '📡', kind: 'activity', target: 2, xp: 60, bands: ALL, sources: GALAXY, idPrefixes: [...TRACK_PREFIXES.sensors] },
  { id: 'q-track-code', title: 'Complete 2 Code missions in the Skill Galaxy', short: '2 Code missions', say: 'Tell a robot what to do! Do two Code missions.', icon: '🧩', kind: 'activity', target: 2, xp: 60, bands: ALL, sources: GALAXY, idPrefixes: [...TRACK_PREFIXES.code] },
  { id: 'q-track-electronics', title: 'Complete 2 Electronics missions in the Skill Galaxy', short: '2 Circuit missions', say: 'Light it up! Do two Electronics missions.', icon: '⚡', kind: 'activity', target: 2, xp: 60, bands: BIN, sources: GALAXY, idPrefixes: [...TRACK_PREFIXES.electronics] },
  { id: 'q-track-mechanics', title: 'Complete 2 Mechanics missions in the Skill Galaxy', short: '2 Gear missions', say: 'Gears and levers! Do two Mechanics missions.', icon: '⚙️', kind: 'activity', target: 2, xp: 60, bands: ALL, sources: GALAXY, idPrefixes: [...TRACK_PREFIXES.mechanics] },
  { id: 'q-track-control', title: 'Complete 2 Control missions in the Skill Galaxy', short: '2 Control missions', say: 'Keep a robot steady with two Control missions.', icon: '🎚️', kind: 'activity', target: 2, xp: 70, bands: IN, sources: GALAXY, idPrefixes: [...TRACK_PREFIXES.control] },
  { id: 'q-track-ai', title: 'Complete 2 AI & Maps missions in the Skill Galaxy', short: '2 AI missions', say: 'Teach a robot brain with two AI missions.', icon: '🧠', kind: 'activity', target: 2, xp: 70, bands: BIN, sources: GALAXY, idPrefixes: [...TRACK_PREFIXES.ai] },
  { id: 'q-track-design', title: 'Complete 2 Design missions in the Skill Galaxy', short: '2 Design missions', say: 'Plan, build, test! Do two Design missions.', icon: '🛠️', kind: 'activity', target: 2, xp: 60, bands: BIN, sources: GALAXY, idPrefixes: [...TRACK_PREFIXES.design] },
  { id: 'q-track-space', title: 'Complete 2 Explore missions in the Skill Galaxy', short: '2 Space missions', say: 'Blast off! Do two space missions.', icon: '🚀', kind: 'activity', target: 2, xp: 60, bands: ALL, sources: GALAXY, idPrefixes: [...TRACK_PREFIXES.space] },
  { id: 'q-track-world', title: 'Complete 2 Robots & Us missions in the Skill Galaxy', short: '2 Robots & Us', say: 'Robots help people! Do two Robots and Us missions.', icon: '🌍', kind: 'activity', target: 2, xp: 60, bands: ALL, sources: GALAXY, idPrefixes: [...TRACK_PREFIXES.world] },
  { id: 'q-track-ocean', title: 'Complete 2 Ocean Lab missions', short: '2 Ocean missions', say: 'Dive in! Do two Ocean Lab missions.', icon: '🌊', kind: 'activity', target: 2, xp: 60, bands: ALL, sources: GALAXY, idPrefixes: [...TRACK_PREFIXES.ocean] },
  { id: 'q-track-farm', title: 'Complete 2 Smart Farm missions', short: '2 Farm missions', say: 'Help the robot farm! Do two Smart Farm missions.', icon: '🚜', kind: 'activity', target: 2, xp: 60, bands: ALL, sources: GALAXY, idPrefixes: [...TRACK_PREFIXES.farm] },
  { id: 'q-track-city', title: 'Complete 2 Robot City missions', short: '2 City missions', say: 'Keep Robot City moving with two missions.', icon: '🏙️', kind: 'activity', target: 2, xp: 60, bands: ALL, sources: GALAXY, idPrefixes: [...TRACK_PREFIXES.city] },
  // ── How Robots Think / Ask Spark ──
  { id: 'q-think-1', title: 'Finish a How Robots Think mission', short: 'Robot brain mission', say: 'Find out how robots think! Finish one mission.', icon: '💭', kind: 'activity', target: 1, xp: 40, bands: ALL, sources: ['think', 'vision'] },
  { id: 'q-vision-1', title: 'Teach the Vision Lab robot something new', short: 'Teach robot eyes', say: 'Teach the robot to see something new.', icon: '👁️', kind: 'activity', target: 1, xp: 50, bands: BIN, sources: ['vision'] },
  { id: 'q-ask-spark', title: 'Ask Spark a question', short: 'Ask Spark', say: 'Ask me a question about robots!', icon: '💬', kind: 'activity', target: 1, xp: 20, bands: EB, sources: ['ask-spark'] },
  // ── Challenges ──
  { id: 'q-challenge-2', title: 'Solve 2 robot challenges', short: '2 challenges', say: 'Solve two robot challenges!', icon: '🏁', kind: 'challenge', target: 2, xp: 50, bands: EB },
  { id: 'q-challenge-4', title: 'Solve 4 robot challenges', short: '4 challenges', say: 'Solve four robot challenges.', icon: '🏁', kind: 'challenge', target: 4, xp: 90, bands: IN },
  { id: 'q-codelab-1', title: 'Finish a Code Lab mission', short: 'Code Lab mission', say: 'Drive your robot with blocks in the Code Lab!', icon: '🧱', kind: 'challenge', target: 1, xp: 50, bands: EB, sources: ['codelab'] },
  { id: 'q-codelab-2', title: 'Solve 2 Code Lab missions', short: '2 Code Lab', say: 'Solve two Code Lab missions.', icon: '🧱', kind: 'challenge', target: 2, xp: 80, bands: IN, sources: ['codelab'] },
  { id: 'q-trail-2', title: 'Finish 2 Spark Trail levels', short: '2 Trail levels', say: 'Walk the Spark Trail! Finish two levels.', icon: '🥾', kind: 'challenge', target: 2, xp: 40, bands: EB, sources: ['spark-trail'] },
  { id: 'q-talk-2', title: 'Solve 2 Talk-to-your-robot missions', short: '2 Talk missions', say: 'Program a robot by talking to it!', icon: '🗣️', kind: 'challenge', target: 2, xp: 80, bands: IN, sources: ['talk'] },
  // ── Games ──
  { id: 'q-game-1', title: 'Win a game round', short: 'Win a game', say: 'Win a round in a robot game!', icon: '🎮', kind: 'game', target: 1, xp: 30, bands: E },
  { id: 'q-game-2', title: 'Win 2 game rounds (a new win or a new best)', short: '2 game wins', say: 'Win two game rounds!', icon: '🎮', kind: 'game', target: 2, xp: 50, bands: B },
  { id: 'q-game-3', title: 'Win 3 game rounds (a new win or a new best)', short: '3 game wins', say: 'Win three game rounds.', icon: '🎮', kind: 'game', target: 3, xp: 80, bands: IN },
  { id: 'q-game-3star', title: 'Get 3 stars in a game', short: '3 stars in a game', say: 'Get three stars in a game!', icon: '⭐', kind: 'game', target: 1, xp: 60, bands: EB, minStars: 3 },
  { id: 'q-game-best', title: 'Beat your own best score in a game', short: 'Beat your best', say: 'Beat your own best score!', icon: '📈', kind: 'game', target: 1, xp: 70, bands: BIN, improvement: true },
  // ── Stories and episodes ──
  { id: 'q-episode-1', title: 'Watch an episode to the end', short: 'Watch an episode', say: 'Watch a robot story to the end!', icon: '🎬', kind: 'episode', target: 1, xp: 40, bands: E },
  { id: 'q-story-1', title: 'Finish a Story Theatre episode', short: 'Story Theatre', say: 'Finish a Story Theatre episode.', icon: '🎭', kind: 'episode', target: 1, xp: 40, bands: BIN, sources: ['story'] },
  { id: 'q-story-3star', title: 'Get all 3 stars in a Story Theatre episode', short: '3-star story', say: 'Get all three stars in a story!', icon: '🎭', kind: 'episode', target: 1, xp: 60, bands: IN, sources: ['story'], minStars: 3 },
  // ── Your robot ──
  { id: 'q-build-1', title: 'Upgrade your robot', short: 'Upgrade your robot', say: 'Give your robot a new part or a new look!', icon: '🔧', kind: 'build', target: 1, xp: 30, bands: ALL },
  { id: 'q-build-2', title: 'Upgrade your robot on 2 different days', short: 'Upgrade, 2 days', say: 'Upgrade your robot on two different days.', icon: '🔧', kind: 'build', target: 2, xp: 50, bands: EB },
  // ── Bugs ──
  { id: 'q-bugfix-1', title: 'Fix a bug in a program', short: 'Fix a bug', say: 'Find the bug and fix it!', icon: '🐞', kind: 'bugfix', target: 1, xp: 50, bands: ALL },
  { id: 'q-bugfix-2', title: 'Fix bugs in 2 programs', short: 'Fix 2 bugs', say: 'Fix the bugs in two programs.', icon: '🐞', kind: 'bugfix', target: 2, xp: 90, bands: IN },
  // ── Course (hidden without an open course session) ──
  { id: 'q-session-1', title: 'Finish a course session', short: 'Course session', say: 'Do a course session with me!', icon: '📘', kind: 'session', target: 1, xp: 50, bands: E },
  { id: 'q-session-2', title: 'Finish 2 course sessions', short: '2 course sessions', say: 'Finish two course sessions.', icon: '📘', kind: 'session', target: 2, xp: 80, bands: BIN },
  { id: 'q-course-challenge', title: 'Solve a course challenge', short: 'Course challenge', say: 'Solve the challenge in a course session!', icon: '🏆', kind: 'challenge', target: 1, xp: 40, bands: E, sources: ['course'] },
  // ── Bonus (the fourth quest: a stretch, never required) ──
  { id: 'q-bonus-galaxy-6', title: 'Bonus: complete 6 Skill Galaxy missions', short: '6 Galaxy missions', say: 'Bonus! Play six Galaxy missions.', icon: '🌠', kind: 'activity', target: 6, xp: 100, bands: E, sources: GALAXY, bonus: true },
  { id: 'q-bonus-galaxy-10', title: 'Bonus: complete 10 Skill Galaxy missions', short: '10 Galaxy missions', say: 'Bonus! Ten Galaxy missions.', icon: '🌠', kind: 'activity', target: 10, xp: 150, bands: BIN, sources: GALAXY, bonus: true },
  { id: 'q-bonus-trail-4', title: 'Bonus: finish 4 Spark Trail levels', short: '4 Trail levels', say: 'Bonus! Finish four Spark Trail levels.', icon: '🥾', kind: 'challenge', target: 4, xp: 90, bands: EB, sources: ['spark-trail'], bonus: true },
  { id: 'q-bonus-game-3star-2', title: 'Bonus: get 3 stars in 2 game rounds', short: '3 stars, 2 games', say: 'Bonus! Three stars in two games.', icon: '🏅', kind: 'game', target: 2, xp: 130, bands: BIN, minStars: 3, bonus: true },
  { id: 'q-bonus-best-2', title: 'Bonus: beat your own best score twice', short: 'Beat your best ×2', say: 'Bonus! Beat your best score two times.', icon: '📈', kind: 'game', target: 2, xp: 140, bands: IN, improvement: true, bonus: true },
  { id: 'q-bonus-bugfix-3', title: 'Bonus: fix bugs in 3 programs', short: 'Fix 3 bugs', say: 'Bonus! Fix three bugs.', icon: '🪲', kind: 'bugfix', target: 3, xp: 130, bands: IN, bonus: true },
  { id: 'q-bonus-project', title: 'Bonus: finish a Make-it-Yours project', short: 'Make it yours', say: 'Bonus! Finish a Make it Yours project.', icon: '🌟', kind: 'project', target: 1, xp: 120, bands: ALL, bonus: true },
]

/** Quests that only a course session can report: hidden without an open course. */
export function isCourseOnly(q: Quest): boolean {
  if (q.kind === 'session' || q.kind === 'project') return true
  return Boolean(q.sources && q.sources.length > 0 && q.sources.every((s) => s === 'course'))
}

/** ISO week key, e.g. "2026-W48". Deterministic, so every device agrees. */
export function weekKey(d: Date = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export interface QuestPick {
  /** A child with no band yet gets the Explorers quests (the band the first course level is for). */
  band?: BandId | null
  /** False hides course-only quests. Default true. */
  courseOpen?: boolean
}

/** The quests a child of `band` can get this week (before the weekly draw). */
export function questPoolFor(band: BandId, courseOpen: boolean): Quest[] {
  return QUEST_POOL.filter((q) => q.bands.includes(band) && (courseOpen || !isCourseOnly(q)))
}

/**
 * This week's quests: three main quests (three different kinds of thing to do)
 * and a bonus fourth one. The draw is seeded by the ISO week and the band, so it
 * rotates every Monday and every child in a band and every device agrees.
 */
export function drawQuests(d: Date = new Date(), pick: QuestPick = {}): Quest[] {
  const band: BandId = pick.band ?? 'explorers'
  const pool = questPoolFor(band, pick.courseOpen ?? true)
  let h = 2166136261
  for (const c of `${weekKey(d)}|${band}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0
  const next = (n: number) => {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0
    return (h >>> 8) % n
  }
  const main = pool.filter((q) => !q.bonus)
  const out: Quest[] = []
  const kinds = new Set<ActivityKind>()
  let guard = 0
  while (out.length < 3 && main.length && guard++ < 200) {
    const q = main.splice(next(main.length), 1)[0]
    // Prefer three different kinds; fall back to any once the variety runs out.
    if (kinds.has(q.kind) && main.some((m) => !kinds.has(m.kind))) {
      main.push(q)
      continue
    }
    kinds.add(q.kind)
    out.push(q)
  }
  const bonus = pool.filter((q) => q.bonus)
  if (bonus.length) out.push(bonus[next(bonus.length)])
  return out
}

export interface QuestEvent {
  kind: ActivityKind
  id: string
  stars: number
  /** The report beat an earlier personal best (a replay that improved). */
  improved: boolean
}

/** Does this report move this quest? */
export function questMatches(q: Quest, e: QuestEvent): boolean {
  const kindOk = q.kind === e.kind || (q.kind === 'bugfix' && e.kind === 'activity' && DEBUG_ACTIVITY_IDS.has(e.id))
  if (!kindOk) return false
  const src = sourceOf(e.kind, e.id)
  // A debug-program activity counted as a bugfix is a Galaxy report: no source rule applies to it.
  if (q.sources && q.kind === e.kind && !q.sources.includes(src)) return false
  if (q.idPrefixes && !q.idPrefixes.some((p) => e.id.startsWith(p))) return false
  if (q.minStars !== undefined && e.stars < q.minStars) return false
  if (q.improvement && !e.improved) return false
  return true
}
