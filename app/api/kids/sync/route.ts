// app/api/kids/sync/route.ts
//
// A joined child's browser sends a compact progress snapshot (counters only,
// see parseSnapshot in lib/kids/classroom.ts). The member token proves which
// row to update; the answer carries the class name so the browser can show
// "Class: 7B ✓", or `removed: true` when the teacher has removed the child (the
// browser then forgets the membership). It also carries `lockedBand` when the
// teacher has set this child's band (roadmap #29); the device then switches.
//
// Also used with no snapshot to check that a membership is still valid.

import type { NextRequest } from 'next/server'
import { anyRateLimited, clientIp } from '@/lib/rate-limit'
import { SNAPSHOT_MAX_BYTES, SNAPSHOT_MAX_BYTES_V2, fitSnapshot, isBandId, parseSnapshot, snapshotBytes, type JoinedClassInfo } from '@/lib/kids/classroom'
import {
  adminOrNull,
  hashToken,
  isMissingTable,
  isTokenShape,
  jsonError,
  loadMemberBandLock,
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
  const raw = await readJsonCapped(req, SNAPSHOT_MAX_BYTES_V2 + 4096)
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
  let parsed: ReturnType<typeof parseSnapshot> = null
  if (body.snapshot !== undefined) {
    parsed = parseSnapshot(body.snapshot)
    if (!parsed) return jsonError(400, 'Malformed snapshot.')
    // Migration 0056 raises the column's limit to 16 KB; until it runs the
    // CHECK (8 KB) refuses a bigger row and we retry with the 0054 limit.
    const snap = fitSnapshot(parsed, SNAPSHOT_MAX_BYTES_V2)
    if (snapshotBytes(snap) > SNAPSHOT_MAX_BYTES_V2) return jsonError(413, 'Snapshot too large.')
    update.snapshot = snap
  }
  let { error: upErr } = await admin.from('kids_class_members').update(update).eq('id', member.id)
  if (upErr && upErr.code === '23514' && parsed) {
    const small = fitSnapshot(parsed, SNAPSHOT_MAX_BYTES)
    if (snapshotBytes(small) > SNAPSHOT_MAX_BYTES) return jsonError(413, 'Snapshot too large.')
    ;({ error: upErr } = await admin.from('kids_class_members').update({ ...update, snapshot: small }).eq('id', member.id))
  }
  if (upErr) return jsonError(500, 'Sync failed.')

  const info: JoinedClassInfo = {
    className: cls.class_name,
    teacherName: cls.teacher_name,
    band: isBandId(cls.band) ? cls.band : 'builders',
    nickname: member.nickname,
    // Roadmap #29 (migration 0058): null before it runs, so children keep their own band.
    lockedBand: await loadMemberBandLock(admin, member.id),
  }
  return Response.json({ ok: true, class: info }, { headers: { 'Cache-Control': 'no-store' } })
}
