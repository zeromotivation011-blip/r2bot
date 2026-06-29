'use client'

// components/atlas/BucketHeatmap.tsx
// Mastery coverage per bucket. Click a row → fires onBucketSelect(slug).

import { useEffect, useState } from 'react'
import { getMasteredConceptSlugs } from '@/lib/atlas-xp'

interface BucketSummary {
  slug: string
  label: string
  emoji: string
  count: number
}
interface AtlasNodeLite {
  slug: string
  bucket: string
}

export function BucketHeatmap({
  buckets,
  nodes,
  onBucketSelect,
  refreshKey = 0,
}: {
  buckets: BucketSummary[]
  nodes: AtlasNodeLite[]
  onBucketSelect?: (slug: string) => void
  refreshKey?: number
}) {
  const [mastered, setMastered] = useState<string[]>([])
  useEffect(() => {
    setMastered(getMasteredConceptSlugs())
  }, [refreshKey])

  const rows = buckets.map(b => {
    const slugsInBucket = nodes.filter(n => n.bucket === b.slug).map(n => n.slug)
    const masteredHere = slugsInBucket.filter(s => mastered.includes(s)).length
    const pct = slugsInBucket.length === 0 ? 0 : masteredHere / slugsInBucket.length
    return { ...b, total: slugsInBucket.length, masteredHere, pct }
  })

  const tier = (pct: number, total: number): { color: string; label?: string } => {
    if (total === 0) return { color: '#475569' }
    if (pct >= 1) return { color: '#fbbf24', label: '⭐ Complete!' }
    if (pct >= 0.75) return { color: '#10b981' }
    if (pct >= 0.25) return { color: '#f59e0b' }
    return { color: '#ef4444' }
  }

  return (
    <section className="bh" aria-label="Bucket mastery heatmap">
      <header className="bh-head">
        <h2 className="bh-h2">Your constellations</h2>
        <p className="bh-sub">Click a bucket to filter the grid below.</p>
      </header>
      <div className="bh-rows">
        {rows.map(r => {
          const t = tier(r.pct, r.total)
          return (
            <button
              key={r.slug}
              type="button"
              onClick={() => onBucketSelect?.(r.slug)}
              className="bh-row"
            >
              <span className="bh-emoji" aria-hidden>{r.emoji}</span>
              <span className="bh-label">{r.label}</span>
              <span className="bh-bar">
                <span className="bh-bar-fill" style={{ width: `${r.pct * 100}%`, background: t.color }} />
              </span>
              <span className="bh-count">
                {r.masteredHere}/{r.total}
                {t.label && <span className="bh-tag">{t.label}</span>}
              </span>
            </button>
          )
        })}
      </div>
      <style jsx>{`
        .bh {
          background: rgba(11, 18, 32, 0.5);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 18px;
          margin: 18px 0;
        }
        .bh-head { margin-bottom: 12px; }
        .bh-h2 {
          font-size: 15px; font-weight: 900;
          color: #fde047; margin: 0 0 4px;
          letter-spacing: 0.5px;
        }
        .bh-sub { font-size: 12px; color: #94a3b8; margin: 0; }
        .bh-rows { display: flex; flex-direction: column; gap: 4px; }
        .bh-row {
          width: 100%;
          display: grid;
          grid-template-columns: 28px 1fr 1.2fr auto;
          gap: 12px;
          align-items: center;
          padding: 8px 10px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 10px;
          color: #c8d0dc;
          cursor: pointer;
          text-align: left;
          font-size: 13px;
        }
        .bh-row:hover { background: rgba(0,229,255,0.06); border-color: rgba(0,229,255,0.18); }
        .bh-emoji { font-size: 18px; }
        .bh-label { font-weight: 700; color: #f4f4f5; }
        .bh-bar {
          position: relative;
          height: 8px;
          background: rgba(255,255,255,0.06);
          border-radius: 999px;
          overflow: hidden;
        }
        .bh-bar-fill {
          position: absolute; inset: 0;
          transition: width 0.4s, background 0.2s;
        }
        .bh-count { font-weight: 800; color: #fde047; font-size: 12px; font-variant-numeric: tabular-nums; }
        .bh-tag {
          margin-left: 8px;
          font-size: 11px;
          color: #fbbf24;
        }
      `}</style>
    </section>
  )
}
