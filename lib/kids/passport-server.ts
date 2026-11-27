// lib/kids/passport-server.ts
//
// Server-only helpers for the Robot Passport route (app/api/kids/passport).
// Never import this from a client component: it uses node:crypto and the
// service-role Supabase client (through classroom-server's adminOrNull).
//
// The table (migration 0057) holds only: SHA-256 of the canonical words, the
// backup code (progress + nicknames, never an email or anything personal), a
// counters-only summary and three dates. Until 0057 runs every call answers
// 503 PASSPORT_NOT_READY and the Garage keeps offering the offline backup code.

import { createHash, randomInt } from 'node:crypto'
import type { PostgrestError } from '@supabase/supabase-js'
import { readProgressCode } from '@/lib/kids-progress'
import { PASSPORT_MAX_BACKUP, PASSPORT_NOT_READY, formatPassport, newPassportWords, type PassportSummary } from './passport'

export const PASSPORT_TABLE = 'kids_passports'

/** A passport nobody has opened or updated for this long is deleted (see 0057 and purgeExpired). */
export const PASSPORT_EXPIRY_DAYS = 400

export function newPassportCode(): string {
  return formatPassport(newPassportWords((n) => randomInt(n)))
}

/** SHA-256 hex of the canonical code (parsePassport().code). The words themselves are never stored. */
export function hashPassport(code: string): string {
  return createHash('sha256').update(`r2bot-kids-passport:${code}`).digest('hex')
}

/** True when the error means migration 0057 has not run (table missing). */
export function isPassportTableMissing(err: PostgrestError | null | undefined): boolean {
  if (!err) return false
  if (err.code === '42P01' || err.code === 'PGRST205') return true
  return /kids_passports/.test(err.message ?? '') && /(does not exist|could not find|schema cache)/i.test(err.message ?? '')
}

export function passportNotReady(): Response {
  return Response.json(
    { ok: false, code: PASSPORT_NOT_READY, error: 'The Robot Passport is being switched on. Your backup code still works.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  )
}

export type CheckedBackup = { ok: true; backup: string; summary: PassportSummary } | { ok: false; error: string }

/**
 * Accept only a real, intact R2BOT Kids backup code (the same reader the
 * browser restores with: checksum, caps on every field) and work out its
 * counters. Anything else — free text, someone else's JSON — is refused.
 */
export async function checkBackup(x: unknown): Promise<CheckedBackup> {
  if (typeof x !== 'string') return { ok: false, error: 'Missing backup code.' }
  const backup = x.replace(/\s+/g, '')
  if (!backup || backup.length > PASSPORT_MAX_BACKUP) return { ok: false, error: 'That progress is too big to keep in a Passport. Use the backup code instead.' }
  if (!/^R2K1\.[zj]\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/.test(backup)) return { ok: false, error: 'Malformed backup code.' }
  const read = await readProgressCode(backup)
  if (!read.ok) return { ok: false, error: `Backup code refused (${read.reason}).` }
  const p = read.progress
  const summary: PassportSummary = {
    xp: Math.max(0, Math.floor(Number(p.xp) || 0)),
    badges: p.badges ? Object.keys(p.badges).length : 0,
    sessions: p.sessionsDone ? Object.keys(p.sessionsDone).length : 0,
  }
  return { ok: true, backup, summary }
}

export function cleanSummary(x: unknown): PassportSummary {
  const o = x && typeof x === 'object' ? (x as Record<string, unknown>) : {}
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0)
  return { xp: n(o.xp), badges: n(o.badges), sessions: n(o.sessions) }
}
