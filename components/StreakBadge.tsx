'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { updateStreak } from '@/lib/streak';

const SESSION_KEY = 'r2bot_streak_updated';

/**
 * Reading-streak pill. Fires `updateStreak` once per session for the
 * authenticated user and displays "🔥 N day streak" if N > 0. Renders
 * nothing for anonymous visitors or when the streak is zero.
 */
export function StreakBadge() {
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        let alreadyUpdated = false;
        try {
          alreadyUpdated = sessionStorage.getItem(SESSION_KEY) === '1';
        } catch {
          /* sessionStorage blocked */
        }

        if (alreadyUpdated) {
          // Already pinged this session — just read the current value.
          const { data } = await supabase
            .from('profiles')
            .select('streak_count')
            .eq('id', user.id)
            .maybeSingle();
          if (!cancelled) setStreak((data?.streak_count as number) ?? 0);
          return;
        }

        const newStreak = await updateStreak(supabase, user.id);
        if (cancelled) return;
        try {
          sessionStorage.setItem(SESSION_KEY, '1');
        } catch {
          /* noop */
        }
        setStreak(newStreak);
      } catch {
        /* swallow — streak is a nice-to-have */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!streak || streak <= 0) return null;
  return (
    <span
      aria-label={`${streak} day reading streak`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 11px',
        borderRadius: 999,
        background: 'rgba(255, 176, 32, 0.12)',
        border: '1px solid rgba(255, 176, 32, 0.45)',
        color: 'var(--amber)',
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 12,
        letterSpacing: '.05em',
      }}
    >
      🔥 {streak} day streak
    </span>
  );
}
