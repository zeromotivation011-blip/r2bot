import type { Metadata } from 'next'
import Link from 'next/link'
import { SHORTS, SHORT_COURSES, shortsInCourse } from '@/lib/shorts'
import { ProgressBar, Tick } from '@/components/shorts/ShortsClient'
import InlineSignup from '@/components/InlineSignup'

const BASE = 'https://www.r2bot.in'
export const revalidate = 86400
export const metadata: Metadata = {
  title: 'Quick Lessons: How Robots Work in 60 Seconds',
  description: 'Free one-minute robotics lessons with video, animated demos and a quick check. Sensors, motors, control, hands and robots at work, in plain English.',
  alternates: { canonical: `${BASE}/shorts`, languages: { en: `${BASE}/shorts`, 'zh-CN': `${BASE}/zh/shorts` } },
}

export default function ShortsHub() {
  const ld = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: 'R2BOT Quick Lessons',
    itemListElement: SHORTS.map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: `${BASE}/shorts/${s.slug}`, name: s.title })),
  }
  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '110px 20px 80px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <h1 style={{ fontSize: 'clamp(30px,5vw,46px)', fontWeight: 900, color: '#fff', margin: 0 }}>Quick Lessons: how robots work in one minute</h1>
      <p style={{ color: '#cbd5e1', fontSize: 19, lineHeight: 1.6, maxWidth: 720 }}>Watch a one-minute video, play with a live demo, answer one question. Five short courses, {SHORTS.length} lessons, all free.</p>
      <ProgressBar slugs={SHORTS.map((s) => s.slug)} />
      {SHORT_COURSES.map((c) => (
        <section key={c.slug} style={{ margin: '32px 0' }}>
          <h2 style={{ color: '#fff', fontSize: 24, margin: 0 }}>{c.icon} {c.title}</h2>
          <p style={{ color: '#94a3b8', margin: '4px 0 14px' }}>{c.blurb}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
            {shortsInCourse(c.slug).map((s) => (
              <Link key={s.slug} href={`/shorts/${s.slug}`} style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', textDecoration: 'none' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${s.ids[0]}/mqdefault.jpg`} alt="" width={64} height={114} loading="lazy" style={{ borderRadius: 8, objectFit: 'cover', width: 64, height: 114 }} />
                <span><span style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.35 }}>{s.title.split(':')[0]} <Tick slug={s.slug} /></span><br /><span style={{ color: '#94a3b8', fontSize: 13 }}>{s.summary.slice(0, 80)}…</span></span>
              </Link>
            ))}
          </div>
        </section>
      ))}
      <div style={{ marginTop: 40 }}><InlineSignup /></div>
      <p style={{ marginTop: 24 }}><Link href="/courses" style={{ color: '#FC6818' }}>Want the full video course path? See the 5 courses →</Link></p>
    </main>
  )
}
