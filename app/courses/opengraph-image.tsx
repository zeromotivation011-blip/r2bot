import { ImageResponse } from 'next/og'

export const alt = 'Five free robotics courses | R2BOT'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0B2540', padding: 70, color: '#fff' }}>
        <div style={{ display: 'flex', fontSize: 44, fontWeight: 800 }}>R<span style={{ color: '#FC6818' }}>2</span>BOT</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 80, fontWeight: 800, lineHeight: 1.1 }}>Five free robotics courses</div>
          <div style={{ display: 'flex', fontSize: 34, color: '#cbd5e1', marginTop: 22 }}>Quizzes, a final activity and a certificate for each</div>
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#94a3b8' }}>r2bot.in · free · plain English</div>
      </div>
    ),
    size,
  )
}
