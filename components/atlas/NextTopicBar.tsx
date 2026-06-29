'use client'

// components/atlas/NextTopicBar.tsx
// Sticky bottom bar shown on concept detail pages.
// 2-3 recommendations + "Surprise me" button.

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getVisitedSlugs, pickCuriousSlug } from '@/lib/atlas-xp'

interface AtlasNodeLite {
  slug: string
  type: string
  title: string
  bucket?: string
  hookLine?: string
  oneLiner?: string
}

export function NextTopicBar({
  currentSlug,
  unlocksTerms = [],
  bucket,
  allNodes,
}: {
  currentSlug: string
  unlocksTerms?: string[]
  bucket?: string
  allNodes: AtlasNodeLite[]
}) {
  const [visible, setVisible] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const lastY = useRef(0)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        // Show the bar once the user has scrolled past 60% of the page.
        setVisible(!entry.isIntersecting)
      },
      { threshold: 0.1, rootMargin: '0px 0px -60% 0px' },
    )
    const sentinel = document.getElementById('main-content')
    if (sentinel) obs.observe(sentinel)
    return () => obs.disconnect()
  }, [])

  // Hide on scroll-up, show on scroll-down
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      const dy = y - lastY.current
      if (Math.abs(dy) > 10) {
        setHidden(dy < 0)
      }
      lastY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const recs = useMemo(() => {
    const visited = new Set([currentSlug, ...getVisitedSlugs()])
    // 1) Concepts unlocked by this one
    const unlocks = unlocksTerms
      .map(slug => allNodes.find(n => n.slug === slug))
      .filter((x): x is AtlasNodeLite => Boolean(x) && !visited.has(x!.slug))
      .slice(0, 2)
    // 2) Same-bucket lowest-visited fallback
    const bucketPicks = bucket
      ? allNodes
          .filter(n => n.bucket === bucket && !visited.has(n.slug) && !unlocks.find(u => u.slug === n.slug))
          .slice(0, 2)
      : []
    return [...unlocks, ...bucketPicks].slice(0, 3)
  }, [currentSlug, unlocksTerms, bucket, allNodes, refreshKey])

  if (!visible || recs.length === 0) return null

  return (
    <aside
      className={`ntb ${hidden ? 'is-hidden' : ''}`}
      role="complementary"
      aria-label="Suggested next concepts"
    >
      <div className="ntb-inner">
        <p className="ntb-eyebrow">🚀 Ready for more?</p>
        <div className="ntb-cards">
          {recs.map(r => (
            <Link
              key={r.slug}
              href={`/atlas/${r.type}/${r.slug}`}
              className="ntb-card"
            >
              <span className="ntb-card-arrow" aria-hidden>→</span>
              <span className="ntb-card-body">
                <span className="ntb-card-title">{r.title}</span>
                {(r.hookLine || r.oneLiner) && (
                  <span className="ntb-card-sub">{r.hookLine ?? r.oneLiner}</span>
                )}
              </span>
            </Link>
          ))}
          <button
            type="button"
            className="ntb-card ntb-surprise"
            onClick={() => {
              const slug = pickCuriousSlug(allNodes.map(n => n.slug))
              if (!slug) return
              const node = allNodes.find(n => n.slug === slug)
              if (node) window.location.href = `/atlas/${node.type}/${node.slug}`
              setRefreshKey(k => k + 1)
            }}
            aria-label="Surprise me with a random concept"
          >
            <span className="ntb-card-arrow" aria-hidden>🎲</span>
            <span className="ntb-card-body">
              <span className="ntb-card-title">Surprise me!</span>
              <span className="ntb-card-sub">Random unvisited concept</span>
            </span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .ntb {
          position: fixed; left: 0; right: 0; bottom: 0;
          z-index: 40;
          background: linear-gradient(180deg, rgba(11,18,32,0), rgba(11,18,32,0.95) 30%);
          padding: 22px 16px 18px;
          transition: transform .3s cubic-bezier(.22,.61,.36,1), opacity .25s;
          opacity: 1;
        }
        .ntb.is-hidden { transform: translateY(110%); opacity: 0; }
        .ntb-inner {
          max-width: 880px; margin: 0 auto;
          background: rgba(11, 18, 32, 0.95);
          border: 1px solid rgba(124,58,237,0.4);
          border-radius: 16px;
          padding: 14px 16px;
          backdrop-filter: blur(8px);
        }
        .ntb-eyebrow {
          margin: 0 0 10px;
          font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
          color: #fde047; font-weight: 900;
        }
        .ntb-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 8px;
        }
        .ntb-card {
          display: flex; gap: 10px; align-items: center;
          padding: 10px 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: #f4f4f5;
          text-decoration: none;
          cursor: pointer;
          text-align: left;
          font: inherit;
        }
        .ntb-card:hover {
          background: rgba(0,229,255,0.08);
          border-color: rgba(0,229,255,0.35);
        }
        .ntb-card-arrow { font-size: 16px; color: #00E5FF; }
        .ntb-card-body { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
        .ntb-card-title {
          font-size: 13px; font-weight: 900; color: #fff;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .ntb-card-sub {
          font-size: 11px; color: #94a3b8;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .ntb-surprise {
          background: linear-gradient(135deg, rgba(245,158,11,0.18), rgba(124,58,237,0.18));
          border-color: rgba(245,158,11,0.4);
        }
        .ntb-surprise .ntb-card-arrow { color: #fbbf24; }
      `}</style>
    </aside>
  )
}
