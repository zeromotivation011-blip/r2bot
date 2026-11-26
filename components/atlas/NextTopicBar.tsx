'use client'

// components/atlas/NextTopicBar.tsx
// Sticky bottom bar shown on concept detail pages.
// 2-3 recommendations + "Surprise me" button.

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getVisitedSlugs, pickCuriousSlug } from '@/lib/atlas-xp'
import { loadAtlasIndex } from '@/components/atlas/useAtlasIndex'

const DISMISS_KEY = 'r2-ntb-dismissed'

interface AtlasNodeLite {
  slug: string
  type: string
  title: string
  bucket?: string
  hookLine?: string
  oneLiner?: string
}

/**
 * `allNodes` is the candidate pool for the recommendations: the concepts this
 * one unlocks plus the rest of its bucket, in Atlas order. It used to be every
 * entry in the Atlas (~50 KB of props per page); "Surprise me" — the only
 * feature that genuinely needs the whole list — now fetches the index on click.
 */
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
  const barRef = useRef<HTMLElement>(null)

  const [dismissed, setDismissed] = useState(false)

  // Read the per-tab dismissal. Storage can throw (private mode, blocked
  // site data), so a failure just means the bar can come back.
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(DISMISS_KEY) === '1') setDismissed(true)
    } catch {
      /* storage unavailable */
    }
  }, [])

  // Show the bar only when the reader is near the end of the entry: the bottom
  // of <main> is within half a screen of the bottom of the viewport. It used to
  // appear while the entry was still being read and, on a phone, stacked four
  // cards over ~45% of the screen (task 99, 26 Nov 2026).
  useEffect(() => {
    const main = document.getElementById('main-content')
    if (!main) return
    const check = () => {
      const bottom = main.getBoundingClientRect().bottom
      setVisible(bottom < window.innerHeight * 1.5)
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
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

  const shown = visible && !dismissed && !hidden && recs.length > 0

  // Lift the site-wide back-to-top button above the bar while the bar is shown
  // (it sat on top of the close button on phones).
  useEffect(() => {
    const root = document.documentElement
    const clear = () => {
      root.style.removeProperty('--btt-bottom')
    }
    if (!shown || !barRef.current) {
      clear()
      return
    }
    root.style.setProperty('--btt-bottom', `${barRef.current.offsetHeight + 12}px`)
    return clear
  }, [shown])

  if (!visible || dismissed || recs.length === 0) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* storage unavailable: hidden for this page view only */
    }
  }

  return (
    <aside
      ref={barRef}
      className={`ntb ${hidden ? 'is-hidden' : ''}`}
      role="complementary"
      aria-label="Suggested next concepts"
    >
      <div className="ntb-inner">
        <div className="ntb-head">
          <p className="ntb-eyebrow">Ready for more?</p>
          <button type="button" className="ntb-close" onClick={dismiss} aria-label="Hide suggested next concepts">
            <span aria-hidden>×</span>
          </button>
        </div>
        <div className="ntb-cards">
          {recs.map((r, i) => (
            <Link
              key={r.slug}
              href={`/atlas/${r.type}/${r.slug}`}
              className={i > 0 ? 'ntb-card ntb-extra' : 'ntb-card'}
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
              void loadAtlasIndex().then((index) => {
                const pool = index.length > 0 ? index : allNodes
                const slug = pickCuriousSlug(pool.map(n => n.slug))
                if (!slug) return
                const node = pool.find(n => n.slug === slug)
                if (node) window.location.href = `/atlas/${node.type}/${node.slug}`
                setRefreshKey(k => k + 1)
              })
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

      {/* global: the cards are next/link components, which styled-jsx scoping
          does not reach, so scoped rules never styled them. Names are ntb-*. */}
      <style jsx global>{`
        .ntb {
          position: fixed; left: 0; right: 0; bottom: 0;
          z-index: 40;
          background: linear-gradient(180deg, rgba(11,18,32,0), rgba(11,18,32,0.95) 30%);
          padding: 22px 16px calc(18px + env(safe-area-inset-bottom, 0px));
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
        .ntb-head {
          display: flex; align-items: center; justify-content: space-between;
          margin: 0 0 10px;
        }
        .ntb-close {
          width: 44px; height: 44px; margin: -12px -12px -12px 0;
          display: inline-flex; align-items: center; justify-content: center;
          background: none; border: 0; border-radius: 10px;
          color: #a1a1aa; font-size: 22px; line-height: 1; cursor: pointer;
        }
        .ntb-close:hover { color: #fff; background: rgba(255,255,255,0.06); }
        .ntb-eyebrow {
          margin: 0;
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
          font-size: 11px; color: var(--text-2);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .ntb-surprise {
          background: linear-gradient(135deg, rgba(252,104,24,0.18), rgba(124,58,237,0.18));
          border-color: rgba(252,104,24,0.4);
        }
        .ntb-surprise .ntb-card-arrow { color: #FF8A4C; }

        /* Phones: one suggestion and "Surprise me" side by side, no subtitles,
           so the bar is about a sixth of the screen instead of almost half. */
        @media (max-width: 639px) {
          .ntb { padding: 16px 12px calc(10px + env(safe-area-inset-bottom, 0px)); }
          .ntb-inner { padding: 10px 12px; border-radius: 14px; }
          .ntb-head { margin-bottom: 6px; }
          .ntb-cards { grid-template-columns: minmax(0, 1fr) auto; }
          .ntb-cards .ntb-extra { display: none; }
          .ntb-cards .ntb-card { min-height: 44px; padding: 8px 12px; }
          .ntb-cards .ntb-card-sub { display: none; }
        }
      `}</style>
    </aside>
  )
}
