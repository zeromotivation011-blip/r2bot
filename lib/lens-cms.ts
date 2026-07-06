// lib/lens-cms.ts — DB-first curated Lens list with MDX fallback.

import { createClient } from '@supabase/supabase-js'
import { buildVideo, getAllLens, type LensVideo } from './lens'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const sb = url && anon ? createClient(url, anon, { auth: { persistSession: false } }) : null

/** Published DB entries merged over the MDX curated set (DB wins by slug). */
export async function getAllLensMerged(): Promise<LensVideo[]> {
  const mdx = getAllLens()
  if (!sb) return mdx
  try {
    const { data } = await sb
      .from('lens_entries')
      .select('slug, body, data, status')
      .eq('status', 'published')
      .abortSignal(AbortSignal.timeout(2500))
    if (!data || data.length === 0) return mdx
    const dbVideos = data.map((r) => {
      const fm = (r.data && typeof r.data === 'object') ? (r.data as Record<string, unknown>) : {}
      return buildVideo(String(r.slug), fm, String(r.body ?? ''))
    })
    const dbSlugs = new Set(dbVideos.map((v) => v.slug))
    const merged = [...dbVideos, ...mdx.filter((v) => !dbSlugs.has(v.slug))]
    return merged.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
  } catch {
    return mdx
  }
}
