'use client'

// components/history/TimelineScrubber.tsx
// Horizontal scrubbable timeline showing each milestone as a coloured dot.
// Decade labels above. Sticky to the top of the viewport once scrolled.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { HistoryChapter, HistoryMilestone } from '@/lib/history-chapters'

interface ScrubItem {
  year: number
  title: string
  color: string
  emoji: string
  chapterId: string
  href: string
}

export function TimelineScrubber({ chapters, birthYear }: { chapters: HistoryChapter[]; birthYear: number | null }) {
  const items = useMemo<ScrubItem[]>(() => {
    const flat: ScrubItem[] = []
    for (const c of chapters) {
      for (const m of c.milestones) {
        const anchor = `${m.year}-${m.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`
        flat.push({
          year: m.year,
          title: m.title,
          color: c.color,
          emoji: m.emoji,
          chapterId: c.id,
          href: `#${anchor}`,
        })
      }
    }
    flat.sort((a, b) => a.year - b.year)
    return flat
  }, [chapters])

  const minYear = items[0]?.year ?? 1920
  const maxYear = items[items.length - 1]?.year ?? 2026
  const span = Math.max(1, maxYear - minYear)

  const decades = useMemo(() => {
    const start = Math.floor(minYear / 10) * 10
    const end = Math.ceil(maxYear / 10) * 10
    const out: number[] = []
    for (let d = start; d <= end; d += 10) out.push(d)
    return out
  }, [minYear, maxYear])

  const [activeYear, setActiveYear] = useState<number | null>(null)
  const railRef = useRef<HTMLDivElement | null>(null)
  const [stuck, setStuck] = useState(false)

  // Track which milestone is in view
  useEffect(() => {
    const els = items
      .map(it => document.getElementById(it.href.slice(1)))
      .filter((x): x is HTMLElement => Boolean(x))
    if (els.length === 0) return

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length > 0) {
          const top = visible.sort((a, b) => a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top)[0]
          const id = top.target.id
          const year = parseInt(id.slice(0, 4), 10)
          if (!Number.isNaN(year)) setActiveYear(year)
        }
      },
      { rootMargin: '-30% 0px -50% 0px', threshold: [0, 0.2, 0.5, 1] },
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [items])

  // Stick to top once scrolled past hero
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 320)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className={`tls ${stuck ? 'is-stuck' : ''}`} role="navigation" aria-label="History timeline scrubber">
      <div className="tls-inner">
        <div className="tls-decades" aria-hidden>
          {decades.map(d => (
            <span
              key={d}
              className="tls-decade"
              style={{ left: `${((d - minYear) / span) * 100}%` }}
            >
              {d}
            </span>
          ))}
        </div>
        <div className="tls-rail" ref={railRef}>
          <div className="tls-line" />
          {items.map(it => {
            const isActive = activeYear === it.year
            const inLifetime = birthYear !== null && it.year >= birthYear
            return (
              <a
                key={`${it.year}-${it.title}`}
                href={it.href}
                title={`${it.year} · ${it.title}`}
                className={`tls-dot ${isActive ? 'is-active' : ''} ${inLifetime ? 'is-lifetime' : ''}`}
                style={{
                  left: `${((it.year - minYear) / span) * 100}%`,
                  background: it.color,
                }}
              >
                <span className="tls-dot-label">{it.emoji}</span>
                {isActive && <span className="tls-pointer" aria-hidden>▼</span>}
              </a>
            )
          })}
          {birthYear && birthYear >= minYear && birthYear <= maxYear && (
            <span
              className="tls-birth"
              style={{ left: `${((birthYear - minYear) / span) * 100}%` }}
              title={`Your birth year: ${birthYear}`}
            >
              <span className="tls-birth-pin" aria-hidden>★</span>
            </span>
          )}
        </div>
      </div>
      <style jsx>{`
        .tls {
          position: sticky; top: 0; z-index: 30;
          background: rgba(11, 18, 32, 0);
          padding: 8px 16px 4px;
          transition: background .3s, border .3s, padding .3s;
        }
        .tls.is-stuck {
          background: rgba(11, 18, 32, 0.85);
          backdrop-filter: blur(8px);
          padding-top: 14px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .tls-inner {
          max-width: 1100px; margin: 0 auto;
          position: relative;
          padding-top: 22px;
        }
        .tls-decades {
          position: absolute; top: 0; left: 0; right: 0;
          height: 18px;
        }
        .tls-decade {
          position: absolute;
          transform: translateX(-50%);
          font-size: 10px; font-weight: 800;
          color: #94a3b8;
          letter-spacing: 1px;
        }
        .tls-rail {
          position: relative;
          height: 32px;
        }
        .tls-line {
          position: absolute; left: 0; right: 0; top: 50%;
          height: 2px; transform: translateY(-50%);
          background: linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.18), rgba(255,255,255,0.06));
          border-radius: 999px;
        }
        .tls-dot {
          position: absolute; top: 50%;
          transform: translate(-50%, -50%);
          width: 14px; height: 14px;
          border-radius: 50%;
          display: grid; place-items: center;
          text-decoration: none;
          color: transparent;
          font-size: 0;
          border: 1.5px solid rgba(255,255,255,0.2);
          transition: transform .15s, box-shadow .15s, width .15s, height .15s;
          cursor: pointer;
        }
        .tls-dot:hover { transform: translate(-50%, -50%) scale(1.4); }
        .tls-dot.is-lifetime { border-color: #fbbf24; }
        .tls-dot.is-active {
          width: 22px; height: 22px;
          box-shadow: 0 0 0 4px rgba(255,255,255,0.12);
          font-size: 12px; color: #fff;
        }
        .tls-dot-label { font-size: 11px; line-height: 1; }
        .tls-pointer {
          position: absolute; top: -22px;
          color: #fde047; font-size: 14px;
        }
        .tls-birth {
          position: absolute; top: -8px;
          transform: translateX(-50%);
          color: #fbbf24;
          font-size: 12px;
          font-weight: 900;
          pointer-events: none;
        }
        .tls-birth-pin { display: inline-block; transform: translateY(-2px); }
        @media (max-width: 720px) {
          .tls-dot { width: 10px; height: 10px; }
          .tls-dot.is-active { width: 16px; height: 16px; }
          .tls-dot-label { display: none; }
        }
      `}</style>
    </div>
  )
}
