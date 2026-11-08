import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { lessonLanguages } from '@/lib/shorts-i18n'
import { SHORTS, getShort } from '@/lib/shorts'
import { SHORTS_ZH } from '@/lib/shorts-zh'
import ShortDemo from '@/components/shorts/ShortsDemos'
import { ShortEmbed, LessonQuiz } from '@/components/shorts/ShortsClient'

const BASE = 'https://www.r2bot.in'
export const revalidate = 86400
export function generateStaticParams() { return SHORTS.filter((s) => SHORTS_ZH[s.slug]).map((s) => ({ slug: s.slug })) }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug
  const z = SHORTS_ZH[slug]
  if (!z) return {}
  return { title: z.title, description: z.summary.slice(0, 120), alternates: { canonical: `${BASE}/zh/shorts/${slug}`, languages: lessonLanguages(slug) } }
}


export default async function ZhShort({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug
  const s = getShort(slug)
  const z = SHORTS_ZH[slug]
  if (!s || !z) notFound()
  const next = (s.next && SHORTS_ZH[s.next] ? getShort(s.next) : undefined) ?? SHORTS.find((x) => SHORTS_ZH[x.slug] && x.slug !== slug) ?? SHORTS[0]
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Article', inLanguage: 'zh-CN', headline: z.title, description: z.summary, author: { '@type': 'Organization', name: 'R2BOT' }, mainEntityOfPage: `${BASE}/zh/shorts/${slug}` },
    ...s.ids.map((id) => ({ '@context': 'https://schema.org', '@type': 'VideoObject', name: z.title, description: z.summary, thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, embedUrl: `https://www.youtube.com/embed/${id}`, uploadDate: s.videoPublished ?? '2026-11-06' })),
  ]
  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '110px 20px 80px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Link href="/zh/shorts" style={{ color: 'var(--text-2)', fontSize: 13 }}>← 快速课程</Link>
      <h1 className="r2-h1">{z.title}</h1>
      <p className="r2-lede">{z.summary}</p>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', margin: '18px 0' }}>
        {s.ids.map((id, i) => <ShortEmbed key={id} id={id} title={`${z.title} (${i + 1})`} />)}
      </div>
      <ShortDemo kind={s.demo} loop={z.loop} />
      {z.what.map((p, i) => <p key={i} style={{ color: 'var(--text-2)', fontSize: 17, lineHeight: 1.9 }}>{p}</p>)}
      <div className="r2-lesson__pair">
        <div className="r2-card r2-note r2-note--yes"><span className="r2-note__label">有了它，你可以</span><p className="r2-body">{z.withIt}</p></div>
        <div className="r2-card r2-note r2-note--no"><span className="r2-note__label">没有它会怎样</span><p className="r2-body">{z.without}</p></div>
      </div>
      <div className="r2-card r2-note"><span className="r2-note__label">哪里容易出问题</span><p className="r2-body">{z.limit}</p></div>
      <LessonQuiz slug={slug} lang="zh" quiz={{ q: z.quiz.q, options: z.quiz.options, answer: s.quiz.answer, why: z.quiz.why }} nextHref={`/zh/shorts/${next.slug}`} nextTitle={SHORTS_ZH[next.slug].title.split('：')[0]} />
      <p><Link href={`/shorts/${slug}`} className="r2-link">English version →</Link></p>
    </main>
  )
}
