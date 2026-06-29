'use client';

import { useEffect, useRef } from 'react';

/**
 * The R2BOT mark — a single glyph that reads as 2, 0, and ∞.
 * Cross-fades between the three readings on a 2.4s cadence.
 * Respects prefers-reduced-motion.
 */
export function MorphingLogo({ size = 280 }: { size?: number }) {
  const a2 = useRef<SVGGElement>(null);
  const a0 = useRef<SVGGElement>(null);
  const aInf = useRef<SVGGElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    let phase = 0;
    let timer: number;
    const tick = () => {
      const p = phase % 3;
      if (a2.current) a2.current.style.opacity = p === 0 ? '1' : '0';
      if (a0.current) a0.current.style.opacity = p === 1 ? '1' : '0';
      if (aInf.current) aInf.current.style.opacity = p === 2 ? '1' : '0';
      phase++;
      timer = window.setTimeout(tick, 2400);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 280 280"
      aria-label="R2BOT logo: the 2 reads as 0 and as infinity"
    >
      <defs>
        <linearGradient id="cyanGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00E5FF" />
          <stop offset="1" stopColor="#00B8D4" />
        </linearGradient>
        <linearGradient id="purpleGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A56BFF" />
          <stop offset="1" stopColor="#00E5FF" />
        </linearGradient>
        <filter id="logoGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g transform="translate(140,140)" filter="url(#logoGlow)">
        <g
          ref={a2}
          className="anim-2"
          stroke="url(#cyanGrad)"
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'opacity .8s cubic-bezier(.22,.61,.36,1)' }}
        >
          <ellipse cx="0" cy="-35" rx="55" ry="48" />
          <path d="M -50 0 Q 0 50 50 -5 Q 60 70 0 75 L -55 90" />
          <line x1="-55" y1="90" x2="55" y2="90" />
        </g>
        <g
          ref={a0}
          className="anim-0"
          stroke="url(#cyanGrad)"
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
          opacity="0"
          style={{ transition: 'opacity .8s cubic-bezier(.22,.61,.36,1)' }}
        >
          <ellipse cx="0" cy="0" rx="65" ry="78" />
        </g>
        <g
          ref={aInf}
          className="anim-inf"
          stroke="url(#purpleGrad)"
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
          opacity="0"
          style={{ transition: 'opacity .8s cubic-bezier(.22,.61,.36,1)' }}
        >
          <path d="M -65 0 C -65 -40 -20 -40 0 0 C 20 40 65 40 65 0 C 65 -40 20 -40 0 0 C -20 40 -65 40 -65 0 Z" />
        </g>
      </g>
    </svg>
  );
}

/** Small static logo for nav/footer */
export function MiniLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true">
      <defs>
        <linearGradient id="navGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00E5FF" />
          <stop offset="1" stopColor="#00B8D4" />
        </linearGradient>
      </defs>
      <g transform="translate(8,6)" fill="none" stroke="url(#navGrad)" strokeWidth="5" strokeLinecap="round">
        <ellipse cx="22" cy="16" rx="16" ry="14" />
        <path d="M 6 24 Q 22 38 38 26 Q 42 42 22 42 L 6 48" />
        <line x1="6" y1="48" x2="38" y2="48" />
      </g>
    </svg>
  );
}
