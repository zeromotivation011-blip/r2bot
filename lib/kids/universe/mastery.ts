// lib/kids/universe/mastery.ts
// Real mastery, per concept (roadmap #27). Pure: no React, no DOM, no storage,
// so the browser, the teacher dashboard (batch C) and the verify script all run
// the same rules.
//
// The vocabulary is the course's concept spiral (ConceptId, CONCEPT_SPIRAL in
// lib/kids/curriculum/levels.ts): every Skill Galaxy activity names 1–3 of these
// strands (`concepts`, enforced by lib/kids/activities/verify.ts).
//
// Evidence: every finished Galaxy run adds one ConceptTry to the ONE progress
// store (`KidsProgress.conceptLog`, newest last, capped). A try is a WIN when
// the child solved it on the first try.
//
//   new       no tries yet
//   learning  tried, not yet secure
//   secure    3 first-try wins (on 3 different activities) using at least 2
//             different templates, all within 21 days. Once secured, a concept
//             STAYS secure while it has a first-try win in the last 21 days.
//   fading    was secure, but 21 days have passed without a first-try win.
//             One first-try win (a Recharge mission) makes it secure again.
//
// Battery cells (the story: the robot's cells drain for fading skills):
//   secure: 4 cells for 0–7 days since the last win, 3 for 8–14, 2 for 15–21;
//   fading: 1 cell up to 42 days, then 0; learning: one cell per recent win (max 3).
//
// Nothing here ranks or compares children. The teacher grid (conceptGrid) is
// per child and per concept, never a league table.

import type { ConceptId } from '../curriculum/types'
import type { TemplateId, TrackId } from '../activities/types'
import type { BandId } from '../bands'

export type { ConceptId }

// ── The concepts ─────────────────────────────────────────────────────────────

export const CONCEPT_IDS: readonly ConceptId[] = [
  'sense-think-act',
  'sequences',
  'decomposition',
  'loops',
  'debugging',
  'events-timing',
  'sensors',
  'conditions',
  'variables',
  'feedback-control',
  'physics',
  'autonomy',
  'data',
  'design-process',
  'safety-ethics',
  'careers',
]

const CONCEPT_SET = new Set<string>(CONCEPT_IDS)

export function isConceptId(x: unknown): x is ConceptId {
  return typeof x === 'string' && CONCEPT_SET.has(x)
}

export interface ConceptInfo {
  id: ConceptId
  /** Child-facing name. */
  name: string
  icon: string
  /** One line a child understands. */
  kid: string
}

export const CONCEPT_INFO: Record<ConceptId, ConceptInfo> = {
  'sense-think-act': { id: 'sense-think-act', name: 'Sense, think, act', icon: '🔁', kid: 'A robot feels the world, decides, then moves.' },
  sequences: { id: 'sequences', name: 'Sequences', icon: '🪜', kid: 'Steps in the right order.' },
  decomposition: { id: 'decomposition', name: 'Break it down', icon: '🧩', kid: 'Split a big problem into small ones.' },
  loops: { id: 'loops', name: 'Loops', icon: '🔄', kid: 'Do it again, and again, and again.' },
  debugging: { id: 'debugging', name: 'Debugging', icon: '🐞', kid: 'Find the mistake, fix it, test again.' },
  'events-timing': { id: 'events-timing', name: 'Timing', icon: '⏱️', kid: 'Waiting, delays and acting at the right moment.' },
  sensors: { id: 'sensors', name: 'Sensors', icon: '📡', kid: 'How robots see, hear and feel.' },
  conditions: { id: 'conditions', name: 'If this, then that', icon: '🔀', kid: 'Choosing what to do from what is true.' },
  variables: { id: 'variables', name: 'Variables', icon: '📦', kid: 'A robot’s memory for numbers.' },
  'feedback-control': { id: 'feedback-control', name: 'Feedback', icon: '🎚️', kid: 'Check, correct, check again: staying on target.' },
  physics: { id: 'physics', name: 'Forces & energy', icon: '⚙️', kid: 'Gears, wheels, balance, batteries and circuits.' },
  autonomy: { id: 'autonomy', name: 'Autonomy', icon: '🧭', kid: 'Robots that find their own way.' },
  data: { id: 'data', name: 'Data & AI', icon: '📊', kid: 'Learning from examples and numbers.' },
  'design-process': { id: 'design-process', name: 'Design', icon: '🛠️', kid: 'Plan, build, test, improve.' },
  'safety-ethics': { id: 'safety-ethics', name: 'Safe & fair', icon: '🛡️', kid: 'Robots that keep people safe and treat them fairly.' },
  careers: { id: 'careers', name: 'Robot jobs', icon: '👩‍🔧', kid: 'The people and jobs behind real robots.' },
}

