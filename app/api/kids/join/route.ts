// app/api/kids/join/route.ts
//
// A child joins a class with a 6-character code and a nickname. Nothing else is
// collected — no email, no password, no birthday (COPPA / GDPR-K). The answer
// carries a random member token; the browser keeps it and it is the child's
// identity for this class only. We store its SHA-256, never the token.
//
// Brute-force guard: every attempt counts against per-IP limits (120 an hour,
// 30 a minute). With 31^6 ≈ 887 million codes and 1,000 live classes, one IP
// expects ~7,400 hours (about ten months) of guessing to land on any class —
// and landing on one reveals only its name and adds a nickname to the roster,
// which the teacher sees and can remove. A school sharing one IP (several
// classes of ~30 joining at once, with typos) fits inside the budget.

import type { NextRequest } from 'next/server'
import { anyRateLimited, clientIp } from '@/lib/rate-limit'
import {
  MAX_MEMBERS_PER_CLASS,
  checkNickname,
  isBandId,
  isValidJoinCode,
  normaliseJoinCode,
  type JoinedClassInfo,
} from '@/lib/kids/classroom'
import {
  adminOrNull,
  hashToken,
  isMissingTable,
  jsonError,
  newMemberToken,
  notReadyResponse,
  readJsonCapped,
} from '@/lib/kids/classroom-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface JoinBody {
  code?: unknown
  nickname?: unknown
  /** Honeypot — a person leaves it empty. */
  website?: unknown
}

export async function POST(req: NextRequest): Promise<Response> {
  const ip = clientIp(req.headers)
  if (await anyRateLimited([
    { scope: 'kids-join:ip', subject: ip, windowSeconds: 3600, max: 120 },
    { scope: 'kids-join:burst', subject: ip, windowSeconds: 60, max: 30 },
  ])) {
    return jsonError(429, 'Too many tries. Wait a minute and ask your teacher to check the code.')
  }

  const raw = await readJsonCapped(req, 1024)
  if (!raw || typeof raw !== 'object') return jsonError(400, 'Something went wrong. Try again.')
  const body = raw as JoinBody
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    // Bots learn nothing.
    return jsonError(404, 'We could not find that class code. Check it with your teacher.')
  }

  const code = normaliseJoinCode(typeof body.code === 'string' ? body.code : '')
  if (!isValidJoinCode(code)) {
    return jsonError(400, 'A class code has 6 letters and numbers, like ABC 234.')
  }
  const nick = checkNickname(typeof body.nickname === 'string' ? body.nickname : '')
  if (!nick.ok) return jsonError(400, nick.error)

  const admin = adminOrNull()
  if (!admin) return notReadyResponse()

  const { data: cls, error: clsErr } = await admin
    .from('kids_classes')
    .select('id, class_name, teacher_name, band')
    .eq('join_code', code)
    .maybeSingle()
  if (clsErr) return isMissingTable(clsErr) ? notReadyResponse() : jsonError(500, 'Something went wrong. Try again.')

  if (!cls) {
    return jsonError(404, 'We could not find that class code. Check it with your teacher.')
  }
  const row = cls as { id: string; class_name: string; teacher_name: string | null; band: string }

  const { count } = await admin
    .from('kids_class_members')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', row.id)
  if ((count ?? 0) >= MAX_MEMBERS_PER_CLASS) {
    return jsonError(409, 'This class is full. Ask your teacher for help.')
  }

  const token = newMemberToken()
  const { error: insErr } = await admin.from('kids_class_members').insert({
    class_id: row.id,
    nickname: nick.nickname,
    token_hash: hashToken(token),
  })
  if (insErr) {
    if (isMissingTable(insErr)) return notReadyResponse()
    if (insErr.code === '23505') {
      return jsonError(409, `Someone in this class is already called “${nick.nickname}”. Add a letter, like “${nick.nickname} B”.`)
    }
    return jsonError(500, 'Something went wrong. Try again.')
  }

  const info: JoinedClassInfo = {
    className: row.class_name,
    teacherName: row.teacher_name,
    band: isBandId(row.band) ? row.band : 'builders',
    nickname: nick.nickname,
  }
  return Response.json({ ok: true, token, class: info }, { headers: { 'Cache-Control': 'no-store' } })
}
