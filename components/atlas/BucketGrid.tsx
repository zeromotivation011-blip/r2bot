'use client'

// components/atlas/BucketGrid.tsx
// 20-bucket visual grid. Each card shows emoji + name + count + mastery bar.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getMasteredConceptSlugs } from '@/lib/atlas-xp'

export interface BucketTile {
  id: string
  name: string
  emoji: string
  color: string
  count: number              // total concepts in this bucket
  slugs: string[]            // slugs that belong to this bucket (for mastery calc)
}

export function BucketGrid({
  buckets,
  onSelect,
}: {
  buckets: BucketTile[]
  onSelect?: (id: string) => void
}) {
  const [mastered, setMastered] = useState<string[]>([])
  useEffect(() => {
    setMastered(getMasteredConceptSlugs())
  }, [])

  return (
    <section style={{ margin: '22px 0' }}>
      <p
        style={{
          fontSize: 11,
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: '#94a3b8',
          fontWeight: 900,
          margin: '0 0 12px',
        }}
      >
        Explore by bucket
      </p>
      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
        }}
      >
        {buckets.map(b => {
          const masteredCount = b.slugs.filter(s => mastered.includes(s)).length
          const pct = b.count === 0 ? 0 : Math.round((masteredCount / b.count) * 100)
          const completed = pct === 100 && b.count > 0
          const cardStyle: React.CSSProperties = {
            display: 'block',
            background: 'rgba(15, 18, 32, 0.55)',
            border: `1.5px solid ${completed ? '#fbbf24' : 'rgba(255,255,255,0.08)'}`,
            borderLeft: `4px solid ${b.color}`,
            borderRadius: 14,
            padding: 16,
            textDecoration: 'none',
            color: '#f4f4f5',
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
            width: '100%',
          }
          const inner = (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 26, lineHeight: 1 }}>{b.emoji}</span>
                <span style={{ fontWeight: 900, color: '#fff', fontSize: 15 }}>{b.name}</span>
                {completed && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: '#fbbf24' }}>
                    ⭐ done
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 6 }}>
                <span>{b.count} concepts</span>
                <span>{masteredCount}/{b.count}</span>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: completed ? 'linear-gradient(90deg, #fbbf24, #f97316)' : b.color,
                    transition: 'width .4s',
                  }}
                />
              </div>
            </>
          )
          if (onSelect) {
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onSelect(b.id)}
                className="bg-card"
                style={{ ...cardStyle, border: cardStyle.border }}
              >
                {inner}
              </button>
            )
          }
          return (
            <Link key={b.id} href={`/atlas?bucket=${b.id}`} className="bg-card" style={cardStyle}>
              {inner}
            </Link>
          )
        })}
      </div>
      <style jsx>{`
        .bg-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(0,0,0,0.35);
        }
      `}</style>
    </section>
  )
}
