import type { Metadata } from 'next'
import Link from 'next/link'
import InlineSignup from '@/components/InlineSignup'
import { ZH_TOPICS } from '@/lib/ai-robotics-zh'
import { HREFLANG_AI_HUB } from '@/lib/hreflang'

const BASE = 'https://www.r2bot.in'
export const metadata: Metadata = {
  title: 'AI 与机器人：通俗易懂的指南',
  description: '用简单的中文讲解人工智能如何在机器人里工作：视觉、学习、SLAM、路径规划、大语言模型和安全，每篇都有真实例子。免费。',
  alternates: { canonical: `${BASE}/zh/ai-robotics`, languages: HREFLANG_AI_HUB },
}
const card = { display: 'block', padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none' } as const

export default function ZhAiHub() {
  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '110px 20px 80px' }}>
      <Link href="/zh" style={{ color: 'var(--text-2)', fontSize: 13 }}>← 首页</Link>
      <h1 style={{ fontSize: 'clamp(30px,5vw,42px)', fontWeight: 900, color: '#fff', margin: '8px 0 10px' }}>AI 与机器人，通俗讲解</h1>
      <p style={{ color: 'var(--text-2)', fontSize: 18, lineHeight: 1.8, maxWidth: 740 }}>机器人要感知、思考、行动，人工智能是“思考”的一种方式。每篇指南说清三件事：它是什么、你能用它做什么、没有它会出什么问题。</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 14, margin: '24px 0' }}>
        {ZH_TOPICS.map((t) => (
          <Link key={t.slug} href={`/zh/ai-robotics/${t.slug}`} style={card}>
            <div style={{ color: '#FC6818', fontSize: 12, fontWeight: 800 }}>{t.level} · {t.minutes} 分钟</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 17, margin: '6px 0' }}>{t.title}</div>
            <div style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.7 }}>{t.short}</div>
          </Link>
        ))}
      </div>
      <InlineSignup lang="zh" />
      <p style={{ color: 'var(--text-2)' }}>不懂的词？<Link href="/zh/ai-robotics/glossary" style={{ color: '#FC6818', fontWeight: 700 }}>查看词汇表</Link>。想试互动演示？<Link href="/ai-robotics" style={{ color: '#FC6818', fontWeight: 700 }}>英文版有 10 个互动演示</Link>。</p>
    </main>
  )
}
