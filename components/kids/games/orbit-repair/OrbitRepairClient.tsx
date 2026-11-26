'use client'

// components/kids/games/orbit-repair/OrbitRepairClient.tsx
// The page's client island: the shared GameShell around Orbit Repair Crew.
// The game (canvas, physics, controls) loads with next/dynamic so the page's
// server HTML stays light; the skeleton has the same footprint as the game.

import dynamic from 'next/dynamic'
import { GameShell } from '@/components/kids/ui/GameShellClient'
import { getGame } from '@/lib/kids/universe/worlds'

function Skeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]" aria-busy="true" aria-label="Loading Orbit Repair Crew">
      <div className="flex flex-col gap-2">
        <div className="h-[330px] animate-pulse rounded-3xl border border-white/10 bg-gradient-to-b from-[#03060d] via-[#0A1120] to-sky-900/60 sm:h-[420px] lg:h-[470px]" />
        <div className="h-5 w-2/3 animate-pulse rounded bg-white/5" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-40 animate-pulse rounded-[20px] bg-white/5" />
        <div className="h-48 animate-pulse rounded-[20px] bg-white/5" />
      </div>
    </div>
  )
}

const OrbitRepairGame = dynamic(() => import('./OrbitRepairGameClient'), { ssr: false, loading: Skeleton })

const HOW_TO_PLAY = (
  <>
    <p>
      You are the <b>robotics crew</b> of a space station. Everything floats, nothing rubs on a floor, and outside there is no air: a push starts something moving and it
      keeps moving until another push stops it.
    </p>
    <ul className="list-disc space-y-1 pl-5">
      <li>
        <b>Cadet:</b> fly a helper robot round the module with tiny thruster puffs (tap the arrows). Collect two items, then stop on the charger.
      </li>
      <li>
        <b>Pilot:</b> drive the station’s robot arm (hold the arrows). Match the drifting cargo ship’s speed, then grab its pin.
      </li>
      <li>
        <b>Ace:</b> swap a satellite’s broken module in the right order — and move slowly, because the arm twists the whole spacecraft.
      </li>
      <li>
        <b>Legend:</b> a full servicing mission flown from the ground, with signal delay, a fuel budget and a tumbling satellite.
      </li>
    </ul>
    <p>Keyboard: arrows or WASD, Space to grab, F for fine mode, X to sync, P for the predictor. Every result comes with a “why it happened”.</p>
  </>
)

export default function OrbitRepairClient() {
  const game = getGame('orbit-repair')
  if (!game) return null
  return (
    <GameShell
      game={game}
      howToPlay={HOW_TO_PLAY}
      lesson="In space nothing slows you down: a push keeps you moving until an opposite push stops you. Match speeds before you grab, and every push has an equal push back."
    >
      {({ tier, round, finish }) => <OrbitRepairGame key={`${tier}-${round}`} tier={tier} onFinish={finish} />}
    </GameShell>
  )
}
