import type { Metadata } from 'next'
import Link from 'next/link'
import { ZH_COURSES } from '@/lib/ai-robotics-zh'
import { HREFLANG_COURSES } from '@/lib/hreflang'

const BASE = 'https://www.r2bot.in'
export const metadata: Metadata = {
  title: '免费机器人课程：五门入门课程',
  description: '五门免费的机器人入门课程，每课约四分钟，有测验、最终任务和可验证的证书。视频为英文讲解。',
  alternates: { canonical: `${BASE}/zh/courses`, languages: HREFLANG_COURSES },
}
export default function ZhCourses() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '110px 20px 80px' }}>
      <Link href="/zh" style={{ color: 'var(--text-2)', fontSize: 13 }}>← 首页</Link>
      <h1 style={{ fontSize: 'clamp(28px,5vw,40px)', fontWeight: 900, color: '#fff', margin: '8px 0 10px' }}>五门免费机器人课程</h1>
      <p style={{ color: 'var(--text-2)', fontSize: 17, lineHeight: 1.8 }}>按顺序学习，从“机器人是什么”到视觉和人工智能。每门课 10 节，每节约四分钟，有测验和最终任务，完成后可获得能在线验证的证书。<b>视频目前是英文讲解，配有英文字幕。</b></p>
      <ol style={{ listStyle: 'none', padding: 0, margin: '24px 0', display: 'grid', gap: 12 }}>
        {ZH_COURSES.map((c, i) => (
          <li key={c.slug}><Link href={`/courses/${c.slug}`} style={{ display: 'block', padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none' }}>
            <div style={{ color: '#FC6818', fontSize: 12, fontWeight: 800 }}>第 {i + 1} 门</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '4px 0' }}>{c.title} <span style={{ color: 'var(--text-2)', fontWeight: 400, fontSize: 14 }}>{c.en}</span></div>
            <div style={{ color: 'var(--text-2)', lineHeight: 1.7 }}>{c.tagline}</div>
          </Link></li>
        ))}
      </ol>
    </main>
  )
}
