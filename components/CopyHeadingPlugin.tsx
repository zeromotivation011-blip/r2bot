'use client';

import { useEffect } from 'react';

/**
 * Attaches copy-link buttons to every <h2>/<h3> inside a target container.
 * Headings get an id (slugified from text). Hovering shows a small # button;
 * clicking it copies the deep-linked URL and flashes "Copied!".
 */
export function CopyHeadingPlugin({ targetSelector }: { targetSelector: string }) {
  useEffect(() => {
    const container = document.querySelector<HTMLElement>(targetSelector);
    if (!container) return;

    const slugify = (t: string) =>
      t
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 80);

    const headings = container.querySelectorAll<HTMLElement>('h2, h3');
    const cleanups: Array<() => void> = [];

    headings.forEach((h) => {
      if (!h.id) h.id = slugify(h.textContent ?? '');
      const id = h.id;
      if (!id) return;

      // Wrap heading so the button can be positioned relative
      h.style.position = 'relative';
      h.style.scrollMarginTop = '110px';

      const btn = document.createElement('button');
      btn.setAttribute('aria-label', `Copy link to ${h.textContent ?? ''}`);
      btn.textContent = '#';
      btn.style.cssText = `
        position: absolute;
        left: -28px;
        top: 50%;
        transform: translateY(-50%);
        background: transparent;
        border: none;
        color: var(--muted);
        font-family: var(--font-mono), monospace;
        font-size: 16px;
        cursor: pointer;
        opacity: 0;
        transition: opacity .15s, color .15s;
        padding: 0 4px;
      `;

      const onEnter = () => (btn.style.opacity = '0.7');
      const onLeave = () => {
        btn.style.opacity = '0';
        btn.textContent = '#';
        btn.style.color = 'var(--muted)';
      };
      const onClick = async (e: MouseEvent) => {
        e.preventDefault();
        const url = `${window.location.origin}${window.location.pathname}#${id}`;
        try {
          await navigator.clipboard.writeText(url);
          btn.textContent = 'Copied!';
          btn.style.color = 'var(--cyan-bright)';
          btn.style.opacity = '1';
          setTimeout(() => {
            btn.textContent = '#';
            btn.style.color = 'var(--muted)';
            btn.style.opacity = '0.7';
          }, 1500);
        } catch {
          /* clipboard blocked */
        }
      };

      h.addEventListener('mouseenter', onEnter);
      h.addEventListener('mouseleave', onLeave);
      btn.addEventListener('click', onClick);
      h.appendChild(btn);

      cleanups.push(() => {
        h.removeEventListener('mouseenter', onEnter);
        h.removeEventListener('mouseleave', onLeave);
        btn.removeEventListener('click', onClick);
        btn.remove();
      });
    });

    return () => {
      cleanups.forEach((c) => c());
    };
  }, [targetSelector]);

  return null;
}
