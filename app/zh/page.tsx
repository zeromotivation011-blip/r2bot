import type { Metadata } from 'next'
import Link from 'next/link'

const BASE = 'https://www.r2bot.in'
export const metadata: Metadata = {
  title: 'R2BOT 机器人学习：免费、通俗易懂',
  description: 'R2BOT 用通俗的中文讲解机器人和人工智能。免费的 AI 与机器人指南、词汇表和五门入门课程。',
  alternates: { canonical: `${BASE}/zh`, languages: { en: `${BASE}/`, 'zh-CN': `${BASE}/zh` } },
}
const card = { display: 'block', padding: 20, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none' } as const

export default function ZhHome() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '110px 20px 80px' }}>
      <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', fontWeight: 900, color: '#fff', margin: '0 0 12px' }}>免费学机器人，用最通俗的话</h1>
      <p style={{ color: '#cbd5e1', fontSize: 18, lineHeight: 1.8, maxWidth: 720 }}>R2BOT 把机器人和人工智能讲得简单易懂。每个知识点都告诉你：它是什么、能用它做什么、没有它会出什么问题。全部免费。</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 14, margin: '28px 0' }}>
        <Link href="/zh/ai-robotics" style={card}><div style={{ color: '#FC6818', fontWeight: 800, fontSize: 13 }}>AI 与机器人</div><div style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '6px 0' }}>12 篇通俗指南</div><div style={{ color: '#94a3b8', lineHeight: 1.7 }}>视觉、学习、SLAM、规划、大语言模型和安全。</div></Link>
        <Link href="/zh/ai-robotics/glossary" style={card}><div style={{ color: '#FC6818', fontWeight: 800, fontSize: 13 }}>词汇表</div><div style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '6px 0' }}>30 个常用术语</div><div style={{ color: '#94a3b8', lineHeight: 1.7 }}>每个词一句话讲清楚，附英文原词。</div></Link>
        <Link href="/zh/courses" style={card}><div style={{ color: '#FC6818', fontWeight: 800, fontSize: 13 }}>课程</div><div style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '6px 0' }}>五门免费入门课</div><div style={{ color: '#94a3b8', lineHeight: 1.7 }}>从机器人基础到机器人智能。视频为英文讲解。</div></Link>
      </div>
      <p style={{ color: '#94a3b8', lineHeight: 1.8 }}>说明：互动演示、模拟器和课程视频目前是英文界面。我们会逐步增加中文内容。<Link href="/" style={{ color: '#FC6818' }}>查看英文完整网站 →</Link></p>
    </main>
  )
}
