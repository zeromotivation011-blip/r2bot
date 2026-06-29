'use client';

import { useState } from 'react';
import { useToast } from './Toast';

export function EmailDigestToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  const toggle = async () => {
    const next = !on;
    setOn(next);
    setPending(true);
    try {
      const res = await fetch('/api/dashboard/email-pref', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error('failed');
      toast.show(next ? 'Weekly digest turned on' : 'Weekly digest turned off');
    } catch {
      setOn(!next);
      toast.show('Couldn’t update — try again');
    } finally {
      setPending(false);
    }
  };

  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        borderRadius: 12,
        border: '1px solid ' + (on ? 'var(--cyan)' : 'var(--border)'),
        background: on ? 'rgba(0,184,212,.08)' : 'rgba(11,37,64,.4)',
        cursor: pending ? 'wait' : 'pointer',
        userSelect: 'none',
      }}
    >
      <input
        type="checkbox"
        checked={on}
        onChange={toggle}
        disabled={pending}
        style={{ width: 16, height: 16, accentColor: 'var(--cyan-bright)', cursor: 'inherit' }}
      />
      <span style={{ fontSize: 14, color: on ? 'var(--cyan-bright)' : '#C8D0DC' }}>
        Weekly digest email
      </span>
    </label>
  );
}
