import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { lessonLanguages } from '@/lib/shorts-i18n'
import { SHORTS, getShort } from '@/lib/shorts'
import { SHORTS_HI } from '@/lib/shorts-hi'
import ShortDemo from '@/components/shorts/ShortsDemos'
import { ShortEmbed, LessonQuiz } from '@/components/shorts/ShortsClient'

const BASE = 'https://www.r2bot.in'
export const revalidate = 86400
export function generateStaticParams() { return SHORTS.filter((s) => SHORTS_HI[s.slug]).map((s) => ({ slug: s.slug })) }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug
  const z = SHORTS_HI[slug]
  if (!z) return {}
  return { title: z.title, description: z.summary.slice(0, 150), alternates: { canonical: `${BASE}/hi/shorts/${slug}`, languages: lessonLanguages(slug) } }
}


export default async function ZhShort({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug
  const s = getShort(slug)
  const z = SHORTS_HI[slug]
  if (!s || !z) notFound()
  const next = (s.next && SHORTS_HI[s.next] ? getShort(s.next) : undefined) ?? SHORTS.find((x) => SHORTS_HI[x.slug] && x.slug !== slug) ?? SHORTS[0]
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Article', inLanguage: 'hi', headline: z.title, description: z.summary, author: { '@type': 'Organization', name: 'R2BOT' }, mainEntityOfPage: `${BASE}/hi/shorts/${slug}` },
    ...s.ids.map((id) => ({ '@context': 'https://schema.org', '@type': 'VideoObject', name: z.title, description: z.summary, thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, embedUrl: `https://www.youtube.com/embed/${id}`, uploadDate: s.videoPublished ?? '2026-11-06' })),
  ]
  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '110px 20px 80px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Link href="/hi/shorts" style={{ color: 'var(--text-2)', fontSize: 13 }}>← क्विक लेसन</Link>
      <h1 className="r2-h1">{z.title}</h1>
      <p className="r2-lede">{z.summary}</p>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', margin: '18px 0' }}>
        {s.ids.map((id, i) => <ShortEmbed key={id} id={id} title={`${z.title} (${i + 1})`} />)}
      </div>
      <ShortDemo kind={s.demo} loop={z.loop} />
      {z.what.map((p, i) => <p key={i} style={{ color: 'var(--text-2)', fontSize: 17, lineHeight: 1.8 }}>{p}</p>)}
      <div className="r2-lesson__pair">
        <div className="r2-card r2-note r2-note--yes"><span className="r2-note__label">इससे आप क्या कर सकते हैं</span><p className="r2-body">{z.withIt}</p></div>
        <div className="r2-card r2-note r2-note--no"><span className="r2-note__label">इसके बिना क्या होगा</span><p className="r2-body">{z.without}</p></div>
      </div>
      <div className="r2-card r2-note"><span className="r2-note__label">कहाँ गड़बड़ हो सकती है</span><p className="r2-body">{z.limit}</p></div>
      <LessonQuiz slug={slug} lang="hi" quiz={{ q: z.quiz.q, options: z.quiz.options, answer: s.quiz.answer, why: z.quiz.why }} nextHref={`/hi/shorts/${next.slug}`} nextTitle={SHORTS_HI[next.slug].title.split(':')[0]} />
      <p><Link href={`/shorts/${slug}`} className="r2-link">English version →</Link></p>
    </main>
  )
}
