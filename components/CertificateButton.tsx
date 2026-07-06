'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { generateCertificate, type CertificateTrack } from '@/lib/certificate';

export function CertificateButton({
  track,
  lessonSlug,
  lessonTitle,
}: {
  track: CertificateTrack;
  lessonSlug: string;
  lessonTitle: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);

  const handle = async () => {
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Sign in to download your certificate.');
        setLoading(false);
        return;
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('display_name, email')
        .eq('id', user.id)
        .maybeSingle();
      const recipientName =
        (prof?.display_name as string | undefined) ||
        ((prof?.email as string | undefined)?.split('@')[0] ?? '') ||
        'R2BOT Learner';

      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track,
          lessonSlug: `${track}/${lessonSlug}`,
          lessonTitle,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Failed to register certificate');
      }
      const data = (await res.json()) as { certificateId: string; issuedAt: string };
      generateCertificate({
        recipientName,
        track,
        lessonTitle,
        completedAt: new Date(data.issuedAt),
        certificateId: data.certificateId,
      });
      setVerifyUrl(`https://www.r2bot.in/verify/${data.certificateId}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 6 }}>
      <button
        onClick={handle}
        disabled={loading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 18px',
          borderRadius: 999,
          background: loading ? 'rgba(0,184,212,.15)' : 'rgba(0,184,212,.2)',
          color: 'var(--cyan-bright)',
          border: '1px solid var(--cyan)',
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: loading ? 'wait' : 'pointer',
        }}
      >
        🎓 {loading ? 'Generating…' : 'Download Certificate'}
      </button>
      {error && <span style={{ fontSize: 12, color: '#ef4444' }}>{error}</span>}
      {verifyUrl && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
            borderRadius: 10,
            background: 'rgba(34,197,94,.12)',
            border: '1px solid rgba(34,197,94,.4)',
            fontSize: 12.5,
            color: '#86efac',
          }}
        >
          <span>Share your achievement!</span>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: '#0a66c2',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Post on LinkedIn →
          </a>
        </div>
      )}
    </div>
  );
}
