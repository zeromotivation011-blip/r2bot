// lib/kids-progress.ts
// Local-first progress store for Robot World. Optionally syncable to Supabase later.

import { KIDS_ZONES, ZONE_UNLOCK_STARS, partForZone } from './kids-world-data'
import type { BandId } from './kids/bands'
import { cleanConceptDays, cleanConceptLog, mergeConceptLog, mergeConceptSecured, type ConceptTry } from './kids/universe/mastery'
import { activeProfileId, namespacedKey, profileKey, storageKeyFor } from './kids/profiles'

/** Fired on window after every save, so the classroom sync can push a snapshot. */
export const KIDS_PROGRESS_EVENT = 'r2bot:kids-progress'

export interface KidsProgress {
  age: number | null
  totalStars: number
  completedLevels: string[]      // "zoneId/levelId"
  completedZones: string[]
  earnedParts: string[]
  robotName: string
  robotColor: string
  robotAccent: string
  robotEyes: string
  lastPlayed: string             // ISO date
  totalMinutesPlayed: number
  currentZone: string
  currentLevel: string
  starsByLevel: Record<string, number>   // "zoneId/levelId" -> stars
  attemptsByLevel: Record<string, number>
  // ── Added Nov 2026 (R2BOT Kids platform) ──
  band: BandId | null
  /** Story Theatre: episode slug -> best stars (1–3). */
  episodesDone: Record<string, number>
  /** Code Lab: mission id -> best stars (1–3). */
  codeMissions: Record<string, number>
  /** Workshop: number of times the child saved a robot design. */
  robotsBuilt: number
  // ── Added Nov 2026 (R2BOT Universe: rewards — see lib/kids/universe/rewards.ts) ──
  /** Experience points. Level is derived from xp, never stored. */
  xp: number
  /** Badge id -> ISO date earned. */
  badges: Record<string, string>
  /** Cosmetic and part unlock ids the child owns (paints, decals, trails, skins). */
  unlocks: string[]
  /** Game/challenge id -> best result (higher is better unless the game says otherwise). */
  personalBests: Record<string, number>
  /** Curriculum session id -> stars (1–3) when finished. */
  sessionsDone: Record<string, number>
  /** Quest id -> progress count, for the current quest window. */
  questProgress: Record<string, number>
  /** ISO dates (YYYY-MM-DD) the child played; trimmed to the last 60. */
  playDays: string[]
  /** Avatar: chosen character id + colour. */
  avatar: { id: string; color: string }
  /** Explorer name shown in the Universe (nickname only — never a real full name). */
  explorerName: string
  // ── Added 27 Nov 2026 (concept mastery, Recharge missions, Launch Check — lib/kids/universe/mastery.ts) ──
  /** Skill Galaxy runs as mastery evidence, newest last (capped at CONCEPT_LOG_MAX). */
  conceptLog: ConceptTry[]
  /** Concept id -> day (YYYY-MM-DD) it was first secured. */
  conceptSecured: Record<string, string>
  /** Track id -> start point "band:minDifficulty" from the Launch Check or "skip to Ace" (lib/kids/activities/pacing.ts). */
  galaxyStart: Record<string, string>
}

/**
 * Base storage key. Each profile on the device has its own copy (lib/kids/profiles.ts):
 * member #1 (the device's original child) keeps this exact key, so moving to
 * profiles moved no data; other profiles use `r2bot_kids_v2::<profileId>`.
 * Always go through progressKey(), never KEY directly.
 */
const KEY = 'r2bot_kids_v2'

/** The progress key for whoever is playing now (or for one profile). */
function progressKey(profileId?: string | null): string {
  return profileId === undefined ? profileKey(KEY) : namespacedKey(KEY, profileId)
}

