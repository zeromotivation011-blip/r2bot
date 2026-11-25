// app/api/kids/leave/route.ts
//
// "Leave class": deletes the child's membership row — nickname and progress
// snapshot together. Nothing about the child remains on the server. The token
// is the only proof needed; whoever holds the device can leave.

import type { NextRequest } from 'next/server'
import { clientIp, isRateLimited } from '@/lib/rate-limit'
import {
  adminOrNull,
  hashToken,
  isMissingTable,
  isTokenShape,
  jsonError,
  notReadyResponse,
  readJsonCapped,
} from '@/lib/kids/classroom-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest): Promise<Response> {
  if (await isRateLimited({ scope: 'kids-leave:ip', subject: clientIp(req.headers), windowSeconds: 600, max: 60 })) {
    return jsonError(429, 'Too many requests. Try again in a few minutes.')
  }
  const raw = await readJsonCapped(req, 512)
  const token = raw && typeof raw === 'object' ? (raw as { token?: unknown }).token : undefined
  if (!isTokenShape(token)) return jsonError(400, 'Missing member token.')

  const admin = adminOrNull()
  if (!admin) return notReadyResponse()

  const { error } = await admin.from('kids_class_members').delete().eq('token_hash', hashToken(token))
  if (error) return isMissingTable(error) ? notReadyResponse() : jsonError(500, 'Could not leave the class. Try again.')
  // Deleting a row that is already gone is still "left".
  return Response.json({ ok: true })
}
