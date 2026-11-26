// lib/kids/ai/think/common.ts
// Shared pieces of the "How Robots Think" labs (Neural Playground, Learning
// Robot, Robot Senses): a seeded random generator, the band → tier mapping,
// and the per-lab record of finished missions so a mission pays out XP once.
// Plain module: no React, no browser APIs at import time.

import type { BandId } from '@/lib/kids/bands'
import type { TierName } from '@/lib/kids/universe/tiers'

/** mulberry32 — tiny, fast, good enough for teaching labs. Returns [0, 1). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Standard normal sample (Box–Muller). */
export function gauss(rng: () => number): number {
  const u = Math.max(1e-9, rng())
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export const BAND_TIER: Record<BandId, TierName> = {
  explorers: 'Cadet',
  builders: 'Pilot',
  inventors: 'Ace',
  engineers: 'Legend',
}

export function tierFromBand(b: BandId | null | undefined): TierName {
  return b ? BAND_TIER[b] : 'Cadet'
}

export const TIER_AGES: Record<TierName, string> = {
  Cadet: 'ages 5–7',
  Pilot: 'ages 8–10',
  Ace: 'ages 11–13',
  Legend: 'ages 14–17',
}

export type LabId = 'neural' | 'learn' | 'sensors'

export interface ThinkMission {
  id: string
  tier: TierName
  title: string
  /** What to do, in one or two short sentences a child can follow. */
  goal: string
  /** What the child just learned — said when the mission completes. */
  lesson: string
  xp: number
  badges?: string[]
}

const storeKey = (lab: LabId) => `r2bot_think_${lab}_done`

export function loadDone(lab: LabId): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(storeKey(lab))
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function saveDone(lab: LabId, ids: string[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storeKey(lab), JSON.stringify(ids.slice(-100)))
  } catch {
    /* storage full or blocked: the mission still celebrates, it just may pay again */
  }
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
