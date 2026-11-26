'use client'

// components/kids/games/robot-city/RobotCityClient.tsx
// The page's client island: the shared GameShell around Robot City. The game
// loads with next/dynamic so the server HTML stays light; the skeleton has the
// game's footprint so nothing jumps when it arrives.

import dynamic from 'next/dynamic'
import { GameShell } from '@/components/kids/ui/GameShellClient'
import { getGame } from '@/lib/kids/universe/worlds'

function Skeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]" aria-busy="true" aria-label="Loading Robot City">
      <div className="flex flex-col gap-2">
        <div className="aspect-[13/9] w-full animate-pulse rounded-[28px] border border-white/10 bg-gradient-to-b from-sky-900/40 via-[#19263F] to-[#0A1120] motion-reduce:animate-none" />
        <div className="h-11 animate-pulse rounded-2xl bg-white/5 motion-reduce:animate-none" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-32 animate-pulse rounded-[20px] bg-white/5 motion-reduce:animate-none" />
        <div className="h-24 animate-pulse rounded-[20px] bg-white/5 motion-reduce:animate-none" />
        <div className="h-32 animate-pulse rounded-[20px] bg-white/5 motion-reduce:animate-none" />
      </div>
    </div>
  )
}

const RobotCityGame = dynamic(() => import('./RobotCityGameClient'), { ssr: false, loading: Skeleton })

const HOW_TO_PLAY = (
  <>
    <p>Welcome to Robot City. Every tier hands you a different city robot — and a real model of how it moves, stops and decides.</p>
    <ul className="list-disc space-y-1 pl-5">
      <li>
        <b>Cadet — Crossing Patrol:</b> a delivery robot waits at each kerb. Tap <b>Cross now</b> (or Space) only when no car’s orange stopping zone reaches the
        crossing, and wait for 🚶 at the traffic lights.
      </li>
      <li>
        <b>Pilot — Safe Speed:</b> set a self-driving car’s cruise speed and following gap, then watch it drive itself past a sudden stop and through fog. Beat the
        time limit and keep the lane flowing without ever bumping.
      </li>
      <li>
        <b>Ace — Junction Timer:</b> set the green times at a busy crossroads with human and robot drivers. Get the average wait down without making anyone wait
        too long.
      </li>
      <li>
        <b>Legend — Rulebook:</b> write IF … THEN rules for a robotaxi, put them in the right order, and pass all six safety tests: a ball and a child, an
        ambulance, sun glare, a plastic bag, road works and a normal trip. For 3 stars your rules must also survive a hidden stress test where the car reacts
        more slowly — test as often as you like.
      </li>
    </ul>
    <p>After each round, “Why it happened” explains your result from the numbers. Same choices, same result: it is fair and repeatable.</p>
  </>
)

export default function RobotCityClient() {
  const game = getGame('robot-city')
  if (!game) return null
  return (
    <GameShell
      game={game}
      howToPlay={HOW_TO_PLAY}
      lesson="A car needs a stopping distance that grows with speed squared, so safe robots keep gaps they can stop in, slow down when they cannot see far, share junctions by timing, and stop to ask a person when they do not understand."
    >
      {({ tier, round, finish }) => <RobotCityGame key={`${tier}-${round}`} tier={tier} onFinish={finish} />}
    </GameShell>
  )
}
