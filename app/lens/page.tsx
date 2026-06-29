import type { Metadata } from 'next';
import { getAllLens, formatDuration } from '@/lib/lens';
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

export default function LensIndex() {
  const all = getAllLens();

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

          {all.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              First video summaries coming soon.
            </div>
          ) : (
            <div className="lens-grid">
              {all.map(v => (
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
          )}
        </div>
      </main>

      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
