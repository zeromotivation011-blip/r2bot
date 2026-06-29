'use client';

import { useEffect, useState } from 'react';

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setReduced(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;
  return (
    <button
      onClick={() =>
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
      }
      aria-label="Back to top"
      style={{
        position: 'fixed',
        right: 24,
        bottom: 96,
        width: 40,
        height: 40,
        borderRadius: 999,
        background: 'rgba(11,37,64,.75)',
        border: '1px solid var(--border-2)',
        color: 'var(--cyan)',
        cursor: 'pointer',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
        backdropFilter: 'blur(8px)',
        transition: 'all .2s',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--cyan)';
        e.currentTarget.style.color = 'var(--cyan-bright)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-2)';
        e.currentTarget.style.color = 'var(--cyan)';
      }}
    >
      ↑
    </button>
  );
}
