// lib/kids/classroom.ts
//
// Shared, pure helpers for the R2BOT Kids Classroom. Safe to import from both
// the browser and route handlers: no Supabase, no Node APIs, no storage.
//
// Privacy rule (COPPA / GDPR-K): a child gives a NICKNAME and nothing else. No
// email, no password, no birthday, no account. Everything here exists to keep
// it that way: the nickname validator rejects things that look like contact
// details, and the snapshot parser accepts only a fixed set of counters.

import { BAND_ORDER, type BandId } from './bands'
import { DEFAULT_DESIGN, decodeDesign, encodeDesign, getPart, type Slot } from './robot-design'

// ── Join codes ───────────────────────────────────────────────────────────────
/** No I, L, O, 0 or 1 — a code read off a classroom wall cannot be misread. */
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const JOIN_CODE_LENGTH = 6
const JOIN_CODE_RE = /^[A-HJKMNP-Z2-9]{6}$/

/** Uppercase and strip spaces and dashes, so "abc-234" and "ABC 234" both work. */
export function normaliseJoinCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '').slice(0, 12)
}

export function isValidJoinCode(code: string): boolean {
  return JOIN_CODE_RE.test(code)
}

/** Display form: "ABC 234" — easier to copy off a wall. */
export function formatJoinCode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code
}

export const JOIN_PATH = '/kids/join'
export const JOIN_URL_DISPLAY = 'r2bot.in/kids/join'

// ── Limits ───────────────────────────────────────────────────────────────────
export const MAX_MEMBERS_PER_CLASS = 60
export const MAX_CLASSES_PER_TEACHER = 30
export const SNAPSHOT_MAX_BYTES = 8192

// ── Nickname ─────────────────────────────────────────────────────────────────
// Deliberately small and conservative. Long words are matched anywhere in the
// squashed name; short ones only as a whole word, so "Cassie" and "Scunthorpe"
// style names are never refused.
const BLOCK_ANYWHERE = [
  'fuck', 'shit', 'bitch', 'cunt', 'whore', 'slut', 'penis', 'vagina', 'boobs',
  'nigg', 'faggot', 'retard', 'rapist', 'porn', 'dildo', 'wanker', 'bastard',
  'chutiya', 'madarchod', 'behenchod', 'bhenchod', 'mierda', 'pendejo',
  'scheisse', 'hitler',
]
const BLOCK_WORD = ['ass', 'arse', 'dick', 'cock', 'fag', 'tit', 'tits', 'sex', 'kill', 'die', 'poop', 'pee', 'butt', 'damn', 'hell', 'crap', 'stupid', 'idiot', 'dumb', 'ugly', 'fat', 'randi', 'puta', 'nazi', 'merde', 'gandu', 'cabron']

export type NicknameCheck = { ok: true; nickname: string } | { ok: false; error: string }

/**
 * Validate a child's nickname. 2–20 characters, letters (any script), numbers
 * and spaces only. Refuses anything that looks like an email, a phone number or
 * a rude word, with a message a child can act on.
 */
export function checkNickname(raw: string): NicknameCheck {
  const nickname = raw.normalize('NFC').replace(/\s+/g, ' ').trim()
  if (nickname.length < 2) return { ok: false, error: 'Your name needs at least 2 letters.' }
  if (nickname.length > 20) return { ok: false, error: 'Pick a shorter name — 20 letters at most.' }
  if (/@/.test(nickname) || /\b(gmail|yahoo|hotmail|outlook|icloud)\b/i.test(nickname)) {
    return { ok: false, error: 'Just your first name or a made-up name, please — not an email.' }
  }
  if (!/^[\p{L}\p{M}\p{N} ]+$/u.test(nickname)) {
    return { ok: false, error: 'Use letters, numbers and spaces only.' }
  }
  if ((nickname.match(/\p{N}/gu) ?? []).length >= 4) {
    return { ok: false, error: 'Too many numbers — use your first name or a made-up name.' }
  }
  if (!/\p{L}/u.test(nickname)) return { ok: false, error: 'Your name needs some letters.' }
  const lower = nickname.toLowerCase()
  const squashed = lower.replace(/[^\p{L}]/gu, '')
  const words = lower.split(/[^\p{L}]+/u).filter(Boolean)
  if (BLOCK_ANYWHERE.some((w) => squashed.includes(w)) || words.some((w) => BLOCK_WORD.includes(w))) {
    return { ok: false, error: 'Let’s pick a kinder name. Try your first name!' }
  }
  return { ok: true, nickname }
}

// ── Class inputs (teacher) ───────────────────────────────────────────────────
export function isBandId(x: unknown): x is BandId {
  return typeof x === 'string' && (BAND_ORDER as string[]).includes(x)
}

/** Plain single-line text: strips control characters and angle brackets, collapses spaces. */
export function cleanText(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return ''
  return raw.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max)
}

