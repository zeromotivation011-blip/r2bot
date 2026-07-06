// app/api/admin/lens/import/route.ts — Admin-only: seed lens_entries from MDX files.

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAllLens } from '@/lib/lens'

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

  const videos = getAllLens()
  if (videos.length === 0) return Response.json({ ok: false, error: 'No MDX videos found.' }, { status: 500 })

  const rows = videos.map((v) => {
    const { body, ...frontmatter } = v
    return {
      slug: v.slug,
      title: v.title,
      summary: v.summary ?? '',
      topic: v.topic ?? null,
      youtube_id: v.youtubeId ?? null,
      published_at: v.publishedAt,
      status: 'published',
      data: frontmatter as Record<string, unknown>,
      body: body ?? '',
      origin: 'mdx',
    }
  })

  const { error } = await supabase.from('lens_entries').upsert(rows, { onConflict: 'slug', ignoreDuplicates: true })
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })
  return Response.json({ ok: true, processed: rows.length })
}
