// app/api/kids/missions/route.ts
//
// A joined child's browser asks for its class's "From your teacher" missions
// with the member token (the same token-only identity as /api/kids/sync).
// The answer has no ids and nothing about other children: kind, item, title,
// the teacher's short note, the due date and the link. The browser decides
// "done" from its own local progress.
//
// Before migration 0055 runs this answers 503 (schools-not-ready) and the
// card stays hidden. A removed member gets 404 { removed: true }, as in sync.

import type { NextRequest } from 'next/server'
import { anyRateLimited, clientIp } from '@/lib/rate-limit'
import { MAX_ASSIGNMENTS_PER_CLASS, type ChildMission, type KidsAssignment } from '@/lib/kids/classroom-assignments'
import {
  adminOrNull,
  hashToken,
  isMissingSchoolSchema,
  isMissingTable,
  isTokenShape,
  jsonError,
  notReadyResponse,
  readJsonCapped,
  schoolsNotReadyResponse,
} from '@/lib/kids/classroom-server'
import { ASSIGNMENT_COLUMNS, toAssignment, toChildMission, type AssignmentDbRow } from '@/lib/kids/teach/assignments-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest): Promise<Response> {
  const raw = await readJsonCapped(req, 512)
  if (!raw || typeof raw !== 'object') return jsonError(400, 'Malformed request.')
  const token = (raw as { token?: unknown }).token
  if (!isTokenShape(token)) return jsonError(400, 'Missing member token.')

  const ip = clientIp(req.headers)
  if (await anyRateLimited([
    { scope: 'kids-missions:token', subject: token, windowSeconds: 600, max: 30 },
    { scope: 'kids-missions:ip', subject: ip, windowSeconds: 600, max: 900 },
  ])) {
    return jsonError(429, 'Slow down — your missions will load in a moment.')
  }

  const admin = adminOrNull()
  if (!admin) return notReadyResponse()

  const { data: member, error } = await admin
    .from('kids_class_members')
    .select('id, class_id')
    .eq('token_hash', hashToken(token))
    .maybeSingle()
  if (error) return isMissingTable(error) ? notReadyResponse() : jsonError(500, 'Could not load missions.')
  if (!member) return Response.json({ ok: false, removed: true }, { status: 404 })

  const { data, error: aErr } = await admin
    .from('kids_assignments')
    .select(ASSIGNMENT_COLUMNS)
    .eq('class_id', (member as { class_id: string }).class_id)
    .order('created_at', { ascending: false })
    .limit(MAX_ASSIGNMENTS_PER_CLASS)
  if (aErr) return isMissingSchoolSchema(aErr) ? schoolsNotReadyResponse() : jsonError(500, 'Could not load missions.')

  const missions: ChildMission[] = ((data ?? []) as AssignmentDbRow[])
    .map(toAssignment)
    .filter((a): a is KidsAssignment => !!a)
    .map(toChildMission)
  return Response.json({ ok: true, missions }, { headers: { 'Cache-Control': 'no-store' } })
}
