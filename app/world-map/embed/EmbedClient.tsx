'use client'

import dynamic from 'next/dynamic'

const EmbedMap = dynamic(() => import('./EmbedMap'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
})

export default function EmbedClient() {
  return <EmbedMap />
}
