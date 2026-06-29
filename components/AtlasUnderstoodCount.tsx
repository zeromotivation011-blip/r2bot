'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Renders "You've understood X of N" — Supabase-backed when logged in,
 * falls back to the same r2bot_understood localStorage key MarkUnderstood
 * uses so anonymous progress still shows.
 */
export function AtlasUnderstoodCount({ total }: { total: number }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        if (user) {
          const { count: n } = await supabase
            .from('user_progress')
            .select('content_slug', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('content_type', 'atlas')
            .eq('understood', true);
          setCount(n ?? 0);
        } else {
          try {
            const raw = localStorage.getItem('r2bot_understood');
            const list: string[] = raw ? JSON.parse(raw) : [];
            setCount(list.filter((k) => k.startsWith('atlas/')).length);
          } catch {
            setCount(0);
          }
        }
      } catch {
        setCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (count === null || count === 0) return null;
  return (
    <p
      style={{
        margin: '4px 0 22px',
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 12,
        letterSpacing: '.1em',
        color: 'var(--cyan)',
        textTransform: 'uppercase',
      }}
    >
      ✓ You&apos;ve understood {count} of {total} entries
    </p>
  );
}
