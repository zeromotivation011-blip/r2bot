'use client'

// TextBlock — renders MDX-ish markdown content. Completes after the learner
// has scrolled most of the way through, or clicks the explicit "Got it" button.

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { BlockRenderProps } from './BlockRegistry'
import type { ContentBlock } from '@/lib/academy'

type Props = BlockRenderProps & { block: Extract<ContentBlock, { type: 'text' }> }

export function TextBlock({ block, isCompleted, onComplete }: Props) {
  const data = block.data
  const [hindi, setHindi] = useState(false)
  const [scrolledThrough, setScrolledThrough] = useState(isCompleted)
  const contentRef = useRef<HTMLDivElement | null>(null)

  // Observe scroll within the content area; mark scrolledThrough when the
  // bottom is in view OR the user has scrolled past 75% of the block height.
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setScrolledThrough(true)
            obs.disconnect()
          }
        }
      },
      { threshold: 0.5 },
    )
    // Sentinel at the end of the block
    const sentinel = document.createElement('div')
    sentinel.style.height = '1px'
    el.appendChild(sentinel)
    obs.observe(sentinel)
    return () => {
      obs.disconnect()
      try { el.removeChild(sentinel) } catch { /* noop */ }
    }
  }, [])

  const content = hindi && data.content_hi ? data.content_hi : data.content_mdx
  const hasHindi = Boolean(data.content_hi)

  return (
    <div className="tb">
      <div className="tb-meta">
        <span>📖 ~{data.estimated_read_minutes} min read</span>
        {hasHindi && (
          <button type="button" onClick={() => setHindi(h => !h)} className="tb-lang">
            {hindi ? 'English' : 'हिन्दी'}
          </button>
        )}
      </div>

      <div ref={contentRef} className="tb-content prose-acad">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>

      {!isCompleted && (
        <button
          type="button"
          onClick={() => onComplete({ score: 100 })}
          disabled={!scrolledThrough}
          className="tb-done"
        >
          {scrolledThrough ? 'Got it — continue →' : 'Read to the end first'}
        </button>
      )}

      <style jsx>{`
        .tb { display: flex; flex-direction: column; gap: 14px; }
        .tb-meta {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 12px; color: #94a3b8; font-weight: 700;
        }
        .tb-lang {
          padding: 6px 12px; border-radius: 999px;
          background: rgba(0,184,212,0.1); color: #00E5FF;
          border: 1px solid rgba(0,184,212,0.3);
          font-weight: 800; cursor: pointer; font-size: 12px;
        }
        .tb-content { color: #c8d0dc; line-height: 1.65; font-size: 16px; }
        .tb-done {
          min-height: 48px; padding: 0 22px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none; border-radius: 12px;
          font-weight: 800; font-size: 14px;
          cursor: pointer;
          align-self: flex-start;
        }
        .tb-done:disabled {
          opacity: 0.5; cursor: not-allowed;
          background: rgba(255,255,255,0.06);
          color: #94a3b8;
        }
      `}</style>
      <style jsx global>{`
        .prose-acad h1, .prose-acad h2, .prose-acad h3 {
          color: #fde047; font-weight: 900;
          margin-top: 1.4em; margin-bottom: 0.5em;
        }
        .prose-acad h1 { font-size: 24px; }
        .prose-acad h2 { font-size: 20px; }
        .prose-acad h3 { font-size: 17px; }
        .prose-acad p { margin: 0 0 14px; }
        .prose-acad ul, .prose-acad ol { padding-left: 22px; margin: 0 0 14px; }
        .prose-acad li { margin-bottom: 4px; }
        .prose-acad code {
          background: rgba(255,255,255,0.06);
          padding: 2px 6px; border-radius: 4px;
          font-size: 13px; color: #fbbf24;
        }
        .prose-acad pre {
          background: #0b1220;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 14px; overflow-x: auto;
          font-size: 13px; line-height: 1.5;
        }
        .prose-acad blockquote {
          border-left: 3px solid #fbbf24;
          padding-left: 14px; color: #fde68a;
          margin: 14px 0;
        }
        .prose-acad a { color: #00E5FF; text-decoration: underline; }
      `}</style>
    </div>
  )
}
