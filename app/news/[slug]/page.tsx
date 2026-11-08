import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Nav } from '@/components/Nav'
import { CopilotProvider } from '@/components/CopilotProvider'
import { CopilotBubble } from '@/components/CopilotBubble'
import { CopilotDrawer } from '@/components/CopilotDrawer'
import {
  getArchivedNewsBySlug,
  getArchivedNewsSlugs,
  getRecentArchivedNews,
} from '@/lib/news'

// Guard against NEXT_PUBLIC_SITE_URL being set to the *.vercel.app preview
// domain — emitting that as canonical/JSON-LD tells Google the content lives on
// the preview host. Every file in this repo guards the same way.
const SITE =
  process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app')
    ? process.env.NEXT_PUBLIC_SITE_URL
    : 'https://www.r2bot.in'

export const revalidate = 3600

// The archive grows between deploys, so we cannot pre-render every slug at build
// time. dynamicParams = true lets new stories render on demand; the notFound()
// below turns any unknown slug into a real 404 (not a soft-404 that Google would
// index). generateStaticParams still pre-renders the most recent stories.
export const dynamicParams = true

export async function generateStaticParams() {
  const slugs = await getArchivedNewsSlugs(300)
  return slugs.map((s) => ({ slug: s.slug }))
}

function fmtDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime()) || d.getTime() === 0) return ''
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

