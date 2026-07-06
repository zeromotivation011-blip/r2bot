// app/api/admin/atlas/route.ts
// Admin-only: fetch a single Atlas entry (for editing) and create/update entries
// in the atlas_entries table. RLS also enforces admin, this is defense-in-depth.

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

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  if (!(await requireAdmin(supabase))) {
    return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }
  const url = new URL(req.url)
  const type = url.searchParams.get('type') ?? ''
  const slug = url.searchParams.get('slug') ?? ''
  const { data, error } = await supabase
    .from('atlas_entries')
    .select('id, type, slug, title, summary, category, status, body, data')
    .eq('type', type)
    .eq('slug', slug)
    .maybeSingle()
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })
  return Response.json({ ok: true, entry: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  if (!(await requireAdmin(supabase))) {
    return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>

  const type = String(b.type ?? '').trim()
  const slug = String(b.slug ?? '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const title = String(b.title ?? '').trim()
  if (!type || !slug || !title) {
    return Response.json({ ok: false, error: 'type, slug and title are required.' }, { status: 400 })
  }

  const summary = String(b.summary ?? '')
  const category = b.category ? String(b.category) : null
  const status = b.status === 'draft' ? 'draft' : 'published'
  const body = String(b.body ?? '')
  // Preserve any existing rich frontmatter the client loaded; keep core fields in sync.
  const baseData = (b.data && typeof b.data === 'object') ? (b.data as Record<string, unknown>) : {}
  const data = { ...baseData, title, summary, ...(category ? { category } : {}) }

  const { error } = await supabase
    .from('atlas_entries')
    .upsert({ type, slug, title, summary, category, status, body, data, origin: 'cms' }, { onConflict: 'type,slug' })

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
