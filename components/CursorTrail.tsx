'use client';

import { useEffect } from 'react';

/** Smooth cyan dot trail following the cursor. Mouse-only, motion-respecting. */
export function CursorTrail() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || 'ontouchstart' in window) return;

    const NUM = 8;
    const dots: { el: HTMLDivElement; x: number; y: number }[] = [];
    for (let i = 0; i < NUM; i++) {
      const el = document.createElement('div');
      el.className = 'cursor-dot';
      el.style.opacity = String((1 - i / NUM) * 0.5);
      el.style.transform = `scale(${1 - i * 0.08})`;
      document.body.appendChild(el);
      dots.push({ el, x: 0, y: 0 });
    }
    let mx = -100, my = -100;
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    window.addEventListener('mousemove', onMove);

    let frame: number;
    const loop = () => {
      let px = mx, py = my;
      for (const d of dots) {
        d.x += (px - d.x) * 0.35;
        d.y += (py - d.y) * 0.35;
        d.el.style.left = d.x - 3 + 'px';
        d.el.style.top = d.y - 3 + 'px';
        px = d.x; py = d.y;
      }
      frame = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(frame);
      dots.forEach(d => d.el.remove());
    };
  }, []);

  return null;
}