const DEFAULT_PROGRESS: KidsProgress = {
  age: null,
  totalStars: 0,
  completedLevels: [],
  completedZones: [],
  earnedParts: [],
  robotName: 'Spark Jr.',
  robotColor: '#FC6818',
  robotAccent: '#3B82F6',
  robotEyes: 'happy',
  lastPlayed: new Date().toISOString(),
  totalMinutesPlayed: 0,
  currentZone: 'spark-garden',
  currentLevel: 'what-is-spark',
  starsByLevel: {},
  attemptsByLevel: {},
  band: null,
  episodesDone: {},
  codeMissions: {},
  robotsBuilt: 0,
  xp: 0,
  badges: {},
  unlocks: [],
  personalBests: {},
  sessionsDone: {},
  questProgress: {},
  playDays: [],
  avatar: { id: 'astro', color: '#F59E0B' },
  explorerName: '',
  conceptLog: [],
  conceptSecured: {},
  galaxyStart: {},
}

function isBrowser() {
  return typeof window !== 'undefined'
}

export function getProgress(): KidsProgress {
  return readProgressAt(progressKey())
}

/** One profile's progress without switching to it (parent hub, verify). Read-only. */
export function getProgressOf(profileId: string | null): KidsProgress {
  return readProgressAt(progressKey(profileId))
}

function readProgressAt(key: string): KidsProgress {
  if (!isBrowser()) return { ...DEFAULT_PROGRESS }
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return { ...DEFAULT_PROGRESS }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_PROGRESS, ...parsed }
  } catch {
    return { ...DEFAULT_PROGRESS }
  }
}

export function saveProgress(patch: Partial<KidsProgress>): KidsProgress {
  const key = progressKey()
  const cur = readProgressAt(key)
  const next: KidsProgress = { ...cur, ...patch, lastPlayed: new Date().toISOString() }
  if (isBrowser()) {
    try { window.localStorage.setItem(key, JSON.stringify(next)) } catch {}
    try { window.dispatchEvent(new CustomEvent(KIDS_PROGRESS_EVENT)) } catch {}
  }
  return next
}

/** Record a finished Story Theatre episode. Only a better score adds stars. */
export function completeEpisode(slug: string, stars: number): { progress: KidsProgress; starsAdded: number } {
  const cur = getProgress()
  const prev = cur.episodesDone[slug] || 0
  const best = Math.max(prev, Math.min(3, Math.max(1, Math.floor(stars))))
  const starsAdded = best - prev
  const progress = saveProgress({
    episodesDone: { ...cur.episodesDone, [slug]: best },
    totalStars: cur.totalStars + starsAdded,
  })
  return { progress, starsAdded }
}

/** Record a solved Code Lab mission. Only a better score adds stars. */
export function completeCodeMission(id: string, stars: number): { progress: KidsProgress; starsAdded: number } {
  const cur = getProgress()
  const prev = cur.codeMissions[id] || 0
  const best = Math.max(prev, Math.min(3, Math.max(1, Math.floor(stars))))
  const starsAdded = best - prev
  const progress = saveProgress({
    codeMissions: { ...cur.codeMissions, [id]: best },
    totalStars: cur.totalStars + starsAdded,
  })
  return { progress, starsAdded }
}

export function addStars(n: number): KidsProgress {
  const cur = getProgress()
  return saveProgress({ totalStars: cur.totalStars + Math.max(0, Math.floor(n)) })
}

export function addMinutes(min: number): KidsProgress {
  const cur = getProgress()
  return saveProgress({ totalMinutesPlayed: cur.totalMinutesPlayed + min })
}

// Mark a level complete. Awards stars (max stars stored per level — only better runs count).
// Returns { progress, newlyCompletedZone, partAwarded } so callers can trigger UI celebrations.
export interface CompleteResult {
  progress: KidsProgress
  newlyCompletedZone: string | null
  partAwarded: string | null
  starsAdded: number
}

