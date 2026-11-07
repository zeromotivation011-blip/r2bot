// app/api/leads/route.ts
//
// The capture endpoint for every email on the site. All of the logic lives in
// lib/lead-capture.ts so that this route and /api/news/subscribe behave
// identically — there is no longer a second, quieter way to subscribe.

import type { NextRequest } from 'next/server'
import { captureLead, clientIpFrom } from '@/lib/lead-capture'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Payload = {
  email?: string
  name?: string
  page?: string
  source?: string
  meta?: Record<string, unknown>
  honeypot?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Payload
    const result = await captureLead({
      email: body.email,
      name: body.name,
      page: body.page,
      source: body.source,
      meta: body.meta,
      honeypot: body.honeypot,
      userAgent: req.headers.get('user-agent'),
      cookie: req.headers.get('cookie'),
      ip: clientIpFrom(req.headers),
    })
    return Response.json(
      result.ok ? { ok: true } : { ok: false, error: result.error },
      { status: result.status },
    )
  } catch (e: unknown) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
