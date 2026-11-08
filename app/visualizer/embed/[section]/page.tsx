import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import { SIMULATORS, getSimulator, type SimulatorId } from '@/lib/simulators';

/**
 * The embeddable version of a simulator — the page other people's sites put in
 * an iframe, and the main realistic way this domain earns links.
 *
 * It used to render a page that *itself* iframed `/visualizer#<section>`: a
 * hash on the hub. So an embedded PID tuner showed the whole visualizer index,
 * complete with site nav, nested two iframes deep, inside a 16:9 box. It also
 * only knew eight of the ten simulators, so the embed snippet for
 * sense-think-act and robot-types rendered "Unknown simulator" — on the exact
 * feature meant to bring people back here.
 *
 * It now renders the simulator component directly, with no nav and no chrome
 * beyond a title and one visible attribution link. The URL is unchanged, so
 * every embed snippet already copied from a simulator page keeps working.
 */

// Same dynamic imports as the full page: an embed must never pull the 3D viewer
// or Monaco into a host page that only wanted the PID tuner.
const COMPONENTS: Record<SimulatorId, React.ComponentType> = {
  pid: dynamic(() => import('@/components/visuals/PIDSimulator').then((m) => m.PIDSimulator)),
  astar: dynamic(() => import('@/components/visuals/AStarVisual').then((m) => m.AStarVisual)),
  slam: dynamic(() => import('@/components/visuals/SLAMVisual').then((m) => m.SLAMVisual)),
  ik: dynamic(() =>
    import('@/components/visuals/InverseKinematicsVisual').then((m) => m.InverseKinematicsVisual),
  ),
  fusion: dynamic(() =>
    import('@/components/visuals/SensorFusionVisual').then((m) => m.SensorFusionVisual),
  ),
  motor: dynamic(() =>
    import('@/components/visuals/MotorControlVisual').then((m) => m.MotorControlVisual),
  ),
  playground: dynamic(() =>
    import('@/components/visuals/RobotPlayground').then((m) => m.RobotPlayground),
  ),
  robots: dynamic(() =>
    import('@/components/visuals/URDFViewerWrapper').then((m) => m.URDFViewerWrapper),
  ),
  'sense-think-act': dynamic(() =>
    import('@/components/visuals/SenseThinkActVisual').then((m) => m.SenseThinkActVisual),
  ),
  'robot-types': dynamic(() =>
    import('@/components/visuals/RobotTypesVisual').then((m) => m.RobotTypesVisual),
  ),
};

const BASE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
  return SIMULATORS.map((s) => ({ section: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const sim = getSimulator((await params).section);
  return {
    title: sim ? `${sim.title} · R2BOT embed` : 'R2BOT embed',
    description: sim?.blurb ?? 'Interactive robotics simulator embedded from R2BOT.',
    // An embed is a duplicate of the real page by design: never index it, but
    // do follow, so the attribution link below passes through.
    robots: { index: false, follow: true },
  };
}

export default async function EmbedSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const sim = getSimulator(section);
  if (!sim) notFound();
  const Simulator = COMPONENTS[sim.id];

  return (
    <main className="min-h-screen bg-[var(--void)] p-4 text-zinc-200">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-lg font-extrabold text-white">{sim.title}</h1>
        <p className="mt-1 text-sm text-zinc-400">{sim.blurb}</p>

        <div className="mt-4">
          <Simulator />
        </div>

        {/* The reason this page exists. One line, always visible, always a
            real link back to the page that can rank. */}
        <p className="mt-4 text-xs text-zinc-500">
          Free interactive simulator by{' '}
          <a
            href={`${BASE}/visualizer/${sim.id}`}
            target="_blank"
            rel="noopener"
            className="font-bold text-gray-300 hover:underline"
          >
            R2BOT
          </a>
          {' · '}
          <a
            href={`${BASE}/visualizer`}
            target="_blank"
            rel="noopener"
            className="hover:underline"
          >
            nine more, all free
          </a>
        </p>
      </div>
    </main>
  );
}
