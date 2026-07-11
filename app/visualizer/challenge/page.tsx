import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { CopilotProvider } from '@/components/CopilotProvider';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { PIDChallengeClient } from './PIDChallengeClient';

export const metadata: Metadata = {
  title: 'PID Tuner Challenge',
  description:
    'Tune a PID controller to reach setpoint 80 with <10% overshoot in <5 seconds. Score yourself against the target.',
};

export default function PIDChallengePage() {
  return (
    <CopilotProvider>
      <Nav />
      <main id="main-content" className="bg-[#050810] min-h-screen pt-32 pb-16">
        <div className="mx-auto max-w-3xl px-4">
          <header className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-1.5 text-sm font-semibold text-amber-300">
              🎯 PID Challenge
            </span>
            <h1 className="mt-4 text-4xl font-black text-white sm:text-5xl">
              Tune the controller. Beat the target.
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-zinc-400">
              <strong className="text-white">Goal:</strong> reach setpoint 80 with under 10% overshoot in under 5 seconds.
            </p>
          </header>
          <PIDChallengeClient />
        </div>
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
