// lib/atlas-progress.ts
// Client-side persistence for Atlas: mastered terms, learning-path progress,
// daily streak, and term-of-the-day seeding. All stored in localStorage.

export const LS_MASTERED       = 'r2bot_atlas_mastered'
export const LS_PATH_PROGRESS  = 'r2bot_atlas_path_progress'
export const LS_STREAK         = 'r2bot_atlas_streak'
export const LS_TERM_OF_DAY    = 'r2bot_atlas_term_of_day'
export const LS_RECENT_SEARCH  = 'r2bot_atlas_recent_search'

function isBrowser() {
  return typeof window !== 'undefined'
}

function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJSON<T>(key: string, value: T) {
  if (!isBrowser()) return
  try { window.localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

// ── Mastery ────────────────────────────────────────────────────────────────
export function getMastered(): string[] {
  return readJSON<string[]>(LS_MASTERED, [])
}
export function isMastered(slug: string): boolean {
  return getMastered().includes(slug)
}
export function markMastered(slug: string): string[] {
  const cur = getMastered()
  if (cur.includes(slug)) return cur
  const next = [...cur, slug]
  writeJSON(LS_MASTERED, next)
  return next
}
export function unmarkMastered(slug: string): string[] {
  const next = getMastered().filter(s => s !== slug)
  writeJSON(LS_MASTERED, next)
  return next
}

// ── Path progress ─────────────────────────────────────────────────────────
export interface PathState { completed: string[]; startedAt: string }
export function getPathState(pathId: string): PathState {
  const all = readJSON<Record<string, PathState>>(LS_PATH_PROGRESS, {})
  return all[pathId] ?? { completed: [], startedAt: '' }
}
export function setPathState(pathId: string, state: PathState) {
  const all = readJSON<Record<string, PathState>>(LS_PATH_PROGRESS, {})
  all[pathId] = state
  writeJSON(LS_PATH_PROGRESS, all)
}
export function markPathStep(pathId: string, slug: string) {
  const cur = getPathState(pathId)
  if (!cur.startedAt) cur.startedAt = new Date().toISOString()
  if (!cur.completed.includes(slug)) cur.completed = [...cur.completed, slug]
  setPathState(pathId, cur)
}

// ── Streak ────────────────────────────────────────────────────────────────
export interface StreakState { lastVisit: string; count: number }
export function touchStreak(): StreakState {
  if (!isBrowser()) return { lastVisit: '', count: 0 }
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  const cur = readJSON<StreakState>(LS_STREAK, { lastVisit: '', count: 0 })
  if (cur.lastVisit === today) return cur
  const next: StreakState =
    cur.lastVisit === yesterday
      ? { lastVisit: today, count: cur.count + 1 }
      : { lastVisit: today, count: 1 }
  writeJSON(LS_STREAK, next)
  return next
}
export function getStreak(): StreakState {
  return readJSON<StreakState>(LS_STREAK, { lastVisit: '', count: 0 })
}

// ── Term of the Day ───────────────────────────────────────────────────────
export interface TermOfDay { date: string; slug: string }
export function getTermOfDay(allSlugs: string[]): TermOfDay {
  if (allSlugs.length === 0) return { date: '', slug: '' }
  const today = new Date().toISOString().slice(0, 10)
  const cached = readJSON<TermOfDay>(LS_TERM_OF_DAY, { date: '', slug: '' })
  if (cached.date === today && allSlugs.includes(cached.slug)) return cached
  const idx = Math.floor(Date.now() / 86_400_000) % allSlugs.length
  const next: TermOfDay = { date: today, slug: allSlugs[idx] }
  writeJSON(LS_TERM_OF_DAY, next)
  return next
}

// ── Recent searches ───────────────────────────────────────────────────────
export function getRecentSearches(): string[] {
  return readJSON<string[]>(LS_RECENT_SEARCH, [])
}
export function pushRecentSearch(q: string) {
  if (!q.trim()) return
  const cur = getRecentSearches().filter(s => s !== q)
  cur.unshift(q)
  writeJSON(LS_RECENT_SEARCH, cur.slice(0, 8))
}
