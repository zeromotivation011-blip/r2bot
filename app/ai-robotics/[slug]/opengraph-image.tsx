import { ImageResponse } from 'next/og'
import { getTopic } from '@/lib/ai-robotics'

export const alt = 'R2BOT AI and Robotics guide'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const t = getTopic((await params).slug)
  const title = t?.title ?? 'AI and Robotics'
  const short = t?.short ?? 'Plain-English guides'
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0B2540', padding: 70, color: '#fff' }}>
        <div style={{ display: 'flex', fontSize: 44, fontWeight: 800 }}>R<span style={{ color: '#FC6818' }}>2</span>BOT</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 26, color: '#FC6818', fontWeight: 700, marginBottom: 14 }}>AI AND ROBOTICS · PLAIN ENGLISH</div>
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
          <div style={{ display: 'flex', fontSize: 30, color: 'var(--text-2)', marginTop: 22, lineHeight: 1.4 }}>{short.length > 110 ? short.slice(0, 107) + '...' : short}</div>
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: 'var(--text-2)' }}>r2bot.in · free</div>
      </div>
    ),
    size,
  )
}
