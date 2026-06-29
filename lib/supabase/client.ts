// Supabase client for use inside React Client Components.
// Reads the public anon key from env — never the service role key.
// Use this in any component with 'use client'.
//
// flowType: 'implicit' puts auth tokens in the URL fragment after the magic-link
// click, so cross-browser sign-in works (e.g. user starts on desktop Chrome but
// Gmail opens the link on their phone). PKCE — the @supabase/ssr default —
// would fail there because the code_verifier lives in the original tab's
// localStorage and isn't available to the tab that consumes the link.

import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: 'implicit' } },
  );
}
