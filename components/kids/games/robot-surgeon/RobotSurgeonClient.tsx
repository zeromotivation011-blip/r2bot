'use client'

// components/kids/games/robot-surgeon/RobotSurgeonClient.tsx
// The page's client island: the shared GameShell around Robot Hospital. The
// game loads with next/dynamic so the server HTML stays light; the skeleton
// has the game's footprint so nothing jumps when it arrives.

import dynamic from 'next/dynamic'
import { GameShell } from '@/components/kids/ui/GameShellClient'
import { getGame } from '@/lib/kids/universe/worlds'

function Skeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]" aria-busy="true" aria-label="Loading Robot Hospital">
      <div className="flex flex-col gap-2">
        <div className="aspect-[13/9] w-full animate-pulse rounded-[28px] border border-white/10 bg-gradient-to-b from-rose-900/40 via-[#19263F] to-[#0A1120] motion-reduce:animate-none" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-24 animate-pulse rounded-[20px] bg-white/5 motion-reduce:animate-none" />
        <div className="h-48 animate-pulse rounded-[20px] bg-white/5 motion-reduce:animate-none" />
        <div className="h-24 animate-pulse rounded-[20px] bg-white/5 motion-reduce:animate-none" />
      </div>
    </div>
  )
}

const RobotSurgeonGame = dynamic(() => import('./RobotSurgeonGameClient'), { ssr: false, loading: Skeleton })

const HOW_TO_PLAY = (
  <>
    <p>Welcome to the Robot Hospital. Every tier puts you in charge of a different medical robot — and every robot keeps people safe in its own way.</p>
    <ul className="list-disc space-y-1 pl-5">
      <li>
        <b>Cadet — Medicine Run:</b> drive the delivery robot (arrow pad, arrows or WASD) to the three coloured ward doors and back to its charger. Switch to
        🐢 careful speed (Space) near people.
      </li>
      <li>
        <b>Pilot — Steady Hands:</b> you are at a surgeon’s console. Drag on the hand pad to guide the tool tip along the channel. Pick the motion scaling and
        the tremor filter first, and compare.
      </li>
      <li>
        <b>Ace — Bionic Hand:</b> tune how a robotic hand reads muscle signals: a pinch line, a power line, hysteresis and smoothing. Try squeezing, then run
        the morning test.
      </li>
      <li>
        <b>Legend — Remote Assist:</b> arm the robot with a safety checklist, choose its force limit, then mark four targets with a gentle touch — through a
        0.4 s delay.
      </li>
    </ul>
    <p>After each round, “Why it happened” explains your result from the numbers. Same moves, same result: it is fair and repeatable.</p>
  </>
)

export default function RobotSurgeonClient() {
  const game = getGame('robot-surgeon')
  if (!game) return null
  return (
    <GameShell
      game={game}
      howToPlay={HOW_TO_PLAY}
      lesson="Medical robots keep a person in control and add safety: motion scaling and tremor filters make moves precise, thresholds turn muscle signals into grips, and limits, interlocks and checklists stop harm."
    >
      {({ tier, round, finish }) => <RobotSurgeonGame key={`${tier}-${round}`} tier={tier} onFinish={finish} />}
    </GameShell>
  )
}
