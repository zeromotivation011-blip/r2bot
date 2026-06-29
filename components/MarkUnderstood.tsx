'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useToast } from './Toast';

const LS_KEY = 'r2bot_understood';

type Kind = 'atlas' | 'academy';

function readLocal(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(slugs: string[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(slugs));
  } catch {
    /* localStorage blocked */
  }
}

export function MarkUnderstood({
  contentType,
  contentSlug,
}: {
  contentType: Kind;
  contentSlug: string;
}) {
  const [understood, setUnderstood] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const key = `${contentType}/${contentSlug}`;
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
            .select('understood')
            .eq('user_id', user.id)
            .eq('content_type', contentType)
            .eq('content_slug', contentSlug)
            .maybeSingle();
          setUnderstood(!!data?.understood);
        } else {
          setAuthed(false);
          setUnderstood(readLocal().includes(key));
        }
      } catch {
        setAuthed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contentType, contentSlug, key]);

  const toggle = async () => {
    const next = !understood;
    setUnderstood(next);
    if (authed) {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('unauth');
        const { error } = await supabase
          .from('user_progress')
          .upsert(
            {
              user_id: user.id,
              content_type: contentType,
              content_slug: contentSlug,
              understood: next,
            },
            { onConflict: 'user_id,content_type,content_slug' },
          );
        if (error) throw error;
        toast.show(next ? 'Marked as understood' : 'Unmarked');
      } catch {
        setUnderstood(!next);
        toast.show('Couldn’t update — try again');
      }
    } else if (authed === false) {
      const local = readLocal();
      writeLocal(next ? [...local.filter((s) => s !== key), key] : local.filter((s) => s !== key));
      toast.show(next ? 'Marked as understood' : 'Unmarked');
    }
  };

  return (
    <button
      onClick={toggle}
      aria-pressed={understood}
      title={authed === false ? 'Sign in to sync your progress across devices' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderRadius: 999,
        border: '1px solid ' + (understood ? 'rgba(34,197,94,.5)' : 'var(--border)'),
        background: understood ? 'rgba(34,197,94,.10)' : 'rgba(11,37,64,.4)',
        color: understood ? 'var(--green)' : '#C8D0DC',
        fontSize: 13,
        fontFamily: 'inherit',
        cursor: 'pointer',
        transition: 'all .2s',
      }}
    >
      <span aria-hidden="true">{understood ? '✓' : '○'}</span>
      {understood ? 'Understood' : 'Mark as understood'}
    </button>
  );
}
