// lib/kids/universe/rewards.ts
// THE rewards engine of the R2BOT Universe. Every surface (curriculum sessions,
// games, the workshop, stories, the old Robot World) reports what the child did
// through ONE function, reportActivity(), and this file decides XP, levels,
// badges, unlocks, quest progress and personal bests. Nothing else writes those
// fields.
//
// Design rules (agreed with the founder, Nov 2026):
//   - Reward learning and effort, never time spent.
//   - Personal bests, never rankings. No leaderboards, no comparing children.
//   - Play-day count is shown as "days explored this week" — no streak that
//     punishes a missed day.
//   - Every unlock is earned by doing something, never bought.

import { getProgress, saveProgress, type KidsProgress } from '../../kids-progress'
import type { BandId } from '../bands'
import { DEBUG_ACTIVITY_IDS, drawQuests, questMatches, weekKey, type ActivityKind, type Quest } from './quests'
import { UNLOCKS, type Unlock } from './unlocks'

// ── Levels ─────────────────────────────────────────────────────────────────

/** XP needed to REACH level n (n >= 1). Level 1 = 0 XP; gentle early, steeper later. */
export function xpForLevel(n: number): number {
  if (n <= 1) return 0
  return Math.round(60 * Math.pow(n - 1, 1.6))
}

export const MAX_LEVEL = 60

export interface LevelInfo {
  level: number
  title: string
  xpIntoLevel: number
  xpForNext: number
  /** 0..1 progress to the next level. */
  progress: number
}

const RANK_TITLES: { from: number; title: string }[] = [
  { from: 1, title: 'Star Cadet' },
  { from: 5, title: 'Bolt Tinkerer' },
  { from: 10, title: 'Circuit Ranger' },
  { from: 15, title: 'Sensor Scout' },
  { from: 20, title: 'Code Pilot' },
  { from: 28, title: 'Robot Engineer' },
  { from: 36, title: 'Autonomy Architect' },
  { from: 45, title: 'Mission Commander' },
  { from: 55, title: 'Universe Builder' },
]

export function levelInfo(xp: number): LevelInfo {
  let level = 1
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++
  const base = xpForLevel(level)
  const next = level >= MAX_LEVEL ? base : xpForLevel(level + 1)
  const title = [...RANK_TITLES].reverse().find((r) => level >= r.from)?.title ?? RANK_TITLES[0].title
  return {
    level,
    title,
    xpIntoLevel: xp - base,
    xpForNext: next - base,
    progress: next === base ? 1 : (xp - base) / (next - base),
  }
}

// ── Badges ─────────────────────────────────────────────────────────────────

export type BadgeTrack = 'motion' | 'sensing' | 'logic' | 'control' | 'mechanics' | 'electronics' | 'ai' | 'design' | 'explorer' | 'grit'

export interface UniverseBadge {
  id: string
  name: string
  icon: string
  track: BadgeTrack
  /** "You earned this because you can …" — said aloud. */
  earnedFor: string
}

/**
 * Universe-wide badges. Curriculum sessions also award their own badges (their
 * ids are prefixed by the session id); those are recorded with the same
 * function and need not be listed here.
 */
