// lib/supabase/lazy.ts
//
// Load the Supabase browser client only when there is something for it to do.
//
// `@supabase/ssr` + `@supabase/supabase-js` is ~240 KB of JavaScript. Until
// 11 Nov 2026 it was statically imported by the AuthProvider in the root
// layout, the Nav, the Co-pilot drawer and the homepage, so every visitor —
// 99% of whom are signed out and never sign in — parsed and ran it on first
// load. That was a large part of the homepage's 1.2 s total blocking time.
//
// The rule now: nothing imports '@/lib/supabase/client' statically from a
// component that renders on first paint. Use `loadSupabaseBrowser()` inside
// the effect or handler that needs it, and `hasSupabaseSessionCookie()` to
// decide whether an auth bootstrap is worth doing at all.
import type { SupabaseClient } from '@supabase/supabase-js'

/** Dispatched by sign-in UIs after an in-page sign-in so listeners that skipped the bootstrap can start one. */
export const AUTH_CHANGED_EVENT = 'r2bot:auth-changed'

let clientPromise: Promise<SupabaseClient> | null = null

export function loadSupabaseBrowser(): Promise<SupabaseClient> {
  if (!clientPromise) {
    clientPromise = import('./client').then((m) => m.createSupabaseBrowserClient() as unknown as SupabaseClient)
  }
  return clientPromise
}

/** True when a Supabase auth cookie is present — i.e. this browser has (or recently had) a session. */
export function hasSupabaseSessionCookie(): boolean {
  if (typeof document === 'undefined') return false
  return /(?:^|;\s*)sb-[a-z0-9]+-auth-token/.test(document.cookie)
}

export function announceAuthChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}
