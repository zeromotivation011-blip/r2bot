'use client'

// components/kids/games/robot-brain/RobotBrainClient.tsx
// The page's client island: the shared GameShell around Train the Robot Brain.
// The game itself loads with next/dynamic (ssr: false) behind a same-size skeleton.

import dynamic from 'next/dynamic'
import { GameShell } from '@/components/kids/ui/GameShellClient'
import { getGame } from '@/lib/kids/universe/worlds'

function Skeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_370px]" aria-busy="true" aria-label="Loading the AI Academy">
      <div className="flex flex-col gap-3">
        <div className="h-[76px] animate-pulse rounded-[20px] bg-white/5" />
        <div className="h-[250px] animate-pulse rounded-[20px] border border-white/10 bg-gradient-to-b from-[#111c32] to-[#0a1120] sm:h-[300px]" />
        <div className="h-[44px] animate-pulse rounded-2xl bg-white/5" />
        <div className="grid gap-3 sm:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
          <div className="aspect-square animate-pulse rounded-[20px] bg-white/10" />
          <div className="h-[220px] animate-pulse rounded-[20px] bg-white/5" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-64 animate-pulse rounded-[20px] bg-white/5" />
        <div className="h-28 animate-pulse rounded-[20px] bg-white/5" />
      </div>
    </div>
  )
}

const RobotBrainGame = dynamic(() => import('./RobotBrainGameClient'), { ssr: false, loading: Skeleton })

const HOW_TO_PLAY = (
  <>
    <p>
      Sorta the sorter robot routes parcels by the symbol drawn on their label — but its brain is empty. <b>You</b> teach it, with examples.
    </p>
    <ul className="list-disc space-y-1 pl-5">
      <li>Pick a label (← → ○ △ ✕), draw it on the pad with your finger or mouse, and press <b>Add</b>. Sorta guesses live while you draw.</li>
      <li>
        <b>Run the sorter</b>: test parcels drawn by other people ride the belt. Sorta can only use what you taught it.
      </li>
      <li>
        <b>Cadet:</b> ← and →. <b>Pilot:</b> four labels and strangers’ hurried drawings. <b>Ace:</b> an intern’s messy data — read the confusion matrix and fix it.{' '}
        <b>Legend:</b> choose k and raw pixels vs features, check on a validation set, then pass a one-shot exam.
      </li>
    </ul>
    <p>✨ Sample draws a neat example for you (handy if drawing is hard right now); a round taught with samples earns at most 2 stars.</p>
    <p>Keyboard: Tab to the pad controls; number keys pick a label, S adds a sample drawing, Enter adds it, C clears.</p>
  </>
)

export default function RobotBrainClient() {
  const game = getGame('robot-brain')
  if (!game) return null
  return (
    <GameShell
      game={game}
      howToPlay={HOW_TO_PLAY}
      lesson="A machine-learning model is only as good as its data: enough examples of every label, correct labels, and variety like the real world. k-nearest-neighbours decides by letting the k most similar examples vote."
    >
      {({ tier, round, finish }) => <RobotBrainGame key={`${tier}-${round}`} tier={tier} onFinish={finish} />}
    </GameShell>
  )
}
