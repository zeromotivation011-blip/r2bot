'use client';

import { useEffect, useState } from 'react';
import { readRecent, type RecentItem } from './RecentlyViewedTracker';

export function RecentlyViewedStrip() {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    setItems(readRecent());
  }, []);

  if (items.length === 0) return null;

  return (
    <section style={{ margin: '64px 0 24px' }}>
      <div
        style={{
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 11,
          letterSpacing: '.3em',
          color: 'var(--muted)',
          textTransform: 'uppercase',
          marginBottom: 14,
        }}
      >
        Recently viewed
      </div>
      <div
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 8,
        }}
      >
        {items.map((r) => (
          <a
            key={`${r.type}-${r.slug}`}
            href={`/atlas/${r.type}/${r.slug}`}
            style={{
              flex: '0 0 240px',
              padding: '14px 16px',
              borderRadius: 12,
              background: 'rgba(11,37,64,.35)',
              border: '1px solid var(--border)',
              color: 'var(--mist)',
              fontSize: 14.5,
              transition: 'border-color .2s, transform .2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--cyan)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {r.title}
          </a>
        ))}
      </div>
    </section>
  );
}
