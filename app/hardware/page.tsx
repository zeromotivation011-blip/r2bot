import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { CopilotProvider } from '@/components/CopilotProvider';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { HardwareClient } from './HardwareClient';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://robot-tan.vercel.app';

export const metadata: Metadata = {
  title: 'Robotics Hardware Guide | Sensors, Motors & Controllers for Indian Makers',
  description:
    'A searchable index of 50+ robotics components with Indian prices and store links. Arduino, ESP32, sensors, motors, LiPo batteries — perfect for Class 9–12 STEM projects.',
  keywords: [
    'arduino sensors price india',
    'servo motor for robot india',
    'robotics components india',
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
      <main id="main-content" className="bg-[#050810] min-h-screen pt-32 pb-16">
        <HardwareClient />
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
