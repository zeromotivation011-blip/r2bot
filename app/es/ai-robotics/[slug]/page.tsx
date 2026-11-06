import type { Metadata } from 'next'
import Link from 'next/link'
import InlineSignup from '@/components/InlineSignup'
import { notFound } from 'next/navigation'
import { ES_TOPICS, getEsTopic } from '@/lib/ai-robotics-es'

const BASE = 'https://www.r2bot.in'
export function generateStaticParams() { return ES_TOPICS.map((t) => ({ slug: t.slug })) }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug
  const t = getEsTopic(slug)
  if (!t) return {}
  return { title: t.title, description: t.short.slice(0, 150),
    alternates: { canonical: `${BASE}/es/ai-robotics/${slug}`, languages: { en: `${BASE}/ai-robotics/${slug}`, hi: `${BASE}/hi/ai-robotics/${slug}`, es: `${BASE}/es/ai-robotics/${slug}` } } }
}
const box = { padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' } as const

export default async function EsTopic({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug
  const t = getEsTopic(slug)
  if (!t) notFound()
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Article', inLanguage: 'es', headline: t.title, description: t.short, author: { '@type': 'Organization', name: 'R2BOT' } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: 'es', mainEntity: t.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ]
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '110px 20px 80px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Link href="/es/ai-robotics" style={{ color: '#94a3b8', fontSize: 13 }}>← IA y robótica</Link>
      <h1 style={{ fontSize: 'clamp(28px,5vw,38px)', fontWeight: 900, color: '#fff', margin: '8px 0 6px', lineHeight: 1.4 }}>{t.title}</h1>
      <p style={{ color: '#FC6818', fontSize: 13, fontWeight: 800, margin: '0 0 16px' }}>{t.level} · unos {t.minutes} min de lectura</p>
      <p style={{ color: '#e2e8f0', fontSize: 19, lineHeight: 1.9 }}>{t.short}</p>
      {t.what.map((p, i) => <p key={i} style={{ color: '#cbd5e1', fontSize: 17, lineHeight: 2 }}>{p}</p>)}
      <div style={{ ...box, margin: '20px 0' }}><div style={{ color: '#FC6818', fontWeight: 800, fontSize: 13 }}>Ejemplo real</div><p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.9 }}>{t.example}</p></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12, marginBottom: 20 }}>
        <div style={box}><div style={{ color: '#4ade80', fontWeight: 800, fontSize: 13 }}>Qué puedes hacer con ello</div><p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.9 }}>{t.withIt}</p></div>
        <div style={box}><div style={{ color: '#f87171', fontWeight: 800, fontSize: 13 }}>Qué pasa sin ello</div><p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.9 }}>{t.without}</p></div>
      </div>
      <div style={{ ...box, marginBottom: 24 }}><div style={{ color: '#FC6818', fontWeight: 800, fontSize: 13 }}>Pruébalo tú (5 minutos)</div><p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.9 }}>{t.tryIt}</p></div>
      <h2 style={{ color: '#fff', fontSize: 22 }}>Preguntas frecuentes</h2>
      {t.faq.map((f) => <div key={f.q} style={{ margin: '12px 0' }}><h3 style={{ color: '#fff', fontSize: 16, margin: '0 0 4px' }}>{f.q}</h3><p style={{ color: '#cbd5e1', margin: 0, lineHeight: 1.9 }}>{f.a}</p></div>)}
      <InlineSignup lang="es" />
      <p style={{ color: '#cbd5e1', marginTop: 28, lineHeight: 2 }}>¿Quieres jugar y aprender? <Link href={`/ai-robotics/${t.slug}`} style={{ color: '#FC6818', fontWeight: 700 }}>Abre la demo interactiva en la página en inglés →</Link> · <Link href="/es/ai-robotics/glossary" style={{ color: '#FC6818' }}>Glosario</Link></p>
    </main>
  )
}
