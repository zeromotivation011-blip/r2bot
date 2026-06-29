'use client';

import dynamic from 'next/dynamic';

const WorldMapClient = dynamic(() => import('./WorldMapClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Loading world robotics data…</p>
      </div>
    </div>
  ),
});

export default function WorldMapDynamic() {
  return <WorldMapClient />;
}
