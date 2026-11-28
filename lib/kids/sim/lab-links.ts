// lib/kids/sim/lab-links.ts
// Deep links into the labs and games, so a course session opens the EXACT arena
// or tier it is about instead of asking the child to find it (roadmap #23).
//
//   /kids/lab/sim?demo=<id>     Physics Lab arena (lib/kids/sim/demos.ts DEMOS)
//   /kids/lab/power?demo=<id>   Power Lab challenge (power-demos.ts; every id starts "power-")
//   /kids/play/<game>?tier=<n>  a Universe game on a tier (GameShellClient reads it)
//
// Plain strings, no imports: safe in the light curriculum modules and client islands.
// sim/verify checks the "power-" prefix rule against both demo lists.

/** The lab page that holds this arena, opened on it. */
export function labDemoHref(id: string): string {
  return id.startsWith('power-') ? `/kids/lab/power?demo=${encodeURIComponent(id)}` : `/kids/lab/sim?demo=${encodeURIComponent(id)}`
}

/** A game opened on a tier (0 Cadet … 3 Legend). Cadet is the default, so it needs no query. */
export function gameTierHref(gameId: string, tier: number): string {
  return tier > 0 ? `/kids/play/${gameId}?tier=${tier}` : `/kids/play/${gameId}`
}

/**
 * Where a solved Physics Lab or Power Lab arena is kept: the one progress store's
 * `personalBests["lab:<id>"]` = tenths of a second to spare on the best solve (higher is better). Written
 * only through reportBestRun (lib/kids/sim/lab-results.ts), so it rides in the backup code
 * like every other personal best, and a course session reads it to count the challenge done.
 */
export const LAB_RESULT_PREFIX = 'lab:'

export function labResultId(demoId: string): string {
  return `${LAB_RESULT_PREFIX}${demoId}`
}

/** Has the child solved this lab arena? `personalBests` is the progress store's. */
export function labSolved(personalBests: Record<string, number>, demoId: string): boolean {
  const v = personalBests[labResultId(demoId)]
  return typeof v === 'number' && Number.isFinite(v) && v > 0
}
