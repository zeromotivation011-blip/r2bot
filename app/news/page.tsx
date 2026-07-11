import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { CopilotProvider } from '@/components/CopilotProvider';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { NewsPageClient } from './NewsPageClient';
import { getNewsData } from '@/lib/news';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

export const metadata: Metadata = {
  title: 'Robotics News | Latest Robotics Breakthroughs — R2BOT',
  description:
    'Daily robotics news from IEEE Spectrum, The Robot Report, MIT, TechCrunch. Latest robot launches, research breakthroughs, India robotics updates.',
  keywords: [
    'robotics news',
    'latest robotics news',
    'robot news today',
    'IEEE Spectrum robotics',
    'India robotics news',
    'robot breakthroughs',
  ],
  alternates: { canonical: `${BASE_URL}/news` },
  openGraph: {
    type: 'website',
    url: `${BASE_URL}/news`,
    siteName: 'R2BOT',
    title: 'Robotics News — R2BOT',
    description: 'Latest robotics news, breakthroughs, and India updates from 6 leading sources.',
    images: [{ url: '/og-default.svg', width: 1200, height: 630, alt: 'Robotics News — R2BOT' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Robotics News | R2BOT',
    description: 'Live robotics news aggregated from IEEE, MIT, TechCrunch, Wired, and more.',
    images: ['/og-default.svg'],
  },
};

export const revalidate = 3600;

export default async function NewsPage() {
  const initialData = await getNewsData();
  return (
    <CopilotProvider>
      <Nav />
      <main id="main-content" className="bg-[#050810] min-h-screen pt-24 pb-12">
        <NewsPageClient initialData={initialData} />
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
