'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { ReadingPath } from '@/lib/atlas-reading-paths'
import { getMasteredConceptSlugs } from '@/lib/atlas-xp'

interface ConceptStep {
  slug: string
  type: string
  title: string
  summary: string
  hookLine?: string
  oneLiner?: string
  tagline?: string
  difficultyLevel?: number
  missing?: boolean
}

export function ReadingPathClient({
  path,
  concepts,
}: {
  path: ReadingPath
  concepts: ConceptStep[]
}) {
  const [mastered, setMastered] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setMastered(getMasteredConceptSlugs())
    setHydrated(true)
  }, [])

  const masteredCount = concepts.filter(c => mastered.includes(c.slug)).length
  const total = concepts.length
  const pct = total === 0 ? 0 : Math.round((masteredCount / total) * 100)
  const isComplete = masteredCount === total && total > 0

  // First unmastered concept is the "current" step
  const currentIdx = hydrated
    ? concepts.findIndex(c => !mastered.includes(c.slug))
    : 0
  const continueHref =
    currentIdx >= 0 && concepts[currentIdx]
      ? `/atlas/${concepts[currentIdx].type}/${concepts[currentIdx].slug}`
      : `/atlas/${concepts[0]?.type ?? 'concept'}/${concepts[0]?.slug ?? ''}`

  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '110px 18px 80px', color: '#f4f4f5' }}>
      <Link href="/atlas/paths" style={{ color: '#c4b5fd', fontSize: 13, textDecoration: 'none' }}>
        ← All reading paths
      </Link>

      <header
        style={{
          marginTop: 14,
          padding: 28,
          borderRadius: 22,
          border: `2px solid ${path.color}`,
          background: `linear-gradient(135deg, ${path.color}22, ${path.color}11)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 48, lineHeight: 1 }}>{path.emoji}</div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
                fontWeight: 900,
                color: '#0a0a16',
                background: path.color,
                padding: '2px 10px',
                borderRadius: 999,
              }}
            >
              {path.level}
            </span>
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, color: '#fff', margin: '8px 0 8px' }}>
              {path.title}
            </h1>
            <p style={{ color: '#c4b5fd', fontSize: 15, margin: 0 }}>{path.description}</p>
            <p style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, marginTop: 8 }}>
              📚 {total} concepts · ⏱ ~{path.estimatedMinutes} min
            </p>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', fontWeight: 700, marginBottom: 6 }}>
            <span>{hydrated ? `${masteredCount} of ${total} mastered` : 'Loading…'}</span>
            <span>{pct}%</span>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${path.color}, #fbbf24)`,
                transition: 'width .4s cubic-bezier(.22,.61,.36,1)',
              }}
            />
          </div>
        </div>

        {!isComplete && hydrated && (
          <Link
            href={continueHref}
            style={{
              display: 'inline-block',
              marginTop: 18,
              padding: '12px 22px',
              background: path.color,
              color: '#0a0a16',
              fontWeight: 900,
              borderRadius: 12,
              textDecoration: 'none',
            }}
          >
            {masteredCount === 0 ? 'Start path →' : 'Continue path →'}
          </Link>
        )}
        {isComplete && (
          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 12,
              background: 'rgba(16,185,129,0.18)',
              border: '1px solid rgba(16,185,129,0.4)',
              color: '#d1fae5',
            }}
          >
            🏆 <strong>Path complete!</strong> Certificate available below.
          </div>
        )}
      </header>

      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          margin: '26px 0 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {concepts.map((c, i) => {
          const isMastered = mastered.includes(c.slug)
          const isCurrent = hydrated && i === currentIdx
          const isLocked = hydrated && i > 0 && !mastered.includes(concepts[i - 1].slug) && !isMastered

          const stepColor = isMastered ? '#10b981' : isCurrent ? path.color : 'rgba(255,255,255,0.15)'
          const stepBg = isMastered
            ? 'rgba(16,185,129,0.10)'
            : isCurrent
              ? `${path.color}22`
              : 'rgba(15, 18, 32, 0.5)'

          return (
            <li key={c.slug}>
              <Link
                href={c.missing ? '/atlas' : `/atlas/${c.type}/${c.slug}`}
                aria-disabled={c.missing}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr auto',
                  gap: 16,
                  alignItems: 'center',
                  padding: 16,
                  background: stepBg,
                  border: `1px solid ${stepColor}`,
                  borderRadius: 14,
                  color: '#f4f4f5',
                  textDecoration: 'none',
                  opacity: c.missing ? 0.5 : 1,
                  cursor: c.missing ? 'not-allowed' : 'pointer',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    background: isMastered ? '#10b981' : isLocked ? 'rgba(255,255,255,0.06)' : stepColor,
                    color: isMastered ? '#fff' : '#0a0a16',
                    fontWeight: 900,
                    fontSize: 15,
                  }}
                  aria-hidden
                >
                  {isMastered ? '✓' : isLocked ? '🔒' : i + 1}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 800, color: '#fff', fontSize: 15 }}>
                    {c.title}
                    {c.missing && (
                      <span style={{ marginLeft: 8, fontSize: 10, color: '#fbbf24', fontWeight: 700 }}>
                        (coming soon)
                      </span>
                    )}
                  </p>
                  {(c.tagline || c.hookLine || c.oneLiner || c.summary) && (
                    <p
                      style={{
                        margin: '4px 0 0',
                        color: '#c4b5fd',
                        fontSize: 13,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.tagline ?? c.hookLine ?? c.oneLiner ?? c.summary}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  {typeof c.difficultyLevel === 'number' && (
                    <span style={{ color: '#fbbf24', fontSize: 11, letterSpacing: 1 }}>
                      {'★'.repeat(c.difficultyLevel)}
                    </span>
                  )}
                  {isMastered ? (
                    <span style={{ fontSize: 11, color: '#10b981', fontWeight: 800 }}>Mastered</span>
                  ) : isCurrent ? (
                    <span style={{ fontSize: 11, color: path.color, fontWeight: 800 }}>You&apos;re here</span>
                  ) : null}
                </div>
              </Link>
            </li>
          )
        })}
      </ol>

      {isComplete && (
        <section
          style={{
            marginTop: 26,
            padding: 24,
            borderRadius: 18,
            background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(16,185,129,0.10))',
            border: '1px solid rgba(251,191,36,0.4)',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 36, margin: 0 }}>🏆</p>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fde047', margin: '8px 0 6px' }}>
            Path Complete — {path.title}
          </h2>
          <p style={{ color: '#fde68a', margin: '0 0 14px' }}>
            You&apos;ve mastered all {total} concepts. Share the win.
          </p>
          <button
            type="button"
            onClick={() => {
              const text = `I just completed the "${path.title}" path on R2BOT Atlas! 🤖 r2bot.in/atlas/paths/${path.id}`
              if (typeof navigator !== 'undefined' && navigator.share) {
                navigator.share({ text }).catch(() => {})
              } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
                navigator.clipboard.writeText(text).catch(() => {})
              }
            }}
            style={{
              padding: '12px 22px',
              background: 'linear-gradient(135deg, #fbbf24, #f97316)',
              color: '#0a0a16',
              fontWeight: 900,
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            📤 Share my completion
          </button>
        </section>
      )}
    </main>
  )
}
