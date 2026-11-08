'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/** PDF: client-side print-to-PDF. Zero dependencies, works in every modern browser. */
export function LessonPdfButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== 'undefined') window.print();
      }}
      className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:border-white/30 hover:text-white"
      title="Print or save as PDF"
    >
      📄 Download PDF
    </button>
  );
}

/** Bookmark toggle. Uses Supabase lesson_bookmarks table if authenticated, falls back to localStorage. */
export function LessonBookmarkButton({ track, slug, title }: { track: string; slug: string; title: string }) {
  const [marked, setMarked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Try Supabase first.
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('lesson_bookmarks')
            .select('user_id')
            .eq('user_id', user.id)
            .eq('track', track)
            .eq('slug', slug)
            .maybeSingle();
          if (!cancelled) setMarked(!!data);
          return;
        }
      } catch {
        // fall through
      }
      // Anonymous fallback: localStorage.
      try {
        if (typeof window === 'undefined') return;
        const raw = localStorage.getItem('r2bot_lesson_bookmarks');
        const list = raw ? (JSON.parse(raw) as string[]) : [];
        if (!cancelled) setMarked(list.includes(`${track}/${slug}`));
      } catch {
        // best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [track, slug]);

  const toggle = useCallback(async () => {
    setBusy(true);
    const newState = !marked;
    setMarked(newState);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (newState) {
          await supabase.from('lesson_bookmarks').insert({ user_id: user.id, track, slug });
        } else {
          await supabase.from('lesson_bookmarks').delete().eq('user_id', user.id).eq('track', track).eq('slug', slug);
        }
      } else {
        // Anonymous fallback
        const key = `${track}/${slug}`;
        const raw = localStorage.getItem('r2bot_lesson_bookmarks');
        const list = raw ? (JSON.parse(raw) as string[]) : [];
        const next = newState ? Array.from(new Set([...list, key])) : list.filter((k) => k !== key);
        localStorage.setItem('r2bot_lesson_bookmarks', JSON.stringify(next));
      }
    } catch {
      // best-effort: revert on error
      setMarked(!newState);
    } finally {
      setBusy(false);
    }
  }, [marked, track, slug]);

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={marked}
      title={marked ? `Bookmarked: ${title}` : `Bookmark this lesson`}
      className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
        marked
          ? 'border-[var(--accent-line)] bg-[var(--accent-wash)] text-[var(--amber-bright)]'
          : 'border-white/15 bg-white/[0.04] text-zinc-200 hover:border-white/30'
      } disabled:cursor-not-allowed`}
    >
      {marked ? '🔖 Bookmarked' : '🔖 Bookmark'}
    </button>
  );
}

/** Tracks scroll position and offers resume banner. */
export function LessonScrollResume({ track, slug }: { track: string; slug: string }) {
  const [resumeY, setResumeY] = useState<number | null>(null);
  const key = `r2bot_lesson_scroll_${track}_${slug}`;
  const lastSaveRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const y = parseInt(raw, 10);
        if (!isNaN(y) && y > 200) setResumeY(y);
      }
    } catch {
      // best-effort
    }
    const onScroll = () => {
      const now = Date.now();
      if (now - lastSaveRef.current < 2000) return;
      lastSaveRef.current = now;
      try {
        localStorage.setItem(key, String(Math.round(window.scrollY)));
      } catch {
        // best-effort
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [key]);

  const resume = () => {
    if (resumeY === null) return;
    window.scrollTo({ top: resumeY, behavior: 'smooth' });
    setResumeY(null);
  };

  if (resumeY === null) return null;

  return (
    <div className="not-prose sticky top-20 z-20 my-4 flex items-center gap-3 rounded-xl border border-white/15 bg-[var(--surface-2)]/95 px-4 py-2 backdrop-blur">
      <span className="text-xl" aria-hidden>📍</span>
      <span className="text-sm text-gray-200">
        You were reading here last time.{' '}
        <button type="button" onClick={resume} className="font-bold underline">
          Continue where you left off ↓
        </button>
      </span>
      <button
        type="button"
        onClick={() => setResumeY(null)}
        className="ml-auto text-xs text-zinc-400 hover:text-white"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

/** Floating "Stuck? Ask R2" bubble. */
/**
 * "Stuck? Ask R2", with this lesson's title pre-filled into the question.
 *
 * Was a floating amber pill fixed over the bottom-right of every lesson —
 * the same floating-action-button pattern the site-wide Co-pilot bubble was
 * retired for, reintroduced on the longest-form reading pages, where a
 * permanently glowing accent competes with the prose for the whole scroll.
 *
 * The pre-filled context is the part worth keeping, and it is worth most to
 * someone who has read the lesson and is still stuck. So it sits at the end
 * of the lesson instead of hovering over all of it, and looks like the rest
 * of the page. The header's Ask R2 and ⌘K are still there the whole time for
 * anyone who wants it sooner.
 */
export function LessonAskR2Bubble({ track, slug, lessonTitle }: { track: string; slug: string; lessonTitle: string }) {
  const prefill = `I'm reading the ${lessonTitle} lesson. I need help understanding: `;
  const copilotUrl = `/copilot?q=${encodeURIComponent(prefill)}`;
  return (
    <aside className="not-prose r2-card mt-10 print:hidden">
      <p className="r2-note__label">Still stuck?</p>
      <p className="r2-body mt-2 text-sm">
        Ask R2 about this lesson — your question arrives with the lesson already attached, so you
        do not have to explain the context first.
      </p>
      <Link href={copilotUrl} className="r2-btn r2-btn--ghost mt-4">
        Ask about this lesson
      </Link>
      <p className="r2-meta mt-3 text-xs">
        {track} · {slug}
      </p>
    </aside>
  );
}

