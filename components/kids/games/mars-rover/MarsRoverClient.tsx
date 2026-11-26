'use client'

// components/kids/games/mars-rover/MarsRoverClient.tsx
// The page's client island: the shared GameShell around Mars Rover Command.
// The game (canvas, simulation, controls) loads with next/dynamic so the
// page's server HTML stays light; the skeleton has the same footprint.

import dynamic from 'next/dynamic'
import { GameShell } from '@/components/kids/ui/GameShellClient'
import { getGame } from '@/lib/kids/universe/worlds'

function Skeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_380px]" aria-busy="true" aria-label="Loading Mars Rover Command">
      <div className="flex flex-col gap-2">
        <div className="aspect-[14/11] animate-pulse rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 via-orange-950/70 to-orange-800/50" />
        <div className="h-[60px] animate-pulse rounded-2xl bg-white/5" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-40 animate-pulse rounded-[20px] bg-white/5" />
        <div className="h-72 animate-pulse rounded-[20px] bg-white/5" />
      </div>
    </div>
  )
}

const MarsRoverGame = dynamic(() => import('./MarsRoverGameClient'), { ssr: false, loading: Skeleton })

const HOW_TO_PLAY = (
  <>
    <p>
      You are the <b>rover team on Earth</b>. Your rover is on Mars, and radio signals take minutes to get there and back. Nothing you see is live:
      every picture and report is already old when it arrives.
    </p>
    <ul className="list-disc space-y-1 pl-5">
      <li>
        <b>Build a plan:</b> Drive, Turn and Science buttons (or ↑ ← → and S). The orange line shows where you expect the rover to go.
      </li>
      <li>
        <b>Send it:</b> watch the orange radio pulse fly to Mars. Then wait for news — the blue pulse brings it back.
      </li>
      <li>
        <b>Cadet:</b> short delay; reach target ① and run Science. <b>Pilot:</b> long delay, rocks, slopes and dunes — plan it all in one go.
      </li>
      <li>
        <b>Ace:</b> slippery sand and rocks the orbiter cannot see: switch on onboard rules. <b>Legend:</b> a whole Mars day with power, data limits and AutoNav.
      </li>
    </ul>
    <p>The clock pauses while you plan. The same plan on the same map always gives the same result.</p>
  </>
)

export default function MarsRoverClient() {
  const game = getGame('mars-rover')
  if (!game) return null
  return (
    <GameShell
      game={game}
      howToPlay={HOW_TO_PLAY}
      lesson="Signals to Mars take minutes, so you cannot steer a rover live. Rovers count wheel turns to know where they are (dead reckoning), but slipping wheels fool that count. Onboard rules and AutoNav let a rover deal with surprises itself."
    >
      {({ tier, round, finish }) => <MarsRoverGame key={`${tier}-${round}`} tier={tier} onFinish={finish} />}
    </GameShell>
  )
}
