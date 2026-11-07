import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';
import { DiagnosticClient } from './DiagnosticClient';

export const metadata: Metadata = {
  alternates: { canonical: '/diagnostic' },
  title: 'Find Your Starting Point',
  description:
    "Five-minute discovery experience to find your robotics starting point. Warm, illustrated, never an exam.",
};

export default function DiagnosticPage() {
  return (
    <CopilotProvider>
      <Nav />
      <DiagnosticClient />
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
