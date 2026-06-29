'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type AtlasSearchEntry = {
  slug: string;
  type: string;
  title: string;
  summary: string;
  bucket?: string | null;
  category?: string | null;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | null;
};

function scoreEntry(entry: AtlasSearchEntry, q: string): number {
  if (!q) return 0;
  const ql = q.toLowerCase();
  const title = entry.title.toLowerCase();
  const slug = entry.slug.toLowerCase();
  const summary = entry.summary.toLowerCase();
  let score = 0;
  if (title.startsWith(ql)) score += 100;
  else if (title.includes(ql)) score += 60;
  if (slug.startsWith(ql)) score += 50;
  else if (slug.includes(ql)) score += 30;
  if (summary.includes(ql)) score += 10;
  // tiny fuzzy: subsequence match in title
  let ti = 0;
  for (const ch of ql) {
    ti = title.indexOf(ch, ti);
    if (ti === -1) break;
    ti++;
  }
  if (ti !== -1) score += 5;
  return score;
}

export function AtlasSearch({ entries }: { entries: AtlasSearchEntry[] }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return entries
      .map((e) => ({ entry: e, score: scoreEntry(e, query) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((r) => r.entry);
  }, [entries, query]);

  useEffect(() => setHighlight(0), [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      const r = results[highlight];
      if (r) {
        window.location.href = `/atlas/${r.type}/${r.slug}`;
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div className="relative mb-8 w-full max-w-2xl">
      <div className="relative">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="Search 250+ atlas terms — try 'LIDAR', 'PID', or 'ISRO'…"
          aria-label="Search atlas"
          className="w-full rounded-2xl border border-white/15 bg-white/[0.04] px-5 py-3.5 pr-20 text-base text-white placeholder-zinc-500 outline-none transition-colors focus:border-amber-400/60"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-xs text-zinc-400">
          ⌘K
        </kbd>
      </div>

      {open && results.length > 0 ? (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#0a0f1e] shadow-2xl"
        >
          {results.map((r, i) => {
            const active = i === highlight;
            return (
              <li key={`${r.type}/${r.slug}`}>
                <a
                  href={`/atlas/${r.type}/${r.slug}`}
                  onMouseEnter={() => setHighlight(i)}
                  className={`flex flex-col gap-1 border-b border-white/5 px-5 py-3 transition-colors last:border-b-0 ${
                    active ? 'bg-amber-500/10' : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{r.title}</span>
                    {r.bucket || r.category ? (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                        {r.bucket ?? r.category}
                      </span>
                    ) : null}
                    {r.difficulty ? (
                      <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-300">
                        {r.difficulty}
                      </span>
                    ) : null}
                  </div>
                  <p className="m-0 line-clamp-1 text-xs text-zinc-400">{r.summary}</p>
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}

      {open && query && results.length === 0 ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-2xl border border-white/15 bg-[#0a0f1e] px-5 py-4 text-sm text-zinc-400 shadow-2xl">
          No matches. Try a broader term, or ask R2 with ⌘K.
        </div>
      ) : null}
    </div>
  );
}
