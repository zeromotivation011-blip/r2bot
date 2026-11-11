import withBundleAnalyzer from '@next/bundle-analyzer';

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The sitemap is an ISR route, so it runs in a serverless function rather
  // than at build time. lib/build/loader.ts, lib/courses.ts and lib/lens.ts
  // read their content with fs.readdirSync(path.join(process.cwd(), ...)),
  // which Next cannot trace, so those directories were not shipped with the
  // function and every one of those readers returned an empty array at
  // runtime. The live sitemap was silently missing 46 real pages — all ten
  // robot projects, all 26 recorded course lessons and all ten Lens videos —
  // while the build output listed them correctly, which is exactly the kind
  // of drift the July sitemap freeze taught us to check for. Atlas survived
  // only because its entries also come from Supabase.
  outputFileTracingIncludes: {
    // Content read with fs at request time, per route group.
    //
    // lib/atlas.ts, lib/courses.ts, lib/lens.ts, lib/blog.ts, lib/academy.ts
    // and lib/build/loader.ts all read their content with
    // fs.readdirSync(path.join(process.cwd(), 'content', ...)). Next cannot
    // trace a runtime directory read, so whether the files ship with a
    // serverless function is luck: /academy/[track] had content/academy and
    // rendered its six lessons, while /sitemap.xml and /llms.txt silently had
    // nothing. The sitemap was missing 46 real pages (every robot project,
    // every recorded course lesson, every Lens video) and llms.txt listed no
    // courses at all, while the build output listed them correctly — the same
    // build-vs-runtime drift as the July sitemap freeze, and just as invisible.
    //
    // Any new route that reads from content/ at request time needs an entry.
    '/sitemap.xml': ['./content/**/*'],
    '/llms.txt': ['./content/**/*'],
    '/': ['./content/**/*'],
    '/courses/**': ['./content/courses/**/*'],
    '/academy/**': ['./content/academy/**/*'],
    '/lens/**': ['./content/lens/**/*', './content/lens-channels.json'],
    '/blog/**': ['./content/blog/**/*'],
    '/build/**': ['./content/build/**/*'],
    '/atlas/**': ['./content/atlas/**/*'],
    '/shorts/**': ['./content/atlas/**/*'],
    '/api/**': ['./content/**/*'],  // includes /api/admin/atlas/reindex, which reads every Atlas MDX
    '/admin/**': ['./content/**/*'],
  },
  // Allow images from external sources. Add domains here when wrapping
  // dynamic <img> tags with <Image unoptimized> would still hit the
  // optimizer (which it shouldn't, but keep the allowlist current).
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },
  // Security headers. Before 9 Nov 2026 the site sent only HSTS: no
  // frame-ancestors (clickjacking of /admin and /dashboard), no nosniff, no
  // Referrer-Policy (full URLs, including one-click unsubscribe tokens, were
  // sent as Referer to YouTube/GA), no Permissions-Policy.
  //
  // The CSP ships in Report-Only first. The ROS 2 Playground and Workspace
  // load Pyodide/wasm from jsDelivr and cdnjs, Monaco spawns blob: workers,
  // and Next hydration plus the gtag snippet need inline script, so an
  // enforced policy written without a week of reports would break pages.
  // Watch the console / a report endpoint, then rename the key to
  // Content-Security-Policy. frame-ancestors IS enforced now (a separate
  // header), because it cannot break anything on our own pages.
  async headers() {
    const supabase = 'https://bxgtocghjypbomszwvfr.supabase.co';
    const cspReportOnly = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://www.googletagmanager.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://pyodide.org https://ros2wasm.dev",
      "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      `connect-src 'self' ${supabase} ${supabase.replace('https', 'wss')} https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://pyodide.org https://ros2wasm.dev`,
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://ros2wasm.dev",
      "media-src 'self' blob: https:",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
    const common = [
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(), payment=(), usb=(), serial=(self), bluetooth=(self), interest-cohort=()' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'Content-Security-Policy-Report-Only', value: cspReportOnly },
    ];
    return [
      // Simulator embeds are meant to be framed by other sites (that is how
      // they earn links), so they get frame-ancestors * and no X-Frame-Options.
      {
        source: '/visualizer/embed/:path*',
        headers: [...common, { key: 'Content-Security-Policy', value: 'frame-ancestors *' }],
      },
      {
        source: '/((?!visualizer/embed).*)',
        headers: [
          ...common,
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        ],
      },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }, { key: 'Cache-Control', value: 'private, no-store' }] },
      { source: '/dashboard/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
    ];
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
      // 9 Nov 2026: six more robots got full /robots profiles.
      digit: 'digit',
      stretch: 'stretch',
      shakey: 'shakey',
      sojourner: 'sojourner',
      unimate: 'unimate',
      'ingenuity-helicopter': 'ingenuity',
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
      // GreyOrange is a company, and was filed as a concept. Rewritten from
      // primary sources in Nov 2026: the old entry called it 'India's Flagship
      // Robotics Unicorn' and described a hardware business that has since
      // moved its headquarters to Atlanta and pivoted to orchestration software.
      // Two entries owned "what is a state machine": state-machine (461 words)
      // and finite-state-machine (715, better sourced). One owner per query.
      { source: '/atlas/concept/state-machine', destination: '/atlas/concept/finite-state-machine', permanent: true },
      { source: '/atlas/concept/greyorange', destination: '/atlas/company/greyorange', permanent: true },
      { source: '/atlas/concept/drone-uav', destination: '/atlas/concept/drone', permanent: true },
      { source: '/atlas/concept/field-programmable-gate-array', destination: '/atlas/concept/fpga', permanent: true },
      // Same entry written twice. The fuller version (585 words vs 331, and
      // three inbound links vs one) keeps the URL.
      { source: '/atlas/concept/ce-marking-robots', destination: '/atlas/concept/ce-marking', permanent: true },
      // The by-line is an editorial identity now, at the owner's request, so
      // the author page moved off a URL that carried a personal name.
      { source: '/author/ravi', destination: '/about/how-this-is-written', permanent: true },
      { source: '/author/:slug', destination: '/about/how-this-is-written', permanent: true },
      // 11 Nov 2026: five blog posts were sub-350-word restatements of an Atlas
      // concept that is two to four times deeper and already owns the
      // "what is X" query (lib/canonical-map.ts, BLOG_TO_ATLAS). The MDX files
      // are deleted; the Atlas entry keeps the URL. Kept in sync with the
      // comment block in lib/canonical-map.ts.
      { source: '/blog/what-is-slam-in-plain-words', destination: '/atlas/concept/slam', permanent: true },
      { source: '/blog/pid-controller-explained-simply', destination: '/atlas/concept/pid-controller', permanent: true },
      { source: '/blog/computer-vision-for-robots-explained', destination: '/atlas/concept/computer-vision', permanent: true },
      { source: '/blog/sim-to-real-gap-explained', destination: '/atlas/concept/sim-to-real', permanent: true },
      { source: '/blog/large-language-models-and-robots', destination: '/atlas/concept/large-language-model-robotics', permanent: true },
      // Consolidation: Pulse is folded into the automated News feed.
      { source: '/pulse', destination: '/news', permanent: true },
      { source: '/pulse/weekly', destination: '/news', permanent: true },
      { source: '/pulse/rss.xml', destination: '/news/rss.xml', permanent: true },
      { source: '/pulse/:slug', destination: '/news', permanent: true },
    ];
  },
};

export default bundleAnalyzer(nextConfig);