// ── The rules ────────────────────────────────────────────────────────────────

export const SECURE_WINS = 3
export const SECURE_TEMPLATES = 2
export const SECURE_WINDOW_DAYS = 21
/** Fading concepts keep one cell until this many days without a win. */
export const FADED_EMPTY_DAYS = 42
/** Tries kept in the progress store (newest last). ~80 bytes each. */
export const CONCEPT_LOG_MAX = 400
export const BATTERY_CELLS = 4

/** One finished Galaxy run, as stored in KidsProgress.conceptLog. Short keys keep the store and backup code small. */
export interface ConceptTry {
  /** Activity id. */
  a: string
  /** Concepts the activity practises (from its `concepts`). */
  c: ConceptId[]
  /** Template id (mastery needs two different ones). */
  t: TemplateId
  /** Track (adaptive pacing reads runs per track). */
  k: TrackId
  /** Band of the activity. */
  b: BandId
  /** Activity difficulty 1–5. */
  v: number
  /** Local day YYYY-MM-DD. */
  d: string
  /** 1 = solved on the first try, 0 = needed more tries or stopped. */
  ok: 0 | 1
}

export type ConceptStatus = 'new' | 'learning' | 'secure' | 'fading'

export interface ConceptState {
  id: ConceptId
  status: ConceptStatus
  /** Distinct activities won first-try in the last 21 days. */
  recentWins: number
  /** Distinct templates among those wins. */
  recentTemplates: number
  /** Every try ever logged for this concept (kept tries only). */
  tries: number
  /** Tries that were not first-try wins. */
  misses: number
  /** Day of the last first-try win, if any. */
  lastWin: string | null
  /** Template of the last first-try win (a Recharge picks a different one). */
  lastWinTemplate: TemplateId | null
  /** Days since the last first-try win (null when there is none). */
  daysSinceWin: number | null
  /** Day the concept was first secured. */
  securedAt: string | null
  /** 0–4 battery cells. */
  cells: number
  /** 0..1 progress towards secure (1 when secure or fading). */
  progress: number
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

/** Whole days since 1970 for a YYYY-MM-DD day (calendar maths, no time zones). */
export function dayNumber(day: string): number {
  if (!DAY_RE.test(day)) return NaN
  const [y, m, d] = day.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from)
}

