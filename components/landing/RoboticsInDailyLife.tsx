// components/landing/RoboticsInDailyLife.tsx
// Landing-page teaser: 6 standout use cases + CTA to /daily-life for the full personalised experience.

import Link from 'next/link';
import { USE_CASES } from '@/lib/daily-life-data';

// Curated 6 highlights for the landing teaser.
const TEASER_IDS = ['atm', 'roomba', 'da-vinci-surgery', 'drone-spray', 'upi', 'welding-arm'];

export default function RoboticsInDailyLife() {
  const teasers = TEASER_IDS
    .map((id) => USE_CASES.find((u) => u.id === id))
    .filter(Boolean) as typeof USE_CASES;

  return (
    <section id="daily-life" className="bg-gray-950 px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-400">
            🤖 Robots Are Already Running Your Life
          </div>
          <h2 className="mb-4 text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
            You Use Robots
            <br />
            <span className="text-amber-400">Every Single Day</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-400">
            From the ATM to your UPI payment to the rice on your plate — robots are everywhere.
            See the <strong className="text-white">{USE_CASES.length} robots</strong> already in your life.
          </p>
        </div>

        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teasers.map((u) => (
            <Link
              key={u.id}
              href="/daily-life"
              className="group flex flex-col rounded-2xl border border-gray-800 bg-gray-900 p-5 transition-colors hover:border-amber-500/40"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl" aria-hidden>
                  {u.imageEmoji}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-white">{u.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-snug text-amber-300 group-hover:text-amber-200">
                    {u.hookLine}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/daily-life"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-7 py-3.5 text-base font-extrabold text-[#1a0f00] shadow-[0_10px_30px_rgba(245,158,11,0.35)] transition-transform hover:scale-[1.03]"
          >
            See all {USE_CASES.length} robots in your life →
          </Link>
          <p className="mt-3 text-sm text-gray-500">
            Pick your profile (student, farmer, doctor…) for a personalised view.
          </p>
        </div>
      </div>
    </section>
  );
}
