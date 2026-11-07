import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { lessonLanguages } from '@/lib/shorts-i18n'
import { SHORTS, getShort } from '@/lib/shorts'
import { SHORTS_ES } from '@/lib/shorts-es'
import ShortDemo from '@/components/shorts/ShortsDemos'
import { ShortEmbed, LessonQuiz } from '@/components/shorts/ShortsClient'

const BASE = 'https://www.r2bot.in'
export const revalidate = 86400
export function generateStaticParams() { return SHORTS.filter((s) => SHORTS_ES[s.slug]).map((s) => ({ slug: s.slug })) }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug
  const z = SHORTS_ES[slug]
  if (!z) return {}
  return { title: z.title, description: z.summary.slice(0, 150), alternates: { canonical: `${BASE}/es/shorts/${slug}`, languages: lessonLanguages(slug) } }
}

const box = { padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' } as const

export default async function EsShort({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug
  const s = getShort(slug)
  const z = SHORTS_ES[slug]
  if (!s || !z) notFound()
  const next = (s.next && SHORTS_ES[s.next] ? getShort(s.next) : undefined) ?? SHORTS.find((x) => SHORTS_ES[x.slug] && x.slug !== slug) ?? SHORTS[0]
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Article', inLanguage: 'es', headline: z.title, description: z.summary, author: { '@type': 'Organization', name: 'R2BOT' }, mainEntityOfPage: `${BASE}/es/shorts/${slug}` },
    ...s.ids.map((id) => ({ '@context': 'https://schema.org', '@type': 'VideoObject', name: z.title, description: z.summary, thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, embedUrl: `https://www.youtube.com/embed/${id}`, uploadDate: '2026-10-01' })),
  ]
  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '110px 20px 80px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Link href="/es/shorts" style={{ color: '#94a3b8', fontSize: 13 }}>← Lecciones rápidas</Link>
      <h1 style={{ fontSize: 'clamp(26px,5vw,36px)', fontWeight: 900, color: '#fff', margin: '8px 0 10px', lineHeight: 1.3 }}>{z.title}</h1>
      <p style={{ color: '#e2e8f0', fontSize: 18, lineHeight: 1.7, margin: '0 0 18px' }}>{z.summary}</p>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', margin: '18px 0' }}>
        {s.ids.map((id, i) => <ShortEmbed key={id} id={id} title={`${z.title} (${i + 1})`} />)}
      </div>
      <ShortDemo kind={s.demo} loop={z.loop} />
      {z.what.map((p, i) => <p key={i} style={{ color: '#cbd5e1', fontSize: 17, lineHeight: 1.8 }}>{p}</p>)}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12, margin: '20px 0' }}>
        <div style={box}><div style={{ color: '#4ade80', fontWeight: 800, fontSize: 13 }}>Con esto puedes</div><p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.7 }}>{z.withIt}</p></div>
        <div style={box}><div style={{ color: '#f87171', fontWeight: 800, fontSize: 13 }}>Sin esto, qué pasa</div><p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.7 }}>{z.without}</p></div>
      </div>
      <div style={{ ...box, marginBottom: 12 }}><div style={{ color: '#fbbf24', fontWeight: 800, fontSize: 13 }}>Dónde puede fallar</div><p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.7 }}>{z.limit}</p></div>
      <LessonQuiz slug={slug} lang="es" quiz={{ q: z.quiz.q, options: z.quiz.options, answer: s.quiz.answer, why: z.quiz.why }} nextHref={`/es/shorts/${next.slug}`} nextTitle={SHORTS_ES[next.slug].title.split(':')[0]} />
      <p><Link href={`/shorts/${slug}`} style={{ color: '#FC6818' }}>Versión en inglés →</Link></p>
    </main>
  )
}
