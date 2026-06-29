'use client'

// VideoBlock — YouTube/Vimeo/self-hosted embed with transcript + chapters.
// Completes after watching `completion_threshold` of the runtime (default 80%).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BlockRenderProps } from './BlockRegistry'
import type { ContentBlock } from '@/lib/academy'

type Props = BlockRenderProps & { block: Extract<ContentBlock, { type: 'video' }> }

export function VideoBlock({ block, isCompleted, onComplete }: Props) {
  const data = block.data
  const threshold = data.completion_threshold ?? 0.8

  const [watched, setWatched] = useState(0)             // seconds watched (best-effort)
  const [showTranscript, setShowTranscript] = useState(false)
  const [hindi, setHindi] = useState(false)
  const [iframeKey] = useState(() => `vid-${block.id}`)
  const completedRef = useRef(false)
  const startTs = useRef(Date.now())

  // YouTube: we don't have a JS API hook into the iframe without IFrame API.
  // Heuristic: count wall-clock seconds while the iframe is in view + window focused.
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null
    const tick = () => {
      if (document.hidden) return
      setWatched(prev => prev + 1)
    }
    id = setInterval(tick, 1000)
    return () => { if (id) clearInterval(id) }
  }, [])

  useEffect(() => {
    if (completedRef.current || isCompleted) return
    const frac = data.duration_seconds > 0 ? watched / data.duration_seconds : 1
    if (frac >= threshold) {
      completedRef.current = true
      onComplete({ score: 100, responseData: { watchedSec: watched } })
    }
  }, [watched, data.duration_seconds, threshold, isCompleted, onComplete])

  const embedUrl = useMemo(() => {
    if (data.provider === 'youtube') {
      return `https://www.youtube-nocookie.com/embed/${data.video_id}?rel=0&modestbranding=1`
    }
    if (data.provider === 'vimeo') {
      return `https://player.vimeo.com/video/${data.video_id}`
    }
    return data.video_id
  }, [data.provider, data.video_id])

  const elapsed = Math.floor((Date.now() - startTs.current) / 1000)
  const pct = data.duration_seconds > 0
    ? Math.min(100, Math.round((watched / data.duration_seconds) * 100))
    : 0

  const transcript = hindi && data.transcript_hi ? data.transcript_hi : data.transcript_en
  const hasHindi = Boolean(data.transcript_hi)

  return (
    <div className="vb">
      <h3 className="vb-title">{data.title}</h3>
      <div className="vb-frame">
        <iframe
          key={iframeKey}
          src={embedUrl}
          title={data.title}
          frameBorder={0}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {data.chapters.length > 0 && (
        <ul className="vb-chapters">
          {data.chapters.map((c, i) => (
            <li key={i}>
              <span className="vb-chap-time">{fmt(c.time)}</span>
              <span className="vb-chap-label">{c.label}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="vb-progress" aria-label="Estimated watch progress">
        <div className="vb-progress-fill" style={{ width: `${pct}%` }} />
        <span className="vb-progress-label">
          {isCompleted ? '✓ Watched' : `~${pct}% watched · need ${Math.round(threshold * 100)}%`}
        </span>
      </div>

      <div className="vb-actions">
        <button
          type="button"
          onClick={() => setShowTranscript(s => !s)}
          className="vb-transcript-btn"
        >
          {showTranscript ? 'Hide transcript' : 'Show transcript'}
        </button>
        {hasHindi && (
          <button
            type="button"
            onClick={() => setHindi(h => !h)}
            className="vb-lang-btn"
          >
            {hindi ? 'English' : 'हिन्दी'}
          </button>
        )}
        {!isCompleted && elapsed > 8 && (
          <button
            type="button"
            onClick={() => onComplete({ score: 100, responseData: { manuallyMarked: true } })}
            className="vb-skip-btn"
          >
            I&apos;ve watched it →
          </button>
        )}
      </div>

      {showTranscript && (
        <div className="vb-transcript">
          {transcript.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}
        </div>
      )}

      <style jsx>{`
        .vb { display: flex; flex-direction: column; gap: 12px; }
        .vb-title { margin: 0; font-size: 18px; font-weight: 800; color: #fde047; }
        .vb-frame {
          position: relative;
          aspect-ratio: 16 / 9;
          border-radius: 14px;
          overflow: hidden;
          background: #000;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .vb-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; }
        .vb-chapters {
          list-style: none; padding: 0; margin: 0;
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px;
          font-size: 13px; color: #c4b5fd;
        }
        .vb-chapters li {
          display: flex; gap: 8px;
          padding: 6px 10px;
          background: rgba(255,255,255,0.04);
          border-radius: 6px;
        }
        .vb-chap-time { color: #fde047; font-weight: 800; font-variant-numeric: tabular-nums; min-width: 42px; }
        .vb-progress {
          position: relative;
          height: 8px;
          background: rgba(255,255,255,0.08);
          border-radius: 999px;
          overflow: hidden;
        }
        .vb-progress-fill {
          position: absolute; inset: 0;
          background: linear-gradient(90deg, #00E5FF, #10b981);
          transition: width 0.4s ease;
        }
        .vb-progress-label {
          position: absolute; right: 8px; top: -22px;
          font-size: 11px; font-weight: 800;
          color: #94a3b8;
        }
        .vb-actions { display: flex; flex-wrap: wrap; gap: 8px; }
        .vb-transcript-btn, .vb-lang-btn, .vb-skip-btn {
          min-height: 40px; padding: 0 14px;
          font-weight: 800; font-size: 13px;
          border-radius: 10px; cursor: pointer;
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.04);
          color: #c4b5fd;
        }
        .vb-skip-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white; border-color: transparent;
        }
        .vb-transcript {
          max-height: 280px; overflow-y: auto;
          padding: 14px;
          background: rgba(15,18,32,0.6);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          font-size: 14px;
          color: #c8d0dc;
          line-height: 1.5;
        }
        .vb-transcript p { margin: 0 0 8px; }
      `}</style>
    </div>
  )
}

function fmt(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}
