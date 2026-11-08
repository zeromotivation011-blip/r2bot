import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { CopilotProvider } from '@/components/CopilotProvider';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { AlgoCompareClient } from './AlgoCompareClient';

export const metadata: Metadata = {
  title: 'A* vs Dijkstra — R2BOT Compare',
  description: 'Watch A* and Dijkstra race on the same grid in real time. Same start, same goal, same obstacles.',
};

export default function AlgoComparePage() {
  return (
    <CopilotProvider>
      <Nav />
      <main id="main-content" className="bg-[#0A0E17] min-h-screen pt-32 pb-16">
        <div className="mx-auto max-w-5xl px-4">
          <header className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-1.5 text-sm font-semibold text-cyan-300">
              ⚔️ Algorithm Compare
            </span>
            <h1 className="mt-4 text-4xl font-black text-white sm:text-5xl">
              A* vs Dijkstra
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-zinc-400">
              Same grid, same start, same goal — different search strategies. Click cells to add obstacles, then run.
            </p>
          </header>
          <AlgoCompareClient />
        </div>
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
