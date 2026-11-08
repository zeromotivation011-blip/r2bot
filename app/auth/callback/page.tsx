import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthCallbackClient } from './AuthCallbackClient'

/**
 * Where a magic link lands.
 *
 * This route did not exist. components/AuthForm.tsx has always sent
 * emailRedirectTo=`${origin}/auth/callback?next=/dashboard`, so every single
 * magic-link sign-in — the only sign-in offered on /login and /signup —
 * finished on the 404 page. The session was created (supabase-js reads the
 * URL fragment on load, which is why the header showed the signed-in avatar),
 * so it looked like a broken site rather than a broken login, which is worse.
 *
 * It is a client page, not a Route Handler, because lib/supabase/client.ts
 * uses the implicit flow: the tokens arrive in the URL *fragment*, and a
 * fragment is never sent to the server. A route handler here would see an
 * empty query string and could only guess.
 */
export const metadata: Metadata = {
  title: 'Signing you in',
  robots: { index: false, follow: false },
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackClient />
    </Suspense>
  )
}
