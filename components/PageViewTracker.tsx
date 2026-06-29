'use client';

import { useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Logged-in last_visited_at bump. UPSERTs the user_progress row for
 * (contentType, contentSlug) with last_visited_at = now(). Anonymous
 * visitors are no-ops (RLS would block the write anyway).
 */
export function PageViewTracker({
  contentType,
  contentSlug,
}: {
  contentType: 'atlas' | 'academy';
  contentSlug: string;
}) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        await supabase
          .from('user_progress')
          .upsert(
            {
              user_id: user.id,
              content_type: contentType,
              content_slug: contentSlug,
              last_visited_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,content_type,content_slug' },
          );
      } catch {
        /* swallow */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contentType, contentSlug]);

  return null;
}
