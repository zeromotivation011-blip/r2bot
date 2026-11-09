// lib/rate-limit.ts
//
// Shared fixed-window rate limiter for public endpoints.
//
// The counter lives in Postgres (`rate_limits`, migration 0052) and is bumped
// with one RPC, `rate_limit_hit`, so every Vercel instance sees the same count.
// Before that migration runs — or if the database is unreachable — it falls
// back to a per-instance in-memory Map, which is what the site had before. The
// fallback is a speed bump, not a guarantee, but it means nothing breaks.
//
// Keys are hashed before they leave the process, so the table never holds a raw
// IP address or email.

import { createHash } from 'node:crypto'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

export interface RateLimitRule {
  /** Namespace, e.g. 'leads:ip'. Keeps different endpoints from sharing a bucket. */
  scope: string
  /** The thing being limited: an IP, an email, an item id. Hashed before storage. */
  subject: string
  windowSeconds: number
  max: number
}

/** Stable, non-reversible key for the database. */
export function rateLimitKey(scope: string, subject: string): string {
  const digest = createHash('sha256').update(subject.trim().toLowerCase()).digest('hex').slice(0, 32)
  return `${scope}:${digest}`
}

// ── In-memory fallback ───────────────────────────────────────────────────────
const memory = new Map<string, { start: number; count: number }>()

function memoryHit(key: string, windowSeconds: number, max: number): boolean {
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const cur = memory.get(key)
  if (!cur || now - cur.start >= windowMs) {
    memory.set(key, { start: now, count: 1 })
  } else {
    cur.count += 1
  }
  if (memory.size > 10_000) {
    for (const [k, v] of memory) if (now - v.start >= windowMs) memory.delete(k)
  }
  return (memory.get(key)?.count ?? 0) > max
}

// Once the RPC is known to be missing, skip the round trip for the rest of
// this instance's life. Re-checked on the next cold start, so applying the
// migration takes effect without a redeploy.
let rpcMissing = false

function isMissingFunction(code: string | undefined, message: string | undefined): boolean {
  if (code === '42883' || code === 'PGRST202') return true
  const m = message ?? ''
  return /rate_limit_hit/.test(m) && /not (exist|found)/i.test(m)
}

/**
 * Record one hit and report whether the caller is now over the limit.
 * Returns true when the request should be refused.
 */
export async function isRateLimited(rule: RateLimitRule): Promise<boolean> {
  const key = rateLimitKey(rule.scope, rule.subject)
  if (rpcMissing || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return memoryHit(key, rule.windowSeconds, rule.max)
  }
  try {
    const { data, error } = await createSupabaseAdminClient().rpc('rate_limit_hit', {
      p_key: key,
      p_window_seconds: rule.windowSeconds,
      p_max: rule.max,
    })
    if (error) {
      if (isMissingFunction(error.code, error.message)) rpcMissing = true
      return memoryHit(key, rule.windowSeconds, rule.max)
    }
    return data === true
  } catch {
    return memoryHit(key, rule.windowSeconds, rule.max)
  }
}

/** Run several rules; limited if any one of them is. All hits are recorded. */
export async function anyRateLimited(rules: RateLimitRule[]): Promise<boolean> {
  const results = await Promise.all(rules.map((r) => isRateLimited(r)))
  return results.some(Boolean)
}

/** Best-effort client IP. Never stored raw — see rateLimitKey. */
export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for')
  return (fwd ? fwd.split(',')[0] : null)?.trim() || headers.get('x-real-ip') || 'unknown'
}
