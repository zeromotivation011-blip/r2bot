import type { Metadata } from 'next'
import Link from 'next/link'
import InlineSignup from '@/components/InlineSignup'
import ShareBar from '@/components/ShareBar'
import { notFound } from 'next/navigation'
import { AI_TOPICS, getTopic } from '@/lib/ai-robotics'
import { DEMOS } from '../demos'

const BASE = 'https://www.r2bot.in'
export function generateStaticParams() { return AI_TOPICS.map((t) => ({ slug: t.slug })) }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const t = getTopic((await params).slug)
  if (!t) return {}
  return { title: t.title, description: t.short.slice(0, 158), alternates: { canonical: `${BASE}/ai-robotics/${t.slug}`, languages: { en: `${BASE}/ai-robotics/${t.slug}`, 'zh-CN': `${BASE}/zh/ai-robotics/${t.slug}`, hi: `${BASE}/hi/ai-robotics/${t.slug}`, es: `${BASE}/es/ai-robotics/${t.slug}` } } }
}

const box = { padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' } as const

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = getTopic((await params).slug)
  if (!t) notFound()
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Article', headline: t.title, description: t.short, author: { '@type': 'Organization', name: 'R2BOT' }, mainEntityOfPage: `${BASE}/ai-robotics/${t.slug}` },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: t.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ]
  const Demo = DEMOS[t.slug]
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '110px 20px 80px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Link href="/ai-robotics" style={{ color: 'var(--text-2)', fontSize: 13 }}>← AI and Robotics</Link>
      <h1 style={{ fontSize: 'clamp(28px,5vw,40px)', fontWeight: 900, color: '#fff', margin: '8px 0 6px' }}>{t.title}</h1>
      <p style={{ color: '#FC6818', fontSize: 13, fontWeight: 800, margin: '0 0 16px' }}>{t.level.toUpperCase()} · {t.minutes} MIN READ</p>
      <p style={{ color: '#e2e8f0', fontSize: 19, lineHeight: 1.6, margin: '0 0 18px' }}>{t.short}</p>
      {t.what.map((p, i) => <p key={i} style={{ color: 'var(--text-2)', fontSize: 17, lineHeight: 1.7 }}>{p}</p>)}

      {Demo && <Demo />}
      <div style={{ ...box, margin: '20px 0' }}>
        <div style={{ color: '#FC6818', fontWeight: 800, fontSize: 12 }}>REAL EXAMPLE</div>
        <p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.6 }}>{t.example}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12, marginBottom: 20 }}>
        <div style={box}><div style={{ color: '#4ade80', fontWeight: 800, fontSize: 12 }}>WITH IT YOU CAN</div><p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.6 }}>{t.withIt}</p></div>
        <div style={box}><div style={{ color: '#f87171', fontWeight: 800, fontSize: 12 }}>WITHOUT IT</div><p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.6 }}>{t.without}</p></div>
      </div>
      <div style={{ ...box, marginBottom: 24 }}>
        <div style={{ color: '#FC6818', fontWeight: 800, fontSize: 12 }}>TRY IT (5 MINUTES)</div>
        <p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.6 }}>{t.tryIt}</p>
      </div>

      <h2 style={{ color: '#fff', fontSize: 22 }}>Common questions</h2>
      {t.faq.map((f) => (
        <div key={f.q} style={{ margin: '12px 0' }}>
          <h3 style={{ color: '#fff', fontSize: 16, margin: '0 0 4px' }}>{f.q}</h3>
          <p style={{ color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>{f.a}</p>
        </div>
      ))}

      <h2 style={{ color: '#fff', fontSize: 22, marginTop: 28 }}>Keep learning</h2>
      <ul style={{ color: 'var(--text-2)', lineHeight: 1.9, paddingLeft: 20 }}>
        {t.related.map((r) => <li key={r.href}><Link href={r.href} style={{ color: '#FC6818' }}>{r.label}</Link></li>)}
        <li><Link href="/ai-robotics/glossary" style={{ color: '#FC6818' }}>AI and robotics glossary</Link></li>
      </ul>
      <ShareBar url={`${BASE}/ai-robotics/${t.slug}`} title={t.title} embedSlug={DEMOS[t.slug] ? t.slug : undefined} />
      <InlineSignup lang="en" />
    </main>
  )
}