/** YYYY-MM-DD in local time. */
export function todayLocal(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Does this set of wins meet the secure rule on `today`? Wins are distinct by activity. */
function meetsRule(wins: ConceptTry[], today: string): { n: number; templates: number; ok: boolean } {
  const t0 = dayNumber(today)
  const byActivity = new Map<string, ConceptTry>()
  for (const w of wins) {
    const age = t0 - dayNumber(w.d)
    if (age < 0 || age >= SECURE_WINDOW_DAYS) continue
    byActivity.set(w.a, w)
  }
  const templates = new Set([...byActivity.values()].map((w) => w.t)).size
  return { n: byActivity.size, templates, ok: byActivity.size >= SECURE_WINS && templates >= SECURE_TEMPLATES }
}

/** The state of one concept on `today`, from the log and the secured-at map. */
export function conceptState(id: ConceptId, log: readonly ConceptTry[], secured: Readonly<Record<string, string>>, today: string = todayLocal()): ConceptState {
  const mine = log.filter((t) => t.c.includes(id) && dayNumber(t.d) <= dayNumber(today))
  const wins = mine.filter((t) => t.ok === 1)
  const last = wins.length ? wins.reduce((a, b) => (b.d >= a.d ? b : a)) : null
  const rule = meetsRule(wins, today)
  // A securedAt in the future (clock changes) is ignored rather than trusted.
  const securedAt = secured[id] && dayNumber(secured[id]) <= dayNumber(today) ? secured[id] : rule.ok ? today : null
  const daysSinceWin = last ? daysBetween(last.d, today) : null
  let status: ConceptStatus
  if (rule.ok) status = 'secure'
  else if (securedAt && daysSinceWin !== null && daysSinceWin < SECURE_WINDOW_DAYS) status = 'secure'
  else if (securedAt) status = 'fading'
  else status = mine.length ? 'learning' : 'new'

  let cells = 0
  if (status === 'secure') cells = daysSinceWin === null || daysSinceWin <= 7 ? 4 : daysSinceWin <= 14 ? 3 : 2
  else if (status === 'fading') cells = daysSinceWin !== null && daysSinceWin < FADED_EMPTY_DAYS ? 1 : 0
  else if (status === 'learning') cells = Math.min(3, rule.n)

  const progress =
    status === 'secure' || status === 'fading'
      ? 1
      : Math.min(1, (Math.min(rule.n, SECURE_WINS) + Math.min(rule.templates, SECURE_TEMPLATES)) / (SECURE_WINS + SECURE_TEMPLATES))

  return {
    id,
    status,
    recentWins: rule.n,
    recentTemplates: rule.templates,
    tries: mine.length,
    misses: mine.length - wins.length,
    lastWin: last?.d ?? null,
    lastWinTemplate: last?.t ?? null,
    daysSinceWin,
    securedAt,
    cells,
    progress,
  }
}

export interface MasteryData {
  conceptLog: readonly ConceptTry[]
  conceptSecured: Readonly<Record<string, string>>
}

/** Every concept's state, in CONCEPT_IDS order. */
export function conceptStates(p: MasteryData, today: string = todayLocal()): ConceptState[] {
  return CONCEPT_IDS.map((id) => conceptState(id, p.conceptLog ?? [], p.conceptSecured ?? {}, today))
}

export interface ApplyResult {
  conceptLog: ConceptTry[]
  conceptSecured: Record<string, string>
  /** Concepts that became secure for the first time with this try. */
  newlySecure: ConceptId[]
  /** Concepts that were fading and are secure again. */
  recharged: ConceptId[]
}

/** Pure: add one try to the mastery data. The caller saves the result. */
export function applyConceptTry(p: MasteryData, t: ConceptTry): ApplyResult {
  const before = new Map(t.c.map((c) => [c, conceptState(c, p.conceptLog, p.conceptSecured, t.d).status]))
  const conceptLog = [...(p.conceptLog ?? []), t].slice(-CONCEPT_LOG_MAX)
  const conceptSecured: Record<string, string> = { ...(p.conceptSecured ?? {}) }
  const newlySecure: ConceptId[] = []
  const recharged: ConceptId[] = []
  for (const c of t.c) {
    const s = conceptState(c, conceptLog, conceptSecured, t.d)
    if (s.status === 'secure' && !conceptSecured[c]) {
      conceptSecured[c] = t.d
      newlySecure.push(c)
    } else if (s.status === 'secure' && before.get(c) === 'fading') recharged.push(c)
  }
  return { conceptLog, conceptSecured, newlySecure, recharged }
}

// ── Store hygiene (used by lib/kids-progress.ts for the backup code) ─────────

const TRACK_IDS = new Set(['motion', 'sensors', 'code', 'electronics', 'mechanics', 'control', 'ai', 'design', 'space', 'world'])
const BAND_SET = new Set(['explorers', 'builders', 'inventors', 'engineers'])

/** Shape-check an unknown conceptLog (from storage or a backup). Never throws. */
export function cleanConceptLog(x: unknown): ConceptTry[] {
  if (!Array.isArray(x)) return []
  const out: ConceptTry[] = []
  for (const r of x.slice(-CONCEPT_LOG_MAX * 2)) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    if (typeof o.a !== 'string' || !o.a || o.a.length > 120) continue
    if (!Array.isArray(o.c)) continue
    const c = o.c.filter(isConceptId).slice(0, 3)
    if (!c.length) continue
    if (typeof o.t !== 'string' || !/^[a-z-]{2,40}$/.test(o.t)) continue
    if (typeof o.k !== 'string' || !TRACK_IDS.has(o.k)) continue
    if (typeof o.b !== 'string' || !BAND_SET.has(o.b)) continue
    if (typeof o.d !== 'string' || !DAY_RE.test(o.d)) continue
    const v = typeof o.v === 'number' && Number.isFinite(o.v) ? Math.min(5, Math.max(1, Math.round(o.v))) : 3
    out.push({ a: o.a, c, t: o.t as TemplateId, k: o.k as TrackId, b: o.b as BandId, v, d: o.d, ok: o.ok === 1 ? 1 : 0 })
  }
  return out.slice(-CONCEPT_LOG_MAX)
}

/** Shape-check concept → day maps. Unknown concepts and bad days are dropped. */
export function cleanConceptDays(x: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!x || typeof x !== 'object' || Array.isArray(x)) return out
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) if (isConceptId(k) && typeof v === 'string' && DAY_RE.test(v)) out[k] = v
  return out
}

