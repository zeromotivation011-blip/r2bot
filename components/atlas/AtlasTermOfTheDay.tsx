import Link from 'next/link';
import type { AtlasEntry } from '@/lib/atlas';

function dayOfYear(date = new Date()): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start;
  return Math.floor(diff / 86_400_000);
}

export function AtlasTermOfTheDay({ entries }: { entries: AtlasEntry[] }) {
  if (entries.length === 0) return null;
  const idx = dayOfYear() % entries.length;
  const entry = entries[idx];
  const teaser = entry.summary.length > 220 ? entry.summary.slice(0, 217) + '…' : entry.summary;
  return (
    <Link
      href={`/atlas/${entry.type}/${entry.slug}`}
      className="block rounded-3xl border border-amber-400/50 bg-gradient-to-br from-amber-500/[0.10] to-orange-500/[0.03] p-6 shadow-[0_10px_40px_rgba(245,158,11,0.15)] transition-transform hover:-translate-y-0.5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-amber-400/60 bg-amber-500/20 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-100">
          🌅 Term of the day
        </span>
        <span className="font-mono text-xs text-zinc-400">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>
      <h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">
        {entry.title}
      </h2>
      <p className="mt-2 text-base leading-relaxed text-zinc-200">{teaser}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-amber-300">
        Explore →
      </span>
    </Link>
  );
}
