import type { Metadata } from 'next';
import { getAllPulse, countryLabel, countryClass, formatPulseDate } from '@/lib/pulse';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';
import { PulseList, type PulseEntry } from './PulseList';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://robot-tan.vercel.app';

export const metadata: Metadata = {
  title: 'Pulse — Today in robotics, decoded',
  description:
    'Every major robotics story, explained in 60 seconds. What happened, why it matters, how it was built. From the USA, China, India, Japan, Europe.',
  alternates: { canonical: `${BASE_URL}/pulse` },
};

export default function PulseIndex() {
  const all = getAllPulse();
  const entries: PulseEntry[] = all.map((p) => ({
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    category: p.category,
    country: p.country,
    countryClass: countryClass(p.country),
    countryLabel: countryLabel(p.country),
    publishedAt: formatPulseDate(p.publishedAt),
    readMinutes: p.readMinutes ?? 4,
  }));

  return (
    <CopilotProvider>
      <ParticleField />
      <CursorTrail />
      <Nav />

      <main id="main-content" style={{ paddingTop: 140, paddingBottom: 80, position: 'relative', zIndex: 2 }}>
        <div className="container">
          <div className="section-eyebrow">Pulse · Today&apos;s robotics</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 24,
              flexWrap: 'wrap',
              marginBottom: 18,
            }}
          >
            <h1
              className="display"
              style={{
                fontSize: 'clamp(40px, 5.5vw, 64px)',
                margin: 0,
              }}
            >
              What just happened in robotics.
            </h1>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <a
                href="/pulse/rss.xml"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  border: '1px solid var(--border-2)',
                  borderRadius: 999,
                  color: 'var(--cyan)',
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: 13,
                  letterSpacing: '.05em',
                }}
                aria-label="Subscribe via RSS"
              >
                <span aria-hidden="true">⌬</span> Subscribe via RSS
              </a>
              <a
                href="/pulse/weekly"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  border: '1px solid var(--border)',
                  borderRadius: 999,
                  color: '#C8D0DC',
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: 13,
                  letterSpacing: '.05em',
                }}
              >
                Weekly roundup →
              </a>
            </div>
          </div>

          <p style={{ fontSize: 19, color: '#B0B8C5', maxWidth: 680, margin: '0 0 50px' }}>
            Every major story, decoded in 60 seconds. What happened, why it matters, how it was built —
            in plain English, never engineering speak. From the USA, China, India, Japan, Europe.
          </p>

          <PulseList entries={entries} />
        </div>
      </main>

      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