export function completeLevel(zoneId: string, levelId: string, stars: number): CompleteResult {
  const cur = getProgress()
  const key = `${zoneId}/${levelId}`
  const prevStars = cur.starsByLevel[key] || 0
  const newStars = Math.max(prevStars, Math.max(0, Math.floor(stars)))
  const starsAdded = newStars - prevStars

  const completedLevels = cur.completedLevels.includes(key)
    ? cur.completedLevels
    : [...cur.completedLevels, key]

  const starsByLevel = { ...cur.starsByLevel, [key]: newStars }

  // Has every level in this zone been completed?
  const zone = KIDS_ZONES.find(z => z.id === zoneId)
  let completedZones = cur.completedZones
  let earnedParts = cur.earnedParts
  let newlyCompletedZone: string | null = null
  let partAwarded: string | null = null

  if (zone) {
    const allDone = zone.levels.every(l => completedLevels.includes(`${zoneId}/${l.id}`))
    if (allDone && !completedZones.includes(zoneId)) {
      completedZones = [...completedZones, zoneId]
      const part = partForZone(zoneId)
      if (part && !earnedParts.includes(part)) {
        earnedParts = [...earnedParts, part]
        partAwarded = part
      }
      newlyCompletedZone = zoneId
    }
  }

  const next = saveProgress({
    totalStars: cur.totalStars + starsAdded,
    completedLevels,
    completedZones,
    earnedParts,
    starsByLevel,
    currentZone: zoneId,
    currentLevel: levelId,
  })

  return { progress: next, newlyCompletedZone, partAwarded, starsAdded }
}

export function bumpAttempt(zoneId: string, levelId: string): number {
  const cur = getProgress()
  const key = `${zoneId}/${levelId}`
  const n = (cur.attemptsByLevel[key] || 0) + 1
  saveProgress({ attemptsByLevel: { ...cur.attemptsByLevel, [key]: n } })
  return n
}

export function getTotalStarsForZone(zoneId: string): number {
  const cur = getProgress()
  const zone = KIDS_ZONES.find(z => z.id === zoneId)
  if (!zone) return 0
  return zone.levels.reduce((sum, l) => sum + (cur.starsByLevel[`${zoneId}/${l.id}`] || 0), 0)
}

export function isZoneUnlocked(zoneId: string): boolean {
  const cur = getProgress()
  return cur.totalStars >= (ZONE_UNLOCK_STARS[zoneId] ?? 0)
}

export function resetProgress(): KidsProgress {
  if (isBrowser()) {
    try { window.localStorage.removeItem(progressKey()) } catch {}
  }
  return { ...DEFAULT_PROGRESS }
}

// Convenience selectors
export function isLevelComplete(zoneId: string, levelId: string): boolean {
  return getProgress().completedLevels.includes(`${zoneId}/${levelId}`)
}

export function isZoneComplete(zoneId: string): boolean {
  return getProgress().completedZones.includes(zoneId)
}

// ── Progress backup code (added 26 Nov 2026) ──────────────────────────────────
// Children have no accounts, so a lost or wiped device loses everything. The
// backup code is the whole progress store (plus the Skill Galaxy "done" map and
// any small extras the caller attaches, such as the robot design) packed into
// one string a grown-up can copy, download and paste back:
//
//   R2K1.<z|j>.<base64url payload>.<checksum>
//
//   R2K1   format + version. A future format gets a new prefix; old codes keep working.
//   z | j  z = deflate (CompressionStream), j = plain JSON (no CompressionStream).
//   payload base64url of the (compressed) compact JSON { v, p, a?, x? }.
//   checksum FNV-1a 32-bit of the JSON text, 8 hex chars, so a typo is caught.
//
// The code holds no personal data: children never give any (nickname and
// robot name only). importProgressCode() never throws and never LOWERS
// progress: numbers take the max, lists and badge sets take the union.
// Restoring is not a reward, so it writes the store directly (one saveProgress
// call, which fires KIDS_PROGRESS_EVENT) instead of going through reportActivity.

const BACKUP_PREFIX = 'R2K1'
/** Skill Galaxy "done" map. Same key as ACTIVITIES_KEY in lib/kids/activities/progress.ts (not imported: that file imports this one). */
const BACKUP_ACTIVITIES_KEY = 'r2bot_kids_activities_v1'
/** A pasted code longer than this is refused before any work is done. */
const BACKUP_MAX_CODE = 200_000
/** Decompressed JSON larger than this is refused (no decompression bombs). */
const BACKUP_MAX_JSON = 1_000_000
const BAND_IDS: readonly BandId[] = ['explorers', 'builders', 'inventors', 'engineers']

/** One Skill Galaxy record, as lib/kids/activities/progress.ts stores it. */
interface BackupActivityRecord { stars: number; attempts: number; score: number; plays: number; at: string }

