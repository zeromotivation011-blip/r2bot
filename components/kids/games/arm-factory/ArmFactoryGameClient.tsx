'use client'

// components/kids/games/arm-factory/ArmFactoryGameClient.tsx
// Arm Factory inside the shared Universe GameShell. The heavy three.js game
// loads only in the browser, behind a skeleton the same size as the game.

import dynamic from 'next/dynamic'
import { GameShell } from '@/components/kids/ui/GameShellClient'
import { getGame, type UniverseGame } from '@/lib/kids/universe/worlds'

function ArmFactorySkeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_400px]" aria-busy="true" aria-label="Loading the robot arm">
      <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-slate-950 lg:aspect-auto lg:h-[600px]">
        <p className="animate-pulse text-sm font-black text-amber-300/80">Powering up the arm…</p>
      </div>
      <div className="space-y-3">
        <div className="h-48 rounded-2xl border border-white/10 bg-slate-900/70" />
        <div className="h-14 rounded-2xl bg-amber-400/30" />
        <div className="h-40 rounded-2xl border border-white/10 bg-slate-900/70" />
      </div>
    </div>
  )
}

const ArmFactoryClient = dynamic(() => import('./ArmFactoryClient'), { ssr: false, loading: () => <ArmFactorySkeleton /> })

const HOW_TO_PLAY = (
  <>
    <p>
      You run a robot arm in a factory. Parts arrive on a conveyor belt; put each one in the bin with the <b>same colour and symbol</b> (● red, ▲
      blue, ■ yellow).
    </p>
    <ul className="list-disc space-y-1 pl-5">
      <li>
        <b>Cadet:</b> drag the Base, Shoulder and Elbow sliders (or Q/A, W/S, E/D). Get the white dot onto the part, wait for the green ring, close the
        gripper (Space), lift, turn, let go over the bin.
      </li>
      <li>
        <b>Pilot:</b> the belt moves. Save poses on the teach pendant, park the open gripper over the belt and grab as a part slides in.
      </li>
      <li>
        <b>Ace:</b> tap a spot and the arm solves its own joint angles. Pick elbow-up or elbow-down, add waypoints, and steer round the yellow pillar.
      </li>
      <li>
        <b>Legend:</b> write a looping program for 8 parts. Heavy parts (⚖) slip or overload the motor if you move too fast, but slowing every move makes the shift too slow: it must finish in 60 s.
      </li>
    </ul>
    <p>Use the Front / Top / Side buttons to look from another angle — Top view is great for aiming.</p>
  </>
)

export default function ArmFactoryGameClient() {
  const game = getGame('arm-factory') as UniverseGame
  return (
    <GameShell
      game={game}
      howToPlay={HOW_TO_PLAY}
      lesson="A robot arm is a chain of joints. Forward kinematics turns joint angles into a hand position; inverse kinematics works backwards from where the hand must go — often with more than one answer. Moving every joint at once makes the hand travel in a curve, and fast moves need more grip and more motor torque."
    >
      {({ tier, round, finish }) => <ArmFactoryClient key={`${tier}-${round}`} tier={tier} round={round} onFinish={finish} />}
    </GameShell>
  )
}
