// lib/blog-db.ts — DB-first blog reads with MDX fallback (Content Manager · Blog).

import { createClient } from '@supabase/supabase-js'
import { build, getPostBySlug, type BlogPost } from './blog'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const sb = url && anon ? createClient(url, anon, { auth: { persistSession: false } }) : null

/** Published DB post first; falls back to the MDX file. Null only if neither exists. */
export async function getPostBySlugMerged(slug: string): Promise<BlogPost | null> {
  if (sb) {
    try {
      const { data } = await sb
        .from('blog_posts')
        .select('slug, body, data, status')
        .eq('slug', slug)
        .eq('status', 'published')
        .abortSignal(AbortSignal.timeout(2500))
        .maybeSingle()
      if (data) {
        const frontmatter = (data.data && typeof data.data === 'object')
          ? (data.data as Record<string, unknown>)
          : {}
        return build(slug, frontmatter, String(data.body ?? ''))
      }
    } catch {
      /* fall through to MDX */
    }
  }
  return getPostBySlug(slug)
}
