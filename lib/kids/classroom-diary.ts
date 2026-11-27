// lib/kids/classroom-diary.ts
//
// BROWSER ONLY. Two small per-child stores that exist only for a child who has
// joined a class, read by the class snapshot (classroom-membership.ts):
//
//   1. Misconceptions (roadmap #30). Since Wave 3 the record lives in the one
//      progress store (lib/kids/misconceptions/store.ts -> KidsProgress
//      `checkMisconceptions`), so it follows profiles and the backup code.
//      This file still READS the older class-only store (Wave 2) so nothing a
//      child already recorded is lost, and misconceptionCounts() merges both:
//      "L2-S04.taller-is-stronger" -> times chosen. The class only ever
//      receives these COUNTS — never the question, the answer text, or when
//      it was chosen.
//
//   2. The Power-Up diary (roadmap #40). Each finished thing reported to the
//      rewards engine (REWARD_EVENT) is noted once per local day by kind:id,
//      so the class meter counts real, distinct work and a replay loop cannot
//      fill it. The class receives one number per day.
//
// Both use profileKey() (one device, several children). Nothing is recorded
// for a child who is not in a class.

import { profileKey } from './profiles'
import { MISCONCEPTION_KEY_RE, SNAPSHOT_MAX_DAYS, SNAPSHOT_MAX_MISCONCEPTIONS } from './classroom'
import { misconceptionKey } from './misconceptions/keys'
import { recentCheckMisconceptions, recordCheckMisconception } from './misconceptions/store'
import { addDays, localDay } from './classroom-goal'

const MISC_BASE = 'r2bot_kids_class_misc_v1'
const DIARY_BASE = 'r2bot_kids_class_diary_v1'
/** Fired on window after either store changes (KidsClassSyncClient schedules a sync). */
export const KIDS_CLASS_DIARY_EVENT = 'r2bot:kids-class-diary'
/** Same key as classroom-membership.ts (read directly to avoid an import cycle). */
const MEMBERSHIP_KEY = 'r2bot_kids_class_v1'

const DIARY_KEEP_DAYS = 45
const DIARY_MAX_PER_DAY = 200

interface MiscEntry {
  /** Times chosen. */
  n: number
  /** Last local day chosen (only used to send the most recent first). */
  d: string
}

function inClass(): boolean {
  try {
    return !!window.localStorage.getItem(MEMBERSHIP_KEY)
  } catch {
    return false
  }
}

function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as unknown) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    window.dispatchEvent(new CustomEvent(KIDS_CLASS_DIARY_EVENT))
    return true
  } catch {
    return false
  }
}

// ── Misconceptions ───────────────────────────────────────────────────────────

function readMisc(): Record<string, MiscEntry> {
  const o = readJson(profileKey(MISC_BASE))
  const out: Record<string, MiscEntry> = {}
  if (!o || typeof o !== 'object' || Array.isArray(o)) return out
  const m = (o as { m?: unknown }).m
  if (!m || typeof m !== 'object' || Array.isArray(m)) return out
  for (const [k, v] of Object.entries(m as Record<string, unknown>)) {
    if (!MISCONCEPTION_KEY_RE.test(k) || !v || typeof v !== 'object') continue
    const e = v as Partial<MiscEntry>
    const n = typeof e.n === 'number' && Number.isFinite(e.n) ? Math.min(99, Math.max(1, Math.floor(e.n))) : 0
    if (!n) continue
    out[k] = { n, d: typeof e.d === 'string' ? e.d : '' }
  }
  return out
}

export { misconceptionKey }

/**
 * A child picked a wrong check option that reveals `misconceptionId` in
 * session `sessionId` ("L2-S04"). Kept for older callers: it records into the
 * progress store (lib/kids/misconceptions/store.ts), in or out of a class.
 * Never throws.
 */
export function recordMisconception(sessionId: string, misconceptionId: string): void {
  recordCheckMisconception(sessionId, misconceptionId)
}

/**
 * For the class snapshot: the progress store's counts (most recent first),
 * then any older class-only (Wave 2) entries not already there — the higher
 * count wins. Capped at SNAPSHOT_MAX_MISCONCEPTIONS.
 */
export function misconceptionCounts(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  const out: Record<string, number> = { ...recentCheckMisconceptions() }
  const legacy = Object.entries(readMisc()).sort((a, b) => b[1].d.localeCompare(a[1].d) || b[1].n - a[1].n)
  for (const [k, e] of legacy) out[k] = Math.max(out[k] ?? 0, e.n)
  return Object.fromEntries(Object.entries(out).slice(0, SNAPSHOT_MAX_MISCONCEPTIONS))
}

// ── Power-Up diary ───────────────────────────────────────────────────────────

const WORK_KEY_RE = /^[a-z]{2,12}:[A-Za-z0-9][A-Za-z0-9:_-]{0,80}$/
/** Kinds that are not "work" for the class meter (0-XP discovery claims). */
const NOT_WORK = new Set(['discovery'])

function readDiary(): Record<string, string[]> {
  const o = readJson(profileKey(DIARY_BASE))
  const out: Record<string, string[]> = {}
  if (!o || typeof o !== 'object' || Array.isArray(o)) return out
  const d = (o as { d?: unknown }).d
  if (!d || typeof d !== 'object' || Array.isArray(d)) return out
  for (const [day, list] of Object.entries(d as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Array.isArray(list)) continue
    out[day] = list.filter((x): x is string => typeof x === 'string' && WORK_KEY_RE.test(x)).slice(0, DIARY_MAX_PER_DAY)
  }
  return out
}

/**
 * Note one finished thing for the class meter (KidsClassSyncClient calls this
 * on every REWARD_EVENT). Counted once per kind:id per local day. Returns true
 * when it was new today.
 */
export function noteClassWork(kind: string, id: string, now: Date = new Date()): boolean {
  if (typeof window === 'undefined' || !inClass() || NOT_WORK.has(kind)) return false
  const key = `${kind}:${id}`
  if (!WORK_KEY_RE.test(key)) return false
  const today = localDay(now)
  const diary = readDiary()
  const list = diary[today] ?? []
  if (list.includes(key) || list.length >= DIARY_MAX_PER_DAY) return false
  diary[today] = [...list, key]
  const oldest = addDays(today, -DIARY_KEEP_DAYS)
  const kept = Object.fromEntries(Object.entries(diary).filter(([day]) => day > oldest))
  return writeJson(profileKey(DIARY_BASE), { v: 1, d: kept })
}

/** Day -> distinct things done, newest SNAPSHOT_MAX_DAYS days. */
export function workDays(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  const diary = readDiary()
  const days = Object.keys(diary).filter((d) => diary[d].length > 0).sort().reverse().slice(0, SNAPSHOT_MAX_DAYS)
  return Object.fromEntries(days.map((d) => [d, diary[d].length]))
}

/** Forget both stores for the playing child (leaving a class). */
export function clearClassDiary(): void {
  try {
    window.localStorage.removeItem(profileKey(MISC_BASE))
    window.localStorage.removeItem(profileKey(DIARY_BASE))
  } catch {
    /* ignore */
  }
}
