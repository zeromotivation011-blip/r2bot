'use client';

import { useCopilot } from './CopilotProvider';

export function AskR2Inline({ topic, label }: { topic: string; label?: string }) {
  const { openWith } = useCopilot();
  return (
    <button
      onClick={() => openWith(`Explain ${topic} to me in simpler terms.`)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: '16px 24px',
        background: 'transparent',
        border: '1px solid var(--cyan)',
        borderRadius: 14,
        color: 'var(--cyan)',
        fontSize: 15,
        fontFamily: 'inherit',
        cursor: 'pointer',
        gap: 10,
        transition: 'all .2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(0,184,212,.08)';
        e.currentTarget.style.color = 'var(--cyan-bright)';
        e.currentTarget.style.borderColor = 'var(--cyan-bright)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--cyan)';
        e.currentTarget.style.borderColor = 'var(--cyan)';
      }}
    >
      <span aria-hidden="true">✦</span>
      {label ?? `Still confused? Ask R2 about ${topic} →`}
    </button>
  );
}

export function ConfusedButton({ lessonTitle }: { lessonTitle: string }) {
  const { openWith } = useCopilot();
  return (
    <button
      onClick={() =>
        openWith(`I just read the lesson "${lessonTitle}" and I have a question: `)
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 20px',
        background: 'transparent',
        border: '1px dashed var(--border-2)',
        borderRadius: 12,
        color: 'var(--cyan)',
        fontSize: 14,
        fontFamily: 'inherit',
        cursor: 'pointer',
        transition: 'all .2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--cyan)';
        e.currentTarget.style.borderStyle = 'solid';
        e.currentTarget.style.color = 'var(--cyan-bright)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-2)';
        e.currentTarget.style.borderStyle = 'dashed';
        e.currentTarget.style.color = 'var(--cyan)';
      }}
    >
      <span aria-hidden="true">?</span>
      Confused about something? Ask R2 →
    </button>
  );
}
