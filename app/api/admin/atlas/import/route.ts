// app/api/admin/atlas/import/route.ts
// Admin-only: one-time seed of the atlas_entries table from the bundled MDX
// files (content/atlas is available at runtime). Runs server-side using the
// admin's session, so no local env / terminal is needed. Idempotent: existing
// rows are left untouched (won't clobber Content-Manager edits).

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAllAtlasEntries } from '@/lib/atlas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ ok: false, error: 'Not signed in' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if ((profile?.role as string | undefined) !== 'admin') {
    return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  const entries = getAllAtlasEntries()
  if (entries.length === 0) {
    return Response.json({ ok: false, error: 'No MDX entries found on the server.' }, { status: 500 })
  }

  const rows = entries.map((e) => {
    const { body, ...frontmatter } = e
    return {
      type: e.type,
      slug: e.slug,
      title: e.title,
      summary: e.summary ?? '',
      category: e.category ?? null,
      status: 'published',
      data: frontmatter as Record<string, unknown>,
      body: body ?? '',
      origin: 'mdx',
    }
  })

  let inserted = 0
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200)
    // ignoreDuplicates: don't overwrite entries already edited in the CMS.
    const { error } = await supabase
      .from('atlas_entries')
      .upsert(batch, { onConflict: 'type,slug', ignoreDuplicates: true })
    if (error) return Response.json({ ok: false, error: error.message, inserted }, { status: 500 })
    inserted += batch.length
  }

  return Response.json({ ok: true, found: entries.length, processed: inserted })
}
