// lib/kids/classroom-goal.ts
//
// Class Power-Up (roadmap #40): ONE shared, co-operative class goal. Pure — no
// storage, no Supabase — so the teacher page, the projector, the child's home
// card, the routes and the verify script all run the same maths.
//
// The rules that keep it kind:
//   - one meter for the whole class; nobody's share is ever shown;
//   - "who helped this week" is a tick per child, never a number;
//   - a child counts each thing they did at most once a day (replaying the
//     same game all afternoon does not fill the meter);
//   - milestones unlock CLASS cosmetics (a banner trim on the meter and the
//     class card) and, at 100%, a class certificate. They are not XP, badges
//     or robot unlocks: those come only from reportActivity().
//
// Data: kids_classes.goal (jsonb, migration 0056). Before 0056 runs the
// teacher's goal is kept on the teacher's own device and shown on the
// projector; children see the meter once the column exists.

export interface ClassGoal {
  v: 1
  /** "Relight Lantern Hill". Plain text, 3–60 characters. */
  title: string
  /** Things done by the whole class (distinct per child per day). 10–5000. */
  target: number
  /** First counted day, YYYY-MM-DD (the teacher's local day). */
  start: string
  /** Last counted day, YYYY-MM-DD. At most 92 days after start. */
  end: string
  /** Visual theme for the meter. */
  theme: GoalThemeId
}

export type GoalThemeId = 'lantern' | 'island' | 'station' | 'orbit'

export interface GoalTheme {
  id: GoalThemeId
  name: string
  icon: string
  /** Tailwind gradient for the filled part of the meter (content colour, not chrome). */
  fill: string
  /** What fills up, in a child's words. */
  unit: string
}

export const GOAL_THEMES: Record<GoalThemeId, GoalTheme> = {
  lantern: { id: 'lantern', name: 'Lantern Hill lights', icon: '🏮', fill: 'from-amber-400 to-orange-500', unit: 'lights' },
  island: { id: 'island', name: 'Island beacons', icon: '🏝️', fill: 'from-cyan-300 to-teal-500', unit: 'beacons' },
  station: { id: 'station', name: 'Mountain station power', icon: '🏔️', fill: 'from-sky-300 to-cyan-500', unit: 'power cells' },
  orbit: { id: 'orbit', name: 'Orbital lab energy', icon: '🛰️', fill: 'from-emerald-300 to-cyan-500', unit: 'energy' },
}

export const GOAL_THEME_IDS = Object.keys(GOAL_THEMES) as GoalThemeId[]

/** Ready-made goals, one per band's story world. The teacher can edit the title and number. */
export const GOAL_PRESETS: { title: string; theme: GoalThemeId; perChild: number; days: number }[] = [
  { title: 'Relight Lantern Hill', theme: 'lantern', perChild: 10, days: 30 },
  { title: 'Light every island beacon', theme: 'island', perChild: 10, days: 30 },
  { title: 'Power up the mountain station', theme: 'station', perChild: 12, days: 30 },
  { title: 'Launch the orbital lab', theme: 'orbit', perChild: 12, days: 30 },
]

export const GOAL_MIN_TARGET = 10
export const GOAL_MAX_TARGET = 5000
export const GOAL_MAX_DAYS = 92

// ── Milestones ───────────────────────────────────────────────────────────────

export interface Milestone {
  /** Percent of the target, 25 / 50 / 75 / 100. */
  pct: number
  name: string
  icon: string
  /** What the class unlocks — shown to children and on the projector. */
  reward: string
}

export const MILESTONES: readonly Milestone[] = [
  { pct: 25, name: 'Spark lit', icon: '✨', reward: 'A glowing edge on the class meter' },
  { pct: 50, name: 'Halfway beacon', icon: '🔆', reward: 'The class banner trim' },
  { pct: 75, name: 'Almost there', icon: '🚀', reward: 'A rocket trail on the meter' },
  { pct: 100, name: 'Power-Up complete', icon: '🏆', reward: 'The class flag and a class certificate' },
]

/** Milestones reached for `done` out of `target`. */
export function milestonesReached(done: number, target: number): Milestone[] {
  if (target <= 0) return []
  const pct = (done / target) * 100
  return MILESTONES.filter((m) => pct >= m.pct)
}

/** The class cosmetic level 0–4 (number of milestones reached): drives the meter's trim. */
export function cosmeticLevel(done: number, target: number): number {
  return milestonesReached(done, target).length
}

// ── Days ─────────────────────────────────────────────────────────────────────

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

