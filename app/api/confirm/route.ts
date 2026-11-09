// GET /api/confirm?token=… — the double opt-in link from the confirmation
// email (lib/lead-capture.ts). Token possession is the authentication, as with
// /api/unsubscribe. Marks the subscriber confirmed, sends the welcome once, and
// lands the person on /confirm with their first one-minute lesson.

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { confirmSubscriber } from '@/lib/lead-capture'
import { clientIp, isRateLimited } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const token = (url.searchParams.get('token') ?? '').trim()
  const go = (state: string) => NextResponse.redirect(new URL(`/confirm?state=${state}`, url.origin), 303)

  if (!token || !/^[A-Za-z0-9-]{8,80}$/.test(token)) return go('unknown')
  // Tokens are UUIDs, so guessing is hopeless anyway; this just keeps a script
  // from hammering the table.
  if (await isRateLimited({ scope: 'confirm:ip', subject: clientIp(req.headers), windowSeconds: 3600, max: 30 })) {
    return go('busy')
  }
  try {
    return go(await confirmSubscriber(token))
  } catch {
    return go('unavailable')
  }
}
