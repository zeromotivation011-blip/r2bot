import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';
import {
  getLessonsForTrack,
  TRACK_ACCENT,
  TRACK_BLURB,
  TRACK_ORDER,
  trackLabel,
  type AcademyTrack,
} from '@/lib/academy';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://r2bot-psi.vercel.app';

export const dynamic = 'force-dynamic';

type Params = Promise<{ track: string }>;

const VALID: AcademyTrack[] = ['spark', 'wire', 'forge', 'edge'];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { track } = await params;
  if (!VALID.includes(track as AcademyTrack)) return { title: 'Track not found · R2BOT Academy' };
  const t = track as AcademyTrack;
  return {
    title: `${trackLabel(t)} · R2BOT Academy`,
    description: TRACK_BLURB[t],
    alternates: { canonical: `${BASE_URL}/academy/${t}` },
  };
}

export default async function TrackOverviewPage({ params }: { params: Params }) {
  const { track } = await params;
  if (!VALID.includes(track as AcademyTrack)) notFound();
  const t = track as AcademyTrack;
  const lessons = getLessonsForTrack(t);
  const accent = TRACK_ACCENT[t];
  const totalXP = lessons.reduce((s, l) => s + (l.xp ?? 0), 0);

  // Try to compute progress for signed-in users; degrade gracefully.
  let completedSlugs: Set<string> = new Set();
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_progress')
        .select('content_slug, completed')
        .eq('user_id', user.id)
        .eq('content_type', 'academy')
        .eq('completed', true)
        .like('content_slug', `${t}/%`);
      completedSlugs = new Set((data ?? []).map((r) => r.content_slug as string));
    }
  } catch {
    /* degrade silently if supabase not configured */
  }

  const completedCount = lessons.filter((l) => completedSlugs.has(`${t}/${l.slug}`)).length;
  const pct = lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0;

  const continueLesson = lessons.find((l) => !completedSlugs.has(`${t}/${l.slug}`)) ?? lessons[0];

  return (
    <CopilotProvider>
      <ParticleField />
      <CursorTrail />
      <Nav />
      <main id="main-content" style={{ paddingTop: 140, paddingBottom: 100, position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ maxWidth: 880 }}>
          {/* Track badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {TRACK_ORDER.map((other) => (
              <a
                key={other}
                href={`/academy/${other}`}
                style={{
                  padding: '4px 12px',
                  borderRadius: 999,
                  border: `1px solid ${other === t ? TRACK_ACCENT[other] : 'var(--border-2)'}`,
                  background: other === t ? `${TRACK_ACCENT[other]}22` : 'transparent',
                  color: other === t ? TRACK_ACCENT[other] : '#94A3B8',
                  fontSize: 11.5,
                  fontFamily: 'var(--font-mono), monospace',
                  letterSpacing: '.15em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                }}
              >
                {trackLabel(other)}
              </a>
            ))}
          </div>

          <h1
            className="display"
            style={{
              fontSize: 'clamp(48px, 6.5vw, 80px)',
              margin: '20px 0 16px',
              color: accent,
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            {trackLabel(t)}
          </h1>
          <p style={{ fontSize: 19, color: '#C8D0DC', maxWidth: 680, margin: '0 0 24px', lineHeight: 1.5 }}>
            {TRACK_BLURB[t]}
          </p>

          {/* Stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12,
              marginBottom: 28,
            }}
          >
            <Tile value={`${lessons.length}`} label="Lessons" />
            <Tile value={`${totalXP}`} label="XP available" />
            <Tile value={`${completedCount}/${lessons.length}`} label="Your progress" />
          </div>

          {/* Progress bar */}
          {lessons.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ height: 6, background: 'rgba(255,255,255,.06)', borderRadius: 999, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${accent}, var(--cyan-bright))`,
                    transition: 'width .3s',
                  }}
                />
              </div>
            </div>
          )}

          {/* CTA */}
          {lessons.length > 0 && (
            <a
              href={`/academy/${t}/${continueLesson.slug}`}
              style={{
                display: 'inline-block',
                padding: '12px 22px',
                borderRadius: 12,
                border: `1px solid ${accent}`,
                background: `${accent}22`,
                color: accent,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
                marginBottom: 40,
              }}
            >
              {completedCount === 0 ? 'Start Track →' : completedCount === lessons.length ? 'Review Track →' : 'Continue Track →'}
            </a>
          )}

          {/* Lesson list */}
          {lessons.length === 0 ? (
            <p style={{ color: '#94A3B8' }}>No lessons yet for this track.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {lessons.map((l, idx) => {
                const done = completedSlugs.has(`${t}/${l.slug}`);
                const locked = idx > 0 && !done && !completedSlugs.has(`${t}/${lessons[idx - 1].slug}`) && completedCount > 0
                  ? false // soft locking; we don't strictly lock — just badge it
                  : false;
                return (
                  <li key={l.slug} style={{ marginBottom: 12 }}>
                    <a
                      href={`/academy/${t}/${l.slug}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        padding: '16px 18px',
                        borderRadius: 14,
                        border: `1px solid ${done ? `${accent}55` : 'var(--border)'}`,
                        background: done ? `${accent}10` : 'rgba(11,37,64,.35)',
                        color: 'var(--mist)',
                        textDecoration: 'none',
                        transition: 'border-color .15s',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-mono), monospace',
                          fontSize: 13,
                          color: accent,
                          minWidth: 32,
                          letterSpacing: '.1em',
                        }}
                      >
                        {l.slug}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                          {l.title} {done && <span style={{ color: '#22c55e' }}>✓</span>}
                        </span>
                        <span style={{ display: 'block', fontSize: 12.5, color: '#94A3B8', fontFamily: 'var(--font-mono), monospace' }}>
                          {l.duration}{l.xp ? ` · +${l.xp} XP` : ''}{l.hindi_name ? ` · ${l.hindi_name}` : ''}
                        </span>
                      </span>
                      <span style={{ color: 'var(--muted)', fontSize: 13 }}>→</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}

          <p style={{ marginTop: 40, fontSize: 13, color: 'var(--muted)' }}>
            Want a different difficulty? Try{' '}
            {TRACK_ORDER.filter((o) => o !== t).map((o, i, arr) => (
              <span key={o}>
                <a href={`/academy/${o}`} style={{ color: 'var(--cyan)' }}>{trackLabel(o)}</a>
                {i < arr.length - 1 ? ' · ' : ''}
              </span>
            ))}
            .
          </p>
        </div>
      </main>
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div
      style={{
        padding: '16px 18px',
        borderRadius: 12,
        border: '1px solid var(--border)',
        background: 'rgba(11,37,64,.35)',
      }}
    >
      <div style={{ fontSize: 24, fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, color: 'var(--cyan-bright)' }}>
        {value}
      </div>
      <div style={{ marginTop: 4, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono), monospace', letterSpacing: '.15em', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}
