// app/kids/opengraph-image.tsx — the R2BOT Kids share card (roadmap #19).
//
// 1200×630, drawn at build time: kids navy, R2BOT orange, Spark the robot and
// the four course planets, so a link to /kids shared in a parents' group or a
// school newsletter looks like the kids product, not the adult site. Nested
// /kids pages that do not set their own image inherit it. Counts come from the
// data (never typed).

import { ImageResponse } from 'next/og'
import { GAMES, WORLDS } from '@/lib/kids/universe/worlds'

export const alt = 'R2BOT Kids: explore the Robot Universe, ages 5 to 17'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const PLANETS = [
  { c1: '#FFA878', c2: '#FC6818', label: '5–7' },
  { c1: '#67E8F9', c2: '#00B8D4', label: '8–10' },
  { c1: '#86EFAC', c2: '#22C55E', label: '11–13' },
  { c1: '#FDE68A', c2: '#F59E0B', label: '14–17' },
]

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: 'linear-gradient(160deg, #0A1120 0%, #111C32 60%, #19263F 100%)',
          color: '#EEF2F8',
          padding: 64,
          position: 'relative',
        }}
      >
        {/* Stars */}
        {[
          [90, 520, 3],
          [372, 34, 2],
          [600, 612, 2],
          [640, 40, 3],
          [1130, 600, 2],
          [760, 590, 2],
        ].map(([x, y, r], i) => (
          <div key={i} style={{ position: 'absolute', left: x, top: y, width: r * 2, height: r * 2, borderRadius: r, background: '#FFFFFF', opacity: 0.55 }} />
        ))}

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 690 }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 40, fontWeight: 800 }}>
            R<span style={{ color: '#FC6818' }}>2</span>BOT
            <span style={{ marginLeft: 14, padding: '6px 18px', borderRadius: 999, background: '#FC6818', color: '#1A1103', fontSize: 30 }}>Kids</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 78, fontWeight: 800, lineHeight: 1.05 }}>Explore the</div>
            <div style={{ display: 'flex', fontSize: 78, fontWeight: 800, lineHeight: 1.05, color: '#FF8A4C' }}>Robot Universe</div>
            <div style={{ display: 'flex', fontSize: 32, color: '#A7B0C0', marginTop: 24, lineHeight: 1.35 }}>
              {`A story-led robotics course, ${GAMES.length} real-physics games and ${WORLDS.length} worlds. Build and code your own robot.`}
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: 28, color: '#A7B0C0' }}>
            <span style={{ color: '#00E5FF', fontWeight: 700 }}>Ages 5–17</span>
            <span style={{ margin: '0 14px' }}>·</span>
            homes and schools
            <span style={{ margin: '0 14px' }}>·</span>
            r2bot.in/kids
          </div>
        </div>

        {/* Spark and the four planets */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <svg width="300" height="300" viewBox="0 0 40 40">
            <circle cx="20" cy="22" r="17" fill="#FC6818" opacity="0.14" />
            <rect x="9" y="11" width="22" height="18" rx="7" fill="#FF8A4C" />
            <rect x="12" y="15" width="16" height="9" rx="4" fill="#0A1120" />
            <circle cx="16.5" cy="19.5" r="2.2" fill="#00E5FF" />
            <circle cx="23.5" cy="19.5" r="2.2" fill="#00E5FF" />
            <line x1="20" y1="11" x2="20" y2="6.5" stroke="#FF8A4C" strokeWidth="2" strokeLinecap="round" />
            <circle cx="20" cy="5.5" r="2" fill="#FFA878" />
            <rect x="13" y="30" width="14" height="5" rx="2.5" fill="#19263F" />
          </svg>
          <div style={{ display: 'flex', marginTop: 22 }}>
            {PLANETS.map((p) => (
              <div key={p.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 12px' }}>
                <div style={{ width: 70, height: 70, borderRadius: 35, background: `linear-gradient(135deg, ${p.c1}, ${p.c2})`, display: 'flex' }} />
                <div style={{ display: 'flex', fontSize: 22, color: '#A7B0C0', marginTop: 8 }}>{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  )
}
