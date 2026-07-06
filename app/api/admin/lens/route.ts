// app/api/admin/lens/route.ts — Admin-only: fetch one + create/update Lens entries.

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
  if (!(await requireAdmin(supabase))) return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  const slug = new URL(req.url).searchParams.get('slug') ?? ''
  const { data, error } = await supabase
    .from('lens_entries')
    .select('slug, title, summary, topic, youtube_id, published_at, status, body, data')
    .eq('slug', slug)
    .maybeSingle()
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })
  return Response.json({ ok: true, entry: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  if (!(await requireAdmin(supabase))) return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>

  const slug = String(b.slug ?? '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const title = String(b.title ?? '').trim()
  if (!slug || !title) return Response.json({ ok: false, error: 'slug and title are required.' }, { status: 400 })

  const summary = String(b.summary ?? '')
  const topic = b.topic ? String(b.topic) : null
  const youtubeId = b.youtubeId ? String(b.youtubeId) : (b.youtube_id ? String(b.youtube_id) : null)
  const publishedAt = String(b.publishedAt ?? b.published_at ?? new Date().toISOString().slice(0, 10)).slice(0, 10)
  const status = b.status === 'draft' ? 'draft' : 'published'
  const body = String(b.body ?? '')
  const baseData = (b.data && typeof b.data === 'object') ? (b.data as Record<string, unknown>) : {}
  const data = { ...baseData, title, summary, topic, youtubeId, publishedAt }

  const { error } = await supabase.from('lens_entries').upsert(
    { slug, title, summary, topic, youtube_id: youtubeId, published_at: publishedAt, status, body, data, origin: 'cms' },
    { onConflict: 'slug' },
  )
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
