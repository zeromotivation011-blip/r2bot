// Dynamic social preview card for each simulator.
//
// The site previously had no OG images at all, so every link posted to Reddit,
// X or LinkedIn rendered as a bare text row. A link with a real preview card
// gets meaningfully more clicks, and these pages exist to be shared.

import { ImageResponse } from 'next/og'
import { getSimulator, resolveSimulatorId, SIMULATORS } from '@/lib/simulators'

export const alt = 'R2BOT interactive robotics simulator'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export function generateStaticParams() {
  return SIMULATORS.map((s) => ({ slug: s.id }))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const id = resolveSimulatorId(slug)
  const sim = id ? getSimulator(id) : undefined

  const heading = sim?.heading ?? 'Interactive Robotics Simulators'
  const blurb = sim?.blurb ?? 'Free, hands-on robotics tools that run in your browser.'
  const accent = sim?.accent ?? '#FFB020'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#050810',
          padding: '64px 72px',
          position: 'relative',
        }}
      >
        {/* Accent wash so the card reads as branded at thumbnail size */}
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
            Interactive simulator
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: heading.length > 44 ? 60 : 70,
              fontWeight: 800,
              color: '#FFFFFF',
              lineHeight: 1.08,
              letterSpacing: -1.5,
              display: 'flex',
            }}
          >
            {heading}
          </div>
          <div style={{ marginTop: 22, fontSize: 28, color: '#B0B8C5', lineHeight: 1.35, display: 'flex', maxWidth: 940 }}>
            {blurb}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 22, color: '#6E7886' }}>
          <span style={{ display: 'flex' }}>Free</span>
          <span style={{ display: 'flex', color: '#334155' }}>·</span>
          <span style={{ display: 'flex' }}>No signup</span>
          <span style={{ display: 'flex', color: '#334155' }}>·</span>
          <span style={{ display: 'flex' }}>Runs in your browser</span>
          <span style={{ display: 'flex', color: '#334155' }}>·</span>
          <span style={{ display: 'flex', color: accent }}>r2bot.in</span>
        </div>
      </div>
    ),
    size,
  )
}
