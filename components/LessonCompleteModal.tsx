'use client';

import { useEffect, useRef } from 'react';

type Track = 'spark' | 'wire' | 'forge' | 'edge' | string;

const TRACK_TONES: Record<string, { glow: string; accent: string; bg: string; border: string }> = {
  spark: { glow: 'rgba(255,176,32,.45)', accent: '#FFB020', bg: 'rgba(255,176,32,.12)', border: 'rgba(255,176,32,.50)' },
  wire:  { glow: 'rgba(0,184,212,.45)',  accent: '#00B8D4', bg: 'rgba(0,184,212,.12)', border: 'rgba(0,184,212,.50)' },
  forge: { glow: 'rgba(165,107,255,.45)', accent: '#A56BFF', bg: 'rgba(165,107,255,.12)', border: 'rgba(165,107,255,.50)' },
  edge:  { glow: 'rgba(34,197,94,.45)',  accent: '#22C55E', bg: 'rgba(34,197,94,.12)', border: 'rgba(34,197,94,.50)' },
};

const CONFETTI_COUNT = 28;

export function LessonCompleteModal({
  open,
  lessonTitle,
  xp,
  nextHref,
  track,
  shareUrl,
  onClose,
}: {
  open: boolean;
  lessonTitle: string;
  xp?: number;
  nextHref?: string;
  track: Track;
  shareUrl?: string;
  onClose: () => void;
}) {
  const tone = TRACK_TONES[track] ?? TRACK_TONES.spark;
  const primaryRef = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);

  // Esc to close + focus primary CTA on open + lock scroll.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => primaryRef.current?.focus(), 60);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  const onShare = async () => {
    const url = shareUrl ?? (typeof window !== 'undefined' ? window.location.href : '');
    const title = `I just completed "${lessonTitle}" on R2BOT`;
    try {
      if (typeof navigator !== 'undefined' && (navigator as Navigator & { share?: unknown }).share) {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({ title, url });
        return;
      }
    } catch {
      /* user dismissed — fall through to clipboard */
    }
    try {
      await navigator.clipboard.writeText(`${title} — ${url}`);
    } catch {
      /* noop */
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="r2lcm-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(2, 6, 15, 0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: 20,
        animation: 'r2lcm-fade 220ms cubic-bezier(.22,.61,.36,1)',
      }}
    >
      {/* Confetti */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: CONFETTI_COUNT }).map((_, i) => {
          const palette = ['#00E5FF', '#FFB020', '#A56BFF', '#22C55E', '#E8ECF1'];
          const color = palette[i % palette.length];
          const left = (i * 97) % 100;
          const delay = (i % 8) * 90;
          const duration = 1600 + (i % 5) * 220;
          const rotate = (i * 47) % 360;
          return (
            <span
              key={i}
              style={{
                position: 'absolute',
                top: '-12px',
                left: `${left}%`,
                width: 8,
                height: 14,
                background: color,
                borderRadius: 2,
                opacity: 0.92,
                transform: `rotate(${rotate}deg)`,
                animation: `r2lcm-fall ${duration}ms ${delay}ms cubic-bezier(.22,.61,.36,1) forwards`,
              }}
            />
          );
        })}
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          padding: '40px 32px 28px',
          borderRadius: 22,
          background: 'linear-gradient(180deg, #0F1B30 0%, #0A1424 100%)',
          border: `1px solid ${tone.border}`,
          boxShadow: `0 30px 90px rgba(0,0,0,.55), 0 0 80px ${tone.glow}`,
          textAlign: 'center',
          animation: 'r2lcm-pop 320ms cubic-bezier(.22,.61,.36,1)',
        }}
      >
        {/* Close (X) */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: 8,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--muted)',
            background: 'transparent',
            transition: 'background .15s, color .15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,.06)';
            e.currentTarget.style.color = 'var(--mist)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--muted)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M3 3 L13 13 M13 3 L3 13" />
          </svg>
        </button>

        {/* Checkmark badge */}
        <div
          aria-hidden
          style={{
            width: 84,
            height: 84,
            margin: '0 auto 22px',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: tone.bg,
            border: `2px solid ${tone.border}`,
            boxShadow: `0 0 40px ${tone.glow}, inset 0 0 20px rgba(255,255,255,.04)`,
            animation: 'r2lcm-badge 700ms cubic-bezier(.22,.61,.36,1)',
          }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
            <path
              d="M10 20.5 L17 27 L31 13"
              stroke={tone.accent}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 40,
                strokeDashoffset: 40,
                animation: 'r2lcm-check 520ms 180ms cubic-bezier(.22,.61,.36,1) forwards',
              }}
            />
          </svg>
        </div>

        <div
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 11,
            letterSpacing: '.24em',
            color: tone.accent,
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          Lesson complete
        </div>
        <h2
          id="r2lcm-title"
          className="display"
          style={{ margin: 0, fontSize: 26, lineHeight: 1.18, color: 'var(--mist)' }}
        >
          {lessonTitle}
        </h2>

        {typeof xp === 'number' && xp > 0 && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 18,
              padding: '8px 16px',
              borderRadius: 999,
              background: 'rgba(0,184,212,.14)',
              border: '1px solid rgba(0,184,212,.55)',
              color: 'var(--cyan-bright)',
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '.04em',
            }}
          >
            <span aria-hidden>✦</span>+{xp} XP earned
          </div>
        )}

        <p style={{ margin: '18px 0 24px', color: 'var(--muted)', fontSize: 14 }}>
          Nice work. Your progress is saved.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {nextHref ? (
            <a
              ref={primaryRef as React.RefObject<HTMLAnchorElement>}
              href={nextHref}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '13px 20px',
                borderRadius: 12,
                background: tone.accent,
                color: '#001318',
                fontWeight: 700,
                fontSize: 15,
                textDecoration: 'none',
                boxShadow: `0 8px 24px ${tone.glow}`,
                transition: 'transform .15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              Next lesson
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 8 L13 8 M9 4 L13 8 L9 12" />
              </svg>
            </a>
          ) : (
            <a
              ref={primaryRef as React.RefObject<HTMLAnchorElement>}
              href={`/academy/${track}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '13px 20px',
                borderRadius: 12,
                background: tone.accent,
                color: '#001318',
                fontWeight: 700,
                fontSize: 15,
                textDecoration: 'none',
                boxShadow: `0 8px 24px ${tone.glow}`,
              }}
            >
              Back to track
            </a>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              type="button"
              onClick={onShare}
              style={{
                padding: '11px 16px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'rgba(255,255,255,.02)',
                color: 'var(--mist)',
                fontWeight: 600,
                fontSize: 14,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background .15s, border-color .15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,.05)';
                e.currentTarget.style.borderColor = 'var(--border-2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,.02)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="4" cy="8" r="2" /><circle cx="12" cy="3.5" r="2" /><circle cx="12" cy="12.5" r="2" />
                <path d="M5.7 7 L10.3 4.5 M5.7 9 L10.3 11.5" />
              </svg>
              Share
            </button>
            <a
              href={`/academy/${track}`}
              style={{
                padding: '11px 16px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'rgba(255,255,255,.02)',
                color: 'var(--mist)',
                fontWeight: 600,
                fontSize: 14,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                transition: 'background .15s, border-color .15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,.05)';
                e.currentTarget.style.borderColor = 'var(--border-2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,.02)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              Track home
            </a>
          </div>
        </div>

        <div style={{ marginTop: 18, fontSize: 11.5, color: 'var(--muted)', letterSpacing: '.04em' }}>
          Press <kbd style={{ padding: '1px 6px', borderRadius: 4, background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono), monospace', fontSize: 10.5 }}>Esc</kbd> to close
        </div>
      </div>

      <style>{`
        @keyframes r2lcm-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes r2lcm-pop {
          0%   { opacity: 0; transform: translateY(14px) scale(.94); }
          60%  { opacity: 1; transform: translateY(-2px) scale(1.01); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes r2lcm-badge {
          0%   { transform: scale(.4); opacity: 0; }
          55%  { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes r2lcm-check { to { stroke-dashoffset: 0; } }
        @keyframes r2lcm-fall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.9; }
        }
        @media (prefers-reduced-motion: reduce) {
          [aria-modal="true"] *, [aria-modal="true"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
