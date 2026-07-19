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

/** DB-first, MDX-fallback single Atlas entry. Returns null only if neither has it. */
export async function getAtlasEntryMerged(type: AtlasType, slug: string): Promise<AtlasEntry | null> {
  if (sb) {
    try {
      const { data } = await sb
        .from('atlas_entries')
        .select('type, slug, body, data, status')
        .eq('type', type)
        .eq('slug', slug)
        .eq('status', 'published')
        .abortSignal(AbortSignal.timeout(2500))
        .maybeSingle()
      if (data) {
        const frontmatter = (data.data && typeof data.data === 'object')
          ? (data.data as Record<string, unknown>)
          : {}
        return buildEntry(type, slug, frontmatter, String(data.body ?? ''))
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
        .select('type, slug, body, data')
        .eq('status', 'published')
        .order('slug', { ascending: true })
        .range(from, from + PAGE - 1)
        .abortSignal(AbortSignal.timeout(8000))

      if (error) throw error
      if (!data || data.length === 0) break

      for (const row of data) {
        const frontmatter =
          row.data && typeof row.data === 'object' ? (row.data as Record<string, unknown>) : {}
        dbEntries.push(
          buildEntry(row.type as AtlasType, String(row.slug), frontmatter, String(row.body ?? '')),
        )
      }

      if (data.length < PAGE) break
    }

    if (dbEntries.length === 0) return fileEntries

    const byKey = new Map<string, AtlasEntry>()
    for (const e of fileEntries) byKey.set(`${e.type}/${e.slug}`, e)
    for (const e of dbEntries) byKey.set(`${e.type}/${e.slug}`, e) // DB wins
    return Array.from(byKey.values())
  } catch {
    // Never let a DB problem shrink the public Atlas.
    return fileEntries
  }
}
