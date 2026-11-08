'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ROBOTS, type Robot } from '@/lib/robots-data';

const STORAGE_KEY = 'r2bot_robot_compare';

type CompareCtx = {
  selected: string[]; // slugs
  isInCompare: (slug: string) => boolean;
  toggleCompare: (slug: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const Ctx = createContext<CompareCtx | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) setSelected(parsed.slice(0, 2));
      }
    } catch {
      // best-effort
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
    } catch {
      // best-effort
    }
  }, [selected]);

  const toggleCompare = useCallback((slug: string) => {
    setSelected((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      // Keep at most 2; drop the oldest.
      const next = [...prev, slug];
      return next.slice(-2);
    });
    setOpen(true);
  }, []);

  const clear = useCallback(() => {
    setSelected([]);
    setOpen(false);
  }, []);

  const value = useMemo<CompareCtx>(
    () => ({
      selected,
      isInCompare: (slug) => selected.includes(slug),
      toggleCompare,
      clear,
      open,
      setOpen,
    }),
    [selected, toggleCompare, clear, open],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCompare() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCompare must be inside CompareProvider');
  return ctx;
}

export function CompareButton({ slug }: { slug: string }) {
  const { isInCompare, toggleCompare } = useCompare();
  const active = isInCompare(slug);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleCompare(slug);
      }}
      aria-pressed={active}
      className={`absolute right-3 top-3 z-10 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider backdrop-blur transition-colors ${
        active
          ? 'border-emerald-400/60 bg-emerald-500/30 text-emerald-100'
          : 'border-white/15 bg-black/40 text-zinc-200 hover:border-emerald-400/50'
      }`}
    >
      {active ? '✓ In compare' : '⚖ Compare'}
    </button>
  );
}

const NUMERIC_FIELDS: (keyof Robot['specs'])[] = ['height', 'weight', 'speed', 'payload', 'battery', 'reach'];

function parseFirstNumber(s?: string): number | null {
  if (!s) return null;
  const m = s.match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

/** Pick the winner index (0 or 1) for a numeric-ish spec. null = no winner. */
function pickWinner(a: string | undefined, b: string | undefined, higherWins = true): 0 | 1 | null {
  const an = parseFirstNumber(a);
  const bn = parseFirstNumber(b);
  if (an === null || bn === null) return null;
  if (an === bn) return null;
  if (higherWins) return an > bn ? 0 : 1;
  return an < bn ? 0 : 1;
}

const SPEC_HIGHER_WINS: Partial<Record<keyof Robot['specs'], boolean>> = {
  speed: true,
  payload: true,
  reach: true,
  height: true,
  weight: false, // lighter is "winning" — purely subjective but consistent
  battery: true,
};

export function CompareDrawer() {
  const { selected, open, setOpen, clear, toggleCompare } = useCompare();

  if (!open || selected.length === 0) return null;

  const robots = selected
    .map((s) => ROBOTS.find((r) => r.slug === s))
    .filter(Boolean) as Robot[];

  if (robots.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0A0E17]/97 shadow-[0_-20px_60px_rgba(0,0,0,0.7)] backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-wider text-amber-300">
            ⚖ Compare
          </span>
          <span className="text-sm text-zinc-300">
            {robots.length}/2 robots selected
            {robots.length < 2 ? ' — pick one more to compare side-by-side.' : ''}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-zinc-200 hover:border-white/30"
            >
              Hide
            </button>
            <button
              type="button"
              onClick={clear}
              className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-1 text-xs text-red-200 hover:bg-red-500/20"
            >
              Clear comparison
            </button>
          </div>
        </div>

        {robots.length === 2 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="w-1/4 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    Spec
                  </th>
                  {robots.map((r) => (
                    <th key={r.slug} className="px-3 py-2 text-base font-bold text-white">
                      <span className="text-2xl" aria-hidden>{r.emoji}</span> {r.name}
                      <span className="ml-2 text-xs font-normal text-zinc-400">{r.countryFlag}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <BasicRow label="Maker" values={robots.map((r) => r.maker)} />
                <BasicRow label="Country" values={robots.map((r) => `${r.countryFlag} ${r.country}`)} />
                <BasicRow label="Year" values={robots.map((r) => String(r.year))} />
                <BasicRow label="Type" values={robots.map((r) => r.type)} />
                {NUMERIC_FIELDS.map((f) => {
                  const a = robots[0]?.specs[f];
                  const b = robots[1]?.specs[f];
                  if (!a && !b) return null;
                  const higherWins = SPEC_HIGHER_WINS[f] ?? true;
                  const winner = pickWinner(a, b, higherWins);
                  return (
                    <tr key={f} className="border-t border-white/5">
                      <th className="px-3 py-2 align-top font-semibold text-zinc-300">
                        {labelFor(f)}
                      </th>
                      {robots.map((r, i) => (
                        <td
                          key={r.slug}
                          className={`px-3 py-2 align-top text-zinc-200 ${
                            winner === i ? 'bg-emerald-500/15 text-emerald-100' : ''
                          }`}
                        >
                          {r.specs[f] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">
            <span className="font-bold text-amber-300">{robots[0].name}</span> is in your comparison.
            Add one more robot to see them side-by-side.
            <button
              type="button"
              onClick={() => toggleCompare(robots[0].slug)}
              className="ml-3 text-xs text-zinc-400 underline hover:text-white"
            >
              remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BasicRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr className="border-t border-white/5">
      <th className="px-3 py-2 align-top font-semibold text-zinc-300">{label}</th>
      {values.map((v, i) => (
        <td key={i} className="px-3 py-2 align-top text-zinc-200">{v}</td>
      ))}
    </tr>
  );
}

function labelFor(key: keyof Robot['specs']): string {
  return ({
    height: 'Height',
    weight: 'Weight',
    speed: 'Speed',
    payload: 'Payload',
    battery: 'Battery',
    dof: 'Degrees of Freedom',
    reach: 'Reach',
  } as Record<string, string>)[key as string] ?? String(key);
}
