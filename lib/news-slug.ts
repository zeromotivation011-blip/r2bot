// URL-safe slug for the news archive, isolated in its own module so it can pull
// in Node's crypto without forcing that dependency onto every importer of
// lib/news.ts (e.g. the metadata image route). Only the Node-runtime crons that
// write rows import this.
//
// MUST stay in sync with migration 0037's backfill expression so cron-written
// rows and SQL-backfilled rows use the same format:
//   slugified-title (<=60 chars, trimmed) + '-' + first 6 hex of md5(url)

import { createHash } from 'node:crypto'

export function newsSlug(title: string, url: string): string {
  const base = (title || 'story')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 60)
    .replace(/^-+|-+$/g, '')
  const hash = createHash('md5').update(url).digest('hex').slice(0, 6)
  return `${base || 'story'}-${hash}`
}
