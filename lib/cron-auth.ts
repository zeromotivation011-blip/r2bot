// lib/cron-auth.ts
//
// One bearer check for every cron and admin maintenance route. A plain `===`
// on the secret leaks its length and prefix through response timing; this
// compares fixed-length digests instead so a mismatch always costs the same.
import { createHash, timingSafeEqual } from 'node:crypto';

export function isCronAuthorized(authorizationHeader: string | null | undefined): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed when unset
  const presented = (authorizationHeader ?? '').replace(/^Bearer\s+/i, '');
  if (!presented) return false;
  const a = createHash('sha256').update(presented).digest();
  const b = createHash('sha256').update(secret).digest();
  return timingSafeEqual(a, b);
}
