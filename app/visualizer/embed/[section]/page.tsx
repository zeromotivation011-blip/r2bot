import type { Metadata } from 'next';
import Link from 'next/link';

const KNOWN_SECTIONS: Record<string, { title: string; blurb: string }> = {
  robots: { title: 'Famous Robots', blurb: 'A simple roundup of famous robots from the R2BOT catalogue.' },
  playground: { title: 'Code Playground', blurb: 'Write Python in your browser and watch a robot move.' },
  ik: { title: 'IK Solver', blurb: 'Drag the gripper, see the joints update via inverse kinematics.' },
  astar: { title: 'A* Pathfinder', blurb: 'Draw a maze, watch A* find the shortest path.' },
  fusion: { title: 'Sensor Fusion', blurb: 'GPS + IMU = a smoother, more accurate position.' },
  slam: { title: 'SLAM Simulator', blurb: 'Watch a robot map an unknown world while localising itself.' },
  motor: { title: 'Motor Controller', blurb: 'Tune the PWM duty cycle and feel motor response.' },
  pid: { title: 'PID Tuner', blurb: 'Adjust P, I, D and watch the system converge.' },
};

export const dynamic = 'force-static';

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;
  const meta = KNOWN_SECTIONS[section];
  return {
    title: meta ? `${meta.title} · R2BOT Embed` : 'R2BOT Simulation Embed',
    description: meta?.blurb ?? 'Interactive robotics simulation embedded from R2BOT.',
    robots: { index: false, follow: false },
  };
}

export default async function EmbedSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const meta = KNOWN_SECTIONS[section];
  const fullUrl = `https://www.r2bot.in/visualizer#${section}`;

  if (!meta) {
    return (
      <main className="min-h-screen bg-[#0A0E17] p-6 text-zinc-200">
        <p className="text-sm">Unknown simulator. <Link href="/visualizer" className="text-amber-300 underline">Open the full visualizer</Link>.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0E17] p-6 text-zinc-200">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-[10px] uppercase tracking-wider text-amber-300">R2BOT · embed</p>
        <h1 className="mt-2 text-2xl font-extrabold text-white">{meta.title}</h1>
        <p className="mt-2 text-sm text-zinc-400">{meta.blurb}</p>

        <div className="mt-6 aspect-video w-full overflow-hidden rounded-2xl border border-white/10">
          <iframe
            src={fullUrl}
            title={meta.title}
            sandbox="allow-scripts allow-same-origin"
            loading="lazy"
            className="h-full w-full"
          />
        </div>

        <div className="mt-4 text-xs text-zinc-500">
          Powered by{' '}
          <Link href="/visualizer" className="text-amber-300 hover:underline">
            R2BOT Visualizer
          </Link>
          . Open the full lab for more sims and code.
        </div>
      </div>
    </main>
  );
}
