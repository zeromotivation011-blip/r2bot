import type { Metadata } from 'next'
import Link from 'next/link'
import InlineSignup from '@/components/InlineSignup'
import { notFound } from 'next/navigation'
import { HI_TOPICS, getHiTopic } from '@/lib/ai-robotics-hi'

const BASE = 'https://www.r2bot.in'
export function generateStaticParams() { return HI_TOPICS.map((t) => ({ slug: t.slug })) }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug
  const t = getHiTopic(slug)
  if (!t) return {}
  return { title: t.title, description: t.short.slice(0, 150),
    alternates: { canonical: `${BASE}/hi/ai-robotics/${slug}`, languages: { en: `${BASE}/ai-robotics/${slug}`, hi: `${BASE}/hi/ai-robotics/${slug}` } } }
}
const box = { padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' } as const

export default async function HiTopic({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug
  const t = getHiTopic(slug)
  if (!t) notFound()
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Article', inLanguage: 'hi', headline: t.title, description: t.short, author: { '@type': 'Organization', name: 'R2BOT' } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: 'hi', mainEntity: t.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ]
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '110px 20px 80px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Link href="/hi/ai-robotics" style={{ color: '#94a3b8', fontSize: 13 }}>← AI और रोबोटिक्स</Link>
      <h1 style={{ fontSize: 'clamp(28px,5vw,38px)', fontWeight: 900, color: '#fff', margin: '8px 0 6px', lineHeight: 1.4 }}>{t.title}</h1>
      <p style={{ color: '#FC6818', fontSize: 13, fontWeight: 800, margin: '0 0 16px' }}>{t.level} · पढ़ने में लगभग {t.minutes} मिनट</p>
      <p style={{ color: '#e2e8f0', fontSize: 19, lineHeight: 1.9 }}>{t.short}</p>
      {t.what.map((p, i) => <p key={i} style={{ color: '#cbd5e1', fontSize: 17, lineHeight: 2 }}>{p}</p>)}
      <div style={{ ...box, margin: '20px 0' }}><div style={{ color: '#FC6818', fontWeight: 800, fontSize: 13 }}>असली उदाहरण</div><p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.9 }}>{t.example}</p></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12, marginBottom: 20 }}>
        <div style={box}><div style={{ color: '#4ade80', fontWeight: 800, fontSize: 13 }}>इसके साथ आप क्या कर सकते हैं</div><p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.9 }}>{t.withIt}</p></div>
        <div style={box}><div style={{ color: '#f87171', fontWeight: 800, fontSize: 13 }}>इसके बिना क्या होता है</div><p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.9 }}>{t.without}</p></div>
      </div>
      <div style={{ ...box, marginBottom: 24 }}><div style={{ color: '#FC6818', fontWeight: 800, fontSize: 13 }}>खुद आज़माइए (5 मिनट)</div><p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.9 }}>{t.tryIt}</p></div>
      <h2 style={{ color: '#fff', fontSize: 22 }}>अक्सर पूछे जाने वाले सवाल</h2>
      {t.faq.map((f) => <div key={f.q} style={{ margin: '12px 0' }}><h3 style={{ color: '#fff', fontSize: 16, margin: '0 0 4px' }}>{f.q}</h3><p style={{ color: '#cbd5e1', margin: 0, lineHeight: 1.9 }}>{f.a}</p></div>)}
      <InlineSignup lang="hi" />
      <p style={{ color: '#cbd5e1', marginTop: 28, lineHeight: 2 }}>खेलकर सीखना चाहते हैं? <Link href={`/ai-robotics/${t.slug}`} style={{ color: '#FC6818', fontWeight: 700 }}>अंग्रेज़ी पेज पर इंटरैक्टिव डेमो खोलिए →</Link> · <Link href="/hi/ai-robotics/glossary" style={{ color: '#FC6818' }}>शब्दावली</Link></p>
    </main>
  )
}
