'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/analytics'
import { OAUTH_PROVIDERS, enabledOAuthProviders, type OAuthProviderId } from './oauth-providers'
import { ProviderIcon } from './ProviderIcon'

/**
 * The one sign-in surface. Used by the header modal, /login and /signup.
 *
 * There were two, offering different things: the header modal had email +
 * password + Google and no magic link, while /login and /signup had a magic
 * link and nothing else. Which options a person saw depended on where they
 * happened to click, and neither place offered all of them.
 *
 * Order is deliberate. The magic link is first and is the default because it
 * is the only one with nothing to forget and works in every country; social
 * sign-ins come second, one tap for the people who use them — and only the
 * providers actually enabled in Supabase are shown (see oauth-providers.ts);
 * the password form is last, behind a disclosure, because asking someone to
 * invent a password for a free reading site is the highest-friction option.
 */
type Mode = 'signin' | 'signup'

export function AuthPanel({
  mode = 'signin',
  onDone,
  next = '/dashboard',
}: {
  mode?: Mode
  onDone?: () => void
  next?: string
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState<null | 'link' | 'password' | OAuthProviderId>(null)
  const [providers, setProviders] = useState<OAuthProviderId[]>([])

  useEffect(() => {
    let alive = true
    void enabledOAuthProviders().then((list) => { if (alive) setProviders(list) })
    return () => { alive = false }
  }, [])
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const reset = () => { setError(null) }
  const origin = () => (typeof window !== 'undefined' ? window.location.origin : '')

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    reset()
    const trimmed = email.trim()
    if (!trimmed) return
    setBusy('link')
    try {
      const supabase = createSupabaseBrowserClient()
      const { error: err } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${origin()}/auth/callback?next=${encodeURIComponent(next)}`,
          shouldCreateUser: true,
        },
      })
      if (err) { setError(err.message); return }
      trackEvent(mode === 'signup' ? 'sign_up' : 'login', { method: 'magic_link' })
      setSent(true)
    } finally { setBusy(null) }
  }

  const withProvider = async (provider: OAuthProviderId) => {
    reset()
    setBusy(provider)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${origin()}/auth/callback?next=${encodeURIComponent(next)}` },
      })
      if (err) {
        setError(/not enabled/i.test(err.message)
          ? 'That sign-in method is not available right now. Use the email link above instead.'
          : err.message)
        setBusy(null)
      }
    } catch { setBusy(null) }
  }

  const withPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    reset()
    setBusy('password')
    try {
      const supabase = createSupabaseBrowserClient()
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (err) { setError(err.message); return }
      trackEvent('login', { method: 'password' })
      onDone?.()
      router.refresh()
    } finally { setBusy(null) }
  }

  const forgot = async () => {
    reset()
    if (!email.trim()) { setError('Enter your email above first.'); return }
    setBusy('password')
    try {
      const supabase = createSupabaseBrowserClient()
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin()}/auth/callback?next=/profile/settings`,
      })
      if (err) { setError(err.message); return }
      setError(null)
      setSent(true)
    } finally { setBusy(null) }
  }

  if (sent) {
    return (
      <div className="auth-panel">
        <h3 className="r2-h3">Check your email</h3>
        <p className="r2-body" style={{ marginTop: '0.5rem' }}>
          We sent a sign-in link to <strong>{email.trim()}</strong>. It works once and expires in an
          hour. You can open it on any device.
        </p>
        <button type="button" className="r2-link" style={{ marginTop: '1.25rem' }} onClick={() => { setSent(false); reset() }}>
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <div className="auth-panel">
      <form onSubmit={sendMagicLink} className="auth-panel__form">
        <label className="auth-panel__label" htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          type="email"
          required
          value={email}
          autoComplete="email"
          placeholder="you@example.com"
          onChange={(e) => setEmail(e.target.value)}
          className="auth-panel__input"
        />
        <button type="submit" className="r2-btn r2-btn--primary auth-panel__wide" disabled={busy !== null}>
          {busy === 'link' ? 'Sending…' : 'Email me a sign-in link'}
        </button>
        <p className="r2-meta">No password to remember. The link works on any device.</p>
      </form>

      {providers.length > 0 && (
        <>
          <div className="auth-panel__or"><span>or</span></div>
          {OAUTH_PROVIDERS.filter((p) => providers.includes(p.id)).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => withProvider(p.id)}
              className="r2-btn r2-btn--ghost auth-panel__wide"
              disabled={busy !== null}
            >
              <ProviderIcon id={p.id} />
              {busy === p.id ? 'Opening…' : p.label}
            </button>
          ))}
        </>
      )}

      {!showPassword ? (
        <button type="button" className="auth-panel__more" onClick={() => setShowPassword(true)}>
          Use a password instead
        </button>
      ) : (
        <form onSubmit={withPassword} className="auth-panel__form auth-panel__form--pw">
          <label className="auth-panel__label" htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            required
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            className="auth-panel__input"
          />
          <button type="submit" className="r2-btn r2-btn--ghost auth-panel__wide" disabled={busy !== null}>
            {busy === 'password' ? 'Signing in…' : 'Sign in with password'}
          </button>
          <button type="button" className="auth-panel__more" onClick={forgot}>
            Forgot your password?
          </button>
        </form>
      )}

      {error && <p className="auth-panel__error" role="alert">{error}</p>}
    </div>
  )
}
