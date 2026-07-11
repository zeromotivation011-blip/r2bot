import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';
import { WebotsSimulator } from '@/components/WebotsSimulator';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

export const metadata: Metadata = {
  title: '3D Robot Simulation — R2BOT',
  description: 'Real physics. Real robots. No installation. Webots-powered simulations of TurtleBot3, UR5e arm, and DJI Mavic drone — straight from your browser.',
  alternates: { canonical: `${BASE_URL}/simulate` },
};

export default function SimulatePage() {
  return (
    <CopilotProvider>
      <ParticleField />
      <CursorTrail />
      <Nav />
      <main id="main-content" style={{ paddingTop: 140, paddingBottom: 100, position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ maxWidth: 920 }}>
          <div className="section-eyebrow">3D Physics · Powered by Webots</div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 5.5vw, 60px)', margin: '0 0 16px' }}>
            3D Robot Simulation.
          </h1>
          <p style={{ fontSize: 19, color: '#B0B8C5', maxWidth: 680, margin: 0 }}>
            Real physics. Real robots. No installation.
          </p>
        </div>

        <div className="container" style={{ maxWidth: 1200, marginTop: 36 }}>
          <WebotsSimulator />
        </div>

        <div className="container" style={{ maxWidth: 920, marginTop: 48, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <a
            href="/visualizer"
            style={{
              padding: '10px 18px',
              borderRadius: 999,
              border: '1px solid var(--border-2)',
              background: 'rgba(11,37,64,.5)',
              color: '#C8D0DC',
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            Want simpler? Try our browser sims →
          </a>
          <a
            href="/ros2"
            style={{
              padding: '10px 18px',
              borderRadius: 999,
              border: '1px solid var(--cyan)',
              background: 'rgba(0,184,212,.15)',
              color: 'var(--cyan-bright)',
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            Ready to code? Open the ROS2 playground →
          </a>
        </div>
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
