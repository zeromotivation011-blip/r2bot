// Supabase client for use inside Server Components, Route Handlers, and Server Actions.
// Reads cookies from the incoming request so the user's session is preserved.
// Never use this in a Client Component — it relies on next/headers.

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // See lib/supabase/client.ts for why this is 'implicit' instead of the default 'pkce'.
      auth: { flowType: 'implicit' },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // In a Server Component the cookie store is read-only and this will throw.
          // That's fine — the middleware refreshes the session on every request.
          try {
            cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* server component — cookies set by middleware */
          }
        },
      },
    },
  );
}

// Service-role client for admin tasks (seed scripts, server-side webhooks).
// Bypasses Row-Level Security — NEVER expose to the browser.
import { createClient } from '@supabase/supabase-js';

export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
