'use client';

import { useState } from 'react';
import { LabThread, type LabContentType } from './LabThread';

type Filter = 'all' | LabContentType;

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'atlas', label: 'Atlas' },
  { key: 'academy', label: 'Academy' },
  { key: 'pulse', label: 'Pulse' },
  { key: 'general', label: 'General' },
];

export function LabFeed() {
  const [filter, setFilter] = useState<Filter>('all');
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {FILTERS.map((f) => {
          const isActive = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                border: '1px solid ' + (isActive ? 'var(--cyan)' : 'var(--border)'),
                background: isActive ? 'rgba(0,184,212,.16)' : 'rgba(11,37,64,.4)',
                color: isActive ? 'var(--cyan-bright)' : '#C8D0DC',
                fontSize: 13,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      <LabThread mode="feed" filter={filter} showTypeBadges />
    </>
  );
}
