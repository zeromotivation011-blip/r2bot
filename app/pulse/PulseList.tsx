'use client';

import { useMemo, useState } from 'react';

export type PulseEntry = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  country: string;
  countryClass: string;
  countryLabel: string;
  publishedAt: string;
  readMinutes: number;
};

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://r2bot-psi.vercel.app';

export function PulseList({ entries }: { entries: PulseEntry[] }) {
  const [filter, setFilter] = useState<string>('All');

  const categories = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => set.add(e.category));
    return ['All', ...Array.from(set).sort()];
  }, [entries]);

  const visible = useMemo(
    () => (filter === 'All' ? entries : entries.filter((e) => e.category === filter)),
    [entries, filter],
  );

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
        {categories.map((cat) => {
          const isActive = cat === filter;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                border: '1px solid ' + (isActive ? 'var(--cyan)' : 'var(--border)'),
                background: isActive ? 'rgba(0,184,212,.16)' : 'rgba(11,37,64,.4)',
                color: isActive ? 'var(--cyan-bright)' : '#C8D0DC',
                fontSize: 13,
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'all .2s',
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
          No stories yet under {filter}.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
          {visible.map((p) => {
            const url = `${BASE_URL}/pulse/${p.slug}`;
            const wa = `https://wa.me/?text=${encodeURIComponent(`${p.title} — ${url}`)}`;
            return (
              <div key={p.slug} style={{ position: 'relative' }}>
                <a href={`/pulse/${p.slug}`} className="pulse-card" style={{ display: 'block' }}>
                  <span className={`pulse-tag ${p.countryClass}`}>
                    {p.countryLabel} · {p.category}
                  </span>
                  <h3>{p.title}</h3>
                  <p>{p.summary}</p>
                  <div className="pulse-meta">
                    <span>
                      {p.publishedAt} · {p.readMinutes} min read
                    </span>
                    <span className="pulse-arrow">→</span>
                  </div>
                </a>
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Share "${p.title}" on WhatsApp`}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    width: 32,
                    height: 32,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    background: 'rgba(11,37,64,.7)',
                    border: '1px solid var(--border)',
                    color: 'var(--cyan)',
                    fontSize: 14,
                    textDecoration: 'none',
                  }}
                >
                  ↗
                </a>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
