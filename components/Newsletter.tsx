'use client';

import { useState } from 'react';

export function Newsletter() {
  const [status, setStatus] = useState<'idle' | 'ok'>('idle');
  return (
    <section>
      <div className="container">
        <div className="newsletter">
          <h2 className="display">Get one Pulse per week.</h2>
          <p>
            The most important thing that happened in robotics — explained in 3 paragraphs.
            No spam. No data sold. Unsubscribe in one click.
          </p>
          <form
            className="newsletter-form"
            onSubmit={(e) => {
              e.preventDefault();
              setStatus('ok');
            }}
          >
            <input type="email" placeholder="you@email.com" required aria-label="Your email" />
            <button type="submit">{status === 'ok' ? '✓ Subscribed' : 'Subscribe'}</button>
          </form>
          {status === 'ok' && (
            <p style={{ marginTop: 18, color: 'var(--green)', fontSize: 14 }}>
              Thanks! You&apos;ll get the first Pulse on the next Monday.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
