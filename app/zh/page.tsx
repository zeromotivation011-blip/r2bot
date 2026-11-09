import type { Metadata } from 'next'
import Link from 'next/link'
import { HREFLANG_HOME } from '@/lib/hreflang'

const BASE = 'https://www.r2bot.in'
export const metadata: Metadata = {
  title: 'R2BOT 机器人学习：免费、通俗易懂',
  description: 'R2BOT 用通俗的中文讲解机器人和人工智能。免费的 AI 与机器人指南、词汇表和五门入门课程。',
  alternates: { canonical: `${BASE}/zh`, languages: HREFLANG_HOME },
}

export default function ZhHome() {
  return (
    <main className="r2-wrap r2-wrap--narrow" style={{ paddingTop: 110, paddingBottom: 80 }}>
      <h1 className="r2-display">免费学机器人，用最通俗的话</h1>
      <p className="r2-lede">R2BOT 把机器人和人工智能讲得简单易懂。每个知识点都告诉你：它是什么、能用它做什么、没有它会出什么问题。全部免费。</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 14, margin: '28px 0' }}>
        <Link href="/zh/shorts" className="r2-card"><div className="r2-eyebrow" style={{ margin: 0 }}>快速课程</div><div className="r2-h3" style={{ margin: '6px 0' }}>47 节一分钟课程</div><div className="r2-meta" style={{ lineHeight: 1.7 }}>视频、动画演示、一道小测验。</div></Link>
        <Link href="/zh/ai-robotics" className="r2-card"><div className="r2-eyebrow" style={{ margin: 0 }}>AI 与机器人</div><div className="r2-h3" style={{ margin: '6px 0' }}>12 篇通俗指南</div><div className="r2-meta" style={{ lineHeight: 1.7 }}>视觉、学习、SLAM、规划、大语言模型和安全。</div></Link>
        <Link href="/zh/ai-robotics/glossary" className="r2-card"><div className="r2-eyebrow" style={{ margin: 0 }}>词汇表</div><div className="r2-h3" style={{ margin: '6px 0' }}>30 个常用术语</div><div className="r2-meta" style={{ lineHeight: 1.7 }}>每个词一句话讲清楚，附英文原词。</div></Link>
        <Link href="/zh/courses" className="r2-card"><div className="r2-eyebrow" style={{ margin: 0 }}>课程</div><div className="r2-h3" style={{ margin: '6px 0' }}>五门免费入门课</div><div className="r2-meta" style={{ lineHeight: 1.7 }}>从机器人基础到机器人智能。视频为英文讲解。</div></Link>
      </div>
      <p className="r2-body" style={{ lineHeight: 1.8 }}>说明：互动演示、模拟器和课程视频目前是英文界面。我们会逐步增加中文内容。<Link href="/" className="r2-link">查看英文完整网站 →</Link></p>
    </main>
  )
}
