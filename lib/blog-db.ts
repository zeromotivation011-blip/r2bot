// lib/blog-db.ts — DB-first blog reads with MDX fallback (Content Manager · Blog).

import { createClient } from '@supabase/supabase-js'
import { build, getPostBySlug, getAllPosts, type BlogPost } from './blog'

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

/**
 * Every published post: MDX files plus anything written in the CMS, deduped by
 * slug with the DB winning. The blog index and the sitemap both need this —
 * without it a post written in the browser is unreachable except by URL.
 *
 * Fails soft to the file-backed posts if the DB is unavailable.
 */
export async function getAllPostsMerged(): Promise<BlogPost[]> {
  const filePosts = getAllPosts()
  if (!sb) return filePosts

  try {
    const { data, error } = await sb
      .from('blog_posts')
      .select('slug, body, data')
      .eq('status', 'published')
      .abortSignal(AbortSignal.timeout(8000))

    if (error) throw error
    if (!data || data.length === 0) return filePosts

    const dbPosts = data.map((row) => {
      const frontmatter =
        row.data && typeof row.data === 'object' ? (row.data as Record<string, unknown>) : {}
      return build(String(row.slug), frontmatter, String(row.body ?? ''))
    })

    const bySlug = new Map<string, BlogPost>()
    for (const p of filePosts) bySlug.set(p.slug, p)
    for (const p of dbPosts) bySlug.set(p.slug, p) // DB wins

    // Newest first, matching what getAllPosts() returns.
    return Array.from(bySlug.values()).sort(
      (a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime(),
    )
  } catch {
    return filePosts
  }
}
