'use client';

import dynamic from 'next/dynamic';
import { WhenVisible } from './WhenVisible';

const VIEWER_HEIGHT = 540;

/**
 * Shared by `dynamic()`'s loading state and the WhenVisible placeholder, so the
 * reserved box is identical either way and the real scene swaps in without a
 * layout shift.
 */
function ViewerSkeleton() {
  return (
    <div
      style={{
        height: VIEWER_HEIGHT,
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
  );
}

const URDFViewer = dynamic(
  () => import('./URDFViewer').then((m) => m.URDFViewer),
  {
    ssr: false,
    loading: () => <ViewerSkeleton />,
  },
);

export function URDFViewerWrapper() {
  // Three.js + urdf-loader is heavy, and `dynamic()` fetches it on mount — which
  // on the Visualizer hub is page load, for a scene far below the fold.
  return (
    <WhenVisible height={VIEWER_HEIGHT} placeholder={<ViewerSkeleton />}>
      <URDFViewer />
    </WhenVisible>
  );
}
