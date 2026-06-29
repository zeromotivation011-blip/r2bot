'use client';

import { useEffect, useState } from 'react';

type ConnectionLike = { saveData?: boolean };
type NavigatorWithConnection = Navigator & { connection?: ConnectionLike };

export function LowDataMode() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const conn = (navigator as NavigatorWithConnection).connection;
    if (conn?.saveData) {
      setActive(true);
      document.documentElement.dataset.lowData = '1';
    }
  }, []);

  if (!active) return null;
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        bottom: 12,
        left: 12,
        zIndex: 50,
        padding: '6px 12px',
        background: 'rgba(11,37,64,.85)',
        border: '1px solid var(--border)',
        borderRadius: 999,
        color: 'var(--muted)',
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 11,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
      }}
    >
      Low data mode active
    </div>
  );
}
