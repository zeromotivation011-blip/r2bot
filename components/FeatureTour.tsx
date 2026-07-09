'use client';

// First-visit guided tour. Shows once (localStorage flag), then never again.
// A centered, dismissible stepper that walks a new visitor through R2BOT's core
// surfaces so they immediately understand what the platform offers.

import { useEffect, useState } from 'react';

const FLAG = 'r2bot_tour_v1';

type Step = {
  icon: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  accent: string;
};

const STEPS: Step[] = [
  {
    icon: '📚',
    title: 'Atlas — the robotics knowledge base',
    body: 'Clear, beginner-to-advanced explanations of every robotics concept — from what a servo is to how SLAM and transformers work. Better than the top search result, and free forever to read.',
    href: '/atlas',
    cta: 'Explore the Atlas',
    accent: '#f59e0b',
  },
  {
    icon: '🤖',
    title: 'R2 Co-pilot — your AI mentor',
    body: 'An AI tutor grounded in the Atlas that answers any robotics question, at your level, with sources. Press ⌘K anywhere on the site to ask.',
    href: '/copilot',
    cta: 'Meet R2 Co-pilot',
    accent: '#38bdf8',
  },
  {
    icon: '🎓',
    title: 'Academy — zero to job-ready',
    body: 'Structured tracks: Spark (beginner) → Wire → Forge → Edge (research). Hands-on lessons with progress tracking. Start free with Spark.',
    href: '/academy',
    cta: 'Start learning',
    accent: '#a78bfa',
  },
  {
    icon: '🛠️',
    title: 'Build — projects & simulators',
    body: 'Guided robot builds with full parts lists and code, plus interactive simulators and a ROS2 playground — learn by actually doing, right in the browser.',
    href: '/build',
    cta: 'Start building',
    accent: '#34d399',
  },
  {
    icon: '🌐',
    title: 'Explore — news, videos & more',
    body: 'Stay current with automated robotics news, the best explainer videos in Lens, and robots in daily life. Fresh every day.',
    href: '/news',
    cta: 'See what’s new',
    accent: '#fb7185',
  },
];

export function FeatureTour() {
  const [show, setShow] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(FLAG)) {
        // Small delay so the page paints first — the tour feels like a welcome, not a wall.
        const t = setTimeout(() => setShow(true), 900);
        return () => clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(FLAG, '1');
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
      if (e.key === 'ArrowRight' && i < STEPS.length - 1) setI((n) => n + 1);
      if (e.key === 'ArrowLeft' && i > 0) setI((n) => n - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [show, i]);

  if (!show) return null;

  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to R2BOT"
      onClick={dismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'rgba(2,6,23,0.78)',
        backdropFilter: 'blur(6px)',
        animation: 'r2TourFade 260ms ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 460,
          background: 'linear-gradient(180deg, #0f172a 0%, #0b1220 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 20,
          padding: '30px 28px 24px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          animation: 'r2TourPop 320ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close tour"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 30,
            height: 30,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 8,
            color: '#94a3b8',
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          ×
        </button>

        {i === 0 && (
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, color: '#f59e0b', textTransform: 'uppercase', marginBottom: 10 }}>
            Welcome to R2BOT
          </div>
        )}

        <div
          style={{
            width: 58,
            height: 58,
            display: 'grid',
            placeItems: 'center',
            fontSize: 30,
            borderRadius: 16,
            background: `${step.accent}22`,
            border: `1px solid ${step.accent}55`,
            marginBottom: 16,
          }}
          aria-hidden
        >
          {step.icon}
        </div>

        <h2 style={{ margin: '0 0 10px', fontSize: 21, fontWeight: 800, color: '#fff', lineHeight: 1.25 }}>
          {step.title}
        </h2>
        <p style={{ margin: '0 0 22px', fontSize: 15, lineHeight: 1.6, color: '#cbd5e1' }}>
          {step.body}
        </p>

        <a
          href={step.href}
          onClick={dismiss}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 16px',
            background: step.accent,
            color: '#0b1220',
            fontWeight: 700,
            fontSize: 14,
            borderRadius: 999,
            textDecoration: 'none',
            marginBottom: 24,
          }}
        >
          {step.cta} <span aria-hidden>→</span>
        </a>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          {STEPS.map((s, n) => (
            <button
              key={s.title}
              type="button"
              aria-label={`Go to step ${n + 1}`}
              onClick={() => setI(n)}
              style={{
                height: 6,
                flex: 1,
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                background: n <= i ? step.accent : 'rgba(255,255,255,0.14)',
                transition: 'background 0.25s',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={dismiss}
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 13.5, cursor: 'pointer', fontWeight: 500 }}
          >
            Skip tour
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {i > 0 && (
              <button
                type="button"
                onClick={() => setI((n) => n - 1)}
                style={{
                  padding: '8px 14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 999,
                  color: '#e2e8f0',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? dismiss() : setI((n) => n + 1))}
              style={{
                padding: '8px 18px',
                background: '#f59e0b',
                border: 'none',
                borderRadius: 999,
                color: '#1a0f00',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {last ? 'Get started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
