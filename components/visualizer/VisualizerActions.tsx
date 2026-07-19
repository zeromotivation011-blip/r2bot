'use client';

import { useState } from 'react';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.r2bot.in';

export function VisualizerActions({ sectionId, title }: { sectionId: string; title: string }) {
  const [shared, setShared] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  // Point at the simulator's own page, not the hash anchor on this index.
  // A hash link cannot rank or accrue links independently; the dedicated page
  // can, and it is the URL we want people pasting into Reddit and HN.
  const url = `${SITE}/visualizer/${sectionId}`;
  const embed = `<iframe src="${SITE}/visualizer/embed/${sectionId}" width="800" height="500" frameborder="0" allowfullscreen></iframe>`;

  async function copy(text: string, setFn: (b: boolean) => void) {
    try {
      await navigator.clipboard.writeText(text);
      setFn(true);
      setTimeout(() => setFn(false), 1800);
    } catch {
      // best-effort
    }
  }

  async function share() {
    const payload = { title: `R2BOT — ${title}`, text: `Check out this robot simulation on R2BOT: ${url}`, url };
    try {
      if (typeof navigator !== 'undefined' && (navigator as Navigator).share) {
        await (navigator as Navigator).share(payload);
        return;
      }
    } catch {
      // fall through to clipboard
    }
    copy(payload.text, setShared);
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={share}
        className="rounded-md border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20"
      >
        {shared ? '✓ Link copied' : '🔗 Share'}
      </button>
      <button
        type="button"
        onClick={() => copy(embed, setEmbedCopied)}
        className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-500/20"
      >
        {embedCopied ? '✓ Embed copied' : '⧉ Embed code'}
      </button>
      <a
        href={`/visualizer/${sectionId}`}
        className="rounded-md border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-white/30"
      >
        Open full page →
      </a>
    </div>
  );
}
