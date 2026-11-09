'use client';

import { useState } from 'react';

export function Newsletter() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [email, setEmail] = useState('');
  const [trap, setTrap] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus('sending');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'newsletter',
          page: typeof window !== 'undefined' ? window.location.pathname : null,
          honeypot: trap,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; pending?: boolean };
      setPending(data.pending === true);
      if (!res.ok || !data.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setStatus('err');
        return;
      }
      try {
        ;(window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.(
          'event', 'lead_capture', { method: 'newsletter' },
        );
      } catch { /* ignore */ }
      setStatus('ok');
    } catch {
      setError('Network error. Please try again.');
      setStatus('err');
    }
  }

  return (
    <section>
      <div className="container">
        <div className="newsletter">
          <h2 className="display">Get one Pulse per week.</h2>
          <p>
            The most important thing that happened in robotics — explained in 3 paragraphs.
            No spam. No data sold. Unsubscribe in one click.
          </p>
          <form className="newsletter-form" onSubmit={handleSubmit}>
            <input
              type="text" tabIndex={-1} autoComplete="off" aria-hidden name="company"
              value={trap} onChange={(e) => setTrap(e.target.value)}
              className="absolute -left-[9999px] h-px w-px opacity-0"
            />
            <input
              type="email"
              placeholder="you@email.com"
              required
              aria-label="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'sending' || status === 'ok'}
            />
            <button type="submit" disabled={status === 'sending' || status === 'ok'}>
              {status === 'ok' ? '✓ Subscribed' : status === 'sending' ? 'Subscribing…' : 'Subscribe'}
            </button>
          </form>
          {status === 'ok' && (
            <p style={{ marginTop: 18, color: 'var(--green)', fontSize: 14 }}>
              {pending ? 'Almost there — check your inbox and click the confirmation link.' : 'Thanks! You\u2019ll get the next Pulse in your inbox.'}
            </p>
          )}
          {status === 'err' && error && (
            <p role="alert" style={{ marginTop: 18, color: '#f87171', fontSize: 14 }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
