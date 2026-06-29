'use client';

import dynamic from 'next/dynamic';

const WorkspaceIDE = dynamic(() => import('./WorkspaceIDE').then((m) => m.WorkspaceIDE), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0f1e',
        color: '#94A3B8',
        fontFamily: 'var(--font-mono), monospace',
      }}
    >
      Booting workspace…
    </div>
  ),
});

export function WorkspaceIDEClient() {
  return <WorkspaceIDE />;
}
