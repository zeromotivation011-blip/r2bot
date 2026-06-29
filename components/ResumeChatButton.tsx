'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const RESUME_KEY = 'r2bot_copilot_resume';

export function ResumeChatButton({ sessionId }: { sessionId: string }) {
  const [busy, setBusy] = useState(false);

  const handleResume = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('copilot_sessions')
        .select('messages')
        .eq('id', sessionId)
        .maybeSingle();
      if (error || !data) {
        setBusy(false);
        return;
      }
      try {
        sessionStorage.setItem(RESUME_KEY, JSON.stringify(data.messages ?? []));
      } catch {
        /* quota — fall through */
      }
      window.location.href = '/?copilot=open';
    } catch {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleResume}
      disabled={busy}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        color: 'var(--cyan)',
        fontSize: 13,
        cursor: busy ? 'wait' : 'pointer',
        fontFamily: 'inherit',
        textDecoration: 'underline',
        textUnderlineOffset: 3,
        textDecorationColor: 'rgba(0,229,255,.4)',
      }}
    >
      {busy ? 'Loading…' : 'Resume →'}
    </button>
  );
}
