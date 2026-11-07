import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { CopilotProvider } from '@/components/CopilotProvider';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { HardwareClient } from './HardwareClient';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

export const metadata: Metadata = {
  title: 'Robotics Hardware Guide: Sensors, Motors & Controllers',
  description:
    'A searchable index of 50+ robotics components with simple cost levels and example store links. Arduino, ESP32, sensors, motors and batteries for school and hobby robot projects.',
  keywords: [
    'robot parts list',
    'servo motor for robot',
    'robotics components',
    'ESP32 robotics',
    'robot parts robocraze',
    'robu.in hardware list',
  ],
  alternates: { canonical: `${BASE_URL}/hardware` },
};

export default function HardwarePage() {
  return (
    <CopilotProvider>
      <Nav />
      <main id="main-content" className="bg-[var(--void)] min-h-screen pt-32 pb-16">
        <HardwareClient />
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
