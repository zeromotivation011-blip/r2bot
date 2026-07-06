// app/api/admin/blog/import/route.ts
// Admin-only: seed blog_posts from the bundled MDX files. Idempotent (won't
// overwrite CMS-edited posts). Server-side, no local env needed.

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAllPosts } from '@/lib/blog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ ok: false, error: 'Not signed in' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if ((profile?.role as string | undefined) !== 'admin') {
    return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  const posts = getAllPosts()
  if (posts.length === 0) return Response.json({ ok: false, error: 'No MDX posts found.' }, { status: 500 })

  const rows = posts.map((p) => {
    const { content, ...frontmatter } = p
    return {
      slug: p.slug,
      title: p.title,
      description: p.description ?? '',
      date: p.date,
      status: 'published',
      data: frontmatter as Record<string, unknown>,
      body: content ?? '',
      origin: 'mdx',
    }
  })

  const { error } = await supabase.from('blog_posts').upsert(rows, { onConflict: 'slug', ignoreDuplicates: true })
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })
  return Response.json({ ok: true, processed: rows.length })
}
