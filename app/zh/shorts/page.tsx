import type { Metadata } from 'next'
import Link from 'next/link'
import { SHORTS, SHORT_COURSES, shortsInCourse } from '@/lib/shorts'
import { SHORTS_ZH } from '@/lib/shorts-zh'
import { ProgressBar, Tick } from '@/components/shorts/ShortsClient'
import InlineSignup from '@/components/InlineSignup'

const BASE = 'https://www.r2bot.in'
export const revalidate = 86400
export const metadata: Metadata = {
  title: '一分钟学机器人：快速课程',
  description: '免费的一分钟机器人课程：视频、动画互动演示和一道小测验。传感器、电机、控制、手和工作中的机器人，通俗易懂。',
  alternates: { canonical: `${BASE}/zh/shorts`, languages: { en: `${BASE}/shorts`, 'zh-CN': `${BASE}/zh/shorts`, hi: `${BASE}/hi/shorts` } },
}
const ZH_COURSE: Record<string, { t: string; b: string }> = {
  senses: { t: '机器人如何感知', b: '声音、视觉、听觉和平衡感知。' },
  motion: { t: '电机与机械', b: '齿轮、伺服、机械臂和精准重复。' },
  control: { t: '控制与平衡', b: '反馈、站稳、沿线行驶。' },
  hands: { t: '手与触觉', b: '轻柔的抓握、假肢和手术机器人。' },
  work: { t: '工作中的机器人', b: '扫地机器人、仓库和楼梯难题。' },
}

export default function ZhShortsHub() {
  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '110px 20px 80px' }}>
      <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', fontWeight: 900, color: '#fff', margin: 0 }}>一分钟学机器人：快速课程</h1>
      <p style={{ color: '#cbd5e1', fontSize: 18, lineHeight: 1.7, maxWidth: 720 }}>看一分钟视频，玩一个实时演示，答一道题。五个小课程，共 {SHORTS.length} 节课，全部免费。</p>
      <ProgressBar slugs={SHORTS.map((s) => s.slug)} lang="zh" />
      {SHORT_COURSES.map((c) => (
        <section key={c.slug} style={{ margin: '32px 0' }}>
          <h2 style={{ color: '#fff', fontSize: 24, margin: 0 }}>{c.icon} {ZH_COURSE[c.slug].t}</h2>
          <p style={{ color: '#94a3b8', margin: '4px 0 14px' }}>{ZH_COURSE[c.slug].b}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
            {shortsInCourse(c.slug).map((s) => (
              <Link key={s.slug} href={`/zh/shorts/${s.slug}`} style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', textDecoration: 'none' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${s.ids[0]}/mqdefault.jpg`} alt="" width={64} height={114} loading="lazy" style={{ borderRadius: 8, objectFit: 'cover', width: 64, height: 114 }} />
                <span><span style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.4 }}>{SHORTS_ZH[s.slug].title.split('：')[0]} <Tick slug={s.slug} /></span><br /><span style={{ color: '#94a3b8', fontSize: 13 }}>{SHORTS_ZH[s.slug].summary.slice(0, 36)}…</span></span>
              </Link>
            ))}
          </div>
        </section>
      ))}
      <div style={{ marginTop: 40 }}><InlineSignup lang="zh" /></div>
      <p style={{ marginTop: 24 }}><Link href="/zh/ai-robotics" style={{ color: '#FC6818' }}>继续读：AI 与机器人 →</Link></p>
    </main>
  )
}
