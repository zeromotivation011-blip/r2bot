// Dynamic social preview card for each archived news story.
//
// The site's news links previously had no real OG image (only an SVG, which
// Twitter/LinkedIn/Facebook do not render). This renders a branded PNG card per
// story so shared /news/<slug> links show a proper preview.

import { ImageResponse } from 'next/og'
import { getArchivedNewsBySlug } from '@/lib/news'

export const alt = 'R2BOT robotics news'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const a = await getArchivedNewsBySlug(slug)

  const accent = '#00E5FF'
  const heading = a?.title ?? 'Robotics News'
  const source = a?.source ?? 'R2BOT'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0A0E17',
          padding: '64px 72px',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -160,
            right: -160,
            width: 620,
            height: 620,
            borderRadius: '50%',
            background: accent,
            opacity: 0.16,
            display: 'flex',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#E8ECF1', letterSpacing: -0.5, display: 'flex' }}>
            R2
            <span style={{ color: accent }}>BOT</span>
          </div>
          <div
            style={{
              display: 'flex',
              padding: '6px 14px',
              borderRadius: 999,
              border: `1px solid ${accent}66`,
              color: accent,
              fontSize: 17,
              fontWeight: 600,
            }}
          >
            Robotics News
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: heading.length > 80 ? 46 : heading.length > 50 ? 54 : 64,
              fontWeight: 800,
              color: '#FFFFFF',
              lineHeight: 1.1,
              letterSpacing: -1,
              display: 'flex',
              maxWidth: 1040,
            }}
          >
            {heading.length > 130 ? heading.slice(0, 127) + '…' : heading}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 22, color: '#6E7886' }}>
          <span style={{ display: 'flex', color: '#B0B8C5' }}>{source}</span>
          <span style={{ display: 'flex', color: '#334155' }}>·</span>
          <span style={{ display: 'flex' }}>Summarized &amp; decoded</span>
          <span style={{ display: 'flex', color: '#334155' }}>·</span>
          <span style={{ display: 'flex', color: accent }}>r2bot.in</span>
        </div>
      </div>
    ),
    size,
  )
}
