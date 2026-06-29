'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Track = 'spark' | 'wire' | 'forge' | 'edge';

const TRACK_COLOR: Record<Track, string> = {
  spark: '#FFB800',
  wire: '#3B82F6',
  forge: '#A56BFF',
  edge: '#EF4444',
};

const TRACK_TOTAL: Record<Track, number> = { spark: 6, wire: 6, forge: 4, edge: 3 };

function thisWeekKey(): string {
  const d = new Date();
  const year = d.getUTCFullYear();
  // ISO week number (rough — good enough for "this week" dismissal)
  const onejan = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7);
  return `r2bot_banner_dismissed_${year}_w${week}`;
}

export function ProgressBanner() {
  const [data, setData] = useState<{
    firstName: string;
    track: Track;
    pct: number;
    nextHref: string;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === 'undefined') return;
      try {
        if (localStorage.getItem(thisWeekKey()) === '1') {
          setDismissed(true);
          return;
        }
      } catch {
        /* ignore */
      }
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        // last visited progress row
        const { data: latest } = await supabase
          .from('user_progress')
          .select('content_slug, completed, last_visited_at')
          .eq('user_id', user.id)
          .eq('content_type', 'academy')
          .order('last_visited_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!latest || !latest.last_visited_at) return;

        // 7+ days since last activity?
        const ageMs = Date.now() - new Date(latest.last_visited_at as string).getTime();
        if (ageMs < 7 * 24 * 60 * 60 * 1000) return;

        // determine track + percentage
        const [trackStr] = String(latest.content_slug).split('/');
        if (!['spark', 'wire', 'forge', 'edge'].includes(trackStr)) return;
        const track = trackStr as Track;

        const { count } = await supabase
          .from('user_progress')
          .select('content_slug', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('content_type', 'academy')
          .eq('completed', true)
          .like('content_slug', `${track}/%`);
        const completed = count ?? 0;
        const total = TRACK_TOTAL[track];
        const pct = Math.round((completed / total) * 100);

        // first name (best effort)
        const { data: prof } = await supabase
          .from('profiles')
          .select('display_name, email')
          .eq('id', user.id)
          .maybeSingle();
        const firstName =
          (prof?.display_name as string | undefined)?.split(' ')[0] ||
          ((prof?.email as string | undefined) ?? '').split('@')[0] ||
          'friend';

        // next href: continue the most recent uncompleted lesson, fall back to track page
        const nextHref = latest.completed ? `/academy/${track}` : `/academy/${latest.content_slug}`;

        if (!cancelled) {
          setData({ firstName, track, pct, nextHref });
        }
      } catch {
        /* degrade silently */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data || dismissed) return null;

  const color = TRACK_COLOR[data.track];

  return (
    <div
      style={{
        position: 'sticky',
        top: 68,
        zIndex: 50,
        padding: '10px 16px',
        background: `${color}1a`,
        borderTop: `1px solid ${color}55`,
        borderBottom: `1px solid ${color}55`,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="container"
        style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: '#E1E7EE' }}
      >
        <span aria-hidden style={{ fontSize: 17 }}>👋</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          Welcome back, <strong>{data.firstName}</strong>! You're{' '}
          <strong style={{ color }}>{data.pct}%</strong> through {data.track[0].toUpperCase() + data.track.slice(1)}.{' '}
          <a
            href={data.nextHref}
            style={{ color, textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            Continue where you left off →
          </a>
        </span>
        <button
          onClick={() => {
            try {
              localStorage.setItem(thisWeekKey(), '1');
            } catch {
              /* ignore */
            }
            setDismissed(true);
          }}
          aria-label="Dismiss progress banner"
          style={{
            padding: '4px 10px',
            borderRadius: 999,
            border: '1px solid var(--border-2)',
            background: 'rgba(11,37,64,.5)',
            color: '#94A3B8',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
