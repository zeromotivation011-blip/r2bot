import type { Metadata } from 'next';
import { getAllPulse, countryLabel, countryClass, formatPulseDate } from '@/lib/pulse';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';
import { Breadcrumbs } from '@/components/Breadcrumbs';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

export const metadata: Metadata = {
  title: 'This week in robotics — Pulse',
  description:
    'The five most recent robotics stories on R2BOT Pulse, gathered into one weekly roundup.',
  alternates: { canonical: `${BASE_URL}/pulse/weekly` },
};

export default function PulseWeekly() {
  const top = getAllPulse().slice(0, 5);

  return (
    <CopilotProvider>
      <ParticleField />
      <CursorTrail />
      <Nav />

      <main id="main-content" style={{ paddingTop: 140, paddingBottom: 100, position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ maxWidth: 880 }}>
          <Breadcrumbs trail={[{ label: 'Pulse', href: '/pulse' }, { label: 'Weekly roundup' }]} />
          <div className="section-eyebrow">Weekly roundup</div>
          <h1
            className="display"
            style={{ fontSize: 'clamp(36px, 5vw, 56px)', margin: '0 0 18px' }}
          >
            This week in robotics.
          </h1>
          <p style={{ fontSize: 18, color: '#B0B8C5', maxWidth: 620, margin: '0 0 40px' }}>
            The five most recent Pulse stories — all the major moves, in one place.
          </p>

          {top.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              No stories yet.
            </div>
          ) : (
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {top.map((p, i) => (
                <li
                  key={p.slug}
                  style={{
                    padding: '24px 0',
                    borderBottom: i < top.length - 1 ? '1px solid var(--border)' : 'none',
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr',
                    gap: 18,
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-mono), monospace',
                      fontSize: 24,
                      color: 'var(--cyan)',
                    }}
                  >
                    0{i + 1}
                  </div>
                  <div>
                    <div style={{ marginBottom: 6 }}>
                      <span className={`pulse-tag ${countryClass(p.country)}`}>
                        {countryLabel(p.country)} · {p.category}
                      </span>
                    </div>
                    <h2
                      className="display"
                      style={{ fontSize: 22, margin: '0 0 8px', color: 'var(--mist)' }}
                    >
                      <a href={`/pulse/${p.slug}`} style={{ color: 'inherit' }}>
                        {p.title}
                      </a>
                    </h2>
                    <p style={{ fontSize: 15, color: '#B0B8C5', margin: '0 0 10px', lineHeight: 1.55 }}>
                      {p.summary}
                    </p>
                    <div
                      style={{
                        fontSize: 13,
                        color: 'var(--muted)',
                        fontFamily: 'var(--font-mono), monospace',
                        letterSpacing: '.05em',
                      }}
                    >
                      {formatPulseDate(p.publishedAt)} · {p.readMinutes ?? 4} min read
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </main>

      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
