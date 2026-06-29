import Link from 'next/link';
import type { FamilyTreeEntry } from '@/lib/robots-extra';

export function RobotFamilyTree({ family, currentName }: { family: FamilyTreeEntry[] | null; currentName: string }) {
  if (!family || family.length === 0) return null;
  return (
    <section className="px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-extrabold text-white">Family tree</h2>
        <p className="mt-1 text-sm text-zinc-400">
          The predecessors and successors of {currentName}.
        </p>
        <div className="mt-5 overflow-x-auto">
          <ol className="inline-flex items-center gap-3 whitespace-nowrap pb-2">
            {family.map((entry, i) => (
              <li key={`${entry.name}-${i}`} className="inline-flex items-center gap-3">
                <Pill entry={entry} />
                {i < family.length - 1 ? (
                  <span aria-hidden className="text-zinc-500">
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Pill({ entry }: { entry: FamilyTreeEntry }) {
  const inner = (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        entry.isCurrent
          ? 'border-amber-400/60 bg-amber-500/15 font-bold text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
          : entry.slug
          ? 'border-white/10 bg-white/[0.04] text-zinc-200 hover:border-amber-400/30'
          : 'border-white/10 bg-white/[0.02] text-zinc-400'
      }`}
    >
      <span>{entry.name}</span>
      {entry.year ? <span className="font-mono text-[10px] text-zinc-500">({entry.year})</span> : null}
    </span>
  );
  return entry.slug ? <Link href={`/robots/${entry.slug}`}>{inner}</Link> : inner;
}