export const UNIVERSE_BADGES: UniverseBadge[] = [
  { id: 'first-drive', name: 'First Drive', icon: '🛞', track: 'motion', earnedFor: 'you made a robot move with your own program.' },
  { id: 'precise-parker', name: 'Precise Parker', icon: '🅿️', track: 'motion', earnedFor: 'you stopped a robot exactly inside a target.' },
  { id: 'wall-whisperer', name: 'Wall Whisperer', icon: '🧱', track: 'sensing', earnedFor: 'you used a distance sensor to stop before a wall.' },
  { id: 'line-rider', name: 'Line Rider', icon: '〰️', track: 'sensing', earnedFor: 'you made a robot follow a line on its own.' },
  { id: 'colour-coder', name: 'Colour Coder', icon: '🎨', track: 'sensing', earnedFor: 'you made a robot decide by the colour it sees.' },
  { id: 'loop-master', name: 'Loop Master', icon: '🔁', track: 'logic', earnedFor: 'you replaced repeated blocks with a loop.' },
  { id: 'decision-maker', name: 'Decision Maker', icon: '🔀', track: 'logic', earnedFor: 'you wrote an IF/ELSE that chose the right action.' },
  { id: 'memory-keeper', name: 'Memory Keeper', icon: '🧮', track: 'logic', earnedFor: 'you used a variable to remember something.' },
  { id: 'smooth-operator', name: 'Smooth Operator', icon: '🎚️', track: 'control', earnedFor: 'you used proportional control instead of bang-bang.' },
  { id: 'pid-tuner', name: 'PID Tuner', icon: '📈', track: 'control', earnedFor: 'you tuned a controller until it stopped wobbling.' },
  { id: 'hover-hero', name: 'Hover Hero', icon: '🚁', track: 'control', earnedFor: 'you held a drone steady at its target height.' },
  { id: 'arm-artist', name: 'Arm Artist', icon: '🦾', track: 'mechanics', earnedFor: 'you moved a robot arm joint by joint to grab something.' },
  { id: 'gear-head', name: 'Gear Head', icon: '⚙️', track: 'mechanics', earnedFor: 'you matched a machine’s speed to its strength — the right gear, or the right arm speed for a heavy load.' },
  { id: 'circuit-closer', name: 'Circuit Closer', icon: '💡', track: 'electronics', earnedFor: 'you built a complete circuit that worked.' },
  { id: 'ohms-friend', name: "Ohm's Friend", icon: 'Ω', track: 'electronics', earnedFor: 'you picked a resistor that kept an LED safe.' },
  { id: 'robot-teacher', name: 'Robot Teacher', icon: '🧠', track: 'ai', earnedFor: 'you trained a robot brain with your own examples.' },
  { id: 'map-maker', name: 'Map Maker', icon: '🗺️', track: 'ai', earnedFor: 'your robot built a map of a place it had never seen.' },
  { id: 'swarm-captain', name: 'Swarm Captain', icon: '🐝', track: 'ai', earnedFor: 'you made several robots work together with simple rules.' },
  { id: 'mars-planner', name: 'Mars Planner', icon: '🔴', track: 'ai', earnedFor: 'you planned a rover drive that worked despite the signal delay.' },
  { id: 'designer', name: 'Maker Spirit', icon: '🛠️', track: 'design', earnedFor: 'you designed your own robot and gave it a name.' },
  { id: 'right-tool', name: 'Right Tool for the Job', icon: '🧰', track: 'design', earnedFor: 'you changed a part because the mission needed it.' },
  { id: 'storyteller', name: 'Story Explorer', icon: '🎬', track: 'explorer', earnedFor: 'you watched a whole episode and joined in with the story.' },
  { id: 'planet-hopper', name: 'Planet Hopper', icon: '🪐', track: 'explorer', earnedFor: 'you explored a new world of the Universe.' },
  { id: 'never-give-up', name: 'Never Give Up', icon: '💪', track: 'grit', earnedFor: 'you kept trying after five tries and solved it.' },
  { id: 'debugger', name: 'Bug Hunter', icon: '🐞', track: 'grit', earnedFor: 'you found and fixed a bug in your own program.' },
]

export function getBadge(id: string): UniverseBadge | undefined {
  return UNIVERSE_BADGES.find((b) => b.id === id)
}

// ── Unlocks (cosmetics, titles) — the data lives in ./unlocks.ts ─────────────

export { UNLOCKS, unlocksAtLevel, unlockUse, bestTitle, type Unlock } from './unlocks'

// ── Quests (weekly, gentle, by band) — the pool lives in ./quests.ts ─────────

export { QUEST_POOL, weekKey, isCourseOnly, sourceOf, type ActivityKind, type Quest, type QuestSource } from './quests'

/**
 * Bands whose course level is playable today (Level 1 = Explorers). Keep in step
 * with PLAYABLE_LEVELS in app/kids/page.tsx when Level 2 ships.
 */
export const COURSE_OPEN_BANDS: readonly BandId[] = ['explorers']

/** lib/kids course state (components/kids/course/course-state.ts COURSE_KEY), read raw so lib never imports components. */
const COURSE_STATE_KEY = 'r2bot_kids_course_v1'

/**
 * True when the child has a course session open to them: their band's level is
 * playable, or they have started or finished a session. Course-only quests are
 * hidden otherwise (a teen with no playable level must never see an impossible quest).
 */
export function hasOpenCourse(p: KidsProgress): boolean {
  if (p.band === null || COURSE_OPEN_BANDS.includes(p.band)) return true
  if (Object.keys(p.sessionsDone).length > 0) return true
  if (typeof window === 'undefined') return false
  try {
    const raw = window.localStorage.getItem(COURSE_STATE_KEY)
    if (!raw) return false
    const o = JSON.parse(raw) as { sessions?: Record<string, { done?: boolean }> }
    return Boolean(o.sessions && Object.values(o.sessions).some((st) => st && !st.done))
  } catch {
    return false
  }
}

/** This week's quests for this child: three for their band and a bonus fourth one. */
export function currentQuests(d: Date = new Date(), p?: KidsProgress): Quest[] {
  const prog = p ?? getProgress()
  return drawQuests(d, { band: prog.band, courseOpen: hasOpenCourse(prog) })
}

