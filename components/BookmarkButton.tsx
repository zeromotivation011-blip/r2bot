'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useToast } from './Toast';

type Kind = 'atlas' | 'academy' | 'pulse';

const LS_KEY = 'r2bot_bookmarks';

type LocalEntry = { contentType: Kind; contentSlug: string; contentTitle: string };

function readLocal(): LocalEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as LocalEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(items: LocalEntry[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch {
    /* localStorage blocked */
  }
}

export function BookmarkButton({
  contentType,
  contentSlug,
  contentTitle,
}: {
  contentType: Kind;
  contentSlug: string;
  contentTitle: string;
}) {
  const [saved, setSaved] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
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
            .from('bookmarks')
            .select('content_slug')
            .eq('user_id', user.id)
            .eq('content_type', contentType)
            .eq('content_slug', contentSlug)
            .maybeSingle();
          setSaved(!!data);
        } else {
          setAuthed(false);
          setSaved(readLocal().some((b) => b.contentType === contentType && b.contentSlug === contentSlug));
        }
      } catch {
        setAuthed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contentType, contentSlug]);

  const toggle = async () => {
    const next = !saved;
    setSaved(next);
    if (authed) {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('unauth');
        if (next) {
          const { error } = await supabase
            .from('bookmarks')
            .upsert(
              {
                user_id: user.id,
                content_type: contentType,
                content_slug: contentSlug,
                content_title: contentTitle,
              },
              { onConflict: 'user_id,content_type,content_slug' },
            );
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('bookmarks')
            .delete()
            .eq('user_id', user.id)
            .eq('content_type', contentType)
            .eq('content_slug', contentSlug);
          if (error) throw error;
        }
        toast.show(next ? 'Saved to your library' : 'Removed from library');
      } catch {
        setSaved(!next);
        toast.show('Couldn’t save — try again');
      }
    } else if (authed === false) {
      const list = readLocal();
      const filtered = list.filter((b) => !(b.contentType === contentType && b.contentSlug === contentSlug));
      writeLocal(next ? [{ contentType, contentSlug, contentTitle }, ...filtered] : filtered);
      toast.show(next ? 'Saved to your library' : 'Removed from library');
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={saved ? 'Remove from library' : 'Save to library'}
      aria-pressed={saved}
      title={authed === false ? 'Sign in to sync your bookmarks across devices' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 999,
        border: 'none',
        background: 'transparent',
        color: saved ? 'var(--cyan-bright)' : 'var(--muted)',
        fontSize: 16,
        fontFamily: 'inherit',
        cursor: 'pointer',
        transition: 'color .15s',
      }}
      onMouseEnter={(e) => {
        if (!saved) e.currentTarget.style.color = '#C8D0DC';
      }}
      onMouseLeave={(e) => {
        if (!saved) e.currentTarget.style.color = 'var(--muted)';
      }}
    >
      <span aria-hidden="true">{saved ? '★' : '☆'}</span>
      <span style={{ fontSize: 13 }}>{saved ? 'Saved' : 'Save'}</span>
    </button>
  );
}
