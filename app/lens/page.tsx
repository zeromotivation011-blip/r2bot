import type { Metadata } from 'next';
import { getAllLens, formatDuration } from '@/lib/lens';
import { getLiveLensVideos } from '@/lib/lens-live';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';

export const metadata: Metadata = {
  title: 'Lens — The best robotics videos, decoded',
  description:
    "We watch the long robotics videos so you don't have to. Each Lens entry is a plain-English summary of what's worth knowing — and a link to the original.",
};

// Refresh the auto-ingested feed every 6 hours.
export const revalidate = 21600;

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1mo ago' : `${months}mo ago`;
}

export default async function LensIndex() {
  const curated = getAllLens();
  const live = await getLiveLensVideos();

  return (
    <CopilotProvider>
      <ParticleField />
      <CursorTrail />
      <Nav />

      <main style={{ paddingTop: 140, paddingBottom: 80, position: 'relative', zIndex: 2 }}>
        <div className="container">
          <div className="section-eyebrow">Lens · The best videos, decoded</div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 5.5vw, 64px)', margin: '0 0 18px' }}>
            Don&apos;t watch 45 minutes to learn 4.
          </h1>
          <p style={{ fontSize: 19, color: '#B0B8C5', maxWidth: 680, margin: '0 0 50px' }}>
            We watch the long robotics videos so you don&apos;t have to. Each Lens entry is a
            plain-English summary of what&apos;s worth knowing, with a link to the original.
          </p>

          {/* ── Auto-ingested: latest from top robotics YouTube channels ── */}
          {live.length > 0 && (
            <section style={{ marginBottom: 64 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 22px' }}>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0 }}>
                  Fresh from YouTube
                </h2>
                <span style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase',
                  color: '#34d399', background: 'rgba(52,211,153,0.12)',
                  border: '1px solid rgba(52,211,153,0.3)', padding: '3px 10px', borderRadius: 999,
                }}>
                  Auto-updated
                </span>
              </div>
              <div className="lens-grid">
                {live.map(v => (
                  <a
                    key={v.videoId}
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lens-card"
                  >
                    <div
                      className="lens-thumb"
                      style={{
                        backgroundImage: `url(${v.thumbnailUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    >
                      <div className="play-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#001318"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                    </div>
                    <div className="lens-body">
                      <h4>{v.title}</h4>
                      <p>{v.summary}</p>
                      <span className="lens-time">
                        {v.channel} · {v.topic} · {timeAgo(v.publishedAt)}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* ── Curated deep-dive summaries (hand-written) ── */}
          {curated.length > 0 && (
            <section>
              {live.length > 0 && (
                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 22px' }}>
                  Editor&apos;s picks, decoded
                </h2>
              )}
              <div className="lens-grid">
                {curated.map(v => (
                  <a key={v.slug} href={`/lens/${v.slug}`} className="lens-card">
                    <div className="lens-thumb">
                      <div className="play-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#001318"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                    </div>
                    <div className="lens-body">
                      <h4>{v.title}</h4>
                      <p>{v.summary}</p>
                      <span className="lens-time">
                        {formatDuration(v.durationSeconds)} · {v.topic}
                        {v.originalDurationSeconds && (
                          <> · saves {Math.round((v.originalDurationSeconds - v.durationSeconds) / 60)} min</>
                        )}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {live.length === 0 && curated.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              First video summaries coming soon.
            </div>
          )}
        </div>
      </main>

      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
