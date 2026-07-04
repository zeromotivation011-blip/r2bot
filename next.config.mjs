import withBundleAnalyzer from '@next/bundle-analyzer';

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow images from external sources. Add domains here when wrapping
  // dynamic <img> tags with <Image unoptimized> would still hit the
  // optimizer (which it shouldn't, but keep the allowlist current).
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'acrdjpmvdscngldxilgm.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },
  async redirects() {
    return [
      { source: '/world-map', destination: '/atlas', permanent: true },
      { source: '/world-map/embed', destination: '/atlas', permanent: true },
      // Consolidation: Pulse is folded into the automated News feed.
      { source: '/pulse', destination: '/news', permanent: true },
      { source: '/pulse/weekly', destination: '/news', permanent: true },
      { source: '/pulse/rss.xml', destination: '/news/rss.xml', permanent: true },
      { source: '/pulse/:slug', destination: '/news', permanent: true },
    ];
  },
};

export default bundleAnalyzer(nextConfig);
