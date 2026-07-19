import type { MetadataRoute } from 'next';
import { getAllAtlasEntries } from '@/lib/atlas';
import { getAllLens } from '@/lib/lens';
import { getAllAcademyLessons } from '@/lib/academy';
import { ROBOTS } from '@/lib/robots-data';
import { getAllPosts } from '@/lib/blog';
import { listProjectSlugs } from '@/lib/build/loader';
import { SIMULATORS } from '@/lib/simulators';

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Each simulator is its own indexable page targeting a low-competition
  // "tool" query. High priority: these are the pages most likely to earn
  // external links, which is what the whole domain's authority depends on.
  const simulators = SIMULATORS.map((s) => ({
    url: `${BASE}/visualizer/${s.id}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const atlas = getAllAtlasEntries().map((e) => ({
    url: `${BASE}/atlas/${e.type}/${e.slug}`,
    lastModified: new Date(e.lastReviewed ?? now),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const lens = getAllLens().map((v) => ({
    url: `${BASE}/lens/${v.slug}`,
    lastModified: new Date(v.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const academyLessons = getAllAcademyLessons().map((l) => ({
    url: `${BASE}/academy/${l.track}/${l.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const academyTracks = (['spark', 'wire', 'forge', 'edge'] as const).map((t) => ({
    url: `${BASE}/academy/${t}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }));

  const buildProjects = listProjectSlugs().map((slug) => ({
    url: `${BASE}/build/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }));

  const blogPosts = getAllPosts().map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: new Date(p.date ?? now),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [
    // Core surfaces
    { url: BASE,                       lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE}/atlas`,            lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE}/academy`,          lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE}/build`,            lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE}/diagnostic`,       lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/pricing`,          lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE}/copilot`,          lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/careers`,          lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/lens`,             lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE}/news`,             lastModified: now, changeFrequency: 'daily',   priority: 0.6 },
    { url: `${BASE}/daily-life`,       lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/blog`,             lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE}/community`,        lastModified: now, changeFrequency: 'daily',   priority: 0.7 },
    { url: `${BASE}/lab`,              lastModified: now, changeFrequency: 'daily',   priority: 0.5 },
    { url: `${BASE}/about`,            lastModified: now, changeFrequency: 'monthly', priority: 0.4 },

    // Secondary content surfaces
    { url: `${BASE}/robots`,           lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${BASE}/visualizer`,       lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/mission`,          lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/community/gallery`,lastModified: now, changeFrequency: 'daily',   priority: 0.6 },
    { url: `${BASE}/workspace`,        lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/ros2`,             lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/simulate`,         lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/challenges`,       lastModified: now, changeFrequency: 'weekly',  priority: 0.5 },

    // Boilerplate
    { url: `${BASE}/privacy`,          lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${BASE}/terms`,            lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${BASE}/sources`,          lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },

    // Dynamic content surfaces
    ...academyTracks,
    ...academyLessons,
    ...simulators,
    ...atlas,
    ...buildProjects,
    ...blogPosts,
    ...lens,
    ...ROBOTS.map((r) => ({
      url: `${BASE}/robots/${r.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    })),
  ];
}
