import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';
import { DiagnosticClient } from './DiagnosticClient';

export const metadata: Metadata = {
  title: 'Find Your Starting Point',
  description:
    "Five-minute discovery experience to find your robotics starting point. Warm, illustrated, never an exam.",
};

export default function DiagnosticPage() {
  return (
    <CopilotProvider>
      <ParticleField />
      <CursorTrail />
      <Nav />
      <DiagnosticClient />
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
