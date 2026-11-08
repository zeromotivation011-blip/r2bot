// lib/atlas-db.ts — Database-backed Atlas reads with MDX fallback.
//
// Reads PUBLISHED entries from the atlas_entries table (populated by the CMS /
// migration script) using a session-less anon client, so it works in SSG/ISR.
// If the DB has no row (or is unavailable), we fall back to the MDX file, so the
// public Atlas never breaks whether or not the DB is populated.

import { createClient } from '@supabase/supabase-js'
import {
  buildEntry,
  getAtlasEntry,
  getAllAtlasEntries,
  type AtlasEntry,
  type AtlasType,
} from './atlas'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const sb = url && anon ? createClient(url, anon, { auth: { persistSession: false } }) : null

/**
 * A row as it may actually exist, across two generations of this table.
 *
 * WHY THIS IS MESSY: `atlas_entries` has been written by two different things.
 * `scripts/seed-atlas.ts` (the original search-index seeder) writes the typed
 * columns — `title`, `summary`, `body_md`, `last_reviewed_at`, `category`,
 * `see_also`, `sources`, `tags`. The admin CMS writes the later generic pair,
 * `data` (frontmatter JSON) and `body`. Both sets of columns still exist.
 *
 * This reader only ever looked at `data` and `body`. So when the seeder ran on
 * 8 Nov 2026 and filled 512 rows, every one of them looked EMPTY to this file:
 * `data` was `{}` and `body` was `''`. The DB wins on content, so all 512
 * Atlas pages stopped serving their MDX and started serving a husk — the `<h1>`
 * printed the raw slug, the body was blank, "1 min read". The content was in
 * the database the whole time, in the columns nobody read.
 *
 * It also explains the missing review dates: the real date lives in
 * `last_reviewed_at`, not in `data->>'lastReviewed'`.
 */
type AtlasRow = {
  type: string
  slug: string
  // CMS generation
  body?: string | null
  data?: unknown
  // Seeder generation
  title?: string | null
  summary?: string | null
  body_md?: string | null
  last_reviewed_at?: string | null
  category?: string | null
  see_also?: string[] | null
  sources?: unknown
  tags?: string[] | null
}

/** The columns to ask for. Both generations, every time. */
const ROW_COLUMNS =
  'type, slug, body, data, title, summary, body_md, last_reviewed_at, category, see_also, sources, tags'

/** Drop keys the CMS stored as empty, so they cannot mask a real typed column. */
function present(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue
    if (typeof v === 'string' && v.trim() === '') continue
    if (Array.isArray(v) && v.length === 0) continue
    out[k] = v
  }
  return out
}

/**
 * Build an entry from a row of either generation. The CMS `data` JSON wins
 * where it actually says something; the typed columns fill everything else.
 */
function rowToEntry(row: AtlasRow): AtlasEntry {
  const cms =
    row.data && typeof row.data === 'object' && !Array.isArray(row.data)
      ? present(row.data as Record<string, unknown>)
      : {}

  const legacy = present({
    title: row.title,
    summary: row.summary,
    lastReviewed: row.last_reviewed_at,
    category: row.category,
    seeAlso: row.see_also,
    sources: row.sources,
    tags: row.tags,
  })

  const body = row.body && row.body.trim() ? row.body : (row.body_md ?? '')
  return buildEntry(row.type as AtlasType, String(row.slug), { ...legacy, ...cms }, body)
}

/**
 * Does this entry actually say anything, or would it render as a blank page?
 *
 * The belt to the braces above: whatever shape the table takes next, a row
 * that would render an empty page must never displace a real MDX file. The
 * failure this guards against was invisible — the pages returned 200, sat in
 * the sitemap, and passed every link check while saying nothing at all.
 */
function hasContent(entry: AtlasEntry): boolean {
  return Boolean(
    entry.body.trim() ||
      entry.summary.trim() ||
      entry.oneLiner?.trim() ||
      entry.laymanExplanation?.trim() ||
      entry.technicalDefinition?.trim(),
  )
}

/** DB-first, MDX-fallback single Atlas entry. Returns null only if neither has it. */
export async function getAtlasEntryMerged(type: AtlasType, slug: string): Promise<AtlasEntry | null> {
  if (sb) {
    try {
      const { data } = await sb
        .from('atlas_entries')
        .select(ROW_COLUMNS)
        .eq('type', type)
        .eq('slug', slug)
        .eq('status', 'published')
        .abortSignal(AbortSignal.timeout(2500))
        .maybeSingle()
      if (data) {
        const entry = rowToEntry(data as AtlasRow)
        // A row that would render blank never replaces a real file.
        if (!hasContent(entry)) {
          const file = getAtlasEntry(type, slug)
          if (file) return file
        }
        // Belt and braces on the date: if neither generation of columns
        // carried one, use the file's rather than showing none.
        if (!entry.lastReviewed) {
          const file = getAtlasEntry(type, slug)
          if (file?.lastReviewed) entry.lastReviewed = file.lastReviewed
        }
        return entry
      }
    } catch {
      /* fall through to MDX */
    }
  }
  return getAtlasEntry(type, slug)
}

/**
 * Every published Atlas entry: MDX files plus anything created or edited in the
 * CMS, deduplicated by `type/slug` with the DB winning.
 *
 * WHY THIS MATTERS: only the entry *detail* page read the DB. The Atlas index,
 * `generateStaticParams` and the sitemap all read the filesystem, so an entry
 * created through the admin rendered at its URL but never appeared in the index
 * and never entered the sitemap — which meant Google never saw it. Publishing
 * from the browser was effectively a no-op for SEO, the one thing the Atlas
 * exists to do.
 *
 * Fails soft: if the DB is unreachable this returns the file-backed entries, so
 * a Supabase outage can never empty the Atlas.
 */
export async function getAllAtlasEntriesMerged(): Promise<AtlasEntry[]> {
  const fileEntries = getAllAtlasEntries()
  if (!sb) return fileEntries

  try {
    const dbEntries: AtlasEntry[] = []
    const PAGE = 1000

    // Paginate: PostgREST caps rows per request, and the Atlas is headed for
    // thousands of entries. A silent truncation here would quietly drop pages
    // out of the sitemap, which is exactly the bug this function exists to fix.
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await sb
        .from('atlas_entries')
        .select(ROW_COLUMNS)
        .eq('status', 'published')
        .order('slug', { ascending: true })
        .range(from, from + PAGE - 1)
        .abortSignal(AbortSignal.timeout(8000))

      if (error) throw error
      if (!data || data.length === 0) break

      for (const row of data) {
        dbEntries.push(rowToEntry(row as AtlasRow))
      }

      if (data.length < PAGE) break
    }

    if (dbEntries.length === 0) return fileEntries

    const byKey = new Map<string, AtlasEntry>()
    for (const e of fileEntries) byKey.set(`${e.type}/${e.slug}`, e)
    for (const e of dbEntries) {
      const key = `${e.type}/${e.slug}`
      const file = byKey.get(key)
      // DB wins on content — that is the point of the admin editor. But it
      // must not erase a field it never stored: the `data` JSON in
      // atlas_entries carries no `lastReviewed`, so a straight replacement
      // dropped the real review date of every entry that also exists as a
      // file, and the date then defaulted forward to today. Carry the file's
      // date over when the DB has none.
      // A row that would render blank never displaces a file (see hasContent).
      if (file && !hasContent(e)) continue
      byKey.set(key, file && !e.lastReviewed ? { ...e, lastReviewed: file.lastReviewed } : e)
    }
    return Array.from(byKey.values())
  } catch {
    // Never let a DB problem shrink the public Atlas.
    return fileEntries
  }
}
