import { ImageResponse } from 'next/og'

export const alt = 'Robot directory | R2BOT'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0B2540', padding: 70, color: '#fff' }}>
        <div style={{ display: 'flex', fontSize: 44, fontWeight: 800 }}>R<span style={{ color: '#FC6818' }}>2</span>BOT</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 80, fontWeight: 800, lineHeight: 1.1 }}>Robot directory</div>
          <div style={{ display: 'flex', fontSize: 34, color: 'var(--text-2)', marginTop: 22 }}>125 landmark robots to filter and compare</div>
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: 'var(--text-2)' }}>r2bot.in · free · plain English</div>
      </div>
    ),
    size,
  )
}
