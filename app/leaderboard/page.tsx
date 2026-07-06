import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';
import { XPLeaderboard, type LeaderboardPeriod } from '@/components/XPLeaderboard';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.r2bot.in';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'R2BOT Leaderboard — Top Robotics Builders in India',
  description: 'The top 50 R2BOT builders by XP. Earn XP by completing Academy lessons across Spark, Wire, Forge, and Edge tracks.',
  alternates: { canonical: `${BASE_URL}/leaderboard` },
};

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'all', label: 'All Time' },
  { key: 'month', label: 'This Month' },
  { key: 'week', label: 'This Week' },
];

const TRACK_FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'All Tracks' },
  { key: 'spark', label: 'Spark' },
  { key: 'wire', label: 'Wire' },
  { key: 'forge', label: 'Forge' },
  { key: 'edge', label: 'Edge' },
];

type SearchParams = Promise<{ period?: string; track?: string }>;

export default async function LeaderboardPage({ searchParams }: { searchParams: SearchParams }) {
  const { period: periodParam, track: trackParam } = await searchParams;
  const period: LeaderboardPeriod =
    periodParam === 'month' || periodParam === 'week' ? periodParam : 'all';
  const track = ['spark', 'wire', 'forge', 'edge'].includes(trackParam ?? '') ? trackParam : '';

  let userId: string | null = null;
  let userRank: { rank: number; xp: number } | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
      const { data: prof } = await supabase
        .from('profiles')
        .select('total_xp')
        .eq('id', user.id)
        .maybeSingle();
      const xp = (prof?.total_xp as number | undefined) ?? 0;
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gt('total_xp', xp);
      if (count !== null) userRank = { rank: count + 1, xp };
    }
  } catch {
    /* degrade gracefully */
  }

  const buildHref = (next: { period?: LeaderboardPeriod; track?: string }) => {
    const sp = new URLSearchParams();
    const p = next.period ?? period;
    const t = next.track !== undefined ? next.track : track;
    if (p !== 'all') sp.set('period', p);
    if (t) sp.set('track', t);
    const qs = sp.toString();
    return qs ? `/leaderboard?${qs}` : '/leaderboard';
  };

  return (
    <CopilotProvider>
      <ParticleField />
      <CursorTrail />
      <Nav />
      <main id="main-content" style={{ paddingTop: 140, paddingBottom: 100, position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ maxWidth: 820 }}>
          <div className="section-eyebrow">🏆 Top builders</div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 5.5vw, 60px)', margin: '8px 0 16px', color: 'var(--mist)' }}>
            Leaderboard
          </h1>
          <p style={{ fontSize: 17, color: '#C8D0DC', marginBottom: 24, lineHeight: 1.55 }}>
            The top 50 R2BOT builders by XP. Earn XP by completing Academy lessons across Spark, Wire, Forge, and Edge tracks.
          </p>

          {userRank && userRank.rank > 50 && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                border: '1px solid var(--cyan)',
                background: 'rgba(0,184,212,.08)',
                color: 'var(--cyan-bright)',
                fontSize: 14,
                marginBottom: 24,
              }}
            >
              Your rank: <strong>#{userRank.rank}</strong> · {userRank.xp.toLocaleString()} XP — keep going!
            </div>
          )}

          {/* Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: '#94A3B8', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 6 }}>Time</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PERIODS.map((p) => {
                  const active = p.key === period;
                  return (
                    <a key={p.key} href={buildHref({ period: p.key })} style={pillStyle(active)}>
                      {p.label}
                    </a>
                  );
                })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94A3B8', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 6 }}>Track</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TRACK_FILTERS.map((t) => {
                  const active = t.key === (track || '');
                  return (
                    <a key={t.key || 'all'} href={buildHref({ track: t.key })} style={pillStyle(active)}>
                      {t.label}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          <XPLeaderboard limit={50} currentUserId={userId} period={period} track={track || undefined} />

          <div style={{ marginTop: 28, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="/academy" className="btn btn-primary">Start a lesson →</a>
            <a href="/dashboard" style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid var(--border-2)', color: '#C8D0DC', textDecoration: 'none' }}>
              ← Dashboard
            </a>
          </div>
        </div>
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 12px',
    borderRadius: 999,
    border: `1px solid ${active ? 'var(--cyan)' : 'var(--border-2)'}`,
    background: active ? 'rgba(0,184,212,.15)' : 'rgba(11,37,64,.45)',
    color: active ? 'var(--cyan-bright)' : '#C8D0DC',
    fontSize: 12.5,
    textDecoration: 'none',
    fontFamily: 'var(--font-mono), monospace',
    letterSpacing: '.05em',
  };
}
