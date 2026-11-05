// lib/free-courses.ts — Free course allowlist, safe to import from client or server.
// Kept separate from lib/subscription.ts because that file is server-only
// (depends on next/headers via the Supabase server client).

export const FREE_COURSES: readonly string[] = ['spark-foundations']

// Everything on R2BOT is free for now, so every course counts as free.
export function isFreeCourse(_slug: string): boolean {
  return true
}
