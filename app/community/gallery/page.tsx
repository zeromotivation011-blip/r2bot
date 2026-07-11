import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { CopilotProvider } from '@/components/CopilotProvider';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { GalleryClient } from './GalleryClient';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

export const metadata: Metadata = {
  title: '"I Made It!" Gallery — R2BOT Community Builds',
  description: "Browse robot builds from the R2BOT community. Submit your own — share your photos, materials, and what you learned.",
  alternates: { canonical: `${BASE_URL}/community/gallery` },
};

export default function GalleryPage() {
  return (
    <CopilotProvider>
      <Nav />
      <main id="main-content" className="bg-[#050810] min-h-screen pt-32 pb-16">
        <GalleryClient />
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
