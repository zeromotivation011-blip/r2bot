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
    description: 'Latest robotics news, breakthroughs, and industry updates from 6 leading sources.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Robotics News — R2BOT' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Robotics News',
    description: 'Live robotics news aggregated from IEEE, MIT, TechCrunch, Wired, and more.',
    images: ['/og-default.png'],
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
      <main id="main-content" className="bg-[var(--void)] min-h-screen pt-24 pb-12">
        <NewsPageClient initialData={initialData} />

        {/* Server-rendered links into the archived per-article pages. The feed
            itself is client-rendered and links out to the original sources, so
            without this there is no crawlable path from /news to the indexable
            /news/<slug> stories — only the sitemap. Renders nothing until the
            archive cron has populated the table. */}
        {archived.length > 0 && (
          <section className="px-4 max-w-7xl mx-auto mt-12">
            <h2 className="text-xs uppercase tracking-widest font-black text-[var(--muted)] mb-4">
              Recently archived
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {archived.map((a) => (
                <Link
                  key={a.slug}
                  href={`/news/${a.slug}`}
                  className="block rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-1)] p-4 transition-colors hover:border-[var(--accent-line)]"
                >
                  <div className="mb-1 text-[11px] text-[var(--muted)]">{a.source}</div>
                  <div className="line-clamp-3 text-sm font-semibold text-[var(--mist)]">{a.title}</div>
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
