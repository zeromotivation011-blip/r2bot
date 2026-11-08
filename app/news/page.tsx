import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { CopilotProvider } from '@/components/CopilotProvider';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { NewsPageClient } from './NewsPageClient';
import { getNewsData, getRecentArchivedNews } from '@/lib/news';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

export const metadata: Metadata = {
  title: 'Robotics News | Latest Robotics Breakthroughs',
  description:
    'Daily robotics news from IEEE Spectrum, The Robot Report, MIT, and TechCrunch. Latest robot launches, research breakthroughs, and industry updates.',
  keywords: [
    'robotics news',
    'latest robotics news',
    'robot news today',
    'IEEE Spectrum robotics',
    'humanoid robot news',
    'robot breakthroughs',
  ],
  alternates: { canonical: `${BASE_URL}/news` },
  openGraph: {
    type: 'website',
    url: `${BASE_URL}/news`,
    siteName: 'R2BOT',
    title: 'Robotics News',
    description: 'Latest robotics news, breakthroughs, and industry updates from 9 leading sources.',
    images: [{ url: '/og-default.svg', width: 1200, height: 630, alt: 'Robotics News — R2BOT' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Robotics News',
    description: 'Live robotics news aggregated from IEEE, MIT, TechCrunch, Wired, and more.',
    images: ['/og-default.svg'],
  },
};

export const revalidate = 3600;

export default async function NewsPage() {
  const [initialData, archived] = await Promise.all([
    getNewsData(),
    getRecentArchivedNews(12),
  ]);

  return (
    <CopilotProvider>
      <Nav />
      <main id="main-content" className="bg-[#0A0E17] min-h-screen pt-24 pb-12">
        <NewsPageClient initialData={initialData} />

        {/* Server-rendered links into the archived per-article pages. This gives
            crawlers (and readers) a path from /news to the indexable
            /news/<slug> stories, alongside the sitemap. Renders nothing until
            the archive cron has populated the table. */}
        {archived.length > 0 && (
          <section className="px-4 max-w-7xl mx-auto mt-12">
            <h2 className="text-xs uppercase tracking-widest font-black text-zinc-400 mb-4">
              Recently archived
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {archived.map((a) => (
                <Link
                  key={a.slug}
                  href={`/news/${a.slug}`}
                  className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:border-cyan-400/30 transition-colors"
                >
                  <div className="text-[11px] text-zinc-500 mb-1">{a.source}</div>
                  <div className="text-sm font-bold text-zinc-100 leading-snug line-clamp-3">{a.title}</div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
