'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type Challenge,
  LEVEL_ACCENT,
  LEVEL_LABEL,
  todayKeyUTC,
} from '@/lib/challenges';

type PersistedState = {
  revealed: boolean;
  selfScore: 'good' | 'bad' | null;
  attempt: string;
};

const EMPTY: PersistedState = { revealed: false, selfScore: null, attempt: '' };

function storageKey(dateISO: string): string {
  return `r2bot_challenge_${dateISO}`;
}

function loadState(dateISO: string): PersistedState {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = localStorage.getItem(storageKey(dateISO));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      revealed: !!parsed.revealed,
      selfScore: parsed.selfScore === 'good' || parsed.selfScore === 'bad' ? parsed.selfScore : null,
      attempt: typeof parsed.attempt === 'string' ? parsed.attempt : '',
    };
  } catch {
    return EMPTY;
  }
}

function saveState(dateISO: string, state: PersistedState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(dateISO), JSON.stringify(state));
  } catch {
    /* quota — ignore */
  }
}

function formatTimer(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function DailyChallenge({
  challenge,
  dateISO,
  compact = false,
}: {
  challenge: Challenge;
  /** Override the storage key date — used by the archive to keep history separate. */
  dateISO?: string;
  /** Compact layout for embedded use (homepage). */
  compact?: boolean;
}) {
  const key = dateISO ?? todayKeyUTC();
  const accent = LEVEL_ACCENT[challenge.level];

  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<PersistedState>(EMPTY);
  const [showHint, setShowHint] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [copied, setCopied] = useState(false);
  const startedAtRef = useRef<number>(Date.now());

  // Hydrate once on mount; avoids SSR mismatch.
  useEffect(() => {
    const loaded = loadState(key);
    setState(loaded);
    setHydrated(true);
  }, [key]);

  // Live timer until the user reveals the answer.
  useEffect(() => {
    if (!hydrated || state.revealed) return;
    const id = setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 1000);
    return () => clearInterval(id);
  }, [hydrated, state.revealed]);

  const handleAttemptChange = (v: string) => {
    const next = { ...state, attempt: v };
    setState(next);
    saveState(key, next);
  };

  const handleReveal = () => {
    const next = { ...state, revealed: true };
    setState(next);
    saveState(key, next);
  };

  const handleSelfScore = (s: 'good' | 'bad') => {
    const next = { ...state, selfScore: s };
    setState(next);
    saveState(key, next);
  };

  const handleShare = useCallback(async () => {
    const text = `I solved today's R2BOT challenge! Try it: https://robot-tan.vercel.app/challenge`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: "R2BOT Daily Challenge", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* cancelled */
    }
  }, []);

  if (!hydrated) {
    // Show a placeholder card height to avoid CLS.
    return (
      <article
        aria-busy="true"
        style={{
          minHeight: compact ? 280 : 380,
          borderRadius: 18,
          border: '1px solid var(--border-2)',
          background: 'rgba(11,37,64,.3)',
        }}
      />
    );
  }

  const alreadyDone = state.revealed && state.selfScore !== null;

  return (
    <article
      style={{
        position: 'relative',
        borderRadius: 18,
        padding: compact ? '24px 26px' : 'clamp(28px, 4vw, 40px)',
        border: '1px solid var(--border-2)',
        background: `linear-gradient(135deg, ${accent}10, rgba(11,37,64,.45))`,
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: -90,
          top: -90,
          width: 320,
          height: 320,
          background: `radial-gradient(circle, ${accent}22, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <header
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 18,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 11,
              letterSpacing: '.3em',
              color: accent,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Today&apos;s Robot Challenge 🤖
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 11,
              color: 'var(--muted)',
              letterSpacing: '.05em',
            }}
          >
            #{challenge.id} · {key}
          </div>
        </div>
        <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: `${accent}1c`,
              border: `1px solid ${accent}`,
              color: accent,
              fontSize: 11,
              fontFamily: 'var(--font-mono), monospace',
              letterSpacing: '.12em',
              textTransform: 'uppercase',
            }}
          >
            {LEVEL_LABEL[challenge.level]}
          </span>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(0,229,255,.08)',
              border: '1px solid rgba(0,229,255,.4)',
              color: 'var(--cyan-bright)',
              fontSize: 11.5,
              fontFamily: 'var(--font-mono), monospace',
              letterSpacing: '.1em',
            }}
          >
            +{challenge.points} pts
          </span>
          {!state.revealed && (
            <span
              style={{
                fontFamily: 'var(--font-mono), monospace',
                fontSize: 11,
                color: 'var(--muted)',
                letterSpacing: '.05em',
              }}
              aria-label="Elapsed time"
            >
              ⏱ {formatTimer(elapsedMs)}
            </span>
          )}
        </div>
      </header>

      <h2
        className="display"
        style={{
          position: 'relative',
          fontSize: compact ? 'clamp(20px, 2.4vw, 26px)' : 'clamp(22px, 3vw, 32px)',
          lineHeight: 1.3,
          color: 'var(--mist)',
          margin: '0 0 22px',
        }}
      >
        {challenge.question}
      </h2>

      {alreadyDone ? (
        <CompletedView state={state} answer={challenge.answer} onShare={handleShare} copied={copied} />
      ) : (
        <>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowHint((s) => !s)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-2)',
                color: 'var(--mist)',
                borderRadius: 999,
                padding: '6px 14px',
                fontSize: 12.5,
                cursor: 'pointer',
                fontFamily: 'inherit',
                marginBottom: 14,
              }}
            >
              💡 {showHint ? 'Hide hint' : 'Show hint'}
            </button>
            {showHint && (
              <p
                style={{
                  margin: '0 0 14px',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(255,184,0,.08)',
                  border: '1px solid rgba(255,184,0,.35)',
                  color: '#F5DA8C',
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                {challenge.hint}
              </p>
            )}
          </div>

          <textarea
            value={state.attempt}
            onChange={(e) => handleAttemptChange(e.target.value)}
            placeholder="Type your answer here — there's no wrong attempt"
            rows={compact ? 3 : 4}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'rgba(5,8,16,.5)',
              color: 'var(--mist)',
              fontSize: 15,
              lineHeight: 1.5,
              fontFamily: 'inherit',
              resize: 'vertical',
              marginBottom: 14,
            }}
          />

          {state.revealed ? (
            <RevealedAnswer
              answer={challenge.answer}
              selfScore={state.selfScore}
              onSelfScore={handleSelfScore}
              onShare={handleShare}
              copied={copied}
            />
          ) : (
            <button
              type="button"
              onClick={handleReveal}
              className="btn btn-primary"
              style={{ padding: '11px 22px', fontSize: 14 }}
            >
              Reveal answer →
            </button>
          )}
        </>
      )}
    </article>
  );
}

function RevealedAnswer({
  answer,
  selfScore,
  onSelfScore,
  onShare,
  copied,
}: {
  answer: string;
  selfScore: 'good' | 'bad' | null;
  onSelfScore: (s: 'good' | 'bad') => void;
  onShare: () => void;
  copied: boolean;
}) {
  return (
    <div>
      <div
        style={{
          padding: '14px 18px',
          borderRadius: 12,
          background: 'rgba(0,229,255,.06)',
          border: '1px solid rgba(0,229,255,.35)',
          color: 'var(--mist)',
          marginBottom: 16,
          lineHeight: 1.6,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 11,
            letterSpacing: '.25em',
            color: 'var(--cyan-bright)',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          Model answer
        </div>
        <div style={{ fontSize: 15 }}>{answer}</div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 13.5, color: 'var(--muted)' }}>How did you do?</span>
        <div style={{ display: 'inline-flex', gap: 8 }}>
          {(['good', 'bad'] as const).map((s) => {
            const isActive = selfScore === s;
            const label = s === 'good' ? '👍 Got it' : '👎 Missed it';
            return (
              <button
                key={s}
                type="button"
                onClick={() => onSelfScore(s)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: `1px solid ${isActive ? 'var(--cyan-bright)' : 'var(--border-2)'}`,
                  background: isActive ? 'rgba(0,229,255,.15)' : 'transparent',
                  color: isActive ? 'var(--cyan-bright)' : 'var(--mist)',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onShare}
          style={{
            marginLeft: 'auto',
            padding: '6px 14px',
            borderRadius: 999,
            border: '1px solid var(--border-2)',
            background: 'transparent',
            color: 'var(--mist)',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {copied ? 'Copied!' : '🔗 Share'}
        </button>
      </div>
    </div>
  );
}

function CompletedView({
  state,
  answer,
  onShare,
  copied,
}: {
  state: PersistedState;
  answer: string;
  onShare: () => void;
  copied: boolean;
}) {
  return (
    <div>
      <p
        style={{
          margin: '0 0 16px',
          padding: '12px 16px',
          borderRadius: 12,
          background: 'rgba(0,229,255,.08)',
          border: '1px solid rgba(0,229,255,.35)',
          color: 'var(--cyan-bright)',
          fontSize: 14,
        }}
      >
        ✅ Challenge complete! Come back tomorrow for a new one.
      </p>

      {state.attempt.trim().length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 11,
              letterSpacing: '.25em',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Your attempt
          </div>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: 'rgba(5,8,16,.4)',
              border: '1px solid var(--border)',
              color: '#C8D0DC',
              fontSize: 14.5,
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
            }}
          >
            {state.attempt}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 11,
            letterSpacing: '.25em',
            color: 'var(--cyan)',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          Model answer
        </div>
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 10,
            background: 'rgba(0,184,212,.06)',
            border: '1px solid rgba(0,184,212,.3)',
            color: 'var(--mist)',
            fontSize: 14.5,
            lineHeight: 1.55,
          }}
        >
          {answer}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          Self-rating: {state.selfScore === 'good' ? '👍 Got it' : '👎 Missed it'}
        </span>
        <button
          type="button"
          onClick={onShare}
          style={{
            padding: '6px 14px',
            borderRadius: 999,
            border: '1px solid var(--border-2)',
            background: 'transparent',
            color: 'var(--mist)',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {copied ? 'Copied!' : '🔗 Share'}
        </button>
      </div>
    </div>
  );
}