interface BackupPayload {
  v: 1
  /** Progress, without fields still at their defaults. */
  p: Partial<KidsProgress>
  /** Skill Galaxy activities done. */
  a?: Record<string, BackupActivityRecord>
  /** Small caller-owned extras (e.g. robot: encodeDesign(...)). */
  x?: Record<string, string>
}

export type ProgressImportFailure = 'empty' | 'format' | 'version' | 'checksum' | 'unsupported' | 'corrupt' | 'shape'

export interface ProgressImportAdded {
  xp: number
  stars: number
  badges: number
  unlocks: number
  sessions: number
  activities: number
}

export type ProgressImportResult =
  | { ok: true; changed: boolean; progress: KidsProgress; added: ProgressImportAdded; extras: Record<string, string> }
  | { ok: false; reason: ProgressImportFailure }

// ── encoding helpers (browser and Node 18+) ──

function fnv1a(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let h = 0x811c9dc5
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) return null
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
    const bin = atob(b64)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  } catch {
    return null
  }
}

async function readCapped(stream: ReadableStream<Uint8Array>, max: number): Promise<Uint8Array | null> {
  const reader = stream.getReader()
  const parts: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > max) {
      try { await reader.cancel() } catch {}
      return null
    }
    parts.push(value)
  }
  const out = new Uint8Array(size)
  let o = 0
  for (const p of parts) { out.set(p, o); o += p.length }
  return out
}

function bytesStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(c) { c.enqueue(bytes); c.close() },
  })
}

