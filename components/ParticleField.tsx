'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Constellation backdrop — HOMEPAGE ONLY.
 *
 * This is mounted in ~40 route files, so it used to drift behind Atlas entries
 * and Academy lessons while people were trying to read them. Decoration behind
 * body text costs comprehension and makes a reference site look like a landing
 * page. It is gated here rather than unmounted in forty files.
 *
 * Honors prefers-reduced-motion and Save-Data.
 */
export function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();
  const enabled = pathname === '/';

  useEffect(() => {
    if (!enabled) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Skip the animation under Save-Data — the canvas is decorative.
    type ConnectionLike = { saveData?: boolean };
    const saveData = (navigator as Navigator & { connection?: ConnectionLike }).connection?.saveData;
    if (saveData) {
      canvas.style.display = 'none';
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    let w = 0, h = 0;
    let particles: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    let frame = 0;

    const COUNT = 32;   // was 60 — quieter backdrop

    const resize = () => {
      w = window.innerWidth * dpr;
      h = window.innerHeight * dpr;
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
    };
    const init = () => {
      particles = [];
      for (let i = 0; i < COUNT; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.18 * dpr,
          vy: (Math.random() - 0.5) * 0.18 * dpr,
          r: (Math.random() * 1.2 + 0.4) * dpr,
        });
      }
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,.22)';   // neutral, not brand cyan
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,255,255,.05)';
      ctx.lineWidth = dpr * 0.5;
      const max = 18000 * dpr * dpr;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = dx * dx + dy * dy;
          if (d < max) {
            ctx.globalAlpha = 1 - d / max;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      if (!reduce) frame = requestAnimationFrame(draw);
    };

    resize(); init(); draw();
    const onResize = () => { resize(); init(); };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frame);
    };
  }, [enabled]);

  if (!enabled) return null;

  return <canvas id="particles" ref={ref} aria-hidden="true" />;
}
