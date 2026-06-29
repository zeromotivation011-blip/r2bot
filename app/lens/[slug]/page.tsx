import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAllLens, getLensVideo, formatDuration } from '@/lib/lens';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';
import { AskAboutThisButton } from '@/components/AskAboutThisButton';

type Params = { slug: string };

export async function generateStaticParams() {
  return getAllLens().map(v => ({ slug: v.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<Params> }
): Promise<Metadata> {
  const { slug } = await params;
  const video = getLensVideo(slug);
  if (!video) return { title: 'Not found · Lens' };
  return {
    title: video.title,
    description: video.summary,
    openGraph: {
      title: video.title,
      description: video.summary,
      type: 'article',
      publishedTime: video.publishedAt,
    },
  };
}

export default async function LensVideoPage(
  { params }: { params: Promise<Params> }
) {
  const { slug } = await params;
  const video = getLensVideo(slug);
  if (!video) notFound();

  const others = getAllLens().filter(v => v.slug !== video.slug).slice(0, 3);

  // Schema.org VideoObject
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    description: video.summary,
    uploadDate: video.publishedAt,
    duration: `PT${Math.floor(video.durationSeconds / 60)}M${video.durationSeconds % 60}S`,
    publisher: { '@type': 'Organization', name: 'R2BOT' },
    ...(video.externalUrl ? { contentUrl: video.externalUrl } : {}),
    ...(video.youtubeId ? { embedUrl: `https://www.youtube.com/embed/${video.youtubeId}` } : {}),
  };

  return (
    <CopilotProvider>
      <ParticleField />
      <CursorTrail />
      <Nav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <article style={{ paddingTop: 140, paddingBottom: 100, position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-mono), monospace', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 22 }}>
            <a href="/lens" style={{ color: 'var(--cyan)' }}>Lens</a>
            <span style={{ margin: '0 10px' }}>/</span>
            <span>{video.topic}</span>
          </nav>

          <div className="atlas-meta">
            <span className="pulse-tag usa">Lens · {video.topic}</span>
            <span className="muted-tag">{formatDuration(video.durationSeconds)} read{video.originalDurationSeconds ? ` · saves you ${Math.round((video.originalDurationSeconds - video.durationSeconds) / 60)} min vs the original` : ''}</span>
          </div>

          <h1 className="display" style={{ fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.1, margin: '0 0 26px', color: 'var(--mist)' }}>
            {video.title}
          </h1>

          <p style={{ fontSize: 21, lineHeight: 1.55, color: '#C8D0DC', margin: '0 0 32px', borderLeft: '3px solid var(--cyan)', paddingLeft: 22 }}>
            {video.summary}
          </p>

          {/* Watch the original */}
          {video.externalUrl && (
            <div style={{
              padding: 22,
              background: 'rgba(0,184,212,.06)',
              border: '1px solid var(--border-2)',
              borderRadius: 14,
              marginBottom: 40,
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              flexWrap: 'wrap',
            }}>
              <div style={{
                width: 54,
                height: 54,
                borderRadius: '50%',
                background: 'rgba(0,184,212,.92)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 0 0 8px rgba(0,184,212,.12)',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#001318"><path d="M8 5v14l11-7z" /></svg>
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: '.3em', color: 'var(--cyan)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Watch the original
                </div>
                <a href={video.externalUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--mist)', fontSize: 15, fontWeight: 500 }}>
                  {video.externalUrl} →
                </a>
                {video.originalDurationSeconds && (
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                    Original length: {formatDuration(video.originalDurationSeconds)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Body */}
          <div className="prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{video.body}</ReactMarkdown>
          </div>

          {/* Ask R2 about this */}
          <div style={{ margin: '50px 0 40px', padding: 26, background: 'linear-gradient(135deg, rgba(0,184,212,.06), rgba(165,107,255,.04))', border: '1px solid var(--border-2)', borderRadius: 16 }}>
            <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: '.3em', color: 'var(--cyan)', textTransform: 'uppercase', marginBottom: 10 }}>
              Still curious?
            </div>
            <p style={{ fontSize: 17, color: '#C8D0DC', margin: '0 0 18px' }}>
              Ask R2 Co-pilot anything you didn&apos;t understand. It&apos;ll explain it plainly.
            </p>
            <AskAboutThisButton topic={video.title} />
          </div>

          {/* Other Lens videos */}
          {others.length > 0 && (
            <section style={{ margin: '50px 0' }}>
              <div className="section-eyebrow">More Lens · Watch next</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                {others.map(o => (
                  <a key={o.slug} href={`/lens/${o.slug}`} className="lens-card" style={{ cursor: 'pointer' }}>
                    <div className="lens-thumb">
                      <div className="play-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#001318"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                    </div>
                    <div className="lens-body">
                      <h4>{o.title}</h4>
                      <p>{o.summary.slice(0, 110)}{o.summary.length > 110 ? '…' : ''}</p>
                      <span className="lens-time">{formatDuration(o.durationSeconds)} · {o.topic}</span>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      </article>

      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
