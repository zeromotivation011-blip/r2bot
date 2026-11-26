// lib/kids/ai/spark/live.ts
// The kids pages Spark may link to. A "Show me" link must never lead to a 404
// or out of R2BOT Kids: the app wraps /kids, and the adult site (Atlas, news,
// Co-pilot) carries an email sign-up form, which a child must never see
// (CLAUDE.md §6: children never give an email).
//
// Games and worlds are being built one by one, so they are listed here by id
// when their page ships. Add the id in the same change that adds
// app/kids/play/<id>/page.tsx or app/kids/worlds/<id>/page.tsx.
// Galaxy activities and course levels are statically generated for every
// entry in their data, so every one of them is live.

/** Games with a page at /kids/play/<id> (checked 26 Nov 2026). */
export const SPARK_LIVE_GAMES: ReadonlySet<string> = new Set([
  'arm-factory',
  'bio-bots',
  'circuit-city',
  'drone-hover',
  'mars-rover',
  'maze-mapper',
  'ocean-rescue',
  'robot-brain',
  'robot-surgeon',
  'safety-inspector',
  'sumo-arena',
  'swarm-reef',
])

/** Worlds with a page at /kids/worlds/<id> (checked 26 Nov 2026). */
export const SPARK_LIVE_WORLDS: ReadonlySet<string> = new Set(['guardians', 'hospital', 'ocean', 'zoo'])

/** Only kids pages that exist. Anything outside /kids (the Atlas included) is refused. */
export function isLiveKidsHref(href: string): boolean {
  if (!href.startsWith('/kids/')) return false
  const play = href.match(/^\/kids\/play\/([a-z0-9-]+)$/)
  if (play) return SPARK_LIVE_GAMES.has(play[1])
  const world = href.match(/^\/kids\/worlds\/([a-z0-9-]+)$/)
  if (world) return SPARK_LIVE_WORLDS.has(world[1])
  return /^\/kids\/(galaxy\/[a-z0-9-]+\/[a-z0-9-]+|course\/\d+(\/\d+)?)$/.test(href)
}
