// lib/kids/ai/spark/live.ts
// The kids pages Spark may link to. A "Show me" link must never lead to a 404
// or out of R2BOT Kids: the app wraps /kids, and the adult site (Atlas, news,
// Co-pilot) carries an email sign-up form, which a child must never see
// (CLAUDE.md §6: children never give an email).
//
// Games and worlds come from lib/kids/universe/worlds.ts: only games with a
// built page go in GAMES and every world in WORLDS has a page (CLAUDE.md §6),
// so the lists here can never drift from what exists.
// Galaxy activities and course levels are statically generated for every
// entry in their data, so every one of them is live.

import { GAMES, WORLDS } from '../../universe/worlds'

/** Games with a page at /kids/play/<id>. */
export const SPARK_LIVE_GAMES: ReadonlySet<string> = new Set(GAMES.map((g) => g.id))

/** Worlds with a page at /kids/worlds/<id>. */
export const SPARK_LIVE_WORLDS: ReadonlySet<string> = new Set<string>(WORLDS.map((w) => w.id))

/** Only kids pages that exist. Anything outside /kids (the Atlas included) is refused. */
export function isLiveKidsHref(href: string): boolean {
  if (!href.startsWith('/kids/')) return false
  const play = href.match(/^\/kids\/play\/([a-z0-9-]+)$/)
  if (play) return SPARK_LIVE_GAMES.has(play[1])
  const world = href.match(/^\/kids\/worlds\/([a-z0-9-]+)$/)
  if (world) return SPARK_LIVE_WORLDS.has(world[1])
  return /^\/kids\/(galaxy\/[a-z0-9-]+\/[a-z0-9-]+|course\/\d+(\/\d+)?)$/.test(href)
}
