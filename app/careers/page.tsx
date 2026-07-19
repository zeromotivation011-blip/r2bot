import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';
import { CareersClient } from './CareersClient';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

export const metadata: Metadata = {
  title: 'Robotics Career Paths — From Zero to Robotics Engineer',
  description:
    'Concrete robotics career roadmaps across four tracks — Spark, Wire, Forge, Edge. Atlas terms to master, projects to build, companies to apply to, salary ranges, and certifications.',
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
          <div className="section-eyebrow">Careers</div>
          <h1
            className="display"
            style={{ fontSize: 'clamp(40px, 5.5vw, 64px)', margin: '0 0 16px' }}
          >
            Your robotics career — from zero to researcher.
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
