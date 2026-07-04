import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';
import { StreakBadge } from '@/components/StreakBadge';
import { TermOfTheDay } from '@/components/TermOfTheDay';
import { XPLeaderboard } from '@/components/XPLeaderboard';
import { EmailDigestToggle } from '@/components/EmailDigestToggle';
import { ResumeChatButton } from '@/components/ResumeChatButton';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getAllAtlasEntries, type AtlasCategory, ATLAS_CATEGORIES } from '@/lib/atlas';
import { type Job, formatSalary, timeAgo, TRACK_LABEL } from '@/lib/jobs';
import { getUserSubscription } from '@/lib/subscription';

export const metadata: Metadata = {
  title: 'Mission control · R2BOT',
  description: 'Your robotics learning hub — progress, bookmarks, news, and the day’s term.',
};

export const dynamic = 'force-dynamic';

type Track = 'spark' | 'wire' | 'forge' | 'edge';

const TRACK_ACCENT: Record<Track, string> = {
  spark: '#00B8D4',
  wire: '#A56BFF',
  forge: '#00E5FF',
  edge: '#FFB800',
};

const TRACK_TOTAL_LESSONS: Record<Track, number> = {
  spark: 6, // Only Spark is published; others are upcoming.
  wire: 6,
  forge: 6,
  edge: 6,
};

