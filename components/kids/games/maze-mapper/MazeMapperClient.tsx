'use client'

// components/kids/games/maze-mapper/MazeMapperClient.tsx
// The page's client island: the shared GameShell around Maze Mapper. The game
// (canvas, simulation, controls) loads with next/dynamic so the page's server
// HTML stays light; the skeleton has the same footprint as the game.

import dynamic from 'next/dynamic'
import { GameShell } from '@/components/kids/ui/GameShellClient'
import { getGame } from '@/lib/kids/universe/worlds'

function Skeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]" aria-busy="true" aria-label="Loading The Labyrinth">
      <div className="flex flex-col gap-2">
        <div className="h-[58px] animate-pulse rounded-xl bg-white/5" />
        <div className="mx-auto aspect-[23/21] w-full max-w-[calc(66vh*1.1)] animate-pulse rounded-3xl border border-teal-300/20 bg-gradient-to-br from-slate-900 via-teal-950 to-slate-950" />
        <div className="h-12 animate-pulse rounded-2xl bg-white/5" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-36 animate-pulse rounded-[20px] bg-white/5" />
        <div className="h-44 animate-pulse rounded-[20px] bg-white/5" />
        <div className="h-24 animate-pulse rounded-[20px] bg-white/5" />
      </div>
    </div>
  )
}

const MazeMapperGame = dynamic(() => import('./MazeMapperGameClient'), { ssr: false, loading: Skeleton })

const HOW_TO_PLAY = (
  <>
    <p>
      Your robot wakes up in a maze hidden by fog. It can only see what its <b>range sensor</b> beams touch. Build a map — floor, wall or unknown —
      and get out through the green exit.
    </p>
    <ul className="list-disc space-y-1 pl-5">
      <li>
        <b>Cadet:</b> drive with the arrows (or tap the maze). Watch the beams draw the map. More map = more stars.
      </li>
      <li>
        <b>Pilot:</b> pick left or right hand and let the wall-follower drive. Find out why it sometimes loops forever.
      </li>
      <li>
        <b>Ace:</b> send the robot to frontiers (edges of the known map), then plan the escape with BFS and watch the wavefront.
      </li>
      <li>
        <b>Legend:</b> sensors lie and wheels slip. Design the robot’s brain — scans, trust, planner, hunch — and compare brains on the same maze.
      </li>
    </ul>
    <p>Every maze is seeded: the same maze and the same choices always give the same result.</p>
  </>
)

export default function MazeMapperClient() {
  const game = getGame('maze-mapper')
  if (!game) return null
  return (
    <GameShell
      game={game}
      howToPlay={HOW_TO_PLAY}
      lesson="Robots map the unknown with an occupancy grid (free, wall, unknown), explore by heading to frontiers, and plan routes with search such as BFS and A*. With noisy sensors, many readings out-vote one bad one."
    >
      {({ tier, round, finish }) => <MazeMapperGame key={`${tier}-${round}`} tier={tier} onFinish={finish} />}
    </GameShell>
  )
}
