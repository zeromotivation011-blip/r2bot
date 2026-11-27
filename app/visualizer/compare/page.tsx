import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { CopilotProvider } from '@/components/CopilotProvider';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { jsonldScript } from '@/lib/seo/jsonld';
import { AlgoCompareClient } from './AlgoCompareClient';

// Same guard as app/visualizer/[slug]/page.tsx: never emit a *.vercel.app canonical.
const SITE =
  process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app')
    ? process.env.NEXT_PUBLIC_SITE_URL
    : 'https://www.r2bot.in';
const URL = `${SITE}/visualizer/compare`;

const TITLE = 'A* vs Dijkstra: Watch Both Search the Same Grid';
const DESCRIPTION =
  'Run A* and Dijkstra side by side on the same grid, draw your own walls, and count the cells each one expands. Both find a shortest path; A* expands far fewer cells.';

// Until 27 Nov 2026 this page had no metadata of its own, so it inherited the
// root layout's canonical (the homepage) and told Google it was a duplicate of /.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, siteName: 'R2BOT', type: 'website' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

const SOURCES: { label: string; href: string }[] = [
  {
    label:
      'Hart, Nilsson & Raphael (1968), "A Formal Basis for the Heuristic Determination of Minimum Cost Paths", IEEE Transactions on Systems Science and Cybernetics 4(2)',
    href: 'https://doi.org/10.1109/TSSC.1968.300136',
  },
  {
    label: 'Dijkstra (1959), "A note on two problems in connexion with graphs", Numerische Mathematik 1',
    href: 'https://doi.org/10.1007/BF01386390',
  },
  {
    label: 'Amit Patel, "Heuristics" (Amit’s A* pages, Stanford), including breaking ties',
    href: 'https://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html',
  },
  {
    label: 'Nav2 source, nav2_navfn_planner: the use_astar parameter (default false, Dijkstra)',
    href: 'https://github.com/ros-navigation/navigation2/blob/main/nav2_navfn_planner/src/parameter_handler.cpp',
  },
];

export default function AlgoComparePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: TITLE,
    url: URL,
    description: DESCRIPTION,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any (web browser)',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isAccessibleForFree: true,
    publisher: { '@type': 'Organization', name: 'R2BOT', url: SITE },
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Simulators', item: `${SITE}/visualizer` },
      { '@type': 'ListItem', position: 2, name: 'A* vs Dijkstra', item: URL },
    ],
  };

  return (
    <CopilotProvider>
      <Nav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonldScript(breadcrumbLd) }} />
      <main id="main-content" className="bg-[var(--void)] min-h-screen pt-32 pb-16">
        <div className="mx-auto max-w-5xl px-4">
          <nav aria-label="Breadcrumb" className="mb-4 text-sm text-zinc-500">
            <Link href="/visualizer" className="text-zinc-500 hover:text-zinc-300">
              Simulators
            </Link>
            <span className="mx-2">/</span>
            <span className="text-zinc-300">A* vs Dijkstra</span>
          </nav>
          <header className="text-center">
            <h1 className="mt-2 text-4xl font-black text-white sm:text-5xl">A* vs Dijkstra</h1>
            <p className="mx-auto mt-3 max-w-xl text-zinc-400">
              Same grid, same start, same goal. Both find a shortest path; watch how many cells each one has to
              expand to find it. Click cells to add walls, then run.
            </p>
          </header>

          <AlgoCompareClient />

          <article className="mx-auto mt-14 max-w-3xl text-[15px] leading-relaxed text-zinc-300">
            <h2 className="text-2xl font-bold text-white">What you are looking at</h2>
            <p className="mt-3">
              Each square is a place a robot could stand. Both searches start at the green square and move one square
              up, down, left or right at a time, each move costing 1. A shaded square is one the search has{' '}
              <strong className="text-white">expanded</strong>: taken off its to-do list and checked all its
              neighbours. The bright line at the end is the path it returns.
            </p>

            <h2 className="mt-8 text-2xl font-bold text-white">Why A* expands fewer cells</h2>
            <p className="mt-3">
              Dijkstra&apos;s algorithm always expands the cell with the shortest distance travelled so far, so it
              spreads out evenly in every direction like a ripple, including directly away from the goal. A* expands
              the cell with the lowest <code className="text-amber-300">f = g + h</code>, where{' '}
              <code className="text-amber-300">g</code> is the distance travelled and{' '}
              <code className="text-amber-300">h</code> is an estimate of the distance still to go. Here{' '}
              <code className="text-amber-300">h</code> is the Manhattan distance (horizontal steps plus vertical
              steps), which never overestimates on a grid where you can only move in four directions. Because of that,
              A* still returns a shortest path, exactly as Hart, Nilsson and Raphael proved in 1968, but it spends its
              effort on cells that point towards the goal. Set <code className="text-amber-300">h = 0</code> and A*
              becomes Dijkstra.
            </p>
            <p className="mt-3">
              When several cells share the lowest <code className="text-amber-300">f</code>, this A* takes the one
              closer to the goal. On open ground that tie-break is the difference between heading straight for the
              goal and fanning out across every equally good cell first.
            </p>

            <h2 className="mt-8 text-2xl font-bold text-white">Why the time is not the headline</h2>
            <p className="mt-3">
              On a 22 × 14 grid both searches finish in a few milliseconds, and the exact figure depends on your device,
              the browser&apos;s JIT warming up, and how each open list is stored in this demo. Cells expanded is the
              work the heuristic actually saves, and that saving grows with the size of the map. Real robots face the
              same choice: the NavFn global planner in ROS 2 Nav2 searches with Dijkstra by default and switches to A*
              when its <code className="text-amber-300">use_astar</code> parameter is set to true.
            </p>

            <h2 className="mt-8 text-2xl font-bold text-white">Try this</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>Wall off the goal completely. With no path to find, both expand every cell they can reach.</li>
              <li>Build a cup of walls around the start that opens away from the goal. The heuristic now points into a
                dead end: A* presses into the back of the cup first and has to work its way out, so it expands several
                times more cells than on open ground.</li>
              <li>Clear every wall. A* walks almost straight to the goal while Dijkstra fills most of the grid.</li>
            </ul>

            <h2 className="mt-8 text-2xl font-bold text-white">Go deeper</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { href: '/atlas/concept/a-star-algorithm', label: 'A* algorithm (Atlas)' },
                { href: '/atlas/concept/path-planning', label: 'Path planning' },
                { href: '/atlas/concept/costmap', label: 'Costmaps' },
                { href: '/visualizer/astar', label: 'A* step by step' },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="inline-flex min-h-[44px] items-center rounded-full border border-white/15 bg-white/[0.03] px-4 text-sm text-zinc-200 hover:border-white/30"
                >
                  {l.label}
                </Link>
              ))}
            </div>

            <h2 className="mt-8 text-xl font-bold text-white">Sources</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-400">
              {SOURCES.map((s) => (
                <li key={s.href}>
                  <a href={s.href} className="text-zinc-300 underline decoration-white/30 hover:text-white" rel="noopener">
                    {s.label}
                  </a>
                </li>
              ))}
            </ol>
          </article>
        </div>
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
