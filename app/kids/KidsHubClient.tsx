'use client'

// app/kids/KidsHubClient.tsx
// The interactive hero of the R2BOT Universe home: the Universe map, the
// explorer card and the "continue your mission" card, sharing one live view of
// the progress store. It server-renders the map with every planet and game link
// in place and same-size skeletons for the two cards, then fills in the
// child's own numbers after hydration — no layout shift, no spinner.
//
// The first-visit setup (band, explorer name, avatar) never opens by itself:
// it starts when the child taps "Start exploring" or their avatar.

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { UniverseMapClient } from '@/components/kids/universe/UniverseMapClient'
import { ExplorerCardClient } from '@/components/kids/universe/ExplorerCardClient'
import { ContinueCardClient, type SessionTitles } from '@/components/kids/universe/ContinueCardClient'
import { MissionStripClient } from '@/components/kids/universe/MissionStripClient'
import { readOnboarded, useKidsProgress } from '@/components/kids/universe/universe-state'

const OnboardingDialog = dynamic(
  () => import('@/components/kids/universe/OnboardingDialogClient').then((m) => m.OnboardingDialogClient),
  { ssr: false },
)

export interface KidsHubProps {
  sessionTitles: SessionTitles
  /** Levels whose sessions are written in full (computed on the server). */
  playableLevels: readonly number[]
}

export function KidsHubClient({ sessionTitles, playableLevels }: KidsHubProps) {
  const progress = useKidsProgress()
  const [onboarded, setOnboarded] = useState(false)
  const [dialog, setDialog] = useState<'setup' | 'edit' | null>(null)

  useEffect(() => {
    setOnboarded(readOnboarded())
  }, [])

  return (
    <>
      {/* Phone: mission strip, map, explorer, continue. Desktop: map over continue, explorer beside both. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <MissionStripClient
          progress={progress}
          onboarded={onboarded}
          titles={sessionTitles}
          playable={playableLevels}
          onStart={() => setDialog('setup')}
        />
        <div className="lg:col-start-1 lg:row-start-1">
          <UniverseMapClient progress={progress} />
        </div>
        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <ExplorerCardClient
            progress={progress}
            onboarded={onboarded}
            onStart={() => setDialog('setup')}
            onEdit={() => setDialog('edit')}
          />
        </div>
        <div className="lg:col-start-1 lg:row-start-2">
          <ContinueCardClient progress={progress} titles={sessionTitles} playable={playableLevels} />
        </div>
      </div>
      {dialog && progress && (
        <OnboardingDialog
          progress={progress}
          mode={dialog}
          onClose={() => {
            setDialog(null)
            setOnboarded(true)
          }}
        />
      )}
    </>
  )
}
