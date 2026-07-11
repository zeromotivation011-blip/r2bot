import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  getAllPulse,
  getPulseArticle,
  countryLabel,
  countryClass,
  formatPulseDate,
} from '@/lib/pulse';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider, CopilotContextBinder } from '@/components/CopilotProvider';
import { AskAboutThisButton } from '@/components/AskAboutThisButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ReadingProgress } from '@/components/ReadingProgress';
import { BackToTop } from '@/components/BackToTop';
import { ShareRow } from '@/components/ShareRow';
import { getAllAtlasEntries } from '@/lib/atlas';

type Params = { slug: string };

export async function generateStaticParams() {
  return getAllPulse().map(p => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<Params> }
): Promise<Metadata> {
  const { slug } = await params;
  const article = getPulseArticle(slug);
  if (!article) return { title: 'Not found · Pulse' };
  const base = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');
  const canonical = `${base}/pulse/${slug}`;
  return {
    title: article.title,
    description: article.summary,
    alternates: { canonical },
    openGraph: {
      title: article.title,
      description: article.summary,
      url: canonical,
      type: 'article',
      publishedTime: article.publishedAt,
    },
  };
}

export default async function PulseArticlePage(
  { params }: { params: Promise<Params> }
) {
  const { slug } = await params;
  const article = getPulseArticle(slug);
  if (!article) notFound();

  const others = getAllPulse().filter(p => p.slug !== article.slug).slice(0, 3);

  // Schema.org NewsArticle JSON-LD
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.summary,
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    author: { '@type': 'Organization', name: 'R2BOT' },
    publisher: { '@type': 'Organization', name: 'R2BOT' },
    articleSection: article.category,
  };

  const base = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');
  const canonical = `${base}/pulse/${slug}`;

  // Scan body for atlas-term mentions and surface them in a "Concepts behind this story" strip.
  const atlasEntries = getAllAtlasEntries();
  const lowerBody = article.body.toLowerCase();
  const matchedAtlas = atlasEntries
    .filter((e) => {
      const title = e.title.replace(/\s*\([^)]*\)/g, '').trim();
      if (title.length < 4) return false;
      const re = new RegExp(`(?<![\\w-])${title.replace(/[.*+?^${}()|[\]\\\\]/g, '\\\\$&')}(?![\\w-])`, 'i');
      return re.test(lowerBody);
    })
    .slice(0, 5);

  return (
    <CopilotProvider>
      <ReadingProgress />
      <ParticleField />
      <CursorTrail />
      <Nav />
      <CopilotContextBinder context={{ title: article.title, summary: article.summary, kind: 'pulse' }} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <article id="main-content" style={{ paddingTop: 140, paddingBottom: 100, position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <Breadcrumbs
            trail={[
              { label: 'Pulse', href: '/pulse' },
              { label: `${countryLabel(article.country)} · ${article.category}` },
              { label: article.title },
            ]}
          />

          {/* Meta */}
          <div className="atlas-meta">
            <span className={`pulse-tag ${countryClass(article.country)}`}>{countryLabel(article.country)} · {article.category}</span>
            <span className="muted-tag">{formatPulseDate(article.publishedAt)} · {article.readMinutes} min read</span>
          </div>

          {/* Title */}
          <h1 className="display" style={{ fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.1, margin: '0 0 26px', color: 'var(--mist)' }}>
            {article.title}
          </h1>

          {/* Lede */}
          <p style={{ fontSize: 21, lineHeight: 1.55, color: '#C8D0DC', margin: '0 0 24px', borderLeft: '3px solid var(--cyan)', paddingLeft: 22 }}>
            {article.summary}
          </p>

          {/* Share row */}
          <div style={{ marginBottom: 36 }}>
            <ShareRow title={article.title} url={canonical} />
          </div>

          {/* Body */}
          <div className="prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.body}</ReactMarkdown>
          </div>

          {/* Source */}
          {article.sourceUrl && (
            <p style={{ marginTop: 36, fontSize: 13, color: 'var(--muted)' }}>
              Primary source: <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cyan)' }}>{article.sourceUrl}</a>
            </p>
          )}

          {/* Ask R2 about this */}
          <div style={{ margin: '50px 0 40px', padding: 26, background: 'linear-gradient(135deg, rgba(0,184,212,.06), rgba(165,107,255,.04))', border: '1px solid var(--border-2)', borderRadius: 16 }}>
            <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: '.3em', color: 'var(--cyan)', textTransform: 'uppercase', marginBottom: 10 }}>
              Still curious?
            </div>
            <p style={{ fontSize: 17, color: '#C8D0DC', margin: '0 0 18px' }}>
              Ask R2 Co-pilot anything you didn&apos;t understand. It&apos;ll explain it plainly.
            </p>
            <AskAboutThisButton topic={article.title} />
          </div>

          {/* Concepts behind this story */}
          {matchedAtlas.length > 0 && (
            <section style={{ margin: '40px 0' }}>
              <div className="section-eyebrow">Learn the concepts behind this story</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                {matchedAtlas.map((e) => (
                  <a
                    key={e.slug}
                    href={`/atlas/${e.type}/${e.slug}`}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 999,
                      border: '1px solid var(--border-2)',
                      background: 'rgba(0,184,212,.08)',
                      color: 'var(--cyan)',
                      fontSize: 13.5,
                    }}
                  >
                    {e.title} →
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Report error */}
          <p style={{ marginTop: 40, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
            Spotted something off?{' '}
            <a
              href={`mailto:ravi6703@gmail.com?subject=${encodeURIComponent(`Error report: ${article.title}`)}&body=${encodeURIComponent(`Page: ${canonical}\nIssue: `)}`}
              style={{ color: 'var(--cyan)', borderBottom: '1px dashed var(--border-2)' }}
            >
              Report an error →
            </a>
          </p>

          {/* Other Pulse stories */}
          {others.length > 0 && (
            <section style={{ margin: '50px 0' }}>
              <div className="section-eyebrow">More Pulse · This week in robotics</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                {others.map(o => (
                  <a key={o.slug} href={`/pulse/${o.slug}`} className="pulse-card" style={{ cursor: 'pointer' }}>
                    <span className={`pulse-tag ${countryClass(o.country)}`}>{countryLabel(o.country)} · {o.category}</span>
                    <h3>{o.title}</h3>
                    <p style={{ marginBottom: 0 }}>{o.summary.slice(0, 110)}{o.summary.length > 110 ? '…' : ''}</p>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      </article>

      <BackToTop />
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