type Comment = {
  id: string;
  user_id: string;
  parent_id: string | null;
  comment: string;
  created_at: string;
  display_name?: string | null;
  total_xp?: number | null;
};

/** Lesson discussion thread with 1-level reply nesting. */
export function LessonDiscussion({ track, slug }: { track: string; slug: string }) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      const { data } = await supabase
        .from('lesson_comments')
        .select('id, user_id, parent_id, comment, created_at, profiles(display_name, total_xp)')
        .eq('track', track)
        .eq('slug', slug)
        .order('created_at', { ascending: true })
        .limit(200);
      if (data) {
        const flat = (data as unknown as Array<Comment & { profiles?: { display_name?: string; total_xp?: number } }>).map((c) => ({
          id: c.id,
          user_id: c.user_id,
          parent_id: c.parent_id,
          comment: c.comment,
          created_at: c.created_at,
          display_name: c.profiles?.display_name ?? null,
          total_xp: c.profiles?.total_xp ?? null,
        }));
        setComments(flat);
      } else {
        setComments([]);
      }
    } catch {
      setComments([]);
    }
  }, [track, slug]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!draft.trim() || busy) return;
      if (!userId) {
        alert('Please log in to comment.');
        return;
      }
      setBusy(true);
      try {
        const supabase = createSupabaseBrowserClient();
        await supabase.from('lesson_comments').insert({
          user_id: userId,
          parent_id: replyingTo,
          track,
          slug,
          comment: draft.trim(),
        });
        setDraft('');
        setReplyingTo(null);
        await load();
      } catch {
        // best-effort
      } finally {
        setBusy(false);
      }
    },
    [draft, busy, userId, replyingTo, track, slug, load],
  );

  if (comments === null) return null;

  const top = comments.filter((c) => !c.parent_id);
  const replies = comments.filter((c) => c.parent_id);

  return (
    <section className="not-prose mt-12 border-t border-white/10 pt-8">
      <h2 className="text-2xl font-extrabold text-white">Discussion · {comments.length}</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Ask questions, share what worked, help each other. R2BOT learners answer fastest.
      </p>

      {userId ? (
        <form onSubmit={submit} className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          {replyingTo ? (
            <p className="mb-2 text-xs text-gray-400">
              Replying to a comment.{' '}
              <button type="button" onClick={() => setReplyingTo(null)} className="underline">
                cancel
              </button>
            </p>
          ) : null}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share your question or insight…"
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-[var(--amber)]"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={busy || draft.trim().length === 0}
              className="r2-btn r2-btn--primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">
          <Link href="/login" className="font-bold text-white hover:underline">
            Log in
          </Link>{' '}
          to join the discussion.
        </p>
      )}

      <ul className="mt-6 space-y-4">
        {top.length === 0 ? (
          <li className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-400">
            Be the first to comment.
          </li>
        ) : (
          top.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              replies={replies.filter((r) => r.parent_id === c.id)}
              onReply={(id) => setReplyingTo(id)}
            />
          ))
        )}
      </ul>
    </section>
  );
}

function CommentItem({
  comment,
  replies,
  onReply,
}: {
  comment: Comment;
  replies: Comment[];
  onReply: (id: string) => void;
}) {
  const xp = comment.total_xp ?? 0;
  const levelEmoji = xp >= 2500 ? '👑' : xp >= 1000 ? '🤖' : xp >= 500 ? '🦾' : xp >= 200 ? '🔧' : '🌱';
  const name = comment.display_name ?? `learner-${comment.user_id.slice(0, 6)}`;
  return (
    <li className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2">
        <span aria-hidden>{levelEmoji}</span>
        <span className="text-sm font-bold text-white">{name}</span>
        <span className="font-mono text-[10px] text-zinc-500">{xp.toLocaleString()} XP</span>
        <span className="ml-auto font-mono text-[10px] text-zinc-500">
          {new Date(comment.created_at).toLocaleString()}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">{comment.comment}</p>
      <button
        type="button"
        onClick={() => onReply(comment.id)}
        className="mt-2 text-xs font-semibold text-gray-300 hover:text-white hover:underline"
      >
        Reply
      </button>
      {replies.length > 0 ? (
        <ul className="mt-3 space-y-2 border-l border-white/10 pl-4">
          {replies.map((r) => {
            const rxp = r.total_xp ?? 0;
            const rEmoji = rxp >= 2500 ? '👑' : rxp >= 1000 ? '🤖' : rxp >= 500 ? '🦾' : rxp >= 200 ? '🔧' : '🌱';
            const rName = r.display_name ?? `learner-${r.user_id.slice(0, 6)}`;
            return (
              <li key={r.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center gap-2">
                  <span aria-hidden>{rEmoji}</span>
                  <span className="text-sm font-bold text-white">{rName}</span>
                  <span className="font-mono text-[10px] text-zinc-500">{rxp.toLocaleString()} XP</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">{r.comment}</p>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}
