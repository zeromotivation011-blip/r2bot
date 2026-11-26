'use client'

// components/kids/games/swarm-reef/SwarmReefClient.tsx
// The page's client island: the shared GameShell around Swarm Reef. The game
// itself (canvas, simulation, controls) loads with next/dynamic so the page's
// server HTML stays light; the skeleton has the same footprint.

import dynamic from 'next/dynamic'
import { GameShell } from '@/components/kids/ui/GameShellClient'
import { getGame } from '@/lib/kids/universe/worlds'

function Skeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]" aria-busy="true" aria-label="Loading Swarm Reef">
      <div className="flex flex-col gap-3">
        <div className="h-[92px] animate-pulse rounded-[20px] bg-white/5 sm:h-[150px]" />
        <div className="aspect-[10/7] w-full animate-pulse rounded-[28px] border border-white/10 bg-gradient-to-b from-[#0a2a4a] to-[#071226]" />
        <div className="h-[52px] animate-pulse rounded-2xl bg-white/5" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-[520px] animate-pulse rounded-[20px] bg-white/5" />
      </div>
    </div>
  )
}

const SwarmReefGame = dynamic(() => import('./SwarmReefGameClient'), { ssr: false, loading: Skeleton })

const HOW_TO_PLAY = (
  <>
    <p>
      You command a swarm of tiny underwater robots. You can’t steer any single robot. Instead you set the <b>rules</b> that every robot follows,
      using only what it can sense nearby — and the swarm’s behaviour appears all by itself.
    </p>
    <ul className="list-disc space-y-1 pl-5">
      <li>
        <b>Separation</b> — don’t bump. <b>Alignment</b> — swim the way your neighbours swim. <b>Cohesion</b> — stay close to your neighbours.
      </li>
      <li>
        <b>Cadet:</b> only the gold scouts can smell the food. Keep the swarm together so everyone gets there.
      </li>
      <li>
        <b>Pilot:</b> squeeze through a narrow gap in a rock wall without crashing.
      </li>
      <li>
        <b>Ace:</b> make a light-show ring, heal it when robots fail, then form a line.
      </li>
      <li>
        <b>Legend:</b> search the reef for hidden rescue beacons before the batteries run out, using a shared trail.
      </li>
    </ul>
    <p>Move the sliders, press Launch (or Space), and watch. Tap a robot to see exactly what it can sense. After each run, read why it happened.</p>
  </>
)

export default function SwarmReefClient() {
  const game = getGame('swarm-reef')
  if (!game) return null
  return (
    <GameShell
      game={game}
      howToPlay={HOW_TO_PLAY}
      lesson="Emergence: robots that each follow a few simple local rules — separation, alignment, cohesion — can act as one smart group with no leader. Change the rules and the whole swarm changes."
    >
      {({ tier, round, finish }) => <SwarmReefGame key={`${tier}-${round}`} tier={tier} onFinish={finish} />}
    </GameShell>
  )
}
