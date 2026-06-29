'use client'

// components/atlas/ConceptCard.tsx
// New Atlas concept card: hover flip, mastery ring, difficulty stars, locked state.

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { getConceptMasteryCount } from '@/lib/atlas-xp'

interface ConceptCardData {
  slug: string
  type: string
  title: string
  bucket: string
  bucketEmoji?: string
  difficultyLevel?: number
  hookLine?: string
  oneLiner?: string
  laymanExplanation?: string
  conceptImage?: string
  prerequisiteTerms?: string[]
}

export function ConceptCard({
  node,
  masteredSlugs,
  accentColor,
  onMissingPrereqs,
}: {
  node: ConceptCardData
  masteredSlugs: string[]
  accentColor: string
  onMissingPrereqs?: (slug: string, missing: string[]) => void
}) {
  const [flipped, setFlipped] = useState(false)
  const isMastered = masteredSlugs.includes(node.slug)
  const masteryRounds = useMemo(() => getConceptMasteryCount(node.slug), [node.slug])
  const missingPrereqs = (node.prerequisiteTerms ?? []).filter(p => !masteredSlugs.includes(p))
  const isLocked = missingPrereqs.length > 0 && !isMastered

  const handleClick = (e: React.MouseEvent) => {
    if (isLocked && onMissingPrereqs) {
      e.preventDefault()
      onMissingPrereqs(node.slug, missingPrereqs)
    }
  }

  const teaser = node.hookLine ?? node.oneLiner ?? (node.laymanExplanation ? node.laymanExplanation.slice(0, 100) + '…' : '')
  const difficulty = node.difficultyLevel ?? 1

  return (
    <Link
      href={`/atlas/${node.type}/${node.slug}`}
      className={`cc ${isMastered ? 'is-mastered' : ''} ${isLocked ? 'is-locked' : ''}`}
      style={{ ['--accent' as keyof React.CSSProperties as string]: accentColor }}
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onFocus={() => setFlipped(true)}
      onBlur={() => setFlipped(false)}
      onClick={handleClick}
    >
      <div className={`cc-inner ${flipped ? 'is-flipped' : ''}`}>
        {/* Front */}
        <div className="cc-face cc-front">
          <header className="cc-front-head">
            <MasteryRing rounds={masteryRounds} mastered={isMastered} />
            <span className="cc-bucket">
              {node.bucketEmoji && <span aria-hidden>{node.bucketEmoji} </span>}
              {node.bucket.replace(/-/g, ' ')}
            </span>
          </header>
          {node.conceptImage ? (
            <img src={node.conceptImage} alt="" className="cc-image" />
          ) : (
            <div className="cc-image cc-image-placeholder" aria-hidden>
              {node.bucketEmoji ?? '🤖'}
            </div>
          )}
          <h3 className="cc-title">{node.title}</h3>
          <footer className="cc-foot">
            <Difficulty value={difficulty} />
            {isLocked && (
              <span className="cc-lock" title={`Master ${missingPrereqs[0]} first`}>🔒</span>
            )}
          </footer>
        </div>

        {/* Back */}
        <div className="cc-face cc-back">
          <p className="cc-back-teaser">{teaser}</p>
          {missingPrereqs.length > 0 && (
            <p className="cc-back-prereqs">
              Needs: {missingPrereqs.slice(0, 2).join(', ')}
            </p>
          )}
          <span className="cc-back-cta">
            {isLocked ? 'Try anyway →' : 'Start learning →'}
          </span>
        </div>
      </div>

      <style jsx>{`
        .cc {
          position: relative;
          display: block;
          height: 220px;
          perspective: 900px;
          text-decoration: none;
        }
        .cc-inner {
          position: relative; width: 100%; height: 100%;
          transform-style: preserve-3d;
          transition: transform 0.4s cubic-bezier(.22,.61,.36,1);
        }
        .cc-inner.is-flipped { transform: rotateY(180deg); }
        .cc-face {
          position: absolute; inset: 0;
          padding: 14px;
          background: rgba(15, 18, 32, 0.6);
          border: 1.5px solid rgba(255,255,255,0.08);
          border-left: 3px solid var(--accent);
          border-radius: 14px;
          backface-visibility: hidden;
          display: flex; flex-direction: column;
          color: #f4f4f5;
        }
        .cc.is-mastered .cc-front {
          background: linear-gradient(135deg, rgba(251,191,36,0.12), rgba(15,18,32,0.6));
          border-color: rgba(251,191,36,0.4);
          border-left-color: #fbbf24;
        }
        .cc.is-locked .cc-front { filter: grayscale(0.5); opacity: 0.85; }
        .cc-front-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 8px;
        }
        .cc-bucket {
          font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;
          color: #94a3b8; font-weight: 800;
        }
        .cc-image {
          width: 100%;
          flex: 1 1 70px;
          min-height: 60px;
          border-radius: 8px;
          object-fit: cover;
          margin-bottom: 8px;
        }
        .cc-image-placeholder {
          display: grid; place-items: center;
          font-size: 36px;
          background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(0,229,255,0.06));
        }
        .cc-title {
          font-size: 15px; font-weight: 900; color: #fff;
          margin: 0 0 6px;
          line-height: 1.3;
        }
        .cc-foot {
          margin-top: auto;
          display: flex; align-items: center; justify-content: space-between;
        }
        .cc-lock { font-size: 14px; color: #fbbf24; }

        .cc-back {
          transform: rotateY(180deg);
          background: linear-gradient(135deg, var(--accent), rgba(15,18,32,0.95));
          border-left-color: rgba(255,255,255,0.4);
        }
        .cc-back-teaser {
          flex: 1;
          margin: 0;
          font-size: 14px; color: #fff;
          line-height: 1.5;
          font-weight: 600;
        }
        .cc-back-prereqs {
          font-size: 11px; color: rgba(255,255,255,0.85);
          margin: 8px 0 6px;
          font-weight: 700;
        }
        .cc-back-cta {
          font-size: 13px; font-weight: 900;
          color: #fde047;
        }
      `}</style>
    </Link>
  )
}

