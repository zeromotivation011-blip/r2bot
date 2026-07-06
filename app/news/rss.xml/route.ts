// app/news/rss.xml/route.ts
// Public RSS feed for R2BOT News, generated live from the automated aggregator.
// Replaces the old static /pulse/rss.xml (which now redirects here).

import { getNewsData } from '@/lib/news';

export const runtime = 'nodejs';
export const revalidate = 1800; // 30 min

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.r2bot.in';

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(): Promise<Response> {
  const { articles, lastUpdated } = await getNewsData();

  const items = articles
    .slice(0, 40)
    .map((a) => {
      const desc = a.aiSummary || a.description || '';
      const pubDate = new Date(a.publishedAt).toUTCString();
      return `    <item>
      <title>${xmlEscape(a.title)}</title>
      <link>${xmlEscape(a.url)}</link>
      <guid isPermaLink="false">${xmlEscape(a.id || a.url)}</guid>
      <pubDate>${pubDate}</pubDate>
      <source>${xmlEscape(a.source)}</source>
      <category>${xmlEscape(a.topic)}</category>
      <description>${xmlEscape(desc)}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>R2BOT News — robotics, decoded</title>
    <link>${BASE_URL}/news</link>
    <atom:link href="${BASE_URL}/news/rss.xml" rel="self" type="application/rss+xml" />
    <description>Daily robotics news from IEEE Spectrum, MIT, The Robot Report, TechCrunch and more — summarized and decoded for learners worldwide.</description>
    <language>en</language>
    <lastBuildDate>${new Date(lastUpdated).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=600',
    },
  });
}
