// lib/kids/activities/launch-check.ts
// Launch Check (roadmap #29): a 6–8 mission placement check per Skill Galaxy
// track that sets the child's start point there. Pure, deterministic and
// shared by the page (server: which activities to send) and the client
// (which one to play next, and where to start).
//
// The ladder: up to eight rungs from "a bit below your band" to "a bit above":
//   band below Ace/Legend · your band Cadet (1) · 2 · Pilot (3) · Ace (4) ·
//   Legend (5) · band above Cadet · band above Pilot/Ace.
// A staircase walks it: start at your band's difficulty 2; a first-try win
// goes up one rung, anything else goes down one. Two misses in a row pick the
// easier mission on the SAME concept as the last miss where one exists. Three
// first-try wins in a row offer "skip to Ace?". It stops after 8 missions, or
// after 6 once the child has been bracketed (a win and a miss on neighbouring
// rungs), or at the top rung won. The start point is the rung just above the
// highest one won first try.
//
// Nothing is a test score: no marks are shown or stored beyond the normal
// mastery evidence, and the child can stop at any time.

import { BAND_ORDER, type BandId } from '../bands'
import type { ActivitySummary, StartPoint } from './progress'
import type { TemplateId, TrackId } from './types'

export const LAUNCH_MIN = 6
export const LAUNCH_MAX = 8
export const LAUNCH_SKIP_STREAK = 3

/** Templates that play in a minute or two: preferred for placement. */
const QUICK: ReadonlySet<TemplateId> = new Set<TemplateId>([
  'robot-match',
  'predict-output',
  'estimate',
  'sensor-choice',
  'classify-sort',
  'logic-gates',
  'spot-in-scene',
  'binary-encoder',
  'motor-math',
  'ohms-law',
  'threshold-tuner',
  'signal-graph',
  'gear-train',
  'lever-balance',
  'sequence-path',
  'flowchart-builder',
])

