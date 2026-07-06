// lib/atlas-db.ts — Database-backed Atlas reads with MDX fallback.
//
// Reads PUBLISHED entries from the atlas_entries table (populated by the CMS /
// migration script) using a session-less anon client, so it works in SSG/ISR.
// If the DB has no row (or is unavailable), we fall back to the MDX file, so the
// public Atlas never breaks whether or not the DB is populated.

import { createClient } from '@supabase/supabase-js'
import { buildEntry, getAtlasEntry, type AtlasEntry, type AtlasType } from './atlas'

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
