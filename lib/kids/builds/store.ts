// lib/kids/builds/store.ts
// The child's Make It at Home check-ins (roadmap #44): which builds they made,
// when, what their "try one change" test showed and (teens) a one-line
// reflection. Device-only localStorage, one store per child via profileKey()
// (so NOT in SWAPPED_KEYS). No photos, no names: a build id, a day, a choice.
//
// Rewards are NOT decided here: the check-in reports kind 'project' through
// reportBestRun (lib/kids/universe/rewards.ts), first finish only.
// Browser-only; every function is safe to call on the server (it does nothing).

import { profileKey } from '../profiles'

export const BUILDS_BASE = 'r2bot_kids_builds_v1'
export const BUILDS_EVENT = 'r2bot:kids-builds'

export interface BuildCheckIn {
  /** Local day YYYY-MM-DD of the first check-in. */
  d: string
  /** Tries it took to answer the check question. */
  a: number
  /** Index of the fair-test outcome they saw (0–2), if they tested a change. */
  t?: number
  /** One-line reflection (Inventors and Engineers), already checked on the device. */
  r?: string
}

export type BuildsState = Record<string, BuildCheckIn>

const ID_RE = /^[a-z0-9-]{2,40}$/
export const REFLECTION_MAX = 140

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

/** Validates whatever was stored (or restored) and drops anything malformed. */
export function cleanBuilds(raw: unknown): BuildsState {
  const out: BuildsState = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!ID_RE.test(id) || !v || typeof v !== 'object') continue
    const o = v as Record<string, unknown>
    const d = typeof o.d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.d) ? o.d : null
    if (!d) continue
    const rec: BuildCheckIn = { d, a: typeof o.a === 'number' && o.a >= 1 ? Math.min(99, Math.floor(o.a)) : 1 }
    if (typeof o.t === 'number' && o.t >= 0 && o.t <= 2) rec.t = Math.floor(o.t)
    if (typeof o.r === 'string' && o.r.trim()) rec.r = o.r.trim().slice(0, REFLECTION_MAX)
    out[id] = rec
  }
  return out
}

export function readBuilds(): BuildsState {
  const s = storage()
  if (!s) return {}
  try {
    const raw = s.getItem(profileKey(BUILDS_BASE))
    return raw ? cleanBuilds(JSON.parse(raw)) : {}
  } catch {
    return {}
  }
}

function write(state: BuildsState): boolean {
  const s = storage()
  if (!s) return false
  try {
    s.setItem(profileKey(BUILDS_BASE), JSON.stringify(state))
    window.dispatchEvent(new CustomEvent(BUILDS_EVENT))
    return true
  } catch {
    return false
  }
}

export function localDay(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Record (or update) a check-in. The first day and the fewest tries are kept. */
export function saveCheckIn(id: string, patch: { attempts?: number; test?: number; reflection?: string }, now: Date = new Date()): BuildCheckIn | null {
  if (!ID_RE.test(id)) return null
  const all = readBuilds()
  const prev = all[id]
  const next: BuildCheckIn = prev ? { ...prev } : { d: localDay(now), a: patch.attempts ?? 1 }
  if (prev && patch.attempts) next.a = Math.min(prev.a, patch.attempts)
  if (patch.test !== undefined) next.t = patch.test
  if (patch.reflection !== undefined) {
    const r = patch.reflection.trim().slice(0, REFLECTION_MAX)
    if (r) next.r = r
    else delete next.r
  }
  all[id] = next
  return write(all) ? next : null
}

export function builtCount(state: BuildsState = readBuilds()): number {
  return Object.keys(state).length
}

// ── Backup code (lib/kids-progress.ts exportProgressCode `extras.builds`) ───────
// Extras are capped at 512 characters, so a build is a 3-character tag (FNV-1a of
// its id, base36: stable however the catalogue is reordered), the day as days
// since 2025-01-01 (3 base36 characters) and the fair-test outcome (0–2 or "-").
// Reflections are free text and stay on the device: they are not in the code.

const DAY0 = Date.UTC(2025, 0, 1)
const DAY_MS = 86_400_000

/** 3-character stable tag for a build id. The builds verify checks tags never collide. */
export function buildTag(id: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return (h % 46656).toString(36).padStart(3, '0')
}

/** The check-ins as a short string for the progress backup code. */
export function buildsBackupExtra(state: BuildsState = readBuilds()): string {
  let out = 'B1.'
  for (const [id, c] of Object.entries(state)) {
    const [y, m, d] = c.d.split('-').map(Number)
    const days = Math.round((Date.UTC(y, m - 1, d) - DAY0) / DAY_MS)
    if (days < 0 || days >= 46656) continue
    const entry = `${buildTag(id)}${days.toString(36).padStart(3, '0')}${c.t ?? '-'}`
    if (out.length + entry.length > 512) break
    out += entry
  }
  return out
}

/** Check-ins in a backup string, resolved against the known build ids. Unknown tags and bad input are ignored. Never throws. */
export function decodeBuildsExtra(code: unknown, knownIds: readonly string[]): BuildsState {
  const out: BuildsState = {}
  if (typeof code !== 'string' || !/^B1\.([0-9a-z]{6}[0-2-])*$/.test(code)) return out
  const byTag = new Map(knownIds.map((id) => [buildTag(id), id]))
  for (let i = 3; i + 7 <= code.length; i += 7) {
    const id = byTag.get(code.slice(i, i + 3))
    if (!id) continue
    const day = new Date(DAY0 + parseInt(code.slice(i + 3, i + 6), 36) * DAY_MS)
    const rec: BuildCheckIn = { d: day.toISOString().slice(0, 10), a: 1 }
    const t = code[i + 6]
    if (t !== '-') rec.t = Number(t)
    out[id] = rec
  }
  return out
}

/** Merge restored check-ins into the playing child's (a restore never removes or lowers anything). Returns how many builds were added. */
export function restoreBuildsExtra(code: unknown, knownIds: readonly string[]): number {
  const restored = decodeBuildsExtra(code, knownIds)
  const all = readBuilds()
  let added = 0
  for (const [id, r] of Object.entries(restored)) {
    const cur = all[id]
    if (!cur) {
      all[id] = r
      added++
      continue
    }
    const next: BuildCheckIn = { ...cur }
    if (r.d < cur.d) next.d = r.d
    if (next.t === undefined && r.t !== undefined) next.t = r.t
    all[id] = next
  }
  if (Object.keys(restored).length) write(all)
  return added
}