export interface LaunchRung {
  band: BandId
  min: number
  max: number
  /** Candidate activity ids, quickest and most "on concept" first. */
  ids: string[]
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

/** The rungs for a track and a band. Rungs with no activity are left out. */
export function launchLadder(list: readonly ActivitySummary[], track: TrackId, band: BandId): LaunchRung[] {
  const bi = BAND_ORDER.indexOf(band)
  const below = BAND_ORDER[bi - 1]
  const above = BAND_ORDER[bi + 1]
  const spec: { band: BandId | undefined; min: number; max: number }[] = [
    { band: below, min: 4, max: 5 },
    { band, min: 1, max: 1 },
    { band, min: 2, max: 2 },
    { band, min: 3, max: 3 },
    { band, min: 4, max: 4 },
    { band, min: 5, max: 5 },
    { band: above, min: 1, max: 2 },
    { band: above, min: 3, max: 4 },
  ]
  const inTrack = list.filter((a) => a.track === track)
  const rungs: LaunchRung[] = []
  for (const r of spec) {
    if (!r.band) continue
    const ids = inTrack
      .filter((a) => a.band === r.band && a.difficulty >= r.min && a.difficulty <= r.max)
      .sort(
        (a, b) =>
          Number(!QUICK.has(a.template)) - Number(!QUICK.has(b.template)) ||
          Number(!!a.after?.length) - Number(!!b.after?.length) ||
          hash(`${track}|${a.id}`) - hash(`${track}|${b.id}`),
      )
      .map((a) => a.id)
      .slice(0, 6)
    if (ids.length) rungs.push({ band: r.band, min: r.min, max: r.max, ids })
  }
  return rungs
}

/** Every activity id a ladder might use (the page sends only these). */
export function ladderIds(rungs: readonly LaunchRung[]): string[] {
  return [...new Set(rungs.flatMap((r) => r.ids))]
}

export interface LaunchItem {
  id: string
  rung: number
  /** Solved on the first try. */
  ok: boolean
}

export interface LaunchState {
  rung: number
  items: LaunchItem[]
  done: boolean
}

export function launchStart(rungs: readonly LaunchRung[], band: BandId): LaunchState {
  let rung = rungs.findIndex((r) => r.band === band && r.min === 2)
  if (rung < 0) rung = rungs.findIndex((r) => r.band === band)
  if (rung < 0) rung = 0
  return { rung, items: [], done: rungs.length === 0 }
}

/** Consecutive first-try wins at the end. */
export function launchWinStreak(s: LaunchState): number {
  let n = 0
  for (let i = s.items.length - 1; i >= 0 && s.items[i].ok; i--) n++
  return n
}

function missStreak(s: LaunchState): number {
  let n = 0
  for (let i = s.items.length - 1; i >= 0 && !s.items[i].ok; i--) n++
  return n
}

/**
 * The next activity id: an unused candidate on the current rung (then the
 * nearest rung below, then above). After two misses in a row, one that shares
 * a concept with the last miss comes first.
 */
export function launchNextItem(rungs: readonly LaunchRung[], s: LaunchState, list: readonly ActivitySummary[]): string | undefined {
  if (s.done || !rungs.length) return undefined
  const used = new Set(s.items.map((i) => i.id))
  const byId = new Map(list.map((a) => [a.id, a]))
  const lastMiss = missStreak(s) >= 2 ? byId.get(s.items[s.items.length - 1].id) : undefined
  const sameConcept = (id: string) => !!lastMiss?.concepts?.some((c) => byId.get(id)?.concepts?.includes(c))
  const order = [s.rung]
  for (let d = 1; d < rungs.length; d++) order.push(s.rung - d, s.rung + d)
  for (const r of order) {
    const rung = rungs[r]
    if (!rung) continue
    const free = rung.ids.filter((id) => !used.has(id))
    if (!free.length) continue
    return free.find(sameConcept) ?? free[0]
  }
  return undefined
}

/** Record one result and move the staircase. */
export function launchAdvance(rungs: readonly LaunchRung[], s: LaunchState, result: { id: string; ok: boolean }): LaunchState {
  const items = [...s.items, { id: result.id, rung: s.rung, ok: result.ok }]
  const top = rungs.length - 1
  const rung = Math.max(0, Math.min(top, s.rung + (result.ok ? 1 : -1)))
  const n = items.length
  const last = items[n - 1]
  const prev = items[n - 2]
  const bracketed = !!prev && prev.ok !== last.ok && Math.abs(prev.rung - last.rung) <= 1
  const topWon = result.ok && s.rung === top
  const next: LaunchState = { rung, items, done: false }
  next.done =
    n >= LAUNCH_MAX ||
    (n >= LAUNCH_MIN && (bracketed || topWon)) ||
    (topWon && launchWinStreak(next) >= LAUNCH_MIN) ||
    launchNextItem(rungs, next, []) === undefined
  return next
}

/** Where to start: the rung just above the highest rung won on the first try. */
export function launchPlacement(rungs: readonly LaunchRung[], s: LaunchState): StartPoint {
  if (!rungs.length) return { band: BAND_ORDER[0], minDifficulty: 1 }
  const won = s.items.filter((i) => i.ok).map((i) => i.rung)
  const best = won.length ? Math.max(...won) : -1
  // Nothing won first try: the very start of the lowest band on the ladder (gentle beats "too hard").
  if (best < 0) return { band: rungs[0].band, minDifficulty: 1 }
  // Missed the rung above twice or more: start on the rung already won, not on the wall.
  const missedAbove = s.items.filter((i) => !i.ok && i.rung === best + 1).length
  const startRung = missedAbove >= 2 ? rungs[best] : rungs[best + 1]
  if (startRung) return { band: startRung.band, minDifficulty: startRung.min }
  const top = rungs[best]
  return { band: top.band, minDifficulty: Math.min(5, top.max) }
}
