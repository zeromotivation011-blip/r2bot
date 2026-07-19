import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { CopilotProvider } from '@/components/CopilotProvider';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { currentChallenges, currentISOWeek } from '@/lib/weekly-challenges';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

export const metadata: Metadata = {
  title: 'Weekly Robotics Challenges',
  description:
    'Three new robotics learning challenges every week. Complete them for bonus XP, badges, and streaks.',
  alternates: { canonical: `${BASE_URL}/challenges` },
};

export const revalidate = 3600;

export default function ChallengesPage() {
  const challenges = currentChallenges();
  const week = currentISOWeek();
  return (
    <CopilotProvider>
      <Nav />
      <main id="main-content" className="bg-[#0A0E17] min-h-screen pt-32 pb-16">
        <div className="mx-auto max-w-4xl px-4">
          <header className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-1.5 text-sm font-semibold text-amber-300">
              🎯 Weekly Challenges · {week}
            </span>
            <h1 className="mt-4 text-4xl font-black text-white sm:text-5xl">
              Three challenges.{' '}
              <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
                One week.
              </span>
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-zinc-400">
              Complete each to earn bonus XP, unlock badges, and keep your streak alive. New rotation every Monday.
            </p>
          </header>

          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {challenges.map((c) => (
              <li
                key={c.id}
                className="flex flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-amber-400/40"
              >
                <span className="text-4xl" aria-hidden>{c.emoji}</span>
                <h3 className="mt-3 text-xl font-extrabold leading-tight text-white">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">{c.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 font-mono text-[11px] font-bold text-amber-200">
                    +{c.bonusXp} XP bonus
                  </span>
                  <Link
                    href={c.cta.href}
                    className="text-xs font-semibold text-amber-300 hover:text-amber-200"
                  >
                    {c.cta.label}
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-10 text-center text-xs text-zinc-500">
            XP is tracked once you log in. Streak progress and badges show on your <Link className="text-amber-300 hover:underline" href="/dashboard">dashboard</Link>.
          </p>
        </div>
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