export function isDay(x: unknown): x is string {
  if (typeof x !== 'string' || !DAY_RE.test(x)) return false
  const t = Date.parse(`${x}T12:00:00Z`)
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === x
}

/** Local calendar day YYYY-MM-DD. */
export function localDay(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function addDays(day: string, n: number): string {
  const t = Date.parse(`${day}T12:00:00Z`) + n * 86_400_000
  return new Date(t).toISOString().slice(0, 10)
}

export function dayDiff(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000)
}

/** Monday of the week that contains `day`. */
export function weekStart(day: string): string {
  const d = new Date(`${day}T12:00:00Z`)
  const dow = (d.getUTCDay() + 6) % 7 // Monday = 0
  return addDays(day, -dow)
}

// ── Goal parsing ─────────────────────────────────────────────────────────────

function cleanTitle(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60)
}

/** Typed parser for an untrusted goal (a teacher's form, the DB column, the teacher's device copy). Null when invalid. */
export function parseGoal(x: unknown): ClassGoal | null {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null
  const o = x as Record<string, unknown>
  const title = cleanTitle(o.title)
  if (title.length < 3) return null
  const target = typeof o.target === 'number' && Number.isFinite(o.target) ? Math.round(o.target) : NaN
  if (!(target >= GOAL_MIN_TARGET && target <= GOAL_MAX_TARGET)) return null
  if (!isDay(o.start) || !isDay(o.end)) return null
  const span = dayDiff(o.start, o.end)
  if (span < 0 || span > GOAL_MAX_DAYS) return null
  const theme = typeof o.theme === 'string' && (GOAL_THEME_IDS as string[]).includes(o.theme) ? (o.theme as GoalThemeId) : 'lantern'
  return { v: 1, title, target, start: o.start, end: o.end, theme }
}

/** A sensible target for a class: per-child × children, rounded to 10, within limits. */
export function suggestedTarget(children: number, perChild: number): number {
  const raw = Math.max(1, children) * perChild
  return Math.min(GOAL_MAX_TARGET, Math.max(GOAL_MIN_TARGET, Math.round(raw / 10) * 10))
}

// ── Progress ─────────────────────────────────────────────────────────────────

/** A child's synced work diary: day -> things done that day (distinct). */
export type WorkDays = Record<string, number>

/** One child's contribution to the goal window (used only to add up the class total; never shown per child). */
export function workInWindow(days: WorkDays, goal: Pick<ClassGoal, 'start' | 'end'>): number {
  let n = 0
  for (const [day, count] of Object.entries(days)) {
    if (day >= goal.start && day <= goal.end) n += count
  }
  return n
}

/** True when the child did something in the week (Mon–Sun) containing `today`. */
export function helpedThisWeek(days: WorkDays, today: string): boolean {
  const from = weekStart(today)
  const to = addDays(from, 6)
  return Object.entries(days).some(([day, count]) => count > 0 && day >= from && day <= to)
}

export interface GoalProgress {
  done: number
  target: number
  /** 0..1, capped at 1. */
  fraction: number
  /** Children who did something this week (the number of ticks; names are shown only to the teacher and projector). */
  helpers: number
  reached: Milestone[]
  next: Milestone | null
  daysLeft: number
  status: 'upcoming' | 'running' | 'complete' | 'ended'
}

export function goalProgress(goal: ClassGoal, diaries: readonly WorkDays[], today: string): GoalProgress {
  const done = diaries.reduce((n, d) => n + workInWindow(d, goal), 0)
  const reached = milestonesReached(done, goal.target)
  const next = MILESTONES.find((m) => !reached.includes(m)) ?? null
  const helpers = diaries.filter((d) => helpedThisWeek(d, today)).length
  const status: GoalProgress['status'] =
    done >= goal.target ? 'complete' : today < goal.start ? 'upcoming' : today > goal.end ? 'ended' : 'running'
  return {
    done,
    target: goal.target,
    fraction: Math.min(1, done / goal.target),
    helpers,
    reached,
    next,
    daysLeft: Math.max(0, dayDiff(today, goal.end)),
    status,
  }
}

/** What a joined child's home card receives from /api/kids/classroom/power-up. No names, no per-child numbers. */
export interface ChildPowerUp {
  goal: ClassGoal
  done: number
  target: number
  helpers: number
  /** This child did something this week. */
  youHelped: boolean
  status: GoalProgress['status']
  daysLeft: number
}

/** Error code the routes return when migration 0056 (kids_classes.goal) has not run yet. */
export const GOALS_NOT_READY = 'class-goals-not-ready'
export const GOALS_NOT_READY_MESSAGE = 'Class goals are being switched on. Your goal is saved on this device for now.'