/** Quest progress is stored under "<weekKey>:<questId>" so a new week starts fresh without wiping anything. */
function questKey(q: Quest, d: Date = new Date()): string {
  return `${weekKey(d)}:${q.id}`
}

export interface QuestState {
  quest: Quest
  count: number
  done: boolean
  /** The fourth, stretch quest of the week. */
  bonus: boolean
}

export function questStatus(p: KidsProgress = getProgress(), d: Date = new Date()): QuestState[] {
  return currentQuests(d, p).map((quest) => {
    const count = p.questProgress[questKey(quest, d)] ?? 0
    return { quest, count, done: count >= quest.target, bonus: Boolean(quest.bonus) }
  })
}

export function daysExploredThisWeek(p: KidsProgress = getProgress(), d: Date = new Date()): number {
  const wk = weekKey(d)
  return p.playDays.filter((day) => weekKey(new Date(`${day}T12:00:00`)) === wk).length
}

// ── The one entry point ──────────────────────────────────────────────────────

export interface ActivityReport {
  kind: ActivityKind
  /** Stable id of the thing done: session id, game id, challenge id, episode slug. */
  id: string
  /** Base XP before bonuses. Defaults by kind if omitted. */
  xp?: number
  /** 1–3 stars when the activity has them. */
  stars?: number
  /** Badge ids earned by this activity (universe or curriculum badges). */
  badges?: string[]
  /** A score to compare with the child's own personal best for `id`. */
  score?: number
  /** True when a LOWER score is better (e.g. lap time). */
  lowerIsBetter?: boolean
  /** Number of attempts it took; 5+ then success earns "Never Give Up". */
  attempts?: number
}

export interface RewardResult {
  /** What was reported (kind + id), so a listener can tell rewards apart. */
  kind: ActivityKind
  id: string
  xpGained: number
  levelBefore: number
  levelAfter: number
  /** XP before this report, so a level-up ceremony can fill the bar from where it was. */
  xpBefore: number
  newBadges: UniverseBadge[]
  /** Curriculum or other badge ids recorded for the first time that are not in UNIVERSE_BADGES. */
  newOtherBadges: string[]
  newUnlocks: Unlock[]
  questsCompleted: Quest[]
  newPersonalBest: boolean
  progress: KidsProgress
}

const DEFAULT_XP: Record<ActivityKind, number> = {
  session: 50,
  challenge: 30,
  game: 20,
  episode: 25,
  build: 15,
  project: 120,
  bugfix: 20,
  activity: 15,
}

