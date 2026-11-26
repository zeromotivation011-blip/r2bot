// lib/kids/teach/catalogue.ts
//
// SERVER ONLY. Everything a teacher can assign to a class, as light rows:
// Level 1 course sessions, Skill Galaxy activities and Universe games. It
// imports the full curriculum and ALL_ACTIVITIES (hundreds of KB), so never
// import it from a client component — the teacher's picker fetches it from
// /api/kids/classroom/catalogue, and the routes use resolveItem() to check
// what a teacher assigns and to build the child's link.

import type { BandId } from '../bands'
import { LEVEL1_SESSIONS } from '../curriculum/level1'
import { ALL_ACTIVITIES, getActivity } from '../activities/content'
import { TRACKS, type TrackId } from '../activities/types'
import { GAMES, getGame } from '../universe/worlds'
import type { AssignmentKind } from '../classroom-assignments'

export interface CatalogueSession {
  id: string
  number: number
  title: string
  objective: string
  href: string
}

export interface CatalogueActivity {
  id: string
  title: string
  track: TrackId
  band: BandId
  difficulty: number
  href: string
}

export interface CatalogueGame {
  id: string
  title: string
  emoji: string
  minBand: BandId
  hook: string
  href: string
}

export interface Catalogue {
  sessions: CatalogueSession[]
  activities: CatalogueActivity[]
  games: CatalogueGame[]
  tracks: { id: TrackId; name: string; icon: string }[]
}

export function sessionHref(n: number): string {
  return `/kids/course/1/${n}`
}

export function activityHref(track: string, id: string): string {
  return `/kids/galaxy/${track}/${id}`
}

export function gameHref(id: string): string {
  return `/kids/play/${id}`
}

/**
 * Games that have a live page under app/kids/play/<id>. GAMES also lists games
 * that are announced but not built yet (Robo Sumo Arena); assigning one would
 * send a child to a 404. Add an id here in the same change that ships its page.
 */
export const PLAYABLE_GAME_IDS: ReadonlySet<string> = new Set([
  'drone-hover',
  'arm-factory',
  'circuit-city',
  'mars-rover',
  'robot-brain',
  'maze-mapper',
  'swarm-reef',
])

export function isPlayableGame(id: string): boolean {
  return PLAYABLE_GAME_IDS.has(id)
}

let cached: Catalogue | null = null

export function getCatalogue(): Catalogue {
  if (cached) return cached
  cached = {
    sessions: LEVEL1_SESSIONS.map((s) => ({
      id: s.id,
      number: s.number,
      title: s.title,
      objective: s.objective,
      href: sessionHref(s.number),
    })),
    activities: ALL_ACTIVITIES.map((a) => ({
      id: a.id,
      title: a.title,
      track: a.track,
      band: a.band,
      difficulty: a.difficulty,
      href: activityHref(a.track, a.id),
    })),
    games: GAMES.filter((g) => isPlayableGame(g.id)).map((g) => ({
      id: g.id,
      title: g.name,
      emoji: g.emoji,
      minBand: g.minBand,
      hook: g.hook,
      href: gameHref(g.id),
    })),
    tracks: TRACKS.map((t) => ({ id: t.id, name: t.name, icon: t.icon })),
  }
  return cached
}

/** The real title and link of an assignable item, or null when it does not exist. */
export function resolveItem(kind: AssignmentKind, itemId: string): { title: string; href: string } | null {
  if (kind === 'session') {
    const s = LEVEL1_SESSIONS.find((x) => x.id === itemId)
    return s ? { title: `Session ${s.number}: ${s.title}`, href: sessionHref(s.number) } : null
  }
  if (kind === 'activity') {
    const a = getActivity(itemId)
    return a ? { title: a.title, href: activityHref(a.track, a.id) } : null
  }
  const g = isPlayableGame(itemId) ? getGame(itemId) : undefined
  return g ? { title: g.name, href: gameHref(g.id) } : null
}
