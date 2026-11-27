'use client'

// components/kids/universe/universe-state.ts
// Read-only views of the one kids progress store (lib/kids-progress.ts) for the
// Universe home. Nothing here writes rewards fields (xp, badges, unlocks,
// quests, sessionsDone) — only lib/kids/universe/rewards.ts does that.

import { useEffect, useState } from 'react'
import { getProgress, KIDS_PROGRESS_EVENT, type KidsProgress } from '@/lib/kids-progress'
import { BAND_ORDER, type BandId } from '@/lib/kids/bands'
import { GAMES, PLANETS, type UniverseGame } from '@/lib/kids/universe/worlds'
import { weekKey } from '@/lib/kids/universe/rewards'
import { conceptStates, type ConceptState } from '@/lib/kids/universe/mastery'

/** Sessions per planet (each curriculum level is a 24-session season). */
export const SESSIONS_PER_LEVEL = 24

/** UI-only flag: the child finished or skipped the first-visit setup. */
const ONBOARDED_KEY = 'r2bot_kids_onboarded'

export function readOnboarded(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDED_KEY) === '1'
  } catch {
    return false
  }
}

export function markOnboarded(): void {
  try {
    window.localStorage.setItem(ONBOARDED_KEY, '1')
  } catch {
    /* private mode: the setup simply shows again next time */
  }
}

/** Live progress: null on the server and before hydration, then the stored value, kept fresh on every save. */
export function useKidsProgress(): KidsProgress | null {
  const [p, setP] = useState<KidsProgress | null>(null)
  useEffect(() => {
    const read = () => setP(getProgress())
    read()
    window.addEventListener(KIDS_PROGRESS_EVENT, read)
    window.addEventListener('storage', read)
    return () => {
      window.removeEventListener(KIDS_PROGRESS_EVENT, read)
      window.removeEventListener('storage', read)
    }
  }, [])
  return p
}

/** Has this child done anything at all? (Used to decide between "welcome" and "your explorer".) */
export function hasStarted(p: KidsProgress): boolean {
  return Boolean(p.explorerName || p.band || p.xp > 0 || p.playDays.length || p.totalStars > 0)
}

/** Session numbers finished on a level, from sessionsDone ids like "L1-S03". */
export function sessionsDoneOn(p: KidsProgress, level: number): number[] {
  const out: number[] = []
  const re = new RegExp(`^L${level}-S(\\d+)$`)
  for (const id of Object.keys(p.sessionsDone)) {
    const m = re.exec(id)
    if (m) out.push(Number(m[1]))
  }
  return out
}

/** Mon..Sun of the current ISO week: true where the child played. */
export function weekDots(p: KidsProgress, now: Date = new Date()): boolean[] {
  const wk = weekKey(now)
  const dots = [false, false, false, false, false, false, false]
  for (const day of p.playDays) {
    const d = new Date(`${day}T12:00:00`)
    if (Number.isNaN(d.getTime()) || weekKey(d) !== wk) continue
    dots[(d.getDay() + 6) % 7] = true
  }
  return dots
}

/** Games the child has finished a round of (GameShell records personal bests as "<gameId>:t<tier>"). */
export function gamesPlayed(p: KidsProgress): Set<string> {
  const out = new Set<string>()
  for (const k of Object.keys(p.personalBests)) out.add(k.split(':')[0])
  return out
}

/** A game that fits the child's band and that they have not tried yet (or the best fit if they tried them all). */
export function suggestGame(p: KidsProgress, band: BandId): UniverseGame {
  const played = gamesPlayed(p)
  const rank = BAND_ORDER.indexOf(band)
  const fits = GAMES.filter((g) => BAND_ORDER.indexOf(g.minBand) <= rank)
  const pool = fits.length ? fits : GAMES
  // Prefer games designed for exactly this band, then the closest below it.
  const sorted = [...pool].sort((a, b) => BAND_ORDER.indexOf(b.minBand) - BAND_ORDER.indexOf(a.minBand))
  return sorted.find((g) => !played.has(g.id)) ?? sorted[0]
}

export function planetForBand(band: BandId | null) {
  return PLANETS.find((pl) => pl.band === band) ?? PLANETS[0]
}

// ── "Your next mission" for ages 8–17 (roadmap #9) ─────────────────────────

/** The tier a band starts on: Explorers Cadet, Builders Pilot, Inventors Ace, Engineers Legend. */
function bandTier(band: BandId, g: UniverseGame): number {
  return Math.min(Math.max(0, BAND_ORDER.indexOf(band)), g.tiers - 1)
}

/** The next tier worth playing: one above the best tier already won, else the band's tier. */
export function nextTierFor(p: KidsProgress, g: UniverseGame, band: BandId): number {
  let won = -1
  for (const k of Object.keys(p.personalBests)) {
    const m = /^(.+):t(\d+)$/.exec(k)
    if (m && m[1] === g.id) won = Math.max(won, Number(m[2]))
  }
  if (won < 0) return bandTier(band, g)
  return Math.min(won + 1, g.tiers - 1)
}

/** The concept to practise today, from the child's own mastery: a fading one first, else the nearest to secure. */
export function masteryPick(p: KidsProgress, today?: string): { state: ConceptState; kind: 'recharge' | 'almost' } | null {
  if (!p.conceptLog?.length) return null
  const states = conceptStates({ conceptLog: p.conceptLog, conceptSecured: p.conceptSecured ?? {} }, today)
  const fading = states
    .filter((s) => s.status === 'fading' || (s.status === 'secure' && s.cells <= 2))
    .sort((a, b) => a.cells - b.cells || (b.daysSinceWin ?? 0) - (a.daysSinceWin ?? 0))
  if (fading[0]) return { state: fading[0], kind: 'recharge' }
  const learning = states.filter((s) => s.status === 'learning').sort((a, b) => b.progress - a.progress)
  if (learning[0]) return { state: learning[0], kind: 'almost' }
  return null
}