// The casts below only bridge TS 5.x's Uint8Array<ArrayBuffer> vs <ArrayBufferLike> generics in lib.dom.
async function deflate(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null
  try {
    return await readCapped(bytesStream(bytes).pipeThrough(new CompressionStream('deflate') as unknown as TransformStream<Uint8Array, Uint8Array>), BACKUP_MAX_JSON)
  } catch {
    return null
  }
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array | null | 'unsupported'> {
  if (typeof DecompressionStream === 'undefined') return 'unsupported'
  try {
    return await readCapped(bytesStream(bytes).pipeThrough(new DecompressionStream('deflate') as unknown as TransformStream<Uint8Array, Uint8Array>), BACKUP_MAX_JSON)
  } catch {
    return null
  }
}

// ── validation: unknown JSON → clean, bounded values (never throws) ──

function isObj(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object' && !Array.isArray(x)
}
function cleanNum(x: unknown, max = 1e9): number | undefined {
  return typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.min(x, max) : undefined
}
function cleanStr(x: unknown, max = 80): string | undefined {
  return typeof x === 'string' && x.length <= max ? x : undefined
}
function cleanStrArr(x: unknown, maxItems = 5000, itemMax = 120): string[] | undefined {
  if (!Array.isArray(x)) return undefined
  return x.filter((s): s is string => typeof s === 'string' && s.length > 0 && s.length <= itemMax).slice(0, maxItems)
}
function cleanNumMap(x: unknown, max = 1e9, maxItems = 5000): Record<string, number> | undefined {
  if (!isObj(x)) return undefined
  const out: Record<string, number> = {}
  let n = 0
  for (const [k, v] of Object.entries(x)) {
    const c = cleanNum(v, max)
    if (c === undefined || k.length > 120) continue
    out[k] = c
    if (++n >= maxItems) break
  }
  return out
}
function cleanStrMap(x: unknown, valMax: number, maxItems = 5000): Record<string, string> | undefined {
  if (!isObj(x)) return undefined
  const out: Record<string, string> = {}
  let n = 0
  for (const [k, v] of Object.entries(x)) {
    const c = cleanStr(v, valMax)
    if (c === undefined || k.length > 120) continue
    out[k] = c
    if (++n >= maxItems) break
  }
  return out
}
const HEX_COLOUR = /^#[0-9A-Fa-f]{6}$/
const GALAXY_START_RE = /^(explorers|builders|inventors|engineers):[1-5]$/

/** Shape-checks a progress object from a backup. Unknown or bad fields are dropped, never trusted. */
function cleanProgress(x: unknown): Partial<KidsProgress> | null {
  if (!isObj(x)) return null
  const p: Partial<KidsProgress> = {}
  if (x.age === null || (cleanNum(x.age, 120) !== undefined)) p.age = x.age === null ? null : Math.floor(x.age as number)
  const nums = ['totalStars', 'totalMinutesPlayed', 'robotsBuilt', 'xp'] as const
  for (const k of nums) { const v = cleanNum(x[k]); if (v !== undefined) p[k] = v }
  const arrs = ['completedLevels', 'completedZones', 'earnedParts', 'unlocks', 'playDays'] as const
  for (const k of arrs) { const v = cleanStrArr(x[k]); if (v) p[k] = v }
  const maps = ['starsByLevel', 'attemptsByLevel', 'episodesDone', 'codeMissions', 'personalBests', 'sessionsDone', 'questProgress'] as const
  for (const k of maps) { const v = cleanNumMap(x[k]); if (v) p[k] = v }
  const strs = ['robotName', 'robotEyes', 'lastPlayed', 'currentZone', 'currentLevel', 'explorerName'] as const
  for (const k of strs) { const v = cleanStr(x[k]); if (v !== undefined) p[k] = v }
  for (const k of ['robotColor', 'robotAccent'] as const) { const v = cleanStr(x[k]); if (v && HEX_COLOUR.test(v)) p[k] = v }
  if (x.band === null) p.band = null
  else if (typeof x.band === 'string' && (BAND_IDS as readonly string[]).includes(x.band)) p.band = x.band as BandId
  const badges = cleanStrMap(x.badges, 40)
  if (badges) p.badges = badges
  if (Array.isArray(x.conceptLog)) p.conceptLog = cleanConceptLog(x.conceptLog)
  if (isObj(x.conceptSecured)) p.conceptSecured = cleanConceptDays(x.conceptSecured)
  if (isObj(x.galaxyStart)) {
    const gs: Record<string, string> = {}
    for (const [k, v] of Object.entries(x.galaxyStart)) if (/^[a-z]{2,12}$/.test(k) && typeof v === 'string' && GALAXY_START_RE.test(v)) gs[k] = v
    p.galaxyStart = gs
  }
  if (isObj(x.avatar)) {
    const id = cleanStr(x.avatar.id, 40)
    const color = cleanStr(x.avatar.color, 9)
    if (id && color && HEX_COLOUR.test(color)) p.avatar = { id, color }
  }
  return Object.keys(p).length ? p : null
}

function cleanActivities(x: unknown): Record<string, BackupActivityRecord> {
  const out: Record<string, BackupActivityRecord> = {}
  if (!isObj(x)) return out
  let n = 0
  for (const [id, v] of Object.entries(x)) {
    if (!isObj(v) || id.length > 120) continue
    const stars = cleanNum(v.stars, 3)
    if (stars === undefined || stars < 1) continue
    out[id] = {
      stars: Math.round(stars),
      attempts: Math.max(1, Math.round(cleanNum(v.attempts, 1e6) ?? 1)),
      score: cleanNum(v.score, 1) ?? 0,
      plays: Math.max(1, Math.round(cleanNum(v.plays, 1e6) ?? 1)),
      at: cleanStr(v.at, 40) ?? '',
    }
    if (++n >= 5000) break
  }
  return out
}

/** Where a profile's Skill Galaxy map lives now (live key when active, its stash otherwise). */
function activitiesKey(profileId?: string | null): string {
  return profileId === undefined ? BACKUP_ACTIVITIES_KEY : storageKeyFor(BACKUP_ACTIVITIES_KEY, profileId)
}

function readActivities(profileId?: string | null): Record<string, BackupActivityRecord> {
  if (!isBrowser()) return {}
  try {
    const raw = window.localStorage.getItem(activitiesKey(profileId))
    return raw ? cleanActivities(JSON.parse(raw)) : {}
  } catch {
    return {}
  }
}

// ── merge: never lowers progress ──

function maxMap(a: Record<string, number>, b: Record<string, number> | undefined): Record<string, number> {
  if (!b) return a
  const out = { ...a }
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, v)
  return out
}
function union(a: string[], b: string[] | undefined): string[] {
  if (!b) return a
  const seen = new Set(a)
  return [...a, ...b.filter((s) => !seen.has(s) && (seen.add(s), true))]
}

