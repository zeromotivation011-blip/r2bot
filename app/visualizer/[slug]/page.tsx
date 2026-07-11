import { redirect } from 'next/navigation';

// Legacy / deep-link safety net. Individual simulators live as hash-anchored
// sections on /visualizer, not as their own routes. This catch-all maps old
// per-sim slugs to the right anchor so links like /visualizer/line-follower
// never 404.
const SLUG_TO_ANCHOR: Record<string, string> = {
  'line-follower': 'pid', 'pid': 'pid',
  'arm-kinematics': 'ik', 'ik': 'ik', 'inverse-kinematics': 'ik',
  'sensor-fusion': 'fusion', 'fusion': 'fusion',
  'grid-navigator': 'astar', 'grid-pathfinder': 'astar', 'astar': 'astar', 'a-star': 'astar',
  'slam': 'slam', 'motor': 'motor', 'motor-control': 'motor',
  'playground': 'playground', 'robots': 'robots', '3d': 'robots',
};

export default async function VisualizerSlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const anchor = SLUG_TO_ANCHOR[slug?.toLowerCase()];
  redirect(anchor ? `/visualizer#${anchor}` : '/visualizer');
}
