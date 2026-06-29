'use client';

import { useEffect } from 'react';

/**
 * On mount, if a URL hash exists, smooth-scroll to the matching #id.
 * Dispatches a custom event `r2bot:sim-section-visible` so simulator
 * sub-components can auto-start their animation when scrolled into view.
 */
export function HashAutoScroll() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = window.location.hash.replace(/^#/, '');
    if (!id) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.dispatchEvent(new CustomEvent('r2bot:sim-section-visible', { detail: { id } }));
    }, 300);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}
