import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { CopilotProvider } from '@/components/CopilotProvider';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';

export const metadata: Metadata = {
  title: 'Page Not Found',
  description:
    "Looks like this robot got lost. The page you're looking for doesn't exist — but the rest of R2BOT does.",
  robots: { index: false, follow: true },
};

const DESTINATIONS: { emoji: string; label: string; href: string; description: string }[] = [
  { emoji: '🎓', label: 'Academy', href: '/academy', description: 'Start learning robotics with hands-on lessons.' },
  { emoji: '📚', label: 'Atlas', href: '/atlas', description: 'Robotics encyclopedia in plain English.' },
  { emoji: '🤖', label: 'R2 Co-pilot', href: '/copilot', description: 'AI mentor — ask anything, grounded in the Atlas.' },
  { emoji: '🏆', label: 'Community Builds', href: '/community', description: 'Real robots built by R2BOT learners.' },
];

export default function NotFound() {
  return (
    <CopilotProvider>
      <Nav />
      <main
        id="main-content"
        className="relative flex min-h-[calc(100vh-90px)] items-center justify-center overflow-hidden bg-[#050810] px-4 pb-16 pt-32"
      >
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <div className="text-7xl sm:text-8xl" aria-hidden>🤖</div>

          <p className="mt-4 font-mono text-xs uppercase tracking-[0.35em] text-amber-300">
            404 · Page not found
          </p>

          <h1 className="mt-3 font-black leading-tight text-white text-[clamp(36px,5vw,52px)]">
            Looks like this robot got lost.
          </h1>

          <p className="mx-auto mt-4 max-w-lg text-base text-zinc-300 sm:text-lg">
            The page you wanted doesn&apos;t exist anymore — or maybe never did. The rest of R2BOT is right here.
          </p>

          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-7 py-3 text-base font-extrabold text-[#1a0f00] shadow-[0_10px_30px_rgba(245,158,11,0.35)] transition-transform hover:scale-[1.02]"
            >
              Go to Homepage →
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {DESTINATIONS.map((d) => (
              <Link
                key={d.href}
                href={d.href}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-amber-400/40"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden>{d.emoji}</span>
                  <span className="font-bold text-white group-hover:text-amber-200">{d.label}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{d.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
