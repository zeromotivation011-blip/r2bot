'use client';

import { useState } from 'react';

export function CopyButtonClient({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      onClick={handle}
      style={{
        alignSelf: 'flex-start',
        padding: '5px 10px',
        borderRadius: 6,
        border: '1px solid var(--border-2)',
        background: copied ? 'rgba(34,197,94,.15)' : 'rgba(11,37,64,.5)',
        color: copied ? '#22c55e' : '#C8D0DC',
        fontSize: 12,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {copied ? '✓ Copied' : '📋 Copy code'}
    </button>
  );
}
