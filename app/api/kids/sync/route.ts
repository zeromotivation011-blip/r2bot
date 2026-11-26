// app/api/kids/sync/route.ts
//
// A joined child's browser sends a compact progress snapshot (counters only,
// see parseSnapshot in lib/kids/classroom.ts). The member token proves which
// row to update; the answer carries the class name so the browser can show
// "Class: 7B ✓", or `removed: true` when the teacher has removed the child (the
// browser then forgets the membership).
//
// Also used with no snapshot to check that a membership is still valid.

import type { NextRequest } from 'next/server'
import { anyRateLimited, clientIp } from '@/lib/rate-limit'
import { SNAPSHOT_MAX_BYTES, fitSnapshot, isBandId, parseSnapshot, snapshotBytes, type JoinedClassInfo } from '@/lib/kids/classroom'
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

interface SyncBody {
  token?: unknown
  snapshot?: unknown
}

interface MemberWithClass {
  id: string
  nickname: string
  kids_classes: { class_name: string; teacher_name: string | null; band: string } | null
}

export async function POST(req: NextRequest): Promise<Response> {
  // The request may carry more than fits (lists are trimmed below), never more than twice the column.
  const raw = await readJsonCapped(req, SNAPSHOT_MAX_BYTES * 2 + 256)
  if (!raw || typeof raw !== 'object') return jsonError(413, 'Snapshot too large or malformed.')
  const body = raw as SyncBody
  if (!isTokenShape(body.token)) return jsonError(400, 'Missing member token.')

  const ip = clientIp(req.headers)
  if (await anyRateLimited([
    { scope: 'kids-sync:token', subject: body.token, windowSeconds: 600, max: 40 },
    { scope: 'kids-sync:ip', subject: ip, windowSeconds: 600, max: 1200 },
  ])) {
    return jsonError(429, 'Slow down — progress will sync in a moment.')
  }

  const admin = adminOrNull()
  if (!admin) return notReadyResponse()

  const tokenHash = hashToken(body.token)
  const { data, error } = await admin
    .from('kids_class_members')
    .select('id, nickname, kids_classes(class_name, teacher_name, band)')
    .eq('token_hash', tokenHash)
    .maybeSingle()
  if (error) return isMissingTable(error) ? notReadyResponse() : jsonError(500, 'Sync failed.')
  if (!data) return Response.json({ ok: false, removed: true }, { status: 404 })

  const member = data as unknown as MemberWithClass
  const cls = member.kids_classes
  if (!cls) return Response.json({ ok: false, removed: true }, { status: 404 })

  const update: { last_active_at: string; snapshot?: unknown } = { last_active_at: new Date().toISOString() }
  if (body.snapshot !== undefined) {
    const parsed = parseSnapshot(body.snapshot)
    if (!parsed) return jsonError(400, 'Malformed snapshot.')
    const snap = fitSnapshot(parsed)
    if (snapshotBytes(snap) > SNAPSHOT_MAX_BYTES) return jsonError(413, 'Snapshot too large.')
    update.snapshot = snap
  }
  const { error: upErr } = await admin.from('kids_class_members').update(update).eq('id', member.id)
  if (upErr) return jsonError(500, 'Sync failed.')

  const info: JoinedClassInfo = {
    className: cls.class_name,
    teacherName: cls.teacher_name,
    band: isBandId(cls.band) ? cls.band : 'builders',
    nickname: member.nickname,
  }
  return Response.json({ ok: true, class: info }, { headers: { 'Cache-Control': 'no-store' } })
}
