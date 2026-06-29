'use client'

import dynamic from 'next/dynamic'

const SimulatorClient = dynamic(() => import('./SimulatorClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading simulator…</p>
      </div>
    </div>
  ),
})

export default function SimulatorWrapper() {
  return <SimulatorClient />
}
