// lib/kids/passport-client.ts
//
// Browser side of the Robot Passport (roadmap #12): calls to
// /api/kids/passport and the one thing kept on the device — which passport
// this child's progress goes to, so "Update my Passport" writes to the same
// words. Per child (`profileKey`, docs/kids-universe.md → Profiles).
// Every call resolves (never throws); `notReady` means migration 0057 has not
// run yet and the offline backup code is the way to go.

import { profileKey } from './profiles'
import { PASSPORT_NOT_READY, parsePassport, type PassportSummary } from './passport'

const STORE = 'r2bot_kids_passport_v1'

export interface SavedPassport {
  code: string
  /** ISO time of the last successful save from this device. */
  savedAt: string
}

export function loadSavedPassport(): SavedPassport | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(profileKey(STORE))
    if (!raw) return null
    const o: unknown = JSON.parse(raw)
    if (!o || typeof o !== 'object') return null
    const r = o as Record<string, unknown>
    const p = parsePassport(r.code)
    if (!p.ok) return null
    return { code: p.code, savedAt: typeof r.savedAt === 'string' ? r.savedAt.slice(0, 40) : '' }
  } catch {
    return null
  }
}

export function rememberPassport(p: SavedPassport | null): void {
  if (typeof window === 'undefined') return
  try {
    if (p) window.localStorage.setItem(profileKey(STORE), JSON.stringify(p))
    else window.localStorage.removeItem(profileKey(STORE))
  } catch {
    /* storage full or blocked: the words on the card still work */
  }
}

export type PassportCall<T> =
  | ({ ok: true } & T)
  | { ok: false; notReady?: boolean; notFound?: boolean; rate?: boolean; offline?: boolean; error: string }

async function call<T>(body: Record<string, unknown>): Promise<PassportCall<T>> {
  let res: Response
  try {
    res = await fetch('/api/kids/passport', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
  } catch {
    return { ok: false, offline: true, error: 'No internet right now. The backup code below works without it.' }
  }
  let data: Record<string, unknown> = {}
  try {
    data = (await res.json()) as Record<string, unknown>
  } catch {
    /* empty body */
  }
  const error = typeof data.error === 'string' ? data.error : 'Something went wrong. Try again in a moment.'
  if (res.status === 503 || data.code === PASSPORT_NOT_READY) {
    return { ok: false, notReady: true, error: 'The Robot Passport is being switched on. Use a backup code below for now.' }
  }
  if (!res.ok || data.ok !== true) return { ok: false, notFound: res.status === 404, rate: res.status === 429, error }
  return { ok: true, ...(data as T) }
}

export function createPassport(backup: string): Promise<PassportCall<{ code: string; savedAt: string; summary: PassportSummary }>> {
  return call({ action: 'create', backup })
}

export function savePassport(code: string, backup: string): Promise<PassportCall<{ savedAt: string; summary: PassportSummary }>> {
  return call({ action: 'save', code, backup })
}

export function openPassport(code: string): Promise<PassportCall<{ backup: string; summary: PassportSummary; savedAt: string }>> {
  return call({ action: 'restore', code })
}

export function deletePassport(code: string): Promise<PassportCall<{ deleted: boolean }>> {
  return call({ action: 'delete', code })
}
