import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { lessonLanguages } from '@/lib/shorts-i18n'
import { SHORTS, getShort, liveShorts, isLive, liveVideoIds } from '@/lib/shorts'
import { SHORTS_ES } from '@/lib/shorts-es'
import ShortDemo from '@/components/shorts/ShortsDemos'
import { ShortEmbed, LessonQuiz } from '@/components/shorts/ShortsClient'
import { jsonldScript } from '@/lib/seo/jsonld'

const BASE = 'https://www.r2bot.in'
export const revalidate = 3600
export function generateStaticParams() { return SHORTS.filter((s) => SHORTS_ES[s.slug]).map((s) => ({ slug: s.slug })) }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug
  const z = SHORTS_ES[slug]
  if (!z) return {}
  return { title: z.title, description: z.summary.slice(0, 150), alternates: { canonical: `${BASE}/es/shorts/${slug}`, languages: lessonLanguages(slug) }, ...(isLive(getShort(slug)!) ? {} : { robots: { index: false, follow: true } }) }
}


export default async function EsShort({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug
  const s = getShort(slug)
  const z = SHORTS_ES[slug]
  if (!s || !z) notFound()
  const next = (s.next && SHORTS_ES[s.next] ? getShort(s.next) : undefined) ?? liveShorts().find((x) => SHORTS_ES[x.slug] && x.slug !== slug) ?? SHORTS[0]
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Article', inLanguage: 'es', headline: z.title, description: z.summary, author: { '@type': 'Organization', name: 'R2BOT' }, mainEntityOfPage: `${BASE}/es/shorts/${slug}` },
    ...liveVideoIds(s).map((id) => ({ '@context': 'https://schema.org', '@type': 'VideoObject', name: z.title, description: z.summary, thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, embedUrl: `https://www.youtube.com/embed/${id}`, uploadDate: s.publishAt ? s.publishAt.slice(0, 10) : (s.videoPublished ?? '2026-11-06') })),
  ]
  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '110px 20px 80px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(ld) }} />
      <Link href="/es/shorts" style={{ color: 'var(--text-2)', fontSize: 13 }}>← Lecciones rápidas</Link>
      <h1 className="r2-h1">{z.title}</h1>
      <p className="r2-lede">{z.summary}</p>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', margin: '18px 0' }}>
        {liveVideoIds(s).map((id, i) => <ShortEmbed key={id} id={id} title={`${z.title} (${i + 1})`} />)}
      </div>
      <ShortDemo kind={s.demo} loop={z.loop} />
      {z.what.map((p, i) => <p key={i} style={{ color: 'var(--text-2)', fontSize: 17, lineHeight: 1.8 }}>{p}</p>)}
      <div className="r2-lesson__pair">
        <div className="r2-card r2-note r2-note--yes"><span className="r2-note__label">Con esto puedes</span><p className="r2-body">{z.withIt}</p></div>
        <div className="r2-card r2-note r2-note--no"><span className="r2-note__label">Sin esto, qué pasa</span><p className="r2-body">{z.without}</p></div>
      </div>
      <div className="r2-card r2-note"><span className="r2-note__label">Dónde puede fallar</span><p className="r2-body">{z.limit}</p></div>
      <LessonQuiz slug={slug} lang="es" quiz={{ q: z.quiz.q, options: z.quiz.options, answer: s.quiz.answer, why: z.quiz.why }} nextHref={`/es/shorts/${next.slug}`} nextTitle={SHORTS_ES[next.slug].title.split(':')[0]} />
      <p><Link href={`/shorts/${slug}`} className="r2-link">Versión en inglés →</Link></p>
    </main>
  )
}
