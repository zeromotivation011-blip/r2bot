import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SHORTS, SHORT_COURSES, getShort, shortsInCourse } from '@/lib/shorts'
import ShortDemo from '@/components/shorts/ShortsDemos'
import { ShortEmbed, LessonQuiz, ProgressBar } from '@/components/shorts/ShortsClient'
import ShareBar from '@/components/ShareBar'

const BASE = 'https://www.r2bot.in'
export const revalidate = 86400
export function generateStaticParams() { return SHORTS.map((s) => ({ slug: s.slug })) }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = getShort((await params).slug)
  if (!s) return {}
  return {
    title: s.title,
    description: s.summary.slice(0, 158),
    alternates: { canonical: `${BASE}/shorts/${s.slug}` },
    openGraph: { title: s.title, description: s.summary, images: [`https://i.ytimg.com/vi/${s.ids[0]}/hqdefault.jpg`] },
  }
}

const box = { padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' } as const

export default async function ShortPage({ params }: { params: Promise<{ slug: string }> }) {
  const s = getShort((await params).slug)
  if (!s) notFound()
  const course = SHORT_COURSES.find((c) => c.slug === s.course)!
  const siblings = shortsInCourse(s.course)
  const next = getShort(s.next ?? SHORTS[0].slug) ?? SHORTS[0]
  const ld = [
    ...s.ids.map((id) => ({ '@context': 'https://schema.org', '@type': 'VideoObject', name: s.title, description: s.summary, thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, embedUrl: `https://www.youtube.com/embed/${id}`, contentUrl: `https://www.youtube.com/shorts/${id}`, uploadDate: '2026-10-01', publisher: { '@type': 'Organization', name: 'R2BOT' } })),
    { '@context': 'https://schema.org', '@type': 'Article', headline: s.title, description: s.summary, author: { '@type': 'Organization', name: 'R2BOT' }, mainEntityOfPage: `${BASE}/shorts/${s.slug}` },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Quick Lessons', item: `${BASE}/shorts` }, { '@type': 'ListItem', position: 2, name: s.title, item: `${BASE}/shorts/${s.slug}` }] },
  ]
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '110px 20px 80px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Link href="/shorts" style={{ color: '#94a3b8', fontSize: 13 }}>← Quick Lessons · {course.icon} {course.title}</Link>
      <h1 style={{ fontSize: 'clamp(26px,5vw,38px)', fontWeight: 900, color: '#fff', margin: '8px 0 10px' }}>{s.title}</h1>
      <p style={{ color: '#e2e8f0', fontSize: 19, lineHeight: 1.6, margin: '0 0 18px' }}>{s.summary}</p>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', margin: '18px 0' }}>
        {s.ids.map((id, i) => <ShortEmbed key={id} id={id} title={`${s.title} (video ${i + 1})`} />)}
      </div>

      <ShortDemo kind={s.demo} loop={s.loop} />

      {s.what.map((p, i) => <p key={i} style={{ color: '#cbd5e1', fontSize: 17, lineHeight: 1.7 }}>{p}</p>)}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12, margin: '20px 0' }}>
        <div style={box}><div style={{ color: '#4ade80', fontWeight: 800, fontSize: 12 }}>WITH IT YOU CAN</div><p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.6 }}>{s.withIt}</p></div>
        <div style={box}><div style={{ color: '#f87171', fontWeight: 800, fontSize: 12 }}>WITHOUT IT</div><p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.6 }}>{s.without}</p></div>
      </div>
      <div style={{ ...box, marginBottom: 12 }}><div style={{ color: '#fbbf24', fontWeight: 800, fontSize: 12 }}>WHERE IT GOES WRONG</div><p style={{ color: '#e2e8f0', margin: '6px 0 0', lineHeight: 1.6 }}>{s.limit}</p></div>

      <LessonQuiz slug={s.slug} quiz={s.quiz} nextHref={`/shorts/${next.slug}`} nextTitle={next.title.split(':')[0]} />

      <h2 style={{ color: '#fff', fontSize: 22 }}>Go deeper in the Atlas</h2>
      <ul style={{ color: '#cbd5e1', lineHeight: 1.9, paddingLeft: 20 }}>
        {s.atlas.map((a) => <li key={a.href}><Link href={a.href} style={{ color: '#FC6818' }}>{a.label}</Link></li>)}
        <li><Link href="/ai-robotics" style={{ color: '#FC6818' }}>AI and robotics guides</Link></li>
        <li><Link href="/courses" style={{ color: '#FC6818' }}>Full video course path</Link></li>
      </ul>

      <h2 style={{ color: '#fff', fontSize: 22, marginTop: 28 }}>{course.title}</h2>
      <ProgressBar slugs={siblings.map((x) => x.slug)} />
      <ol style={{ color: '#cbd5e1', lineHeight: 2, paddingLeft: 20 }}>
        {siblings.map((x) => <li key={x.slug}>{x.slug === s.slug ? <b style={{ color: '#fff' }}>{x.title.split(':')[0]}</b> : <Link href={`/shorts/${x.slug}`} style={{ color: '#FC6818' }}>{x.title.split(':')[0]}</Link>}</li>)}
      </ol>
      <ShareBar url={`${BASE}/shorts/${s.slug}`} title={s.title} />
    </main>
  )
}
