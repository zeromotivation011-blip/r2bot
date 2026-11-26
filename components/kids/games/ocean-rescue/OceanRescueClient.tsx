'use client'

// components/kids/games/ocean-rescue/OceanRescueClient.tsx
// The page's client island: the shared GameShell around Deep Sea Rescue. The
// game itself loads with next/dynamic so the server HTML stays light; the
// skeleton has the game's footprint so nothing jumps when it arrives.

import dynamic from 'next/dynamic'
import { GameShell } from '@/components/kids/ui/GameShellClient'
import { getGame } from '@/lib/kids/universe/worlds'

function Skeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]" aria-busy="true" aria-label="Loading Deep Sea Rescue">
      <div className="flex flex-col gap-2">
        <div className="h-[360px] animate-pulse rounded-[28px] border border-white/10 bg-gradient-to-b from-cyan-900/60 via-[#0b2a3a] to-[#0A1120] sm:h-[440px] lg:h-[500px]" />
        <div className="h-[200px] animate-pulse rounded-[20px] border border-white/10 bg-[#111C32] sm:h-[150px]" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-40 animate-pulse rounded-[20px] bg-white/5" />
        <div className="h-28 animate-pulse rounded-[20px] bg-white/5" />
        <div className="h-28 animate-pulse rounded-[20px] bg-white/5" />
      </div>
    </div>
  )
}

const OceanRescueGame = dynamic(() => import('./OceanRescueGameClient'), { ssr: false, loading: Skeleton })

const HOW_TO_PLAY = (
  <>
    <p>
      A sensor buoy has sunk into the dark. You are the robot crew on the research ship — and every tier needs a different kind of underwater robot.
    </p>
    <ul className="list-disc space-y-1 pl-5">
      <li>
        <b>Cadet:</b> fly a tethered robot with the arrows (or WASD). Press <b>PING</b> (Space): the echo shows which way and how far. Hold still next to the
        buoy to grab it, then bring it up to the ship.
      </li>
      <li>
        <b>Pilot:</b> balance the robot first (ballast water in or out) so it neither sinks nor floats. Cross a current, find the buoy with distance-only
        sonar circles, and pump ballast out to carry its weight home.
      </li>
      <li>
        <b>Ace:</b> no cable, no radio. Program an autonomous robot (AUV): waypoints, height, speed and sonar rules. Launch it and watch it search alone.
      </li>
      <li>
        <b>Legend:</b> map a whole reef with a sonar fan before the battery or the clock runs out.
      </li>
    </ul>
    <p>After every dive the debrief explains why it happened. Same plan, same sea: results are fair and repeatable.</p>
  </>
)

export default function OceanRescueClient() {
  const game = getGame('ocean-rescue')
  if (!game) return null
  return (
    <GameShell
      game={game}
      howToPlay={HOW_TO_PLAY}
      lesson="Underwater robots balance buoyancy against weight, find things with sound (about 1,500 m/s in seawater), and navigate without GPS by dead reckoning and bottom-tracking sonar."
    >
      {({ tier, round, finish }) => <OceanRescueGame key={`${tier}-${round}`} tier={tier} onFinish={finish} />}
    </GameShell>
  )
}
