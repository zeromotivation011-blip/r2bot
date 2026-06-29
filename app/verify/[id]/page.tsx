import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotProvider } from '@/components/CopilotProvider';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://r2bot-psi.vercel.app';

export const dynamic = 'force-dynamic';

const TRACK_ACCENT: Record<string, string> = {
  spark: '#00B8D4',
  wire: '#A56BFF',
  forge: '#00E5FF',
  edge: '#FFB800',
};

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Verify Certificate · ${id.slice(0, 8)}`,
    description: 'Verify an R2BOT learning certificate.',
    alternates: { canonical: `${BASE_URL}/verify/${id}` },
  };
}

export default async function VerifyPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('certificates')
    .select('lesson_title, track, lesson_slug, issued_at, user_id')
    .eq('certificate_id', id)
    .maybeSingle();

  // Pull display_name if possible
  let recipient = '';
  if (data?.user_id) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', data.user_id)
      .maybeSingle();
    recipient = (prof?.display_name as string | undefined) ?? '';
    if (!recipient) {
      const emailPart = (prof?.email as string | undefined)?.split('@')[0] ?? '';
      recipient = emailPart;
    }
  }

  const valid = !!data && !error;

  return (
    <CopilotProvider>
      <ParticleField />
      <CursorTrail />
      <Nav />
      <main id="main-content" style={{ paddingTop: 140, paddingBottom: 100, position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div className="section-eyebrow">Certificate verification</div>
          {valid ? (
            <>
              <h1 className="display" style={{ fontSize: 'clamp(34px, 5vw, 52px)', margin: '8px 0 14px', color: 'var(--mist)' }}>
                ✅ Valid Certificate
              </h1>
              <p style={{ fontSize: 16, color: '#B0B8C5', marginBottom: 28 }}>
                This certificate was issued by R2BOT and is verified as authentic.
              </p>

              <div
                style={{
                  padding: 24,
                  borderRadius: 16,
                  border: '1px solid var(--cyan)',
                  background: 'linear-gradient(135deg, rgba(0,184,212,.08), rgba(11,37,64,.5))',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: 999,
                      background: (TRACK_ACCENT[data!.track as string] ?? '#00B8D4') + '33',
                      border: `1px solid ${TRACK_ACCENT[data!.track as string] ?? '#00B8D4'}`,
                      color: TRACK_ACCENT[data!.track as string] ?? '#00B8D4',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono), monospace',
                      letterSpacing: '.15em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {data!.track}
                  </span>
                  <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'var(--font-mono), monospace' }}>
                    ID: {id.slice(0, 8)}
                  </span>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', letterSpacing: '.15em', textTransform: 'uppercase', fontFamily: 'var(--font-mono), monospace', marginBottom: 4 }}>
                    Recipient
                  </div>
                  <div style={{ fontSize: 24, color: 'var(--mist)', fontWeight: 600 }}>
                    {recipient || 'R2BOT Learner'}
                  </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', letterSpacing: '.15em', textTransform: 'uppercase', fontFamily: 'var(--font-mono), monospace', marginBottom: 4 }}>
                    Course
                  </div>
                  <div style={{ fontSize: 18, color: 'var(--cyan-bright)' }}>{data!.lesson_title}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: '#94A3B8', letterSpacing: '.15em', textTransform: 'uppercase', fontFamily: 'var(--font-mono), monospace', marginBottom: 4 }}>
                    Issued
                  </div>
                  <div style={{ fontSize: 15, color: '#C8D0DC' }}>
                    {new Date(data!.issued_at as string).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </div>

              <p style={{ marginTop: 28, fontSize: 13.5, color: '#94A3B8' }}>
                Verified against the R2BOT certificate registry. Full Certificate ID:{' '}
                <code style={{ color: 'var(--cyan-bright)' }}>{id}</code>
              </p>
            </>
          ) : (
            <>
              <h1 className="display" style={{ fontSize: 'clamp(34px, 5vw, 52px)', margin: '8px 0 14px', color: 'var(--mist)' }}>
                ❌ Certificate not found
              </h1>
              <p style={{ fontSize: 16, color: '#B0B8C5', marginBottom: 24 }}>
                This certificate ID is invalid or was never issued. If you believe this is an error, check the link or contact us.
              </p>
              <a
                href="/academy"
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  borderRadius: 999,
                  border: '1px solid var(--cyan)',
                  color: 'var(--cyan-bright)',
                  fontSize: 14,
                  textDecoration: 'none',
                  background: 'rgba(0,184,212,.15)',
                }}
              >
                Start a lesson →
              </a>
            </>
          )}
        </div>
      </main>
    </CopilotProvider>
  );
}
