'use client';

import { useEffect } from 'react';

/**
 * Hover tooltips on every /atlas/* link in a target container.
 * Looks up the summary for each link via a passed slug→summary map.
 */
export function AtlasLinkTooltips({
  targetSelector,
  summaries,
}: {
  targetSelector: string;
  summaries: Record<string, string>;
}) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const container = document.querySelector<HTMLElement>(targetSelector);
    if (!container) return;

    const tooltip = document.createElement('div');
    tooltip.setAttribute('role', 'tooltip');
    tooltip.style.cssText = `
      position: fixed;
      max-width: 320px;
      padding: 12px 14px;
      border-radius: 10px;
      background: rgba(11,37,64,.96);
      border: 1px solid var(--border-2);
      color: var(--mist);
      font-size: 13px;
      line-height: 1.5;
      box-shadow: 0 10px 24px rgba(0,0,0,.45);
      pointer-events: none;
      opacity: 0;
      transition: opacity .15s;
      z-index: 60;
    `;
    document.body.appendChild(tooltip);

    const cleanups: Array<() => void> = [];

    const links = container.querySelectorAll<HTMLAnchorElement>('a[href^="/atlas/"]');
    links.forEach((a) => {
      const m = a.getAttribute('href')?.match(/\/atlas\/[^/]+\/([^/?#]+)/);
      const slug = m?.[1];
      if (!slug) return;
      const summary = summaries[slug];
      if (!summary) return;

      const onEnter = () => {
        tooltip.textContent = summary.slice(0, 200) + (summary.length > 200 ? '…' : '');
        const rect = a.getBoundingClientRect();
        const top = rect.top - 8 - tooltip.offsetHeight;
        const left = Math.max(8, Math.min(window.innerWidth - 332, rect.left));
        tooltip.style.top = `${Math.max(8, top)}px`;
        tooltip.style.left = `${left}px`;
        tooltip.style.opacity = '1';
      };
      const onLeave = () => {
        tooltip.style.opacity = '0';
      };
      a.addEventListener('mouseenter', onEnter);
      a.addEventListener('mouseleave', onLeave);
      a.addEventListener('focus', onEnter);
      a.addEventListener('blur', onLeave);
      cleanups.push(() => {
        a.removeEventListener('mouseenter', onEnter);
        a.removeEventListener('mouseleave', onLeave);
        a.removeEventListener('focus', onEnter);
        a.removeEventListener('blur', onLeave);
      });
    });

    return () => {
      cleanups.forEach((c) => c());
      tooltip.remove();
    };
  }, [targetSelector, summaries]);

  return null;
}
