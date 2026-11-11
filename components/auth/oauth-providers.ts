// components/auth/oauth-providers.ts
//
// Which social sign-ins to show. Read from Supabase's public settings endpoint
// at runtime, so a provider switched on in the dashboard appears on the site
// without a deploy — and, more importantly, a provider that is NOT enabled is
// never shown. On 11 Nov 2026 the panel had a "Continue with Google" button
// while the Google provider had never been configured in Supabase, so every
// click ended in "Unsupported provider: provider is not enabled".
import type { Provider } from '@supabase/supabase-js'

export type OAuthProviderId = Extract<Provider, 'google' | 'github' | 'azure' | 'apple'>

export const OAUTH_PROVIDERS: { id: OAuthProviderId; label: string; settingsKey: string }[] = [
  { id: 'google', label: 'Continue with Google', settingsKey: 'google' },
  { id: 'github', label: 'Continue with GitHub', settingsKey: 'github' },
  { id: 'azure', label: 'Continue with Microsoft', settingsKey: 'azure' },
  { id: 'apple', label: 'Continue with Apple', settingsKey: 'apple' },
]

let cached: Promise<OAuthProviderId[]> | null = null

/** Providers enabled in Supabase Auth right now. Cached per page load; [] on any failure. */
export function enabledOAuthProviders(): Promise<OAuthProviderId[]> {
  if (cached) return cached
  cached = (async () => {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !key) return []
      const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, cache: 'no-store' })
      if (!res.ok) return []
      const json = (await res.json()) as { external?: Record<string, boolean> }
      const ext = json.external ?? {}
      return OAUTH_PROVIDERS.filter((p) => ext[p.settingsKey] === true).map((p) => p.id)
    } catch {
      return []
    }
  })()
  return cached
}
