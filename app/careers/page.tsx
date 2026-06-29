import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';
import { CareersClient } from './CareersClient';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://robot-tan.vercel.app';

export const metadata: Metadata = {
  title: 'Career paths in robotics — India',
  description:
    'Concrete career roadmaps for robotics in India across four tracks — Spark, Wire, Forge, Edge. Atlas terms to master, projects to build, companies to apply to, salary ranges, certifications.',
  alternates: { canonical: `${BASE_URL}/careers` },
};

export default function CareersPage() {
  return (
    <CopilotProvider>
      <ParticleField />
      <CursorTrail />
      <Nav />
      <main id="main-content" style={{ paddingTop: 140, paddingBottom: 90, position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ maxWidth: 1000 }}>
          <div className="section-eyebrow">Careers · India</div>
          <h1
            className="display"
            style={{ fontSize: 'clamp(40px, 5.5vw, 64px)', margin: '0 0 16px' }}
          >
            Your robotics career in India — from zero to researcher.
          </h1>
          <p style={{ fontSize: 19, color: '#B0B8C5', maxWidth: 680, margin: '0 0 36px' }}>
            Pick your current level. We&apos;ll show you exactly where to go next.
          </p>
          <CareersClient />
        </div>
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
