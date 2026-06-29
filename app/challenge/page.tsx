import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';
import { DailyChallenge } from '@/components/DailyChallenge';
import { getDailyChallenge, getRecentChallenges } from '@/lib/challenges';
import { ChallengeArchive } from './ChallengeArchive';

export const metadata: Metadata = {
  title: 'Daily Robot Challenge · R2BOT',
  description:
    'One scenario. Every day. Build engineering intuition with daily robotics puzzles — from beginner Spark to advanced Edge.',
};

// Revalidate hourly so the day-rollover doesn't get pinned to a stale build.
export const revalidate = 3600;

export default function ChallengePage() {
  const today = getDailyChallenge();
  // Show 7 days including today, then drop today from the archive list.
  const recent = getRecentChallenges(8).slice(1);

  return (
    <CopilotProvider>
      <ParticleField />
      <CursorTrail />
      <Nav />

      <main id="main-content" style={{ paddingTop: 130, paddingBottom: 90, position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <div className="section-eyebrow">Daily practice</div>
          <h1
            className="display"
            style={{
              fontSize: 'clamp(40px, 5.5vw, 64px)',
              lineHeight: 1.05,
              margin: '0 0 14px',
            }}
          >
            Daily Robot Challenge
          </h1>
          <p
            style={{
              fontSize: 18,
              color: '#B0B8C5',
              maxWidth: 620,
              margin: '0 0 36px',
              lineHeight: 1.55,
            }}
          >
            One scenario. Every day. Build your engineering intuition — Spark to Edge,
            10 to 25 points each. Your progress is saved locally.
          </p>

          <DailyChallenge challenge={today} />

          <section style={{ marginTop: 60 }}>
            <h2
              className="display"
              style={{ fontSize: 26, margin: '0 0 8px', color: 'var(--mist)' }}
            >
              Challenge archive
            </h2>
            <p
              style={{
                fontSize: 14,
                color: 'var(--muted)',
                margin: '0 0 18px',
              }}
            >
              The last seven days — click any row to expand the question, then reveal the answer.
            </p>
            <ChallengeArchive items={recent} />
          </section>

          <section
            style={{
              marginTop: 48,
              padding: '24px 26px',
              borderRadius: 16,
              border: '1px dashed var(--border-2)',
              background: 'rgba(11,37,64,.25)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono), monospace',
                fontSize: 11,
                letterSpacing: '.3em',
                color: 'var(--cyan)',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              🏆 Streak leaderboard
            </div>
            <p style={{ margin: 0, color: '#B0B8C5', fontSize: 14, lineHeight: 1.55 }}>
              Coming soon — climb the global streak board, compete with R2BOT learners across
              India and the world.
            </p>
          </section>
        </div>
      </main>

      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
