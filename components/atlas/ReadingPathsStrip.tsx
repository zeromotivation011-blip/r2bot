'use client'

// components/atlas/ReadingPathsStrip.tsx
// Shows the curated reading paths on the Atlas home with per-path progress.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { READING_PATHS } from '@/lib/atlas-reading-paths'
import { getMasteredConceptSlugs } from '@/lib/atlas-xp'

export function ReadingPathsStrip() {
  const [mastered, setMastered] = useState<string[]>([])
  useEffect(() => {
    setMastered(getMasteredConceptSlugs())
  }, [])

  return (
    <section style={{ margin: '22px 0' }}>
      <header style={{ marginBottom: 12 }}>
        <p
          style={{
            fontSize: 11,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: '#fbbf24',
            fontWeight: 900,
            margin: 0,
          }}
        >
          Reading paths
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '6px 0 4px' }}>
          Not sure where to start? Follow a path.
        </h2>
        <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
          Linear journeys through the Atlas, curated by topic.
        </p>
      </header>
      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
        }}
      >
        {READING_PATHS.map(p => {
          const masteredCount = p.concepts.filter(s => mastered.includes(s)).length
          const pct = p.concepts.length === 0 ? 0 : Math.round((masteredCount / p.concepts.length) * 100)
          return (
            <Link
              key={p.id}
              href={`/atlas/paths/${p.id}`}
              style={{
                display: 'block',
                padding: 16,
                background: `linear-gradient(135deg, ${p.color}26, rgba(15,18,32,0.7))`,
                border: `1.5px solid ${p.color}`,
                borderRadius: 14,
                textDecoration: 'none',
                color: '#f4f4f5',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 28 }}>{p.emoji}</span>
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    fontWeight: 900,
                    color: '#0a0a16',
                    background: p.color,
                    padding: '2px 8px',
                    borderRadius: 999,
                  }}
                >
                  {p.level}
                </span>
              </div>
              <p style={{ fontSize: 17, fontWeight: 900, color: '#fff', margin: '0 0 4px' }}>{p.title}</p>
              <p style={{ fontSize: 12, color: '#c4b5fd', margin: '0 0 10px' }}>
                {p.concepts.length} concepts · ~{p.estimatedMinutes} min
              </p>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${p.color}, #fbbf24)`,
                    transition: 'width .4s',
                  }}
                />
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 0', fontWeight: 700 }}>
                {pct}% complete
              </p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
