// lib/kids/curriculum/level2/resolve.ts
// SERVER ONLY (reads the activity list, the Code Lab missions, the Physics Lab
// arenas, the game list and the Story Theatre catalogue).
//
// Turns one Level 2 session's REFERENCES (ids) into the plain data its page
// and runner need: titles, links, emoji, the tier name and the personal-best
// key the challenge is judged by. One session's data only, so the client gets
// a few KB, never the season or the activity catalogue.

import { ALL_ACTIVITIES } from '../../activities/content'
import { TRACKS } from '../../activities/types'
import { getMission } from '../../code-lab/missions'
import { DEMOS } from '../../sim/demos'
import { getEpisode, episodeMinutes, nextEpisode } from '../../stories'
import type { Episode as StoryEpisode } from '../../stories/types'
import { getGame } from '../../universe/worlds'
import { TIER_NAMES } from '../../universe/tiers'
import { levelByNumber } from '../levels'
import type { ConceptId } from '../types'
import { LEVEL2_SESSIONS } from './index'
import type { L2Session } from './types'

export interface ResolvedArena {
  kind: 'code-lab' | 'physics'
  id: string
  title: string
  emoji: string
  href: string
  task: string
  why: string
  /** What the arena itself teaches (its own learning goal / lesson line). */
  lesson: string
}

export interface ResolvedActivity {
  id: string
  title: string
  trackName: string
  trackIcon: string
  href: string
  why: string
  concepts: ConceptId[]
}

export interface ResolvedGame {
  id: string
  name: string
  emoji: string
  tier: number
  tierName: string
  href: string
  goal: string
  link: string
  /** lib/kids-progress personalBests key that GameShellClient writes on a WON round of this tier. */
  bestKey: string
}

export interface ResolvedTheatre {
  slug: string
  title: string
  minutes: number
  episode: StoryEpisode
  /** The Story Theatre episode after it (the player's "next" card). */
  next: { slug: string; title: string }
}

export interface Level2SessionData {
  session: L2Session
  levelTitle: string
  actTitle: string
  arena: ResolvedArena
  activities: ResolvedActivity[]
  game: ResolvedGame
  theatre: ResolvedTheatre | null
  prev: { number: number; title: string } | null
  next: { number: number; title: string } | null
}

/** Resolve one arena reference (null when the id is unknown — verify.ts makes that impossible in CI). */
export function resolveArena(s: L2Session): ResolvedArena | null {
  const a = s.arena
  if (a.kind === 'code-lab') {
    const m = getMission(a.id)
    if (!m) return null
    return { kind: a.kind, id: a.id, title: m.title, emoji: m.emoji, href: `/kids/code-lab/${m.id}`, task: a.task, why: a.why, lesson: m.learningGoal }
  }
  const d = DEMOS.find((x) => x.id === a.id)
  if (!d) return null
  return { kind: a.kind, id: a.id, title: `${d.title} (Physics Lab)`, emoji: '🧪', href: '/kids/lab/sim', task: a.task, why: a.why, lesson: d.lesson }
}

export function resolveActivities(s: L2Session): ResolvedActivity[] {
  const out: ResolvedActivity[] = []
  for (const r of s.activities) {
    const a = ALL_ACTIVITIES.find((x) => x.id === r.id)
    if (!a) continue
    const t = TRACKS.find((x) => x.id === a.track)
    out.push({ id: a.id, title: a.title, trackName: t?.name ?? a.track, trackIcon: t?.icon ?? '✨', href: `/kids/galaxy/${a.track}/${a.id}`, why: r.why, concepts: a.concepts ?? [] })
  }
  return out
}

export function resolveGame(s: L2Session): ResolvedGame | null {
  const g = getGame(s.challenge.game)
  if (!g) return null
  return {
    id: g.id,
    name: g.name,
    emoji: g.emoji,
    tier: s.challenge.tier,
    tierName: TIER_NAMES[s.challenge.tier],
    href: `/kids/play/${g.id}`,
    goal: s.challenge.goal,
    link: s.challenge.link,
    bestKey: `${g.id}:t${s.challenge.tier}`,
  }
}

export function resolveTheatre(s: L2Session): ResolvedTheatre | null {
  if (!s.theatre) return null
  const e = getEpisode(s.theatre)
  if (!e) return null
  const n = nextEpisode(e.slug)
  return { slug: e.slug, title: e.title, minutes: episodeMinutes(e), episode: e, next: { slug: n.slug, title: n.title } }
}

export function level2SessionData(n: number): Level2SessionData | null {
  const s = LEVEL2_SESSIONS.find((x) => x.number === n)
  if (!s) return null
  const arena = resolveArena(s)
  const game = resolveGame(s)
  if (!arena || !game) return null
  const level = levelByNumber(2)
  const act = level.season.arc.find((a) => s.number >= a.sessions[0] && s.number <= a.sessions[1])
  const prev = LEVEL2_SESSIONS.find((x) => x.number === n - 1)
  const next = LEVEL2_SESSIONS.find((x) => x.number === n + 1)
  return {
    session: s,
    levelTitle: level.season.title,
    actTitle: act ? `Act ${level.season.arc.indexOf(act) + 1}: ${act.title}` : level.name,
    arena,
    activities: resolveActivities(s),
    game,
    theatre: resolveTheatre(s),
    prev: prev ? { number: prev.number, title: prev.title } : null,
    next: next ? { number: next.number, title: next.title } : null,
  }
}
