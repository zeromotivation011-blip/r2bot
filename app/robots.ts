import type { MetadataRoute } from 'next';

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard',
          '/profile',
          '/login',
          '/signup',
          '/auth/',
          '/verify/',
          // Parked features — kept in the codebase but hidden from nav and search
          // until we hit scale (see CLAUDE.md §6). Not linked anywhere public.
          '/schools',
          '/hardware',
          '/kids',
          '/jobs',
          '/leaderboard',
          '/history',
          '/world-map',
          '/pulse',
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
