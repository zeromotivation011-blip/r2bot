'use client';

import { useMemo, useState } from 'react';
import { HARDWARE, HARDWARE_CATEGORIES, type HardwareCategory, type HardwareDifficulty, type HardwareItem } from '@/lib/hardware-index';

const DIFFS: { id: HardwareDifficulty | 'all'; label: string; cls: string }[] = [
  { id: 'all', label: 'All levels', cls: 'border-white/10 bg-white/[0.03] text-zinc-300' },
  { id: 'beginner', label: 'Beginner', cls: 'border-emerald-400/40 text-emerald-200' },
  { id: 'intermediate', label: 'Intermediate', cls: 'border-cyan-400/40 text-cyan-200' },
  { id: 'advanced', label: 'Advanced', cls: 'border-purple-400/40 text-purple-200' },
];

export function HardwareClient() {
  const [cat, setCat] = useState<HardwareCategory | 'all'>('all');
  const [diff, setDiff] = useState<HardwareDifficulty | 'all'>('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return HARDWARE.filter((h) => {
      if (cat !== 'all' && h.category !== cat) return false;
      if (diff !== 'all' && h.difficulty !== diff) return false;
      if (!ql) return true;
      return (
        h.name.toLowerCase().includes(ql) ||
        h.type.toLowerCase().includes(ql) ||
        h.use.toLowerCase().includes(ql) ||
        h.id.toLowerCase().includes(ql)
      );
    });
  }, [cat, diff, q]);

  return (
    <div className="mx-auto max-w-6xl px-4">
      <header className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-1.5 text-sm font-semibold text-amber-300">
          🛠️ Robotics Hardware Index
        </span>
        <h1 className="mt-4 text-4xl font-black text-white sm:text-5xl">
          50+ Components.{' '}
          <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">Indian Prices.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-zinc-400">
          Every part you need to build a robot in India — with current price ranges and direct store links.
        </p>
      </header>

      <div className="mt-8 grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search 50+ components (e.g. 'ultrasonic', 'jetson', 'servo')…"
          className="rounded-2xl border border-white/15 bg-white/[0.04] px-5 py-3 text-base text-white placeholder-zinc-500 outline-none focus:border-amber-400/60"
        />
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value as HardwareCategory | 'all')}
          className="rounded-2xl border border-white/15 bg-[#0a0f1e] px-4 py-3 text-sm text-white outline-none"
          aria-label="Category"
        >
          <option value="all">All categories</option>
          {HARDWARE_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
          ))}
        </select>
        <select
          value={diff}
          onChange={(e) => setDiff(e.target.value as HardwareDifficulty | 'all')}
          className="rounded-2xl border border-white/15 bg-[#0a0f1e] px-4 py-3 text-sm text-white outline-none"
          aria-label="Difficulty"
        >
          {DIFFS.map((d) => (
            <option key={d.id} value={d.id}>{d.label}</option>
          ))}
        </select>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        Showing <strong className="text-white">{filtered.length}</strong> of {HARDWARE.length} components. Prices in ₹ are typical ranges and may vary.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-white/[0.03]">
            <tr>
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Component</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Type</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Typical use</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Price (₹)</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Buy</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Level</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h) => (
              <Row key={h.id} h={h} />
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  No components match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ h }: { h: HardwareItem }) {
  const diff = DIFFS.find((d) => d.id === h.difficulty)!;
  return (
    <tr className="border-t border-white/5 odd:bg-white/[0.02]">
      <td className="px-4 py-3 font-bold text-white">
        {h.name}
        <p className="m-0 font-mono text-[10px] text-zinc-500">{h.category}</p>
      </td>
      <td className="px-4 py-3 text-zinc-300">{h.type}</td>
      <td className="px-4 py-3 text-zinc-300">{h.use}</td>
      <td className="px-4 py-3 font-mono text-amber-200">
        ₹{h.priceLow.toLocaleString('en-IN')} – ₹{h.priceHigh.toLocaleString('en-IN')}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {h.links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-200 hover:bg-cyan-500/20"
            >
              {l.label}
            </a>
          ))}
        </div>
      </td>
      <td className={`px-4 py-3 font-mono text-[10px] uppercase tracking-wider`}>
        <span className={`rounded-full border bg-white/[0.04] px-2 py-0.5 ${diff.cls}`}>{diff.label}</span>
      </td>
    </tr>
  );
}
