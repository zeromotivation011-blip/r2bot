import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { lessonLanguages } from '@/lib/shorts-i18n'
import { SHORTS, SHORT_COURSES, getShort, shortsInCourse, liveShorts, isLive, liveVideoIds } from '@/lib/shorts'
import ShortDemo from '@/components/shorts/ShortsDemos'
import { ShortEmbed, LessonQuiz, ProgressBar } from '@/components/shorts/ShortsClient'
import ShareBar from '@/components/ShareBar'
import { authorRef } from '@/lib/author'
import { jsonldScript } from '@/lib/seo/jsonld'

const BASE = 'https://www.r2bot.in'
// Hourly, so a lesson switches itself on when its Short's release date passes.
export const revalidate = 3600
export function generateStaticParams() { return SHORTS.map((s) => ({ slug: s.slug })) }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = getShort((await params).slug)
  if (!s) return {}
  return {
    title: s.title,
    description: s.summary.slice(0, 158),
    alternates: { canonical: `${BASE}/shorts/${s.slug}`, languages: lessonLanguages(s.slug) },
    // Not public yet: reachable (the Short's description links here) but not indexed.
    ...(isLive(s) ? {} : { robots: { index: false, follow: true } }),
    openGraph: { title: s.title, description: s.summary, images: [`https://i.ytimg.com/vi/${s.ids[0]}/hqdefault.jpg`] },
  }
}


export default async function ShortPage({ params }: { params: Promise<{ slug: string }> }) {
  const s = getShort((await params).slug)
  if (!s) notFound()
  const course = SHORT_COURSES.find((c) => c.slug === s.course)!
  const siblings = shortsInCourse(s.course, s.slug)
  const live = isLive(s)
  const videoIds = liveVideoIds(s)
  const wanted = getShort(s.next ?? '')
  const next = (wanted && isLive(wanted) ? wanted : undefined) ?? liveShorts().find((x) => x.slug !== s.slug) ?? SHORTS[0]
  const ld = [
    ...videoIds.map((id) => ({ '@context': 'https://schema.org', '@type': 'VideoObject', name: s.title, description: s.summary, thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, embedUrl: `https://www.youtube.com/embed/${id}`, contentUrl: `https://www.youtube.com/shorts/${id}`, uploadDate: s.publishAt ? s.publishAt.slice(0, 10) : (s.videoPublished ?? '2026-11-06'), publisher: { '@type': 'Organization', name: 'R2BOT' } })),
    { '@context': 'https://schema.org', '@type': 'Article', headline: s.title, description: s.summary, author: authorRef(), mainEntityOfPage: `${BASE}/shorts/${s.slug}` },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Quick Lessons', item: `${BASE}/shorts` }, { '@type': 'ListItem', position: 2, name: s.title, item: `${BASE}/shorts/${s.slug}` }] },
  ]
  return (
    <main className="r2-lesson">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(ld) }} />
      <nav style={{ fontSize: 13, color: 'var(--text-2)' }}>
        <Link href="/shorts" style={{ color: 'var(--text-2)' }}>Quick Lessons</Link>
        {' / '}
        <Link href={`/shorts/course/${course.slug}`} style={{ color: 'var(--text-2)' }}>{course.icon} {course.title}</Link>
        {' · '}
        <span>Lesson {siblings.findIndex((x) => x.slug === s.slug) + 1} of {siblings.length}</span>
      </nav>
      <h1 className="r2-h1">{s.title}</h1>
      <p className="r2-lede">{s.summary}</p>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', margin: '18px 0' }}>
        {live
          ? videoIds.map((id, i) => <ShortEmbed key={id} id={id} title={`${s.title} (video ${i + 1})`} />)
          : <div className="r2-card r2-note" style={{ width: 'min(100%, 270px)', aspectRatio: '9 / 16', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 20 }}>
              <div>
                <p className="r2-note__label">The Short goes public</p>
                <p className="r2-body" style={{ fontWeight: 700 }}>{new Date(s.publishAt!).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' })}</p>
                <p className="r2-body">The demo and quiz below work now.</p>
              </div>
            </div>}
      </div>

      <ShortDemo kind={s.demo} loop={s.loop} />

      {s.what.map((p, i) => <p key={i} className="r2-body r2-lesson__p">{p}</p>)}
      <div className="r2-lesson__pair">
        <div className="r2-card r2-note r2-note--yes">
          <span className="r2-note__label">With it you can</span>
          <p className="r2-body">{s.withIt}</p>
        </div>
        <div className="r2-card r2-note r2-note--no">
          <span className="r2-note__label">Without it</span>
          <p className="r2-body">{s.without}</p>
        </div>
      </div>
      <div className="r2-card r2-note">
        <span className="r2-note__label">Where it goes wrong</span>
        <p className="r2-body">{s.limit}</p>
      </div>

      <LessonQuiz slug={s.slug} quiz={s.quiz} nextHref={`/shorts/${next.slug}`} nextTitle={next.title.split(':')[0]} />

      {/* Was a bulleted list of five orange links, on 188 pages. */}
      <h2 className="r2-h2 r2-lesson__h2">Go deeper in the Atlas</h2>
      <ul className="r2-linklist">
        {s.atlas.map((a) => <li key={a.href}><Link href={a.href}>{a.label}</Link></li>)}
        <li><Link href="/ai-robotics">AI and robotics guides</Link></li>
        <li><Link href="/courses">The full video course path</Link></li>
      </ul>

      <h2 className="r2-h2 r2-lesson__h2">
        <Link href={`/shorts/course/${course.slug}`}>{course.title}</Link>
      </h2>
      <ProgressBar slugs={siblings.map((x) => x.slug)} />
      <ol className="r2-linklist r2-linklist--ol">
        {siblings.map((x) => <li key={x.slug}>{x.slug === s.slug ? <b>{x.title.split(':')[0]}</b> : <Link href={`/shorts/${x.slug}`}>{x.title.split(':')[0]}</Link>}</li>)}
      </ol>
      <ShareBar url={`${BASE}/shorts/${s.slug}`} title={s.title} />
    </main>
  )
}
