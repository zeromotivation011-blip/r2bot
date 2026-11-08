'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/analytics'

/**
 * The one sign-in surface. Used by the header modal, /login and /signup.
 *
 * There were two, offering different things: the header modal had email +
 * password + Google and no magic link, while /login and /signup had a magic
 * link and nothing else. Which options a person saw depended on where they
 * happened to click, and neither place offered all of them.
 *
 * Order is deliberate. The magic link is first and is the default because it
 * is the only one with nothing to forget; Google is second because it is one
 * tap for the people who use it; the password form is last, behind a
 * disclosure, because asking someone to invent a password for a free reading
 * site is the highest-friction option and should not be the first thing they
 * see.
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
  const [busy, setBusy] = useState<null | 'link' | 'google' | 'password'>(null)
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

  const withGoogle = async () => {
    reset()
    setBusy('google')
    try {
      const supabase = createSupabaseBrowserClient()
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${origin()}/auth/callback?next=${encodeURIComponent(next)}` },
      })
      if (err) { setError(err.message); setBusy(null) }
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

      <div className="auth-panel__or"><span>or</span></div>

      <button type="button" onClick={withGoogle} className="r2-btn r2-btn--ghost auth-panel__wide" disabled={busy !== null}>
        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.0 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.0 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C39.3 36.6 44 31 44 24c0-1.3-.1-2.6-.4-3.9z"/>
        </svg>
        Continue with Google
      </button>

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
