// app/api/news/subscribe/route.ts
//
// Kept only so that any cached page still submitting here keeps working. It is
// now the same code path as /api/leads: event log, person record, send list and
// an immediate welcome email. Before this change it inserted a row and sent
// nothing, which silently cost us the first 48 hours with every new subscriber.
//
// New forms should POST to /api/leads with an explicit `source`.

import type { NextRequest } from 'next/server'
import { captureLead, clientIpFrom } from '@/lib/lead-capture'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      email?: string
      page?: string
      source?: string
      honeypot?: string
    }
    const result = await captureLead({
      email: body.email,
      page: body.page,
      source: body.source || 'news',
      honeypot: body.honeypot,
      userAgent: req.headers.get('user-agent'),
      cookie: req.headers.get('cookie'),
      ip: clientIpFrom(req.headers),
    })
    return Response.json(
      result.ok ? { ok: true, pending: result.pendingConfirmation === true } : { ok: false, error: result.error },
      { status: result.status },
    )
  } catch {
    return Response.json(
      { ok: false, error: 'Could not subscribe, please try again.' },
      { status: 500 },
    )
  }
}
