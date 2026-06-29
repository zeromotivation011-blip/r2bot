'use client'

// components/atlas/ConceptHero.tsx
// Layer 1 of the new concept detail page: hook line + hero image + YouTube
// embed shown ABOVE the fold so learners actually see the video.

import { useState } from 'react'

interface ConceptHeroProps {
  hookLine?: string
  conceptImage?: string
  youtubeId?: string
  difficultyLevel?: number
  estimatedReadTime?: number
  xpValue?: number
  title: string
  bucketLabel?: string
}

export function ConceptHero({
  hookLine, conceptImage, youtubeId, difficultyLevel,
  estimatedReadTime, xpValue, title, bucketLabel,
}: ConceptHeroProps) {
  const [videoOpen, setVideoOpen] = useState(false)
  if (!hookLine && !conceptImage && !youtubeId) return null

  return (
    <section className="ch" aria-label="Concept hero">
      {hookLine && (
        <p className="ch-hook slide-reveal">{hookLine}</p>
      )}
      {(difficultyLevel || estimatedReadTime || xpValue) && (
        <div className="ch-badges">
          {bucketLabel && <span className="ch-badge ch-badge-bucket">{bucketLabel}</span>}
          {difficultyLevel && (
            <span className="ch-badge">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} style={{ opacity: i < difficultyLevel ? 1 : 0.25 }}>★</span>
              ))}
            </span>
          )}
          {estimatedReadTime && <span className="ch-badge">⏱ {estimatedReadTime} min</span>}
          {typeof xpValue === 'number' && <span className="ch-badge ch-badge-xp">+{xpValue} XP</span>}
        </div>
      )}

      <div className="ch-media">
        {conceptImage && (
          <img src={conceptImage} alt={title} className="ch-image" />
        )}
        {youtubeId && (
          <div className="ch-video">
            {!videoOpen ? (
              <button
                type="button"
                className="ch-video-cover"
                onClick={() => setVideoOpen(true)}
                aria-label={`Play video for ${title}`}
              >
                <img
                  src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
                  alt=""
                  loading="lazy"
                />
                <span className="ch-play" aria-hidden>▶</span>
                <span className="ch-video-label">📹 Watch · 1 video</span>
              </button>
            ) : (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                title={`Video: ${title}`}
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .ch {
          margin: 14px 0 28px;
          padding: 18px;
          background: linear-gradient(135deg, rgba(124,58,237,0.08), rgba(0,229,255,0.05));
          border: 1px solid rgba(124,58,237,0.3);
          border-radius: 18px;
          color: #f4f4f5;
        }
        .ch-hook {
          font-size: clamp(18px, 2.4vw, 22px);
          line-height: 1.45;
          color: #fde047;
          font-weight: 800;
          margin: 0 0 12px;
        }
        .ch-badges {
          display: flex; gap: 8px; flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .ch-badge {
          font-size: 11px; letter-spacing: 1px;
          padding: 4px 10px; border-radius: 999px;
          background: rgba(255,255,255,0.06);
          color: #c4b5fd;
          font-weight: 800;
        }
        .ch-badge-bucket {
          background: rgba(0,229,255,0.14);
          color: #00E5FF;
        }
        .ch-badge-xp {
          background: rgba(251,191,36,0.18);
          color: #fbbf24;
        }
        .ch-media {
          display: grid;
          gap: 14px;
          ${false ? 'grid-template-columns: 1fr 1fr;' : ''}
        }
        @media (min-width: 720px) {
          .ch-media:has(.ch-image):has(.ch-video) {
            grid-template-columns: 1fr 1fr;
          }
        }
        .ch-image {
          width: 100%; max-height: 280px; object-fit: contain;
          border-radius: 12px;
          background: rgba(0,0,0,0.2);
        }
        .ch-video {
          position: relative;
          aspect-ratio: 16/9;
          border-radius: 12px;
          overflow: hidden;
          background: #000;
        }
        .ch-video iframe {
          width: 100%; height: 100%; border: 0;
        }
        .ch-video-cover {
          position: relative;
          width: 100%; height: 100%;
          background: transparent;
          border: none; padding: 0;
          cursor: pointer;
        }
        .ch-video-cover img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .ch-play {
          position: absolute; left: 50%; top: 50%;
          transform: translate(-50%, -50%);
          width: 72px; height: 72px;
          background: rgba(255, 0, 0, 0.85);
          color: white;
          font-size: 28px;
          border-radius: 50%;
          display: grid; place-items: center;
          box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        }
        .ch-video-label {
          position: absolute; left: 12px; bottom: 12px;
          background: rgba(0,0,0,0.7);
          color: #fff;
          font-size: 11px; font-weight: 800;
          padding: 4px 10px; border-radius: 6px;
        }
      `}</style>
    </section>
  )
}
