// Inline-styled React Email template. Renders to HTML via Resend's
// `react:` body — no react-email package needed since we ship the React
// element straight through.
import type { ReactNode } from 'react';

const BG = '#050810';
const PANEL = '#0B2540';
const BORDER = 'rgba(255,255,255,0.08)';
const BORDER_ACCENT = 'rgba(0,184,212,.35)';
const MIST = '#E8ECF1';
const MUTED = '#8893a4';
const CYAN = '#00B8D4';
const CYAN_BRIGHT = '#00E5FF';

export type DigestProps = {
  baseUrl: string;
  firstName: string;
  streak: number;
  continueLearning?: {
    title: string;
    href: string;
  } | null;
  pulse: Array<{ title: string; summary: string; href: string }>;
  termOfWeek: {
    title: string;
    summary: string;
    href: string;
  } | null;
  understoodThisWeek: number;
  lessonsCompleted: number;
  unsubscribeUrl: string;
};

export function buildSubject(props: { streak: number; pulseCount: number }): string {
  const streakBit = props.streak >= 2 ? `${props.streak} day streak 🔥` : 'Your week in robotics';
  return `Your R2BOT week — ${streakBit} | ${props.pulseCount} new robotics stor${props.pulseCount === 1 ? 'y' : 'ies'}`;
}

function Section({ children, mt = 24 }: { children: ReactNode; mt?: number }) {
  return <div style={{ marginTop: mt }}>{children}</div>;
}

function EyebrowH({ children, color = CYAN }: { children: ReactNode; color?: string }) {
  return (
    <div
      style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 11,
        letterSpacing: '.25em',
        color,
        textTransform: 'uppercase',
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

function Card({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return (
    <div
      style={{
        padding: '18px 20px',
        borderRadius: 12,
        border: `1px solid ${accent ? BORDER_ACCENT : BORDER}`,
        background: accent
          ? 'linear-gradient(135deg, rgba(0,184,212,.10), rgba(11,37,64,.7))'
          : PANEL,
      }}
    >
      {children}
    </div>
  );
}

export function WeeklyDigest(props: DigestProps) {
  const {
    baseUrl,
    firstName,
    streak,
    continueLearning,
    pulse,
    termOfWeek,
    understoodThisWeek,
    lessonsCompleted,
    unsubscribeUrl,
  } = props;

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          background: BG,
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          color: MIST,
          lineHeight: 1.55,
        }}
      >
        <table
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          role="presentation"
          style={{ background: BG }}
        >
          <tr>
            <td align="center" style={{ padding: '32px 16px' }}>
              <table
                width="600"
                cellPadding={0}
                cellSpacing={0}
                role="presentation"
                style={{ maxWidth: 600, width: '100%' }}
              >
                {/* Header */}
                <tr>
                  <td style={{ padding: '8px 4px 24px' }}>
                    <div
                      style={{
                        fontFamily: '"Space Grotesk", "Inter", sans-serif',
                        fontSize: 22,
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      R<span style={{ color: CYAN }}>2</span>BOT
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 14,
                        color: MUTED,
                        fontFamily: '"JetBrains Mono", monospace',
                        letterSpacing: '.1em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Your weekly robotics digest
                    </div>
                  </td>
                </tr>

                <tr>
                  <td>
                    <div style={{ fontSize: 22, color: MIST, margin: '8px 0 4px' }}>
                      Hi {firstName},
                    </div>
                  </td>
                </tr>

                {/* Streak tile */}
                {streak >= 2 && (
                  <tr>
                    <td>
                      <Section>
                        <Card accent>
                          <div style={{ fontSize: 18, color: CYAN_BRIGHT }}>
                            🔥 You&apos;re on a {streak}-day streak. Keep it up!
                          </div>
                        </Card>
                      </Section>
                    </td>
                  </tr>
                )}

                {/* Continue learning */}
                {continueLearning && (
                  <tr>
                    <td>
                      <Section>
                        <EyebrowH>Continue learning</EyebrowH>
                        <Card>
                          <div style={{ fontSize: 16, color: MIST, marginBottom: 8 }}>
                            {continueLearning.title}
                          </div>
                          <a
                            href={`${baseUrl}${continueLearning.href}`}
                            style={{
                              display: 'inline-block',
                              padding: '8px 14px',
                              borderRadius: 8,
                              background: CYAN,
                              color: '#001318',
                              fontWeight: 600,
                              fontSize: 13,
                              textDecoration: 'none',
                            }}
                          >
                            Pick up where you left off →
                          </a>
                        </Card>
                      </Section>
                    </td>
                  </tr>
                )}

                {/* Pulse */}
                {pulse.length > 0 && (
                  <tr>
                    <td>
                      <Section>
                        <EyebrowH>This week in robotics</EyebrowH>
                        {pulse.map((p) => (
                          <Card key={p.href}>
                            <div style={{ fontSize: 16, color: MIST, marginBottom: 6 }}>
                              {p.title}
                            </div>
                            <div style={{ fontSize: 14, color: MUTED, marginBottom: 10 }}>
                              {p.summary}
                            </div>
                            <a
                              href={`${baseUrl}${p.href}`}
                              style={{ color: CYAN, fontSize: 13 }}
                            >
                              Read more →
                            </a>
                          </Card>
                        ))}
                      </Section>
                    </td>
                  </tr>
                )}

                {/* Term of the week */}
                {termOfWeek && (
                  <tr>
                    <td>
                      <Section>
                        <EyebrowH>Term of the week</EyebrowH>
                        <Card>
                          <div
                            style={{
                              fontFamily: '"Space Grotesk", "Inter", sans-serif',
                              fontSize: 20,
                              color: MIST,
                              marginBottom: 6,
                            }}
                          >
                            {termOfWeek.title}
                          </div>
                          <div style={{ fontSize: 14, color: '#C8D0DC', marginBottom: 10 }}>
                            {termOfWeek.summary}
                          </div>
                          <a
                            href={`${baseUrl}${termOfWeek.href}`}
                            style={{ color: CYAN, fontSize: 13 }}
                          >
                            Read more →
                          </a>
                        </Card>
                      </Section>
                    </td>
                  </tr>
                )}

                {/* Track progress */}
                <tr>
                  <td>
                    <Section>
                      <EyebrowH color={MUTED}>Your progress</EyebrowH>
                      <Card>
                        <div style={{ fontSize: 14, color: '#C8D0DC' }}>
                          You&apos;ve understood{' '}
                          <strong style={{ color: CYAN_BRIGHT }}>{understoodThisWeek}</strong>{' '}
                          Atlas terms this week.{' '}
                          <strong style={{ color: CYAN_BRIGHT }}>{lessonsCompleted}</strong>{' '}
                          lessons completed.
                        </div>
                      </Card>
                    </Section>
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td>
                    <div
                      style={{
                        marginTop: 40,
                        paddingTop: 24,
                        borderTop: `1px solid ${BORDER}`,
                        textAlign: 'center',
                        fontSize: 12,
                        color: MUTED,
                      }}
                    >
                      R2BOT · Open access for learners
                      <br />
                      <a href={unsubscribeUrl} style={{ color: MUTED, textDecoration: 'underline' }}>
                        Unsubscribe from this digest
                      </a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}
