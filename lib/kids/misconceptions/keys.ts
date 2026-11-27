// lib/kids/misconceptions/keys.ts
//
// The shape of a misconception key, shared by the device store
// (lib/kids-progress.ts `checkMisconceptions`), the backup code, the class
// snapshot (lib/kids/classroom.ts) and the verify script. No imports, so the
// progress store can use it without pulling anything else in.
//
//   "<session id>.<misconception id>"   e.g. "L2-S04.taller-is-stronger"
//
// Only ids and counts ever use these keys — never an answer or free text.

/** A misconception id: kebab-case, 1–48 characters. */
export const MISCONCEPTION_ID_RE = /^[a-z0-9][a-z0-9-]{0,47}$/
/** "L1-S05.turn-moves-forward". */
export const MISCONCEPTION_KEY_RE = /^L[1-4]-S\d{2}\.[a-z0-9][a-z0-9-]{0,47}$/
/** Most keys the device keeps (newest kept; a key is moved to the end each time it is chosen). */
export const MISCONCEPTION_STORE_MAX = 60
/** Highest count kept per key. */
export const MISCONCEPTION_COUNT_MAX = 99

/** The key for a session's misconception, or null when either part is malformed. */
export function misconceptionKey(sessionId: string, misconceptionId: string): string | null {
  const k = `${sessionId}.${misconceptionId}`
  return MISCONCEPTION_KEY_RE.test(k) ? k : null
}

/** Splits a key back into its session and misconception ids. */
export function splitMisconceptionKey(key: string): { sessionId: string; id: string } | null {
  if (!MISCONCEPTION_KEY_RE.test(key)) return null
  const i = key.indexOf('.')
  return { sessionId: key.slice(0, i), id: key.slice(i + 1) }
}

/**
 * Untrusted map -> clean counts: valid keys only, whole numbers 1–99, at most
 * MISCONCEPTION_STORE_MAX keys (the LAST ones, i.e. the most recent, are kept).
 */
export function cleanMisconceptionCounts(x: unknown): Record<string, number> {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return {}
  const rows: [string, number][] = []
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    if (!MISCONCEPTION_KEY_RE.test(k) || typeof v !== 'number' || !Number.isFinite(v)) continue
    const n = Math.min(MISCONCEPTION_COUNT_MAX, Math.floor(v))
    if (n >= 1) rows.push([k, n])
  }
  return Object.fromEntries(rows.slice(-MISCONCEPTION_STORE_MAX))
}

/** The misconception id a check option carries, or null (right answers and untagged options carry none). */
export function optionMisconception(option: unknown): string | null {
  if (!option || typeof option !== 'object') return null
  const id = (option as { misconception?: unknown }).misconception
  return typeof id === 'string' && MISCONCEPTION_ID_RE.test(id) ? id : null
}
