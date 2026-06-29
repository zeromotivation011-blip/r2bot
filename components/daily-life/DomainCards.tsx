'use client'

// components/daily-life/DomainCards.tsx
// Visual domain cards row (replaces the dropdown filter). Click to filter.

import { DOMAINS, type DomainId } from '@/lib/daily-life-data'

const DOMAIN_LABELS: Record<DomainId, { label: string; emoji: string; color: string }> = {
  healthcare:      { label: 'Healthcare',     emoji: '🏥', color: '#0891b2' },
  agriculture:     { label: 'Farming',        emoji: '🌾', color: '#16a34a' },
  home:            { label: 'Home',           emoji: '🏠', color: '#a855f7' },
  finance:         { label: 'Money',          emoji: '💸', color: '#fbbf24' },
  transport:       { label: 'Transport',      emoji: '🚗', color: '#ef4444' },
  entertainment:   { label: 'Entertainment',  emoji: '🎭', color: '#ec4899' },
  education:       { label: 'Education',      emoji: '📚', color: '#3b82f6' },
  manufacturing:   { label: 'Manufacturing',  emoji: '🏭', color: '#f97316' },
  shopping:        { label: 'Shopping',       emoji: '🛒', color: '#10b981' },
  'food-delivery': { label: 'Food',           emoji: '🍕', color: '#fb923c' },
}

interface DomainCardsProps {
  selected: DomainId | 'all'
  onSelect: (id: DomainId | 'all') => void
  countsByDomain?: Partial<Record<DomainId, number>>
  totalCount?: number
}

export function DomainCards({ selected, onSelect, countsByDomain = {}, totalCount = 47 }: DomainCardsProps) {
  return (
    <div className="dc">
      <button
        type="button"
        onClick={() => onSelect('all')}
        className={`dc-card ${selected === 'all' ? 'is-selected' : ''}`}
        style={{ ['--c' as keyof React.CSSProperties as string]: '#fbbf24' }}
      >
        <span className="dc-emoji" aria-hidden>🤖</span>
        <span className="dc-label">All</span>
        <span className="dc-count">{totalCount}</span>
      </button>
      {DOMAINS.map(d => {
        const info = DOMAIN_LABELS[d.id] ?? { label: d.label, emoji: d.emoji, color: '#94a3b8' }
        const isSel = selected === d.id
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onSelect(d.id)}
            className={`dc-card ${isSel ? 'is-selected' : ''}`}
            style={{ ['--c' as keyof React.CSSProperties as string]: info.color }}
          >
            <span className="dc-emoji" aria-hidden>{info.emoji}</span>
            <span className="dc-label">{info.label}</span>
            {typeof countsByDomain[d.id] === 'number' && (
              <span className="dc-count">{countsByDomain[d.id]}</span>
            )}
          </button>
        )
      })}
      <style jsx>{`
        .dc {
          display: flex; gap: 8px;
          overflow-x: auto;
          padding: 10px 4px;
          scrollbar-width: thin;
          -webkit-overflow-scrolling: touch;
        }
        .dc::-webkit-scrollbar { height: 4px; }
        .dc::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
        .dc-card {
          flex-shrink: 0;
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          min-width: 88px;
          padding: 12px 10px;
          background: rgba(15, 18, 32, 0.6);
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          color: #f4f4f5;
          cursor: pointer;
          transition: transform .15s, border-color .15s, background .15s;
        }
        .dc-card:hover {
          transform: translateY(-2px);
          border-color: var(--c);
        }
        .dc-card.is-selected {
          background: linear-gradient(135deg, color-mix(in srgb, var(--c) 25%, transparent), rgba(15,18,32,0.85));
          border-color: var(--c);
          color: #fff;
          box-shadow: 0 0 18px var(--c);
        }
        .dc-emoji { font-size: 24px; line-height: 1; }
        .dc-label { font-size: 12px; font-weight: 800; }
        .dc-count {
          font-size: 11px;
          padding: 2px 8px;
          background: rgba(255,255,255,0.08);
          color: var(--c);
          border-radius: 999px;
          font-weight: 900;
        }
      `}</style>
    </div>
  )
}
