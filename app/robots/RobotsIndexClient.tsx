'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ROBOTS, ROBOT_TYPE_LABELS, type Robot, type RobotType } from '@/lib/robots-data';
import { getRobotExtra } from '@/lib/robots-extra';
import { CompareProvider, CompareButton, CompareDrawer, useCompare } from '@/components/robots/RobotCompare';
import { RobotTagFilter } from '@/components/robots/RobotTagFilter';

type FilterKey = 'all' | RobotType | 'india';

const FILTERS: { key: FilterKey; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '✨' },
  { key: 'humanoid', label: 'Humanoid', emoji: '🤖' },
  { key: 'quadruped', label: 'Quadruped', emoji: '🐕' },
  { key: 'industrial', label: 'Industrial', emoji: '🦾' },
  { key: 'space', label: 'Space', emoji: '🪐' },
  { key: 'consumer', label: 'Consumer', emoji: '🧹' },
  { key: 'medical', label: 'Medical', emoji: '🏥' },
  { key: 'india', label: 'India', emoji: '🇮🇳' },
];

function matchesFilter(robot: Robot, filter: FilterKey): boolean {
  if (filter === 'all') return true;
  if (filter === 'india') return robot.country === 'India';
  return robot.type === filter;
}

export function RobotsIndexClient() {
  return (
    <CompareProvider>
      <RobotsIndexInner />
      <CompareDrawer />
    </CompareProvider>
  );
}

