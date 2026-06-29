'use client';

import { useState } from 'react';
import {
  type Challenge,
  LEVEL_ACCENT,
  LEVEL_LABEL,
} from '@/lib/challenges';

type ArchiveItem = { dateISO: string; challenge: Challenge };

export function ChallengeArchive({ items }: { items: ArchiveItem[] }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {items.map((item) => (
        <ArchiveRow key={item.dateISO} item={item} />
      ))}
    </div>
  );
}

function ArchiveRow({ item }: { item: ArchiveItem }) {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const accent = LEVEL_ACCENT[item.challenge.level];

  return (
    <div
      style={{
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'rgba(11,37,64,.35)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
          padding: '14px 18px',
          color: 'var(--mist)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
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
            flexShrink: 0,
          }}
        >
          {LEVEL_LABEL[item.challenge.level]}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 12,
            color: 'var(--muted)',
            letterSpacing: '.05em',
            flexShrink: 0,
            minWidth: 96,
          }}
        >
          {item.dateISO}
        </span>
        <span
          style={{
            fontSize: 14.5,
            lineHeight: 1.4,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.challenge.question}
        </span>
        <span
          aria-hidden="true"
          style={{
            color: 'var(--cyan)',
            fontSize: 12,
            transition: 'transform .2s',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          ▶
        </span>
      </button>

      {open && (
        <div
          style={{
            padding: '0 18px 18px',
            borderTop: '1px solid var(--border)',
            color: 'var(--mist)',
            fontSize: 14.5,
            lineHeight: 1.55,
          }}
        >
          <p style={{ margin: '14px 0 12px', color: '#C8D0DC' }}>{item.challenge.question}</p>
          {revealed ? (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: 'rgba(0,229,255,.06)',
                border: '1px solid rgba(0,229,255,.3)',
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
              <div>{item.challenge.answer}</div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setRevealed(true)}
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
              Reveal answer →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
