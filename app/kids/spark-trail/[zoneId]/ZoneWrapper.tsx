'use client'

import dynamic from 'next/dynamic'

const ZoneClient = dynamic(() => import('./ZoneClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
})

export default function ZoneWrapper() {
  return <ZoneClient />
}
