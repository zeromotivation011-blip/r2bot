'use client'

// SimulationBlock — iframe wrapper for /visualizer/* routes.
// Listens for postMessage { type: 'TASK_COMPLETE', score } from the child.

import { useEffect, useRef, useState } from 'react'
import type { BlockRenderProps } from './BlockRegistry'
import type { ContentBlock } from '@/lib/academy'

type Props = BlockRenderProps & { block: Extract<ContentBlock, { type: 'simulation' }> }

const EMBED_BY_KIND: Partial<Record<string, string>> = {
  'line-follower': '/visualizer/line-follower',
  'pid-controller': '/visualizer/pid',
  'pathfinder': '/visualizer/pathfinder',
  'arm-kinematics': '/visualizer/arm',
  'sensor-fusion': '/visualizer/sensor-fusion',
  'grid-navigator': '/visualizer/grid',
}

export function SimulationBlock({ block, isCompleted, onComplete }: Props) {
  const data = block.data
  const [score, setScore] = useState<number | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  const src = data.embed_url || EMBED_BY_KIND[data.sim_type] || '/visualizer'

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const msg = e.data as { type?: string; score?: number; responseData?: unknown }
      if (!msg || typeof msg !== 'object') return
      if (msg.type === 'TASK_COMPLETE' && typeof msg.score === 'number') {
        setScore(msg.score)
        onComplete({ score: msg.score, responseData: msg.responseData })
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [onComplete])

  // Push config to iframe once loaded
  const handleLoad = () => {
    setLoading(false)
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'SET_TASK', config: data.config },
        '*',
      )
    } catch {
      /* cross-origin — ignore */
    }
  }

  return (
    <div className={`sb ${expanded ? 'is-expanded' : ''}`}>
      <header className="sb-head">
        <p className="sb-task">🎯 {data.task_description}</p>
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="sb-fs-btn"
          aria-label={expanded ? 'Exit fullscreen' : 'Expand to fullscreen'}
        >
          {expanded ? '⤡ Exit' : '⤢ Expand'}
        </button>
      </header>

      <div className="sb-frame">
        {loading && (
          <div className="sb-loading">
            <span className="sb-spinner" aria-hidden /> Loading simulator…
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={src}
          title={`Simulation: ${data.sim_type}`}
          onLoad={handleLoad}
          allow="accelerometer; gyroscope; xr-spatial-tracking"
        />
      </div>

      <p className="sb-success">✓ Success when: {data.success_condition}</p>

      <div className="sb-actions">
        {!isCompleted && (
          <button
            type="button"
            onClick={() => onComplete({ score: score ?? 100, responseData: { manuallyMarked: true } })}
            className="sb-skip"
          >
            I&apos;ve completed the task →
          </button>
        )}
        {score !== null && <p className="sb-score">Score: {score}</p>}
      </div>

      <style jsx>{`
        .sb { display: flex; flex-direction: column; gap: 10px; }
        .sb.is-expanded {
          position: fixed; inset: 16px; z-index: 100;
          background: #0f0a1e;
          padding: 18px; border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.15);
          box-shadow: 0 30px 80px rgba(0,0,0,0.6);
        }
        .sb-head { display: flex; gap: 10px; align-items: center; }
        .sb-task {
          flex: 1; margin: 0;
          color: #fde047; font-weight: 800; font-size: 14px;
        }
        .sb-fs-btn {
          padding: 6px 12px; border-radius: 8px;
          background: rgba(255,255,255,0.06);
          color: #c4b5fd;
          border: 1px solid rgba(255,255,255,0.15);
          font-weight: 700; cursor: pointer; font-size: 12px;
        }
        .sb-frame {
          position: relative;
          aspect-ratio: 16 / 10;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.1);
          background: #0b1220;
        }
        .sb.is-expanded .sb-frame { aspect-ratio: auto; flex: 1; }
        .sb-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
        .sb.is-expanded .sb-frame iframe { position: relative; }
        .sb-loading {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          gap: 10px;
          color: #94a3b8; font-weight: 700;
        }
        .sb-spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.2);
          border-top-color: #00E5FF;
          border-radius: 50%;
          animation: sb-spin 1s linear infinite;
        }
        @keyframes sb-spin { to { transform: rotate(360deg); } }
        .sb-success {
          margin: 0;
          font-size: 13px; color: #6ee7b7;
          padding: 8px 12px;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 8px;
        }
        .sb-actions { display: flex; gap: 10px; align-items: center; }
        .sb-skip {
          min-height: 40px; padding: 0 16px;
          background: rgba(0,229,255,0.12);
          color: #00E5FF;
          border: 1px solid rgba(0,229,255,0.3);
          border-radius: 8px;
          font-weight: 800; font-size: 13px;
          cursor: pointer;
        }
        .sb-score { color: #fde047; font-weight: 800; margin: 0; }
      `}</style>
    </div>
  )
}
