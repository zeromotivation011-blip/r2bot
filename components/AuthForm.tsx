'use client';

// Shared magic-link form used by /login and /signup.
// Supabase doesn't actually distinguish the two for OTP magic links — the same
// signInWithOtp call creates a user if they don't exist (when shouldCreateUser is true).
// We just vary the copy and the page title so the UX feels right.

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Mode = 'signin' | 'signup';

export function AuthForm({ mode }: { mode: Mode }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus('sending');
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        // /auth/callback exchanges the code for a session, then redirects to /dashboard.
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        // signup mode allows new account creation; signin still works for existing users either way.
        shouldCreateUser: mode === 'signup' ? true : true,
      },
    });

    if (err) {
      setError(err.message);
      setStatus('error');
      return;
    }
    setStatus('sent');
  }

  if (status === 'sent') {
    return (
      <div
        style={{
          padding: '28px 24px',
          borderRadius: 14,
          border: '1px solid var(--cyan)',
          background: 'rgba(0, 184, 212, 0.06)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 12 }} aria-hidden>📬</div>
        <h2 style={{ margin: '0 0 8px', color: 'var(--mist)', fontSize: 22 }}>Check your inbox</h2>
        <p style={{ color: '#C8D0DC', margin: 0, fontSize: 15, lineHeight: 1.55 }}>
          We sent a sign-in link to <strong style={{ color: 'var(--mist)' }}>{email}</strong>.
          Click it to {mode === 'signup' ? 'create your account' : 'sign in'}. The link expires in 1 hour.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <label htmlFor="email" style={{ fontSize: 13, color: '#C8D0DC', letterSpacing: '0.04em' }}>
        Email address
      </label>
      <input
        id="email"
        type="email"
        required
        autoFocus
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={status === 'sending'}
        style={{
          background: 'rgba(11, 37, 64, 0.5)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '14px 16px',
          color: 'var(--mist)',
          fontSize: 16,
          fontFamily: 'inherit',
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
      />
      <button
        type="submit"
        className="btn btn-primary"
        disabled={status === 'sending' || !email.trim()}
        style={{ justifyContent: 'center', padding: '14px 18px', fontSize: 15, marginTop: 4 }}
      >
        {status === 'sending'
          ? 'Sending link…'
          : mode === 'signup'
            ? 'Send sign-up link'
            : 'Send sign-in link'}
      </button>
      {error && (
        <p style={{ color: '#ff6b6b', fontSize: 14, margin: '4px 0 0' }}>{error}</p>
      )}
      <p style={{ color: '#8893a4', fontSize: 13, margin: '8px 0 0', lineHeight: 1.55 }}>
        No password to remember. We email you a one-time link that signs you in for 30 days.
      </p>
    </form>
  );
}
