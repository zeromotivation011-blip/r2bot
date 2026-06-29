'use client';

import { useEffect, useState } from 'react';

const DISMISS_KEY = 'r2bot_pwa_dismiss';
const VISIT_KEY = 'r2bot_visit_count';
const MIN_VISITS = 3;

export function PWAPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
      const n = Number(localStorage.getItem(VISIT_KEY) ?? '0') + 1;
      localStorage.setItem(VISIT_KEY, String(n));
      if (n >= MIN_VISITS) setShow(true);
    } catch {
      /* localStorage blocked */
    }
  }, []);

  if (!show) return null;
  return (
    <div
      role="region"
      aria-label="Install R2BOT"
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 12,
        zIndex: 60,
        padding: '12px 16px',
        background: 'rgba(11,37,64,.95)',
        border: '1px solid var(--border-2)',
        borderRadius: 12,
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        color: 'var(--mist)',
        fontSize: 14,
        boxShadow: '0 10px 30px rgba(0,0,0,.35)',
      }}
    >
      <span aria-hidden="true" style={{ color: 'var(--cyan)' }}>
        ◴
      </span>
      <span style={{ flex: 1 }}>
        Add R2BOT to your home screen for offline reading →
      </span>
      <button
        onClick={() => {
          try {
            localStorage.setItem(DISMISS_KEY, '1');
          } catch { /* noop */ }
          setShow(false);
        }}
        aria-label="Dismiss"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--muted)',
          cursor: 'pointer',
          fontSize: 18,
          padding: '4px 8px',
          fontFamily: 'inherit',
        }}
      >
        ×
      </button>
    </div>
  );
}
