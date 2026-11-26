'use client'

// components/kids/games/smart-farm/SmartFarmClient.tsx
// The page's client island: the shared GameShell around Smart Farm. The game
// itself loads with next/dynamic so the server HTML stays light; the skeleton
// has the game's footprint so nothing jumps when it arrives.

import dynamic from 'next/dynamic'
import { GameShell } from '@/components/kids/ui/GameShellClient'
import { getGame } from '@/lib/kids/universe/worlds'

function Skeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]" aria-busy="true" aria-label="Loading Smart Farm">
      <div className="flex flex-col gap-3">
        <div className="h-[460px] animate-pulse rounded-[28px] border border-white/10 bg-gradient-to-b from-lime-900/50 via-[#213b17] to-[#0A1120] sm:h-[520px]" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-64 animate-pulse rounded-[20px] bg-white/5" />
        <div className="h-28 animate-pulse rounded-[20px] bg-white/5" />
      </div>
    </div>
  )
}

const SmartFarmGame = dynamic(() => import('./SmartFarmGameClient'), { ssr: false, loading: Skeleton })

const HOW_TO_PLAY = (
  <>
    <p>You run a small farm with robots. Every tier gives you a different machine to program — and a real farm model decides what happens.</p>
    <ul className="list-disc space-y-1 pl-5">
      <li>
        <b>Cadet:</b> every plant has a soil sensor. Tap the plants whose sensor is below the orange line, then send the watering robot. Three days.
      </li>
      <li>
        <b>Pilot:</b> place three soil sensors and choose when the valves open. Then plan a drone&apos;s lawnmower path to find sick plants on its NDVI map.
      </li>
      <li>
        <b>Ace:</b> program a tomato-picking robot: a redness threshold, an “unsure” band and white balance. Sunset light and shade will try to fool it.
      </li>
      <li>
        <b>Legend:</b> plan a whole 40-day season. Storms, heatwaves, aphids and a broken sensor are coming. Meet four goals at once, then explain what happened.
      </li>
    </ul>
    <p>Use touch, a mouse or the keyboard (Tab, arrows, Enter). Same choices, same season: results are fair and repeatable.</p>
  </>
)

export default function SmartFarmClient() {
  const game = getGame('smart-farm')
  if (!game) return null
  return (
    <GameShell
      game={game}
      howToPlay={HOW_TO_PLAY}
      lesson="Farm robots decide from measurements, not guesses: soil sensors say when to water, NDVI from a drone shows sick plants before our eyes can, and vision robots must correct for the colour of the light."
    >
      {({ tier, round, finish }) => <SmartFarmGame key={`${tier}-${round}`} tier={tier} onFinish={finish} />}
    </GameShell>
  )
}