const CATEGORY_LABEL: Record<AtlasCategory, string> = {
  fundamentals: 'Fundamentals',
  sensors: 'Sensors',
  actuators: 'Actuators',
  control: 'Control',
  'ai-and-perception': 'AI & Perception',
  'robot-types': 'Robot Types',
  hardware: 'Hardware',
  applications: 'Applications',
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/dashboard');

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('email, display_name, current_track, streak_count, diagnostic_score, email_digest_enabled')
    .eq('id', user.id)
    .maybeSingle();

  const profile = profileRow ?? {
    email: user.email ?? '',
    display_name: null as string | null,
    current_track: null as Track | null,
    streak_count: 0,
    diagnostic_score: null as number | null,
    email_digest_enabled: true,
  };
  const digestEnabled = (profile as { email_digest_enabled?: boolean }).email_digest_enabled ?? true;

  const firstName =
    profile.display_name?.split(' ')[0] || (profile.email ?? '').split('@')[0] || 'friend';
  const track = (['spark', 'wire', 'forge', 'edge'] as const).includes(profile.current_track as Track)
    ? (profile.current_track as Track)
    : null;

  const subscription = await getUserSubscription(user.id);
  const accountEmail = user.email ?? profile.email ?? '';

  return (
    <CopilotProvider>
      <ParticleField />
      <CursorTrail />
      <Nav />
      <main id="main-content" style={{ paddingTop: 130, paddingBottom: 80, position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ maxWidth: 1100 }}>
          <WelcomeHeader
            firstName={firstName}
            track={track}
            diagnosticScore={profile.diagnostic_score}
          />

          <Suspense fallback={<Skeleton h={170} label="Loading your next lesson…" />}>
            <ContinueLearning userId={user.id} track={track} />
          </Suspense>

          <Suspense fallback={<Skeleton h={120} label="" />}>
            <StatsRow
              userId={user.id}
              streakCount={profile.streak_count ?? 0}
            />
          </Suspense>

          <Suspense fallback={<Skeleton h={220} label="Loading the latest from Pulse…" />}>
            <PulseStrip />
          </Suspense>

          <Section title="Term of the day">
            <TermOfTheDay />
          </Section>

          <Suspense fallback={<Skeleton h={140} label="Loading your library…" />}>
            <BookmarksStrip userId={user.id} />
          </Suspense>

          <Suspense fallback={<Skeleton h={140} label="Loading saved chats…" />}>
            <RecentChatsStrip userId={user.id} />
          </Suspense>

          <Suspense fallback={<Skeleton h={180} label="Loading robotics jobs…" />}>
            <JobsForLevel track={track} />
          </Suspense>

          <Suspense fallback={<Skeleton h={140} label="Loading certificates…" />}>
            <CertificatesStrip userId={user.id} />
          </Suspense>

          <Section title="Top builders">
            <Suspense fallback={<Skeleton h={120} label="Loading leaderboard…" />}>
              <XPLeaderboard limit={5} currentUserId={user.id} />
            </Suspense>
          </Section>

          <Suspense fallback={<Skeleton h={260} label="Loading Atlas coverage…" />}>
            <AtlasCoverage userId={user.id} />
          </Suspense>

          <div style={{ marginTop: 56, paddingTop: 28, borderTop: '1px solid var(--border)' }}>
            <h3 className="display" style={{ fontSize: 18, margin: '0 0 14px', color: 'var(--mist)' }}>
              Email preferences
            </h3>
            <EmailDigestToggle initial={digestEnabled} />
            <p style={{ marginTop: 10, fontSize: 13, color: 'var(--muted)' }}>
              Sent every Monday morning — your streak, recent stories, and one Atlas term to chew on.
            </p>
          </div>

          <div style={{ marginTop: 40, paddingTop: 28, borderTop: '1px solid var(--border)' }}>
            <h3 className="display" style={{ fontSize: 18, margin: '0 0 14px', color: 'var(--mist)' }}>
              Account
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginBottom: 14 }}>
              {/* Plan badge */}
              {subscription.isPro ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 999,
                  background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.5)',
                  color: '#fbbf24', fontSize: 12, fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase',
                }}>
                  ★ Pro
                  {subscription.currentPeriodEnd && (
                    <span style={{ color: 'var(--muted)', fontWeight: 700, letterSpacing: 0, textTransform: 'none', marginLeft: 4 }}>
                      · expires {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </span>
              ) : (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '6px 12px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                  color: 'var(--mist)', fontSize: 12, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase',
                }}>
                  Free Plan
                </span>
              )}

              {/* Email */}
              {accountEmail && (
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                  Signed in as <strong style={{ color: 'var(--mist)' }}>{accountEmail}</strong>
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {!subscription.isPro && (
                <a
                  href="/pricing"
                  className="btn"
                  style={{
                    background: '#fbbf24', color: '#1a0f00',
                    fontWeight: 900, padding: '8px 16px', borderRadius: 10,
                    border: 'none', textDecoration: 'none',
                  }}
                >
                  Upgrade to Pro →
                </a>
              )}
              <form action="/auth/sign-out" method="POST">
                <button type="submit" className="btn btn-ghost" style={{ border: '1px solid var(--border)' }}>
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}

// ===== Section 1: welcome header =====
function WelcomeHeader({
  firstName,
  track,
  diagnosticScore,
}: {
  firstName: string;
  track: Track | null;
  diagnosticScore: number | null;
}) {
  return (
    <section style={{ marginBottom: 40 }}>
      <div className="section-eyebrow">Mission control</div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 20,
          marginBottom: 14,
        }}
      >
        <h1
          className="display"
          style={{ fontSize: 'clamp(40px, 5.5vw, 64px)', margin: 0, color: 'var(--mist)' }}
        >
          Welcome back, {firstName}.
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <StreakBadge />
          <a
            href="/diagnostic"
            style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 12,
              color: 'var(--muted)',
              letterSpacing: '.15em',
              textTransform: 'uppercase',
              borderBottom: '1px dashed var(--border-2)',
            }}
          >
            Retake diagnostic →
          </a>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {track ? (
          <span
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              border: `1px solid ${TRACK_ACCENT[track]}`,
              background: `${TRACK_ACCENT[track]}1a`,
              color: TRACK_ACCENT[track],
              fontSize: 13,
              fontFamily: 'var(--font-mono), monospace',
              letterSpacing: '.1em',
              textTransform: 'uppercase',
            }}
          >
            {track} track
          </span>
        ) : (
          <a
            href="/diagnostic"
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              border: '1px solid var(--border)',
              color: 'var(--cyan)',
              fontSize: 13,
            }}
          >
            Take diagnostic to set your track →
          </a>
        )}
        {diagnosticScore !== null && (
          <span
            style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 12,
              color: 'var(--muted)',
              letterSpacing: '.05em',
            }}
          >
            Score {diagnosticScore}/30
          </span>
        )}
      </div>
    </section>
  );
}

