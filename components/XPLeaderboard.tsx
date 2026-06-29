import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getLevel } from '@/lib/levels';

type Row = {
  id: string;
  display_name: string | null;
  email: string | null;
  total_xp: number;
  current_track: string | null;
  streak_days?: number | null;
  city?: string | null;
};

export type LeaderboardPeriod = 'all' | 'month' | 'week';

export async function XPLeaderboard({
  limit = 10,
  currentUserId,
  period = 'all',
  track,
}: {
  limit?: number;
  currentUserId?: string | null;
  period?: LeaderboardPeriod;
  track?: string;
}) {
  let rows: Row[] = [];
  let degraded = false;
  try {
    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from('profiles')
      .select('id, display_name, email, total_xp, current_track, streak_days, city')
      .order('total_xp', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (period === 'week' || period === 'month') {
      const days = period === 'week' ? 7 : 30;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('last_xp_awarded_at', cutoff);
    }

    if (track && ['spark', 'wire', 'forge', 'edge'].includes(track)) {
      query = query.eq('current_track', track);
    }

    const { data, error } = await query;
    if (error || !data) {
      degraded = true;
    } else {
      rows = data as Row[];
    }
  } catch {
    degraded = true;
  }

  if (degraded || rows.length === 0) {
    return (
      <div
        style={{
          padding: 18,
          borderRadius: 14,
          border: '1px dashed var(--border)',
          background: 'rgba(11,37,64,.3)',
          color: 'var(--muted)',
          fontSize: 14,
        }}
      >
        {degraded
          ? 'Leaderboard will appear here once builders start completing lessons. Complete your first lesson to claim the top spot.'
          : `No builders match this filter${period !== 'all' ? ` (period: ${period})` : ''}. Try a wider window.`}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map((r, idx) => {
        const isYou = currentUserId === r.id;
        const initial = (r.display_name?.[0] ?? r.email?.[0] ?? '?').toUpperCase();
        const name = r.display_name || (r.email ?? '').split('@')[0] || 'Anonymous builder';
        const trackColor = TRACK_BADGE_COLOR[r.current_track ?? ''] ?? '#475569';
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
        return (
          <div
            key={r.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 12,
              border: `1px solid ${isYou ? 'var(--cyan)' : 'var(--border)'}`,
              background: isYou ? 'rgba(0,184,212,.08)' : 'rgba(11,37,64,.3)',
            }}
          >
            <span style={{ minWidth: 32, fontFamily: 'var(--font-mono), monospace', fontSize: 13, color: idx < 3 ? 'var(--cyan-bright)' : '#94A3B8' }}>
              {medal}
            </span>
            <span
              aria-hidden
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'rgba(0,184,212,.18)',
                color: 'var(--cyan-bright)',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {initial}
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: 'var(--mist)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name} {isYou && <span style={{ color: 'var(--cyan)', fontSize: 11, marginLeft: 4 }}>(you)</span>}
            </span>
            {r.current_track && (
              <span
                style={{
                  padding: '2px 10px',
                  borderRadius: 999,
                  border: `1px solid ${trackColor}`,
                  background: `${trackColor}22`,
                  color: trackColor,
                  fontSize: 10,
                  fontFamily: 'var(--font-mono), monospace',
                  letterSpacing: '.15em',
                  textTransform: 'uppercase',
                }}
              >
                {r.current_track}
              </span>
            )}
            {(() => {
              const level = getLevel(r.total_xp ?? 0);
              return (
                <span
                  title={`Level: ${level.name}`}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 999,
                    border: `1px solid ${level.color}66`,
                    background: `${level.color}1a`,
                    color: level.color,
                    fontSize: 10,
                    fontFamily: 'var(--font-mono), monospace',
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {level.emoji} {level.name}
                </span>
              );
            })()}
            {r.streak_days && r.streak_days > 0 ? (
              <span
                title={`${r.streak_days}-day streak`}
                style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  border: '1px solid rgba(245,158,11,.4)',
                  background: 'rgba(245,158,11,.12)',
                  color: '#fbbf24',
                  fontSize: 10,
                  fontFamily: 'var(--font-mono), monospace',
                  whiteSpace: 'nowrap',
                }}
              >
                🔥 {r.streak_days}
              </span>
            ) : null}
            <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 13.5, color: 'var(--cyan-bright)', minWidth: 60, textAlign: 'right' }}>
              {(r.total_xp ?? 0).toLocaleString()} XP
            </span>
          </div>
        );
      })}
    </div>
  );
}

const TRACK_BADGE_COLOR: Record<string, string> = {
  spark: '#FFB800',
  wire: '#3B82F6',
  forge: '#A56BFF',
  edge: '#EF4444',
};
