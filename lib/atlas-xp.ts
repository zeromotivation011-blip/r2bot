'use client'

// lib/atlas-xp.ts
// Local-first XP + mastery + concept-visit tracking for the Atlas reimagining.
// Mirrors the shape of the existing lib/atlas-progress.ts but adds XP, level,
// per-concept quiz-round counts, and visit history.

const STORAGE_KEY = 'r2bot_atlas_xp_v1'

export type AtlasLevelName = 'Apprentice' | 'Builder' | 'Engineer' | 'Maestro'

interface AtlasXPState {
  xp: number
  mastered: string[]                        // slugs
  quizRoundsBySlug: Record<string, number>  // 0..3 rounds correct
  visited: string[]                         // slugs visited
  curiousPickedAt: Record<string, number>   // slug -> epoch ms
  lastUpdatedAt?: string
}

const DEFAULT_STATE: AtlasXPState = {
  xp: 0,
  mastered: [],
  quizRoundsBySlug: {},
  visited: [],
  curiousPickedAt: {},
}

function read(): AtlasXPState {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_STATE }
    return { ...DEFAULT_STATE, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_STATE }
  }
}

function write(s: AtlasXPState): AtlasXPState {
  if (typeof window === 'undefined') return s
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, lastUpdatedAt: new Date().toISOString() }))
  } catch { /* noop */ }
  return s
}

// ── XP ───────────────────────────────────────────────────────────────────

export function getAtlasXP(): number {
  return read().xp
}

export function addXP(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return read().xp
  const s = read()
  s.xp = Math.max(0, s.xp + Math.floor(amount))
  write(s)
  return s.xp
}

export interface AtlasLevelInfo {
  level: AtlasLevelName
  emoji: string
  current: number
  /** XP threshold for the next level (Infinity for Maestro). */
  nextAt: number
  /** XP where the current level started. */
  baseline: number
  /** 0..1 — progress within the current level. */
  progress: number
}

const LEVEL_RANGES: Array<{ name: AtlasLevelName; emoji: string; baseline: number; nextAt: number }> = [
  { name: 'Apprentice', emoji: '🔧', baseline: 0,    nextAt: 100  },
  { name: 'Builder',    emoji: '🤖', baseline: 100,  nextAt: 500  },
  { name: 'Engineer',   emoji: '⚡', baseline: 500,  nextAt: 1500 },
  { name: 'Maestro',    emoji: '🏆', baseline: 1500, nextAt: Number.POSITIVE_INFINITY },
]

export function getAtlasLevel(xpOverride?: number): AtlasLevelInfo {
  const xp = typeof xpOverride === 'number' ? xpOverride : read().xp
  const range = LEVEL_RANGES.find(r => xp < r.nextAt) ?? LEVEL_RANGES[LEVEL_RANGES.length - 1]
  const span = range.nextAt === Number.POSITIVE_INFINITY ? 1 : range.nextAt - range.baseline
  const inLevel = Math.max(0, xp - range.baseline)
  const progress = range.nextAt === Number.POSITIVE_INFINITY ? 1 : Math.min(1, inLevel / span)
  return {
    level: range.name,
    emoji: range.emoji,
    current: xp,
    baseline: range.baseline,
    nextAt: range.nextAt,
    progress,
  }
}

// ── Mastery / quiz rounds ─────────────────────────────────────────────────

export function getMasteredConceptSlugs(): string[] {
  return read().mastered
}

export function isConceptMastered(slug: string): boolean {
  return read().mastered.includes(slug)
}

/**
 * Mark a concept as mastered. Awards `xpValue` (default 10).
 * Idempotent — re-mastering does not re-award XP.
 */
export function markConceptMastered(slug: string, xpValue: number = 10): { newTotal: number; alreadyMastered: boolean } {
  const s = read()
  if (s.mastered.includes(slug)) {
    return { newTotal: s.xp, alreadyMastered: true }
  }
  s.mastered = [...s.mastered, slug]
  s.xp = Math.max(0, s.xp + Math.floor(xpValue))
  write(s)
  return { newTotal: s.xp, alreadyMastered: false }
}

export function unmarkConceptMastered(slug: string): number {
  const s = read()
  if (!s.mastered.includes(slug)) return s.xp
  s.mastered = s.mastered.filter(x => x !== slug)
  write(s)
  return s.xp
}

export function getConceptMasteryCount(slug: string): number {
  return read().quizRoundsBySlug[slug] ?? 0
}

/** Record a quiz round. round=1..3. */
export function recordQuizRound(slug: string, round: number): number {
  const s = read()
  const cur = s.quizRoundsBySlug[slug] ?? 0
  const next = Math.max(cur, Math.min(3, Math.max(0, Math.floor(round))))
  s.quizRoundsBySlug = { ...s.quizRoundsBySlug, [slug]: next }
  write(s)
  return next
}

// ── Visit tracking (for "I'm Feeling Curious") ────────────────────────────

export function getVisitedSlugs(): string[] {
  return read().visited
}

export function markVisited(slug: string): void {
  const s = read()
  if (s.visited.includes(slug)) return
  s.visited = [...s.visited, slug]
  write(s)
}

export function pickCuriousSlug(allSlugs: string[]): string | null {
  const s = read()
  const candidates = allSlugs.filter(x => !s.visited.includes(x))
  if (candidates.length === 0) return null
  const slug = candidates[Math.floor(Math.random() * candidates.length)]
  s.curiousPickedAt = { ...s.curiousPickedAt, [slug]: Date.now() }
  write(s)
  return slug
}

// ── Bucket completion (constellation badges) ──────────────────────────────

export interface ConstellationProgress {
  bucket: string
  total: number
  mastered: number
  complete: boolean
  pct: number
}

export function getConstellationProgress(
  bucket: string,
  bucketSlugs: string[],
): ConstellationProgress {
  const m = read().mastered
  const masteredHere = bucketSlugs.filter(s => m.includes(s)).length
  const total = bucketSlugs.length
  return {
    bucket,
    total,
    mastered: masteredHere,
    pct: total === 0 ? 0 : masteredHere / total,
    complete: total > 0 && masteredHere === total,
  }
}
