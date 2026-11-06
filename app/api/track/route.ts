// POST /api/track — count one page view (aggregate only; no cookies, IPs or user ids).
import type { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|monitor|curl|wget/i
const OK_PATH = /^\/[A-Za-z0-9\-_/.]{0,180}$/

export async function POST(req: NextRequest) {
  if (BOT.test(req.headers.get('user-agent') ?? '')) return new Response(null, { status: 204 })
  let path = ''
  try { path = String((await req.json())?.path ?? '') } catch { return new Response(null, { status: 400 }) }
  path = path.split('?')[0].split('#')[0]
  if (path.length > 1) path = path.replace(/\/+$/, '')
  if (!OK_PATH.test(path) || path.startsWith('/admin') || path.startsWith('/api') || path.startsWith('/_next')) {
    return new Response(null, { status: 204 })
  }
  try { await createSupabaseAdminClient().rpc('increment_page_view', { p_path: path }) } catch { /* never break the page */ }
  return new Response(null, { status: 204 })
}