/** Pure: merge a backup into the current progress. Exported for the verify script. */
export function mergeProgress(cur: KidsProgress, inc: Partial<KidsProgress>): KidsProgress {
  const badges = { ...cur.badges }
  for (const [id, at] of Object.entries(inc.badges ?? {})) {
    // Keep the earliest date a badge was earned.
    if (!badges[id] || (at && at < badges[id])) badges[id] = at
  }
  const robotIsDefault =
    cur.robotName === DEFAULT_PROGRESS.robotName && cur.robotColor === DEFAULT_PROGRESS.robotColor && cur.robotAccent === DEFAULT_PROGRESS.robotAccent
  const avatarIsDefault = cur.avatar.id === DEFAULT_PROGRESS.avatar.id && cur.avatar.color === DEFAULT_PROGRESS.avatar.color
  const nowAtStart = cur.completedLevels.length === 0
  return {
    ...cur,
    age: cur.age ?? inc.age ?? null,
    band: cur.band ?? inc.band ?? null,
    totalStars: Math.max(cur.totalStars, inc.totalStars ?? 0),
    xp: Math.max(cur.xp, inc.xp ?? 0),
    robotsBuilt: Math.max(cur.robotsBuilt, inc.robotsBuilt ?? 0),
    totalMinutesPlayed: Math.max(cur.totalMinutesPlayed, inc.totalMinutesPlayed ?? 0),
    completedLevels: union(cur.completedLevels, inc.completedLevels),
    completedZones: union(cur.completedZones, inc.completedZones),
    earnedParts: union(cur.earnedParts, inc.earnedParts),
    unlocks: union(cur.unlocks, inc.unlocks),
    playDays: union(cur.playDays, inc.playDays).sort().slice(-60),
    starsByLevel: maxMap(cur.starsByLevel, inc.starsByLevel),
    attemptsByLevel: maxMap(cur.attemptsByLevel, inc.attemptsByLevel),
    episodesDone: maxMap(cur.episodesDone, inc.episodesDone),
    codeMissions: maxMap(cur.codeMissions, inc.codeMissions),
    personalBests: maxMap(cur.personalBests, inc.personalBests),
    sessionsDone: maxMap(cur.sessionsDone, inc.sessionsDone),
    questProgress: maxMap(cur.questProgress, inc.questProgress),
    badges,
    conceptLog: mergeConceptLog(cur.conceptLog ?? [], inc.conceptLog),
    conceptSecured: mergeConceptSecured(cur.conceptSecured ?? {}, inc.conceptSecured),
    // A start point set on this device wins; otherwise take the backup's.
    galaxyStart: { ...(inc.galaxyStart ?? {}), ...(cur.galaxyStart ?? {}) },
    // Names and looks: this device's choice wins unless it is still the default.
    explorerName: cur.explorerName || inc.explorerName || '',
    robotName: robotIsDefault ? (inc.robotName ?? cur.robotName) : cur.robotName,
    robotColor: robotIsDefault ? (inc.robotColor ?? cur.robotColor) : cur.robotColor,
    robotAccent: robotIsDefault ? (inc.robotAccent ?? cur.robotAccent) : cur.robotAccent,
    robotEyes: robotIsDefault ? (inc.robotEyes ?? cur.robotEyes) : cur.robotEyes,
    avatar: avatarIsDefault && inc.avatar ? inc.avatar : cur.avatar,
    currentZone: nowAtStart ? (inc.currentZone ?? cur.currentZone) : cur.currentZone,
    currentLevel: nowAtStart ? (inc.currentLevel ?? cur.currentLevel) : cur.currentLevel,
  }
}

function mergeActivities(
  cur: Record<string, BackupActivityRecord>,
  inc: Record<string, BackupActivityRecord>,
): Record<string, BackupActivityRecord> {
  const out = { ...cur }
  for (const [id, r] of Object.entries(inc)) {
    const c = out[id]
    if (!c) { out[id] = r; continue }
    const better = r.stars > c.stars
    out[id] = {
      stars: Math.max(c.stars, r.stars),
      attempts: better ? r.attempts : c.attempts,
      score: Math.max(c.score, r.score),
      plays: Math.max(c.plays, r.plays),
      at: r.at > c.at ? r.at : c.at,
    }
  }
  return out
}