// ── Snapshot ─────────────────────────────────────────────────────────────────
/** What a child's browser sends to the class. Counters only — no free text except the robot code, whose name is checked like a nickname. */
export interface ClassSnapshot {
  v: 1
  totalStars: number
  /** Robot World levels finished. */
  completedLevels: number
  completedZones: string[]
  /** Story Theatre: episode slug -> best stars (1–3). */
  episodesDone: Record<string, number>
  /** Code Lab: mission id -> best stars (1–3). */
  codeMissions: Record<string, number>
  robotsBuilt: number
  totalMinutesPlayed: number
  band: BandId | null
  /** encodeDesign() of the Workshop robot, or null. */
  robot: string | null
  /** Robot World levels retried 2+ times without 2+ stars: "zone/level" -> attempts. */
  stuck: Record<string, number>
  /** Course sessions finished: "L1-S05" -> best stars (1–3). Added with 0055. */
  sessionsDone: Record<string, number>
  /**
   * Skill Galaxy activity ids finished (lib/kids/activities/progress.ts). Capped
   * by count and bytes; the browser sends the class's assigned ones first, then
   * the most recent, so assignment completion stays exact.
   */
  activitiesDone: string[]
  /** Game ids played with at least one star (from personal bests). */
  gamesPlayed: string[]
}

export const EMPTY_SNAPSHOT: ClassSnapshot = {
  v: 1, totalStars: 0, completedLevels: 0, completedZones: [], episodesDone: {}, codeMissions: {},
  robotsBuilt: 0, totalMinutesPlayed: 0, band: null, robot: null, stuck: {},
  sessionsDone: {}, activitiesDone: [], gamesPlayed: [],
}

/** Most activity ids a snapshot carries, and the bytes they may use (the whole snapshot stays under SNAPSHOT_MAX_BYTES). */
export const SNAPSHOT_MAX_ACTIVITIES = 260
export const SNAPSHOT_ACTIVITY_BYTES = 4200
const SESSION_KEY_RE = /^L[1-4]-S\d{2}$/
const ITEM_ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/

/** Keep ids in order until the count or byte budget runs out (JSON: id + quotes + comma). */
export function capIds(ids: readonly string[], maxCount: number, maxBytes: number): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  let bytes = 2
  for (const id of ids) {
    if (out.length >= maxCount) break
    if (seen.has(id) || !ITEM_ID_RE.test(id)) continue
    const cost = id.length + 3
    if (bytes + cost > maxBytes) break
    seen.add(id)
    out.push(id)
    bytes += cost
  }
  return out
}

function sessionMap(x: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (!x || typeof x !== 'object' || Array.isArray(x)) return out
  let n = 0
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    if (n >= 96) break
    if (!SESSION_KEY_RE.test(k)) continue
    const val = int(v, 3)
    if (val <= 0) continue
    out[k] = val
    n++
  }
  return out
}

function idList(x: unknown, maxCount: number, maxBytes: number): string[] {
  if (!Array.isArray(x)) return []
  return capIds(x.filter((v): v is string => typeof v === 'string'), maxCount, maxBytes)
}

const KEY_RE = /^[a-z0-9][a-z0-9/_-]{0,63}$/

function int(x: unknown, max: number): number {
  const n = typeof x === 'number' && Number.isFinite(x) ? Math.floor(x) : 0
  return Math.min(max, Math.max(0, n))
}

function starMap(x: unknown, maxKeys: number, maxVal: number): Record<string, number> {
  const out: Record<string, number> = {}
  if (!x || typeof x !== 'object' || Array.isArray(x)) return out
  let n = 0
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    if (n >= maxKeys) break
    if (!KEY_RE.test(k)) continue
    const val = int(v, maxVal)
    if (val <= 0) continue
    out[k] = val
    n++
  }
  return out
}

/**
 * Typed parser for an untrusted snapshot. Unknown fields are dropped, numbers
 * clamped, maps capped. Returns null if the input is not an object.
 */
export function parseSnapshot(x: unknown): ClassSnapshot | null {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null
  const o = x as Record<string, unknown>
  const zones = Array.isArray(o.completedZones)
    ? o.completedZones.filter((z): z is string => typeof z === 'string' && KEY_RE.test(z)).slice(0, 20)
    : []
  const robotsBuilt = int(o.robotsBuilt, 100_000)
  // Only a child who has actually built a robot has one to show. The robot
  // name is free text a child typed, so it goes through the nickname rules and
  // is replaced with the default name if it fails; the stored code is
  // re-encoded from the parsed design, never the raw client string.
  let robot: string | null = null
  if (robotsBuilt > 0 && typeof o.robot === 'string' && o.robot.length <= 160) {
    const d = decodeDesign(o.robot)
    if (d) robot = encodeDesign({ ...d, name: safeRobotName(d.name) })
  }
  return {
    v: 1,
    totalStars: int(o.totalStars, 100_000),
    completedLevels: int(o.completedLevels, 10_000),
    completedZones: Array.from(new Set(zones)),
    episodesDone: starMap(o.episodesDone, 120, 3),
    codeMissions: starMap(o.codeMissions, 200, 3),
    robotsBuilt,
    totalMinutesPlayed: int(o.totalMinutesPlayed, 1_000_000),
    band: isBandId(o.band) ? o.band : null,
    robot,
    stuck: starMap(o.stuck, 20, 1000),
    sessionsDone: sessionMap(o.sessionsDone),
    activitiesDone: idList(o.activitiesDone, SNAPSHOT_MAX_ACTIVITIES, SNAPSHOT_ACTIVITY_BYTES),
    gamesPlayed: idList(o.gamesPlayed, 30, 900),
  }
}