const TOPIC_LABEL: Record<string, string> = {
  ai: 'AI', industrial: 'Industrial', medical: 'Medical', space: 'Space',
  consumer: 'Consumer', military: 'Defence', business: 'Business',
  research: 'Research', india: 'India', policy: 'Policy', general: 'General',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const a = await getArchivedNewsBySlug(slug)
  if (!a) {
    return { title: 'Story not found · R2BOT', robots: { index: false, follow: true } }
  }
  const url = `${SITE}/news/${a.slug}`
  const desc = (a.shownSummary || `${a.title} — robotics news, summarized and decoded by R2BOT.`).slice(0, 300)
  return {
    title: `${a.title} | Robotics News · R2BOT`,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      siteName: 'R2BOT',
      title: a.title,
      description: desc,
      publishedTime: a.publishedAt,
    },
    twitter: { card: 'summary_large_image', title: a.title, description: desc },
  }
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const a = await getArchivedNewsBySlug(slug)
  if (!a) notFound()

  const url = `${SITE}/news/${a.slug}`
  const dateStr = fmtDate(a.publishedAt)
  const others = (await getRecentArchivedNews(8)).filter((o) => o.slug !== a.slug).slice(0, 5)

  // NewsArticle is the correct type for a dated news story and is what makes the
  // page eligible for news-style treatment in search. The story is a summary of
  // an external source, so isBasedOn / citation credit the original reporting.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: a.title.slice(0, 110),
    datePublished: a.publishedAt,
    dateModified: a.publishedAt,
    ...(a.imageUrl ? { image: [a.imageUrl] } : {}),
    description: a.shownSummary?.slice(0, 300) || undefined,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Organization', name: 'R2BOT', url: SITE },
    publisher: {
      '@type': 'Organization',
      name: 'R2BOT',
      url: SITE,
      logo: { '@type': 'ImageObject', url: `${SITE}/icon.svg` },
    },
    ...(a.url ? { isBasedOn: a.url, citation: a.url } : {}),
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Robotics News', item: `${SITE}/news` },
      { '@type': 'ListItem', position: 2, name: a.title.slice(0, 70), item: url },
    ],
  }

  return (
    <CopilotProvider>
      <Nav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <main id="main-content" style={{ paddingTop: 120, paddingBottom: 90 }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: '#6E7886', marginBottom: 16 }}>
            <Link href="/news" style={{ color: '#6E7886' }}>Robotics News</Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <span style={{ color: '#B0B8C5' }}>{TOPIC_LABEL[a.topic] || 'Story'}</span>
          </nav>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, fontSize: 13, color: '#6E7886', marginBottom: 14 }}>
            {a.source && <span style={{ color: '#00E5FF', fontWeight: 700 }}>{a.source}</span>}
            {a.source && dateStr && <span>·</span>}
            {dateStr && <span>{dateStr}</span>}
            <span>·</span>
            <span style={{ color: '#FFB020', fontWeight: 600 }}>{TOPIC_LABEL[a.topic] || 'Robotics'}</span>
          </div>

          <h1 className="display" style={{ fontSize: 'clamp(28px, 4vw, 42px)', lineHeight: 1.15, margin: '0 0 20px', color: '#E8ECF1' }}>
            {a.title}
          </h1>

          {a.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={a.imageUrl}
              alt=""
              style={{ width: '100%', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 26 }}
            />
          )}

          {a.shownSummary && (
            <p style={{ fontSize: 19, lineHeight: 1.7, color: '#C8D0DC', margin: '0 0 26px' }}>
              {a.shownSummary}
            </p>
          )}

          {/* Why it matters — R2BOT's editorial context, the original value this
              page adds on top of the source headline. */}
          <section
            style={{
              borderRadius: 16,
              border: '1px solid rgba(0,229,255,0.25)',
              background: 'rgba(0,229,255,0.06)',
              padding: '20px 22px',
              margin: '0 0 26px',
            }}
          >
            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 800, color: '#00E5FF', margin: '0 0 8px' }}>
              Why it matters
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.65, color: '#D6DCE6', margin: 0 }}>{a.whyItMatters}</p>
          </section>

          {/* Attribution + outbound citation to the original reporting. */}
          <div
            style={{
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
              padding: '16px 18px', borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.03)',
              margin: '0 0 34px',
            }}
          >
            <span style={{ fontSize: 14, color: '#B0B8C5' }}>
              Summary by R2BOT{a.source ? ` · Original reporting by ${a.source}` : ''}.
            </span>
            {a.url && (
              <a
                href={a.url}
                target="_blank"
                rel="noopener"
                style={{
                  marginLeft: 'auto', fontSize: 14, fontWeight: 700, color: '#0A0E17',
                  background: '#00E5FF', padding: '9px 16px', borderRadius: 10, textDecoration: 'none',
                }}
              >
                Read the full story →
              </a>
            )}
          </div>

          {(a.relatedAtlasTerms.length > 0 || a.relatedLessons.length > 0) && (
            <section style={{ margin: '0 0 34px' }}>
              <h2 className="display" style={{ fontSize: 20, color: '#E8ECF1', margin: '0 0 12px' }}>
                Learn the concepts behind this
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {a.relatedAtlasTerms.map((t) => (
                  <Link
                    key={t}
                    href={`/atlas/concept/${t}`}
                    style={{
                      padding: '8px 14px', borderRadius: 999, fontSize: 14,
                      border: '1px solid rgba(0,229,255,0.3)', background: 'rgba(0,229,255,0.08)', color: '#7Fe9f7',
                    }}
                  >
                    📚 {t.replace(/-/g, ' ')}
                  </Link>
                ))}
                {a.relatedLessons.map((l) => (
                  <Link
                    key={l}
                    href="/academy"
                    style={{
                      padding: '8px 14px', borderRadius: 999, fontSize: 14,
                      border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#6ee7b7',
                    }}
                  >
                    🎓 {l.replace(/-/g, ' ')}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {others.length > 0 && (
            <section style={{ marginTop: 44, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 26 }}>
              <h2 className="display" style={{ fontSize: 20, color: '#E8ECF1', margin: '0 0 14px' }}>
                More robotics news
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {others.map((o) => (
                  <Link
                    key={o.slug}
                    href={`/news/${o.slug}`}
                    className="r2-lift"
                    style={{
                      display: 'block', padding: 16, borderRadius: 14,
                      border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#6E7886', marginBottom: 4 }}>
                      {o.source}{fmtDate(o.publishedAt) ? ` · ${fmtDate(o.publishedAt)}` : ''}
                    </div>
                    <div style={{ color: '#E8ECF1', fontWeight: 600, fontSize: 15, lineHeight: 1.4 }}>{o.title}</div>
                  </Link>
                ))}
              </div>
              <div style={{ marginTop: 18 }}>
                <Link href="/news" style={{ color: '#00E5FF', fontWeight: 700, fontSize: 15 }}>
                  ← Back to all robotics news
                </Link>
              </div>
            </section>
          )}
        </div>
      </main>

      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  )
}