// ─── Mastery ring (SVG) ────────────────────────────────────────────────────

function MasteryRing({ rounds, mastered }: { rounds: number; mastered: boolean }) {
  const totalRounds = 3
  const pct = mastered ? 1 : rounds / totalRounds
  const radius = 14
  const circ = 2 * Math.PI * radius
  const offset = circ * (1 - pct)
  return (
    <div className="mr" aria-label={mastered ? 'Mastered' : `${rounds} of ${totalRounds} quiz rounds correct`}>
      <svg viewBox="0 0 36 36" width="32" height="32">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
        <circle
          cx="18" cy="18" r={radius}
          fill="none"
          stroke={mastered ? '#fbbf24' : '#00E5FF'}
          strokeWidth="3"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 18 18)"
          style={{ transition: 'stroke-dashoffset 0.4s' }}
        />
        {mastered && <text x="18" y="22" textAnchor="middle" fontSize="14" fill="#fbbf24" fontWeight="900">⭐</text>}
        {!mastered && rounds > 0 && <text x="18" y="22" textAnchor="middle" fontSize="11" fill="#00E5FF" fontWeight="900">{rounds}/3</text>}
      </svg>
      <style jsx>{`
        .mr { line-height: 0; }
      `}</style>
    </div>
  )
}

function Difficulty({ value }: { value: number }) {
  const stars = Math.max(1, Math.min(5, Math.floor(value)))
  return (
    <span className="dif" aria-label={`Difficulty: ${stars} of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ opacity: i < stars ? 1 : 0.2 }}>★</span>
      ))}
      <style jsx>{`
        .dif { color: #fbbf24; font-size: 13px; letter-spacing: 1px; }
      `}</style>
    </span>
  )
}
