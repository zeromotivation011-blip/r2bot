'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';

export type LabContentType = 'atlas' | 'academy' | 'pulse' | 'general';

export type LabPost = {
  id: string;
  user_id: string;
  author_display: string;
  content_type: LabContentType;
  content_slug: string | null;
  title: string;
  body: string;
  upvotes: number;
  reply_count: number;
  is_pinned: boolean;
  created_at: string;
};

export type LabReply = {
  id: string;
  post_id: string;
  user_id: string;
  author_display: string;
  body: string;
  upvotes: number;
  created_at: string;
};

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const TYPE_COLOUR: Record<LabContentType, string> = {
  atlas: '#00B8D4',
  academy: '#00E5FF',
  pulse: '#FFB800',
  general: '#94A3B8',
};

function TypeBadge({ type }: { type: LabContentType }) {
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 999,
        background: `${TYPE_COLOUR[type]}1c`,
        border: `1px solid ${TYPE_COLOUR[type]}55`,
        color: TYPE_COLOUR[type],
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 10,
        letterSpacing: '.15em',
        textTransform: 'uppercase',
      }}
    >
      {type}
    </span>
  );
}

type Mode = 'thread' | 'feed';

export function LabThread({
  contentType,
  contentSlug,
  mode = 'thread',
  filter,
  showTypeBadges = false,
}: {
  contentType?: LabContentType;
  contentSlug?: string;
  mode?: Mode;
  filter?: LabContentType | 'all';
  showTypeBadges?: boolean;
}) {
  const [posts, setPosts] = useState<LabPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [replies, setReplies] = useState<Record<string, LabReply[]>>({});
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [showAsk, setShowAsk] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [upvoted, setUpvoted] = useState<Set<string>>(new Set());
  const toast = useToast();

  // Check auth + load upvotes for the current user.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        setAuthed(!!user);
        if (user) {
          const { data } = await supabase
            .from('lab_upvotes')
            .select('target_id')
            .eq('user_id', user.id);
          setUpvoted(new Set((data ?? []).map((r) => r.target_id as string)));
        }
      } catch {
        setAuthed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (mode === 'thread') {
      if (contentType) sp.set('content_type', contentType);
      if (contentSlug) sp.set('content_slug', contentSlug);
    } else if (filter && filter !== 'all') {
      sp.set('content_type', filter);
    }
    sp.set('page', String(page));
    sp.set('limit', '20');
    return sp.toString();
  }, [mode, contentType, contentSlug, filter, page]);

  // Fetch posts whenever query changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/lab/posts?${queryString}`, { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        if (page === 0) setPosts(data.posts ?? []);
        else setPosts((prev) => [...prev, ...(data.posts ?? [])]);
        setTotal(data.total ?? 0);
      } catch {
        if (!cancelled) toast.show('Couldn’t load posts');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryString, page, toast]);

  // Reset to first page when filter/content changes.
  useEffect(() => {
    setPage(0);
  }, [contentType, contentSlug, filter, mode]);

  const expandPost = useCallback(
    async (postId: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(postId)) next.delete(postId);
        else next.add(postId);
        return next;
      });
      if (!replies[postId]) {
        try {
          const res = await fetch(`/api/lab/posts/${postId}/replies`, { cache: 'no-store' });
          const data = await res.json();
          setReplies((r) => ({ ...r, [postId]: data.replies ?? [] }));
        } catch {
          toast.show('Couldn’t load replies');
        }
      }
    },
    [replies, toast],
  );

  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authed) {
      toast.show('Sign in to ask');
      return;
    }
    if (title.trim().length < 5 || body.trim().length < 10) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/lab/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: contentType ?? 'general',
          content_slug: contentSlug ?? null,
          title: title.trim(),
          body: body.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'failed');
      setPosts((prev) => [data.post, ...prev]);
      setTotal((t) => t + 1);
      setTitle('');
      setBody('');
      setShowAsk(false);
      toast.show('Posted to the Lab');
    } catch (e) {
      toast.show(`Couldn’t post: ${(e as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const submitReply = async (postId: string) => {
    const text = (replyDraft[postId] ?? '').trim();
    if (!authed) {
      toast.show('Sign in to reply');
      return;
    }
    if (text.length < 2) return;
    try {
      const res = await fetch(`/api/lab/posts/${postId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'failed');
      setReplies((r) => ({
        ...r,
        [postId]: [...(r[postId] ?? []), data.reply],
      }));
      setReplyDraft((d) => ({ ...d, [postId]: '' }));
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, reply_count: p.reply_count + 1 } : p)),
      );
    } catch (e) {
      toast.show(`Couldn’t reply: ${(e as Error).message}`);
    }
  };

  const toggleUpvote = async (targetType: 'post' | 'reply', targetId: string) => {
    if (!authed) {
      toast.show('Sign in to upvote');
      return;
    }
    const wasUpvoted = upvoted.has(targetId);
    // optimistic
    setUpvoted((prev) => {
      const next = new Set(prev);
      if (wasUpvoted) next.delete(targetId);
      else next.add(targetId);
      return next;
    });
    if (targetType === 'post') {
      setPosts((prev) =>
        prev.map((p) => (p.id === targetId ? { ...p, upvotes: p.upvotes + (wasUpvoted ? -1 : 1) } : p)),
      );
    } else {
      setReplies((r) => {
        const next: typeof r = {};
        for (const [postId, list] of Object.entries(r)) {
          next[postId] = list.map((rep) =>
            rep.id === targetId ? { ...rep, upvotes: rep.upvotes + (wasUpvoted ? -1 : 1) } : rep,
          );
        }
        return next;
      });
    }
    try {
      const res = await fetch('/api/lab/upvote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_type: targetType, target_id: targetId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'failed');
      // Reconcile authoritative count.
      if (targetType === 'post') {
        setPosts((prev) => prev.map((p) => (p.id === targetId ? { ...p, upvotes: data.count } : p)));
      } else {
        setReplies((r) => {
          const next: typeof r = {};
          for (const [postId, list] of Object.entries(r)) {
            next[postId] = list.map((rep) =>
              rep.id === targetId ? { ...rep, upvotes: data.count } : rep,
            );
          }
          return next;
        });
      }
    } catch {
      // Revert on failure.
      setUpvoted((prev) => {
        const next = new Set(prev);
        if (wasUpvoted) next.add(targetId);
        else next.delete(targetId);
        return next;
      });
      toast.show('Couldn’t update vote');
    }
  };

  const charsRemaining = 2000 - body.length;

  return (
    <section style={{ margin: '40px 0' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <h2
          className="display"
          style={{ fontSize: 22, margin: 0, color: 'var(--mist)', display: 'flex', alignItems: 'center', gap: 10 }}
        >
          <span aria-hidden="true">💬</span> Community discussion
        </h2>
        <span
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 12,
            color: 'var(--muted)',
          }}
        >
          {total} question{total === 1 ? '' : 's'} &amp; insight{total === 1 ? '' : 's'}
        </span>
      </div>

      {mode === 'thread' && (
        <div style={{ marginBottom: 18 }}>
          {!showAsk ? (
            <button
              onClick={() => {
                if (!authed) {
                  toast.show('Sign in to ask');
                  return;
                }
                setShowAsk(true);
              }}
              style={{
                padding: '10px 16px',
                borderRadius: 999,
                border: '1px solid var(--cyan)',
                background: 'rgba(0,184,212,.10)',
                color: 'var(--cyan-bright)',
                fontSize: 13,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              {authed === false ? 'Sign in to ask →' : 'Ask a question →'}
            </button>
          ) : (
            <form
              onSubmit={submitPost}
              style={{
                padding: 18,
                borderRadius: 14,
                border: '1px solid var(--border-2)',
                background: 'rgba(11,37,64,.4)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={150}
                placeholder="Title (5–150 chars)"
                required
                style={inputStyle}
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                placeholder="Your question or insight (10–2000 chars)…"
                required
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono), monospace' }}>
                  {charsRemaining} chars remaining
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowAsk(false)}
                    style={ghostBtn}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || title.trim().length < 5 || body.trim().length < 10}
                    style={{
                      ...primaryBtn,
                      opacity: submitting ? 0.6 : 1,
                      cursor: submitting ? 'wait' : 'pointer',
                    }}
                  >
                    {submitting ? 'Posting…' : 'Post'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {loading && posts.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Loading discussion…</p>
      ) : posts.length === 0 ? (
        <p
          style={{
            padding: 24,
            borderRadius: 12,
            border: '1px dashed var(--border)',
            background: 'rgba(11,37,64,.3)',
            color: 'var(--muted)',
            fontSize: 14,
          }}
        >
          No posts yet. Be the first to ask a question here.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
          {posts.map((p) => (
            <li
              key={p.id}
              style={{
                padding: 18,
                borderRadius: 14,
                border: '1px solid ' + (p.is_pinned ? 'var(--border-2)' : 'var(--border)'),
                background: p.is_pinned ? 'rgba(0,184,212,.06)' : 'rgba(11,37,64,.35)',
              }}
            >
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <UpvoteButton
                  count={p.upvotes}
                  active={upvoted.has(p.id)}
                  onClick={() => toggleUpvote('post', p.id)}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                    {p.is_pinned && (
                      <span
                        style={{
                          fontFamily: 'var(--font-mono), monospace',
                          fontSize: 10,
                          letterSpacing: '.2em',
                          color: 'var(--cyan)',
                          textTransform: 'uppercase',
                        }}
                      >
                        📌 Pinned
                      </span>
                    )}
                    {showTypeBadges && <TypeBadge type={p.content_type} />}
                  </div>
                  <button
                    onClick={() => expandPost(p.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      textAlign: 'left',
                      color: 'var(--mist)',
                      fontSize: 16,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      lineHeight: 1.35,
                    }}
                  >
                    {p.title}
                  </button>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: 'var(--muted)',
                      fontFamily: 'var(--font-mono), monospace',
                      letterSpacing: '.03em',
                    }}
                  >
                    {p.author_display} · {relativeTime(p.created_at)} · {p.reply_count} repl{p.reply_count === 1 ? 'y' : 'ies'}
                  </div>

                  {expanded.has(p.id) && (
                    <div style={{ marginTop: 14 }}>
                      <p style={{ fontSize: 14.5, color: '#C8D0DC', whiteSpace: 'pre-wrap', margin: 0 }}>
                        {p.body}
                      </p>

                      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
                        {(replies[p.id] ?? []).map((r) => (
                          <div
                            key={r.id}
                            style={{
                              padding: '10px 14px',
                              borderRadius: 10,
                              background: 'rgba(11,37,64,.55)',
                              border: '1px solid var(--border)',
                              display: 'flex',
                              gap: 12,
                              alignItems: 'flex-start',
                            }}
                          >
                            <UpvoteButton
                              count={r.upvotes}
                              active={upvoted.has(r.id)}
                              onClick={() => toggleUpvote('reply', r.id)}
                              compact
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, color: 'var(--mist)', whiteSpace: 'pre-wrap', marginBottom: 4 }}>
                                {r.body}
                              </div>
                              <div
                                style={{
                                  fontFamily: 'var(--font-mono), monospace',
                                  fontSize: 11,
                                  color: 'var(--muted)',
                                }}
                              >
                                {r.author_display} · {relativeTime(r.created_at)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                        <input
                          value={replyDraft[p.id] ?? ''}
                          onChange={(e) =>
                            setReplyDraft((d) => ({ ...d, [p.id]: e.target.value }))
                          }
                          maxLength={1000}
                          placeholder={authed === false ? 'Sign in to reply…' : 'Reply…'}
                          disabled={authed === false}
                          style={{ ...inputStyle, flex: 1, padding: '8px 12px', fontSize: 13.5 }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              void submitReply(p.id);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => void submitReply(p.id)}
                          disabled={!authed || (replyDraft[p.id] ?? '').trim().length < 2}
                          style={{ ...primaryBtn, fontSize: 13 }}
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {posts.length < total && (
        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={loading}
            style={ghostBtn}
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </section>
  );
}

function UpvoteButton({
  count,
  active,
  onClick,
  compact,
}: {
  count: number;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        padding: compact ? '4px 6px' : '6px 10px',
        borderRadius: 10,
        border: '1px solid ' + (active ? 'var(--cyan)' : 'var(--border)'),
        background: active ? 'rgba(0,184,212,.12)' : 'transparent',
        color: active ? 'var(--cyan-bright)' : 'var(--muted)',
        fontSize: compact ? 11 : 12,
        fontFamily: 'inherit',
        cursor: 'pointer',
        minWidth: compact ? 32 : 40,
        lineHeight: 1.1,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: compact ? 11 : 13 }}>
        ▲
      </span>
      <span>{count}</span>
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  background: 'rgba(5,8,16,.6)',
  border: '1px solid var(--border)',
  color: 'var(--mist)',
  fontSize: 14,
  outline: 'none',
};

const primaryBtn: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 10,
  background: 'var(--cyan)',
  color: '#001318',
  fontWeight: 600,
  fontSize: 13,
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const ghostBtn: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 10,
  background: 'transparent',
  color: '#C8D0DC',
  fontSize: 13,
  border: '1px solid var(--border)',
  cursor: 'pointer',
  fontFamily: 'inherit',
};
