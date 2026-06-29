'use client';

import { useEffect, useState } from 'react';
import { useCopilot } from './CopilotProvider';

export function CopilotBubble() {
  const { open, openDrawer, closeDrawer } = useCopilot();
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const update = () => setMobile(window.matchMedia('(max-width: 720px)').matches);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <button
      onClick={open ? closeDrawer : openDrawer}
      aria-label={open ? 'Close R2 Co-pilot' : 'Ask R2 Co-pilot'}
      style={{
        position: 'fixed',
        right: mobile ? 16 : 22,
        bottom: mobile ? 16 : 22,
        zIndex: 75,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: mobile ? 14 : '12px 18px 12px 14px',
        borderRadius: 999,
        background: 'linear-gradient(135deg, #00B8D4, #00E5FF)',
        color: '#001318',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 10px 30px rgba(0, 229, 255, 0.4)',
        fontWeight: 600,
        fontSize: 14.5,
        fontFamily: 'inherit',
        transition: 'transform .2s, box-shadow .2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px) scale(1.03)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
      }}
    >
      {open ? (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#001318" strokeWidth="2.4" strokeLinecap="round">
          <path d="M6 6 L18 18 M18 6 L6 18" />
        </svg>
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#001318" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2 L13.5 8.5 L20 10 L13.5 11.5 L12 18 L10.5 11.5 L4 10 L10.5 8.5 Z" />
          <circle cx="19" cy="5" r="1.4" fill="#001318" />
          <circle cx="5" cy="19" r="1.4" fill="#001318" />
        </svg>
      )}
      {!mobile && <span>{open ? 'Close' : 'Ask R2'}</span>}
    </button>
  );
}