// ===== Section 2: continue learning =====
async function ContinueLearning({
  userId,
  track,
}: {
  userId: string;
  track: Track | null;
}) {
  const supabase = await createSupabaseServerClient();

  // Find the most recent academy lesson that is NOT completed.
  const { data: latest } = await supabase
    .from('user_progress')
    .select('content_slug, last_visited_at, completed')
    .eq('user_id', userId)
    .eq('content_type', 'academy')
    .eq('completed', false)
    .order('last_visited_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Count completed lessons in the user's current track for the progress bar.
  let completedInTrack = 0;
  if (track) {
    const { count } = await supabase
      .from('user_progress')
      .select('content_slug', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('content_type', 'academy')
      .eq('completed', true)
      .like('content_slug', `${track}/%`);
    completedInTrack = count ?? 0;
  }
  const totalInTrack = track ? TRACK_TOTAL_LESSONS[track] : 6;
  const pct = totalInTrack > 0 ? Math.min(100, (completedInTrack / totalInTrack) * 100) : 0;

  return (
    <Section title="Continue learning">
      {latest ? (
        <div
          style={{
            padding: 22,
            borderRadius: 16,
            border: '1px solid var(--border-2)',
            background: 'linear-gradient(135deg, rgba(0,184,212,.08), rgba(0,184,212,0))',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: 11,
                  letterSpacing: '.3em',
                  color: 'var(--cyan)',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                {String(latest.content_slug).split('/')[0]} · Lesson
              </div>
              <div style={{ fontSize: 18, color: 'var(--mist)', marginBottom: 4 }}>
                {humaniseLesson(String(latest.content_slug))}
              </div>
            </div>
            <a
              href={`/academy/${latest.content_slug}`}
              className="btn btn-primary"
              style={{ padding: '10px 18px' }}
            >
              Resume →
            </a>
          </div>
          {track && (
            <div style={{ marginTop: 18 }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: 11,
                  color: 'var(--muted)',
                  letterSpacing: '.05em',
                  marginBottom: 6,
                }}
              >
                {completedInTrack} / {totalInTrack} lessons in {track}
              </div>
              <div
                style={{
                  height: 4,
                  background: 'rgba(255,255,255,.06)',
                  borderRadius: 999,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${TRACK_ACCENT[track]}, var(--cyan-bright))`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <a
          href="/academy"
          style={{
            display: 'block',
            padding: 22,
            borderRadius: 16,
            border: '1px dashed var(--border-2)',
            background: 'rgba(11,37,64,.35)',
            color: 'var(--mist)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 11,
              letterSpacing: '.3em',
              color: 'var(--cyan)',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Ready when you are
          </div>
          <div style={{ fontSize: 18 }}>Start your first lesson →</div>
        </a>
      )}
    </Section>
  );
}

// ===== Section 3: stats row =====
async function StatsRow({ userId, streakCount }: { userId: string; streakCount: number }) {
  const supabase = await createSupabaseServerClient();
  const [
    { count: atlasCount },
    { count: lessonsCount },
    { data: xpRows },
  ] = await Promise.all([
    supabase
      .from('user_progress')
      .select('content_slug', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('content_type', 'atlas')
      .eq('understood', true),
    // Canonical lesson-completion source for the MDX academy.
    supabase
      .from('lesson_completions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('lesson_completions')
      .select('xp_earned')
      .eq('user_id', userId),
  ]);

  const xpEarned = Array.isArray(xpRows)
    ? xpRows.reduce<number>((sum, row) => sum + (typeof row?.xp_earned === 'number' ? row.xp_earned : 0), 0)
    : 0;

  return (
    <Section title="" gap={18}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
        }}
      >
        <StatTile value={String(atlasCount ?? 0)} label="Atlas terms understood" />
        <StatTile value={String(lessonsCount ?? 0)} label="Lessons completed" />
        <StatTile value={String(xpEarned)} label="XP earned" />
        <StatTile value={String(streakCount)} label="Day streak" />
      </div>
    </Section>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div
      style={{
        padding: '20px 22px',
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'rgba(11,37,64,.35)',
      }}
    >
      <div
        style={{
          fontSize: 38,
          fontFamily: 'var(--font-display), sans-serif',
          fontWeight: 700,
          color: 'var(--cyan)',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          color: 'var(--muted)',
          fontFamily: 'var(--font-mono), monospace',
          letterSpacing: '.15em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ===== Section 4: Pulse strip =====
async function PulseStrip() {
  const supabase = await createSupabaseServerClient();
  // pulse_queue is part of the proposed Pulse pipeline that hasn't been built
  // out yet — degrade silently when the table doesn't exist.
  const { data, error } = await supabase
    .from('pulse_queue')
    .select('title, slug, source_name, created_at, tags')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(3);

  const items = !error && data ? data : [];

  return (
    <Section
      title="News for your level"
      right={
        <a href="/news" style={{ fontSize: 13, color: 'var(--cyan)' }}>
          View all news →
        </a>
      }
    >
      {items.length === 0 ? (
        <a
          href="/news"
          style={{
            display: 'block',
            padding: 18,
            borderRadius: 14,
            border: '1px dashed var(--border)',
            background: 'rgba(11,37,64,.3)',
            color: 'var(--muted)',
            fontSize: 14,
          }}
        >
          The auto-discovery pipeline is still being built — head to <span style={{ color: 'var(--cyan)' }}>/pulse</span> for hand-published stories.
        </a>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {items.map((p) => (
            <a
              key={p.slug as string}
              href={`/pulse/${p.slug}`}
              style={{
                padding: 18,
                borderRadius: 14,
                border: '1px solid var(--border)',
                background: 'rgba(11,37,64,.4)',
                color: 'var(--mist)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: 10,
                  letterSpacing: '.2em',
                  color: 'var(--cyan)',
                  textTransform: 'uppercase',
                }}
              >
                {String(p.source_name ?? 'Pulse')}
              </div>
              <div style={{ fontSize: 15.5, lineHeight: 1.4 }}>{String(p.title)}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 'auto' }}>
                {new Date(String(p.created_at)).toLocaleDateString()}
              </div>
            </a>
          ))}
        </div>
      )}
    </Section>
  );
}

// ===== Section 6: Bookmarks =====
async function BookmarksStrip({ userId }: { userId: string }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('bookmarks')
    .select('content_type, content_slug, content_title, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(4);

  const items = (data ?? []) as Array<{
    content_type: 'atlas' | 'academy' | 'pulse';
    content_slug: string;
    content_title: string;
  }>;

  return (
    <Section
      title="Bookmarks"
      right={
        <a href="/dashboard/bookmarks" style={{ fontSize: 13, color: 'var(--cyan)' }}>
          View all →
        </a>
      }
    >
      {items.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          No bookmarks yet — ⭐ any Atlas term to save it here.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {items.map((b) => (
            <a
              key={`${b.content_type}/${b.content_slug}`}
              href={bookmarkHref(b)}
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'rgba(11,37,64,.35)',
                color: 'var(--mist)',
                fontSize: 14,
                display: 'flex',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 18 }}>
                {b.content_type === 'atlas' ? '📚' : b.content_type === 'academy' ? '🎓' : '📰'}
              </span>
              <span>{b.content_title}</span>
            </a>
          ))}
        </div>
      )}
    </Section>
  );
}

function bookmarkHref(b: { content_type: string; content_slug: string }): string {
  if (b.content_type === 'atlas') return `/atlas/${b.content_slug}`;
  if (b.content_type === 'academy') return `/academy/${b.content_slug}`;
  return `/pulse/${b.content_slug}`;
}

// ===== Section 6c: Jobs for your level =====
async function JobsForLevel({ track }: { track: Track | null }) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('jobs')
    .select(
      'id, external_id, title, company, location, experience_min, experience_max, salary_min, salary_max, salary_currency, skills, description, apply_url, source, posted_at, fetched_at, is_active, track_relevance',
    )
    .eq('is_active', true);

  if (track) {
    query = query.in('track_relevance', [track, 'all']);
  }

  const { data, error } = await query
    .order('posted_at', { ascending: false, nullsFirst: false })
    .limit(3);

  const jobs = !error && Array.isArray(data) ? (data as unknown as Job[]) : [];

  const heading = track ? `Jobs for ${TRACK_LABEL[track]} level` : 'Jobs for your level';
  const viewAllHref = track ? `/careers?track=${track}` : '/careers';
  const viewAllLabel = track ? `View all ${TRACK_LABEL[track]} jobs →` : 'View all jobs →';

  return (
    <Section
      title={heading}
      right={
        <a href={viewAllHref} style={{ fontSize: 13, color: 'var(--cyan)' }}>
          {viewAllLabel}
        </a>
      }
    >
      {jobs.length === 0 ? (
        <a
          href="/careers"
          style={{
            display: 'block',
            padding: 18,
            borderRadius: 14,
            border: '1px dashed var(--border)',
            background: 'rgba(11,37,64,.3)',
            color: 'var(--muted)',
            fontSize: 14,
          }}
        >
          No live jobs yet — once the daily scraper runs, your matches will appear here.
        </a>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {jobs.map((j) => (
            <article
              key={j.id}
              style={{
                padding: 16,
                borderRadius: 14,
                border: '1px solid var(--border)',
                background: 'rgba(11,37,64,.4)',
                color: 'var(--mist)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: 10,
                  letterSpacing: '.2em',
                  color: 'var(--cyan)',
                  textTransform: 'uppercase',
                }}
              >
                {timeAgo(j.posted_at ?? j.fetched_at)}
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.4, fontWeight: 600 }}>{j.title}</div>
              <div style={{ fontSize: 13, color: '#C8D0DC' }}>{j.company}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                📍 {j.location} · 💰 {formatSalary(j)}
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 4 }}>
                <a
                  href={j.apply_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  style={{
                    color: 'var(--cyan)',
                    fontSize: 13,
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                  }}
                >
                  Apply on Naukri →
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </Section>
  );
}

// ===== Section 6b: Recent R2 chats =====
async function RecentChatsStrip({ userId }: { userId: string }) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('copilot_sessions')
    .select('id, messages, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(3);

  const items: Array<{ id: string; firstQuestion: string; created_at: string }> =
    !error && Array.isArray(data)
      ? data.map((row) => {
          const msgs = Array.isArray(row.messages) ? (row.messages as Array<{ role: string; content: string }>) : [];
          const firstUser = msgs.find((m) => m && m.role === 'user' && typeof m.content === 'string');
          const q = firstUser?.content ?? 'Saved conversation';
          return {
            id: String(row.id),
            firstQuestion: q.length > 90 ? q.slice(0, 90) + '…' : q,
            created_at: String(row.created_at),
          };
        })
      : [];

  return (
    <Section title="Recent R2 chats">
      {items.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          No saved chats yet — open R2 Co-pilot (⌘K), ask a question, then click <strong>Save chat</strong>.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {items.map((s) => (
            <div
              key={s.id}
              style={{
                padding: 16,
                borderRadius: 14,
                border: '1px solid var(--border)',
                background: 'rgba(11,37,64,.4)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: 10,
                  letterSpacing: '.2em',
                  color: 'var(--cyan)',
                  textTransform: 'uppercase',
                }}
              >
                {new Date(s.created_at).toLocaleDateString()}
              </div>
              <div style={{ fontSize: 14.5, lineHeight: 1.45, color: 'var(--mist)' }}>
                {s.firstQuestion}
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 4 }}>
                <ResumeChatButton sessionId={s.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ===== Section: Your certificates =====
async function CertificatesStrip({ userId }: { userId: string }) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('certificates')
    .select('certificate_id, lesson_title, track, issued_at')
    .eq('user_id', userId)
    .order('issued_at', { ascending: false })
    .limit(3);

  const certs = !error && Array.isArray(data) ? data : [];

  return (
    <Section
      title="Your certificates"
      right={
        certs.length > 0 ? (
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{certs.length} earned</span>
        ) : undefined
      }
    >
      {certs.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Complete an Academy lesson and download a certificate to see it here.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {certs.map((c) => {
            const trackKey = c.track as Track;
            const accent = TRACK_ACCENT[trackKey] ?? '#00B8D4';
            const shortId = String(c.certificate_id).slice(0, 8);
            return (
              <article
                key={c.certificate_id as string}
                style={{
                  padding: 16,
                  borderRadius: 14,
                  border: '1px solid var(--border)',
                  background: 'rgba(11,37,64,.4)',
                  color: 'var(--mist)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <span
                  style={{
                    alignSelf: 'flex-start',
                    padding: '3px 10px',
                    borderRadius: 999,
                    border: `1px solid ${accent}`,
                    background: `${accent}22`,
                    color: accent,
                    fontSize: 10,
                    fontFamily: 'var(--font-mono), monospace',
                    letterSpacing: '.18em',
                    textTransform: 'uppercase',
                  }}
                >
                  {String(c.track)}
                </span>
                <div style={{ fontSize: 15, lineHeight: 1.4, fontWeight: 600 }}>{String(c.lesson_title)}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {new Date(String(c.issued_at)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} · ID {shortId}
                </div>
                <a
                  href={`/verify/${c.certificate_id}`}
                  style={{
                    marginTop: 'auto',
                    color: 'var(--cyan)',
                    fontSize: 13,
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                  }}
                >
                  Verify →
                </a>
              </article>
            );
          })}
        </div>
      )}
    </Section>
  );
}

// ===== Section 7: Atlas coverage map =====
async function AtlasCoverage({ userId }: { userId: string }) {
  const all = getAllAtlasEntries();
  const totals: Record<AtlasCategory, number> = {
    fundamentals: 0,
    sensors: 0,
    actuators: 0,
    control: 0,
    'ai-and-perception': 0,
    'robot-types': 0,
    hardware: 0,
    applications: 0,
  };
  const slugByCategory: Record<AtlasCategory, Set<string>> = {
    fundamentals: new Set(),
    sensors: new Set(),
    actuators: new Set(),
    control: new Set(),
    'ai-and-perception': new Set(),
    'robot-types': new Set(),
    hardware: new Set(),
    applications: new Set(),
  };
  for (const e of all) {
    if (!e.category) continue;
    totals[e.category]++;
    // user_progress stores content_slug as "<type>/<slug>" — e.g. "concept/lidar".
    slugByCategory[e.category].add(`${e.type}/${e.slug}`);
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('user_progress')
    .select('content_slug')
    .eq('user_id', userId)
    .eq('content_type', 'atlas')
    .eq('understood', true);
  const understoodSet = new Set((data ?? []).map((r) => r.content_slug as string));

  const tiles = ATLAS_CATEGORIES.map((cat) => {
    const total = totals[cat];
    const known = [...slugByCategory[cat]].filter((s) => understoodSet.has(s)).length;
    return { cat, total, known };
  });

  return (
    <Section title="Atlas coverage">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        {tiles.map(({ cat, total, known }) => {
          const pct = total > 0 ? (known / total) * 100 : 0;
          const bg = pct === 0
            ? 'rgba(15, 23, 42, .85)'
            : pct >= 100
            ? 'rgba(0, 184, 212, .55)'
            : pct >= 51
            ? 'rgba(7, 89, 133, .55)'
            : 'rgba(120, 53, 15, .35)';
          const border = pct >= 100 ? 'var(--cyan-bright)' : pct >= 1 ? 'var(--border-2)' : 'var(--border)';
          return (
            <a
              key={cat}
              href={`/atlas?category=${cat}`}
              style={{
                padding: '16px 14px',
                borderRadius: 12,
                background: bg,
                border: `1px solid ${border}`,
                color: 'var(--mist)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: 11,
                  letterSpacing: '.15em',
                  color: pct >= 100 ? '#001318' : 'var(--mist)',
                  textTransform: 'uppercase',
                }}
              >
                {CATEGORY_LABEL[cat]}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: 13,
                  color: pct >= 100 ? '#001318' : 'var(--muted)',
                }}
              >
                {known} / {total} understood
              </span>
            </a>
          );
        })}
      </div>
    </Section>
  );
}

// ===== Shared building blocks =====
function Section({
  title,
  right,
  children,
  gap = 14,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  gap?: number;
}) {
  return (
    <section style={{ marginTop: 48 }}>
      {title && (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 16,
            gap: 12,
          }}
        >
          <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--mist)' }}>
            {title}
          </h2>
          {right}
        </div>
      )}
      <div style={{ marginTop: gap === 14 ? 0 : gap }}>{children}</div>
    </section>
  );
}

function Skeleton({ h, label }: { h: number; label: string }) {
  return (
    <div
      style={{
        marginTop: 32,
        height: h,
        borderRadius: 14,
        border: '1px dashed var(--border)',
        background: 'rgba(11,37,64,.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--muted)',
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 12,
        letterSpacing: '.15em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </div>
  );
}

function humaniseLesson(slug: string): string {
  // "spark/03" → "Spark · Lesson 03"
  const [track, num] = slug.split('/');
  if (!track || !num) return slug;
  const trackTitle = track.charAt(0).toUpperCase() + track.slice(1);
  return `${trackTitle} · Lesson ${num}`;
}
