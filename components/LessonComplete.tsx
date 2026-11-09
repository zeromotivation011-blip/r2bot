'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useToast } from './Toast';
import { LessonCompleteModal } from './LessonCompleteModal';

/** Fired on window after the server records a completion, so sibling widgets (the certificate button) can update. */
export const ACADEMY_COMPLETED_EVENT = 'r2bot:academy-completed';
export type AcademyCompletedDetail = { track: string; lessonSlug: string; recorded: boolean };

/**
 * "Mark complete" CTA on every Academy lesson page.
 *  - On mount: check whether already completed. If so, render a green indicator.
 *  - On click (signed in): POST /api/academy/complete — the server validates the
 *    lesson, grades any quiz and writes academy_completions (the record the
 *    certificate route requires). Then UPSERT user_progress for the progress UI,
 *    award XP, and announce ACADEMY_COMPLETED_EVENT.
 *  - Anonymous users get localStorage-only state.
 */
export function LessonComplete({
  track,
  lessonSlug,
  lessonTitle,
  nextHref,
  xp,
}: {
  track: string;
  lessonSlug: string;
  lessonTitle: string;
  nextHref?: string;
  xp?: number;
}) {
  const [completed, setCompleted] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [animating, setAnimating] = useState(false);
  const [xpAwarded, setXpAwarded] = useState<number | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);
  const key = `${track}/${lessonSlug}`;
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        if (user) {
          setAuthed(true);
          const { data } = await supabase
            .from('user_progress')
            .select('completed')
            .eq('user_id', user.id)
            .eq('content_type', 'academy')
            .eq('content_slug', key)
            .maybeSingle();
          setCompleted(!!data?.completed);
        } else {
          setAuthed(false);
          try {
            const raw = localStorage.getItem('r2bot_lessons_completed');
            const list: string[] = raw ? JSON.parse(raw) : [];
            setCompleted(list.includes(key));
          } catch {
            /* noop */
          }
        }
      } catch {
        setAuthed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const onClick = async () => {
    if (completed) return;
    setCompleted(true);
    setAnimating(true);
    if (authed) {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('unauth');

        // The authoritative record. Answers 200 {recorded:false} before
        // migration 0053 — still a completion as far as this page is concerned.
        const completeRes = await fetch('/api/academy/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ track, lessonSlug }),
        });
        if (!completeRes.ok) throw new Error('complete-failed');
        const completeOut = (await completeRes.json().catch(() => null)) as { passed?: boolean; recorded?: boolean } | null;
        if (completeOut && completeOut.passed === false) throw new Error('not-passed');
        const recorded = Boolean(completeOut?.recorded);

        const { error } = await supabase
          .from('user_progress')
          .upsert(
            {
              user_id: user.id,
              content_type: 'academy',
              content_slug: key,
              completed: true,
              last_visited_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,content_type,content_slug' },
          );
        if (error) throw error;

        // Best-effort XP award. The server decides the amount from the lesson itself and
        // pays each lesson once, so the client cannot farm XP. Failure never blocks completion.
        if (xp && xp > 0) {
          try {
            const res = await fetch('/api/academy/award-xp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ track, lessonSlug }),
            });
            const out = (await res.json().catch(() => null)) as { awarded?: number } | null;
            if (res.ok && out && typeof out.awarded === 'number' && out.awarded > 0) {
              setXpAwarded(out.awarded);
            }
          } catch {
            /* XP is best-effort */
          }
        }

        window.dispatchEvent(
          new CustomEvent<AcademyCompletedDetail>(ACADEMY_COMPLETED_EVENT, { detail: { track, lessonSlug, recorded } }),
        );
      } catch {
        setCompleted(false);
        setAnimating(false);
        toast.show('Couldn’t mark complete — try again');
        return;
      }
    } else if (authed === false) {
      try {
        const raw = localStorage.getItem('r2bot_lessons_completed');
        const list: string[] = raw ? JSON.parse(raw) : [];
        if (!list.includes(key)) {
          localStorage.setItem('r2bot_lessons_completed', JSON.stringify([...list, key]));
        }
      } catch {
        /* noop */
      }
      if (xp && xp > 0) setXpAwarded(xp);
    }
    setAnimating(false);
    setShowModal(true);
  };

  return (
    <>
      {completed ? (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 999,
            background: 'rgba(34,197,94,.14)',
            border: '1px solid rgba(34,197,94,.5)',
            color: 'var(--green)',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <span aria-hidden="true">✓</span>
          {animating ? 'Saved!' : 'Completed'}
        </div>
      ) : (
        <button
          onClick={onClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 999,
            background: 'var(--cyan)',
            color: '#001318',
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
            transition: 'all .2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--cyan-bright)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--cyan)';
          }}
        >
          Mark complete
        </button>
      )}

      <LessonCompleteModal
        open={showModal}
        lessonTitle={lessonTitle}
        xp={xpAwarded}
        nextHref={nextHref}
        track={track}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
