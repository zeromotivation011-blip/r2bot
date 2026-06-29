import type { ReactNode } from 'react';
import { Nav } from './Nav';
import { ParticleField } from './ParticleField';
import { CursorTrail } from './CursorTrail';
import { CopilotBubble } from './CopilotBubble';
import { CopilotDrawer } from './CopilotDrawer';
import { CopilotProvider } from './CopilotProvider';

/**
 * Shell for simple static pages (About, Privacy, Terms, etc.).
 * Provides Nav, particle field, copilot, and a centered prose column.
 */
export function StaticPage({
  eyebrow,
  title,
  lede,
  children,
  maxWidth = 760,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <CopilotProvider>
      <ParticleField />
      <CursorTrail />
      <Nav />

      <main style={{ paddingTop: 140, paddingBottom: 100, position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ maxWidth }}>
          <div className="section-eyebrow">{eyebrow}</div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 5.5vw, 60px)', lineHeight: 1.05, margin: '0 0 22px', color: 'var(--mist)' }}>
            {title}
          </h1>
          {lede && (
            <p style={{ fontSize: 21, color: '#C8D0DC', lineHeight: 1.55, margin: '0 0 40px', borderLeft: '3px solid var(--cyan)', paddingLeft: 22 }}>
              {lede}
            </p>
          )}
          <div className="prose">{children}</div>
        </div>
      </main>

      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
