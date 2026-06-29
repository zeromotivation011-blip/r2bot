'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

export type AtlasCompareEntry = {
  slug: string;
  type: string;
  title: string;
  summary: string;
};

export function AtlasCompare({
  current,
  all,
  currentBody,
}: {
  current: AtlasCompareEntry;
  all: AtlasCompareEntry[];
  currentBody: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pickedSlug, setPickedSlug] = useState<string | null>(null);

  const candidates = useMemo(() => {
    const q = query.toLowerCase().trim();
    return all
      .filter((e) => e.slug !== current.slug)
      .filter((e) => !q || e.title.toLowerCase().includes(q) || e.slug.includes(q))
      .slice(0, 12);
  }, [all, current.slug, query]);

  const picked = pickedSlug ? all.find((e) => e.slug === pickedSlug) ?? null : null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20"
      >
        ⚖ Compare with another term
      </button>
    );
  }

  return (
    <div className="my-6 rounded-2xl border border-cyan-400/30 bg-cyan-500/[0.06] p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="m-0 text-sm font-bold uppercase tracking-wider text-cyan-200">Compare two terms</h3>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setPickedSlug(null);
            setQuery('');
          }}
          className="ml-auto rounded-md border border-white/15 bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-200 hover:border-white/30"
        >
          Close
        </button>
      </div>

      {!picked ? (
        <div className="mt-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search for a term to compare with "${current.title}"…`}
            className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-cyan-400/60"
            autoFocus
          />
          <ul className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-[#0a0f1e]">
            {candidates.length === 0 ? (
              <li className="px-4 py-3 text-sm text-zinc-400">No matches.</li>
            ) : (
              candidates.map((c) => (
                <li key={`${c.type}/${c.slug}`}>
                  <button
                    type="button"
                    onClick={() => setPickedSlug(c.slug)}
                    className="block w-full border-b border-white/5 px-4 py-2.5 text-left text-sm last:border-b-0 hover:bg-cyan-500/10"
                  >
                    <span className="font-semibold text-white">{c.title}</span>
                    <span className="ml-2 font-mono text-[10px] uppercase text-zinc-500">/atlas/{c.type}/{c.slug}</span>
                    <p className="m-0 line-clamp-1 text-xs text-zinc-400">{c.summary}</p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <SideBySide title={current.title} summary={current.summary} body={currentBody} />
          <SideBySideRemote slug={picked.slug} type={picked.type} title={picked.title} summary={picked.summary} />
        </div>
      )}
    </div>
  );
}

function extractSection(body: string, heading: string): string {
  const re = new RegExp(`##\\s+${heading}[^\\n]*\\n([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const m = body.match(re);
  return m ? m[1].trim().slice(0, 600) : '';
}

function SideBySide({ title, summary, body }: { title: string; summary: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h4 className="m-0 text-lg font-bold text-white">{title}</h4>
      <p className="mt-1 text-xs text-zinc-400">{summary}</p>
      <CompareSection label="What is it?" content={extractSection(body, 'What is')} />
      <CompareSection label="How it works" content={extractSection(body, 'How It Works')} />
      <CompareSection label="Real-world example" content={extractSection(body, 'Real-World Example')} />
    </div>
  );
}

function SideBySideRemote({ slug, type, title, summary }: { slug: string; type: string; title: string; summary: string }) {
  return (
    <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/[0.04] p-4">
      <h4 className="m-0 text-lg font-bold text-white">{title}</h4>
      <p className="mt-1 text-xs text-zinc-400">{summary}</p>
      <p className="mt-3 text-sm text-zinc-300">
        We&apos;ve loaded the summary. Open the full entry for the deep dive:
      </p>
      <Link
        href={`/atlas/${type}/${slug}`}
        className="mt-3 inline-flex items-center gap-2 rounded-md border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20"
      >
        Open /atlas/{type}/{slug} →
      </Link>
    </div>
  );
}

function CompareSection({ label, content }: { label: string; content: string }) {
  if (!content) return null;
  return (
    <div className="mt-3">
      <p className="m-0 text-[10px] font-bold uppercase tracking-wider text-amber-300">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-zinc-200">{content}</p>
    </div>
  );
}
