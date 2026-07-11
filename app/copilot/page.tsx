import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { CopilotProvider } from '@/components/CopilotProvider';
import { CopilotPageClient } from './CopilotPageClient';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

export const metadata: Metadata = {
  title: 'R2 Co-pilot | AI Robotics Assistant for Indian Students — R2BOT',
  description:
    'Ask any robotics question. Get instant expert answers. Debug ROS2, understand papers, get career advice — your AI robotics mentor, free for Indian students.',
  keywords: [
    'AI robotics assistant',
    'robotics chatbot India',
    'ROS2 debugger AI',
    'robot career advisor',
    'R2 copilot',
    'free robotics tutor',
  ],
  alternates: { canonical: `${BASE_URL}/copilot` },
  openGraph: {
    type: 'website',
    url: `${BASE_URL}/copilot`,
    siteName: 'R2BOT',
    title: 'R2 Co-pilot — AI Robotics Assistant',
    description: 'Your free AI robotics mentor: debug ROS2, explain papers, plan projects, career guidance.',
    images: [{ url: '/og-default.svg', width: 1200, height: 630, alt: 'R2 Co-pilot' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'R2 Co-pilot | R2BOT',
    description: 'AI robotics assistant — ROS2 debugging, papers, projects, careers.',
    images: ['/og-default.svg'],
  },
};

export default function CopilotPage() {
  return (
    <CopilotProvider>
      <Nav />
      <main id="main-content" className="bg-[#050810] min-h-screen pt-24 pb-12">
        <CopilotPageClient />
      </main>
    </CopilotProvider>
  );
}
