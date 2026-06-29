'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const DISMISS_KEY = 'r2bot_resume_dismissed';

type Resumable = {
  contentType: 'atlas' | 'academy';
  contentSlug: string;
  title: string;
  href: string;
};

/**
 * Looks up the most-recent (atlas|academy) entry the logged-in user
 * visited and offers a one-click "Resume" CTA. Renders nothing for
 * anonymous users, empty history, or after the user dismisses it.
 *
 * Titles aren't stored on the user_progress row directly — we hydrate
 * them by reading the Atlas slug or Academy lesson on demand from
 * Supabase-side metadata is unnecessary for that since slugs already
 * map deterministically into URLs and titles can be derived from the
 * slug when no better source is available.
 */
export function ResumeCard() {
  const [item, setItem] = useState<Resumable | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data } = await supabase
          .from('user_progress')
          .select('content_type, content_slug')
          .eq('user_id', user.id)
          .order('last_visited_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!data || cancelled) return;
        const key = `${data.content_type}/${data.content_slug}`;
        let stored: string[] = [];
        try {
          const raw = localStorage.getItem(DISMISS_KEY);
          stored = raw ? JSON.parse(raw) : [];
        } catch {
          /* noop */
        }
        if (stored.includes(key)) {
          setDismissed(true);
          return;
        }
        const href =
          data.content_type === 'atlas'
            ? `/atlas/${data.content_slug}`
            : `/academy/${data.content_slug}`;
        const title = humanise(data.content_slug as string);
        setItem({
          contentType: data.content_type as 'atlas' | 'academy',
          contentSlug: data.content_slug as string,
          title,
          href,
        });
      } catch {
        /* swallow */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => {
    if (!item) return;
    setDismissed(true);
    try {
      const key = `${item.contentType}/${item.contentSlug}`;
      const raw = localStorage.getItem(DISMISS_KEY);
      const stored: string[] = raw ? JSON.parse(raw) : [];
      if (!stored.includes(key)) {
        localStorage.setItem(DISMISS_KEY, JSON.stringify([...stored, key]));
      }
    } catch {
      /* noop */
    }
  };

  if (!item || dismissed) return null;
  return (
    <section
      style={{
        margin: '36px auto 0',
        maxWidth: 760,
        padding: '18px 22px',
        borderLeft: '3px solid var(--cyan)',
        background: 'linear-gradient(90deg, rgba(0,184,212,.08), rgba(0,184,212,0))',
        border: '1px solid var(--border-2)',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 11,
            letterSpacing: '.3em',
            color: 'var(--cyan)',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          Resume where you left off
        </div>
        <div style={{ fontSize: 15, color: 'var(--mist)' }}>{item.title}</div>
      </div>
      <a
        href={item.href}
        style={{
          padding: '8px 14px',
          borderRadius: 999,
          background: 'var(--cyan)',
          color: '#001318',
          fontWeight: 600,
          fontSize: 13,
          textDecoration: 'none',
        }}
      >
        Resume →
      </a>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--muted)',
          fontSize: 18,
          cursor: 'pointer',
          padding: 4,
          fontFamily: 'inherit',
        }}
      >
        ×
      </button>
    </section>
  );
}

function humanise(slug: string): string {
  // "concept/pid-controller" → "PID controller (atlas)"
  // "spark/03" → "Spark · Lesson 03"
  const parts = slug.split('/');
  if (parts[0] === 'spark' || parts[0] === 'wire' || parts[0] === 'forge' || parts[0] === 'edge') {
    const trackLabel = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    return `${trackLabel} · Lesson ${parts[1] ?? ''}`.trim();
  }
  const last = parts[parts.length - 1] ?? slug;
  return last
    .split('-')
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}
