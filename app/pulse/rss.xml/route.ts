import { getAllPulse } from '@/lib/pulse';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://robot-tan.vercel.app';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const dynamic = 'force-static';

export async function GET() {
  const articles = getAllPulse();
  const latest = articles[0];
  const lastBuildDate = latest ? new Date(latest.publishedAt).toUTCString() : new Date().toUTCString();

  const items = articles
    .map(a => {
      const url = `${BASE}/pulse/${a.slug}`;
      const pubDate = new Date(a.publishedAt).toUTCString();
      return `
    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(a.category)}</category>
      <description>${escapeXml(a.summary)}</description>
    </item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>R2BOT · Pulse</title>
    <link>${BASE}/pulse</link>
    <atom:link href="${BASE}/pulse/rss.xml" rel="self" type="application/rss+xml" />
    <description>Today's robotics, decoded. From the USA, China, India, Japan, Europe — in plain English.</description>
    <language>en-IN</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <ttl>60</ttl>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=600',
    },
  });
}
