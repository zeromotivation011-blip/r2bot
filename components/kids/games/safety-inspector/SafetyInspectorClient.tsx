'use client'

// components/kids/games/safety-inspector/SafetyInspectorClient.tsx
// The page's client island: the shared GameShell around Robot Safety Inspector.
// The game itself loads with next/dynamic so the page's server HTML stays
// light; the skeleton has the same footprint as the game.

import dynamic from 'next/dynamic'
import { GameShell } from '@/components/kids/ui/GameShellClient'
import { getGame } from '@/lib/kids/universe/worlds'

function Skeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_380px]" aria-busy="true" aria-label="Loading Robot Safety Inspector">
      <div className="flex flex-col gap-2">
        <div className="aspect-[10/7] w-full animate-pulse rounded-[20px] border border-white/10 bg-gradient-to-br from-emerald-900/50 via-[#111C32] to-teal-950" />
        <div className="hidden grid-cols-2 gap-1.5 sm:grid sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[46px] animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
      <div className="min-h-[320px] animate-pulse rounded-[20px] border border-white/10 bg-white/5" />
    </div>
  )
}

const SafetyInspectorGame = dynamic(() => import('./SafetyInspectorGameClient'), { ssr: false, loading: Skeleton })

const HOW_TO_PLAY = (
  <>
    <p>
      You are a <b>Robot Safety Inspector</b>. Tap (or Tab + Enter) each thing in the scene, read what you see, and decide: <b>hazard</b> or <b>safe</b>?
    </p>
    <ul className="list-disc space-y-1 pl-5">
      <li>
        <b>Cadet:</b> a factory. Find the dangers to people’s bodies and pick the fix. Stuck? Press Hint.
      </li>
      <li>
        <b>Pilot:</b> a smart home. Name each hazard with the six-question Harm Check: Body, Data, Fairness, Control, People, Planet.
      </li>
      <li>
        <b>Ace:</b> a robot street. Fixes cost coins and some create NEW hazards. Get every question’s risk to 9 or less within 15 coins.
      </li>
      <li>
        <b>Legend:</b> a hospital robot’s full safety case: rate each risk (likelihood × severity), mitigate, set a safe top speed, then defend it to the board.
      </li>
    </ul>
    <p>Then press Run: watch each moment with and without your fixes, and a simulated year of incidents. Same choices always give the same year.</p>
  </>
)

export default function SafetyInspectorClient() {
  const game = getGame('safety-inspector')
  if (!game) return null
  return (
    <GameShell
      game={game}
      howToPlay={HOW_TO_PLAY}
      lesson="Ask six questions of every robot — Body, Data, Fairness, Control, People, Planet. Risk is likelihood × severity; a good fix removes the danger itself, and must not create a new one."
    >
      {({ tier, round, finish }) => <SafetyInspectorGame key={`${tier}-${round}`} tier={tier} onFinish={finish} />}
    </GameShell>
  )
}
