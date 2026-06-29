'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { CertificateButton } from './CertificateButton';
import type { CertificateTrack } from '@/lib/certificate';

export function LessonCertificate({
  track,
  lessonSlug,
  lessonTitle,
}: {
  track: string;
  lessonSlug: string;
  lessonTitle: string;
}) {
  const [completed, setCompleted] = useState(false);
  const validTrack = (['spark', 'wire', 'forge', 'edge'] as const).includes(track as CertificateTrack)
    ? (track as CertificateTrack)
    : null;

  useEffect(() => {
    if (!validTrack) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        if (user) {
          const { data } = await supabase
            .from('user_progress')
            .select('completed')
            .eq('user_id', user.id)
            .eq('content_type', 'academy')
            .eq('content_slug', `${validTrack}/${lessonSlug}`)
            .maybeSingle();
          setCompleted(!!data?.completed);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [validTrack, lessonSlug]);

  if (!validTrack || !completed) return null;

  return (
    <CertificateButton
      track={validTrack}
      lessonSlug={lessonSlug}
      lessonTitle={lessonTitle}
    />
  );
}