/**
 * Bytes the snapshot takes in Postgres. jsonb prints a space after every ":"
 * and ",", so JSON.stringify alone undercounts; counting both (even inside
 * strings) can only overestimate, which is the safe side of the CHECK.
 */
export function snapshotBytes(snap: ClassSnapshot): number {
  const json = JSON.stringify(snap)
  const extra = (json.match(/[:,]/g) ?? []).length
  return new TextEncoder().encode(json).length + extra
}

/**
 * Make a parsed snapshot fit SNAPSHOT_MAX_BYTES (the column's CHECK). Drops the
 * least important entries first — the tail of activitiesDone beyond the first
 * 60 (the browser puts the class's assigned activities first), then halves of
 * the story and code maps, then the rest — so a very busy child still syncs
 * instead of getting a 413, and assignment ticks stay right.
 */
/** Activity ids always kept while anything older can still be trimmed (a class has at most 60 assignments). */
const KEEP_ACTIVITIES = 60

export function fitSnapshot(snap: ClassSnapshot, maxBytes: number = SNAPSHOT_MAX_BYTES): ClassSnapshot {
  if (snapshotBytes(snap) <= maxBytes) return snap
  const out: ClassSnapshot = {
    ...snap,
    activitiesDone: [...snap.activitiesDone],
    gamesPlayed: [...snap.gamesPlayed],
    episodesDone: { ...snap.episodesDone },
    codeMissions: { ...snap.codeMissions },
  }
  const halve = (m: Record<string, number>): Record<string, number> => {
    const keys = Object.keys(m)
    return Object.fromEntries(keys.slice(0, Math.floor(keys.length / 2)).map((k) => [k, m[k]]))
  }
  while (snapshotBytes(out) > maxBytes) {
    if (out.activitiesDone.length > KEEP_ACTIVITIES) {
      out.activitiesDone = out.activitiesDone.slice(0, Math.max(KEEP_ACTIVITIES, out.activitiesDone.length - 20))
    } else if (Object.keys(out.episodesDone).length > 0 || Object.keys(out.codeMissions).length > 0) {
      // Older counters go before the assignment-relevant lists.
      if (Object.keys(out.episodesDone).length >= Object.keys(out.codeMissions).length) out.episodesDone = halve(out.episodesDone)
      else out.codeMissions = halve(out.codeMissions)
    } else if (out.activitiesDone.length > 0) {
      out.activitiesDone = out.activitiesDone.slice(0, Math.max(0, out.activitiesDone.length - 10))
    } else if (out.gamesPlayed.length > 0) {
      out.gamesPlayed = []
    } else {
      out.stuck = {}
      out.robot = null
      break
    }
  }
  return out
}

// ── Robot card ───────────────────────────────────────────────────────────────
/** A robot name a teacher may see: passes the nickname rules, else the default name. */
export function safeRobotName(name: string): string {
  const c = checkNickname(name)
  return c.ok ? c.nickname : DEFAULT_DESIGN.name
}

export interface RobotSummary {
  name: string
  primary: string
  accent: string
  parts: { slot: Slot; name: string; emoji: string }[]
}

const SLOTS: Slot[] = ['body', 'drive', 'head', 'tool', 'sensor']

export function robotSummary(code: string | null): RobotSummary | null {
  if (!code) return null
  const d = decodeDesign(code)
  if (!d) return null
  const parts: RobotSummary['parts'] = []
  for (const slot of SLOTS) {
    const p = getPart(slot, d[slot])
    if (p && p.id !== 'none') parts.push({ slot, name: p.name, emoji: p.emoji })
  }
  return { name: safeRobotName(d.name), primary: d.primary, accent: d.accent, parts }
}

// ── API shapes (shared by routes and clients) ───────────────────────────────
export interface KidsClassSummary {
  id: string
  className: string
  teacherName: string | null
  schoolName: string | null
  band: BandId
  joinCode: string
  createdAt: string
  memberCount: number
}

export interface KidsMemberRow {
  id: string
  nickname: string
  snapshot: ClassSnapshot
  createdAt: string
  lastActiveAt: string
}

/** Public, child-facing view of a class — no ids that would let anyone act on it. */
export interface JoinedClassInfo {
  className: string
  teacherName: string | null
  band: BandId
  nickname: string
}

/** Error code a route returns when migration 0054 has not been run yet. */
export const CLASSROOM_NOT_READY = 'classroom-not-ready'
export const CLASSROOM_NOT_READY_MESSAGE =
  'Classrooms are being switched on — ask your teacher to try again soon.'