function RobotsIndexInner() {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [tags, setTags] = useState<string[]>([]);
  const { selected, setOpen } = useCompare();

  const filtered = useMemo(
    () =>
      ROBOTS.filter((r) => {
        if (!matchesFilter(r, filter)) return false;
        if (tags.length > 0) {
          const t = getRobotExtra(r).tags;
          if (!tags.every((tag) => t.includes(tag))) return false;
        }
        return true;
      }),
    [filter, tags],
  );

  return (
    <>
      <HallOfFameTicker />

      <section className="relative overflow-hidden bg-[#0A0E17] px-4 pb-8 pt-24">
        <div className="mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-1.5 text-sm font-semibold text-amber-300">
            🏆 Hall of Fame · documentary deep dives
          </span>
          <h1 className="mt-6 font-black leading-[1.05] tracking-tight text-white text-[clamp(36px,6vw,64px)]">
            The Robots Everyone{' '}
            <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
              Should Know
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-300">
            {ROBOTS.length} robots that shaped our world — ranked by how famous they are right now.
            Tap any card, or compare two side-by-side.
          </p>
          <div className="mt-5 flex justify-center gap-2 flex-wrap">
            <Link href="/robots/compare" className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-400">⚖️ Compare two robots →</Link>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-5xl">
          <RobotVsRobotFeatured />
        </div>
      </section>

      <section className="bg-[#0A0E17] px-4 pb-6">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                    : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/30'
                }`}
              >
                <span aria-hidden>{f.emoji}</span>
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-[#0A0E17] px-4 pb-6">
        <div className="mx-auto max-w-6xl">
          <RobotTagFilter
            selected={tags}
            onToggle={(t) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))}
            onClear={() => setTags([])}
          />
        </div>
      </section>

      <section className="bg-[#0A0E17] px-4 pb-24">
        <div className="mx-auto max-w-6xl">
          <p className="mb-5 text-sm text-zinc-500">
            Showing <strong className="text-white">{filtered.length}</strong> of {ROBOTS.length} robots
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <RobotCard key={r.slug} robot={r} />
            ))}
          </div>
          {filtered.length === 0 ? (
            <p className="mt-12 text-center text-zinc-400">No robots match this filter combination.</p>
          ) : null}
        </div>
      </section>

      {selected.length > 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-30 rounded-full border border-emerald-400/50 bg-emerald-500/20 px-5 py-3 text-sm font-bold text-emerald-100 shadow-lg backdrop-blur transition-transform hover:scale-105"
        >
          ⚖ Compare {selected.length}/2
        </button>
      ) : null}
    </>
  );
}

function RobotCard({ robot }: { robot: Robot }) {
  const extra = getRobotExtra(robot);
  return (
    <div className="relative">
      <CompareButton slug={robot.slug} />
      <Link
        href={`/robots/${robot.slug}`}
        className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/50 hover:shadow-[0_18px_60px_rgba(245,158,11,0.18)]"
      >
        <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-amber-500/[0.08] via-white/[0.02] to-purple-500/[0.06]">
          <span className="text-6xl" aria-hidden>
            {robot.emoji}
          </span>
          <span className="absolute right-3 bottom-3 rounded-full border border-white/15 bg-black/40 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-200 backdrop-blur">
            {ROBOT_TYPE_LABELS[robot.type]}
          </span>
          <span className="absolute left-3 top-3 rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-200 backdrop-blur">
            #{robot.fameRank}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h2 className="text-xl font-extrabold leading-tight text-white">
            {robot.name}
            <span className="ml-2 text-sm font-normal text-zinc-500">{robot.countryFlag}</span>
          </h2>
          <p className="mt-3 text-base font-bold leading-snug text-amber-300 transition-all duration-300 group-hover:text-amber-200 group-hover:[font-size:17px]">
            {robot.hookLine}
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {robot.statChips.map((c) => (
              <span
                key={c.text}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-200"
              >
                <span aria-hidden>{c.icon}</span>
                <span>{c.text}</span>
              </span>
            ))}
          </div>

          {extra.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1">
              {extra.tags.slice(0, 4).map((t) => (
                <span key={t} className="rounded-full bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                  #{t}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-auto pt-5">
            <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-300 group-hover:text-amber-200">
              Discover →
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

// ─── Hall-of-Fame marquee ticker ────────────────────────────────────────────
function HallOfFameTicker() {
  const top = ROBOTS[0];
  const indianTop = ROBOTS.find(r => r.country === 'India');
  const persy = ROBOTS.find(r => r.slug === 'perseverance');
  const items = [
    top  ? `🏆 #1 Most Famous: ${top.maker} ${top.name}` : null,
    indianTop ? `🇮🇳 Indian Robot Spotlight: ${indianTop.name}` : null,
    persy ? `🚀 Furthest Robot: ${persy.name} — 300M km away on Mars` : null,
    `📦 Largest Fleet: Amazon Robotics — 750,000+ Kiva units`,
    `🦾 KUKA: the orange arm in every car factory`,
    `🐕 Spot has been deployed in 64 countries`,
  ].filter(Boolean) as string[];
  return (
    <div className="bg-gray-900 border-y border-amber-500/15 overflow-hidden h-9 flex items-center">
      <style jsx>{`
        @keyframes hof-ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .hof-track { animation: hof-ticker 35s linear infinite; }
        .hof-wrap:hover .hof-track { animation-play-state: paused; }
      `}</style>
      <div className="hof-wrap relative w-full">
        <div className="hof-track inline-flex whitespace-nowrap text-xs md:text-sm text-amber-300">
          {[...items, ...items].map((t, i) => (
            <span key={i} className="px-6 py-2 border-r border-gray-800/40">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── "Robot vs Robot" featured comparison ───────────────────────────────────
function RobotVsRobotFeatured() {
  const [seed, setSeed] = useState(0);
  const pair = useMemo(() => {
    const shuffled = [...ROBOTS].sort(() => Math.random() - 0.5);
    return [shuffled[0], shuffled[1]];
  }, [seed]);
  const [a, b] = pair;
  if (!a || !b) return null;
  const ageDiff = Math.abs(a.year - b.year);
  const older = a.year < b.year ? a : b;
  const newer = a.year < b.year ? b : a;

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-300">⚔️ Robot vs Robot</p>
        <button
          onClick={() => setSeed(s => s + 1)}
          className="text-xs rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-amber-200 hover:bg-amber-500/20"
        >🔀 Shuffle</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[a, b].map(r => (
          <Link key={r.slug} href={`/robots/${r.slug}`} className="block rounded-xl border border-gray-800 bg-gray-900/60 p-4 hover:border-amber-500/40">
            <div className="text-3xl">{r.emoji}</div>
            <h3 className="mt-1 font-black text-white text-lg">{r.name}</h3>
            <p className="text-xs text-zinc-400">{r.maker} · {r.year} · {r.countryFlag}</p>
            <p className="mt-2 text-sm text-amber-300 line-clamp-2">{r.hookLine}</p>
          </Link>
        ))}
      </div>
      <p className="mt-3 text-sm text-zinc-300 leading-relaxed">
        <strong className="text-white">Insight:</strong>{' '}
        {a.type === b.type
          ? `Both are ${ROBOT_TYPE_LABELS[a.type as RobotType]?.toLowerCase() ?? a.type} robots.`
          : `${a.name} targets ${ROBOT_TYPE_LABELS[a.type as RobotType]?.toLowerCase() ?? a.type} use, while ${b.name} targets ${ROBOT_TYPE_LABELS[b.type as RobotType]?.toLowerCase() ?? b.type}.`}
        {' '}
        <span className="text-amber-300">{older.name} is {ageDiff} years older than {newer.name}.</span>
      </p>
      <div className="mt-3 text-right">
        <Link href={`/robots/compare?a=${a.slug}&b=${b.slug}`} className="text-sm font-bold text-amber-300 hover:text-amber-200">
          See full comparison →
        </Link>
      </div>
    </div>
  );
}
