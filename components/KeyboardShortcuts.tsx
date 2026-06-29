'use client';

import { useEffect, useState } from 'react';
import { useCopilot } from './CopilotProvider';

const SHORTCUTS: Array<{ keys: string; label: string }> = [
  { keys: '⌘ K', label: 'Open R2 Co-pilot' },
  { keys: '?', label: 'Show this overlay' },
  { keys: '/', label: 'Focus search' },
  { keys: 'Esc', label: 'Close any modal' },
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const { closeDrawer } = useCopilot();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;
      if (e.key === '?' && !inField) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        closeDrawer?.();
      }
      if (e.key === '/' && !inField) {
        const search = document.querySelector<HTMLInputElement>(
          'input[type="search"]',
        );
        if (search) {
          e.preventDefault();
          search.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeDrawer]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5,8,16,.7)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(480px, 100%)',
          background: 'rgba(11,37,64,.95)',
          border: '1px solid var(--border-2)',
          borderRadius: 16,
          padding: 28,
          color: 'var(--mist)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 11,
            letterSpacing: '.3em',
            color: 'var(--cyan)',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          Shortcuts
        </div>
        <h2
          className="display"
          style={{ fontSize: 24, margin: '0 0 22px', color: 'var(--mist)' }}
        >
          Keyboard shortcuts
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {SHORTCUTS.map((s) => (
            <li
              key={s.keys}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid var(--border)',
                fontSize: 14.5,
              }}
            >
              <span>{s.label}</span>
              <kbd
                style={{
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: 12,
                  padding: '3px 8px',
                  background: 'rgba(255,255,255,.06)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--cyan-bright)',
                }}
              >
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
        <button
          onClick={() => setOpen(false)}
          style={{
            marginTop: 22,
            background: 'transparent',
            border: 'none',
            color: 'var(--muted)',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Press <kbd>Esc</kbd> or click outside to close.
        </button>
      </div>
    </div>
  );
}
