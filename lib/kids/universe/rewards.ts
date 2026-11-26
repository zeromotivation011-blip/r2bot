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
  { id: 'gear-head', name: 'Gear Head', icon: '⚙️', track: 'mechanics', earnedFor: 'you chose the right gear for speed or strength.' },
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

// ── Unlocks (cosmetics & parts) ──────────────────────────────────────────────

export interface Unlock {
  id: string
  kind: 'paint' | 'decal' | 'trail' | 'skin' | 'avatar' | 'sound'
  name: string
  /** Earned at this player level… */
  atLevel?: number
  /** …or by this badge. */
  byBadge?: string
  /** For paints: the colour. */
  value?: string
}

export const UNLOCKS: Unlock[] = [
  { id: 'paint-neon-lime', kind: 'paint', name: 'Neon Lime', atLevel: 2, value: '#A3E635' },
  { id: 'paint-ocean', kind: 'paint', name: 'Deep Ocean', atLevel: 3, value: '#0EA5E9' },
  { id: 'paint-galaxy', kind: 'paint', name: 'Galaxy Purple', atLevel: 5, value: '#7C3AED' },
  { id: 'paint-lava', kind: 'paint', name: 'Lava Red', atLevel: 8, value: '#DC2626' },
  { id: 'paint-gold', kind: 'paint', name: 'Champion Gold', atLevel: 15, value: '#EAB308' },
  { id: 'paint-chrome', kind: 'paint', name: 'Chrome', atLevel: 25, value: '#CBD5E1' },
  { id: 'decal-lightning', kind: 'decal', name: 'Lightning Bolt', byBadge: 'first-drive' },
  { id: 'decal-eye', kind: 'decal', name: 'Sensor Eye', byBadge: 'wall-whisperer' },
  { id: 'decal-wave', kind: 'decal', name: 'Line Wave', byBadge: 'line-rider' },
  { id: 'decal-gear', kind: 'decal', name: 'Golden Gear', byBadge: 'gear-head' },
  { id: 'trail-sparkle', kind: 'trail', name: 'Sparkle Trail', atLevel: 4 },
  { id: 'trail-rainbow', kind: 'trail', name: 'Rainbow Trail', atLevel: 12 },
  { id: 'trail-plasma', kind: 'trail', name: 'Plasma Trail', byBadge: 'pid-tuner' },
  { id: 'skin-mars', kind: 'skin', name: 'Mars Dust Skin', byBadge: 'mars-planner' },
  { id: 'skin-circuit', kind: 'skin', name: 'Circuit Board Skin', byBadge: 'circuit-closer' },
  { id: 'avatar-robo-cat', kind: 'avatar', name: 'Robo-Cat helmet', atLevel: 6 },
  { id: 'avatar-astronaut-gold', kind: 'avatar', name: 'Gold astronaut suit', atLevel: 20 },
  { id: 'sound-retro', kind: 'sound', name: 'Retro beeps', atLevel: 10 },
]

// ── Quests (weekly, gentle) ──────────────────────────────────────────────────

export type ActivityKind =
  | 'session' // a curriculum session finished
  | 'challenge' // a physics challenge solved
  | 'game' // a Universe game round finished
  | 'episode' // an episode watched with its check
  | 'build' // the robot design changed and saved
  | 'project' // a "make it yours" project shared
  | 'bugfix' // a failing program fixed by the child
  | 'activity' // a Skill Galaxy activity completed

export interface Quest {
  id: string
  title: string
  icon: string
  kind: ActivityKind
  target: number
  xp: number
}

const QUEST_POOL: Quest[] = [
  { id: 'q-activities-5', title: 'Complete 5 Skill Galaxy activities', icon: '✨', kind: 'activity', target: 5, xp: 60 },
  { id: 'q-activities-10', title: 'Complete 10 Skill Galaxy activities', icon: '🌌', kind: 'activity', target: 10, xp: 120 },
  { id: 'q-challenges-3', title: 'Solve 3 robot challenges', icon: '🏁', kind: 'challenge', target: 3, xp: 60 },
  { id: 'q-games-2', title: 'Play 2 Universe games', icon: '🎮', kind: 'game', target: 2, xp: 40 },
  { id: 'q-episode-1', title: 'Watch an episode to the end', icon: '🎬', kind: 'episode', target: 1, xp: 30 },
  { id: 'q-build-1', title: 'Upgrade your robot', icon: '🛠️', kind: 'build', target: 1, xp: 30 },
  { id: 'q-session-2', title: 'Finish 2 course sessions', icon: '📘', kind: 'session', target: 2, xp: 80 },
  { id: 'q-bugfix-1', title: 'Fix a bug in your own program', icon: '🐞', kind: 'bugfix', target: 1, xp: 40 },
  { id: 'q-project-1', title: 'Finish a Make-it-Yours project', icon: '🌟', kind: 'project', target: 1, xp: 100 },
]

/** ISO week key, e.g. "2026-W48". Deterministic, so every device agrees. */
export function weekKey(d: Date = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** This week's three quests (rotates weekly, same for everyone). */
export function currentQuests(d: Date = new Date()): Quest[] {
  const wk = weekKey(d)
  let h = 0
  for (const c of wk) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const pool = [...QUEST_POOL]
  const out: Quest[] = []
  while (out.length < 3 && pool.length) {
    h = (h * 1103515245 + 12345) >>> 0
    out.push(pool.splice(h % pool.length, 1)[0])
  }
  return out
}

/** Quest progress is stored under "<weekKey>:<questId>" so a new week starts fresh without wiping anything. */
function questKey(q: Quest, d: Date = new Date()): string {
  return `${weekKey(d)}:${q.id}`
}

export function questStatus(p: KidsProgress = getProgress(), d: Date = new Date()): { quest: Quest; count: number; done: boolean }[] {
  return currentQuests(d).map((quest) => {
    const count = p.questProgress[questKey(quest, d)] ?? 0
    return { quest, count, done: count >= quest.target }
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
  xpGained: number
  levelBefore: number
  levelAfter: number
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

/**
 * Report something the child did. Returns everything they earned so the caller
 * can celebrate it, and fires REWARD_EVENT on window with the RewardResult as
 * `detail` so the global reward toast can show it without the caller's help.
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
    const better = prev === undefined || (r.lowerIsBetter ? r.score < prev : r.score > prev)
    if (better) {
      personalBests[r.id] = r.score
      newPersonalBest = prev !== undefined
      if (newPersonalBest) xp += 10
    }
  }

  // Badges
  const badges = { ...p.badges }
  const earned = [...(r.badges ?? [])]
  if ((r.attempts ?? 0) >= 5) earned.push('never-give-up')
  if (r.kind === 'bugfix') earned.push('debugger')
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

  // Quests
  const questProgress = { ...p.questProgress }
  const questsCompleted: Quest[] = []
  for (const q of currentQuests()) {
    if (q.kind !== r.kind) continue
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
    xpGained: Math.max(0, xp),
    levelBefore: before,
    levelAfter: after,
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
