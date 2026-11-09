'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { CertificateButton } from './CertificateButton';
import { ACADEMY_COMPLETED_EVENT, type AcademyCompletedDetail } from './LessonComplete';
import type { CertificateTrack } from '@/lib/certificate';

/**
 * Shows the certificate button only once the lesson is complete.
 * Source of truth is academy_completions (server-written, migration 0053; owners
 * may SELECT their own rows). Until that table exists the query errors and we
 * fall back to user_progress, which is what the page used before. The "Mark
 * complete" button announces ACADEMY_COMPLETED_EVENT so this flips without a
 * reload.
 */
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
        if (cancelled || !user) return;

        const { data: row, error } = await supabase
          .from('academy_completions')
          .select('completed_at')
          .eq('user_id', user.id)
          .eq('track', validTrack)
          .eq('lesson_slug', lessonSlug)
          .maybeSingle();
        if (!error) {
          if (!cancelled) setCompleted(Boolean(row));
          return;
        }

        // Table not there yet (pre-0053): the old progress row is the best we have.
        const { data } = await supabase
          .from('user_progress')
          .select('completed')
          .eq('user_id', user.id)
          .eq('content_type', 'academy')
          .eq('content_slug', `${validTrack}/${lessonSlug}`)
          .maybeSingle();
        if (!cancelled) setCompleted(!!data?.completed);
      } catch {
        /* ignore */
      }
    })();

    const onCompleted = (e: Event) => {
      const d = (e as CustomEvent<AcademyCompletedDetail>).detail;
      if (d && d.track === validTrack && d.lessonSlug === lessonSlug) setCompleted(true);
    };
    window.addEventListener(ACADEMY_COMPLETED_EVENT, onCompleted);
    return () => {
      cancelled = true;
      window.removeEventListener(ACADEMY_COMPLETED_EVENT, onCompleted);
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