/** Progress minus fields still at their defaults (keeps the code short). */
function compactProgress(p: KidsProgress): Partial<KidsProgress> {
  const out: Partial<KidsProgress> = {}
  for (const k of Object.keys(p) as (keyof KidsProgress)[]) {
    if (k === 'lastPlayed') continue
    if (JSON.stringify(p[k]) === JSON.stringify(DEFAULT_PROGRESS[k])) continue
    ;(out as Record<string, unknown>)[k] = p[k]
  }
  return out
}

/**
 * The whole progress as a backup code. Compressed when the browser can
 * (CompressionStream), plain JSON otherwise. Never throws.
 * `extras` are small strings the caller owns (e.g. `{ robot: encodeDesign(design) }`),
 * handed back unchanged by importProgressCode.
 */
export async function exportProgressCode(opts: { extras?: Record<string, string>; compress?: boolean; profileId?: string | null } = {}): Promise<string> {
  // Every profile on the device has its own code (lib/kids/profiles.ts); default: whoever is playing.
  const pid = opts.profileId === undefined || opts.profileId === activeProfileId() ? undefined : opts.profileId
  const payload: BackupPayload = { v: 1, p: compactProgress(pid === undefined ? getProgress() : getProgressOf(pid)) }
  const a = readActivities(pid)
  if (Object.keys(a).length) payload.a = a
  const x = cleanStrMap(opts.extras, 512, 8)
  if (x && Object.keys(x).length) payload.x = x
  const json = JSON.stringify(payload)
  const raw = new TextEncoder().encode(json)
  const z = opts.compress === false ? null : await deflate(raw)
  // Only use the compressed form when it is really shorter.
  const useZ = !!z && z.length < raw.length
  return [BACKUP_PREFIX, useZ ? 'z' : 'j', toBase64Url(useZ && z ? z : raw), fnv1a(json)].join('.')
}

