'use client';

import dynamic from 'next/dynamic';

const URDFViewer = dynamic(
  () => import('./URDFViewer').then((m) => m.URDFViewer),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 540,
          borderRadius: 16,
          border: '1px solid var(--border-2)',
          background: '#0a0f1e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94A3B8',
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 13,
        }}
      >
        Loading 3D scene…
      </div>
    ),
  },
);

export function URDFViewerWrapper() {
  return <URDFViewer />;
}
