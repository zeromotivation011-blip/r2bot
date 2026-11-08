'use client'

// components/atlas/ReadingPathsStrip.tsx
// Shows the curated reading paths on the Atlas home with per-path progress.
//
// Was five cards, each with a different border colour, a differently coloured
// level pill and a 28px emoji — a rainbow in one row, on the page whose whole
// job is to make 512 entries feel navigable. Level is the only thing that
// meaningfully differs between the cards, so it is the only thing coloured
// now, and it is coloured by level rather than by card.

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
    <section style={{ margin: '2.5rem 0' }}>
      <header style={{ marginBottom: '1rem' }}>
        <p className="r2-eyebrow">Reading paths</p>
        <h2 className="r2-h2">Not sure where to start? Follow a path.</h2>
        <p className="r2-body" style={{ marginTop: '0.4rem', fontSize: 'var(--t-small)' }}>
          Linear journeys through the Atlas, curated by topic.
        </p>
      </header>

      <div className="r2-paths">
        {READING_PATHS.map((p) => {
          const masteredCount = p.concepts.filter((s) => mastered.includes(s)).length
          const pct = p.concepts.length === 0 ? 0 : Math.round((masteredCount / p.concepts.length) * 100)
          return (
            <Link key={p.id} href={`/atlas/paths/${p.id}`} className="r2-card r2-path">
              <span className={`r2-path__level r2-path__level--${p.level.toLowerCase()}`}>
                {p.level}
              </span>
              <span className="r2-h3 r2-path__title">{p.title}</span>
              <span className="r2-meta">
                {p.concepts.length} concepts · ~{p.estimatedMinutes} min
              </span>
              {/* A progress bar reading 0% on every card, to someone who has
                  just arrived, is a row of empty troughs saying "you have done
                  nothing". It appears once there is something to show. */}
              {pct > 0 && (
                <span className="r2-path__bar" aria-label={`${pct}% complete`}>
                  <span style={{ width: `${pct}%` }} />
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
