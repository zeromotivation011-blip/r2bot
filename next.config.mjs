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
    // Legacy / descriptive simulator slugs -> the canonical page.
    //
    // These are real 308s. Handling them inside the route with redirect() gave
    // HTTP 200 with a client-side redirect (Next cannot set a redirect status
    // on a statically rendered page), which leaves a duplicate indexable URL
    // for every alias. Doing it here also lets the route set
    // dynamicParams = false, so unknown slugs return a true 404 instead of a
    // soft 404.
    //
    // Kept in sync with SLUG_ALIASES in lib/simulators.ts. Duplicated rather
    // than imported because next.config.mjs cannot import TypeScript.
    const simulatorAliases = Object.entries({
      'line-follower': 'pid',
      'pid-controller': 'pid',
      'pid-tuner': 'pid',
      'a-star': 'astar',
      'a-star-pathfinding': 'astar',
      'pathfinding': 'astar',
      'grid-navigator': 'astar',
      'grid-pathfinder': 'astar',
      'arm-kinematics': 'ik',
      'inverse-kinematics': 'ik',
      'sensor-fusion': 'fusion',
      'kalman': 'fusion',
      'kalman-filter': 'fusion',
      'motor-control': 'motor',
      'pwm': 'motor',
      'code-playground': 'playground',
      '3d': 'robots',
      'urdf': 'robots',
      'urdf-viewer': 'robots',
      'robot-explorer': 'robots',
      'stl': 'sense-think-act',
      'types-of-robots': 'robot-types',
    }).map(([from, to]) => ({
      source: `/visualizer/${from}`,
      destination: `/visualizer/${to}`,
      permanent: true,
    }));

    return [
      ...simulatorAliases,
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