export const REWARD_EVENT = 'r2bot:kids-reward'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** The child's local calendar day, YYYY-MM-DD (for once-a-day rewards). */
function localDay(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Share of the base XP a replay earns when it beats the child's own best (a first finish earns it all). */
export const IMPROVEMENT_XP_SHARE = 0.5

/** True when `score` beats `prev` (no previous best always counts). */
export function beatsBest(score: number, prev: number | undefined, lowerIsBetter = false): boolean {
  return prev === undefined || (lowerIsBetter ? score < prev : score > prev)
}

/**
 * THE rule for anything that can be replayed (games, Story Theatre, Code Lab
 * missions, Spark Trail levels, boss challenges, think/vision missions): report
 * only the first finish and runs that beat the child's own best `score`, so
 * replaying the same thing never farms XP. An improvement earns
 * IMPROVEMENT_XP_SHARE of the base XP (plus the personal-best bonus).
 * Returns null — nothing reported, 0 XP — for a replay that did not improve.
 */
export function reportBestRun(r: ActivityReport & { score: number }): RewardResult | null {
  if (!Number.isFinite(r.score)) return null
  const prev = getProgress().personalBests[r.id]
  if (!beatsBest(r.score, prev, r.lowerIsBetter)) return null
  if (prev === undefined) return reportActivity(r)
  return reportActivity({ ...r, xp: Math.max(1, Math.round((r.xp ?? DEFAULT_XP[r.kind]) * IMPROVEMENT_XP_SHARE)) })
}

const BUILD_DAY_KEY = 'r2bot_kids_build_day'

/**
 * The child saved their robot (Workshop "Garage" saves): reports kind 'build'
 * at most once per local day — the "Upgrade your robot" quests and the Maker
 * Spirit badge. RewardToastClient calls this when `robotsBuilt` goes up, so
 * every save path counts without each one importing the rewards engine.
 */
export function reportRobotSaved(now: Date = new Date()): RewardResult | null {
  if (typeof window === 'undefined') return null
  const day = localDay(now)
  try {
    if (window.localStorage.getItem(BUILD_DAY_KEY) === day) return null
    window.localStorage.setItem(BUILD_DAY_KEY, day)
  } catch {
    return null // storage blocked: skip rather than risk repeating it
  }
  return reportActivity({ kind: 'build', id: 'robot-save' })
}

/**
 * The child fixed a broken program (a debug-program activity, a "fix" mission).
 * First fix of each `id` only. Skill Galaxy debug-program activities need no
 * call: reportActivity counts them as a bugfix by id (DEBUG_ACTIVITY_IDS).
 */
export function reportBugFixed(id: string, stars?: number): RewardResult | null {
  return reportBestRun({ kind: 'bugfix', id: `bugfix-${id}`, stars, score: 1 })
}

/**
 * Report something the child did. Returns everything they earned so the caller
 * can celebrate it, and fires REWARD_EVENT on window with the RewardResult as
 * `detail` so the global reward toast can show it without the caller's help.
 * Anything that can be replayed must come through reportBestRun instead.
 */
export function reportActivity(r: ActivityReport): RewardResult {
  const p = getProgress()
  const before = levelInfo(p.xp).level

  const stars = Math.max(0, Math.min(3, Math.floor(r.stars ?? 0)))
  let xp = r.xp ?? DEFAULT_XP[r.kind]
  if (stars) xp = Math.round(xp * (0.6 + 0.2 * stars)) // 1★ 80%, 2★ 100%, 3★ 120%

  // Personal best
  let newPersonalBest = false
  const personalBests = { ...p.personalBests }
  if (typeof r.score === 'number' && Number.isFinite(r.score)) {
    const prev = personalBests[r.id]
    if (beatsBest(r.score, prev, r.lowerIsBetter)) {
      personalBests[r.id] = r.score
      newPersonalBest = prev !== undefined
      if (newPersonalBest) xp += 10
    }
  }

  const debugFix = r.kind === 'activity' && DEBUG_ACTIVITY_IDS.has(r.id)

  // Badges
  const badges = { ...p.badges }
  const earned = [...(r.badges ?? [])]
  if ((r.attempts ?? 0) >= 5) earned.push('never-give-up')
  if (r.kind === 'bugfix' || debugFix) earned.push('debugger')
  if (r.kind === 'episode') earned.push('storyteller')
  if (r.kind === 'build') earned.push('designer')
  const newBadges: UniverseBadge[] = []
  const newOtherBadges: string[] = []
  for (const id of earned) {
    if (badges[id]) continue
    badges[id] = today()
    const ub = getBadge(id)
    if (ub) newBadges.push(ub)
    else newOtherBadges.push(id)
    xp += 25
  }

  // Quests: this child's quests this week (their band; course-only ones only with an open course).
  const questProgress = { ...p.questProgress }
  const questsCompleted: Quest[] = []
  const event = { kind: r.kind, id: r.id, stars, improved: newPersonalBest }
  for (const q of currentQuests(new Date(), p)) {
    if (!questMatches(q, event)) continue
    const k = questKey(q)
    const prev = questProgress[k] ?? 0
    if (prev >= q.target) continue
    questProgress[k] = prev + 1
    if (prev + 1 >= q.target) {
      questsCompleted.push(q)
      xp += q.xp
    }
  }
  // Keep quest keys from the last 4 weeks only.
  const keepWeeks = new Set([0, 7, 14, 21].map((d) => weekKey(new Date(Date.now() - d * 86400000))))
  for (const k of Object.keys(questProgress)) if (!keepWeeks.has(k.split(':')[0])) delete questProgress[k]

  // Play days
  const playDays = p.playDays.includes(today()) ? p.playDays : [...p.playDays, today()].slice(-60)

  const totalXp = p.xp + Math.max(0, xp)
  const after = levelInfo(totalXp).level

  // Unlocks earned by level or badge
  const owned = new Set(p.unlocks)
  const newUnlocks = UNLOCKS.filter(
    (u) => !owned.has(u.id) && ((u.atLevel !== undefined && after >= u.atLevel) || (u.byBadge !== undefined && badges[u.byBadge])),
  )

  const sessionsDone =
    r.kind === 'session' ? { ...p.sessionsDone, [r.id]: Math.max(p.sessionsDone[r.id] ?? 0, stars || 1) } : p.sessionsDone

  const progress = saveProgress({
    xp: totalXp,
    badges,
    unlocks: [...p.unlocks, ...newUnlocks.map((u) => u.id)],
    personalBests,
    questProgress,
    playDays,
    sessionsDone,
  })

  const result: RewardResult = {
    kind: r.kind,
    id: r.id,
    xpGained: Math.max(0, xp),
    levelBefore: before,
    levelAfter: after,
    xpBefore: p.xp,
    newBadges,
    newOtherBadges,
    newUnlocks,
    questsCompleted,
    newPersonalBest,
    progress,
  }
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent<RewardResult>(REWARD_EVENT, { detail: result }))
    } catch {
      /* ignore */
    }
  }
  return result
}
