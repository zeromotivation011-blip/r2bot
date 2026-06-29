'use client';

import { getAllTags, tagLabel } from '@/lib/robots-extra';

export function RobotTagFilter({
  selected,
  onToggle,
  onClear,
}: {
  selected: string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
}) {
  const tags = getAllTags();
  return (
    <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Tags</span>
      {tags.map(({ tag, count }) => {
        const active = selected.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              active
                ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/30'
            }`}
          >
            <span>{tagLabel(tag)}</span>
            <span className="font-mono text-[10px] text-zinc-500">{count}</span>
          </button>
        );
      })}
      {selected.length > 0 ? (
        <button
          type="button"
          onClick={onClear}
          className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/20"
        >
          Clear tags
        </button>
      ) : null}
    </div>
  );
}
