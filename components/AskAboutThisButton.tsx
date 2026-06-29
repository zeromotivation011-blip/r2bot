'use client';
import { useCopilot } from './CopilotProvider';

export function AskAboutThisButton({ topic }: { topic: string }) {
  const { openWith } = useCopilot();
  return (
    <button
      onClick={() => openWith(`Tell me more about ${topic}`)}
      className="btn btn-primary"
      style={{ padding: '12px 22px' }}
    >
      Ask R2 about {topic} →
    </button>
  );
}
