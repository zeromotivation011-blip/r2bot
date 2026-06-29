'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'r2bot_onboarded';
const BACKGROUND_KEY = 'r2bot_background';

type Background = 'beginner' | 'cs' | 'mech' | 'hobbyist';

const OPTIONS: { key: Background; title: string; desc: string }[] = [
  { key: 'beginner', title: 'Complete Beginner', desc: "I've never written a line of code or touched a robot" },
  { key: 'cs', title: 'CS Student / Developer', desc: "I can code but don't know robotics" },
  { key: 'mech', title: 'Mechanical / EE Engineer', desc: 'I know hardware but not software' },
  { key: 'hobbyist', title: 'Robotics Hobbyist', desc: "I've played with Arduino/Raspberry Pi" },
];

const RECOMMENDATION: Record<
  Background,
  { label: string; href: string; reason: string; track: string }
> = {
  beginner: {
    label: 'Start with Spark ⚡',
    href: '/academy/spark',
    reason: 'Spark builds robotics intuition before any code — perfect for absolute beginners.',
    track: 'Spark',
  },
  cs: {
    label: 'Jump to Wire 🔌',
    href: '/academy/wire',
    reason: 'Your coding skills are exactly what ROS2 needs. Wire skips the basics.',
    track: 'Wire',
  },
  mech: {
    label: 'Start with Spark ⚡',
    href: '/academy/spark',
    reason: 'Learn the software side first — your hardware knowledge is already a superpower.',
    track: 'Spark',
  },
  hobbyist: {
    label: 'Take the diagnostic 🎯',
    href: '/diagnostic',
    reason: "You might already be Wire or even Forge level. Let's place you accurately.",
    track: 'Diagnostic',
  },
};

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [bg, setBg] = useState<Background | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // small delay so the page paints first
        const t = setTimeout(() => setOpen(true), 800);
        return () => clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
      if (bg) localStorage.setItem(BACKGROUND_KEY, bg);
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;

  const rec = bg ? RECOMMENDATION[bg] : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to R2BOT"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={dismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 560,
          background: '#0a0f1e',
          border: '1px solid var(--cyan)',
          borderRadius: 16,
          padding: 'clamp(20px, 3vw, 32px)',
          boxShadow: '0 30px 80px rgba(0,184,212,.25)',
          position: 'relative',
        }}
      >
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(255,255,255,.06)',
            border: '1px solid var(--border-2)',
            color: '#C8D0DC',
            cursor: 'pointer',
            fontSize: 14,
            fontFamily: 'inherit',
          }}
        >
          ✕
        </button>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 999,
                background: n <= step ? 'var(--cyan)' : 'rgba(255,255,255,.08)',
                transition: 'background .2s',
              }}
            />
          ))}
        </div>

        {step === 1 && (
          <>
            <h2 style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: 28, color: 'var(--mist)', margin: '0 0 8px' }}>
              Welcome to R2BOT 🤖
            </h2>
            <p style={{ fontSize: 17, color: 'var(--cyan-bright)', margin: '0 0 16px' }}>
              India's Robotics Platform
            </p>
            <p style={{ fontSize: 15, color: '#C8D0DC', lineHeight: 1.55, margin: '0 0 24px' }}>
              We'll help you find your level and give you a personalised learning path. Takes 2 minutes.
            </p>
            <button
              onClick={() => setStep(2)}
              style={{
                padding: '12px 22px',
                borderRadius: 10,
                border: '1px solid var(--cyan)',
                background: 'rgba(0,184,212,.22)',
                color: 'var(--cyan-bright)',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Let's Start →
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: 24, color: 'var(--mist)', margin: '0 0 18px' }}>
              What's your background?
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {OPTIONS.map((o) => (
                <button
                  key={o.key}
                  onClick={() => setBg(o.key)}
                  style={{
                    textAlign: 'left',
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: `1px solid ${bg === o.key ? 'var(--cyan)' : 'var(--border-2)'}`,
                    background: bg === o.key ? 'rgba(0,184,212,.15)' : 'rgba(11,37,64,.4)',
                    color: 'var(--mist)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'border-color .15s, background .15s',
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{o.title}</div>
                  <div style={{ fontSize: 13, color: '#94A3B8' }}>{o.desc}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => bg && setStep(3)}
              disabled={!bg}
              style={{
                padding: '12px 22px',
                borderRadius: 10,
                border: '1px solid var(--cyan)',
                background: bg ? 'rgba(0,184,212,.22)' : 'rgba(0,184,212,.05)',
                color: 'var(--cyan-bright)',
                fontSize: 15,
                fontWeight: 600,
                cursor: bg ? 'pointer' : 'not-allowed',
                opacity: bg ? 1 : 0.5,
                fontFamily: 'inherit',
              }}
            >
              Next →
            </button>
          </>
        )}

        {step === 3 && rec && (
          <>
            <div style={{ fontSize: 12, color: 'var(--cyan)', letterSpacing: '.2em', fontFamily: 'var(--font-mono), monospace', marginBottom: 10 }}>
              YOUR RECOMMENDED START
            </div>
            <h2 style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: 28, color: 'var(--mist)', margin: '0 0 12px', lineHeight: 1.2 }}>
              {rec.label}
            </h2>
            <p style={{ fontSize: 15, color: '#C8D0DC', lineHeight: 1.55, margin: '0 0 22px' }}>
              {rec.reason}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <a
                href={rec.href}
                onClick={dismiss}
                style={{
                  padding: '12px 22px',
                  borderRadius: 10,
                  border: '1px solid var(--cyan)',
                  background: 'rgba(0,184,212,.22)',
                  color: 'var(--cyan-bright)',
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Start {rec.track} →
              </a>
              <a
                href="/diagnostic"
                onClick={dismiss}
                style={{
                  padding: '12px 18px',
                  borderRadius: 10,
                  border: '1px solid var(--border-2)',
                  background: 'rgba(11,37,64,.5)',
                  color: '#C8D0DC',
                  fontSize: 14,
                  textDecoration: 'none',
                }}
              >
                Take the diagnostic instead →
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