/** Reads a backup code without saving anything. Never throws. */
export async function readProgressCode(
  code: string,
): Promise<{ ok: true; progress: Partial<KidsProgress>; activities: Record<string, BackupActivityRecord>; extras: Record<string, string> } | { ok: false; reason: ProgressImportFailure }> {
  try {
    if (typeof code !== 'string') return { ok: false, reason: 'empty' }
    // People paste codes with spaces, line breaks or quotes around them.
    const clean = code.replace(/[\s"'`]+/g, '')
    if (!clean) return { ok: false, reason: 'empty' }
    if (clean.length > BACKUP_MAX_CODE) return { ok: false, reason: 'format' }
    const parts = clean.split('.')
    if (parts.length !== 4) return { ok: false, reason: 'format' }
    const [prefix, mode, body, sum] = parts
    if (!/^R2K\d+$/i.test(prefix)) return { ok: false, reason: 'format' }
    if (prefix.toUpperCase() !== BACKUP_PREFIX) return { ok: false, reason: 'version' }
    if ((mode !== 'z' && mode !== 'j') || !/^[0-9a-f]{8}$/i.test(sum)) return { ok: false, reason: 'format' }
    const bytes = fromBase64Url(body)
    if (!bytes || !bytes.length) return { ok: false, reason: 'corrupt' }
    let jsonBytes: Uint8Array | null = bytes
    if (mode === 'z') {
      const r = await inflate(bytes)
      if (r === 'unsupported') return { ok: false, reason: 'unsupported' }
      jsonBytes = r
    }
    if (!jsonBytes || jsonBytes.length > BACKUP_MAX_JSON) return { ok: false, reason: 'corrupt' }
    const json = new TextDecoder('utf-8', { fatal: false }).decode(jsonBytes)
    if (fnv1a(json) !== sum.toLowerCase()) return { ok: false, reason: 'checksum' }
    let parsed: unknown
    try { parsed = JSON.parse(json) } catch { return { ok: false, reason: 'corrupt' } }
    if (!isObj(parsed) || parsed.v !== 1) return { ok: false, reason: 'shape' }
    const progress = isObj(parsed.p) && Object.keys(parsed.p).length === 0 ? {} : cleanProgress(parsed.p)
    if (!progress) return { ok: false, reason: 'shape' }
    return { ok: true, progress, activities: cleanActivities(parsed.a), extras: cleanStrMap(parsed.x, 512, 8) ?? {} }
  } catch {
    return { ok: false, reason: 'corrupt' }
  }
}

/**
 * Restores a backup code into this device, merged with what is already here:
 * the max of every number, the union of every list. Never lowers progress,
 * never throws. Fires KIDS_PROGRESS_EVENT (through saveProgress) on success.
 */
export async function importProgressCode(code: string, opts: { profileId?: string | null } = {}): Promise<ProgressImportResult> {
  const read = await readProgressCode(code)
  if (!read.ok) return read
  try {
    // Restores into whoever is playing, or into one named profile (parent hub).
    const pid = opts.profileId === undefined || opts.profileId === activeProfileId() ? undefined : opts.profileId
    const pKey = progressKey(pid)
    const cur = readProgressAt(pKey)
    const merged = mergeProgress(cur, read.progress)
    const curActs = readActivities(pid)
    const acts = mergeActivities(curActs, read.activities)
    const added: ProgressImportAdded = {
      xp: merged.xp - cur.xp,
      stars: merged.totalStars - cur.totalStars,
      badges: Object.keys(merged.badges).length - Object.keys(cur.badges).length,
      unlocks: merged.unlocks.length - cur.unlocks.length,
      sessions: Object.keys(merged.sessionsDone).length - Object.keys(cur.sessionsDone).length,
      activities: Object.keys(acts).length - Object.keys(curActs).length,
    }
    const { lastPlayed: _a, ...m } = merged
    const { lastPlayed: _b, ...c } = cur
    void _a
    void _b
    const changed = JSON.stringify(m) !== JSON.stringify(c) || JSON.stringify(acts) !== JSON.stringify(curActs)
    if (changed && isBrowser() && JSON.stringify(acts) !== JSON.stringify(curActs)) {
      try { window.localStorage.setItem(activitiesKey(pid), JSON.stringify(acts)) } catch {}
    }
    // saveProgress always fires KIDS_PROGRESS_EVENT, so every screen refreshes.
    let progress: KidsProgress
    if (pid === undefined) progress = saveProgress(merged)
    else {
      progress = { ...merged, lastPlayed: cur.lastPlayed }
      try { window.localStorage.setItem(pKey, JSON.stringify(progress)) } catch {}
      try { window.dispatchEvent(new CustomEvent(KIDS_PROGRESS_EVENT)) } catch {}
    }
    return { ok: true, changed, progress, added, extras: read.extras }
  } catch {
    return { ok: false, reason: 'corrupt' }
  }
}

// ── One star count (added 26 Nov 2026) ────────────────────────────────────────
// Stars are the 1–3 quality mark on a finished thing; XP is the one currency.
// Older surfaces (Spark Trail, Story Theatre, Code Lab, challenges) add their
// stars to `totalStars`; the course and the Skill Galaxy keep best stars per
// session/activity and never touch it. This is the single honest total of both,
// so every screen can show the same number. Read-only.

function sumValues(m: Record<string, number>): number {
  let s = 0
  for (const v of Object.values(m)) s += Number.isFinite(v) ? v : 0
  return s
}

/** Every star the child has collected, across old and new surfaces. Never double-counts. */
export function collectedStars(p: KidsProgress = getProgress()): number {
  // totalStars already includes Spark Trail levels, stories and Code Lab missions
  // (and challenge stars, which have no per-item record), so take the larger of
  // it and their per-item sums, then add the course and the Skill Galaxy.
  const legacy = Math.max(p.totalStars, sumValues(p.starsByLevel) + sumValues(p.episodesDone) + sumValues(p.codeMissions))
  let galaxy = 0
  for (const r of Object.values(readActivities())) galaxy += r.stars
  return Math.round(legacy + sumValues(p.sessionsDone) + galaxy)
}
