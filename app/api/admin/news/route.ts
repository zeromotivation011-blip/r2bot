// app/api/admin/news/route.ts
// Admin-only: curate news (pin / hide / rewrite summary). RLS also enforces admin.

import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SB = Awaited<ReturnType<typeof createSupabaseServerClient>>

async function requireAdmin(supabase: SB): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return (data?.role as string | undefined) === 'admin'
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  if (!(await requireAdmin(supabase))) {
    return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const url = String(b.url ?? '').trim()
  if (!url) return Response.json({ ok: false, error: 'url required' }, { status: 400 })

  const patch: Record<string, unknown> = { url, updated_at: new Date().toISOString() }
  if (typeof b.pinned === 'boolean') patch.pinned = b.pinned
  if (typeof b.hidden === 'boolean') patch.hidden = b.hidden
  if (typeof b.curated_summary === 'string') patch.curated_summary = b.curated_summary
  if (typeof b.title === 'string' && b.title) patch.title = b.title

  const { error } = await supabase.from('news').upsert(patch, { onConflict: 'url' })
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
