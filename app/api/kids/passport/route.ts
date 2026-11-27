// app/api/kids/passport/route.ts
//
// Robot Passport (roadmap #12). One POST endpoint, four actions:
//   create  {backup}         → a fresh random code (three words + a number); the
//                              backup is stored under SHA-256 of the code
//   save    {code, backup}   → update an existing passport (never creates one at
//                              a code the caller picked)
//   restore {code}           → the stored backup code + a counters-only summary
//   delete  {code}           → removes it (parent hub / Garage "Delete my Passport")
//
// No personal data: the body is a backup code that readProgressCode accepts
// (progress, nicknames), nothing else is read or stored, the IP is only used,
// hashed, as a rate-limit key. The words never reach the database. Until
// migration 0057 runs every action answers 503 `passport_not_ready` and the
// browser keeps offering the offline backup code.

import type { NextRequest } from 'next/server'
import { anyRateLimited, clientIp } from '@/lib/rate-limit'
import { adminOrNull, jsonError, readJsonCapped } from '@/lib/kids/classroom-server'
import { PASSPORT_MAX_BACKUP, PASSPORT_PARSE_MESSAGES, parsePassport } from '@/lib/kids/passport'
import {
  PASSPORT_EXPIRY_DAYS,
  PASSPORT_TABLE,
  checkBackup,
  cleanSummary,
  hashPassport,
  isPassportTableMissing,
  newPassportCode,
  passportNotReady,
} from '@/lib/kids/passport-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }
const HOUR = 3600

interface Body {
  action?: unknown
  code?: unknown
  backup?: unknown
}

function ok(data: Record<string, unknown>): Response {
  return Response.json({ ok: true, ...data }, { headers: NO_STORE })
}

export async function POST(req: NextRequest): Promise<Response> {
  const raw = await readJsonCapped(req, PASSPORT_MAX_BACKUP + 2048)
  if (!raw || typeof raw !== 'object') return jsonError(413, 'Request too large or malformed.')
  const body = raw as Body
  const action = body.action
  if (action !== 'create' && action !== 'save' && action !== 'restore' && action !== 'delete') return jsonError(400, 'Unknown action.')
  const ip = clientIp(req.headers)

  // Words, when the action needs them. Parsed before any lookup or rate-limit bucket keyed on them.
  let codeHash: string | null = null
  if (action !== 'create') {
    const p = parsePassport(body.code)
    if (!p.ok) return Response.json({ ok: false, error: PASSPORT_PARSE_MESSAGES[p.reason], reason: p.reason }, { status: 400, headers: NO_STORE })
    codeHash = hashPassport(p.code)
  }

  // Guessing someone's words is the attack to slow down: restore is tight per address and per day.
  const limits =
    action === 'create'
      ? [{ scope: 'kids-passport:create:ip', subject: ip, windowSeconds: HOUR, max: 8 }]
      : action === 'restore'
        ? [
            { scope: 'kids-passport:restore:ip', subject: ip, windowSeconds: 600, max: 15 },
            { scope: 'kids-passport:restore:ip-day', subject: ip, windowSeconds: 24 * HOUR, max: 60 },
            { scope: 'kids-passport:restore:code', subject: codeHash ?? '', windowSeconds: HOUR, max: 30 },
          ]
        : action === 'save'
          ? [
              { scope: 'kids-passport:save:ip', subject: ip, windowSeconds: HOUR, max: 60 },
              { scope: 'kids-passport:save:code', subject: codeHash ?? '', windowSeconds: HOUR, max: 20 },
            ]
          : [{ scope: 'kids-passport:delete:ip', subject: ip, windowSeconds: HOUR, max: 15 }]
  if (await anyRateLimited(limits)) {
    return Response.json({ ok: false, error: 'Too many tries. Wait a little while, then try again.', reason: 'rate' }, { status: 429, headers: NO_STORE })
  }

  const admin = adminOrNull()
  if (!admin) return passportNotReady()
  const now = new Date().toISOString()

  if (action === 'restore' || action === 'delete') {
    if (action === 'delete') {
      const { data, error } = await admin.from(PASSPORT_TABLE).delete().eq('code_hash', codeHash).select('code_hash')
      if (error) return isPassportTableMissing(error) ? passportNotReady() : jsonError(500, 'Could not delete the Passport.')
      return ok({ deleted: Array.isArray(data) && data.length > 0 })
    }
    const { data, error } = await admin.from(PASSPORT_TABLE).select('backup, summary, updated_at').eq('code_hash', codeHash).maybeSingle()
    if (error) return isPassportTableMissing(error) ? passportNotReady() : jsonError(500, 'Could not open the Passport.')
    if (!data) {
      return Response.json(
        { ok: false, reason: 'not-found', error: 'No Passport has those words. Check each word and the number on the card.' },
        { status: 404, headers: NO_STORE },
      )
    }
    const row = data as { backup: string; summary: unknown; updated_at: string }
    // Opening a passport keeps it alive (expiry counts from the last use). Best effort.
    await admin.from(PASSPORT_TABLE).update({ last_used_at: now }).eq('code_hash', codeHash)
    return ok({ backup: row.backup, summary: cleanSummary(row.summary), savedAt: row.updated_at })
  }

  const checked = await checkBackup(body.backup)
  if (!checked.ok) return jsonError(400, checked.error)

  if (action === 'save') {
    const { data, error } = await admin
      .from(PASSPORT_TABLE)
      .update({ backup: checked.backup, summary: checked.summary, updated_at: now, last_used_at: now })
      .eq('code_hash', codeHash)
      .select('code_hash')
    if (error) return isPassportTableMissing(error) ? passportNotReady() : jsonError(500, 'Could not save the Passport.')
    if (!Array.isArray(data) || data.length === 0) {
      return Response.json(
        { ok: false, reason: 'not-found', error: 'That Passport was deleted or has expired. Make a new one.' },
        { status: 404, headers: NO_STORE },
      )
    }
    return ok({ savedAt: now, summary: checked.summary })
  }

  // create: a fresh random code; retry on the (very unlikely) clash with an existing one.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newPassportCode()
    const { error } = await admin.from(PASSPORT_TABLE).insert({
      code_hash: hashPassport(code),
      backup: checked.backup,
      summary: checked.summary,
      created_at: now,
      updated_at: now,
      last_used_at: now,
    })
    if (!error) {
      // Housekeeping, best effort: passports nobody has used for PASSPORT_EXPIRY_DAYS go.
      const cutoff = new Date(Date.now() - PASSPORT_EXPIRY_DAYS * 86_400_000).toISOString()
      await admin.from(PASSPORT_TABLE).delete().lt('last_used_at', cutoff)
      return ok({ code, savedAt: now, summary: checked.summary })
    }
    if (isPassportTableMissing(error)) return passportNotReady()
    if (error.code !== '23505') return jsonError(500, 'Could not make a Passport.')
  }
  return jsonError(500, 'Could not make a Passport. Try again.')
}