/** Merge two logs (a restore): union by activity + day + outcome, in day order, capped. Never loses the newest tries. */
export function mergeConceptLog(a: readonly ConceptTry[], b: readonly ConceptTry[] | undefined): ConceptTry[] {
  if (!b?.length) return [...a]
  // Duplicates are removed only BETWEEN the logs, never within one: three real
  // misses on the same activity on the same day stay three (needsHelp counts
  // them). Per key, the merge keeps max(count in a, count in b), so restoring a
  // backup of this same device adds nothing and never lowers a count.
  const key = (t: ConceptTry) => `${t.a}|${t.d}|${t.ok}`
  const inA = new Map<string, number>()
  for (const t of a) inA.set(key(t), (inA.get(key(t)) ?? 0) + 1)
  const inB = new Map<string, number>()
  const all: ConceptTry[] = [...a]
  for (const t of b) {
    const k = key(t)
    const n = (inB.get(k) ?? 0) + 1
    inB.set(k, n)
    if (n > (inA.get(k) ?? 0)) all.push(t)
  }
  // Stable sort by day keeps same-day order.
  return all
    .map((t, i) => ({ t, i }))
    .sort((x, y) => (x.t.d < y.t.d ? -1 : x.t.d > y.t.d ? 1 : x.i - y.i))
    .map((x) => x.t)
    .slice(-CONCEPT_LOG_MAX)
}

/** Merge secured-at maps: the earliest day wins. */
export function mergeConceptSecured(a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>> | undefined): Record<string, string> {
  const out = { ...a }
  for (const [k, v] of Object.entries(b ?? {})) if (!out[k] || v < out[k]) out[k] = v
  return out
}

// ── Teacher API (batch C) ────────────────────────────────────────────────────
// Pure functions over ONE child's progress (or the synced snapshot of it). The
// class view is simply one row per child; there is no total, rank or ordering
// by score here, and none should be added on top.

export interface ConceptCell {
  status: ConceptStatus
  /** 0–4 battery cells. */
  cells: number
  recentWins: number
  tries: number
  misses: number
  lastWin: string | null
  /** Many tries, no first-try win yet: worth a word from the teacher. */
  needsHelp: boolean
}

export type ConceptGrid = Record<ConceptId, ConceptCell>

/** One child's concept grid on `today`. */
export function conceptGrid(p: MasteryData, today: string = todayLocal()): ConceptGrid {
  const out = {} as ConceptGrid
  for (const s of conceptStates(p, today)) {
    out[s.id] = {
      status: s.status,
      cells: s.cells,
      recentWins: s.recentWins,
      tries: s.tries,
      misses: s.misses,
      lastWin: s.lastWin,
      needsHelp: s.status === 'learning' && s.misses >= 3 && s.recentWins === 0,
    }
  }
  return out
}

/** One letter per concept (n/l/s/f, upper-case when it needs help), in CONCEPT_IDS order: 16 characters for a class snapshot. */
export function conceptGridCode(p: MasteryData, today: string = todayLocal()): string {
  const g = conceptGrid(p, today)
  return CONCEPT_IDS.map((id) => {
    const ch = g[id].status[0]
    return g[id].needsHelp ? ch.toUpperCase() : ch
  }).join('')
}

/** Reads a conceptGridCode back (unknown letters read as "new"). */
export function parseConceptGridCode(code: string): Record<ConceptId, { status: ConceptStatus; needsHelp: boolean }> {
  const map: Record<string, ConceptStatus> = { n: 'new', l: 'learning', s: 'secure', f: 'fading' }
  const out = {} as Record<ConceptId, { status: ConceptStatus; needsHelp: boolean }>
  CONCEPT_IDS.forEach((id, i) => {
    const ch = typeof code === 'string' ? code.charAt(i) : ''
    out[id] = { status: map[ch.toLowerCase()] ?? 'new', needsHelp: ch !== '' && ch === ch.toUpperCase() && ch.toLowerCase() !== ch }
  })
  return out
}

/** How many concepts are in each state (for a child's own summary). */
export function statusCounts(states: readonly ConceptState[]): Record<ConceptStatus, number> {
  const out: Record<ConceptStatus, number> = { new: 0, learning: 0, secure: 0, fading: 0 }
  for (const s of states) out[s.status] += 1
  return out
}

export const STATUS_LABEL: Record<ConceptStatus, string> = {
  new: 'Not started',
  learning: 'Learning',
  secure: 'Secure',
  fading: 'Needs a recharge',
}
