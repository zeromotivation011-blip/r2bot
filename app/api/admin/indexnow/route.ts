// app/api/admin/indexnow/route.ts
//
// Announce the sitemap to IndexNow on demand, without waiting for Thursday's
// cron. Use it after a batch of new pages goes up — a deploy with 28 new Quick
// Lessons should not wait up to a week to be discovered.
//
// POST /api/admin/indexnow                 → submit every sitemap URL
// POST /api/admin/indexnow { urls: [...] } → submit just those URLs
//
// Admin-gated the same way as every other admin route. Also accepts the cron
// secret as a bearer token, so it can be curled without a browser session.

import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { submitSitemap, submitUrls } from '@/lib/indexnow'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

type SB = Awaited<ReturnType<typeof createSupabaseServerClient>>

async function isAdmin(supabase: SB): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return (data?.role as string | undefined) === 'admin'
}

function hasCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return (req.headers.get('authorization') ?? '') === `Bearer ${secret}`
}

export async function POST(req: NextRequest) {
  if (!hasCronSecret(req)) {
    const supabase = await createSupabaseServerClient()
    if (!(await isAdmin(supabase))) {
      return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = (await req.json().catch(() => ({}))) as { urls?: unknown }
  const urls = Array.isArray(body.urls) ? body.urls.filter((u): u is string => typeof u === 'string') : null

  const result = urls && urls.length > 0 ? await submitUrls(urls) : await submitSitemap()
  return Response.json(result, { status: result.ok ? 200 : 502 })
}
