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

    // Nine Atlas robot entries were the same robot as a /robots page, so each
    // one competed with itself for its own name. /robots/<slug> wins: specs,
    // stats, comparisons and a deep dive, against ~200 words in the Atlas.
    // Kept in sync with ATLAS_ROBOT_CANONICAL in lib/canonical-map.ts
    // (duplicated because next.config.mjs cannot import TypeScript).
    const atlasRobotCanonical = Object.entries({
      asimo: 'asimo',
      atlas: 'atlas',
      optimus: 'optimus',
      roomba: 'roomba',
      spot: 'spot',
      'curiosity-rover': 'curiosity',
      'da-vinci-surgical-system': 'da-vinci',
      'kiva-warehouse-robots': 'amazon-kiva',
      'perseverance-rover': 'perseverance',
    }).map(([from, to]) => ({
      source: `/atlas/robot/${from}`,
      destination: `/robots/${to}`,
      permanent: true,
    }));

    return [
      ...simulatorAliases,
      ...atlasRobotCanonical,
      // The /academy/c/* course system is retired. It was a second Academy
      // whose only complete course duplicated the Spark MDX lessons, and whose
      // other three were "Coming Soon · notify me" waitlists that /start sent
      // beginners to. One Academy now: /academy/<track>/<lesson>.
      { source: '/academy/c/spark-foundations/learn/:lesson', destination: '/academy/spark', permanent: true },
      { source: '/academy/c/wire-arduino-robotics/learn/:lesson', destination: '/academy/wire', permanent: true },
      { source: '/academy/c/forge-ros2/learn/:lesson', destination: '/academy/forge', permanent: true },
      { source: '/academy/c/edge-ai-robotics/learn/:lesson', destination: '/academy/edge', permanent: true },
      { source: '/academy/c/spark-foundations', destination: '/academy/spark', permanent: true },
      { source: '/academy/c/wire-arduino-robotics', destination: '/academy/wire', permanent: true },
      { source: '/academy/c/forge-ros2', destination: '/academy/forge', permanent: true },
      { source: '/academy/c/edge-ai-robotics', destination: '/academy/edge', permanent: true },
      { source: '/academy/c/:slug/learn/:lesson', destination: '/academy', permanent: true },
      { source: '/academy/c/:slug', destination: '/academy', permanent: true },
      // webots.cloud blocks embedding (X-Frame-Options: DENY), so the 3D Simulation page cannot work.
      { source: '/simulate', destination: '/visualizer', permanent: true },
      { source: '/world-map', destination: '/atlas', permanent: true },
      { source: '/world-map/embed', destination: '/atlas', permanent: true },
      // Duplicate Atlas entries (same title) -> keep one indexable page each.
      { source: '/atlas/concept/drone-uav', destination: '/atlas/concept/drone', permanent: true },
      { source: '/atlas/concept/field-programmable-gate-array', destination: '/atlas/concept/fpga', permanent: true },
      // Same entry written twice. The fuller version (585 words vs 331, and
      // three inbound links vs one) keeps the URL.
      { source: '/atlas/concept/ce-marking-robots', destination: '/atlas/concept/ce-marking', permanent: true },
      // Consolidation: Pulse is folded into the automated News feed.
      { source: '/pulse', destination: '/news', permanent: true },
      { source: '/pulse/weekly', destination: '/news', permanent: true },
      { source: '/pulse/rss.xml', destination: '/news/rss.xml', permanent: true },
      { source: '/pulse/:slug', destination: '/news', permanent: true },
    ];
  },
};

export default bundleAnalyzer(nextConfig);
