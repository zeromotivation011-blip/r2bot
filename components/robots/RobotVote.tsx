'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const STORAGE_KEY_PREFIX = 'r2bot_robot_vote_';

type Tally = { cool: number; creepy: number };

export function RobotVote({ slug }: { slug: string }) {
  const [tally, setTally] = useState<Tally | null>(null);
  const [voted, setVoted] = useState<'cool' | 'creepy' | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Check local vote flag.
    try {
      const flag = localStorage.getItem(STORAGE_KEY_PREFIX + slug);
      if (flag === 'cool' || flag === 'creepy') setVoted(flag);
    } catch {
      // best-effort
    }
    // Fetch tally.
    let cancelled = false;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase
          .from('robot_vote_tally')
          .select('cool_votes, creepy_votes')
          .eq('robot_slug', slug)
          .maybeSingle();
        if (cancelled) return;
        setTally({
          cool: (data?.cool_votes as number) ?? 0,
          creepy: (data?.creepy_votes as number) ?? 0,
        });
      } catch {
        if (!cancelled) setTally({ cool: 0, creepy: 0 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function castVote(type: 'cool' | 'creepy') {
    if (voted || busy) return;
    setBusy(true);
    const optimistic: Tally = {
      cool: (tally?.cool ?? 0) + (type === 'cool' ? 1 : 0),
      creepy: (tally?.creepy ?? 0) + (type === 'creepy' ? 1 : 0),
    };
    setTally(optimistic);
    setVoted(type);
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + slug, type);
    } catch {
      // best-effort
    }
    try {
      const res = await fetch('/api/robots/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ robot_slug: slug, vote_type: type }),
      });
      if (res.ok) {
        const j = (await res.json()) as { cool_count?: number; creepy_count?: number };
        if (typeof j.cool_count === 'number' || typeof j.creepy_count === 'number') {
          setTally({ cool: j.cool_count ?? optimistic.cool, creepy: j.creepy_count ?? optimistic.creepy });
        }
      }
    } catch {
      // best-effort
    } finally {
      setBusy(false);
    }
  }

  const total = (tally?.cool ?? 0) + (tally?.creepy ?? 0);
  const coolPct = total > 0 ? Math.round(((tally?.cool ?? 0) / total) * 100) : 0;

  return (
    <div className="my-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <h3 className="text-lg font-bold text-white">What do you think?</h3>
      <p className="mt-1 text-sm text-zinc-400">
        Cast your one-and-only vote. {total > 0 ? `${total.toLocaleString()} votes so far.` : 'Be the first to vote.'}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={!!voted || busy}
          onClick={() => castVote('cool')}
          className={`group flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition-all ${
            voted === 'cool'
              ? 'border-emerald-400 bg-emerald-500/15 text-emerald-100'
              : 'border-white/10 bg-white/[0.04] text-zinc-100 hover:border-emerald-400/40 hover:bg-emerald-500/[0.08]'
          } disabled:cursor-not-allowed`}
        >
          <span className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden>😎</span>
            <span>
              <span className="block text-base font-bold">Coolest</span>
              <span className="block text-xs text-zinc-400">
                {(tally?.cool ?? 0).toLocaleString()} think this is cool
              </span>
            </span>
          </span>
          {voted === 'cool' ? <span aria-hidden className="text-emerald-300">✓</span> : null}
        </button>

        <button
          type="button"
          disabled={!!voted || busy}
          onClick={() => castVote('creepy')}
          className={`group flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition-all ${
            voted === 'creepy'
              ? 'border-purple-400 bg-purple-500/15 text-purple-100'
              : 'border-white/10 bg-white/[0.04] text-zinc-100 hover:border-purple-400/40 hover:bg-purple-500/[0.08]'
          } disabled:cursor-not-allowed`}
        >
          <span className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden>😱</span>
            <span>
              <span className="block text-base font-bold">Creepiest</span>
              <span className="block text-xs text-zinc-400">
                {(tally?.creepy ?? 0).toLocaleString()} think it&apos;s creepy
              </span>
            </span>
          </span>
          {voted === 'creepy' ? <span aria-hidden className="text-purple-300">✓</span> : null}
        </button>
      </div>

      {total > 0 ? (
        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-purple-400"
              style={{ width: `${coolPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {coolPct}% Coolest · {100 - coolPct}% Creepiest
          </p>
        </div>
      ) : null}

      {voted ? (
        <p className="mt-3 text-xs text-zinc-500">
          Thanks for voting. You can&apos;t change your vote on this browser.
        </p>
      ) : null}
    </div>
  );
}
