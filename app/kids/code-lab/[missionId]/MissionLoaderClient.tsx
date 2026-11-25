'use client'

// Loads the mission editor + arena in the browser only, behind a skeleton
// with the same footprint so nothing shifts when it arrives.

import dynamic from 'next/dynamic'
import type { MissionPublic } from '@/lib/kids/code-lab/types'

function MissionSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10" aria-busy="true">
      <span className="sr-only">Loading the mission…</span>
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <div className="aspect-[4/3] w-full animate-pulse rounded-3xl bg-white/5" />
          <div className="mt-3 h-[52px] w-full rounded-2xl bg-white/5" />
          <div className="mt-3 h-[56px] w-full" />
        </div>
        <div>
          <div className="h-[110px] rounded-2xl bg-white/5" />
          <div className="mt-3 h-[60px] rounded-2xl bg-white/5" />
          <div className="mt-3 h-[220px] rounded-2xl bg-white/5" />
        </div>
      </div>
    </div>
  )
}

const MissionClient = dynamic(() => import('@/components/kids/codelab/MissionClient'), { ssr: false, loading: MissionSkeleton })

interface Props {
  mission: MissionPublic
  next: { id: string; title: string } | null
  previous: { id: string; title: string } | null
}

export default function MissionLoaderClient(props: Props) {
  return <MissionClient {...props} />
}
